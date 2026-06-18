/**
 * @typedef {Object} ChatbotConfig
 * @property {string} [provider='ollama']
 * @property {string} [model='gemma4']
 * @property {string} [ollamaUrl='http://localhost:11434']
 * @property {number} [maxMessageLength=2000]
 * @property {number} [maxHistoryMessages=10]
 * @property {number} [maxSummaryLength=1000]
 * @property {number} [temperature=0.3]
 * @property {boolean} [allowUnknownAnswers=false]
 */

/**
 * @typedef {Object} ChatMessage
 * @property {'user'|'assistant'|'system'} role
 * @property {string} content
 * @property {string} createdAt
 */

/**
 * @typedef {Object} ChatSession
 * @property {string} id
 * @property {string} [summary]
 * @property {ChatMessage[]} messages
 * @property {Object} [metadata]
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} [expiresAt]
 */

/**
 * @typedef {Object} ChatContext
 * @property {string} [userId]
 * @property {string} [source]
 * @property {Object} [extra]
 */

/**
 * @typedef {Object} ChatbotResponse
 * @property {string} sessionId
 * @property {string} answer
 */

/**
 * @typedef {Object} LlmProvider
 * @property {(params: LlmGenerateParams) => Promise<string>} generate
 */

/**
 * @typedef {Object} LlmGenerateParams
 * @property {string} [prompt]
 * @property {string} systemPrompt
 * @property {string} [resources]
 * @property {string} [context]
 * @property {string} [summary]
 * @property {ChatMessage[]} [history]
 * @property {string} message
 * @property {Object} [options]
 */

/**
 * @typedef {Object} ResourceProvider
 * @property {() => Promise<string>} loadResources
 * @property {() => Promise<string>} loadSystemPrompt
 */

/**
 * @typedef {Object} SessionProvider
 * @property {(data: Object) => Promise<ChatSession>} createSession
 * @property {(id: string) => Promise<ChatSession|null>} getSession
 * @property {() => Promise<ChatSession[]>} getAllSessions
 * @property {(session: ChatSession) => Promise<void>} saveSession
 * @property {(id: string) => Promise<void>} deleteSession
 * @property {(id: string, message: ChatMessage) => Promise<void>} addMessage
 * @property {(id: string) => Promise<ChatMessage[]>} getHistory
 * @property {(id: string) => Promise<string|null>} getSummary
 * @property {(id: string, summary: string) => Promise<void>} updateSummary
 */

export {};
