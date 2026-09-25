import sys

with open('components/restaurantos/management/MenuManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { toggleMenuItemAvailability } from '@/lib/actions/restaurantos';", "import { toggleMenuItemAvailability, createMenuItem } from '@/lib/actions/restaurantos';\nimport { toast } from 'sonner';")

with open('components/restaurantos/management/MenuManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
