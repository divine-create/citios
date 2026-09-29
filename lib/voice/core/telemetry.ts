import { VoiceErrorCode } from './errors';
import { RiskLevel } from './policy';

export type VoiceTelemetryEvent = {
  timestamp: string;
  event: 'VOICE_TOOL_EXECUTED' | 'VOICE_TOOL_FAILED' | 'VOICE_CLARIFICATION_REQUESTED' | 'VOICE_WORKFLOW_CANCELLED';
  residentId: string;
  module?: string;
  tool?: string;
  riskLevel?: RiskLevel;
  success?: boolean;
  latencyMs?: number;
  errorCode?: VoiceErrorCode;
  errorCategory?: string;
};

export class VoiceTelemetry {
  log(event: VoiceTelemetryEvent) {
    // In production, this would send to Datadog, Sentry, or CityOS Analytics.
    // For now, we output structured JSON for log aggregation.
    console.log(JSON.stringify(event));
  }
}

export const telemetry = new VoiceTelemetry();
