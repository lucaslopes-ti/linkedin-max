import { Profile, Target, SSI } from "./models";
import { DEV_ROLES, DEFAULT_TARGET } from "./dev_presets";
import { parsePDF } from "./ingest/pdf_parser";
import { auditProfile, Finding } from "./audit/rules";
import { renderReport, renderLLMPrompt, score } from "./report/render";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import * as yaml from "js-yaml";

export interface AuditResult {
  profile: Profile;
  findings: Finding[];
  report_md: string;
  prompt_md: string;
  score: number;
  critical_count: number;
  warning_count: number;
}

export function buildTarget(
  roleKey: string,
  market: string,
  seniority: string,
  language: string,
  customRole: string = "",
): Target {
  const preset = (DEV_ROLES as any)[roleKey] || {};
  const role = customRole.trim() || preset.role || roleKey.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  const keywords = [...(preset.keywords || [])];
  return {
    role,
    audience: DEFAULT_TARGET.audience,
    market,
    seniority,
    language,
    tone: DEFAULT_TARGET.tone,
    keywords,
    job_descriptions: [],
  };
}

export async function runAuditFromPDF(
  pdfPath: string,
  target: Target,
  ssi: SSI,
): Promise<AuditResult> {
  const profile = await parsePDF(pdfPath);
  profile.target = target;
  profile.ssi = ssi;
  const findings = auditProfile(profile);
  const reportMd = renderReport(profile, findings);
  const promptMd = renderLLMPrompt(profile, findings);
  return {
    profile,
    findings,
    report_md: reportMd,
    prompt_md: promptMd,
    score: score(findings),
    critical_count: findings.filter(f => f.severity === "critical").length,
    warning_count: findings.filter(f => f.severity === "warning").length,
  };
}

export function saveUpload(fileBytes: Buffer, suffix: string, uploadDir: string): string {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, uuidv4() + suffix);
  fs.writeFileSync(filePath, fileBytes);
  return filePath;
}

export function loadProfileYaml(filePath: string): Profile {
  const data = yaml.load(fs.readFileSync(filePath, "utf8")) as any;
  return dictToProfile(data || {});
}

export function saveProfileYaml(profile: Profile, filePath: string): void {
  const data = profileToDict(profile);
  fs.writeFileSync(filePath, yaml.dump(data, { sortKeys: false, noRefs: true }), "utf8");
}

function profileToDict(profile: Profile): any {
  return {
    name: profile.name,
    headline: profile.headline,
    about: profile.about,
    current_title: profile.current_title,
    location: profile.location,
    experiences: profile.experiences.map(e => ({
      title: e.title, company: e.company, start: e.start, end: e.end,
      description: e.description, bullets: [...e.bullets], skills: [...e.skills],
    })),
    education: profile.education.map(ed => ({
      school: ed.school, degree: ed.degree, field_of_study: ed.field_of_study,
      start: ed.start, end: ed.end,
    })),
    skills: [...profile.skills],
    certifications: [...profile.certifications],
    languages: [...profile.languages],
    featured: [...profile.featured],
    recent_posts: [...profile.recent_posts],
    ssi: {
      professional_brand: profile.ssi.professional_brand,
      find_people: profile.ssi.find_people,
      engage_insights: profile.ssi.engage_insights,
      build_relationships: profile.ssi.build_relationships,
    },
    target: {
      role: profile.target.role, audience: profile.target.audience,
      market: profile.target.market, seniority: profile.target.seniority,
      language: profile.target.language, tone: profile.target.tone,
      keywords: [...profile.target.keywords], job_descriptions: [...profile.target.job_descriptions],
    },
  };
}

function dictToProfile(data: any): Profile {
  data = data || {};
  return {
    name: data.name || "",
    headline: data.headline || "",
    about: data.about || "",
    current_title: data.current_title || "",
    location: data.location || "",
    experiences: (data.experiences || []).map((e: any) => ({
      title: e.title || "", company: e.company || "", start: e.start || "", end: e.end || "",
      description: e.description || "", bullets: [...(e.bullets || [])], skills: [...(e.skills || [])],
    })),
    education: (data.education || []).map((ed: any) => ({
      school: ed.school || "", degree: ed.degree || "", field_of_study: ed.field_of_study || "",
      start: ed.start || "", end: ed.end || "",
    })),
    skills: [...(data.skills || [])],
    certifications: [...(data.certifications || [])],
    languages: [...(data.languages || [])],
    featured: [...(data.featured || [])],
    recent_posts: [...(data.recent_posts || [])],
    ssi: {
      professional_brand: (data.ssi || {}).professional_brand ?? null,
      find_people: (data.ssi || {}).find_people ?? null,
      engage_insights: (data.ssi || {}).engage_insights ?? null,
      build_relationships: (data.ssi || {}).build_relationships ?? null,
    },
    target: {
      role: (data.target || {}).role || "", audience: (data.target || {}).audience || "",
      market: (data.target || {}).market || "", seniority: (data.target || {}).seniority || "",
      language: (data.target || {}).language || "", tone: (data.target || {}).tone || "",
      keywords: [...((data.target || {}).keywords || [])],
      job_descriptions: [...((data.target || {}).job_descriptions || [])],
    },
  };
}
