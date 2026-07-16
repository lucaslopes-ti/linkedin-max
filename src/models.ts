export const MARKETS: Set<string> = new Set(["brasil", "gringa"]);

export const MARKET_LABELS: Record<string, string> = {
  brasil: "Brasil",
  gringa: "Gringa",
};

export const SENIORITIES: Set<string> = new Set([
  "junior", "mid", "senior", "staff", "lead", "manager", "executive",
]);

export const AUDIENCES: Set<string> = new Set([
  "recruiters", "hiring-managers", "founders", "clients", "investors", "partners",
]);

export const TONES: Set<string> = new Set([
  "technical", "executive", "sales", "founder", "recruiter-friendly",
]);

export const LANGUAGES: Set<string> = new Set(["pt", "en", "bilingual"]);

export interface Target {
  role: string;
  audience: string;
  market: string;
  seniority: string;
  language: string;
  tone: string;
  keywords: string[];
  job_descriptions: string[];
}

export interface Experience {
  title: string;
  company: string;
  start: string;
  end: string;
  description: string;
  bullets: string[];
  skills: string[];
}

export interface Education {
  school: string;
  degree: string;
  field_of_study: string;
  start: string;
  end: string;
}

export interface SSI {
  professional_brand: number | null;
  find_people: number | null;
  engage_insights: number | null;
  build_relationships: number | null;
}

export interface Profile {
  name: string;
  headline: string;
  about: string;
  current_title: string;
  location: string;
  experiences: Experience[];
  education: Education[];
  skills: string[];
  certifications: string[];
  languages: string[];
  featured: string[];
  recent_posts: string[];
  ssi: SSI;
  target: Target;
}

export function emptyTarget(): Target {
  return {
    role: "",
    audience: "",
    market: "",
    seniority: "",
    language: "",
    tone: "",
    keywords: [],
    job_descriptions: [],
  };
}

export function emptySSI(): SSI {
  return {
    professional_brand: null,
    find_people: null,
    engage_insights: null,
    build_relationships: null,
  };
}

export function emptyProfile(): Profile {
  return {
    name: "",
    headline: "",
    about: "",
    current_title: "",
    location: "",
    experiences: [],
    education: [],
    skills: [],
    certifications: [],
    languages: [],
    featured: [],
    recent_posts: [],
    ssi: emptySSI(),
    target: emptyTarget(),
  };
}

export function expectsEnglish(target: Target): boolean {
  return target.market === "gringa" || target.language === "en" || target.language === "bilingual";
}

export function ssiTotal(ssi: SSI): number | null {
  const parts = [ssi.professional_brand, ssi.find_people, ssi.engage_insights, ssi.build_relationships];
  if (parts.some(p => p === null)) return null;
  return Math.round((parts.reduce((a, b) => a! + b!, 0)!) * 10) / 10;
}
