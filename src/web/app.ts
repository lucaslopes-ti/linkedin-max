import express, { Request, Response } from "express";
import multer from "multer";
import * as nunjucks from "nunjucks";
import * as path from "path";
import * as fs from "fs";
import { DEV_ROLES } from "../dev_presets";
import { MARKET_LABELS, SSI } from "../models";
import { buildTarget, runAuditFromPDF, saveUpload } from "../service";
import { interpretSSI, PillarScore } from "../audit/ssi";
import { buildSSIFixPrompt } from "../audit/fix_prompts";

const BASE_DIR = path.resolve(__dirname);
const UPLOAD_DIR = path.resolve(__dirname, "..", "..", "uploads");
const TEMPLATES_DIR = path.join(BASE_DIR, "templates");
const STATIC_DIR = path.join(BASE_DIR, "static");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();

nunjucks.configure(TEMPLATES_DIR, {
  autoescape: true,
  express: app,
});
app.set("view engine", "njk");

app.use("/static", express.static(STATIC_DIR));

const upload = multer({ storage: multer.memoryStorage() });

function parseScore(raw: string): number | null {
  raw = (raw || "").trim().replace(",", ".");
  if (!raw) return null;
  const score = Number(raw);
  if (isNaN(score) || score < 0 || score > 25) return null;
  return score;
}

function buildSSI(brand: string, findP: string, engage: string, relationships: string): { ssi: SSI | null; error: string | null } {
  const values: Record<string, number | null> = {
    "Professional brand": parseScore(brand),
    "Find the right people": parseScore(findP),
    "Engage with insights": parseScore(engage),
    "Build relationships": parseScore(relationships),
  };
  const missing = Object.entries(values).filter(([, v]) => v === null).map(([k]) => k);
  if (missing.length) {
    return { ssi: null, error: `Preencha os 4 scores do SSI (0–25, decimais ok). Faltando: ${missing.join(", ")}.` };
  }
  return {
    ssi: {
      professional_brand: values["Professional brand"]!,
      find_people: values["Find the right people"]!,
      engage_insights: values["Engage with insights"]!,
      build_relationships: values["Build relationships"]!,
    },
    error: null,
  };
}

function indexContext(error?: string) {
  return {
    roles: Object.entries(DEV_ROLES).map(([key, preset]) => ({ key, ...preset })),
    ssi_url: "https://www.linkedin.com/sales/ssi",
    error: error || null,
  };
}

app.get("/", (_req: Request, res: Response) => {
  res.render("index.html", indexContext());
});

app.post("/audit", upload.single("profile_pdf"), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file || !file.originalname.toLowerCase().endsWith(".pdf")) {
    return res.status(400).render("index.html", indexContext("Envie um arquivo PDF exportado do LinkedIn (Perfil → Salvar em PDF)."));
  }

  const { role_key = "data-engineer", custom_role = "", market = "gringa", seniority = "senior", language = "en" } = req.body;
  const { ssi_brand = "", ssi_find = "", ssi_engage = "", ssi_relationships = "" } = req.body;

  if (!MARKET_LABELS[market]) {
    return res.status(400).render("index.html", indexContext("Selecione Brasil ou Gringa como mercado."));
  }

  const { ssi, error: ssiError } = buildSSI(ssi_brand, ssi_find, ssi_engage, ssi_relationships);
  if (ssiError) {
    return res.status(400).render("index.html", indexContext(ssiError));
  }

  const pdfPath = saveUpload(file.buffer, ".pdf", UPLOAD_DIR);
  const target = buildTarget(role_key, market, seniority, language, custom_role);

  let result;
  try {
    result = await runAuditFromPDF(pdfPath, target, ssi!);
  } catch (exc: any) {
    return res.status(400).render("index.html", indexContext(`Não foi possível ler o PDF: ${exc.message || exc}`));
  } finally {
    try { fs.unlinkSync(pdfPath); } catch {}
  }

  const ssiInterp = interpretSSI(ssi!);
  for (const pillar of ssiInterp.pillars) {
    if (pillar.rating !== "forte") {
      pillar.fix_prompt = buildSSIFixPrompt(pillar, result.profile, target);
    }
  }

  const critical = result.findings.filter(f => f.severity === "critical");
  const warnings = result.findings.filter(f => f.severity === "warning");
  const infos = result.findings.filter(f => f.severity === "info");

  res.render("result.html", {
    result,
    ssi_interp: ssiInterp,
    critical,
    warnings,
    infos,
    target,
    market_label: MARKET_LABELS[target.market] || target.market,
  });
});

export { app };
