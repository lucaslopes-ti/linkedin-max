import { Profile, Target, expectsEnglish } from "../models";
import { BULLET_EXAMPLE, BULLET_FORMAT, MAX_BULLETS_PER_EXPERIENCE } from "./content";
import { HEADLINE_EXAMPLE, suggestHeadline, validateHeadlineStructure } from "./headline";
import { experienceLabel, isMalformedExperience } from "./experience_quality";
import { attachFixPrompts } from "./fix_prompts";

export type Severity = "critical" | "warning" | "ok" | "info";

export interface Finding {
  area: string;
  severity: Severity;
  message: string;
  suggestion: string;
  fix_prompt: string;
}

const BUZZWORDS = new Set([
  "passionate", "results-driven", "results driven", "hard-working", "hardworking",
  "team player", "self-motivated", "guru", "ninja", "rockstar", "wizard",
  "thought leader", "synergy", "go-getter", "detail-oriented", "motivated",
  "apaixonado", "proativo", "dinâmico", "comprometido", "esforçado",
]);

const ACTION_VERBS = new Set([
  "led", "built", "designed", "shipped", "launched", "scaled", "reduced",
  "increased", "improved", "automated", "migrated", "delivered", "owned",
  "drove", "created", "implemented", "optimized", "architected", "managed",
  "liderei", "construí", "criei", "reduzi", "aumentei", "automatizei",
  "entreguei", "implementei", "otimizei", "escalei", "desenvolvi",
]);

const PT_STOPWORDS = new Set(["de", "que", "para", "com", "uma", "não", "você", "como", "dos", "das", "meu", "minha"]);
const EN_STOPWORDS = new Set(["the", "and", "with", "for", "your", "you", "this", "that", "from", "have", "are"]);

const METRIC_RE = /(\d+[\d.,]*\s?%|\$\s?\d|\bR\$\s?\d|\b\d[\d.,]*\s?(k|m|mi|mil|million|million|users|clientes|x)\b|\b\d+\b)/i;

function tokens(text: string): Set<string> {
  return new Set((text || "").toLowerCase().match(/[a-zA-ZÀ-ÿ]+/g) || []);
}

export function detectLanguage(text: string): string {
  const toks = tokens(text);
  if (toks.size === 0) return "unknown";
  let pt = 0, en = 0;
  for (const t of toks) {
    if (PT_STOPWORDS.has(t)) pt++;
    if (EN_STOPWORDS.has(t)) en++;
  }
  if (pt === 0 && en === 0) return "unknown";
  return pt >= en ? "pt" : "en";
}

function targetKeywords(target: Target): Set<string> {
  const kws = new Set<string>();
  for (const source of [target.role, ...target.keywords]) {
    for (const t of tokens(source)) {
      if (!PT_STOPWORDS.has(t) && !EN_STOPWORDS.has(t) && t.length > 2) {
        kws.add(t);
      }
    }
  }
  return kws;
}

function hasMetric(text: string): boolean {
  return METRIC_RE.test(text || "");
}

function hasActionVerb(text: string): boolean {
  for (const t of tokens(text)) {
    if (ACTION_VERBS.has(t)) return true;
  }
  return false;
}

function hasEnglishListed(languages: string[]): boolean {
  return languages.some(lang => /\benglish\b/i.test(lang));
}

function auditHeadline(p: Profile, kws: Set<string>, findings: Finding[]): void {
  const h = p.headline || "";
  const example = suggestHeadline(p.target);
  if (!h.trim()) {
    findings.push({
      area: "headline", severity: "critical",
      message: "Headline vazia.",
      suggestion: `Use: Posição | Áreas fortes | Tecnologias (com ·). Ex: ${example}`,
      fix_prompt: "",
    });
    return;
  }

  const [validFormat, formatMsg] = validateHeadlineStructure(h);
  if (!validFormat) {
    findings.push({ area: "headline", severity: "critical", message: "Headline fora do padrão.", suggestion: formatMsg, fix_prompt: "" });
  } else {
    const parts = h.split("|");
    const techBlock = parts[2].trim();
    if (!techBlock.includes("·") && techBlock.includes(",")) {
      findings.push({
        area: "headline", severity: "warning",
        message: "No 3º bloco, prefira separar tecnologias com · em vez de vírgulas.",
        suggestion: `Ex: ${HEADLINE_EXAMPLE.split("|")[2].trim()}`,
        fix_prompt: "",
      });
    }
  }

  if (h.length < 40) {
    findings.push({
      area: "headline", severity: "warning",
      message: `Headline curta (${h.length} chars).`,
      suggestion: "LinkedIn permite 220 chars; preencha os 3 blocos com detalhe.",
      fix_prompt: "",
    });
  }

  const foundKw = new Set([...tokens(h)].filter(t => kws.has(t)));
  if (kws.size > 0 && foundKw.size === 0) {
    findings.push({
      area: "headline", severity: "critical",
      message: "Headline não contém palavras-chave do cargo-alvo.",
      suggestion: `Inclua termos como: ${[...kws].sort().slice(0, 6).join(", ")}.`,
      fix_prompt: "",
    });
  }

  const buzz: string[] = [];
  for (const b of BUZZWORDS) {
    if (h.toLowerCase().includes(b)) buzz.push(b);
  }
  if (buzz.length) {
    findings.push({
      area: "headline", severity: "warning",
      message: `Buzzwords vazias na headline: ${buzz.sort().join(", ")}.`,
      suggestion: "Troque por stack, domínio e áreas concretas.",
      fix_prompt: "",
    });
  }

  if (validFormat && foundKw.size > 0 && h.length >= 40 && buzz.length === 0) {
    findings.push({ area: "headline", severity: "ok", message: "Headline no padrão Posição | Áreas | Tecnologias.", suggestion: "", fix_prompt: "" });
  }
}

