// Catálogo dos tipos de fluxo. Cada condomínio pode ter no máximo 1 fluxo de cada tipo.
// O ROOT é o fluxo de identificação de intenção; os demais são fluxos específicos
// para os quais o ROOT redireciona via TRANSFERIR_FLUXO.

const FLOW_TYPES = {
  ROOT: {
    label: 'Identificação de intenção',
    description: 'Fluxo raiz que classifica o atendimento e redireciona para o fluxo correto',
    isRoot: true
  },
  VISITA_MORADOR: {
    label: 'Visita ao morador',
    description: 'Visitante chegou para visitar um morador'
  },
  IFOOD_MORADOR: {
    label: 'Entrega de iFood',
    description: 'Entregador de iFood/comida para morador'
  },
  ENCOMENDA_MORADOR: {
    label: 'Encomenda para morador',
    description: 'Entrega de pacote/encomenda para morador'
  },
  ENCOMENDA_CONDOMINIO: {
    label: 'Encomenda para condomínio',
    description: 'Entrega de pacote/encomenda para o condomínio (administração)'
  },
  PRESTADOR_MORADOR: {
    label: 'Prestador para morador',
    description: 'Prestador de serviço contratado por um morador'
  },
  PRESTADOR_CONDOMINIO: {
    label: 'Prestador para condomínio',
    description: 'Prestador de serviço contratado pelo condomínio'
  }
};

const FLOW_TYPE_KEYS = Object.keys(FLOW_TYPES);
const NON_ROOT_TYPE_KEYS = FLOW_TYPE_KEYS.filter((k) => !FLOW_TYPES[k].isRoot);

function isValidFlowType(type) {
  return Object.prototype.hasOwnProperty.call(FLOW_TYPES, type);
}

module.exports = { FLOW_TYPES, FLOW_TYPE_KEYS, NON_ROOT_TYPE_KEYS, isValidFlowType };
