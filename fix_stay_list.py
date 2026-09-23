import sys

with open('components/cityos/CityStayList.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('export default function CityStayList() {', 'export default function CityStayList({ hotels = [] }: { hotels?: any[] }) {')
c = c.replace('const hotels: any[] = [];', '')
c = c.replace('h.slug', 'h.id')

with open('components/cityos/CityStayList.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
