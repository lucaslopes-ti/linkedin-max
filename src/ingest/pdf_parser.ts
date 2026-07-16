import * as fs from "fs";
import pdfParse from "pdf-parse";
import { Profile, Experience, Education } from "../models";

const SECTION_ALIASES: Record<string, string[]> = {
  summary: ["Summary", "About", "Resumo", "Sobre", "Extracto", "Acerca de"],
  experience: ["Experience", "Experiência", "Experiencia"],
  education: ["Education", "Formação acadêmica", "Formacao academica", "Educación", "Educacion", "Formación"],
  certifications: [
    "Licenses & Certifications", "Licenses and Certifications", "Certifications",
    "Licenças e certificados", "Licencas e certificados", "Certificações", "Certificacoes",
    "Licencias y certificaciones", "Certificaciones",
  ],
  skills: ["Skills", "Top Skills", "Competências", "Competencias", "Principais competências", "Aptitudes"],
  languages: ["Languages", "Idiomas"],
};

const HEADER_TO_CANONICAL: Record<string, string> = {};
for (const [canonical, variants] of Object.entries(SECTION_ALIASES)) {
  for (const variant of variants) {
    HEADER_TO_CANONICAL[variant.toLowerCase()] = canonical;
  }
}
const SECTION_HEADER_SET = new Set(Object.keys(HEADER_TO_CANONICAL));
const SIDEBAR_MARKERS = new Set([...SECTION_HEADER_SET, "canonical"]);
const PAGE_NOISE = /^(--\s*\d+\s+of\s+\d+\s*--|Page\s+\d+\s+of\s+\d+|Página\s+\d+\s+de\s+\d+)$/i;

const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec|janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|ene|feb|abr|may|ago|sep|oct|nov|dic";
const PRESENT_WORDS = "Present|Presente|Atual|Actual|Actualidad|o momento|hoje|hoy";
const DATE_LINE = new RegExp(`(${MONTHS}).*\\d{4}.*(${PRESENT_WORDS}|\\d{4})`, "i");
const BULLET_START = /^[•\u{0B7}\u{2022}\-–]\s*|^\u{FFFD}\s*/u;
const TITLE_HINT = /\b(Engineer|Developer|Architect|Manager|Lead|Director|Analyst|Consultant|Intern|Specialist|Engenheiro|Engenheira|Desenvolvedor|Desenvolvedora|Arquiteto|Arquiteta|Gerente|Analista|Consultor|Consultora|Estagiário|Estagiaria|Especialista|Líder|Diretor|Diretora|Ingeniero|Ingeniera|Desarrollador|Arquitecto|Gerente|Analista|Consultor|Becario|Especialista)\b/i;
const ACTION_START = /^(Led|Built|Created|Implemented|Migrated|Re-architected|Productionized|Designed|Developed|Managed|Owned|Automated|Reduced|Improved|Architected|Delivered|Established|Liderei|Construí|Construi|Criei|Implementei|Migrei|Desenvolvi|Gerenciei|Automatizei|Reduzi|Aumentei|Otimizei|Entreguei|Projetei|Arquitetei|Implementé|Desarrollé|Creé|Lideré)/i;
const LOCATION_LINE = /,\s*(Brazil|Brasil|United States|Estados Unidos|IL|SP|RJ|PR|UK|Remote|Remoto|Portugal|España|Espanha|Mexico|México|Argentina)\s*$/i;
const NAME_RE = /^[A-ZÀ-Ý][a-zà-ÿ'’.-]+(?:\s+[A-ZÀ-Ý][a-zà-ÿ'’.-]+){1,3}$/;

// --- helpers ---

function splitSections(text: string): Record<string, string> {
  const lines = text.split("\n");
  const sections: Record<string, string> = {};
  let current = "_top";
  let buffer: string[] = [];
  for (const line of lines) {
    const canonical = HEADER_TO_CANONICAL[line.trim().toLowerCase()];
    if (canonical) {
      const existing = sections[current] || "";
      sections[current] = existing ? (existing + "\n" + buffer.join("\n")).trim() : buffer.join("\n").trim();
      current = canonical;
      buffer = [];
    } else {
      buffer.push(line);
    }
  }
  const existing = sections[current] || "";
  sections[current] = existing ? (existing + "\n" + buffer.join("\n")).trim() : buffer.join("\n").trim();
  return sections;
}

function cleanLines(block: string): string[] {
  return block.split("\n").map(s => s.trim()).filter(s => s && !PAGE_NOISE.test(s));
}

