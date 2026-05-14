const { getCatalogOutputs } = require('./intentCatalogs');

// Registry dos tipos de node disponíveis no motor de fluxo.
// Cada entry define handles (saídas), regras e o shape esperado de config.
// O front espelha esse registry em portaria-front/src/lib/nodeRegistry.ts.
//
// `restrictedToFlowType`: se presente, limita esse tipo a fluxos cujo `type` esteja na lista.
// `getDynamicOutputs(config)`: opcional — derive os outputs do node a partir da sua config.
//                              Quando presente, sobrescreve `outputs` estático.

const NODE_TYPES = {
  TIMER: {
    label: 'Timer',
    description: 'Aguarda um intervalo antes de seguir para o próximo node',
    outputs: [
      { handle: 'default', label: 'Próximo' }
    ],
    configSchema: {
      durationSeconds: { type: 'number', required: true, min: 1, max: 600 }
    }
  },

  COMUNICACAO: {
    label: 'Comunicação',
    description: 'Envia texto para TTS ou prompt para a LLM interpretar e falar com o visitante',
    outputs: [
      { handle: 'default', label: 'Próximo' }
    ],
    configSchema: {
      mode: { type: 'string', required: true, oneOf: ['tts', 'llm'] },
      text: { type: 'string', required: true }
    }
  },

  COMANDO: {
    label: 'Comando',
    description: 'Executa um comando físico (ex: abrir portão)',
    outputs: [
      { handle: 'default', label: 'Próximo' }
    ],
    configSchema: {
      command: { type: 'string', required: true, oneOf: ['open_gate'] },
      gateId: { type: 'integer', required: false } // obrigatório se command=open_gate
    }
  },

  COLETAR_DADOS_MORADOR: {
    label: 'Coletar dados do morador',
    description: 'Coleta dados de identificação para localizar morador/funcionário no condomínio',
    outputs: [
      { handle: 'dadosConfirmados', label: 'Dados confirmados', required: true },
      { handle: 'dadosNaoConfirmados', label: 'Dados não confirmados', required: true }
    ],
    configSchema: {
      requestedFields: { type: 'array', required: true, itemsRef: 'visitor_data_fields.key', minLength: 1 },
      promptText: { type: 'string', required: true }
    }
  },

  COLETAR_DADOS_VISITA: {
    label: 'Coletar dados da visita',
    description: 'Coleta dados do visitante/prestador/entregador. Cadastra visitante novo se necessário',
    outputs: [
      { handle: 'default', label: 'Próximo' }
    ],
    configSchema: {
      requestedFields: { type: 'array', required: true, itemsRef: 'visitor_data_fields.key', minLength: 1 },
      promptText: { type: 'string', required: true }
    }
  },

  CONTATAR: {
    label: 'Contatar',
    description: 'Tenta contato com morador ou funcionário do condomínio',
    outputs: [
      { handle: 'autorizado', label: 'Contato feito, Autorizado', required: true },
      { handle: 'naoAutorizado', label: 'Contato feito, Não autorizado', required: true },
      { handle: 'semResposta', label: 'Sem resposta', required: true }
    ],
    configSchema: {
      target: { type: 'string', required: true, oneOf: ['morador', 'funcionario'] },
      employeeRoleKey: { type: 'string', required: false }, // obrigatório se target=funcionario
      channel: { type: 'string', required: true, oneOf: ['interfone', 'telefone', 'whatsapp'] },
      timeoutSeconds: { type: 'number', required: false, min: 5, max: 120 }
    }
  },

  END: {
    label: 'Fim',
    description: 'Encerra o fluxo. Pode desligar a ligação, transferir para um ramal ou apenas parar a execução.',
    outputs: [],
    configSchema: {
      behavior: { type: 'string', required: true, oneOf: ['hangup', 'transfer', 'silent'] },
      message: { type: 'string', required: false },
      extensionId: { type: 'integer', required: false } // obrigatório se behavior=transfer
    }
  },

  COLETAR_INTENCAO: {
    label: 'Coletar intenção',
    description: 'Identifica a intenção do visitante (visita, entrega, prestador...) para rotear ao fluxo correto',
    // outputs derivados dinamicamente do catalogKey + sempre um 'fallback'
    getDynamicOutputs: (config) => getCatalogOutputs(config?.catalogKey),
    outputs: [],
    configSchema: {
      catalogKey: { type: 'string', required: true, oneOf: ['o_que_deseja', 'para_quem'] },
      promptText: { type: 'string', required: true }
    },
    restrictedToFlowType: ['ROOT']
  },

  TRANSFERIR_FLUXO: {
    label: 'Transferir fluxo',
    description: 'Encaminha a chamada para outro fluxo configurado. Termina a execução do fluxo atual.',
    outputs: [],
    configSchema: {
      targetFlowId: { type: 'integer', required: true }
    },
    restrictedToFlowType: ['ROOT']
  }
};

const NODE_TYPE_KEYS = Object.keys(NODE_TYPES);

function getNodeType(type) {
  return NODE_TYPES[type] ?? null;
}

function isValidType(type) {
  return Object.prototype.hasOwnProperty.call(NODE_TYPES, type);
}

function resolveOutputs(type, config) {
  const def = NODE_TYPES[type];
  if (!def) return [];
  if (typeof def.getDynamicOutputs === 'function') {
    return def.getDynamicOutputs(config) ?? [];
  }
  return def.outputs ?? [];
}

function getRequiredOutputHandles(type, config) {
  return resolveOutputs(type, config).filter((o) => o.required).map((o) => o.handle);
}

function getOutputHandles(type, config) {
  return resolveOutputs(type, config).map((o) => o.handle);
}

function isRestrictedToFlowType(type) {
  const def = NODE_TYPES[type];
  return Array.isArray(def?.restrictedToFlowType) ? def.restrictedToFlowType : null;
}

module.exports = {
  NODE_TYPES,
  NODE_TYPE_KEYS,
  getNodeType,
  isValidType,
  getRequiredOutputHandles,
  getOutputHandles,
  isRestrictedToFlowType
};
