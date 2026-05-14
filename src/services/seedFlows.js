// Constrói os 7 fluxos do condomínio de teste com a estrutura que o usuário
// montou no editor. Mantém posição visual (x,y) e config completos.
//
// Estratégia:
//  1. Cria os 7 Flows primeiro (IDs sequenciais por tipo).
//  2. Cria todos os FlowNodes referenciando o flow correto. Em TRANSFERIR_FLUXO
//     resolve `targetFlowType` → `targetFlowId` usando o map de flows criados.
//  3. Cria todos os FlowEdges usando os IDs dos nodes recém-criados.
//  4. Atualiza `entry_node_id` em cada Flow que tem entrada definida.

const Flow = require('../models/Flow');
const FlowNode = require('../models/FlowNode');
const FlowEdge = require('../models/FlowEdge');

// Definição declarativa dos fluxos.
// Cada node tem `key` local (usado pra referenciar em edges/configs).
// Em TRANSFERIR_FLUXO, `config.targetFlowType` é resolvido pra `targetFlowId` pós-criação.
const FLOWS = [
  {
    type: 'ROOT',
    name: 'Identificação de intenção',
    entryNodeKey: 'intent_main',
    nodes: [
      { key: 'intent_main', type: 'COLETAR_INTENCAO', config: { catalogKey: 'o_que_deseja', promptText: 'Olá, o que deseja?' }, x: 360, y: 100 },
      { key: 'comando_orphan', type: 'COMANDO', config: { command: 'open_gate' }, x: 569.307, y: -16.7992 },
      { key: 'transfer_visita', type: 'TRANSFERIR_FLUXO', config: { targetFlowType: 'VISITA_MORADOR' }, x: 860, y: -72 },
      { key: 'transfer_ifood', type: 'TRANSFERIR_FLUXO', config: { targetFlowType: 'IFOOD_MORADOR' }, x: 907.093, y: 27.1309 },
      { key: 'transfer_encomenda_morador', type: 'TRANSFERIR_FLUXO', config: { targetFlowType: 'ENCOMENDA_MORADOR' }, x: 1302.01, y: 1.64987 },
      { key: 'transfer_prestador_morador', type: 'TRANSFERIR_FLUXO', config: { targetFlowType: 'PRESTADOR_MORADOR' }, x: 1153, y: 250 },
      { key: 'end_fallback', type: 'END', config: { message: 'Não tivemos retorno, ligue novamente quando precisar', behavior: 'hangup' }, x: 511, y: 486 },
      { key: 'intent_para_quem_prestador', type: 'COLETAR_INTENCAO', config: { catalogKey: 'para_quem', promptText: 'Vai fazer serviço pra morador ou pro condomínio?' }, x: 809, y: 311 },
      { key: 'transfer_prestador_condominio', type: 'TRANSFERIR_FLUXO', config: { targetFlowType: 'PRESTADOR_CONDOMINIO' }, x: 1172.65, y: 351 },
      { key: 'end_prestador_fallback', type: 'END', config: { message: '', behavior: 'hangup' }, x: 1158.42, y: 452 },
      { key: 'intent_para_quem_encomenda', type: 'COLETAR_INTENCAO', config: { catalogKey: 'para_quem', promptText: '' }, x: 803.383, y: 129.595 },
      { key: 'transfer_encomenda_condominio', type: 'TRANSFERIR_FLUXO', config: { targetFlowType: 'ENCOMENDA_CONDOMINIO' }, x: 1264.56, y: 86.6547 },
      { key: 'end_encomenda_fallback', type: 'END', config: { message: '', behavior: 'hangup' }, x: 1276.59, y: 165.665 }
    ],
    edges: [
      { from: 'intent_main', handle: 'visita', to: 'transfer_visita' },
      { from: 'intent_main', handle: 'fallback', to: 'end_fallback' },
      { from: 'intent_main', handle: 'prestador', to: 'intent_para_quem_prestador' },
      { from: 'intent_main', handle: 'ifood', to: 'transfer_ifood' },
      { from: 'intent_main', handle: 'encomenda', to: 'intent_para_quem_encomenda' },
      { from: 'intent_para_quem_prestador', handle: 'morador', to: 'transfer_prestador_morador' },
      { from: 'intent_para_quem_prestador', handle: 'condominio', to: 'transfer_prestador_condominio' },
      { from: 'intent_para_quem_prestador', handle: 'fallback', to: 'end_prestador_fallback' },
      { from: 'intent_para_quem_encomenda', handle: 'morador', to: 'transfer_encomenda_morador' },
      { from: 'intent_para_quem_encomenda', handle: 'condominio', to: 'transfer_encomenda_condominio' },
      { from: 'intent_para_quem_encomenda', handle: 'fallback', to: 'end_encomenda_fallback' }
    ]
  },
  {
    type: 'VISITA_MORADOR',
    name: 'Visita ao morador',
    entryNodeKey: 'coletar_morador',
    nodes: [
      { key: 'coletar_morador', type: 'COLETAR_DADOS_MORADOR', config: { promptText: 'Qual é o nome do morador, apartamento e bloco?', requestedFields: ['apto', 'bloco', 'nome'] }, x: 47.5, y: 75 },
      { key: 'comunicar_dados_nao_confirmados', type: 'COMUNICACAO', config: { mode: 'tts', text: 'Não conseguimos encontrar o morador. Entre em contato com ele', _branchLabel: 'dadosNaoConfirmados' }, x: 370, y: 185 },
      { key: 'coletar_visita', type: 'COLETAR_DADOS_VISITA', config: { promptText: 'Qual o seu nome?', requestedFields: ['nome', 'cpf'] }, x: 363.521, y: -64.6087 },
      { key: 'end_dados_nao_confirmados', type: 'END', config: { message: '', behavior: 'hangup' }, x: 685.962, y: 218.234 },
      { key: 'contatar_morador', type: 'CONTATAR', config: { target: 'morador', channel: 'interfone', timeoutSeconds: 30 }, x: 681.604, y: -141.683 },
      { key: 'comunicar_autorizado', type: 'COMUNICACAO', config: { mode: 'tts', text: 'Tudo certo, vamos abrir o portão', _branchLabel: 'autorizado' }, x: 1002.52, y: -237.437 },
      { key: 'comunicar_nao_autorizado', type: 'COMUNICACAO', config: { mode: 'tts', text: 'O morador não autorizou sua entrada', _branchLabel: 'naoAutorizado' }, x: 1027.97, y: -99.964 },
      { key: 'comunicar_sem_resposta', type: 'COMUNICACAO', config: { mode: 'tts', text: 'O morador não atendeu a ligação, por favor, entre em contato direto com ele', _branchLabel: 'semResposta' }, x: 1028.68, y: 13.4674 },
      { key: 'comunicar_aguarde', type: 'COMUNICACAO', config: { mode: 'tts', text: 'Vamos entrar em contato com o morador' }, x: 447.856, y: -274.641 },
      { key: 'end_sem_resposta', type: 'END', config: { message: '', behavior: 'hangup' }, x: 1298.68, y: 218.234 },
      { key: 'end_nao_autorizado', type: 'END', config: { message: '', behavior: 'hangup' }, x: 1351.6, y: -20.7681 },
      { key: 'comando_gate2', type: 'COMANDO', config: { gateId: '2', command: 'open_gate' }, x: 1323.2, y: -294.994 },
      { key: 'timer_10s', type: 'TIMER', config: { durationSeconds: 10 }, x: 1468.16, y: -184.817 },
      { key: 'comando_gate3', type: 'COMANDO', config: { gateId: '3', command: 'open_gate' }, x: 1655.42, y: -270.377 },
      { key: 'end_autorizado', type: 'END', config: { message: '', behavior: 'hangup' }, x: 1861.78, y: -172.796 },
      { key: 'comando_pre_entry', type: 'COMANDO', config: { command: 'open_gate' }, x: -406.026, y: 143.281 },
      { key: 'timer_pre_entry', type: 'TIMER', config: { durationSeconds: 5 }, x: -238.442, y: 20.5528 }
    ],
    edges: [
      { from: 'coletar_morador', handle: 'dadosNaoConfirmados', to: 'comunicar_dados_nao_confirmados' },
      { from: 'coletar_morador', handle: 'dadosConfirmados', to: 'coletar_visita' },
      { from: 'comunicar_dados_nao_confirmados', handle: 'default', to: 'end_dados_nao_confirmados' },
      { from: 'contatar_morador', handle: 'autorizado', to: 'comunicar_autorizado' },
      { from: 'contatar_morador', handle: 'naoAutorizado', to: 'comunicar_nao_autorizado' },
      { from: 'contatar_morador', handle: 'semResposta', to: 'comunicar_sem_resposta' },
      { from: 'coletar_visita', handle: 'default', to: 'comunicar_aguarde' },
      { from: 'comunicar_aguarde', handle: 'default', to: 'contatar_morador' },
      { from: 'comunicar_sem_resposta', handle: 'default', to: 'end_sem_resposta' },
      { from: 'comunicar_nao_autorizado', handle: 'default', to: 'end_nao_autorizado' },
      { from: 'comunicar_autorizado', handle: 'default', to: 'comando_gate2' },
      { from: 'comando_gate2', handle: 'default', to: 'timer_10s' },
      { from: 'timer_10s', handle: 'default', to: 'comando_gate3' },
      { from: 'comando_gate3', handle: 'default', to: 'end_autorizado' },
      { from: 'comando_pre_entry', handle: 'default', to: 'timer_pre_entry' },
      { from: 'timer_pre_entry', handle: 'default', to: 'coletar_morador' }
    ]
  },
  // Stubs — flows criados, mas sem nodes/edges/entry_node ainda
  { type: 'IFOOD_MORADOR', name: 'Entrega de iFood', entryNodeKey: null, nodes: [], edges: [] },
  { type: 'ENCOMENDA_MORADOR', name: 'Encomenda para morador', entryNodeKey: null, nodes: [], edges: [] },
  { type: 'ENCOMENDA_CONDOMINIO', name: 'Encomenda para condomínio', entryNodeKey: null, nodes: [], edges: [] },
  { type: 'PRESTADOR_MORADOR', name: 'Prestador para morador', entryNodeKey: null, nodes: [], edges: [] },
  { type: 'PRESTADOR_CONDOMINIO', name: 'Prestador para condomínio', entryNodeKey: null, nodes: [], edges: [] }
];

