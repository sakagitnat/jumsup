import { api } from "./api.js";
import { isPro } from "./entitlements.js";
import { FREE_LIMITS } from "./plans.js";
export function privateQuota(kind){return kind==="vocab"?FREE_LIMITS.privateVocab:["reading","listening","writing","mock"].includes(kind)?FREE_LIMITS.privatePractice:0}
export function localPrivateCount(s,kind,excludeId=null){const list=kind==="vocab"?s.decks:kind==="mock"?s.mocks:s[kind]||[];return list.filter(x=>x.visibility==="private"&&x.id!==excludeId).length}
export function canPrivateLocally(s,kind,excludeId=null){return isPro(s)||localPrivateCount(s,kind,excludeId)<privateQuota(kind)}
export async function startDailyFeature(feature,sessionKey,state={}){return api("/api/usage/start",{method:"POST",body:JSON.stringify({feature,session_key:sessionKey,state})})}
