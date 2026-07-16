import { Experience } from "../models";

const DATE_LINE = /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*\d{4}.*(Present|\d{4})/i;
const BULLET_START = /^[•\u{0B7}\u{2022}\-–]\s*|^\u{FFFD}\s*/u;
const TITLE_HINT = /\b(Engineer|Developer|Architect|Manager|Lead|Director|Analyst|Consultant|Intern|Specialist)\b/i;
const ACTION_START = /^(Led|Built|Created|Implemented|Migrated|Re-architected|Productionized|Designed|Developed|Managed|Owned|Automated|Reduced|Improved|Architected|Delivered|Established)/i;

export function isMalformedExperience(exp: Experience): boolean {
  const title = (exp.title || "").trim();
  const company = (exp.company || "").trim();

  if (DATE_LINE.test(title) || /\(\d+\s+years?\)/i.test(title)) return true;
  if (title.length > 90 || company.length > 90) return true;
  if (title && ACTION_START.test(title)) return true;
  if (company && (/^\d/.test(company) || ACTION_START.test(company))) return true;
  if (company.split(",").length > 2 && !TITLE_HINT.test(company)) return true;
  if (["and Keboola.", "Silver, and Gold layers."].includes(title)) return true;
  return false;
}

export function experienceLabel(exp: Experience): string {
  if (isMalformedExperience(exp)) {
    return "experiência (revise título/empresa — PDF pode ter quebrado o parse)";
  }
  return `${exp.title || "cargo sem título"} @ ${exp.company || "—"}`;
}
