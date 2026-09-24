with open('components/cityos/workspaces/RestaurantOSWorkspace.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '{ label: "Kitchen Prep & Batches", icon: Flame },',
    '{ label: "Kitchen Prep & Batches", icon: Flame, href: `/workspaces/restaurantos/${slug}/management/production` },'
)

with open('components/cityos/workspaces/RestaurantOSWorkspace.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done patching')
