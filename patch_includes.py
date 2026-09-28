import os
import re

f = 'lib/actions/hq-ledger.ts'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

c = c.replace(".include((inc: any) => ({\n      wallet: inc.wallet.include((w: any) => ({\n        organization: w.organization,\n      })),\n      transaction: inc.transaction.include((t: any) => ({\n        payment: t.payment\n      }))\n    }))",
              ".include('wallet', (w: any) => w.include('organization', 'person')).include('transaction', (t: any) => t.include('payment'))")

c = c.replace(".include((inc: any) => ({\n      entries: inc.entries.include((e: any) => ({\n        wallet: e.wallet.include((w: any) => ({\n          organization: w.organization,\n          person: w.person\n        }))\n      })),\n      payment: inc.payment.include((p: any) => ({\n        refunds: p.refunds,\n        events: p.events,\n        retailOrder: p.retailOrder,\n        restaurantOrder: p.restaurantOrder\n      }))\n    }))",
              ".include('entries', (e: any) => e.include('wallet', (w: any) => w.include('organization', 'person'))).include('payment', (p: any) => p.include('refunds', 'events', 'retailOrder', 'restaurantOrder'))")

c = c.replace(".include((inc: any) => ({\n      organization: inc.organization,\n      person: inc.person\n    }))",
              ".include('organization', 'person')")

c = c.replace(".include((inc: any) => ({\n      transaction: inc.transaction.include((t: any) => ({\n         payment: t.payment\n      }))\n    }))",
              ".include('transaction', (t: any) => t.include('payment'))")

c = c.replace("import { toInstant } from '@internal/postgres/contract-builder';", "")

with open(f, 'w', encoding='utf-8') as file:
    file.write(c)

f2 = 'lib/actions/hq.ts'
with open(f2, 'r', encoding='utf-8') as file:
    c2 = file.read()

c2 = c2.replace(".include((inc) => ({ transaction: inc.transaction }))", ".include('transaction')")

with open(f2, 'w', encoding='utf-8') as file:
    file.write(c2)

