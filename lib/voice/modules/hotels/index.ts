import { VoiceModule } from '../../core/policy';
import { checkRoomAvailability, bookHotelRoom } from '../../tools/impl/hotels';

export const HotelModule: VoiceModule = {
  id: 'hotels',
  name: 'Hotels & Hospitality Module',
  description: 'Book and manage hotel reservations.',
  tools: [checkRoomAvailability, bookHotelRoom]
};
