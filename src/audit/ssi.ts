import { SSI } from "../models";

interface PillarMeta {
  label: string;
  color: string;
  color_pt: string;
  meaning: string;
  tips_weak: string[];
  tips_ok: string[];
  tips_strong: string[];
}

const PILLAR_META: Record<string, PillarMeta> = {
  professional_brand: {
    label: "Establish your professional brand",
    color: "orange",
    color_pt: "Laranja",
    meaning: "Quão bem seu perfil vende quem você é para recrutadores.",
    tips_weak: [
      "Seu perfil está mal posicionado — recrutadores não entendem em 5 segundos o que você faz.",
      "Reescreva a headline no padrão: Posição | Áreas fortes | Tecnologias (ex: Senior Data Engineer | Data Platform, CDP & Reliability | GCP · Airflow · BigQuery · Spark · Terraform · AI Automation).",
      "Reescreva o About em inglês se busca vaga internacional: quem você é, escala, métricas, stack e CTA.",
      "Adicione foto profissional e banner com sua stack ou área (GCP, Data, AI).",
      "Preencha a Featured section: artigo técnico, projeto GitHub, certificação ou post de autoridade.",
      "Fixe as 3 skills mais relevantes ao cargo que você busca.",
      "Peça 2–3 recomendações de gestores ou colegas com cargo similar ao que você quer.",
    ],
    tips_ok: [
      "Bom começo — refine headline e About com mais uma métrica concreta.",
      "Adicione Featured section se ainda estiver vazia.",
    ],
    tips_strong: [
      "Marca profissional forte. Mantenha headline e About atualizados a cada mudança de foco.",
    ],
  },
  find_people: {
    label: "Find the right people",
    color: "purple",
    color_pt: "Roxo",
    meaning: "Se sua rede não tem recrutadores e profissionais da sua área, você não aparece para quem contrata.",
    tips_weak: [
      "Sua rede está fraca para inbound — adicione recrutadores e pessoas da mesma área.",
      "No search do LinkedIn, busque: \"Technical Recruiter\" + sua stack (ex: Data Engineer recruiter GCP).",
      "Busque o cargo-alvo (ex: \"Senior Data Engineer\") e conecte com 10–20 pessoas por semana.",
      "Busque \"Talent Acquisition\" + empresa-alvo (onde você quer trabalhar) e adicione os recrutadores.",
      "Conecte com colegas de empresas onde você quer trabalhar — mesmo sem conversar ainda.",
      "Siga páginas de empresas-alvo e comente nos posts delas (ajuda o algoritmo a te mostrar).",
      "Use o filtro People → Current company → cargo para mapear quem já está na posição que você quer.",
    ],
    tips_ok: [
      "Rede razoável — dobre conexões com recrutadores da sua stack esta semana.",
      "Busque \"Hiring Data Engineer\" ou \"We're hiring\" nos posts e conecte com quem publicou.",
    ],
    tips_strong: [
      "Rede bem direcionada. Continue adicionando recrutadores de empresas-alvo.",
    ],
  },
  engage_insights: {
    label: "Engage with insights",
    color: "green",
    color_pt: "Verde",
    meaning: "LinkedIn premia quem interage. Sem curtir, comentar e postar, você fica invisível.",
    tips_weak: [
      "Você quase não engaja — o algoritmo não mostra seu perfil para recrutadores.",
      "Sei que é chato, mas ajuda muito: curta e comente posts de líderes da sua área (3–5x por semana).",
      "Faça pelo menos 1 post técnico por semana. O ideal é 1 por dia (mesmo curto).",
      "Ideias de post: problema que você resolveu, stack que usa, lição de projeto, opinião sobre trend.",
      "Comente com valor (não só \"ótimo post\") — recrutadores veem comentários públicos.",
      "Compartilhe artigo técnico com 2 linhas do porquê importa para você.",
      "Republique posts de Data Engineering / sua stack com sua perspectiva.",
    ],
    tips_ok: [
      "Engajamento mediano — suba para 1 post técnico/semana + comentários diários.",
      "Agende 15 min/dia só para comentar em 3 posts do nicho.",
    ],
    tips_strong: [
      "Bom engajamento. Mantenha consistência — o algoritmo recompensa frequência.",
    ],
  },
  build_relationships: {
    label: "Build relationships",
    color: "teal",
    color_pt: "Verde-água",
    meaning: "Conexão sem conversa não gera oportunidade. Relacionamento sim.",
    tips_weak: [
      "Você adiciona pessoas mas não conversa — conexão parada não vira contato.",
      "Adicione pessoas que você já conhece (ex-colegas, faculdade, meetups) e mande mensagem.",
      "Template: \"Oi [nome], vi que você trabalha com [X]. Também atuo com [stack]. Vamos nos conectar!\"",
      "Responda DMs de recrutadores em menos de 24h — mesmo para dizer que não tem interesse agora.",
      "Após conectar com recrutador, envie nota curta: stack + disponibilidade + tipo de vaga.",
      "Reative conexões antigas: \"Oi, faz tempo! Estou aberto a oportunidades em [área].\"",
      "Participe de grupos do LinkedIn da sua stack e interaja nos posts.",
    ],
    tips_ok: [
      "Relacionamentos ok — foque em follow-up com recrutadores que já te adicionaram.",
      "Marque 30 min/semana para responder DMs e mensagens pendentes.",
    ],
    tips_strong: [
      "Boa construção de relacionamentos. Continue nutriendo conexões com recrutadores ativos.",
    ],
  },
};

