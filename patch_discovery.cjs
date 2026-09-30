const fs = require('fs');

let code = fs.readFileSync('lib/voice/tools/impl/discovery.ts', 'utf8');

code += `
export const searchFoodItems: VoiceToolDefinition = {
  name: 'search_food_items',
  description: 'Search for specific food or menu items across CityFood restaurants.',
  domain: 'commerce',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: false,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "The food item name" }
    },
    required: ["query"]
  },
  execute: async (args, session) => {
    const query = typeof args.query === 'string' ? args.query.toLowerCase() : '';
    const res = await getCityFood();
    
    const filtered = query ? res.menuItems.filter((m: any) => 
      m.name.toLowerCase().includes(query) || 
      (m.description || '').toLowerCase().includes(query)
    ) : res.menuItems;

    const data = filtered.slice(0, 5).map((m: any) => ({
      id: m.id,
      name: m.name,
      price: m.price,
      description: m.description
    }));

    if (data.length > 0 && session.user?.personId) {
      await pushRecentEntity(session.user.personId as string, {
        type: 'PRODUCT',
        id: data[0].id,
        label: data[0].name
      });
    }

    return { ok: true, data };
  }
};
`;

fs.writeFileSync('lib/voice/tools/impl/discovery.ts', code);
