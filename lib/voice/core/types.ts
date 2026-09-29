export type VoiceContextData = {
  activeModule?: string;
  activeProduct?: { id: string; name: string };
  activeRestaurant?: { id: string; name: string };
  activeOrder?: { id: string; reference: string };
  activeServiceRequest?: { id: string; reference: string };
  activeServiceJob?: { id: string; reference: string };
  pendingAction?: {
    action: string;
    confirmationId?: string;
    expiresAt?: string; // ISO date
  };
  recentEntities?: Array<{
    type: string;
    id: string;
    label: string;
  }>;
  taskState?: {
    status: 'idle' | 'resolving_intent' | 'awaiting_clarification' | 'awaiting_confirmation' | 'executing' | 'error' | 'completed' | 'cancelled';
    missingFields?: string[];
    currentWorkflow?: string;
  };
};

export type VoiceContext = {
  id: string;
  personId: string;
  data: VoiceContextData;
  updatedAt: Date;
};
