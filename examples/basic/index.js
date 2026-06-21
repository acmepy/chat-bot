
import path from 'path';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { fileURLToPath } from 'url';
import {
  createChatbot,
  OllamaProvider,
  FileResourceProvider,
  FileSessionProvider,
  searchResourcesTool,
  getCurrentDateTool,
  getCustomerBalanceDetailTool,
  pingHostTool
} from '../../src/index.js';

const exampleDir = path.dirname(fileURLToPath(import.meta.url));

const chatbot = createChatbot({
  llmProvider: new OllamaProvider({model:'llama3.2:3b'}),
  resourceProvider: new FileResourceProvider({ resourcesPath: path.join(exampleDir, 'resources') }),
  sessionProvider: new FileSessionProvider({ path: path.join(exampleDir, '..', '..', '.sessions') }),
  tools: [
    searchResourcesTool,
    getCurrentDateTool,
    getCustomerBalanceDetailTool,
    pingHostTool
  ]
});

const rl = readline.createInterface({ input, output });
let sessionId = null;

console.log('Asistente Inventiva');
console.log('Escriba su consulta y presione Enter. Use "salir" para terminar.');

try {
  while (true) {
    const message = (await rl.question('\nUsuario: ')).trim();

    if (!message)continue;
    if (['salir', 'exit', 'quit'].includes(message.toLowerCase()))break;

    try {
      const response = await chatbot.sendMessage({message,sessionId});

      sessionId = response.sessionId;
      console.log(`\nAsistente: ${response.answer}`);
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      if (sessionId)console.log(`Sesion: ${sessionId}`);
    }
  }
} finally {
  rl.close();
}
