# chatbot-core

Libreria core para construir asistentes conversacionales con proveedores LLM, recursos de conocimiento y persistencia de sesiones.

El paquete separa tres responsabilidades:

- `llmProvider`: genera respuestas con un modelo, actualmente con soporte para Ollama.
- `resourceProvider`: carga recursos y prompt del sistema desde archivos.
- `sessionProvider`: conserva historial, resumen y metadata de cada conversacion.

Esta separacion permite cambiar el modelo, la fuente de conocimiento o el almacenamiento de sesiones sin modificar el flujo principal del chatbot.

## Requisitos

- Node.js con soporte ESM y `fetch` global.
- Ollama corriendo localmente si se usa `OllamaProvider`.
- Un modelo instalado en Ollama, por ejemplo:

```bash
ollama pull llama3.2:3b
```

## Instalacion

Como dependencia local o publicada:

```bash
npm install chatbot-core
```

En este repositorio:

```bash
npm install
```

## Uso basico

```js
import path from 'path';
import {
  createChatbot,
  OllamaProvider,
  FileResourceProvider,
  FileSessionProvider
} from 'chatbot-core';

const chatbot = createChatbot({
  llmProvider: new OllamaProvider({
    model: 'llama3.2:3b'
  }),
  resourceProvider: new FileResourceProvider({
    resourcesPath: path.resolve('resources')
  }),
  sessionProvider: new FileSessionProvider({
    path: path.resolve('.sessions')
  })
});

const response = await chatbot.sendMessage({
  message: 'Como consulto el stock de un articulo?'
});

console.log(response.sessionId);
console.log(response.answer);
```

Para continuar una conversacion, reutilice el `sessionId` devuelto:

```js
const nextResponse = await chatbot.sendMessage({
  sessionId: response.sessionId,
  message: 'Y donde veo saldos de clientes?'
});
```

## Ejemplo interactivo

El repositorio incluye un ejemplo de consola en `examples/basic`.

Primero asegurese de tener Ollama activo y el modelo usado por el ejemplo:

```bash
ollama pull llama3.2:3b
```

Luego ejecute:

```bash
npm run example-basic
```

El ejemplo carga recursos desde `examples/basic/resources` y guarda sesiones JSON en `.sessions`.

## API publica

El paquete exporta:

```js
import {
  createChatbot,
  OllamaProvider,
  FileResourceProvider,
  MemorySessionProvider,
  FileSessionProvider
} from 'chatbot-core';
```

### createChatbot(options)

Crea una instancia con el metodo `sendMessage`.

Opciones requeridas:

- `llmProvider`: objeto con metodo `generate(params)`.
- `resourceProvider`: objeto con metodos `loadResources()` y `loadSystemPrompt()`.
- `sessionProvider`: proveedor compatible con sesiones.

Opciones de configuracion:

| Opcion | Valor por defecto | Descripcion |
| --- | --- | --- |
| `maxMessageLength` | `2000` | Longitud maxima permitida para mensajes de usuario. |
| `maxHistoryMessages` | `10` | Cantidad de mensajes a partir de la cual se compacta el historial. |
| `maxSummaryLength` | `1000` | Longitud maxima del resumen guardado en la sesion. |
| `temperature` | `0.3` | Temperatura enviada al provider LLM. |
| `summaryTemperature` | `0.1` | Temperatura usada para resumir historial, si se configura. |

### sendMessage({ message, sessionId, context })

Procesa un mensaje de usuario.

Parametros:

- `message`: texto del usuario. Es requerido.
- `sessionId`: id de una sesion existente. Si se omite, se crea una sesion nueva.
- `context`: datos externos opcionales. Se agregan al prompt y, al crear sesion, a la metadata.

Respuesta:

```js
{
  sessionId: '...',
  answer: '...'
}
```

## Proveedores incluidos

### OllamaProvider

Proveedor LLM para la API `/api/generate` de Ollama.

```js
const llmProvider = new OllamaProvider({
  baseUrl: 'http://127.0.0.1:11434',
  model: 'llama3.2:3b',
  keepAlive: '30m'
});
```

El provider acepta un `prompt` ya armado. Si no se envia, puede construir uno a partir de `systemPrompt`, `resources`, `context`, `summary`, `history` y `message`.

### FileResourceProvider

Carga archivos `.md` y `.json` desde un directorio de recursos.

```js
const resourceProvider = new FileResourceProvider({
  resourcesPath: './resources'
});
```

Tambien carga el prompt base desde `src/prompts/system.md`. Si se necesita otro prompt:

```js
const resourceProvider = new FileResourceProvider({
  resourcesPath: './resources',
  systemPromptPath: './prompts/system.md'
});
```

### FileSessionProvider

Persiste cada sesion como JSON.

```js
const sessionProvider = new FileSessionProvider({
  path: './.sessions'
});
```

La sesion guarda:

- `id`
- `summary`
- `messages`
- `metadata`
- `createdAt`
- `updatedAt`
- `expiresAt`

### MemorySessionProvider

Guarda sesiones en memoria usando un `Map`. Es util para tests, procesos temporales o prototipos.

```js
const sessionProvider = new MemorySessionProvider();
```

## Recursos y comportamiento

Los recursos son la fuente de conocimiento del asistente. En el ejemplo basico se usan archivos Markdown como:

- comportamiento del asistente
- contexto de negocio
- procedimientos operativos
- preguntas frecuentes

El prompt del sistema y los recursos indican que el asistente no debe inventar rutas, pantallas ni procedimientos. Si un procedimiento no esta documentado, debe responder:

```txt
No tengo esa respuesta en la informacion disponible.
```

## Historial y resumen

Cada conversacion conserva mensajes recientes. Cuando la cantidad de mensajes llega a `maxHistoryMessages`, el historial antiguo se compacta en `summary`.

La compactacion reutiliza el mismo `llmProvider.generate()` con un prompt de resumen. Luego se conservan los mensajes mas recientes y se guarda la sesion actualizada.

Esto permite mantener contexto sin enviar todo el historial completo en cada llamada.

## Manejo de errores

La libreria define errores propios para los casos principales:

- `MESSAGE_REQUIRED`
- `MESSAGE_TOO_LONG`
- `LLM_PROVIDER_ERROR`
- `RESOURCE_PROVIDER_ERROR`
- `SESSION_PROVIDER_ERROR`

Los errores extienden la jerarquia de errores de la libreria e incluyen `code`, `status` y `message`.

## Scripts

```bash
npm test
```

Ejecuta la suite con `node --test`.

```bash
npm run example-basic
```

Inicia el ejemplo interactivo de consola.

## Estructura del proyecto

```txt
src/
  core/                 flujo principal, prompt builder y resumen
  providers/
    llm/                proveedor de Ollama
    resources/          carga de recursos desde archivos
    sessions/           sesiones en memoria o archivo
  prompts/              prompt base del sistema
  errors/               errores de la libreria
examples/basic/         ejemplo interactivo con recursos de Inventiva
tests/                  pruebas automatizadas
```

## Estado

Version inicial `0.1.0`. La libreria esta pensada como core extensible para asistentes internos basados en recursos y sesiones.
