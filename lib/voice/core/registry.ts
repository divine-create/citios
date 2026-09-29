import { VoiceModule, VoiceToolDefinition } from './policy';

class VoiceModuleRegistry {
  private modules: Map<string, VoiceModule> = new Map();
  private tools: Map<string, VoiceToolDefinition> = new Map();

  registerModule(mod: VoiceModule) {
    if (!mod.id || !mod.name) {
      throw new Error('Module must have an id and name.');
    }
    if (this.modules.has(mod.id)) {
      throw new Error(`Voice Module ${mod.id} is already registered.`);
    }
    
    // Validate tools
    for (const tool of mod.tools) {
      if (!tool.name) throw new Error(`Tool in module ${mod.id} is missing a name.`);
      if (this.tools.has(tool.name)) {
        throw new Error(`Tool conflict: ${tool.name} is already registered.`);
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
        // We enforce that highly privileged tools (other than purely reading ones if misclassified) require confirmation
        if (tool.name !== 'cancel_workflow') {
           throw new Error(`Tool ${tool.name} with risk level ${tool.riskLevel} must require confirmation.`);
        }
      }
    }

    this.modules.set(mod.id, mod);
    for (const tool of mod.tools) {
      this.tools.set(tool.name, tool);
    }
  }

  getTool(name: string): VoiceToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAllTools(): VoiceToolDefinition[] {
    return Array.from(this.tools.values());
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