async function buildSeedFlows(condominiumId, { transaction }) {
  // 1. Cria os 7 Flows. Coleta map type → id pra resolver TRANSFERIR_FLUXO depois.
  const flowsByType = {};
  const createdFlows = {};
  for (const f of FLOWS) {
    const flow = await Flow.create({
      condominium_id: condominiumId,
      name: f.name,
      type: f.type,
      active: true
    }, { transaction });
    flowsByType[f.type] = flow.id;
    createdFlows[f.type] = flow;
  }

  // 2. Cria nodes de cada flow. Mantém map por flow: nodeKey → id.
  const nodeIdByFlowAndKey = {};
  for (const f of FLOWS) {
    if (!f.nodes.length) continue;
    nodeIdByFlowAndKey[f.type] = {};

    for (const n of f.nodes) {
      const config = { ...n.config };
      // Resolve TRANSFERIR_FLUXO: targetFlowType → targetFlowId
      if (n.type === 'TRANSFERIR_FLUXO' && config.targetFlowType) {
        config.targetFlowId = String(flowsByType[config.targetFlowType]);
        delete config.targetFlowType;
      }

      const node = await FlowNode.create({
        flow_id: flowsByType[f.type],
        condominium_id: condominiumId,
        type: n.type,
        config,
        position_x: n.x,
        position_y: n.y
      }, { transaction });

      nodeIdByFlowAndKey[f.type][n.key] = node.id;
    }
  }

  // 3. Cria edges
  for (const f of FLOWS) {
    if (!f.edges.length) continue;
    const keyToId = nodeIdByFlowAndKey[f.type];

    for (const e of f.edges) {
      await FlowEdge.create({
        flow_id: flowsByType[f.type],
        source_node_id: keyToId[e.from],
        source_handle: e.handle,
        target_node_id: keyToId[e.to],
        target_handle: 'default'
      }, { transaction });
    }
  }

  // 4. Atualiza entry_node_id nos flows que têm entrada
  for (const f of FLOWS) {
    if (!f.entryNodeKey) continue;
    const entryId = nodeIdByFlowAndKey[f.type][f.entryNodeKey];
    await createdFlows[f.type].update({ entry_node_id: entryId }, { transaction });
  }

  return {
    flowsCreated: FLOWS.length,
    nodesCreated: FLOWS.reduce((acc, f) => acc + f.nodes.length, 0),
    edgesCreated: FLOWS.reduce((acc, f) => acc + f.edges.length, 0),
    rootFlowId: flowsByType.ROOT
  };
}

module.exports = { buildSeedFlows };
