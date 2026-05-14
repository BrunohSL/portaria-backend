// Catálogos pré-definidos de intenções usados pelo node COLETAR_INTENCAO.
// Cada catálogo define o conjunto de saídas (output handles) do node.
// Usado SOMENTE em fluxos do tipo ROOT.

const INTENT_CATALOGS = {
  o_que_deseja: {
    label: 'O que o visitante deseja?',
    description: 'Classificação primária — o que o visitante está fazendo',
    intents: [
      { key: 'visita',    label: 'Visita ao morador' },
      { key: 'ifood',     label: 'Entrega de iFood' },
      { key: 'encomenda', label: 'Entrega de encomenda' },
      { key: 'prestador', label: 'Prestador de serviço' }
    ]
  },
  para_quem: {
    label: 'Para quem é o serviço?',
    description: 'Refinamento — para o morador ou para o condomínio?',
    intents: [
      { key: 'morador',    label: 'Para um morador' },
      { key: 'condominio', label: 'Para o condomínio' }
    ]
  }
};

const INTENT_CATALOG_KEYS = Object.keys(INTENT_CATALOGS);

function getCatalog(key) {
  return INTENT_CATALOGS[key] ?? null;
}

// Saídas do node COLETAR_INTENCAO derivadas do catálogo + sempre uma 'fallback'.
function getCatalogOutputs(catalogKey) {
  const catalog = INTENT_CATALOGS[catalogKey];
  if (!catalog) return [{ handle: 'fallback', label: 'Não identificado', required: true }];
  return [
    ...catalog.intents.map((i) => ({ handle: i.key, label: i.label, required: true })),
    { handle: 'fallback', label: 'Não identificado', required: true }
  ];
}

module.exports = { INTENT_CATALOGS, INTENT_CATALOG_KEYS, getCatalog, getCatalogOutputs };
