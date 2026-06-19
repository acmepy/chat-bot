import defaults from '../config/defaults.js';
import { MessageRequiredError, MessageTooLongError } from '../errors/chatbot.js';
import { PromptBuilder } from './prompt-builder.js';
import { SummaryManager } from './summary-manager.js';
import { ToolRunner } from './tool-runner.js';
import { ToolRegistry } from '../tools/registry.js';

export function createChatbot(options = {}) {
  const config = { ...defaults, ...(options.config || {}), ...options };
  const { llmProvider, resourceProvider, sessionProvider, tools = [] } = options;

  if (!llmProvider) throw new Error('llmProvider es requerido');
  if (!resourceProvider)throw new Error('resourceProvider es requerido');
  if (!sessionProvider) throw new Error('sessionProvider es requerido');

  const promptBuilder = new PromptBuilder();
  const toolRegistry = new ToolRegistry(tools);
  const toolRunner = new ToolRunner({ registry: toolRegistry });
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
    const toolsMetadata = config.toolsEnabled ? toolRegistry.getMetadata() : [];

    const prompt = promptBuilder.build({
      systemPrompt,
      resources,
      context: context || '',
      summary,
      history,
      message,
      tools: []
    });

    const now = new Date().toISOString();
    const userMessage = {role: 'user', content: message, createdAt: now };

    await sessionProvider.addMessage(session.id, userMessage);

    async function generateWithToolResult(toolCall) {
      const toolResult = await toolRunner.run(toolCall.tool, toolCall.input, {
        context: context || {},
        session,
        resources,
        config
      });
      const toolAnswer = getToolAnswer(toolResult);
      if (toolAnswer !== null) {
        return toolAnswer;
      }

      const finalPrompt = promptBuilder.build({
        systemPrompt,
        resources,
        context: context || '',
        summary,
        history,
        message,
        toolResult
      });

      return llmProvider.generate({
        prompt: finalPrompt,
        systemPrompt,
        resources,
        context: context || '',
        summary,
        history,
        message,
        options: config
      });
    }

    let answer;
    const toolCall = (config.toolsEnabled ? getToolCallFromShouldUse(message, toolRegistry, {
      context: context || {},
      session,
      resources,
      summary,
      history,
      config
    }) : null) || await selectToolCall();

    if (config.toolsEnabled && config.maxToolCalls === 1 && toolCall) {
      answer = await generateWithToolResult(toolCall);
    } else {
      answer = await llmProvider.generate({
        prompt,
        systemPrompt,
        resources,
        context: context || '',
        summary,
        history,
        message,
        options: config
      });
    }

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

    async function selectToolCall() {
      if (!config.toolsEnabled || config.maxToolCalls !== 1 || toolsMetadata.length === 0) {
        return null;
      }

      const toolSelectionPrompt = promptBuilder.buildToolSelection({
        systemPrompt,
        resources,
        context: context || '',
        summary,
        history,
        message,
        tools: toolsMetadata
      });
      const toolSelection = await llmProvider.generate({
        prompt: toolSelectionPrompt,
        systemPrompt,
        resources,
        context: context || '',
        summary,
        history,
        message,
        options: {
          ...config,
          temperature: 0,
          format: 'json'
        }
      });

      return parseToolCall(toolSelection, toolRegistry);
    }
  }

  return { sendMessage };
}

function getToolAnswer(toolResult) {
  if (toolResult?.ok && typeof toolResult.data?.answer === 'string') {
    return toolResult.data.answer;
  }

  return null;
}

function getToolCallFromShouldUse(message, registry, context) {
  for (const tool of registry.list()) {
    if (typeof tool.shouldUse !== 'function') {
      continue;
    }

    const shouldUse = tool.shouldUse({ message }, context);
    if (shouldUse) {
      return {
        tool: tool.name,
        input: {
          query: message
        }
      };
    }
  }

  return null;
}

function parseToolCall(response, registry) {
  let parsed;
  const content = String(response || '').trim();

  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = parseToolCallFromText(content);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  if (!parsed.tool || typeof parsed.tool !== 'string') {
    return null;
  }
  if (!registry.get(parsed.tool)) {
    return null;
  }
  if (parsed.input === undefined) {
    parsed.input = {};
  }
  if (!parsed.input || typeof parsed.input !== 'object' || Array.isArray(parsed.input)) {
    return null;
  }

  return {
    tool: parsed.tool,
    input: parsed.input
  };
}

function parseToolCallFromText(content) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      return null;
    }
  }

  const jsonStart = content.indexOf('{');
  const jsonEnd = content.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd <= jsonStart) {
    return null;
  }

  try {
    return JSON.parse(content.slice(jsonStart, jsonEnd + 1));
  } catch {
    return null;
  }
}
