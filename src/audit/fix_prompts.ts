import { Finding } from "./rules";
import { Profile, Target, expectsEnglish } from "../models";
import { ABOUT_EXAMPLE, BULLET_EXAMPLE, BULLET_FORMAT, MAX_BULLETS_PER_EXPERIENCE } from "./content";
import { HEADLINE_EXAMPLE, suggestHeadline } from "./headline";

const LINKEDIN_WHERE: Record<string, string> = {
  headline: "LinkedIn → seu perfil → ícone de lápis ao lado da foto → campo **Headline** (abaixo do nome).",
  about: "LinkedIn → Perfil → seção **About** → ícone de lápis.",
  experience: "LinkedIn → Perfil → seção **Experience** → ícone de lápis na experiência indicada → descrição/bullets.",
  skills: "LinkedIn → Perfil → seção **Skills** → ícone de + → adicione e fixe as 3 principais.",
  language: "LinkedIn → Perfil → seção **Languages** → ícone de + → adicione English.",
  education: "LinkedIn → Perfil → seção **Education** → adicionar ou editar formação.",
  featured: "LinkedIn → Perfil → seção **Featured / Em destaque** → botão + → adicione link de certificação (Credly), projeto GitHub, artigo ou post.",
  open_to_work: "LinkedIn → seu perfil → botão **Open to** / **Disponível para** → **Finding a new job** → configure Job titles, Locations, Start date e Visibility.",
  profile_language: "LinkedIn → seu perfil → ícone de lápis (editar introdução) → campo **Profile language** → defina o idioma principal igual ao dos países-alvo.",
  ssi: "LinkedIn → [Social Selling Index](https://www.linkedin.com/sales/ssi) — ações fora do perfil (rede, posts, mensagens).",
};

function targetBlock(target: Target): string {
  return `- Cargo-alvo: ${target.role || "—"}
- Mercado: ${target.market || "—"}
- Senioridade: ${target.seniority || "—"}
- Idioma do perfil: ${target.language || "—"}
- Keywords: ${target.keywords.join(", ") || "—"}`;
}

function profileExcerpt(profile: Profile, area: string): string {
  switch (area) {
    case "headline":
      return profile.headline || "(vazio)";
    case "about": {
      const text = profile.about || "(vazio)";
      return text.length > 1200 ? text.slice(0, 1200) + "…" : text;
    }
    case "experience": {
      const lines: string[] = [];
      for (const exp of profile.experiences.slice(0, 4)) {
        lines.push(`### ${exp.title} @ ${exp.company}`);
        for (const b of exp.bullets.slice(0, MAX_BULLETS_PER_EXPERIENCE)) {
          lines.push(`- ${b}`);
        }
      }
      return lines.length ? lines.join("\n") : "(sem experiências)";
    }
    case "skills":
      return profile.skills.join(", ") || "(nenhuma no PDF)";
    case "language":
      return profile.languages.join(", ") || "(não listado)";
    case "education": {
      const parts = profile.education.map(e => `${e.school} — ${e.degree}`);
      const certs = profile.certifications.join(", ") || "nenhuma";
      return `Formação: ${parts.length ? parts.join("; ") : "Sem formação"}\nCertificações: ${certs}`;
    }
    case "featured":
      return profile.featured.join(", ") || "(vazio)";
    default:
      return "";
  }
}

export function buildFixPrompt(finding: Finding, profile: Profile, target: Target): string {
  const where = LINKEDIN_WHERE[finding.area] || "LinkedIn → seção correspondente do perfil.";
  const excerpt = profileExcerpt(profile, finding.area);
  const headlineHint = suggestHeadline(target);

  let extraRules = "";
  if (finding.area === "headline") {
    extraRules = `
FORMATO OBRIGATÓRIO DA HEADLINE
Posição | Áreas de trabalho mais fortes | Tecnologias (separadas com ·)
Exemplo: ${HEADLINE_EXAMPLE}
Sugestão para este perfil: ${headlineHint}
`;
  } else if (finding.area === "about") {
    extraRules = `
MODELO DE ABOUT (narrativa com escala, empresas, domínios, stack no final)
${ABOUT_EXAMPLE.slice(0, 600)}…
`;
  } else if (finding.area === "experience") {
    extraRules = `
FORMATO DE CADA BULLET (~3 linhas, máx ${MAX_BULLETS_PER_EXPERIENCE} por experiência)
${BULLET_FORMAT}
Exemplo: ${BULLET_EXAMPLE}
`;
  } else if (finding.area === "language" && target.market === "gringa") {
    extraRules = "\nPara mercado Gringa: adicione **English** em Languages e escreva headline/about/experiências em inglês.\n";
  }

  return `Você é um especialista em otimização de perfil LinkedIn para desenvolvedores.

Quero corrigir UM ponto específico do meu perfil. Me entregue o texto pronto para colar no LinkedIn.

## Onde editar no LinkedIn
${where}

## Contexto do meu objetivo
${targetBlock(target)}

## Problema encontrado na auditoria
- Área: ${finding.area}
- Severidade: ${finding.severity}
- Diagnóstico: ${finding.message}
${finding.suggestion ? `- Sugestão: ${finding.suggestion}` : ""}

## Conteúdo atual (extraído do meu PDF)
${excerpt}
${extraRules}
## Sua tarefa
1. Explique em 1 frase o que mudar e por quê (para recrutadores do cargo-alvo).
2. Entregue o texto final pronto para colar — sem inventar experiências ou métricas que não aparecem acima.
3. Se faltar dado, use [ADICIONAR MÉTRICA] ou [ADICIONAR TECH] em vez de inventar.
4. Use o idioma do mercado-alvo (${target.language || "en"}).

## Formato da resposta
**O que mudar:** (1 frase)
**Texto para colar no LinkedIn:**
(texto final)
`;
}

export function buildSSIFixPrompt(
  pillar: { label: string; color_pt: string; score: number; rating: string; meaning: string; tips: string[] },
  profile: Profile,
  target: Target,
): string {
  const tips = pillar.tips.slice(0, 5).map(t => `- ${t}`).join("\n");
  return `Você é um coach de LinkedIn para desenvolvedores que querem mais inbound de recrutadores.

Quero melhorar meu **Social Selling Index (SSI)** em um pilar específico.

## Pilar a melhorar
- ${pillar.label} (${pillar.color_pt})
- Score atual: ${pillar.score}/25 — ${pillar.rating}
- O que significa: ${pillar.meaning}

## Meu contexto
${targetBlock(target)}
- Nome: ${profile.name || "—"}
- Headline atual: ${profile.headline || "—"}

## Ações recomendadas para este pilar
${tips}

## Sua tarefa
Crie um **plano de 7 dias** com ações concretas e executáveis para subir este pilar do SSI.
Inclua:
1. 3 ações para fazer hoje (com exemplos de buscas, posts ou mensagens)
2. Rotina semanal mínima (tempo em minutos/dia)
3. 2 templates prontos (mensagem de conexão OU comentário em post OU ideia de post técnico)
4. Como medir se está funcionando

Foque em devs buscando vagas em mercado **${target.market}**.
Não invente experiências do meu currículo.
`;
}

export function attachFixPrompts(findings: Finding[], profile: Profile): void {
  const target = profile.target;
  for (const finding of findings) {
    if (finding.severity === "critical" || finding.severity === "warning" || finding.severity === "info") {
      finding.fix_prompt = buildFixPrompt(finding, profile, target);
    }
  }
}