function pillarRating(score: number): string {
  if (score >= 18) return "forte";
  if (score >= 12) return "ok";
  return "fraco";
}

function totalRating(total: number): { rating: string; color: string; summary: string } {
  if (total >= 50) {
    return {
      rating: "bom",
      color: "green",
      summary: "SSI bom (50+). Você já tem presença — agora foque em consistência e no pilar mais fraco.",
    };
  }
  if (total >= 30) {
    return {
      rating: "mediano",
      color: "orange",
      summary: "SSI mediano (30-49). Está no caminho, mas ainda perde inbound. Suba o pilar mais fraco para passar de 50.",
    };
  }
  return {
    rating: "fraco",
    color: "red",
    summary: "SSI fraco (abaixo de 30). Recrutadores quase não te encontram. Priorize rede e engajamento já.",
  };
}

function tipsForPillar(key: string, rating: string): string[] {
  const meta = PILLAR_META[key];
  if (rating === "fraco") return meta.tips_weak;
  if (rating === "ok") return meta.tips_ok;
  return meta.tips_strong;
}

export interface PillarScore {
  key: string;
  label: string;
  color: string;
  color_pt: string;
  meaning: string;
  score: number;
  rating: string;
  advice: string;
  tips: string[];
  fix_prompt?: string;
}

export interface SSIInterpretation {
  total: number | null;
  total_rating: { rating: string; color: string; summary: string } | null;
  pillars: PillarScore[];
  weakest: PillarScore | null;
  action_plan: string[];
}

export function interpretSSI(ssi: SSI): SSIInterpretation {
  const result: SSIInterpretation = {
    total: ssiTotal(ssi),
    total_rating: null,
    pillars: [],
    weakest: null,
    action_plan: [],
  };
  if (result.total !== null) {
    result.total_rating = totalRating(result.total);
  }
  const pillars: [string, number | null][] = [
    ["professional_brand", ssi.professional_brand],
    ["find_people", ssi.find_people],
    ["engage_insights", ssi.engage_insights],
    ["build_relationships", ssi.build_relationships],
  ];
  const scored: [number, PillarScore][] = [];
  for (const [key, value] of pillars) {
    if (value === null) continue;
    const meta = PILLAR_META[key];
    const rating = pillarRating(value);
    const tips = tipsForPillar(key, rating);
    const entry: PillarScore = {
      key,
      label: meta.label,
      color: meta.color,
      color_pt: meta.color_pt,
      meaning: meta.meaning,
      score: value,
      rating,
      advice: tips[0] || "",
      tips,
    };
    result.pillars.push(entry);
    scored.push([value, entry]);
  }

  if (scored.length) {
    scored.sort((a, b) => a[0] - b[0]);
    result.weakest = scored[0][1];
    for (const [, pillar] of scored.slice(0, 2)) {
      if (pillar.rating === "fraco") {
        result.action_plan.push(...pillar.tips.slice(0, 3));
      }
    }
  }
  return result;
}

function ssiTotal(ssi: SSI): number | null {
  const parts = [ssi.professional_brand, ssi.find_people, ssi.engage_insights, ssi.build_relationships];
  if (parts.some(p => p === null)) return null;
  return Math.round((parts.reduce((a, b) => a! + b!, 0)!) * 10) / 10;
}