function auditLanguage(p: Profile, target: Target, findings: Finding[]): void {
  if (!expectsEnglish(target)) return;

  if (!hasEnglishListed(p.languages)) {
    findings.push({
      area: "language", severity: "critical",
      message: "Mercado Gringa, mas English não está listado em Languages.",
      suggestion: "Adicione English (Professional working proficiency ou superior) no perfil.",
      fix_prompt: "",
    });
  }

  const sample = `${p.headline}\n${p.about}`;
  const lang = detectLanguage(sample);
  if (lang === "pt") {
    findings.push({
      area: "language", severity: "critical",
      message: "Mercado-alvo internacional, mas headline/about parecem estar em português.",
      suggestion: "Traduza headline, about e experiências para inglês.",
      fix_prompt: "",
    });
  } else if (lang === "en" && hasEnglishListed(p.languages)) {
    findings.push({ area: "language", severity: "ok", message: "Perfil em inglês com English listado em Languages.", suggestion: "", fix_prompt: "" });
  }
}

function auditAbout(p: Profile, kws: Set<string>, findings: Finding[]): void {
  const a = p.about || "";
  const aboutGuide = "Modelo: abertura com anos + foco → empresa atual com escala/métricas → áreas de atuação → experiência anterior com provas → lista de domínios/stack.";
  if (!a.trim()) {
    findings.push({
      area: "about", severity: "critical",
      message: "Seção About vazia.",
      suggestion: `${aboutGuide} Ex: ${ABOUT_EXAMPLE.slice(0, 200)}…`,
      fix_prompt: "",
    });
    return;
  }
  if (a.length < 300) {
    findings.push({
      area: "about", severity: "warning",
      message: `About curto (${a.length} chars).`,
      suggestion: "Aprofunde para ~1000-2000 chars com contexto, escala, empresas e stack.",
      fix_prompt: "",
    });
  }
  if (kws.size > 0 && [...tokens(a)].filter(t => kws.has(t)).length === 0) {
    findings.push({
      area: "about", severity: "warning",
      message: "About não menciona palavras-chave do cargo-alvo.",
      suggestion: "Inclua termos do mercado-alvo para busca de recruiters.",
      fix_prompt: "",
    });
  }
  if (!hasMetric(a)) {
    findings.push({
      area: "about", severity: "warning",
      message: "About sem números/provas concretas.",
      suggestion: "Inclua pipelines, escala, % de melhoria, anos de experiência, clientes.",
      fix_prompt: "",
    });
  }
}

const BULLET_SUGGESTION = `${BULLET_FORMAT}. Ex: ${BULLET_EXAMPLE}`;
import { ABOUT_EXAMPLE } from "./content";

function auditExperiences(p: Profile, kws: Set<string>, findings: Finding[]): void {
  if (!p.experiences.length) {
    findings.push({ area: "experience", severity: "critical", message: "Nenhuma experiência cadastrada.", suggestion: "", fix_prompt: "" });
    return;
  }

  const malformedCount = p.experiences.filter(exp => isMalformedExperience(exp)).length;
  if (malformedCount) {
    findings.push({
      area: "experience", severity: "info",
      message: `${malformedCount} experiência(s) com parse incompleto do PDF.`,
      suggestion: "Revise título, empresa e bullets manualmente antes de confiar no diagnóstico.",
      fix_prompt: "",
    });
  }

  p.experiences.forEach((exp, i) => {
    if (isMalformedExperience(exp)) return;
    const label = experienceLabel(exp);
    const content = exp.bullets.join(" ") + " " + (exp.description || "");

    if (!exp.bullets.length && !exp.description.trim()) {
      findings.push({
        area: "experience", severity: "warning",
        message: `[${label}] sem bullet points.`,
        suggestion: BULLET_SUGGESTION,
        fix_prompt: "",
      });
      return;
    }

    if (exp.bullets.length > MAX_BULLETS_PER_EXPERIENCE) {
      findings.push({
        area: "experience", severity: "warning",
        message: `[${label}] tem ${exp.bullets.length} bullets (máx ${MAX_BULLETS_PER_EXPERIENCE}).`,
        suggestion: "Mantenha só os 5 impactos mais fortes por experiência.",
        fix_prompt: "",
      });
    }

    const quantified = exp.bullets.filter(b => hasMetric(b)).length;
    if (exp.bullets.length > 0 && quantified === 0) {
      findings.push({
        area: "experience", severity: "warning",
        message: `[${label}] nenhum bullet quantificado.`,
        suggestion: "Inclua métricas: %, tempo, escala, volume, redução de custo.",
        fix_prompt: "",
      });
    }

    const withVerb = exp.bullets.filter(b => hasActionVerb(b)).length;
    if (exp.bullets.length > 0 && withVerb < Math.max(1, Math.floor(exp.bullets.length / 2))) {
      findings.push({
        area: "experience", severity: "info",
        message: `[${label}] poucos bullets começam com verbo de ação.`,
        suggestion: "Inicie com: Led, Built, Productionized, Migrated, Implemented…",
        fix_prompt: "",
      });
    }

    const longBullets = exp.bullets.filter(b => b.length > 320);
    if (longBullets.length) {
      findings.push({
        area: "experience", severity: "info",
        message: `[${label}] bullet(s) muito longo(s).`,
        suggestion: "Mantenha ~3 linhas por bullet. Formato: ação + métrica + tech + impacto.",
        fix_prompt: "",
      });
    }

    if (i === 0 && kws.size > 0) {
      const titleTokens = tokens(exp.title);
      const contentTokens = tokens(content);
      if (![...titleTokens].some(t => kws.has(t)) && ![...contentTokens].some(t => kws.has(t))) {
        findings.push({
          area: "experience", severity: "warning",
          message: `[${label}] título atual não bate com o cargo-alvo.`,
          suggestion: "Alinhe o título (ou subtítulo) ao role buscado.",
          fix_prompt: "",
        });
      }
    }
  });
}

