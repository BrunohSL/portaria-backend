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

// Resolve o texto bruto devolvido pelo classificador LLM numa chave de intenção
// válida, de forma TOLERANTE. O modelo costuma decorar a resposta (aspas,
// pontuação, ou ecoar o label tipo "Visita ao morador") — match exato sufocaria
// essas respostas boas e cairia em fallback. Aqui:
//   - exact:    texto normalizado === uma chave.
//   - loose:    uma chave aparece como PALAVRA INTEIRA no texto (token-boundary,
//               não substring). Cobre aspas, pontuação e label echo.
//   - fallback: nada bateu.
// Se >1 chave aparecer, vence a PRIMEIRA na ordem de `intentKeys` (determinístico).
// As chaves dos catálogos não são substring umas das outras, então o match por
// palavra inteira é seguro.
//
// @param {string} rawContent - conteúdo cru do modelo
// @param {string[]} intentKeys - chaves válidas do catálogo (sem 'fallback')
// @returns {{ key: string, raw: string, matched: 'exact'|'loose'|'fallback' }}
function resolveIntentKey(rawContent, intentKeys) {
  const raw = String(rawContent ?? '').trim();
  // Dobra acentos (condomínio → condominio) pro caso de o LLM ecoar o label
  // acentuado em vez da chave; depois remove pontuação/aspas das bordas.
  const folded = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const normalized = folded.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');

  for (const key of intentKeys) {
    if (normalized === key) return { key, raw, matched: 'exact' };
  }

  const tokens = new Set(normalized.split(/[^a-z0-9]+/).filter(Boolean));
  for (const key of intentKeys) {
    if (tokens.has(key)) return { key, raw, matched: 'loose' };
  }

  return { key: 'fallback', raw, matched: 'fallback' };
}

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

module.exports = { INTENT_CATALOGS, INTENT_CATALOG_KEYS, getCatalog, getCatalogOutputs, resolveIntentKey };
