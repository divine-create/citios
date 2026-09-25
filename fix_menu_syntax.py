import re

with open('components/restaurantos/management/MenuManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix className
content = re.sub(
    r'className=\{inline-flex items-center px-2\.5 py-0\.5 rounded-full text-\[11px\] font-black uppercase tracking-wide \}',
    'className={inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide }',
    content
)

# Fix 86'd
content = re.sub(
    r"\{item\.isAvailable \? 'Available' : '86'd'\}",
    '''{item.isAvailable ? "Available" : "86'd"}''',
    content
)

with open('components/restaurantos/management/MenuManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
