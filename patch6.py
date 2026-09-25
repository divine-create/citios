import sys

with open('components/restaurantos/management/MenuManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''                <td className="px-6 py-4">
                  <p className="font-bold text-slate-900">{item.name}</p>
                  {item.description && <p className="text-xs text-slate-500 truncate max-w-[200px]">{item.description}</p>}
                </td>'''

replacement = '''                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0 ring-1 ring-black/5 bg-slate-100" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 ring-1 ring-black/5 shrink-0" />
                    )}
                    <div>
                      <p className="font-bold text-slate-900">{item.name}</p>
                      {item.description && <p className="text-xs text-slate-500 truncate max-w-[200px]">{item.description}</p>}
                    </div>
                  </div>
                </td>'''

content = content.replace(target, replacement)

with open('components/restaurantos/management/MenuManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
