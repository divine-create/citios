import re

with open('rewrite_menu.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the python script itself
content = content.replace("className={inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide }", '''className={inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide }''')
content = content.replace("Price (,)", "Price (₦)")

with open('rewrite_menu_fixed.py', 'w', encoding='utf-8') as f:
    f.write(content)
