export class ToolRunner {
  constructor({ registry } = {}) {
    if (!registry) {
      throw new Error('registry es requerido');
    }
    this._registry = registry;
  }

  async run(name, input = {}, context = {}) {
    const tool = this._registry.get(name);

    if (!tool) {
      return {
        ok: false,
        tool: name,
        error: {
          message: `Tool no encontrada: ${name}`,
          code: 'TOOL_NOT_FOUND'
        }
      };
    }

    try {
      const result = await tool.execute(input, context);
      if (result?.ok === false) {
        return {
          ok: false,
          tool: name,
          error: {
            message: result.error?.message || 'La tool devolvio un error',
            code: result.error?.code || 'TOOL_EXECUTION_ERROR'
          }
        };
      }

      return {
        ok: true,
        tool: name,
        data: result?.data ?? result ?? {}
      };
    } catch (err) {
      return {
        ok: false,
        tool: name,
        error: {
          message: err.message,
          code: err.code || 'TOOL_EXECUTION_ERROR'
        }
      };
    }
  }
}
