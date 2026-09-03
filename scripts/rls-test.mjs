/* Automated Row Level Security check for Jumsup.
 *
 * Creates two throwaway users, has user A create a private and a public vocab
 * set, then asserts user B cannot read / modify A's private content and cannot
 * tamper with A's public content. Cleans up the test users afterwards
 * (their rows cascade-delete).
 *
 * Run:
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/rls-test.mjs
 *
 * SUPABASE_URL and SUPABASE_ANON_KEY are read from the environment or ./.env
 * (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are accepted too).
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function fromDotEnv(key) {
  try {
    const line = readFileSync(new URL("../.env", import.meta.url), "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith(`${key}=`));
    return line ? line.slice(key.length + 1).trim() : undefined;
  } catch {
    return undefined;
  }
}
const env = (k, alt) =>
  process.env[k] || process.env[alt] || fromDotEnv(k) || fromDotEnv(alt);

const SUPABASE_URL = env("SUPABASE_URL", "VITE_SUPABASE_URL");
const ANON_KEY = env("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || fromDotEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error(
    "Missing config. Need SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(2);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  ok ? pass++ : fail++;
};

const stamp = Date.now();
const mkEmail = (n) => `rls-test+${stamp}-${n}@jumsup.test`;
const PW = `Test-${stamp}-xZ!`;

async function makeUser(n) {
  const email = mkEmail(n);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PW,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser ${n}: ${error.message}`);
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: sErr } = await client.auth.signInWithPassword({ email, password: PW });
  if (sErr) throw new Error(`signIn ${n}: ${sErr.message}`);
  return { id: data.user.id, email, client };
}

async function main() {
  console.log(`RLS test against ${SUPABASE_URL}\n`);
  const A = await makeUser("a");
  const B = await makeUser("b");
  const privId = `rls-priv-${stamp}`;
  const pubId = `rls-pub-${stamp}`;
  const cleanupIds = [privId, pubId];

  try {
    // --- A creates content ---
    {
      const { error: e1 } = await A.client
        .from("vocab_sets")
        .insert({ id: privId, user_id: A.id, name: "A private", visibility: "private" });
      const { error: e2 } = await A.client
        .from("vocab_sets")
        .insert({ id: pubId, user_id: A.id, name: "A public", visibility: "public" });
      check("A can create its own private + public sets", !e1 && !e2, e1?.message || e2?.message);
      await A.client.from("vocab_words").insert([
        { set_id: privId, word: "secret", meaning: "ลับ", sort_order: 0 },
        { set_id: pubId, word: "open", meaning: "เปิด", sort_order: 0 },
      ]);
    }

    // --- A sees its own private set ---
    {
      const { data } = await A.client.from("vocab_sets").select("id").eq("id", privId);
      check("A sees its own private set", (data || []).length === 1);
    }

    // --- B read isolation ---
    {
      const { data: priv } = await B.client.from("vocab_sets").select("id").eq("id", privId);
      check("B cannot see A's private set", (priv || []).length === 0);

      const { data: pub } = await B.client.from("vocab_sets").select("id").eq("id", pubId);
      check("B can see A's public set", (pub || []).length === 1);

      const { data: privWords } = await B.client
        .from("vocab_words")
        .select("id")
        .eq("set_id", privId);
      check("B cannot read words of A's private set", (privWords || []).length === 0);
    }

    // --- B cannot mutate A's content ---
    {
      const { data: upd } = await B.client
        .from("vocab_sets")
        .update({ name: "hacked" })
        .eq("id", pubId)
        .select("id");
      check("B's UPDATE of A's public set changes nothing", (upd || []).length === 0);

      const { data: del } = await B.client
        .from("vocab_sets")
        .delete()
        .eq("id", pubId)
        .select("id");
      check("B's DELETE of A's public set removes nothing", (del || []).length === 0);

      const { error: insErr } = await B.client
        .from("vocab_sets")
        .insert({ id: `rls-forge-${stamp}`, user_id: A.id, name: "forged", visibility: "private" });
      check("B cannot INSERT a row owned by A", Boolean(insErr), insErr ? "rejected" : "ALLOWED!");
      if (!insErr) cleanupIds.push(`rls-forge-${stamp}`);
    }

    // --- confirm A's public set is intact ---
    {
      const { data } = await admin.from("vocab_sets").select("name").eq("id", pubId).single();
      check("A's public set name is unchanged", data?.name === "A public", data?.name);
    }

    // --- B import (copy) of A's public set is allowed ---
    {
      const copyId = `rls-copy-${stamp}`;
      const { error } = await B.client
        .from("vocab_sets")
        .insert({ id: copyId, user_id: B.id, name: "B copy of public", visibility: "private" });
      check("B can import A's public set as its own copy", !error, error?.message);
      if (!error) cleanupIds.push(copyId);
    }
  } finally {
    await admin.from("vocab_sets").delete().in("id", cleanupIds);
    await admin.auth.admin.deleteUser(A.id).catch(() => {});
    await admin.auth.admin.deleteUser(B.id).catch(() => {});
    console.log("\n(cleaned up test users and rows)");
  }

  console.log(`\n${fail === 0 ? "ALL RLS CHECKS PASSED" : "RLS CHECKS FAILED"} — ${pass} pass, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("\nrls-test crashed:", e.message);
  process.exit(3);
});
