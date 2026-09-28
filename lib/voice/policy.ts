export type RiskLevel = 'read' | 'reversible' | 'financial' | 'irreversible' | 'sensitive';

export type VoiceToolDefinition = {
  name: string;
  description: string;
  riskLevel: RiskLevel;
  requiresConfirmation: boolean;
  execute: (args: any, session: any) => Promise<any>;
};

export const toolsRegistry = new Map<string, VoiceToolDefinition>();

export function registerTool(def: VoiceToolDefinition) {
  toolsRegistry.set(def.name, def);
}

export function getToolDefinition(name: string): VoiceToolDefinition | undefined {
  return toolsRegistry.get(name);
}

export function requiresConfirmation(name: string): boolean {
  const def = getToolDefinition(name);
  return def ? def.requiresConfirmation : false;
}
