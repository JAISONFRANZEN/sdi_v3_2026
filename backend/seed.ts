/**
 * SDI v4 — Seed Completo
 * Popula o banco de dados com:
 * - Usuário admin padrão
 * - Checklist Residencial (6 seções, 47 itens)
 * - Checklist MPSC (9 seções, 61 itens — inclui S9 Impactos Climáticos)
 * - Unidades de exemplo
 *
 * Executar: npx ts-node seed.ts
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { createConnection } from "mysql2/promise";
import { eq } from "drizzle-orm";
import { hashPassword } from "./src/auth";
import {
  users,
  userProfiles,
  checklists,
  sections,
  items,
  units,
  inspections,
  answers,
  recommendations,
} from "./drizzle/schema";

async function seed() {
  const connection = await createConnection(
    process.env.DATABASE_URL || "mysql://user:password@host:port/database"
  );
  const db = drizzle(connection);

  console.log("🌱 Iniciando seed SDI v4...");

  // Limpar dados existentes respeitando dependências de FK.
  // Usuários são preservados (dedup por e-mail abaixo).
  console.log("  → Limpando dados anteriores...");
  await db.delete(recommendations);
  await db.delete(answers);
  await db.delete(inspections);
  await db.delete(items);
  await db.delete(sections);
  await db.delete(checklists);
  await db.delete(units);

  // ─── ADMIN ─────────────────────────────────────────────────────────────────

  console.log("  → Criando usuário admin...");
  const [existingAdmin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "admin@mpsc.mp.br"));

  let adminId: number;
  if (existingAdmin) {
    adminId = existingAdmin.id;
  } else {
    const [adminResult] = await db.insert(users).values({
      email: "admin@mpsc.mp.br",
      passwordHash: hashPassword("Admin@2026"),
      name: "Administrador CISI",
      role: "admin",
    });
    adminId = adminResult.insertId;

    await db.insert(userProfiles).values({
      userId: adminId,
      matricula: "000001",
      cargo: "Coordenador CISI",
      lotacao: "CISI - Coordenadoria de Inteligência e Segurança Institucional",
      comarca: "Florianópolis",
    });
    console.log('    Admin criado: admin@mpsc.mp.br / "Admin@2026" (troque em produção)');
  }

  // ─── CHECKLIST RESIDENCIAL ─────────────────────────────────────────────────

  console.log("  → Criando checklist Residencial...");
  const [residencialResult] = await db.insert(checklists).values({
    name: "Diagnóstico de Segurança Residencial",
    profileType: "residencial",
    description:
      "Checklist para avaliação de segurança de residências de membros e servidores do MPSC.",
  });
  const residencialId = residencialResult.insertId;

  const residencialSections = [
    {
      order: 1,
      name: "Segurança Perimetral",
      weight: 1,
      items: [
        "A residência possui muro, cerca ou grade no perímetro externo?",
        "A altura do muro/cerca é adequada (mínimo 2,5m)?",
        "Existe concertina, cerca elétrica ou outro elemento dissuasório no topo?",
        "O portão de acesso de veículos é automatizado?",
        "O portão de pedestres possui fechadura de segurança ou controle de acesso?",
        "Há vegetação alta próxima ao muro que possa facilitar escalada?",
        "O perímetro está livre de pontos cegos ou áreas sem visibilidade?",
        "Existe iluminação perimetral ativada por sensor de presença?",
      ],
    },
    {
      order: 2,
      name: "Acessos Diretos (Portas)",
      weight: 1,
      items: [
        "A porta principal possui fechadura de alta segurança (tetra ou superior)?",
        "Existe olho mágico ou câmera na porta principal?",
        "As dobradiças das portas externas são internas (não removíveis por fora)?",
        "Há porta de segurança (blindada ou reforçada) em algum acesso?",
        "As portas dos fundos e laterais possuem trancas adicionais?",
        "Existe interfone ou vídeo-porteiro para identificação de visitantes?",
      ],
    },
    {
      order: 3,
      name: "Janelas e Aberturas",
      weight: 1,
      items: [
        "As janelas do pavimento térreo possuem grades ou telas de segurança?",
        "As janelas possuem fechos ou travas de segurança internos?",
        "Há janelas basculantes que permitem acesso quando abertas?",
        "Os vidros das janelas são temperados ou laminados?",
        "Existe película de segurança nos vidros do pavimento térreo?",
      ],
    },
    {
      order: 4,
      name: "Sistemas Eletrônicos de Segurança",
      weight: 1,
      items: [
        "A residência possui sistema de alarme monitorado?",
        "Existem câmeras de segurança (CFTV) instaladas?",
        "As câmeras cobrem todos os acessos (portões, portas, garagem)?",
        "O sistema de gravação armazena imagens por no mínimo 30 dias?",
        "Há sensor de presença nas áreas externas?",
        "O sistema de alarme possui bateria backup (funciona sem energia)?",
        "Existe botão de pânico ou acionamento silencioso?",
        "O sistema permite monitoramento remoto (app/celular)?",
        "Há sensor de abertura em portas e janelas principais?",
        "O cabeamento do sistema está protegido contra sabotagem?",
        "Existe sirene externa visível como elemento dissuasório?",
      ],
    },
    {
      order: 5,
      name: "Iluminação e Visibilidade",
      weight: 1,
      items: [
        "A iluminação externa cobre toda a frente do imóvel?",
        "Há iluminação com sensor de presença nas laterais e fundos?",
        "A garagem possui iluminação adequada?",
        "A numeração do imóvel é visível para viaturas e serviços de emergência?",
        "Existe iluminação de emergência (funciona na falta de energia)?",
      ],
    },
    {
      order: 6,
      name: "Procedimentos e Hábitos de Segurança",
      weight: 1,
      items: [
        "Os moradores possuem rotinas variáveis de horários de saída/chegada?",
        "Existe procedimento definido para recebimento de encomendas/entregas?",
        "Os moradores evitam expor informações pessoais em redes sociais?",
        "Há procedimento para verificação de identidade de prestadores de serviço?",
        "Existe plano de evacuação ou ponto de encontro familiar em emergências?",
        "Os moradores conhecem os números de emergência e contatos de segurança?",
        "Há cofre para guarda de documentos e objetos de valor?",
        "As chaves reserva estão guardadas em local seguro (não sob tapete/vaso)?",
        "Existe comunicação com vizinhos sobre segurança (rede de vigilância)?",
        "Os veículos são estacionados sempre dentro da garagem?",
        "Há procedimento para viagens (simulação de presença, recolhimento de correspondência)?",
        "Os moradores evitam atender desconhecidos sem verificação prévia?",
      ],
    },
  ];

  for (const sec of residencialSections) {
    const [secResult] = await db.insert(sections).values({
      checklistId: residencialId,
      sectionOrder: sec.order,
      sectionName: sec.name,
      weight: sec.weight,
    });
    const sectionId = secResult.insertId;

    for (let i = 0; i < sec.items.length; i++) {
      await db.insert(items).values({
        sectionId,
        itemOrder: i + 1,
        itemText: sec.items[i],
        isSubheading: false,
        isInverted: false,
      });
    }
  }

  // ─── CHECKLIST MPSC ────────────────────────────────────────────────────────

  console.log("  → Criando checklist MPSC...");
  const [mpscResult] = await db.insert(checklists).values({
    name: "Diagnóstico de Segurança - Unidades MPSC",
    profileType: "mpsc",
    description:
      "Checklist para avaliação de segurança das instalações físicas do Ministério Público de Santa Catarina.",
  });
  const mpscId = mpscResult.insertId;

  interface MpscItem {
    text: string;
    isSubheading?: boolean;
    isInverted?: boolean;
  }

  const mpscSections: {
    order: number;
    name: string;
    weight: number;
    items: MpscItem[];
  }[] = [
    {
      order: 1,
      name: "Segurança Perimetral",
      weight: 4,
      items: [
        { text: "A edificação possui barreira perimetral (muro, grade ou cerca) em todo o perímetro?" },
        { text: "A barreira perimetral possui altura mínima de 2,5 metros?" },
        { text: "Existe elemento dissuasório no topo (concertina, cerca elétrica, lanças)?" },
        { text: "O portão de acesso de veículos é automatizado com controle de acesso?" },
        { text: "Há portaria ou recepção com controle de entrada de pessoas?" },
        { text: "O perímetro está livre de vegetação alta que facilite escalada ou ocultação?" },
        { text: "Existem pontos cegos no perímetro sem cobertura visual ou eletrônica?" },
        { text: "A iluminação perimetral é adequada e possui acionamento automático (sensor/timer)?" },
      ],
    },
    {
      order: 2,
      name: "Acessos Diretos (Portas e Entradas)",
      weight: 5,
      items: [
        { text: "As portas de acesso principal possuem fechaduras de alta segurança?" },
        { text: "Existe controle de acesso eletrônico (crachá, biometria, senha) nas entradas?" },
        { text: "As portas de emergência possuem barra antipânico e alarme de abertura?" },
        { text: "Há registro (log) de entrada e saída de pessoas no edifício?" },
        { text: "As áreas restritas (gabinetes, arquivo, TI) possuem controle de acesso diferenciado?" },
        { text: "Existe procedimento formal para controle de visitantes (identificação, registro, acompanhamento)?" },
      ],
    },
    {
      order: 3,
      name: "Janelas e Aberturas",
      weight: 3,
      items: [
        { text: "As janelas do pavimento térreo possuem grades, telas ou películas de segurança?" },
        { text: "As janelas possuem fechos ou travas de segurança internos?" },
        { text: "Os vidros são temperados ou laminados (resistentes a impacto)?" },
        { text: "Há aberturas (basculantes, exaustores) que permitam acesso não autorizado?" },
        { text: "As janelas de áreas sensíveis (arquivo, TI, gabinetes) possuem proteção reforçada?" },
      ],
    },
    {
      order: 4,
      name: "Sistemas Eletrônicos de Segurança",
      weight: 5,
      items: [
        { text: "A unidade possui sistema de CFTV (câmeras) em funcionamento?" },
        { text: "As câmeras cobrem todos os acessos, corredores e áreas comuns?" },
        { text: "O sistema de gravação armazena imagens por no mínimo 30 dias?" },
        { text: "Existe sistema de alarme monitorado 24h?" },
        { text: "O sistema de alarme possui bateria backup (funciona sem energia elétrica)?" },
        { text: "Há botão de pânico ou acionamento silencioso disponível?" },
        { text: "Existe sensor de presença em áreas críticas (após expediente)?" },
        { text: "O sistema permite monitoramento remoto pela CISI ou empresa contratada?" },
        { text: "Há controle de acesso eletrônico integrado ao sistema de segurança?" },
        { text: "O cabeamento dos sistemas está protegido contra sabotagem (em eletrodutos)?" },
        { text: "Existe nobreak ou gerador que garanta funcionamento dos sistemas em falta de energia?" },
      ],
    },
    {
      order: 5,
      name: "Iluminação e Sinalização",
      weight: 3,
      items: [
        { text: "A iluminação externa cobre toda a fachada e acessos do edifício?" },
        { text: "Há iluminação com sensor de presença nas áreas de estacionamento?" },
        { text: "A sinalização de emergência (rotas de fuga, saídas) está visível e atualizada?" },
        { text: "Existe iluminação de emergência autônoma nos corredores e escadas?" },
        { text: "A identificação do prédio (placa, número) é visível para serviços de emergência?" },
      ],
    },
    {
      order: 6,
      name: "Segurança Contra Incêndio",
      weight: 4,
      items: [
        { text: "A edificação possui AVCB/CLCB (Auto de Vistoria do Corpo de Bombeiros) válido?" },
        { text: "Os extintores estão dentro da validade, sinalizados e desobstruídos?" },
        { text: "Existe sistema de hidrantes ou sprinklers conforme exigência do CBMSC?" },
        { text: "Há detectores de fumaça instalados nas áreas críticas?" },
        { text: "As rotas de fuga estão desobstruídas e sinalizadas com fotoluminescência?" },
        { text: "A brigada de incêndio está constituída e treinada (ou há responsável designado)?" },
      ],
    },
    {
      order: 7,
      name: "Segurança da Informação (Física)",
      weight: 4,
      items: [
        { text: "A sala de servidores/rack de TI possui controle de acesso restrito?" },
        { text: "Há sistema de climatização adequado na sala de TI (temperatura controlada)?" },
        { text: "O cabeamento de rede está organizado, identificado e protegido?" },
        { text: "Existe política de mesa limpa e tela bloqueada implementada?" },
      ],
    },
    {
      order: 8,
      name: "Procedimentos Operacionais de Segurança",
      weight: 5,
      items: [
        { text: "Existe Plano de Segurança Orgânica (PSO) formalizado para a unidade?" },
        { text: "Há procedimento escrito para situações de emergência (ameaça, invasão, incêndio)?" },
        { text: "Os servidores receberam treinamento ou orientação sobre segurança institucional?" },
        { text: "Existe canal de comunicação direto com a CISI ou segurança institucional?" },
        { text: "Há ronda ou vigilância patrimonial (própria ou terceirizada) na unidade?" },
        { text: "O controle de chaves é formalizado (registro de quem possui cópia)?" },
        { text: "Existe procedimento para abertura e fechamento da unidade (checklist diário)?" },
        { text: "Há registro de ocorrências de segurança (livro ou sistema eletrônico)?" },
      ],
    },
    {
      order: 9,
      name: "Impactos Climáticos e Ambientais",
      weight: 4,
      items: [
        // 9.1 Inundações e Alagamentos
        { text: "9.1. Inundações e Alagamentos", isSubheading: true },
        {
          text: "O entorno imediato e as vias de acesso à edificação possuem histórico de alagamentos que dificultam ou impedem a chegada ao local?",
          isInverted: true,
        },
        {
          text: "A edificação possui histórico de inundação ou alagamento que tenha atingido o seu interior?",
          isInverted: true,
        },
        {
          text: "A edificação dispõe de mecanismos físicos para mitigar a entrada de água (ex: nível do piso elevado em relação à rua, comportas, bombas de sucção ou escoamento eficiente)?",
        },
        {
          text: "Os ativos críticos de TI (racks, switches, servidores locais) estão posicionados em andares superiores ou fixados em locais elevados (ex: próximos ao teto) para evitar danos por lâmina d'água?",
        },
        {
          text: "O acervo documental (arquivos físicos) está armazenado de forma segura contra inundações (em andares superiores ou sobre estrados/prateleiras elevadas)?",
        },
        // 9.2 Riscos Geológicos e do Entorno
        { text: "9.2. Riscos Geológicos e do Entorno", isSubheading: true },
        {
          text: "A edificação está localizada em encosta, área de risco geológico mapeada (Defesa Civil) ou apresenta vulnerabilidades no entorno imediato (ex: risco de deslizamento, desmoronamento de muros de arrimo ou queda de árvores de grande porte)?",
          isInverted: true,
        },
        // 9.3 Riscos Atmosféricos e Estruturais
        { text: "9.3. Riscos Atmosféricos e Estruturais", isSubheading: true },
        {
          text: "A edificação apresenta vulnerabilidade aparente ou histórico de danos estruturais causados por ventos fortes e ciclones extratropicais (ex: destelhamentos recorrentes, quebra de vidraças)?",
          isInverted: true,
        },
        {
          text: "A edificação possui Sistema de Proteção contra Descargas Atmosféricas (SPDA - Para-raios) instalado e aterramento adequado para proteger a infraestrutura elétrica e de dados?",
        },
      ],
    },
  ];

  for (const sec of mpscSections) {
    const [secResult] = await db.insert(sections).values({
      checklistId: mpscId,
      sectionOrder: sec.order,
      sectionName: sec.name,
      weight: sec.weight,
    });
    const sectionId = secResult.insertId;

    let itemOrder = 0;
    for (const item of sec.items) {
      itemOrder++;
      await db.insert(items).values({
        sectionId,
        itemOrder,
        itemText: item.text,
        isSubheading: item.isSubheading ?? false,
        isInverted: item.isInverted ?? false,
      });
    }
  }

  // ─── UNIDADES DE EXEMPLO ───────────────────────────────────────────────────

  console.log("  → Criando unidades de exemplo...");
  const unitData = [
    {
      name: "Promotoria de Justiça de São Joaquim",
      code: "PJ-SJQ",
      type: "Isolada" as const,
      status: "ativa" as const,
      comarca: "São Joaquim",
      isIsolated: true,
      distanceFromSede: "120.50",
    },
    {
      name: "Promotoria de Justiça de Bom Jardim da Serra",
      code: "PJ-BJS",
      type: "Isolada" as const,
      status: "ativa" as const,
      comarca: "São Joaquim",
      isIsolated: true,
      distanceFromSede: "145.00",
    },
    {
      name: "GAECO - Florianópolis",
      code: "GAECO-FLN",
      type: "GAECO" as const,
      status: "ativa" as const,
      comarca: "Florianópolis",
      isIsolated: false,
      distanceFromSede: "0.00",
    },
    {
      name: "Promotoria de Justiça de Anita Garibaldi",
      code: "PJ-ANG",
      type: "Isolada" as const,
      status: "ativa" as const,
      comarca: "Campos Novos",
      isIsolated: true,
      distanceFromSede: "95.30",
    },
    {
      name: "Sede Administrativa - Florianópolis",
      code: "SEDE-FLN",
      type: "Administrativo" as const,
      status: "ativa" as const,
      comarca: "Florianópolis",
      isIsolated: false,
      distanceFromSede: "0.00",
    },
    {
      name: "Promotoria de Justiça de Urupema",
      code: "PJ-URP",
      type: "Isolada" as const,
      status: "em_comissionamento" as const,
      comarca: "São Joaquim",
      isIsolated: true,
      distanceFromSede: "130.00",
    },
    {
      name: "Promotoria de Justiça de Ponte Serrada",
      code: "PJ-PTS",
      type: "Isolada" as const,
      status: "ativa" as const,
      comarca: "Joaçaba",
      isIsolated: true,
      distanceFromSede: "85.70",
    },
    {
      name: "Fórum de Justiça - Blumenau (Ala MPSC)",
      code: "FJ-BLU-MPSC",
      type: "Fórum de Justiça - Ala" as const,
      status: "ativa" as const,
      comarca: "Blumenau",
      isIsolated: false,
      distanceFromSede: "0.00",
    },
  ];

  for (const unit of unitData) {
    await db.insert(units).values(unit);
  }

  console.log("✅ Seed concluído com sucesso!");
  console.log("   • 1 usuário admin");
  console.log("   • 1 checklist Residencial (6 seções, 47 itens)");
  console.log("   • 1 checklist MPSC (9 seções, 61 itens + 3 subcabeçalhos)");
  console.log("   • 8 unidades de exemplo");
  await connection.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Erro no seed:", err);
  process.exit(1);
});
