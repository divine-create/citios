import os

f = 'app/(hq)/layout.tsx'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

c = c.replace(
    '<Link href="/hq/users" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-sm font-medium text-slate-300 hover:text-white transition-colors">\n            <Users className="w-4 h-4" /> Citizens & Users\n          </Link>',
    '<Link href="/hq/users" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-sm font-medium text-slate-300 hover:text-white transition-colors">\n            <Users className="w-4 h-4" /> Citizens & Users\n          </Link>\n          <Link href="/hq/activity" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-sm font-medium text-slate-300 hover:text-white transition-colors">\n            <ShieldAlert className="w-4 h-4" /> Governance Audit\n          </Link>'
)

with open(f, 'w', encoding='utf-8') as file:
    file.write(c)
