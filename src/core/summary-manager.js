export class SummaryManager {
  constructor({ maxHistoryMessages = 10, maxSummaryLength = 1000, llmProvider = null } = {}) {
    this._maxHistoryMessages = maxHistoryMessages;
    this._maxSummaryLength = maxSummaryLength;
    this._llmProvider = llmProvider;
  }

  shouldCompact(messagesCount) {
    return messagesCount >= this._maxHistoryMessages;
  }

  async compactHistory({ messages, summary, options } = {}) {
    if (!this.shouldCompact(messages.length) || messages.length === 0) {
      return { summary, recentMessages: messages };
    }

    const keepCount = Math.max(4, Math.floor(this._maxHistoryMessages / 2));
    const compactedMessages = messages.slice(0, -keepCount);
    const recentMessages = messages.slice(-keepCount);
    const compactedSummary = await this._summarizeMessages(compactedMessages, summary, options);
    const nextSummary = this._llmProvider
      ? this._trimSummary(compactedSummary)
      : this._trimSummary([summary, compactedSummary].filter(Boolean).join('\n'));

    return { summary: nextSummary, recentMessages };
  }

  async _summarizeMessages(messages, currentSummary = '', options = {}) {
    if (!messages || messages.length === 0) {
      return '';
    }

    const transcript = this._formatMessages(messages);

    if (!this._llmProvider) {
      return `Resumen de mensajes anteriores:\n${transcript}`;
    }

    return this._llmProvider.generate({
      prompt: this._buildSummaryPrompt({
        currentSummary,
        transcript,
        maxSummaryLength: this._maxSummaryLength
      }),
      options: {
        ...options,
        temperature: options?.summaryTemperature ?? 0.1
      }
    });
  }

  _formatMessages(messages) {
    return messages.map((message) => {
      const role = message.role === 'assistant' ? 'Asistente' : 'Usuario';
      const content = String(message.content || '').replace(/\s+/g, ' ').trim();
      return `${role}: ${content}`;
    }).join('\n');
  }

  _buildSummaryPrompt({ currentSummary, transcript, maxSummaryLength }) {
    const parts = [
      'Resume la conversacion para mantener memoria entre turnos.',
      'Conserva datos importantes, decisiones, preferencias del usuario, restricciones y tareas pendientes.',
      `Devuelve solo el resumen actualizado en menos de ${maxSummaryLength} caracteres.`,
      ''
    ];

    if (currentSummary) {
      parts.push('Resumen actual:');
      parts.push(currentSummary);
      parts.push('');
    }

    parts.push('Mensajes a incorporar:');
    parts.push(transcript);

    return parts.join('\n');
  }

  _trimSummary(summary) {
    if (!summary || summary.length <= this._maxSummaryLength) {
      return summary;
    }

    return summary.slice(-this._maxSummaryLength).trimStart();
  }
}
