export type RiskLevel = 'read' | 'reversible' | 'financial' | 'irreversible' | 'sensitive';

export type VoiceToolDefinition = {
  name: string;
  aliases?: string[]; // Preserves backward compatibility for renamed tools
  description: string;
  domain: string; // e.g. 'commerce', 'services', 'logistics'
  riskLevel: RiskLevel;
  requiresConfirmation: boolean;
  requiresAuthentication: boolean;
  inputSchema: any; // JSON Schema for the input
  outputSchema?: any; // JSON Schema for the output
  timeout?: number; // Timeout in milliseconds
  idempotencyBehavior?: 'idempotent' | 'non-idempotent' | 'generates-idempotency-key';
  authorizationRequirements?: string[];
  orchestrationEligible: boolean; // whether it can participate in orchestration
  execute: (args: any, session: any, abortSignal?: AbortSignal) => Promise<any>;
};

export type VoiceModule = {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled?: boolean;
  tools: VoiceToolDefinition[];
  authorize?: (session: any) => Promise<boolean>;
  mapError?: (err: any) => { code: string; message: string };
};
