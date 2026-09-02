// CSV bulk-import helpers. Ported from the old src/features/importer/bulkImporter.js
// (pure functions only; the HTML-string modal renderer was dropped for the React UI).

export interface ImportType {
  label: string;
  headers: string[];
  required: string[];
}

export const TYPES: Record<string, ImportType> = {
  vocab: {
    label: "ชุดคำศัพท์",
    headers: ["word", "meaning", "example", "tags"],
    required: ["word", "meaning"],
  },
  reading: {
    label: "Reading",
    headers: [
      "passage_id", "title", "time_minutes", "passage", "question",
      "choice_a", "choice_b", "choice_c", "choice_d", "correct_answer", "explanation",
    ],
    required: [
      "passage_id", "time_minutes", "passage", "question", "choice_a", "choice_b", "correct_answer",
    ],
  },
  listening: {
    label: "Listening",
    headers: [
      "audio_id", "title", "time_minutes", "audio_filename", "transcript", "question",
      "choice_a", "choice_b", "choice_c", "choice_d", "correct_answer", "explanation",
    ],
    required: [
      "audio_id", "time_minutes", "transcript", "question", "choice_a", "choice_b", "correct_answer",
    ],
  },
  writing: {
    label: "Writing",
    headers: [
      "task_id", "title", "prompt", "instructions", "time_minutes",
      "min_words", "max_words", "rubric", "sample_answer",
    ],
    required: ["task_id", "title", "prompt"],
  },
  mock: {
    label: "Mock Exam",
    headers: [
      "section_id", "section_title", "section_type", "time_minutes", "question",
      "choice_a", "choice_b", "choice_c", "choice_d", "correct_answer", "points",
    ],
    required: [
      "section_id", "section_title", "section_type", "question", "choice_a", "choice_b", "correct_answer",
    ],
  },
};

type Row = Record<string, string>;

export function parseCsv(text: string): { headers: string[]; rows: Row[] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '"') {
      if (quoted && n === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && n === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0].map((x, i) => (i === 0 ? x.replace(/^﻿/, "") : x).trim());
  return {
    headers,
    rows: rows.slice(1).map((cols) =>
      Object.fromEntries(headers.map((h, i) => [h, (cols[i] || "").trim()])),
    ),
  };
}

export interface ValidationResult {
  valid: Row[];
  errors: Array<{ row: number; name?: string; message: string }>;
}

export function validateImport(
  type: string,
  rows: Row[],
  mapping: Record<string, string>,
): ValidationResult {
  const t = TYPES[type];
  const valid: Row[] = [];
  const errors: ValidationResult["errors"] = [];
  rows.forEach((raw, i) => {
    const item = Object.fromEntries(
      t.headers.map((h) => [h, mapping[h] ? raw[mapping[h]] || "" : ""]),
    );
    const missing = t.required.filter((h) => !item[h]);
    let message = missing.length ? `ไม่มี ${missing.join(", ")}` : "";
    if (!message && item.correct_answer && !/^[A-D]$/i.test(item.correct_answer))
      message = "correct_answer ต้องเป็น A, B, C หรือ D";
    if (message)
      errors.push({ row: i + 2, name: item.word || item.title || item.question, message });
    else valid.push({ ...item, _row: String(i + 2) });
  });
  return { valid, errors };
}

const EXAMPLES: Record<string, string[]> = {
  vocab: ["analyze", "วิเคราะห์", "We need to analyze the results.", "academic"],
  reading: [
    "R001", "Urban Green Spaces", "20", "Cities are investing in parks.",
    "What is the main idea?", "Public parks", "City transport", "Online learning",
    "Food prices", "A", "The passage focuses on parks.",
  ],
  listening: [
    "L001", "At the station", "15", "station.mp3",
    "A: Which platform? B: Platform six.", "Which platform?", "3", "4", "5", "6", "D",
    "The speaker says platform six.",
  ],
  writing: [
    "W001", "Email request", "Write an email requesting an extension.",
    "Explain the reason and suggest a date.", "20", "120", "180",
    "Content:4; Language:4; Organization:2", "",
  ],
  mock: ["S01", "Listening", "listening", "25", "Which platform?", "3", "4", "5", "6", "D", "1"],
};

export function downloadTemplate(type: string) {
  const t = TYPES[type] || TYPES.vocab;
  const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const csv = `﻿${t.headers.map(esc).join(",")}\r\n${(EXAMPLES[type] || EXAMPLES.vocab)
    .map(esc)
    .join(",")}\r\n`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `jumsup-${type}-template.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function buildImportedContent(
  type: string,
  rows: Row[],
  creator: string,
): { key: string; value: Record<string, unknown> } {
  const id = crypto.randomUUID();
  const today = new Date().toLocaleDateString();
  const groupBy = (items: Row[], key: string) =>
    items.reduce<Record<string, Row[]>>((out, x) => {
      const k = x[key] || "default";
      (out[k] ||= []).push(x);
      return out;
    }, {});

  if (type === "vocab") {
    return {
      key: "decks",
      value: {
        id: `deck-${id}`,
        name: `Imported vocabulary ${today}`,
        visibility: "private",
        creator,
        words: rows.map((x) => ({ w: x.word, m: x.meaning, e: x.example || "", stress: x.word })),
      },
    };
  }

  const q = (x: Row) => ({
    id: `q-${crypto.randomUUID()}`,
    prompt: x.question,
    choices: [x.choice_a, x.choice_b, x.choice_c, x.choice_d].filter(Boolean),
    answer: "ABCD".indexOf(String(x.correct_answer).toUpperCase()),
    explanation: x.explanation || "",
  });

  if (type === "writing") {
    return {
      key: "writing",
      value: {
        id: `writing-${id}`,
        title: `Imported writing ${today}`,
        visibility: "private",
        creator,
        minutes: Number(rows[0]?.time_minutes) || 20,
        type: "Writing tasks",
        sections: rows.map((x) => ({
          title: x.title,
          passage: x.prompt,
          directions: x.instructions,
          questions: [],
        })),
        itemCount: rows.length,
      },
    };
  }

  if (type === "mock") {
    const groups = groupBy(rows, "section_id");
    return {
      key: "mocks",
      value: {
        id: `mock-${id}`,
        title: `Imported mock exam ${today}`,
        visibility: "private",
        creator,
        minutes: Object.values(groups).reduce((n, g) => n + (Number(g[0].time_minutes) || 0), 0),
        sections: Object.entries(groups).map(([sid, g]) => ({
          id: sid,
          title: g[0].section_title,
          type: g[0].section_type,
          questions: g.map(q),
        })),
        itemCount: rows.length,
      },
    };
  }

  const groupKey = type === "reading" ? "passage_id" : "audio_id";
  const groups = groupBy(rows, groupKey);
  return {
    key: type,
    value: {
      id: `${type}-${id}`,
      title: `Imported ${type} ${today}`,
      visibility: "private",
      creator,
      minutes: Math.max(1, Number(rows[0]?.time_minutes) || 10),
      sections: Object.entries(groups).map(([gid, g]) => ({
        id: gid,
        title: g[0].title,
        text: g[0].passage,
        script: g[0].transcript,
        questions: g.map(q),
      })),
      itemCount: rows.length,
    },
  };
}
