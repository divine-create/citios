import os
f = 'app/(hq)/hq/users/[id]/page.tsx'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

c = c.replace('''<div key={w.id} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                  <div>
                    <p className="text-sm font-bold text-white">Personal Wallet</p>
                  </div>
                  <p className="text-sm font-mono text-slate-300 font-bold">{w.balance.toFixed(2)}</p>
                </div>''', '''<div key={w.id} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                  <div>
                    <p className="text-sm font-bold text-white">Personal Wallet</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{w.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-slate-300 font-bold">{w.balance.toLocaleString()} {w.currency}</p>
                    <Link href={`/hq/ledger/wallets/${w.id}`} className="text-[10px] font-bold text-blue-400 hover:underline">Inspect Wallet</Link>
                  </div>
                </div>''')

with open(f, 'w', encoding='utf-8') as file:
    file.write(c)

