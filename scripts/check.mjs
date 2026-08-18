import fs from "node:fs";
const req=[
 "index.html","package.json","src/main.js","src/app/createApp.js","src/lib/policy.js",
 "functions/_lib/security.js","functions/api/stripe/webhook.js","functions/api/refund/request.js",
 "supabase/migrations/001_full_production.sql","supabase/migrations/002_production_hardening.sql",
 "supabase/migrations/003_refund_workflow.sql","supabase/migrations/004_audit_fixes.sql",
 "public/_headers","SECURITY.md","HARDENING_CHECKLIST.md","AUDIT_REPORT.md"
];
for(const f of req){if(!fs.existsSync(f)){console.error("Missing",f);process.exit(1)}}
const migration=fs.readFileSync("supabase/migrations/004_audit_fixes.sql","utf8");
for(const marker of ["revoke update on public.profiles","claim_stripe_event","mark_word_mastered","drop constraint if exists usage_sessions_user_id_feature_usage_date_key"]){if(!migration.includes(marker)){console.error("Missing hardening marker",marker);process.exit(1)}}
console.log("Jumsup V6 audited structure OK");
