// Exam / skill / level tags used across editors and Community filters.

export const EXAMS: Array<[string, string]> = [
  ["general", "ทั่วไป / CEFR"],
  ["alevel", "A-Level (TCAS)"],
  ["tgat", "TGAT1"],
  ["onet", "O-NET"],
  ["ielts", "IELTS"],
  ["toefl", "TOEFL"],
  ["toeic", "TOEIC"],
  ["det", "Duolingo (DET)"],
  ["pte", "PTE Academic"],
  ["cambridge", "Cambridge (KET–CPE)"],
  ["sat", "SAT"],
  ["cutep", "CU-TEP"],
  ["tuget", "TU-GET"],
  ["kuept", "KU-EPT"],
  ["mu", "MU-GRAD / MU-ELT"],
  ["ged", "GED"],
  ["oet", "OET"],
];

export const SKILLS: Array<[string, string]> = [
  ["vocabulary", "Vocabulary"],
  ["reading", "Reading"],
  ["listening", "Listening"],
  ["writing", "Writing"],
  ["speaking", "Speaking"],
  ["grammar", "Grammar"],
  ["mock", "Mock"],
];

export const LEVELS: Array<[string, string]> = [
  ["beginner", "เริ่มต้น"],
  ["intermediate", "กลาง"],
  ["advanced", "สูง"],
];

const map = (pairs: Array<[string, string]>) => Object.fromEntries(pairs);
const EXAM_MAP = map(EXAMS);
const SKILL_MAP = map(SKILLS);
const LEVEL_MAP = map(LEVELS);

export const examLabel = (v?: string) => (v && EXAM_MAP[v]) || "";
export const skillLabel = (v?: string) => (v && SKILL_MAP[v]) || "";
export const levelLabel = (v?: string) => (v && LEVEL_MAP[v]) || "";
