import { redirect } from 'next/navigation';

/**
 * Legacy HotelOS entrypoint.
 * The canonical management dashboard lives at /hotel-os.
 */
export default function LegacyHotelAdminPage() {
  redirect('/hotel-os');
}
