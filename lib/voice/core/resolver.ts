import { VoiceToolDefinition } from './policy';

export type ResolvedIntent = {
  domain: string;
  intent: string;
  entities: any[];
  missingInformation: string[];
  confidence: number;
};

export class IntentResolver {
  resolveIntent(text: string): ResolvedIntent {
    // This is a stub for where a strict NLP or secondary fast-LLM pass 
    // would evaluate the user's intent outside of tool calling.
    // Right now, AssemblyAI + Tool Registry handles this implicitly,
    // but the architecture requires a structured intent resolution boundary.
    return {
      domain: 'unknown',
      intent: 'unknown',
      entities: [],
      missingInformation: [],
      confidence: 0
    };
  }

  evaluateToolClarification(tool: VoiceToolDefinition, args: any): { complete: boolean; missingFields: string[] } {
    const missing: string[] = [];
    
    // Evaluate based on schema required properties
    if (tool.inputSchema && tool.inputSchema.required) {
      for (const req of tool.inputSchema.required) {
        if (args[req] === undefined || args[req] === null) {
          missing.push(req);
        }
      }
    }
    
    return {
      complete: missing.length === 0,
      missingFields: missing
    };
  }
}

export const intentResolver = new IntentResolver();
