import { VoiceModule } from '../../core/policy';
import { cancelWorkflow, getOperationStatus, startWorkflowTool, confirmWorkflowStepTool, clarifyWorkflowStepTool, getDailyBrief, getRecentChanges } from '../../tools/impl/system';

export const SystemModule: VoiceModule = {
  version: '1.0.0',
  id: 'system',
  name: 'System & Intelligence Module',
  description: 'Handles workflows, operation state, and proactive context/briefs.',
  tools: [cancelWorkflow, getOperationStatus, startWorkflowTool, confirmWorkflowStepTool, clarifyWorkflowStepTool, getDailyBrief, getRecentChanges]
};
