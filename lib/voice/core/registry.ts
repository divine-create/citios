import { VoiceModule, VoiceToolDefinition } from './policy';

class VoiceModuleRegistry {
  private modules: Map<string, VoiceModule> = new Map();
  private tools: Map<string, VoiceToolDefinition> = new Map();

  registerModule(mod: VoiceModule) {
    if (this.modules.has(mod.id)) {
      console.warn(`Voice Module ${mod.id} is already registered.`);
      return;
    }
    this.modules.set(mod.id, mod);
    
    for (const tool of mod.tools) {
      if (this.tools.has(tool.name)) {
        console.warn(`Tool conflict: ${tool.name} is already registered.`);
        continue;
      }
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
