import sys
with open('components/cityos/BusinessDashboard.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
    "HOTEL: { href: '/admin/hotel', label: 'Full HotelOS admin' },",
    "HOTEL: { href: '/hotel/manager', label: 'Full HotelOS admin' },"
)
with open('components/cityos/BusinessDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
