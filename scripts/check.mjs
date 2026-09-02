import fs from "node:fs";
import { frequentExamWords,shouldKnowWords } from "../src/data/vocabulary/coreWords.js";
import { defaultReading,defaultListening,defaultWriting,defaultMocks } from "../src/data/practice/alevelParallel2026.js";
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
const hydrateSource=app.slice(app.indexOf("async function hydrateFromCloud"),app.indexOf("async function refreshCommunity"));
if(!hydrateSource.includes("store.replace({...remote")){console.error("Regression: cloud hydration would hide the official catalog");process.exit(1)}
if(hydrateSource.includes("pushCloudState")){console.error("Regression: an empty cloud would resurrect stale browser data");process.exit(1)}
const cloud=fs.readFileSync("src/lib/cloud.js","utf8");
const regressionSources=[app,cloud,fs.readFileSync("src/features/importer/bulkImporter.js","utf8"),fs.readFileSync("src/styles/themes/application-themes.css","utf8")].join("\n");
for(const marker of ["function deckWordRow","function bindDeckEditor","function practiceSectionEditor","function bindPracticeEditor","data-import-drop","word-popover","floating-exam-timer","FREE_LIMITS"]){if(!regressionSources.includes(marker)){console.error("Regression: approved feature is missing",marker);process.exit(1)}}
for(const [file,source] of [["flashcards",fs.readFileSync("src/features/flashcards/flashcards.js","utf8")],["practice",fs.readFileSync("src/features/practice/practice.js","utf8")]]){if(!source.includes('x.official?')&&!source.includes('d.official?')){console.error(`Regression: ${file} official items are editable`);process.exit(1)}}
for(const marker of ["filter(deck=>!deck.official)","filter(x=>!x.official)"]){if(!cloud.includes(marker)){console.error("Regression: official catalog would be synced as user data",marker);process.exit(1)}}
const i18n=fs.readFileSync("src/lib/i18n.js","utf8");
for(const lang of ["th","en","zh","ja","ko","pt","de","ru","hi"]){if(!i18n.includes(`[\"${lang}\"`)){console.error("Missing supported language",lang);process.exit(1)}}
const fail=message=>{console.error(`Content validation: ${message}`);process.exit(1)};
const vocab=[...frequentExamWords,...shouldKnowWords],normalized=vocab.map(x=>x.w.trim().toLowerCase());
if(frequentExamWords.length!==80||shouldKnowWords.length!==80)fail("vocabulary groups must contain 80 words each");
if(new Set(normalized).size!==normalized.length)fail("duplicate vocabulary word");
for(const word of vocab)if(!word.w||!word.m||!/^[a-z-]+$/.test(word.w))fail(`invalid vocabulary row ${word.w}`);
const expected=[[defaultListening,20],[defaultReading,40],[defaultWriting,20],[defaultMocks,null]];
for(const [sets,fixedCount] of expected){for(const set of sets){const count=fixedCount??set.itemCount,questions=(set.sections||[]).flatMap(section=>section.questions||[]);if(questions.length!==count)fail(`${set.id} expected ${count} questions, found ${questions.length}`);const ids=new Set();for(const q of questions){if(ids.has(q.id))fail(`${set.id} duplicate question id ${q.id}`);ids.add(q.id);if(!q.prompt||q.choices?.length!==4||!Number.isInteger(q.answer)||q.answer<0||q.answer>3)fail(`${set.id}/${q.id} malformed choices or answer`);if(new Set(q.choices.map(String)).size!==4)fail(`${set.id}/${q.id} duplicate choice`)}}}
if(defaultMocks.find(x=>x.id==="jumsup-tgat1-mock-1")?.sections.map(x=>x.questions.length).join("/")!=="30/30")fail("TGAT1 blueprint must be 30 Speaking and 30 Reading");
const bannedDistractors=new Set(["A detail not stated in the passage","The opposite of the stated information","An unrelated idea"]);
for(const q of defaultReading.flatMap(set=>set.sections.flatMap(section=>section.questions)))if(q.choices.some(choice=>bannedDistractors.has(choice)))fail(`${q.id} contains placeholder distractors`);
const trialMigration=fs.readFileSync("supabase/migrations/013_three_practice_trials.sql","utf8");
for(const marker of ["used>=3","interval '3 days'","'remaining',2-used","'retry_at',cooldown"]){if(!trialMigration.includes(marker))fail(`missing three-trial marker ${marker}`)}
console.log("Jumsup V6 audited structure OK");

