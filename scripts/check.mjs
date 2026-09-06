// Content & backend-contract validation. The UI-architecture assertions that used
// to live here were tied to the old string-render engine (src/app/createApp.js)
// and were dropped when the UI moved to React. Everything that guards data
// integrity, migrations and security markers is kept.
import fs from "node:fs";
import {
  frequentExamWords,
  shouldKnowWords,
  officialVocabDecks,
} from "../src/data/vocabulary/coreWords.js";
import {
  defaultReading,
  defaultListening,
  defaultWriting,
  defaultMocks,
} from "../src/data/practice/alevelParallel2026.js";

const req = [
  "index.html",
  "package.json",
  "src/lib/policy.js",
  "src/lib/plans.js",
  "src/lib/i18n.js",
  "supabase/migrations/010_learning_onboarding.sql",
  "functions/_lib/security.js",
  "functions/api/stripe/webhook.js",
  "functions/api/refund/request.js",
  "supabase/migrations/001_full_production.sql",
  "supabase/migrations/002_production_hardening.sql",
  "supabase/migrations/003_refund_workflow.sql",
  "supabase/migrations/004_audit_fixes.sql",
  "public/_headers",
  "SECURITY.md",
  "HARDENING_CHECKLIST.md",
  "AUDIT_REPORT.md",
];
for (const f of req) {
  if (!fs.existsSync(f)) {
    console.error("Missing", f);
    process.exit(1);
  }
}

const migration = fs.readFileSync("supabase/migrations/004_audit_fixes.sql", "utf8");
for (const marker of [
  "revoke update on public.profiles",
  "claim_stripe_event",
  "mark_word_mastered",
  "drop constraint if exists usage_sessions_user_id_feature_usage_date_key",
]) {
  if (!migration.includes(marker)) {
    console.error("Missing hardening marker", marker);
    process.exit(1);
  }
}

const i18n = fs.readFileSync("src/lib/i18n.js", "utf8");
// Only Thai and English are offered in the language picker; the other locale
// maps remain in i18n.js for reference but are intentionally not selectable.
for (const lang of ["th", "en"]) {
  if (!i18n.includes(`["${lang}"`)) {
    console.error("Missing supported language", lang);
    process.exit(1);
  }
}
if (i18n.includes('"เปิด":"On"')) {
  console.error("Regression: feature navigation would say On instead of Open");
  process.exit(1);
}

const fail = (message) => {
  console.error(`Content validation: ${message}`);
  process.exit(1);
};

if (frequentExamWords.length < 80 || shouldKnowWords.length < 80)
  fail("master vocabulary decks must each contain at least 80 words");
const deckIds = new Set();
for (const d of officialVocabDecks) {
  if (deckIds.has(d.id)) fail(`duplicate official deck id ${d.id}`);
  deckIds.add(d.id);
  if (!d.name || !Array.isArray(d.words) || d.words.length < 10)
    fail(`official deck ${d.id} looks malformed`);
  const seen = new Set();
  // Mostly single lowercase words; skill / conversation decks also carry
  // multi-word terms and set phrases ("main idea", "I'd rather"), so letters,
  // spaces, apostrophes, slashes and hyphens are all allowed between letters.
  for (const word of d.words) {
    if (!word.w || !word.m || !word.e || !/^[A-Za-z][A-Za-z '/-]*[A-Za-z]$/.test(word.w))
      fail(`invalid vocabulary row "${word.w}" in ${d.id}`);
    if (seen.has(word.w)) fail(`duplicate word "${word.w}" within ${d.id}`);
    seen.add(word.w);
  }
}

// Each skill now ships several sets of varying size (a few small enough for
// the Free tier, plus larger Pro showcase sets) rather than one fixed-size
// set, so every set is checked against its own itemCount instead of one
// hardcoded count per skill.
const expected = [defaultListening, defaultReading, defaultWriting, defaultMocks];
for (const sets of expected) {
  for (const set of sets) {
    const count = set.itemCount;
    const questions = (set.sections || []).flatMap((section) => section.questions || []);
    if (questions.length !== count)
      fail(`${set.id} expected ${count} questions, found ${questions.length}`);
    const ids = new Set();
    for (const q of questions) {
      if (ids.has(q.id)) fail(`${set.id} duplicate question id ${q.id}`);
      ids.add(q.id);
      if (
        !q.prompt ||
        q.choices?.length !== 4 ||
        !Number.isInteger(q.answer) ||
        q.answer < 0 ||
        q.answer > 3
      )
        fail(`${set.id}/${q.id} malformed choices or answer`);
      if (new Set(q.choices.map(String)).size !== 4) fail(`${set.id}/${q.id} duplicate choice`);
    }
  }
}
if (
  defaultMocks
    .find((x) => x.id === "jumsup-tgat1-mock-1")
    ?.sections.map((x) => x.questions.length)
    .join("/") !== "30/30"
)
  fail("TGAT1 blueprint must be 30 Speaking and 30 Reading");

const bannedDistractors = new Set([
  "A detail not stated in the passage",
  "The opposite of the stated information",
  "An unrelated idea",
]);
for (const q of defaultReading.flatMap((set) =>
  set.sections.flatMap((section) => section.questions),
))
  if (q.choices.some((choice) => bannedDistractors.has(choice)))
    fail(`${q.id} contains placeholder distractors`);
for (const q of defaultListening.flatMap((set) =>
  set.sections.flatMap((section) => section.questions),
))
  if (q.choices.some((choice) => bannedDistractors.has(choice)))
    fail(`${q.id} contains placeholder distractors`);

const trialMigration = fs.readFileSync(
  "supabase/migrations/013_three_practice_trials.sql",
  "utf8",
);
for (const marker of ["used>=3", "interval '3 days'", "'remaining',2-used", "'retry_at',cooldown"]) {
  if (!trialMigration.includes(marker)) fail(`missing three-trial marker ${marker}`);
}

console.log("Jumsup content validation OK");
