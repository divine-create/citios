import { VoiceModule, VoiceToolDefinition } from './policy';

export type RegisteredVoiceTool = {
  module: VoiceModule;
  tool: VoiceToolDefinition;
};

class VoiceModuleRegistry {
  private modules: Map<string, VoiceModule> = new Map();
  private tools: Map<string, RegisteredVoiceTool> = new Map();

  registerModule(mod: VoiceModule) {
    if (!mod.id || !mod.name) {
      throw new Error('Module must have an id and name.');
    }
    if (this.modules.has(mod.id)) {
      throw new Error(`Voice Module ${mod.id} is already registered.`);
    }

    // Do not expose tools if module is disabled
    if (mod.enabled === false) {
      return;
    }
    
    // Pre-validate all tools and aliases to prevent partial registration
    const moduleToolNames = new Set<string>();
    
    for (const tool of mod.tools) {
      if (!tool.name) throw new Error(`Tool in module ${mod.id} is missing a name.`);
      
      if (this.tools.has(tool.name) || moduleToolNames.has(tool.name)) {
        throw new Error(`Tool conflict: ${tool.name} in module ${mod.id} is already registered.`);
      }
      moduleToolNames.add(tool.name);

      if (tool.aliases) {
        for (const alias of tool.aliases) {
          if (this.tools.has(alias) || moduleToolNames.has(alias)) {
            throw new Error(`Alias conflict: ${alias} for tool ${tool.name} in module ${mod.id} is already registered.`);
          }
          moduleToolNames.add(alias);
        }
      }

      if (!['read', 'reversible', 'financial', 'irreversible', 'sensitive'].includes(tool.riskLevel)) {
        throw new Error(`Tool ${tool.name} has invalid risk level: ${tool.riskLevel}`);
      }
      if (typeof tool.execute !== 'function') {
        throw new Error(`Tool ${tool.name} is missing an execute handler.`);
      }
      if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
        throw new Error(`Tool ${tool.name} is missing a valid input schema.`);
      }
      if (['financial', 'irreversible', 'sensitive'].includes(tool.riskLevel) && tool.requiresConfirmation === false && tool.name !== 'cancel_workflow') {
        if (tool.name !== 'cancel_workflow') {
           throw new Error(`Tool ${tool.name} with risk level ${tool.riskLevel} must require confirmation.`);
        }
      }
    }

    this.modules.set(mod.id, mod);
    for (const tool of mod.tools) {
      this.tools.set(tool.name, { module: mod, tool });
      if (tool.aliases) {
        for (const alias of tool.aliases) {
          this.tools.set(alias, { module: mod, tool });
        }
      }
    }
  }

  getToolOwner(name: string): RegisteredVoiceTool | undefined {
    return this.tools.get(name);
  }

  getTool(name: string): VoiceToolDefinition | undefined {
    return this.tools.get(name)?.tool;
  }

  getAllTools(): VoiceToolDefinition[] {
    const uniqueTools = new Set<VoiceToolDefinition>();
    for (const { tool } of this.tools.values()) {
      uniqueTools.add(tool);
    }
    return Array.from(uniqueTools);
  }

  getModules(): VoiceModule[] {
    return Array.from(this.modules.values());
  }
}

export const moduleRegistry = new VoiceModuleRegistry();

// Export the helper for other files that used the old policy map
export function getToolDefinition(name: string): VoiceToolDefinition | undefined {
  return moduleRegistry.getTool(name);
}

export function requiresConfirmation(name: string): boolean {
  const def = getToolDefinition(name);
  return def ? def.requiresConfirmation : false;
}