function looksLikeName(line: string): boolean {
  if (!NAME_RE.test(line)) return false;
  if (SIDEBAR_MARKERS.has(line.toLowerCase())) return false;
  if (/\d/.test(line)) return false;
  const parts = line.split(/\s+/);
  return parts.length >= 2 && parts.length <= 4;
}

function findNameAndHeadline(sections: Record<string, string>): [string, string] {
  for (const block of Object.values(sections)) {
    const lines = cleanLines(block);
    for (let idx = 0; idx < lines.length; idx++) {
      if (lines[idx].includes("|") && lines[idx].length > 15 && idx > 0) {
        if (looksLikeName(lines[idx - 1])) {
          const headlineParts = [lines[idx]];
          let k = idx + 1;
          while (k < lines.length) {
            const nxt = lines[k];
            if (SECTION_HEADER_SET.has(nxt.toLowerCase()) || SIDEBAR_MARKERS.has(nxt.toLowerCase())) break;
            if (nxt.startsWith("·") || nxt.startsWith("•") || nxt.startsWith("|") || (nxt.includes("·") && !DATE_LINE.test(nxt))) {
              headlineParts.push(nxt);
              k++;
              continue;
            }
            break;
          }
          const headline = headlineParts.map(p => p.trim()).join(" ").replace(/\s{2,}/g, " ").trim();
          return [lines[idx - 1].trim(), headline];
        }
      }
    }
  }
  return ["", ""];
}

function parseIdentity(block: string): { name: string; headline: string; skills: string[]; certs: string[] } {
  const lines = cleanLines(block);
  let name = "", headline = "";
  const skills: string[] = [];
  const certs: string[] = [];
  const markers = new Set(["top skills", "languages", "certifications", "licenses & certifications"]);

  let i = 0;
  while (i < lines.length) {
    const low = lines[i].toLowerCase();
    if (low === "top skills") {
      i++;
      while (i < lines.length && !markers.has(lines[i].toLowerCase()) && !lines[i].includes("|")) {
        if (lines[i] && !lines[i].startsWith("www.")) skills.push(lines[i]);
        i++;
      }
      continue;
    }
    if (low === "certifications" || low === "licenses & certifications" || low === "licenses and certifications") {
      i++;
      while (i < lines.length && !markers.has(lines[i].toLowerCase()) && !lines[i].includes("|")) {
        if (lines[i] && lines[i].length > 3) certs.push(lines[i]);
        i++;
      }
      continue;
    }
    if (lines[i].includes("|") && lines[i].length > 25) {
      headline = lines[i].replace(/\s\s+/g, " ").trim();
      if (i > 0 && !lines[i - 1].startsWith("+") && !lines[i - 1].startsWith("www.") && !lines[i - 1].startsWith("http")) {
        name = lines[i - 1];
      }
      break;
    }
    i++;
  }

  if (!name) {
    for (let j = 0; j < lines.length; j++) {
      if (/^[A-Z][a-zA-Z''-]+ [A-Z][a-zA-Z''-]+/.test(lines[j]) && lines[j].split(/\s+/).length <= 5) {
        if (j + 1 >= lines.length) continue;
        const parts: string[] = [];
        let k = j + 1;
        while (k < lines.length) {
          if (/,\s*(Brazil|United States|IL)\s*$/.test(lines[k])) break;
          if (lines[k].toLowerCase().startsWith("www.") || lines[k].startsWith("+")) { k++; continue; }
          parts.push(lines[k]);
          k++;
        }
        const joined = parts.join(" ");
        if (parts.length && (joined.includes("Engineer") || joined.includes("Developer") || joined.includes("|") || joined.includes("·"))) {
          name = lines[j];
          headline = joined.replace(/\s\s+/g, " ").trim();
          break;
        }
      }
    }
  }

  return { name, headline, skills, certs };
}

function stripBullet(line: string): string {
  return line.replace(BULLET_START, "").trim();
}

function looksLikeCompany(name: string): boolean {
  if (!name || name.length > 60) return false;
  if (/^\d/.test(name) || ACTION_START.test(name)) return false;
  if (/\d/.test(name)) return false;
  if (BULLET_START.test(name)) return false;
  return true;
}

function looksLikeJobStart(lines: string[], i: number): boolean {
  if (i + 2 >= lines.length) return false;
  const [company, title, third] = [lines[i], lines[i + 1], lines[i + 2]];
  if (!looksLikeCompany(company)) return false;
  if (BULLET_START.test(title)) return false;
  if (DATE_LINE.test(title)) return false;
  if (DATE_LINE.test(third)) return TITLE_HINT.test(title);
  if (i + 3 < lines.length && DATE_LINE.test(lines[i + 3])) return TITLE_HINT.test(lines[i + 2]);
  return false;
}

