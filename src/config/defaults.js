export default {
  provider: 'ollama',
  model: 'gemma4',
  ollamaUrl: 'http://127.0.0.1:11434',
  keepAlive: '30m',

  maxMessageLength: 2000,
  maxHistoryMessages: 10,
  maxSummaryLength: 1000,
  toolsEnabled: true,
  maxToolCalls: 1,

  temperature: 0.3,
  allowUnknownAnswers: false, 

  timezone:'America/Asuncion'
};
