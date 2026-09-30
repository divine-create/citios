export type ActivitySummary = {
  id: string;
  type: string;
  label: string;
  date: Date;
}

export type ResidentIntelligenceContext = {
  personId: string;
  recentActivity: ActivitySummary[];
  activeOrders: any[];
  activeDeliveries: any[];
  activeServiceRequests: any[];
  preferences: any[];
  reminders: any[];
  upcomingEvents: any[];
  recentChanges: any[];
}

export type VoiceRecommendation = {
  id: string;
  type: string;
  title: string;
  explanation?: string;
  relevance: "LOW" | "MEDIUM" | "HIGH";
  expiresAt?: Date;
  action?: {
    workflowType: string;
    requiresConfirmation: boolean;
  };
}

export type VoiceIntelligenceEvent = {
  id: string;
  personId: string;
  type: string;
  entityType: string;
  entityReference: string;
  occurredAt: Date;
  payload: any;
}
