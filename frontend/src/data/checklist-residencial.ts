/**
 * SDI v4 — Dados estáticos do Checklist Residencial (6 seções)
 * Usado como fallback offline ou para pré-renderização.
 */

import type { ChecklistSection } from "./checklist-mpsc";

export const CHECKLIST_RESIDENCIAL: ChecklistSection[] = [
  {
    id: 1, order: 1, name: "Segurança Perimetral", weight: 1,
    items: [
      { id: "r1_01", text: "A residência possui muro, cerca ou grade no perímetro externo?" },
      { id: "r1_02", text: "A altura do muro/cerca é adequada (mínimo 2,5m)?" },
      { id: "r1_03", text: "Existe concertina, cerca elétrica ou outro elemento dissuasório no topo?" },
      { id: "r1_04", text: "O portão de acesso de veículos é automatizado?" },
      { id: "r1_05", text: "O portão de pedestres possui fechadura de segurança ou controle de acesso?" },
      { id: "r1_06", text: "Há vegetação alta próxima ao muro que possa facilitar escalada?" },
      { id: "r1_07", text: "O perímetro está livre de pontos cegos ou áreas sem visibilidade?" },
      { id: "r1_08", text: "Existe iluminação perimetral ativada por sensor de presença?" },
    ],
  },
  {
    id: 2, order: 2, name: "Acessos Diretos (Portas)", weight: 1,
    items: [
      { id: "r2_01", text: "A porta principal possui fechadura de alta segurança (tetra ou superior)?" },
      { id: "r2_02", text: "Existe olho mágico ou câmera na porta principal?" },
      { id: "r2_03", text: "As dobradiças das portas externas são internas (não removíveis por fora)?" },
      { id: "r2_04", text: "Há porta de segurança (blindada ou reforçada) em algum acesso?" },
      { id: "r2_05", text: "As portas dos fundos e laterais possuem trancas adicionais?" },
      { id: "r2_06", text: "Existe interfone ou vídeo-porteiro para identificação de visitantes?" },
    ],
  },
  {
    id: 3, order: 3, name: "Janelas e Aberturas", weight: 1,
    items: [
      { id: "r3_01", text: "As janelas do pavimento térreo possuem grades ou telas de segurança?" },
      { id: "r3_02", text: "As janelas possuem fechos ou travas de segurança internos?" },
      { id: "r3_03", text: "Há janelas basculantes que permitem acesso quando abertas?" },
      { id: "r3_04", text: "Os vidros das janelas são temperados ou laminados?" },
      { id: "r3_05", text: "Existe película de segurança nos vidros do pavimento térreo?" },
    ],
  },
  {
    id: 4, order: 4, name: "Sistemas Eletrônicos de Segurança", weight: 1,
    items: [
      { id: "r4_01", text: "A residência possui sistema de alarme monitorado?" },
      { id: "r4_02", text: "Existem câmeras de segurança (CFTV) instaladas?" },
      { id: "r4_03", text: "As câmeras cobrem todos os acessos (portões, portas, garagem)?" },
      { id: "r4_04", text: "O sistema de gravação armazena imagens por no mínimo 30 dias?" },
      { id: "r4_05", text: "Há sensor de presença nas áreas externas?" },
      { id: "r4_06", text: "O sistema de alarme possui bateria backup (funciona sem energia)?" },
      { id: "r4_07", text: "Existe botão de pânico ou acionamento silencioso?" },
      { id: "r4_08", text: "O sistema permite monitoramento remoto (app/celular)?" },
      { id: "r4_09", text: "Há sensor de abertura em portas e janelas principais?" },
      { id: "r4_10", text: "O cabeamento do sistema está protegido contra sabotagem?" },
      { id: "r4_11", text: "Existe sirene externa visível como elemento dissuasório?" },
    ],
  },
  {
    id: 5, order: 5, name: "Iluminação e Visibilidade", weight: 1,
    items: [
      { id: "r5_01", text: "A iluminação externa cobre toda a frente do imóvel?" },
      { id: "r5_02", text: "Há iluminação com sensor de presença nas laterais e fundos?" },
      { id: "r5_03", text: "A garagem possui iluminação adequada?" },
      { id: "r5_04", text: "A numeração do imóvel é visível para viaturas e serviços de emergência?" },
      { id: "r5_05", text: "Existe iluminação de emergência (funciona na falta de energia)?" },
    ],
  },
  {
    id: 6, order: 6, name: "Procedimentos e Hábitos de Segurança", weight: 1,
    items: [
      { id: "r6_01", text: "Os moradores possuem rotinas variáveis de horários de saída/chegada?" },
      { id: "r6_02", text: "Existe procedimento definido para recebimento de encomendas/entregas?" },
      { id: "r6_03", text: "Os moradores evitam expor informações pessoais em redes sociais?" },
      { id: "r6_04", text: "Há procedimento para verificação de identidade de prestadores de serviço?" },
      { id: "r6_05", text: "Existe plano de evacuação ou ponto de encontro familiar em emergências?" },
      { id: "r6_06", text: "Os moradores conhecem os números de emergência e contatos de segurança?" },
      { id: "r6_07", text: "Há cofre para guarda de documentos e objetos de valor?" },
      { id: "r6_08", text: "As chaves reserva estão guardadas em local seguro (não sob tapete/vaso)?" },
      { id: "r6_09", text: "Existe comunicação com vizinhos sobre segurança (rede de vigilância)?" },
      { id: "r6_10", text: "Os veículos são estacionados sempre dentro da garagem?" },
      { id: "r6_11", text: "Há procedimento para viagens (simulação de presença, recolhimento de correspondência)?" },
      { id: "r6_12", text: "Os moradores evitam atender desconhecidos sem verificação prévia?" },
    ],
  },
];
