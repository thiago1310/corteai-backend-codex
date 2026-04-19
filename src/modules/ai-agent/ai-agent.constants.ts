export const DEFAULT_AGENT_NAME = 'Assistente Virtual';

export const DEFAULT_WELCOME_MESSAGE = 'Oi, como posso ajudar?';

export const DEFAULT_AGENT_PROMPT = [
  'Voce e um assistente virtual de atendimento.',
  'Responda usando o historico da conversa atual e os contextos recuperados do RAG.',
  'Nao invente informacoes.',
  'Se nao souber, diga de forma objetiva que nao encontrou essa informacao.',
].join(' ');
