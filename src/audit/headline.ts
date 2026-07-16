import { Target } from "../models";
import { DEV_ROLES, DevRolePreset } from "../dev_presets";

export const HEADLINE_EXAMPLE =
  "Senior Data Engineer | Data Platform, CDP & Reliability | " +
  "GCP · Airflow · BigQuery · Spark · Terraform · AI Automation";

export const HEADLINE_FORMAT =
  "{Posição} | {Áreas de trabalho mais fortes} | {Tecnologias com ·}";

const SENIORITY_LABELS: Record<string, string> = {
  junior: "Junior",
  mid: "",
  senior: "Senior",
  staff: "Staff",
  lead: "Tech Lead",
  manager: "",
  executive: "",
};

export function headlineSegments(text: string): string[] {
  return (text || "").split("|").map(part => part.trim());
}

export function findPreset(target: Target): DevRolePreset | null {
  const roleLower = (target.role || "").toLowerCase();
  for (const preset of Object.values(DEV_ROLES)) {
    const presetRole = preset.role.toLowerCase();
    if (presetRole && (presetRole.includes(roleLower) || roleLower.includes(presetRole))) {
      return preset;
    }
  }
  for (const [key, preset] of Object.entries(DEV_ROLES)) {
    if (roleLower.includes(key.replace("-", " "))) {
      return preset;
    }
  }
  return null;
}

export function suggestHeadline(target: Target, preset?: DevRolePreset | null): string {
  preset = preset ?? findPreset(target);
  const seniority = SENIORITY_LABELS[target.seniority || ""] || "";
  const role = target.role || preset?.role || "Engineer";
  const position = seniority ? `${seniority} ${role}`.trim() : role;
  const areas = preset?.headline_areas || "Core domain & specialty";
  let techs = preset?.headline_tech;
  if (!techs && target.keywords.length) {
    techs = target.keywords.slice(0, 6)
      .map(w => w.length <= 4 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))
      .join(" · ");
  }
  if (!techs) techs = "Tech stack · Tools · Platforms";
  return `${position} | ${areas} | ${techs}`;
}

export function validateHeadlineStructure(text: string): [boolean, string] {
  const parts = headlineSegments(text);
  if (parts.length !== 3) {
    return [false, `Use 3 blocos separados por |: ${HEADLINE_FORMAT}. Ex: ${HEADLINE_EXAMPLE}`];
  }
  if (parts.some(p => !p)) {
    return [false, "Cada bloco entre | precisa ter conteúdo."];
  }
  if (parts[0].length < 5) {
    return [false, "1º bloco: cargo/posição (ex: Senior Data Engineer)."];
  }
  if (parts[1].length < 5) {
    return [false, "2º bloco: áreas de trabalho mais fortes (ex: Data Platform, CDP & Reliability)."];
  }
  if (parts[2].length < 5) {
    return [false, "3º bloco: tecnologias que você usa ou quer ser contactado por, separadas com · (ex: GCP · Airflow · BigQuery)."];
  }
  return [true, ""];
}
