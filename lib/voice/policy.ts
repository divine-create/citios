export type RiskLevel = 'read' | 'reversible' | 'financial' | 'irreversible' | 'sensitive';

export type VoiceToolDefinition = {
  name: string;
  description: string;
  domain: 'commerce' | 'services' | 'logistics' | 'account' | 'discovery' | 'system';
  riskLevel: RiskLevel;
  requiresConfirmation: boolean;
  requiresAuthentication: boolean;
  inputSchema: any; // JSON Schema for the input
  outputSchema?: any; // JSON Schema for the output (optional, mostly for docs/validation)
  timeout?: number; // Timeout in milliseconds
  idempotencyBehavior?: 'idempotent' | 'non-idempotent' | 'generates-idempotency-key';
  authorizationRequirements?: string[];
  orchestrationEligible: boolean; // whether it can participate in orchestration
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
