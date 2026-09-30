export type VoiceWorkflowStepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED'
  | 'UNKNOWN';

export type VoiceWorkflowStatus =
  | 'CREATED'
  | 'PLANNING'
  | 'RUNNING'
  | 'WAITING_FOR_INPUT'
  | 'WAITING_FOR_CONFIRMATION'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'UNKNOWN'
  | 'CANCELLED'
  | 'EXPIRED';

export type VoiceWorkflowStep = {
  id: string; // e.g., 'step-1'
  toolName: string;
  status: VoiceWorkflowStepStatus;
  
  input?: any; // The arguments for the tool
  output?: any; // The result of the tool
  
  requiresConfirmation?: boolean;
  
  startedAt?: string;
  completedAt?: string;
  
  errorCode?: string;
  
  dependsOn?: string[]; // IDs of steps that must complete before this one
};

export type VoiceWorkflow = {
  id: string;
  personId: string;
  sessionId?: string;

  type: string;
  status: VoiceWorkflowStatus;

  currentStep?: string;
  steps: VoiceWorkflowStep[];

  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  
  // To keep track of ambiguity/clarification
  clarificationRequest?: {
    stepId: string;
    missingFields: string[];
    question: string;
  };
  
  // For confirmation mapping
  confirmationRequest?: {
    stepId: string;
    action: string;
    summary: string;
  };
};

export type WorkflowPlan = {
  workflowType: string;
  steps: {
    id: string;
    toolName: string;
    arguments: any;
    dependsOn?: string[];
  }[];
};

export type VoiceWorkflowResult = {
  workflowId: string;
  status: string;

  summary: string;

  completedSteps: number;
  remainingSteps: number;

  data?: unknown;

  requiresInput?: {
    field: string;
    question: string;
  };

  requiresConfirmation?: {
    action: string;
    summary: string;
    confirmationToken?: string;
  };

  error?: {
    code: string;
    message: string;
  };
};
