export type RiskLevel = 'read' | 'reversible' | 'financial' | 'irreversible' | 'sensitive';

export type VoiceToolDefinition = {
  name: string;
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
  execute: (args: any, session: any) => Promise<any>;
};

export type VoiceModule = {
  id: string;
  name: string;
  description: string;
  tools: VoiceToolDefinition[];
  // Future capabilities could go here:
  // canHandleIntent?: (intent: any) => boolean;
  // initialize?: () => Promise<void>;
  // metadata?: any;
};
