import { ResidentIntelligenceContext, VoiceRecommendation } from './types';
import { db } from '@/src/prisma/db';

export async function generateRecommendations(ctx: ResidentIntelligenceContext): Promise<VoiceRecommendation[]> {
  const recommendations: VoiceRecommendation[] = [];

  // Policy: Do not use sensitive attributes. 
  // Generate recommendations based strictly on safe routines and contexts.

  const waterRoutine = ctx.preferences.find(p => p.category === 'ROUTINE' && p.value?.toLowerCase().includes('water'));
  if (waterRoutine) {
    recommendations.push({
      id: 'rec-water',
      type: 'ROUTINE',
      title: 'Order Bottled Water',
      explanation: 'You usually order bottled water around this time.',
      relevance: 'HIGH',
      action: {
        workflowType: 'commerce_search_and_add',
        requiresConfirmation: true
      }
    });
  }

  // Suggest reviewing nearby events if it's the weekend
  const today = new Date();
  if (today.getDay() === 5 || today.getDay() === 6) { // Friday or Saturday
    recommendations.push({
      id: 'rec-weekend-events',
      type: 'DISCOVERY',
      title: 'Find nearby events',
      explanation: 'It\'s the weekend. Would you like to hear about events nearby?',
      relevance: 'MEDIUM',
      action: {
        workflowType: 'discovery_search',
        requiresConfirmation: false
      }
    });
  }

  // Suggest reviewing completed services
  const completedServices = await db.orm.public.Notification.where({ personId: ctx.personId, type: 'SERVICE_COMPLETED', isRead: false }).all();
  if (completedServices.length > 0) {
    recommendations.push({
      id: 'rec-service-review',
      type: 'SERVICE',
      title: 'Review your completed service',
      explanation: 'Your recent service request was completed.',
      relevance: 'HIGH'
    });
  }

  return recommendations;
}
