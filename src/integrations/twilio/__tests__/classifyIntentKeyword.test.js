const { classifyIntentKeyword } = require('../conversationRelay');

// Rede de segurança usada quando o LLM falha/não está configurado, e agora
// também quando o LLM devolve fallback (processIntentInput). Casa por substring
// (gírias/sinônimos), de propósito.
describe('classifyIntentKeyword', () => {
  describe('catálogo o_que_deseja', () => {
    it('reconhece entrega de marketplace como encomenda', () => {
      expect(classifyIntentKeyword('vou entregar mercado livre', 'o_que_deseja')).toBe('encomenda');
    });

    it('reconhece fala livre de visita ("casa do meu amigo")', () => {
      expect(classifyIntentKeyword('vou na casa do meu amigo', 'o_que_deseja')).toBe('visita');
    });

    it('reconhece prestador de serviço', () => {
      expect(classifyIntentKeyword('sou o técnico da manutenção', 'o_que_deseja')).toBe('prestador');
    });

    it('cai em fallback quando nenhuma keyword bate', () => {
      expect(classifyIntentKeyword('bom dia', 'o_que_deseja')).toBe('fallback');
    });
  });

  describe('catálogo para_quem', () => {
    it('reconhece condomínio', () => {
      expect(classifyIntentKeyword('é pro condomínio', 'para_quem')).toBe('condominio');
    });
  });

  it('catálogo desconhecido → fallback', () => {
    expect(classifyIntentKeyword('qualquer coisa', 'inexistente')).toBe('fallback');
  });
});
