import sys

with open('lib/hotelos-concurrency.test.ts', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
    "assert.match(code, /await requireMembership[\\\\s\\\\S]*getFolio/, 'getFolio must authorize');",
    "assert.match(code, /getFolio[\\\\s\\\\S]*await requireMembership/, 'getFolio must authorize');"
)

with open('lib/hotelos-concurrency.test.ts', 'w', encoding='utf-8') as f:
    f.write(c)