function parseExperiences(block: string): Experience[] {
  const lines = cleanLines(block);
  const experiences: Experience[] = [];
  let i = 0;

  while (i < lines.length) {
    if (BULLET_START.test(lines[i]) || DATE_LINE.test(lines[i])) { i++; continue; }
    if (!looksLikeJobStart(lines, i)) { i++; continue; }

    const company = lines[i];
    const title = lines[i + 1];
    i += 2;

    while (i < lines.length && (
      DATE_LINE.test(lines[i]) || LOCATION_LINE.test(lines[i]) ||
      (lines[i].endsWith("Brazil") && lines[i].includes(",")) ||
      (lines[i].endsWith("IL") && lines[i].includes(","))
    )) { i++; }

    const bullets: string[] = [];
    let current: string[] = [];
    const flush = () => { if (current.length) { bullets.push(current.join(" ").trim()); current = []; } };

    while (i < lines.length) {
      if (looksLikeJobStart(lines, i)) break;
      const line = lines[i];
      if (BULLET_START.test(line)) { flush(); current = [stripBullet(line)]; }
      else if (ACTION_START.test(line) && (current.length || bullets.length)) { flush(); current = [line]; }
      else if (current.length) { current.push(line); }
      else if (bullets.length) { bullets[bullets.length - 1] += " " + line; }
      else { break; }
      i++;
    }
    flush();
    if (title && !BULLET_START.test(title)) {
      experiences.push({ title, company, bullets, start: "", end: "", description: "", skills: [] });
    }
  }
  return experiences;
}

function parseLanguages(block: string): string[] {
  const skip = new Set(["elementary","limited","professional","full","native","bilingual","working","proficiency","professional working proficiency","native or bilingual proficiency","full professional proficiency"]);
  return cleanLines(block).filter(line => !skip.has(line.toLowerCase()) && line.length <= 60 && /^[A-Za-zÀ-ÿ ()-]+$/.test(line));
}

function parseSkills(block: string, name: string, headline: string): string[] {
  const fragments = headline ? new Set(headline.split("|").map(p => p.trim())) : new Set<string>();
  return cleanLines(block).filter(line =>
    line !== name && !line.includes("|") && !line.startsWith("·") &&
    !line.startsWith("www.") && !line.startsWith("+") && !line.startsWith("http") &&
    !fragments.has(line) && line.length > 1 && line.length <= 60 &&
    !LOCATION_LINE.test(line)
  );
}

function parseCertifications(block: string, name: string, headline: string): string[] {
  const fragments = headline ? new Set(headline.split("|").map(p => p.trim())) : new Set<string>();
  return cleanLines(block).filter(line =>
    line !== name && !line.includes("|") && !line.startsWith("·") &&
    !fragments.has(line) && line.length > 3 &&
    !looksLikeName(line) && !LOCATION_LINE.test(line)
  );
}

function parseEducation(block: string): Education[] {
  const lines = cleanLines(block);
  if (!lines.length) return [];
  return [{ school: lines[0], degree: lines.length > 1 ? lines[1] : "", field_of_study: "", start: "", end: "" }];
}

// --- main export ---

export async function parsePDF(filePath: string): Promise<Profile> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  const text = data.text;
  const sections = splitSections(text);

  let { name, headline, skills, certs } = parseIdentity(sections["_top"] || "");

  if (!headline || !headline.includes("|")) {
    const [scanName, scanHeadline] = findNameAndHeadline(sections);
    if (scanHeadline) {
      headline = scanHeadline;
      if (scanName) name = scanName;
    }
  }

  const sectionSkills = parseSkills(sections["skills"] || "", name, headline);
  if (sectionSkills.length) skills = sectionSkills;

  const sectionCerts = parseCertifications(sections["certifications"] || "", name, headline);
  if (sectionCerts.length) certs = sectionCerts;

  const about = sections["summary"] || "";
  const experiences = parseExperiences(sections["experience"] || "");
  const education = parseEducation(sections["education"] || "");
  const languages = parseLanguages(sections["languages"] || "");

  return {
    name,
    headline,
    about,
    current_title: experiences.length ? experiences[0].title : "",
    location: "",
    experiences,
    education,
    skills,
    certifications: certs,
    languages,
    featured: [],
    recent_posts: [],
    ssi: { professional_brand: null, find_people: null, engage_insights: null, build_relationships: null },
    target: { role: "", audience: "", market: "", seniority: "", language: "", tone: "", keywords: [], job_descriptions: [] },
  };
}
