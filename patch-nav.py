with open('components/cityos/workspaces/RestaurantOSWorkspace.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '{ label: "Dashboard", icon: LayoutDashboard }',
    '{ label: "Dashboard", icon: LayoutDashboard, href: `/workspaces/restaurantos/${slug}/management/overview` }'
)

content = content.replace(
    '{ label: "Menu Items", icon: UtensilsCrossed }',
    '{ label: "Menu Items", icon: UtensilsCrossed, href: `/workspaces/restaurantos/${slug}/management/menu` },\n        { label: "Modifiers", icon: LayoutDashboard, href: `/workspaces/restaurantos/${slug}/management/modifiers` },\n        { label: "Food Costing", icon: TrendingUp, href: `/workspaces/restaurantos/${slug}/management/costing` }'
)

content = content.replace(
    '{ label: "Recipes", icon: ClipboardList }',
    '{ label: "Recipes", icon: ClipboardList, href: `/workspaces/restaurantos/${slug}/management/recipes` }'
)

content = content.replace(
    '{ label: "Settings", icon: SettingsIcon }',
    '{ label: "Capabilities", icon: SettingsIcon, href: `/workspaces/restaurantos/${slug}/management/capabilities` }'
)

with open('components/cityos/workspaces/RestaurantOSWorkspace.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done patching')
