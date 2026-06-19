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
  FileSessionProvider,
  searchResourcesTool,
  getCurrentDateTool,
  getCustomerBalanceDetailTool
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
  }),
  tools: [
    searchResourcesTool,
    getCurrentDateTool,
    getCustomerBalanceDetailTool
  ]
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
  FileSessionProvider,
  ToolRegistry,
  ToolRunner,
  searchResourcesTool,
  getCurrentDateTool,
  getCustomerBalanceDetailTool
} from 'chatbot-core';
```

### createChatbot(options)

Crea una instancia con el metodo `sendMessage`.

Opciones requeridas:

- `llmProvider`: objeto con metodo `generate(params)`.
- `resourceProvider`: objeto con metodos `loadResources()` y `loadSystemPrompt()`.
- `sessionProvider`: proveedor compatible con sesiones.
- `tools`: array opcional de herramientas disponibles para el chatbot.

Opciones de configuracion:

| Opcion | Valor por defecto | Descripcion |
| --- | --- | --- |
| `maxMessageLength` | `2000` | Longitud maxima permitida para mensajes de usuario. |
| `maxHistoryMessages` | `10` | Cantidad de mensajes a partir de la cual se compacta el historial. |
| `maxSummaryLength` | `1000` | Longitud maxima del resumen guardado en la sesion. |
| `toolsEnabled` | `true` | Permite registrar metadata y ejecutar tools si el modelo las solicita. |
| `maxToolCalls` | `1` | Cantidad maxima de tools por mensaje. En esta version debe ser `1`. |
| `temperature` | `0` | Temperatura enviada al provider LLM. Use valores mayores si necesita respuestas mas variables. |
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

## Tools

Las tools permiten agregar funciones controladas sin modificar el core para cada caso nuevo. Son opcionales: si no se pasan tools, el chatbot funciona igual que antes.

Una tool tiene esta forma:

```js
const myTool = {
  name: 'myTool',
  description: 'Describe cuando usar la herramienta.',
  instructions: 'Indica al modelo en que casos debe usar esta tool.',
  shouldUse({ message }) {
    return message.includes('algo que esta tool resuelve');
  },
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  async execute(input, context) {
    return {
      ok: true,
      data: {}
    };
  }
};
```

Campos:

- `name`: identificador unico de la tool.
- `description`: descripcion corta para la metadata.
- `instructions`: instruccion opcional que se agrega al prompt cuando la tool se registra.
- `shouldUse`: funcion opcional para que la tool decida de forma deterministica si corresponde al mensaje.
- `parameters`: esquema simple de argumentos esperados.
- `execute`: funcion que ejecuta la herramienta.

El core usa una estrategia simple:

1. Si alguna tool implementa `shouldUse` y devuelve `true`, ejecuta esa tool con `{ query: message }`.
2. Si ninguna tool decide por `shouldUse`, hace una llamada de seleccion de tool en JSON.
3. Si la seleccion devuelve `{ "tool": "...", "input": {} }`, ejecuta una tool registrada.
4. Si el resultado contiene `data.answer`, responde directamente ese texto.
5. Si la tool no devuelve `data.answer`, agrega el resultado al prompt y hace una llamada al LLM para generar la respuesta final.
6. Si la seleccion devuelve `{ "tool": null, "input": {} }`, genera una respuesta normal sin tools.

No se ejecutan tools desconocidas, JSON invalido ni multiples tools por mensaje.

### Builtin tools

`searchResourcesTool` busca coincidencias simples en los recursos cargados:

```js
import { searchResourcesTool } from 'chatbot-core';
```

Input esperado:

```js
{ query: 'consultar stock' }
```

Instruccion cargada en el prompt:

```txt
Si el usuario pide buscar o ubicar informacion en los recursos, usa esta tool.
```

`getCurrentDateTool` devuelve fecha y hora actual:

```js
import { getCurrentDateTool } from 'chatbot-core';
```

Input esperado:

```js
{}
```

Instruccion cargada en el prompt:

```txt
Si el usuario pregunta la hora, fecha, dia actual o momento actual, usa esta tool.
```

`getCustomerBalanceDetailTool` devuelve el detalle de saldo de un cliente desde un JSON mockeado incluido en la libreria:

```js
import { getCustomerBalanceDetailTool } from 'chatbot-core';
```

Input esperado:

```js
{ ruc: '80012345-6' }
```

O:

```js
{ customerCode: 'CLI-001' }
```

Output principal:

```js
{
  found: true,
  customer: {},
  currency: 'PYG',
  totalPending: 2090000,
  pendingInvoices: [],
  answer: '...'
}
```

Instruccion cargada en el prompt:

```txt
Si el usuario pide detalle de saldo, facturas pendientes, deuda o saldo pendiente de un cliente, usa esta tool. Tambien usala en preguntas de seguimiento sobre otro cliente.
```

Por ahora lee datos desde `src/tools/data/customer-balances.json`. Mas adelante se puede cambiar el `execute` para hacer `fetch` a una API REST sin modificar el core.

Estas tools son informativas. No consultan datos reales del ERP ni modifican datos externos.

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
  tools/                registry y tools builtin
  prompts/              prompt base del sistema
  errors/               errores de la libreria
examples/basic/         ejemplo interactivo con recursos de Inventiva
tests/                  pruebas automatizadas
```

## Estado

Version inicial `0.1.0`. La libreria esta pensada como core extensible para asistentes internos basados en recursos y sesiones.
