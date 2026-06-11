const { resolveIntentKey } = require('../intentCatalogs');

describe('resolveIntentKey', () => {
  const oQueDeseja = ['visita', 'ifood', 'encomenda', 'prestador'];
  const paraQuem = ['morador', 'condominio'];

  describe('catálogo o_que_deseja', () => {
    it.each([
      ['visita', 'visita', 'exact'],
      ['"visita"', 'visita', 'exact'], // modelo respondeu entre aspas (o bug original)
      ['visita.', 'visita', 'exact'], // pontuação no fim
      ['VISITA', 'visita', 'exact'], // caixa alta
      ['  visita  ', 'visita', 'exact'], // espaços
      ['visita ao morador', 'visita', 'loose'], // ecoou o label
      ['ifood', 'ifood', 'exact'],
      ['encomenda', 'encomenda', 'exact'],
      ['prestador', 'prestador', 'exact']
    ])('resolve %j → %s (%s)', (input, expectedKey, expectedMatched) => {
      const { key, matched } = resolveIntentKey(input, oQueDeseja);
      expect(key).toBe(expectedKey);
      expect(matched).toBe(expectedMatched);
    });

    it.each([
      ['fallback'],
      ['"fallback"'],
      [''],
      ['bom dia'], // saudação, nenhuma intenção
      [null],
      [undefined]
    ])('cai em fallback para %j', (input) => {
      const { key, matched } = resolveIntentKey(input, oQueDeseja);
      expect(key).toBe('fallback');
      expect(matched).toBe('fallback');
    });

    it('preserva o raw original (pré-normalização) para log', () => {
      const { raw } = resolveIntentKey('  "Visita"  ', oQueDeseja);
      expect(raw).toBe('"Visita"');
    });
  });

  describe('catálogo para_quem', () => {
    it('resolve "é para o morador" → morador (loose)', () => {
      const { key, matched } = resolveIntentKey('é para o morador', paraQuem);
      expect(key).toBe('morador');
      expect(matched).toBe('loose');
    });

    it('com >1 chave no texto, vence a primeira na ordem do catálogo (determinístico)', () => {
      const { key } = resolveIntentKey('morador condominio', paraQuem);
      expect(key).toBe('morador');
    });

    it('dobra acentos quando o LLM ecoa o label acentuado ("condomínio" → condominio)', () => {
      const { key, matched } = resolveIntentKey('Para o condomínio', paraQuem);
      expect(key).toBe('condominio');
      expect(matched).toBe('loose');
    });
  });
});
