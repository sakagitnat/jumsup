import { EXAMS, SKILLS, LEVELS } from "../../lib/taxonomy";

export interface Tags {
  exam: string;
  skill: string;
  level: string;
}

/** exam / skill / level dropdowns shared by the deck and practice editors.
 *  Pass `skill={false}` to hide the skill picker (vocab sets). */
export function TagPickers({
  value,
  onChange,
  showSkill = true,
}: {
  value: Tags;
  onChange: (next: Tags) => void;
  showSkill?: boolean;
}) {
  const sel = (
    label: string,
    key: keyof Tags,
    options: Array<[string, string]>,
  ) => (
    <label className="block text-sm font-semibold">
      {label}
      <select
        value={value[key]}
        onChange={(e) => onChange({ ...value, [key]: e.target.value })}
        className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-normal"
      >
        <option value="">— ไม่ระบุ —</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {sel("ประเภทข้อสอบ", "exam", EXAMS)}
      {showSkill && sel("ทักษะ", "skill", SKILLS)}
      {sel("ระดับ", "level", LEVELS)}
    </div>
  );
}
