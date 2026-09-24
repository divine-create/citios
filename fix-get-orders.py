import sys

overview = 'app/(resident)/workspaces/restaurantos/[slug]/management/overview/page.tsx'
with open(overview, 'r', encoding='utf-8') as f:
    code = f.read()
code = code.replace("getOrders(slug, 50)", "getOrders(slug, { limit: 50 })")
with open(overview, 'w', encoding='utf-8') as f:
    f.write(code)
print("Fixed getOrders limit argument!")
