import sys

with open('components/cityos/CityStayList.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('h.image', 'h.storeCoverImage')
c = c.replace('h.pricePerNight < 10000', 'false')
c = c.replace('h.tags[0]', 'h.storeCategory')
c = c.replace('h.nearStadium', 'false')
c = c.replace('h.area', 'h.description || "City Center"')
c = c.replace('h.rating', '5')
c = c.replace('h.tagline', 'h.description')
c = c.replace('fmt(h.pricePerNight)', 'fmt(0)')
c = c.replace('h.open24', 'true')

with open('components/cityos/CityStayList.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
