/* Minimal Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID) for Cloudflare Workers,
   built on Web Crypto only — no Node deps. */

const enc = new TextEncoder();

const b64urlToBytes = (s) => {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const bytesToB64url = (bytes) => {
  let bin = "";
  const b = new Uint8Array(bytes);
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const concat = (...arrs) => {
  const total = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
};

async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

// ---- VAPID (signed JWT + public key) --------------------------------------

async function vapidHeaders(endpoint, { publicKey, privateKey, subject }) {
  const aud = new URL(endpoint).origin;
  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = bytesToB64url(
    enc.encode(
      JSON.stringify({
        aud,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: subject,
      }),
    ),
  );
  const signingInput = `${header}.${payload}`;

  const pub = b64urlToBytes(publicKey); // 0x04 || X(32) || Y(32)
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: privateKey,
    x: bytesToB64url(pub.slice(1, 33)),
    y: bytesToB64url(pub.slice(33, 65)),
    ext: true,
  };
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(signingInput),
  );
  const jwt = `${signingInput}.${bytesToB64url(new Uint8Array(sig))}`;
  return {
    Authorization: `vapid t=${jwt}, k=${publicKey}`,
  };
}

// ---- Payload encryption (RFC 8291) ---------------------------------------

async function encryptPayload(plaintext, uaPublicB64, authSecretB64) {
  const uaPublic = b64urlToBytes(uaPublicB64); // 65 bytes
  const authSecret = b64urlToBytes(authSecretB64); // 16 bytes

  const asKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", asKeyPair.publicKey)); // 65

  const uaKey = await crypto.subtle.importKey(
    "raw",
    uaPublic,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const ecdhBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: uaKey },
    asKeyPair.privateKey,
    256,
  );
  const ecdhSecret = new Uint8Array(ecdhBits);

  // IKM = HKDF(salt=authSecret, ikm=ecdhSecret, info="WebPush: info\0"||uaPub||asPub, 32)
  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const record = concat(enc.encode(plaintext), new Uint8Array([2])); // 0x02 delimiter, no padding
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, aesKey, record),
  );

  // header = salt(16) || rs(4 = 4096) || idlen(1 = 65) || as_public(65)
  const rs = new Uint8Array([0, 0, 0x10, 0]);
  const header = concat(salt, rs, new Uint8Array([asPublic.length]), asPublic);
  return concat(header, ciphertext);
}

/**
 * Send one Web Push message.
 * @returns {Promise<{ok:boolean, status:number, gone:boolean}>}
 */
export async function sendPush(subscription, payloadObj, vapid, ttl = 24 * 3600) {
  const body = await encryptPayload(
    JSON.stringify(payloadObj),
    subscription.p256dh,
    subscription.auth,
  );
  const headers = {
    ...(await vapidHeaders(subscription.endpoint, vapid)),
    "Content-Encoding": "aes128gcm",
    "Content-Type": "application/octet-stream",
    TTL: String(ttl),
  };
  const res = await fetch(subscription.endpoint, { method: "POST", headers, body });
  return {
    ok: res.ok,
    status: res.status,
    gone: res.status === 404 || res.status === 410,
  };
}
