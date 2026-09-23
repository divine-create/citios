import sys

with open('app/admin/hotel/page.tsx', 'w', encoding='utf-8') as f:
    f.write('''import { redirect } from 'next/navigation';
export default function HotelAdminPage() {
  redirect('/hotel/manager');
}
''')
