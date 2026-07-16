import { Command } from "commander";
import * as path from "path";
import * as fs from "fs";
import { parsePDF } from "./ingest/pdf_parser";
import { auditProfile } from "./audit/rules";
import { renderReport, renderLLMPrompt } from "./report/render";
import { loadProfileYaml, saveProfileYaml } from "./service";
import { Profile } from "./models";

const program = new Command();

program
  .name("devprofile")
  .description("Audita e otimiza um perfil do LinkedIn (manual + semi-auto, sem scraping).");

program
  .command("ingest")
  .description("Parse de PDF 'Save to PDF' do LinkedIn para YAML draft.")
  .requiredOption("--pdf <path>", "Caminho do PDF exportado do LinkedIn.")
  .option("--out <path>", "YAML de saída", "profile.yaml")
  .action(async (options) => {
    try {
      const profile = await parsePDF(options.pdf);
      saveProfileYaml(profile, options.out);
      console.log(`Draft escrito em ${options.out}`);
      console.log("Revise e complete: headline, about, bullets, skills, ssi e target antes do audit.");
    } catch (err: any) {
      console.error(`Erro: ${err.message || err}`);
      process.exit(1);
    }
  });

program
  .command("audit")
  .description("Audita o perfil a partir do YAML e gera relatório.")
  .requiredOption("--profile <path>", "YAML do perfil.")
  .option("--out <path>", "Relatório markdown", "report.md")
  .option("--prompt <path>", "Arquivo de prompt LLM", "llm_prompt.md")
  .action(async (options) => {
    try {
      const profile = loadProfileYaml(options.profile);
      const findings = auditProfile(profile);
      const report = renderReport(profile, findings);
      fs.writeFileSync(options.out, report, "utf8");
      console.log(`Relatório escrito em ${options.out}`);

      if (options.prompt) {
        const prompt = renderLLMPrompt(profile, findings);
        fs.writeFileSync(options.prompt, prompt, "utf8");
        console.log(`Prompt LLM escrito em ${options.prompt}`);
      }

      const crit = findings.filter(f => f.severity === "critical").length;
      const warn = findings.filter(f => f.severity === "warning").length;
      console.log(`Findings: ${crit} críticos, ${warn} alertas.`);
    } catch (err: any) {
      console.error(`Erro: ${err.message || err}`);
      process.exit(1);
    }
  });

program
  .command("serve")
  .description("Sobe a interface web DevProfile (upload PDF + SSI).")
  .option("--host <host>", "Host", "127.0.0.1")
  .option("--port <port>", "Porta", "8000")
  .action(async (options) => {
    const { app } = await import("./web/app");
    const port = parseInt(options.port, 10) || 8000;
    app.listen(port, options.host, () => {
      console.log(`DevProfile: http://${options.host}:${port}`);
    });
  });

program.parse(process.argv);
