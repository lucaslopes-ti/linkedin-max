import { Profile } from "../models";
import { Finding } from "../audit/rules";
import { ABOUT_EXAMPLE, BULLET_EXAMPLE, BULLET_FORMAT, MAX_BULLETS_PER_EXPERIENCE } from "../audit/content";
import { HEADLINE_EXAMPLE, HEADLINE_FORMAT, suggestHeadline } from "../audit/headline";
import { interpretSSI, SSIInterpretation } from "../audit/ssi";

const SEVERITY_ICON: Record<string, string> = { critical: "[CRÍTICO]", warning: "[ALERTA]", info: "[INFO]", ok: "[OK]" };
const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2, ok: 3 };

export function score(findings: Finding[]): number {
  let penalty = 0;
  for (const f of findings) {
    if (f.severity === "critical") penalty += 15;
    else if (f.severity === "warning") penalty += 6;
    else if (f.severity === "info") penalty += 2;
  }
  return Math.max(0, 100 - penalty);
}

export function renderReport(profile: Profile, findings: Finding[]): string {
  const t = profile.target;
  const s = score(findings);
  const ssi = interpretSSI(profile.ssi);
  const lines: string[] = [];

  lines.push(`# LinkedIn Positioning Audit — ${profile.name || "Perfil"}`);
  lines.push("");
  lines.push(`**Cargo-alvo:** ${t.role || "—"}  `);
  lines.push(`**Público:** ${t.audience || "—"} · **Mercado:** ${t.market || "—"} · **Senioridade:** ${t.seniority || "—"} · **Idioma:** ${t.language || "—"} · **Tom:** ${t.tone || "—"}`);
  lines.push("");
  lines.push(`**Score de posicionamento (heurístico):** ${s}/100`);
  lines.push("");

  lines.push("## SSI");
  if (ssi.total === null) {
    lines.push("SSI não informado. Acesse https://www.linkedin.com/sales/ssi e preencha os 4 pilares.");
  } else {
    lines.push(`**Total:** ${ssi.total}/100`);
    lines.push("");
    lines.push("| Pilar | Score | Status | Ação |");
    lines.push("|-------|-------|--------|------|");
    for (const p of ssi.pillars) {
      lines.push(`| ${p.label} (${p.color_pt}) | ${p.score}/25 | ${p.rating} | ${p.advice} |`);
    }
    if (ssi.weakest) {
      lines.push("");
      lines.push(`**Prioridade SSI:** ${ssi.weakest.label} (${ssi.weakest.color_pt}) — ${ssi.weakest.advice}`);
    }
    lines.push("");
    lines.push("### Dicas por pilar SSI");
    for (const p of ssi.pillars) {
      lines.push("");
      lines.push(`#### ${p.color_pt} — ${p.label} (${p.score}/25 · ${p.rating})`);
      lines.push(`_${p.meaning}_`);
      for (const tip of p.tips) {
        lines.push(`- ${tip}`);
      }
    }
    if (ssi.action_plan.length) {
      lines.push("");
      lines.push("### Plano rápido SSI (2 pilares mais fracos)");
      for (const tip of ssi.action_plan) {
        lines.push(`- ${tip}`);
      }
    }
  }
  lines.push("");

  lines.push("## Diagnóstico por área");
  const grouped = new Map<string, Finding[]>();
  for (const f of findings) {
    if (!grouped.has(f.area)) grouped.set(f.area, []);
    grouped.get(f.area)!.push(f);
  }
  for (const [area, items] of grouped) {
    items.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99));
    lines.push("");
    lines.push(`### ${area.charAt(0).toUpperCase() + area.slice(1)}`);
    for (const f of items) {
      const icon = SEVERITY_ICON[f.severity];
      let line = `- ${icon} ${f.message}`;
      if (f.suggestion) line += ` → ${f.suggestion}`;
      lines.push(line);
    }
  }

  const crit = findings.filter(f => f.severity === "critical");
  const warn = findings.filter(f => f.severity === "warning");
  lines.push("");
  lines.push("## Plano de ação (prioridade)");
  let n = 1;
  for (const f of [...crit, ...warn]) {
    lines.push(`${n}. ${f.message} ${f.suggestion ? "— " + f.suggestion : ""}`.trimEnd());
    n++;
  }
  if (n === 1) {
    lines.push("Nenhum item crítico ou de alerta. Foque em otimizações `info` e em conteúdo.");
  }
  lines.push("");
  return lines.join("\n");
}

