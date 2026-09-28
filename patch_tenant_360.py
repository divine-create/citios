import os
f = 'app/(hq)/hq/tenants/[id]/page.tsx'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

# I want to add a link to the Master Ledger scoped to this organization.
# And a link to inspect the wallet.
c = c.replace('<p className="text-sm text-slate-400">Ledger details omitted in snapshot</p>', 
'''{data.wallets.length > 0 ? data.wallets.map((w: any) => (
                  <div key={w.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div>
                      <p className="text-lg font-black text-white">{w.balance.toLocaleString()} {w.currency}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">{w.id}</p>
                    </div>
                    <Link href={`/hq/ledger/wallets/${w.id}`}>
                      <button className="text-xs font-bold text-blue-400 hover:underline">Inspect</button>
                    </Link>
                  </div>
                )) : <p className="text-sm text-slate-500">No wallets provisioned.</p>}
                <Link href={`/hq/ledger?org=${org.id}`} className="inline-block mt-4 text-xs font-bold text-blue-400 hover:underline">View full ledger history &rarr;</Link>
''')

with open(f, 'w', encoding='utf-8') as file:
    file.write(c)

