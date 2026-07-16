import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { createConnection } from "mysql2/promise";
import { eq } from "drizzle-orm";
import {
  checklists,
  sections,
  items,
  answers,
  recommendations,
  inspections,
  users,
} from "./drizzle/schema";
import { hashPassword } from "./src/auth";

async function main() {
  const connection = await createConnection(
    process.env.DATABASE_URL || "mysql://user:password@host:port/database"
  );
  const db = drizzle(connection);

  console.log("Iniciando seed do banco de dados...");

  // Limpar tabelas existentes respeitando dependências de FK (opcional, para testes)
  await db.delete(recommendations);
  await db.delete(answers);
  await db.delete(inspections);
  await db.delete(items);
  await db.delete(sections);
  await db.delete(checklists);

  const [existingAdmin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "admin@checklist.local"));

  if (!existingAdmin) {
    await db.insert(users).values({
      email: "admin@checklist.local",
      passwordHash: hashPassword("troque-esta-senha"),
      name: "Administrador",
      role: "admin",
    });
    console.log('Usuário admin criado: admin@checklist.local / "troque-esta-senha" (troque em produção)');
  }

  // --- Checklist Residencial ---
  const [residentialChecklist] = await db.insert(checklists).values({
    name: "Checklist Residencial",
    profileType: "residencial",
    description: "Checklist de segurança para residências.",
  });

  const residentialSections = [
    { sectionOrder: 1, sectionName: "Segurança Perimetral e Acessos Externos" },
    { sectionOrder: 2, sectionName: "Portas e Acessos Diretos à Residência" },
    { sectionOrder: 3, sectionName: "Janelas e Outras Aberturas" },
    { sectionOrder: 4, sectionName: "Sistemas Eletrônicos de Segurança" },
    { sectionOrder: 5, sectionName: "Iluminação e Visibilidade" },
    { sectionOrder: 6, sectionName: "Hábitos e Procedimentos de Segurança" },
  ];

  for (const sec of residentialSections) {
    const [newSection] = await db.insert(sections).values({
      checklistId: residentialChecklist.insertId,
      sectionOrder: sec.sectionOrder,
      sectionName: sec.sectionName,
    });

    let sectionItems: { itemText: string; isSubheading?: boolean }[] = [];
    if (sec.sectionOrder === 1) {
      sectionItems = [
        { itemText: "1.1. Muros e Cercas:", isSubheading: true },
        { itemText: "Altura dos muros/cercas é adequada (superior a 2,5 metros)?" },
        { itemText: "Existem pontos de escalada fáceis (árvores próximas, texturas, vãos)?" },
        { itemText: "A estrutura do muro/cerca está em bom estado (sem rachaduras, buracos ou partes soltas)?" },
        { itemText: "Existem concertinas, cercas elétricas ou outros elementos de proteção de topo?" },
        { itemText: "1.2. Portões de Garagem:", isSubheading: true },
        { itemText: "Portões de acesso de veículos são robustos?" },
        { itemText: "Portões de pedestres possuem fechaduras seguras?" },
        { itemText: "O portão é automatizado e com controle de acesso seguro (ex. código rolante)?" },
        { itemText: "O portão possui sistema de travamento manual em caso de falha de energia?" },
        { itemText: "A estrutura do portão é resistente a arrombamento?" },
        { itemText: "Existe porta de acesso interna da garagem para a casa? Se sim, é reforçada?" },
      ];
    } else if (sec.sectionOrder === 2) {
      sectionItems = [
        { itemText: "2.1. Portas Principais e de Serviço:", isSubheading: true },
        { itemText: "As portas são de material sólido (madeira maciça, aço)?" },
        { itemText: "As fechaduras são de segurança (ex: tetra, multiponto, digital)?" },
        { itemText: "Existem fechaduras auxiliares (ex: travas tetra, ferrolhos)?" },
        { itemText: "As dobradiças estão instaladas pelo lado interno ou possuem pinos de segurança?" },
        { itemText: "O batente da porta está bem fixado e em bom estado?" },
        { itemText: "Existe olho mágico ou sistema de vídeo porteiro?" },
        { itemText: "2.2. Portas de Vidro e Janelas-Porta:", isSubheading: true },
        { itemText: "O vidro é laminado, temperado ou possui película de segurança?" },
        { itemText: "As travas são robustas e funcionais?" },
        { itemText: "Existem travas adicionais para portas de correr (ex: trava-cadeado, pinos)?" },
      ];
    } else if (sec.sectionOrder === 3) {
      sectionItems = [
        { itemText: "3.1. Janelas em Geral:", isSubheading: true },
        { itemText: "As janelas do térreo possuem grades de proteção?" },
        { itemText: "As grades estão bem fixadas (chumbadas na parede)?" },
        { itemText: "As travas das janelas são eficientes e estão em bom estado?" },
        { itemText: "Existem janelas em locais de fácil acesso (próximas a telhados, muros, árvores)?" },
        { itemText: "O vidro das janelas é resistente (laminado ou temperado)?" },
        { itemText: "3.2. Acessos Superiores:", isSubheading: true },
        { itemText: "Existem varandas ou sacadas com fácil acesso a partir do exterior?" },
        { itemText: "Há acesso ao telhado por meio de estruturas vizinhas ou árvores?" },
        { itemText: "Clarabóias e alçapões estão devidamente travados e protegidos?" },
      ];
    } else if (sec.sectionOrder === 4) {
      sectionItems = [
        { itemText: "4.1. Alarmes:", isSubheading: true },
        { itemText: "O imóvel possui sistema de alarme monitorado?" },
        { itemText: "Os sensores cobrem todas as áreas vulneráveis (portas, janelas, áreas de acesso)?" },
        { itemText: "A central de alarme está em local protegido e discreto?" },
        { itemText: "O sistema possui bateria de emergência em caso de falta de energia?" },
        { itemText: "4.2. Câmeras (CFTV):", isSubheading: true },
        { itemText: "O sistema de câmeras cobre os principais pontos de acesso e perímetro?" },
        { itemText: "A qualidade da imagem (resolução) é suficiente para identificação?" },
        { itemText: "As câmeras possuem visão noturna (infravermelho)?" },
        { itemText: "O gravador de imagens (DVR/NVR) está em local seguro e protegido?" },
        { itemText: "O sistema permite acesso remoto para monitoramento?" },
      ];
    } else if (sec.sectionOrder === 5) {
      sectionItems = [
        { itemText: "5.1. Iluminação Externa:", isSubheading: true },
        { itemText: "As áreas externas (frente, fundos, laterais) são bem iluminadas à noite?" },
        { itemText: "Há luzes com sensores de movimento em pontos estratégicos?" },
        { itemText: "As lâmpadas estão em bom estado de funcionamento?" },
        { itemText: "5.2. Visibilidade:", isSubheading: true },
        { itemText: "A vegetação (árvores, arbustos) está aparada e não obstrui a visão de portas e janelas?" },
        { itemText: "Existem pontos cegos ao redor da propriedade que poderiam ocultar uma pessoa?" },
      ];
    } else if (sec.sectionOrder === 6) {
      sectionItems = [
        { itemText: "6.1. Comportamento dos Moradores:", isSubheading: true },
        { itemText: "As portas e janelas são mantidas trancadas, mesmo com pessoas em casa?" },
        { itemText: 'Há o costume de deixar chaves "escondidas" em locais previsíveis (vasos, debaixo do tapete)?' },
        { itemText: "O controle de acesso de visitantes e prestadores de serviço é rigoroso?" },
        { itemText: "Evita-se a exposição de bens de valor visíveis do exterior (TVs, computadores)?" },
        { itemText: "Há o hábito de divulgar viagens e ausências prolongadas em redes sociais?" },
        { itemText: "A caixa de correio é esvaziada regularmente?" },
      ];
    }

    for (const [idx, item] of sectionItems.entries()) {
      await db.insert(items).values({
        sectionId: newSection.insertId,
        itemOrder: idx + 1,
        itemText: item.itemText,
        isSubheading: item.isSubheading || false,
      });
    }
  }

  // --- Checklist MPSC ---
  const [mpscChecklist] = await db.insert(checklists).values({
    name: "Checklist MPSC - Instalações Físicas",
    profileType: "mpsc",
    description: "Checklist de segurança para instalações físicas do Ministério Público de Santa Catarina.",
  });

  const mpscSections = [
    { sectionOrder: 1, sectionName: "Segurança Perimetral e Acessos Externos" },
    { sectionOrder: 2, sectionName: "Acessos Diretos à Edificação" },
    { sectionOrder: 3, sectionName: "Janelas, Aberturas e Acessos Superiores" },
    { sectionOrder: 4, sectionName: "Sistemas Eletrônicos de Segurança" },
    { sectionOrder: 5, sectionName: "Iluminação, Visibilidade e Sinalização" },
    { sectionOrder: 6, sectionName: "Segurança Contra Incêndio e Emergências" },
    { sectionOrder: 7, sectionName: "Segurança da Informação e Acervo" },
    { sectionOrder: 8, sectionName: "Procedimentos Operacionais e Cultura de Segurança" },
  ];

  for (const sec of mpscSections) {
    const [newSection] = await db.insert(sections).values({
      checklistId: mpscChecklist.insertId,
      sectionOrder: sec.sectionOrder,
      sectionName: sec.sectionName,
    });

    let sectionItems: { itemText: string; isSubheading?: boolean }[] = [];
    if (sec.sectionOrder === 1) {
      sectionItems = [
        { itemText: "S1.1 - Controle de Perímetro", isSubheading: true },
        { itemText: "A edificação possui barreiras físicas adequadas (muros, grades, cercas) em todo o perímetro?" },
        { itemText: "As barreiras físicas estão em bom estado de conservação (sem rachaduras, buracos ou partes soltas)?" },
        { itemText: "Existem elementos de proteção de topo (concertinas, cercas elétricas) onde aplicável?" },
        { itemText: "O perímetro é monitorado por câmeras de segurança (CFTV)?" },
        { itemText: "Existem pontos de vulnerabilidade no perímetro (árvores próximas, estruturas que facilitam escalada)?" },
        { itemText: "S1.2 - Portões e Acessos de Veículos", isSubheading: true },
        { itemText: "Os portões de acesso de veículos são robustos e em bom estado?" },
        { itemText: "O portão é automatizado com controle de acesso seguro (ex: código rolante, cartão)?" },
        { itemText: "O portão possui sistema de travamento manual em caso de falha de energia?" },
        { itemText: "S1.3 - Portões e Acessos de Pedestres", isSubheading: true },
        { itemText: "Os acessos de pedestres possuem fechaduras seguras e controle de acesso?" },
        { itemText: "Existe portaria com identificação obrigatória de visitantes?" },
        { itemText: "O fluxo de entrada e saída de pessoas é controlado e monitorado?" },
        { itemText: "Existe separação entre acesso de público e acesso de membros/servidores?" },
      ];
    } else if (sec.sectionOrder === 2) {
      sectionItems = [
        { itemText: "S2.1 - Portas Principais e de Serviço", isSubheading: true },
        { itemText: "As portas externas são de material sólido e resistente (madeira maciça, aço, vidro blindado)?" },
        { itemText: "As fechaduras são de segurança (tetra, multiponto, digital)?" },
        { itemText: "Existem fechaduras auxiliares (travas tetra, ferrolhos)?" },
        { itemText: "As dobradiças estão instaladas pelo lado interno ou possuem pinos de segurança?" },
        { itemText: "Os batentes estão bem fixados e em bom estado?" },
        { itemText: "S2.2 - Portas de Vidro e Acessos Especiais", isSubheading: true },
        { itemText: "O vidro das portas é laminado, temperado ou possui película de segurança?" },
        { itemText: "As travas das portas de vidro são robustas e funcionais?" },
        { itemText: "Existem travas adicionais para portas de correr?" },
        { itemText: "Portas de emergência possuem barra antipânico e alarme?" },
      ];
    } else if (sec.sectionOrder === 3) {
      sectionItems = [
        { itemText: "S3.1 - Janelas em Geral", isSubheading: true },
        { itemText: "As janelas do térreo e andares acessíveis possuem grades de proteção?" },
        { itemText: "As grades estão bem fixadas (chumbadas na parede)?" },
        { itemText: "As travas das janelas são eficientes e estão em bom estado?" },
        { itemText: "Existem janelas em locais de fácil acesso externo (próximas a telhados, muros, árvores)?" },
        { itemText: "S3.2 - Acessos Superiores e Cobertura", isSubheading: true },
        { itemText: "O vidro das janelas é resistente (laminado ou temperado)?" },
        { itemText: "Existem varandas ou sacadas com fácil acesso a partir do exterior?" },
        { itemText: "Há acesso ao telhado por meio de estruturas vizinhas ou árvores?" },
        { itemText: "Claraboias e alçapões estão devidamente travados e protegidos?" },
        { itemText: "A cobertura/telhado está em bom estado e sem pontos de acesso vulneráveis?" },
      ];
    } else if (sec.sectionOrder === 4) {
      sectionItems = [
        { itemText: "S4.1 - Sistema de Alarme", isSubheading: true },
        { itemText: "O imóvel possui sistema de alarme monitorado?" },
        { itemText: "Os sensores cobrem todas as áreas vulneráveis (portas, janelas, áreas de acesso)?" },
        { itemText: "A central de alarme está em local protegido e discreto?" },
        { itemText: "O sistema possui bateria de emergência em caso de falta de energia?" },
        { itemText: "O alarme está integrado com a central de monitoramento da CISI ou empresa de segurança?" },
        { itemText: "S4.2 - Câmeras de Segurança (CFTV)", isSubheading: true },
        { itemText: "O sistema de câmeras cobre os principais pontos de acesso e perímetro?" },
        { itemText: "A qualidade da imagem (resolução) é suficiente para identificação de pessoas?" },
        { itemText: "As câmeras possuem visão noturna (infravermelho)?" },
        { itemText: "O gravador de imagens (DVR/NVR) está em local seguro e protegido?" },
        { itemText: "O sistema permite acesso remoto para monitoramento?" },
        { itemText: "As gravações são armazenadas por período adequado (mínimo 30 dias)?" },
        { itemText: "S4.3 - Controle de Acesso Eletrônico", isSubheading: true },
        { itemText: "Existe sistema de controle de acesso eletrônico (biometria, cartão, senha)?" },
        { itemText: "O sistema registra logs de entrada e saída?" },
        { itemText: "Áreas restritas (arquivo, TI, sala de cofre) possuem controle de acesso adicional?" },
        { itemText: "Existe pórtico detector de metais na entrada principal?" },
        { itemText: "Existe esteira de Raio X para inspeção de volumes?" },
      ];
    } else if (sec.sectionOrder === 5) {
      sectionItems = [
        { itemText: "S5.1 - Iluminação Externa", isSubheading: true },
        { itemText: "As áreas externas (frente, fundos, laterais) são bem iluminadas à noite?" },
        { itemText: "Há luzes com sensores de movimento em pontos estratégicos?" },
        { itemText: "As lâmpadas estão em bom estado de funcionamento?" },
        { itemText: "A iluminação de emergência está instalada e funcional?" },
        { itemText: "S5.2 - Visibilidade e Sinalização", isSubheading: true },
        { itemText: "A vegetação está aparada e não obstrui a visão de portas, janelas e câmeras?" },
        { itemText: "Existem pontos cegos ao redor da propriedade que poderiam ocultar uma pessoa?" },
        { itemText: "A sinalização de segurança (saídas de emergência, extintores, rotas de fuga) está visível e atualizada?" },
        { itemText: "Existe sinalização de áreas restritas e de acesso controlado?" },
      ];
    } else if (sec.sectionOrder === 6) {
      sectionItems = [
        { itemText: "S6.1 - Equipamentos de Combate a Incêndio", isSubheading: true },
        { itemText: "Existem extintores de incêndio em quantidade e tipo adequados?" },
        { itemText: "Os extintores estão dentro do prazo de validade e com manutenção em dia?" },
        { itemText: "Existem hidrantes ou mangueiras de incêndio instalados e funcionais?" },
        { itemText: "O sistema de detecção de fumaça/incêndio está instalado e funcional?" },
        { itemText: "S6.2 - Plano de Emergência", isSubheading: true },
        { itemText: "Existe plano de emergência e evacuação documentado e atualizado?" },
        { itemText: "As rotas de fuga estão sinalizadas e desobstruídas?" },
        { itemText: "São realizados simulados de evacuação periodicamente?" },
        { itemText: "Existe brigada de incêndio formada e treinada?" },
        { itemText: "Os números de emergência estão visíveis e acessíveis?" },
      ];
    } else if (sec.sectionOrder === 7) {
      sectionItems = [
        { itemText: "S7.1 - Proteção de Dados e Documentos", isSubheading: true },
        { itemText: "Documentos sigilosos são armazenados em locais seguros (cofres, armários trancados)?" },
        { itemText: "Existe política de mesa limpa (documentos não ficam expostos)?" },
        { itemText: "O descarte de documentos sigilosos é feito de forma segura (fragmentadora)?" },
        { itemText: "Existe controle de acesso a áreas de arquivo e acervo documental?" },
        { itemText: "S7.2 - Infraestrutura de TI", isSubheading: true },
        { itemText: "A sala de servidores/equipamentos de TI possui controle de acesso restrito?" },
        { itemText: "Existe sistema de climatização adequado na sala de TI?" },
        { itemText: "Existe no-break e gerador para equipamentos críticos?" },
        { itemText: "Os cabos de rede e energia estão organizados e protegidos?" },
      ];
    } else if (sec.sectionOrder === 8) {
      sectionItems = [
        { itemText: "S8.1 - Procedimentos de Segurança", isSubheading: true },
        { itemText: "Existe manual de procedimentos de segurança atualizado e disponível?" },
        { itemText: "Os servidores da portaria/recepção possuem treinamento em segurança?" },
        { itemText: "Existe procedimento padrão para recebimento de correspondências e encomendas?" },
        { itemText: "Há protocolo para situações de ameaça (bomba, invasão, refém)?" },
        { itemText: "Existe procedimento para controle de chaves e acessos?" },
        { itemText: "S8.2 - Vigilância e Rondas", isSubheading: true },
        { itemText: "Existe serviço de vigilância patrimonial (próprio ou terceirizado)?" },
        { itemText: "São realizadas rondas periódicas nas instalações?" },
        { itemText: "Existe posto de vigilância com visão privilegiada dos acessos?" },
        { itemText: "O serviço de vigilância opera 24 horas, inclusive em fins de semana e feriados?" },
        { itemText: "S8.3 - Cultura de Segurança", isSubheading: true },
        { itemText: "Os membros e servidores conhecem os procedimentos básicos de segurança?" },
        { itemText: "Existem campanhas ou treinamentos periódicos de conscientização em segurança?" },
        { itemText: "Há canal para reporte de incidentes ou vulnerabilidades de segurança?" },
        { itemText: "A liderança local demonstra engajamento com as questões de segurança?" },
      ];
    }

    for (const [idx, item] of sectionItems.entries()) {
      await db.insert(items).values({
        sectionId: newSection.insertId,
        itemOrder: idx + 1,
        itemText: item.itemText,
        isSubheading: item.isSubheading || false,
      });
    }
  }

  console.log("Seed concluído com sucesso!");
  await connection.end();
}

main().catch((err) => {
  console.error("Erro durante o seed:", err);
  process.exit(1);
});
