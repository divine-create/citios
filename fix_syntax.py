import sys

with open('components/restaurantos/management/GeneralSettings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target1 = '''className={w-12 h-6 rounded-full transition-colors relative }'''
replacement1 = 'className={w-12 h-6 rounded-full transition-colors relative }'

target2 = '''className={w-4 h-4 bg-white rounded-full absolute top-1 transition-transform }'''
replacement2 = 'className={w-4 h-4 bg-white rounded-full absolute top-1 transition-transform }'

content = content.replace(target1, replacement1).replace(target2, replacement2)

with open('components/restaurantos/management/GeneralSettings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
