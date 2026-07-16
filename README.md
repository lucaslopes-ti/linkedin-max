# DevProfile

**LinkedIn audit para desenvolvedores** — receba mais contatos de recrutadores.

Envie o PDF do seu perfil + scores do [SSI](https://www.linkedin.com/sales/ssi) e receba um diagnóstico de posicionamento com plano de ação e prompt pronto para reescrever headline, About e experiências.

Sem scraping. Sem risco de ban. Seus dados não ficam salvos permanentemente.

## Instalação

```bash
npm install
npm run build
```

## Interface web (recomendado)

```bash
npm start
```

Abra **http://127.0.0.1:8000**

## Como gerar o PDF do seu perfil

1. Acesse o **seu perfil** no LinkedIn (web): clique na sua foto → **Ver perfil**.
2. Logo abaixo da foto/headline, clique no botão **More** / **Mais** (ao lado de *Add profile section*).
3. Selecione **Save to PDF** / **Salvar em PDF**.
4. O LinkedIn gera e baixa um PDF (geralmente em `Downloads`) — é esse arquivo que você envia aqui.

> Dica: use o LinkedIn no **navegador (desktop)**. No app do celular a opção pode não aparecer.
> O PDF não traz Featured nem foto — isso é esperado; a auditoria avisa o que verificar manualmente.

### Fluxo na página

1. **Escolha o cargo-alvo** — Backend, Data Engineer, DevOps, etc.
2. **Mercado** — Brasil ou Gringa
3. **Upload do PDF** — LinkedIn → Perfil → Mais → *Salvar em PDF*
4. **SSI** — abra [linkedin.com/sales/ssi](https://www.linkedin.com/sales/ssi) e digite os 4 scores com decimais (ex: 17.42, 10.01, 11, 15.6)
5. **Analisar** → score, pilares fracos, correções críticas, **prompt por erro** + relatório + prompt LLM completo

## CLI (alternativa)

```bash
# PDF → YAML draft
npm run cli ingest -- --pdf perfil.pdf --out profile.yaml

# Auditar YAML
npm run cli audit -- --profile profile.yaml --out report.md --prompt llm_prompt.md
```

## O que é analisado (foco dev)

| Área | Para devs |
|------|-----------|
| Headline | `Posição \| Áreas fortes \| Tecnologias` — ex: `Senior Data Engineer \| Data Platform, CDP & Reliability \| GCP · Airflow · BigQuery · Spark` |
| Idioma | Gringa → exige perfil em inglês |
| About | provas técnicas, métricas, CTA para recrutadores |
| Experiências | bullets quantificados, verbos de ação, alinhamento com cargo |
| Skills | PDF exporta só top 3 — não auditar quantidade; fixe as mais relevantes no LinkedIn |
| Experiências | máx 5 bullets · ~3 linhas · ação + métrica + tech + impacto |
| About | narrativa com escala, empresas, domínios e stack no final |
| Idioma | Gringa → English em Languages + perfil em inglês |
| SSI | qual pilar está travando inbound (brand, network, engage, relationships) |

## Escala SSI (total 0–100)

| Faixa | Classificação |
|-------|---------------|
| &lt; 30 | Fraco |
| 30–49 | Mediano |
| 50+ | Bom |

## Estrutura

```
├── src/
│   ├── index.ts             # CLI — comandos ingest, audit, serve
│   ├── models.ts            # interfaces (Profile, Target, SSI...)
│   ├── service.ts           # orquestração: PDF → audit → report
│   ├── dev_presets.ts       # 7 presets de dev (Backend, Data, DevOps...)
│   ├── ingest/
│   │   └── pdf_parser.ts    # parse de PDF do LinkedIn (pdf-parse)
│   ├── audit/
│   │   ├── rules.ts         # motor de auditoria (~30 regras heurísticas)
│   │   ├── headline.ts      # validação e sugestão de headline
│   │   ├── content.ts       # exemplos de About e bullets
│   │   ├── experience_quality.ts  # detecção de parse quebrado
│   │   ├── ssi.ts           # interpretação dos 4 pilares do SSI
│   │   └── fix_prompts.ts   # geração de prompts LLM por finding
│   ├── report/
│   │   └── render.ts        # relatório Markdown + prompt LLM completo
│   └── web/
│       ├── app.ts            # Express.js (substitui FastAPI)
│       ├── templates/
│       │   ├── index.html     # formulário de upload
│       │   └── result.html    # página de resultados
│       └── static/
│           ├── style.css      # tema dark
│           └── img/            # screenshots de referência
├── templates/                 # YAML de exemplo de perfil
├── examples/                  # reports de referência
├── package.json
└── tsconfig.json
```

## Privacidade

PDFs são processados e apagados após o parse.

## Limitações

- Parse de PDF é best-effort — layouts do LinkedIn variam.
- Scores do SSI são digitados manualmente (copie do LinkedIn).
- Reescrita criativa (headlines, About) via prompt LLM, não por regras.
