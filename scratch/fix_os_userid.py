with open('lib/actions/schoolos.ts', 'r', encoding='utf-8') as f:
    sc_content = f.read()
sc_content = sc_content.replace('session.user.userId', 'session.user.personId')
with open('lib/actions/schoolos.ts', 'w', encoding='utf-8') as f:
    f.write(sc_content)

with open('lib/actions/shopos.ts', 'r', encoding='utf-8') as f:
    sh_content = f.read()
sh_content = sh_content.replace('session.user.userId', 'session.user.personId')
with open('lib/actions/shopos.ts', 'w', encoding='utf-8') as f:
    f.write(sh_content)

print("Fixed schoolos and shopos userId")
