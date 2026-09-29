import { VoiceToolDefinition } from '../../core/policy';
import { searchCityExplore } from '@/app/actions/explore';
import { getCityMartProducts, getCityMartStores } from '@/app/actions/commerce';
import { getCityFood } from '@/app/actions/food';
import { pushRecentEntity } from '../../core/context';

export const searchCity: VoiceToolDefinition = {
  name: 'search_city',
  description: 'Search across CityOS discovery to find organizations, services, or local places.',
  domain: 'discovery',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: false,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "The search term" },
      category: { type: "string", description: "Optional category" }
    },
    required: ["query"]
  },
  execute: async (args, session) => {
    // searchCityExplore signature: (citySlug: string | undefined, query: string, cat: string)
    const res = await searchCityExplore(undefined, args.query || '', 'All');
    
    // Combine organizations and products up to 5 items
    const combined = [
      ...res.organizations.map((o: any) => ({ type: 'Org', name: o.name, desc: o.description })),
      ...res.products.map((p: any) => ({ type: 'Product', name: p.name, desc: p.storeName }))
    ];
    
    return { ok: true, data: combined.slice(0, 5) };
  }
};

export const searchProducts: VoiceToolDefinition = {
  name: 'search_products',
  description: 'Discover actual CityMart/ShopOS products like groceries, electronics, and goods.',
  domain: 'commerce',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: false,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "The product name to search for" },
      category: { type: "string", description: "Optional category of product" }
    },
    required: ["query"]
  },
  execute: async (args, session) => {
    const query = typeof args.query === 'string' ? args.query.toLowerCase() : '';
    const cat = typeof args.category === 'string' ? args.category : 'All';
    const products = await getCityMartProducts(undefined, cat);
    
    const filtered = query ? products.filter((p: any) => 
      p.name.toLowerCase().includes(query) || 
      (p.description || '').toLowerCase().includes(query)
    ) : products;

    const data = filtered.slice(0, 5).map((p: any) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      storeName: p.storeName,
      category: p.globalCategory
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

export const searchBusinesses: VoiceToolDefinition = {
  name: 'search_businesses',
  description: 'Search for CityOS businesses or merchants.',
  domain: 'discovery',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: false,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "The name or type of business" }
    },
    required: ["query"]
  },
  execute: async (args, session) => {
    const query = typeof args.query === 'string' ? args.query.toLowerCase() : '';
    const stores = await getCityMartStores();
    const filtered = query ? stores.filter((s: any) => 
      s.name.toLowerCase().includes(query) || 
      (s.description || '').toLowerCase().includes(query)
    ) : stores;

    return { ok: true, data: filtered.slice(0, 5).map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      type: s.type
    })) };
  }
};

export const searchRestaurants: VoiceToolDefinition = {
  name: 'search_restaurants',
  description: 'Search for restaurants in CityFood.',
  domain: 'commerce',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: false,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "The restaurant name, cuisine, or food item to search for" }
    },
    required: ["query"]
  },
  execute: async (args, session) => {
    const query = typeof args.query === 'string' ? args.query.toLowerCase() : '';
    const res = await getCityFood();
    
    const filtered = query ? res.restaurants.filter((r: any) => 
      r.name.toLowerCase().includes(query) || 
      (r.description || '').toLowerCase().includes(query)
    ) : res.restaurants;

    const data = filtered.slice(0, 5).map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      deliveryEta: r.deliveryEta,
      isOpen: r.isOpen
    }));

    return { ok: true, data };
  }
};
