import os
f = 'app/(hq)/hq/users/[id]/page.tsx'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

c = c.replace("import { Users, Mail, Phone, Building, Wallet, ShieldAlert, ArrowLeft, Activity, Shield } from 'lucide-react';", 
              "import { Users, Mail, Phone, Building, Wallet, ShieldAlert, ArrowLeft, ArrowRight, Activity, Shield } from 'lucide-react';")

with open(f, 'w', encoding='utf-8') as file:
    file.write(c)
