import fs from "node:fs";
const req=[
 "index.html","package.json","src/main.js","src/app/createApp.js","src/lib/policy.js","src/lib/plans.js","src/features/pricing/pricing.js","src/features/landing/landing.js","src/features/onboarding/onboarding.js","supabase/migrations/010_learning_onboarding.sql",
 "functions/_lib/security.js","functions/api/stripe/webhook.js","functions/api/refund/request.js",
 "supabase/migrations/001_full_production.sql","supabase/migrations/002_production_hardening.sql",
 "supabase/migrations/003_refund_workflow.sql","supabase/migrations/004_audit_fixes.sql",
 "public/_headers","SECURITY.md","HARDENING_CHECKLIST.md","AUDIT_REPORT.md"
];
for(const f of req){if(!fs.existsSync(f)){console.error("Missing",f);process.exit(1)}}
const migration=fs.readFileSync("supabase/migrations/004_audit_fixes.sql","utf8");
for(const marker of ["revoke update on public.profiles","claim_stripe_event","mark_word_mastered","drop constraint if exists usage_sessions_user_id_feature_usage_date_key"]){if(!migration.includes(marker)){console.error("Missing hardening marker",marker);process.exit(1)}}
const app=fs.readFileSync("src/app/createApp.js","utf8");
if(/root\.innerHTML\s*=/.test(app)){console.error("Direct root.innerHTML rendering bypasses localization and causes visible page flashes");process.exit(1)}
for(const marker of ["mount(layout(html))","localizePage(next.content","root.replaceChildren(next.content)"]){if(!app.includes(marker)){console.error("Missing unified render marker",marker);process.exit(1)}}
const regressionSources=[app,fs.readFileSync("src/features/importer/bulkImporter.js","utf8"),fs.readFileSync("src/styles/themes/application-themes.css","utf8")].join("\n");
for(const marker of ["function deckWordRow","function bindDeckEditor","function practiceSectionEditor","function bindPracticeEditor","data-import-drop","word-popover","floating-exam-timer","FREE_LIMITS"]){if(!regressionSources.includes(marker)){console.error("Regression: approved feature is missing",marker);process.exit(1)}}
const i18n=fs.readFileSync("src/lib/i18n.js","utf8");
for(const lang of ["th","en","zh","ja","ko","pt","de","ru","hi"]){if(!i18n.includes(`[\"${lang}\"`)){console.error("Missing supported language",lang);process.exit(1)}}
console.log("Jumsup V6 audited structure OK");

