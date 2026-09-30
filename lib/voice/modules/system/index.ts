import { VoiceModule } from '../../core/policy';
import { rememberPreference, forgetPreference, cancelWorkflow, getOperationStatus, startWorkflowTool, confirmWorkflowStepTool, clarifyWorkflowStepTool } from '../../tools/impl/system';

export const SystemModule: VoiceModule = {
  version: '1.0.0',
  id: 'system',
  name: 'System & Memory Module',
  description: 'Handles persistent memory, workflow cancellation, and system state.',
  tools: [rememberPreference, forgetPreference, cancelWorkflow, getOperationStatus, startWorkflowTool, confirmWorkflowStepTool, clarifyWorkflowStepTool]
};
