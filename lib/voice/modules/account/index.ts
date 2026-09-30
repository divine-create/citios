import { VoiceModule } from '../../core/policy';
import { getProfile, getOrderStatus, rememberPreference, forgetPreference, listPreferences, setReminder, cancelReminderTool, listRemindersTool } from '../../tools/impl/account';

export const AccountModule: VoiceModule = {
  version: '1.0.0',
  id: 'account',
  name: 'Account & Logistics Module',
  description: 'Handles resident profiles, orders, and delivery tracking.',
  tools: [getProfile, getOrderStatus, rememberPreference, forgetPreference, listPreferences, setReminder, cancelReminderTool, listRemindersTool] // Temporarily using existing implementations
};
