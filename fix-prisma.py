import sys

with open('lib/actions/restaurantos.ts', 'r', encoding='utf-8') as f:
    code = f.read()

bad_where = "const opts = await db.orm.public.ModifierOption.where({ id: { in: item.modifierOptionIds } }).all();"
good_where = """const opts = [];
            for (const id of item.modifierOptionIds) {
               const o = await db.orm.public.ModifierOption.where({ id }).all().first();
               if (o) opts.push(o);
            }"""

code = code.replace(bad_where, good_where)

with open('lib/actions/restaurantos.ts', 'w', encoding='utf-8') as f:
    f.write(code)
print("Fixed Prisma Next IN array issue!")
