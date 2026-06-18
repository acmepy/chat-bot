import defaults from '../config/defaults.js';
import { MessageRequiredError, MessageTooLongError } from '../errors/chatbot.js';
import { PromptBuilder } from './prompt-builder.js';
import { SummaryManager } from './summary-manager.js';

export function createChatbot(options = {}) {
  const config = { ...defaults, ...options };
  const { llmProvider, resourceProvider, sessionProvider } = options;

  if (!llmProvider) throw new Error('llmProvider es requerido');
  if (!resourceProvider)throw new Error('resourceProvider es requerido');
  if (!sessionProvider) throw new Error('sessionProvider es requerido');

  const promptBuilder = new PromptBuilder();
  const summaryManager = new SummaryManager({
    maxHistoryMessages: config.maxHistoryMessages,
    maxSummaryLength: config.maxSummaryLength,
    llmProvider
  });

  async function sendMessage({ message, sessionId, context } = {}) {
    if (!message)throw new MessageRequiredError();
    if (message.length > config.maxMessageLength) throw new MessageTooLongError({ maxLength: config.maxMessageLength });

    let session;
    if (sessionId) {
      session = await sessionProvider.getSession(sessionId);
      if (!session) throw new Error(`Sesión no encontrada: ${sessionId}`);
    } else {
      session = await sessionProvider.createSession({metadata: context || {}});
    }

    const resources = await resourceProvider.loadResources();
    const systemPrompt = await resourceProvider.loadSystemPrompt();
    const summary = session.summary || '';
    const history = [...(session.messages || [])];

    const prompt = promptBuilder.build({
      systemPrompt,
      resources,
      context: context || '',
      summary,
      history,
      message
    });

    const now = new Date().toISOString();
    const userMessage = {role: 'user', content: message, createdAt: now };

    await sessionProvider.addMessage(session.id, userMessage);

    const answer = await llmProvider.generate({
      prompt,
      systemPrompt,
      resources,
      context: context || '',
      summary,
      history,
      message,
      options: config
    });

    const assistantMessage = { role: 'assistant', content: answer, createdAt: now };
    await sessionProvider.addMessage(session.id, assistantMessage);

    if (summaryManager.shouldCompact(history.length + 2)) {
      const messages = [...history, userMessage, assistantMessage];
      const compacted = await summaryManager.compactHistory({ messages, summary, options: config });
      session.summary = compacted.summary;
      session.messages = compacted.recentMessages;
      await sessionProvider.saveSession(session);
    }

    return { sessionId: session.id, answer };
  }

  return { sendMessage };
}
