export type VoiceContextData = {
  activeModule?: string;
  activeProduct?: { id: string; name: string };
  activeRestaurant?: { id: string; name: string };
  activeOrder?: { id: string; reference: string };
  activeServiceRequest?: { id: string; reference: string };
  activeServiceJob?: { id: string; reference: string };
  
  // Phase 6: Multi-workflow tracking
  activeWorkflows?: Record<string, {
    workflowId: string;
    action: string;
    domain: string;
    confirmationId?: string;
    expiresAt?: string;
    contextData?: any; // To store workflow-specific state (like pendingServiceNotes)
  }>;
  
  recentEntities?: Array<{
    type: string;
    id: string;
    label: string;
  }>;
  
  taskState?: {
    status: 'IDLE' | 'CONNECTING' | 'LISTENING' | 'THINKING' | 'TOOL_EXECUTING' | 'AWAITING_CLARIFICATION' | 'AWAITING_CONFIRMATION' | 'SPEAKING' | 'INTERRUPTED' | 'RECOVERING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    missingFields?: string[];
    currentWorkflowId?: string;
  };
};

export type VoiceContext = {
  id: string;
  personId: string;
  data: VoiceContextData;
  updatedAt: Date;
};
