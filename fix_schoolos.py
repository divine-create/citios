import sys

with open('components/cityos/workspaces/SchoolOSWorkspace.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
'''              <a
                href={/org/}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-white text-[11px] font-black hover:bg-white/20 transition-colors"
              >
                View Public Profile
              </a>''',
'''              <a
                href={/org/}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-white text-[11px] font-black hover:bg-white/20 transition-colors"
              >
                View Public Profile
              </a>
              <a
                href={/school/admin}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 text-teal-950 text-[11px] font-black hover:bg-teal-400 transition-colors"
              >
                Open Admin Portal
              </a>'''
)

with open('components/cityos/workspaces/SchoolOSWorkspace.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