function auditSkills(p: Profile, kws: Set<string>, findings: Finding[]): void {
  if (!p.skills.length) return;
  const skillTokens = tokens(p.skills.join(" "));
  const hasKw = [...skillTokens].some(t => kws.has(t));
  if (kws.size > 0 && p.skills.length > 3 && !hasKw) {
    findings.push({
      area: "skills", severity: "info",
      message: "Top skills do PDF podem não refletir todas as skills do perfil.",
      suggestion: `Fixe no LinkedIn as skills mais relevantes ao alvo: ${[...kws].sort().slice(0, 6).join(", ")}.`,
      fix_prompt: "",
    });
  }
}

function auditEducation(p: Profile, findings: Finding[]): void {
  if (!p.education.length) {
    findings.push({
      area: "education", severity: "info",
      message: "Nenhuma formação conectada.",
      suggestion: "Conecte a faculdade/instituição (mesmo em andamento) para credibilidade e rede de alumni.",
      fix_prompt: "",
    });
  }
  if (!p.certifications.length) {
    findings.push({
      area: "education", severity: "info",
      message: "Nenhuma certificação detectada no PDF (pode não ter sido capturada).",
      suggestion: "Se não tiver, adicione certificações relevantes ao cargo-alvo.",
      fix_prompt: "",
    });
  }
}

function auditFeatured(p: Profile, findings: Finding[]): void {
  findings.push({
    area: "featured", severity: "info",
    message: "Featured não vem no PDF — verifique manualmente se você tem uma seção em Destaque.",
    suggestion: "Vale muito ter um Featured: certificação (ex: Azure Data Engineer no Credly), projeto no GitHub, artigo técnico ou case. Veja o exemplo na página.",
    fix_prompt: "",
  });
}

function auditJobPreferences(p: Profile, findings: Finding[]): void {
  findings.push({
    area: "open_to_work", severity: "info",
    message: "Open to Work: ative como \"Recruiters only\" para receber mais contatos.",
    suggestion: "Evite \"All LinkedIn members\" (o badge #OpenToWork passa impressão de desespero). Recruiters only mostra disponibilidade só para quem usa o LinkedIn Recruiter. Veja o exemplo de configuração na página.",
    fix_prompt: "",
  });
  findings.push({
    area: "open_to_work", severity: "info",
    message: "Start date: marque \"Immediately, I am actively applying\".",
    suggestion: "Geralmente traz mais contatos do que \"Flexible / casually looking\", porque recrutadores priorizam quem está pronto para começar.",
    fix_prompt: "",
  });
  const langHint = p.target.market === "gringa" ? "inglês" : "do país onde você busca vaga";
  findings.push({
    area: "profile_language", severity: "info",
    message: `Profile language principal: use o idioma dos países-alvo (${langHint}).`,
    suggestion: "O Profile language principal deve ser o mesmo idioma dos países onde você busca emprego — tende a trazer melhores resultados na busca de recrutadores. Veja o exemplo na página.",
    fix_prompt: "",
  });
}

export function auditProfile(profile: Profile): Finding[] {
  const kws = targetKeywords(profile.target);
  const findings: Finding[] = [];

  auditHeadline(profile, kws, findings);
  auditLanguage(profile, profile.target, findings);
  auditAbout(profile, kws, findings);
  auditExperiences(profile, kws, findings);
  auditSkills(profile, kws, findings);
  auditEducation(profile, findings);
  auditFeatured(profile, findings);
  auditJobPreferences(profile, findings);

  attachFixPrompts(findings, profile);
  return findings;
}