export function renderLLMPrompt(profile: Profile, findings: Finding[]): string {
  const t = profile.target;
  const diag = findings
    .filter(f => f.severity !== "ok")
    .map(f => `- [${f.severity}] ${f.area}: ${f.message}`)
    .join("\n");

  function expBlock(): string {
    const out: string[] = [];
    for (const e of profile.experiences) {
      out.push(`### ${e.title} @ ${e.company} (${e.start}–${e.end})`);
      if (e.description) out.push(e.description);
      for (const b of e.bullets) out.push(`- ${b}`);
    }
    return out.length ? out.join("\n") : "(sem experiências)";
  }

  const headlineExample = suggestHeadline(profile.target);

  return `You are a LinkedIn positioning strategist, recruiter, personal branding expert, and career copywriter.

Transform this profile into a targeted sales page for a specific opportunity.

TARGET
- Role/opportunity: ${t.role || "(ask user)"}
- Audience to attract: ${t.audience || "(ask user)"}
- Market: ${t.market || "(ask user)"}
- Seniority: ${t.seniority || "(ask user)"}
- Output language: ${t.language || "(ask user)"}
- Tone: ${t.tone || "(ask user)"}
- Keywords: ${t.keywords.join(", ") || "(none provided)"}

CURRENT PROFILE
- Name: ${profile.name}
- Headline: ${profile.headline}
- About:
${profile.about || "(empty)"}

- Experiences:
${expBlock()}

- Skills: ${profile.skills.join(", ") || "(none)"}
- Languages: ${profile.languages.join(", ") || "(none)"}
- Certifications: ${profile.certifications.join(", ") || "(none)"}
- Education: ${profile.education.map(e => e.school).join(", ") || "(none)"}
- Featured: ${profile.featured.join(", ") || "(none)"}

RULE-BASED AUDIT FINDINGS
${diag || "(none)"}

PRODUCE
1. Positioning diagnosis (2-3 sentences).
2. Best target persona for this profile.
3. 5 optimized headline options (use the target language/market).
   MANDATORY FORMAT for every headline option:
   ${HEADLINE_FORMAT}
   Canonical example: ${HEADLINE_EXAMPLE}
   Suggested for this profile: ${headlineExample}
   - Block 1: position/title (include seniority when relevant)
   - Block 2: strongest work areas / domains
   - Block 3: technologies separated by middle dot (·) — tools you use or want recruiters to contact you for
4. 3 About versions: short, balanced, strong.
   Follow this narrative model (scale, companies, domains, stack list at end):
   ${ABOUT_EXAMPLE}
5. Rewritten experience sections — max ${MAX_BULLETS_PER_EXPERIENCE} bullets per role.
   Each bullet (~3 lines max): what you did + highlighted metrics + technologies + business impact.
   Canonical bullet example:
   ${BULLET_EXAMPLE}
   Format rule: ${BULLET_FORMAT}
6. Recommended skills and keyword clusters (note: LinkedIn PDF only exports top 3 skills).
7. Featured section recommendations.
8. Banner / visual direction.
9. 5 post ideas to reinforce the positioning.
10. Final LinkedIn optimization checklist.

RULES
- Do NOT invent experience or metrics. If a metric is missing, mark it as [ADD METRIC].
- Do NOT make the profile generic.
- Every headline MUST follow: Posição | Áreas | Tecnologias (with · in block 3).
- Max ${MAX_BULLETS_PER_EXPERIENCE} bullets per experience; keep each bullet ~3 lines.
- For Gringa market: profile must list English in Languages section.
- Prioritize clarity, credibility, and market fit.
- Use the language of the target role and market.
- Make it readable for humans and searchable for recruiters.
`;
}
