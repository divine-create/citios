import sys

with open('components/cityos/CitySchoolsList.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('export default function CitySchoolsList() {', 'export default function CitySchoolsList({ schools = [] }: { schools?: any[] }) {')
c = c.replace('''      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white">
          <p className="text-[13px] font-black text-ink">No schools listed</p>
          <p className="text-[11px] text-slate-400 font-medium mt-1">School directory data has not been added yet.</p>
        </div>
      </div>''', '''      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {schools.map(s => (
          <Link key={s.id} href={/schools/} className="bg-white rounded-2xl border border-slate-200 p-5 block hover:border-slate-300 transition-colors">
            <h2 className="font-black text-ink">{s.name}</h2>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{s.description}</p>
          </Link>
        ))}
        {schools.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white">
            <p className="text-[13px] font-black text-ink">No schools listed</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">School directory data has not been added yet.</p>
          </div>
        )}
      </div>''')

with open('components/cityos/CitySchoolsList.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
