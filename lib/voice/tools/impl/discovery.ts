import { VoiceToolDefinition } from '../../core/policy';
import { pushRecentEntity } from '../../core/context';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function getQueryEmbedding(query: string): Promise<number[]> {
  const result = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: [query]
  });
  const vector = result.embeddings?.[0]?.values;
  return vector ? vector.slice(0, 768) : new Array(768).fill(0);
}

// Helper to extract citySlug
export async function getResidentCitySlug(session: any): Promise<string | undefined> {
  if (!session?.user?.personId) return undefined;
  const { db } = await import('@/src/prisma/db');
  const person = await db.orm.public.Person.where({ id: session.user.personId }).first();
  if (person?.homeCityId) {
    const city = await db.orm.public.City.where({ id: person.homeCityId }).first();
    if (city) return city.slug;
  }
  return undefined;
}

export const searchCity: VoiceToolDefinition = {
  name: 'discovery.search', aliases: ['search_city'],
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
      limit: { type: "number", description: "Optional number of results to return (default 5, max 10)" },
      category: { type: "string", description: "Optional category. Allowed values: GOVERNMENT, SCHOOL, HEALTHCARE, RETAIL, RESTAURANT, REAL_ESTATE, SERVICES, LOGISTICS, HOTEL, EVENT_ORGANIZER, PUBLISHER, PHARMACY" }
    },
    required: ["query"]
  },
  execute: async (args, session) => {
    const { db } = await import('@/src/prisma/db');
    let query = (args.query || '').trim();
    const limit = Math.min(typeof args.limit === 'number' ? args.limit : 5, 10);
    
    let orgs;
    if (query.length > 2) {
      const qVec = await getQueryEmbedding(query);
      orgs = await db.orm.public.Organization
        .orderBy((f) => f.embedding.cosineDistance(qVec).asc())
        .limit(limit)
        .all();
    } else {
      orgs = await db.orm.public.Organization.limit(limit).all();
    }
    
    const combined = orgs.map((o: any) => ({ type: 'Org', name: o.name, desc: o.description }));
    return { ok: true, data: combined };
  }
};

export const searchProducts: VoiceToolDefinition = {
  name: 'commerce.search_products', aliases: ['search_products'],
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
    const { db } = await import('@/src/prisma/db');
    let query = typeof args.query === 'string' ? args.query.trim() : '';
    const limit = 5;
    
    let products;
    if (query.length > 2) {
      const qVec = await getQueryEmbedding(query);
      products = await db.orm.public.RetailProduct
        .where(f => f.stockQuantity.gt(0)) // out-of-sale handling
        .orderBy((f) => f.embedding.cosineDistance(qVec).asc())
        .limit(limit)
        .include('organization')
        .all();
    } else {
      products = await db.orm.public.RetailProduct
        .where(f => f.stockQuantity.gt(0))
        .limit(limit)
        .include('organization')
        .all();
    }

    const data = products.map((p: any) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      storeName: p.organization?.name || 'Unknown',
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
  name: 'discovery.search_businesses', aliases: ['search_businesses'],
  description: 'Search for CityOS businesses or merchants.',
  domain: 'discovery',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: false,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "The name or type of business" },
      limit: { type: "number", description: "Optional number of results to return (default 5, max 10)" }
    },
    required: ["query"]
  },
  execute: async (args, session) => {
    const { db } = await import('@/src/prisma/db');
    let query = typeof args.query === 'string' ? args.query.trim() : '';
    const limit = Math.min(typeof args.limit === "number" ? args.limit : 5, 10);
    
    let stores;
    if (query.length > 2) {
      const qVec = await getQueryEmbedding(query);
      stores = await db.orm.public.Organization
        .where(f => f.type.eq('RETAIL'))
        .orderBy((f) => f.embedding.cosineDistance(qVec).asc())
        .limit(limit)
        .all();
    } else {
      stores = await db.orm.public.Organization
        .where(f => f.type.eq('RETAIL'))
        .limit(limit)
        .all();
    }

    return { ok: true, data: stores.map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      type: s.type
    })) };
  }
};

export const searchRestaurants: VoiceToolDefinition = {
  name: 'restaurants.search', aliases: ['search_restaurants'],
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
    const { db } = await import('@/src/prisma/db');
    let query = typeof args.query === 'string' ? args.query.trim() : '';
    const limit = 5;
    
    let restaurants;
    if (query.length > 2) {
      const qVec = await getQueryEmbedding(query);
      restaurants = await db.orm.public.Organization
        .where(f => f.type.eq('RESTAURANT'))
        .orderBy((f) => f.embedding.cosineDistance(qVec).asc())
        .limit(limit)
        .all();
    } else {
      restaurants = await db.orm.public.Organization
        .where(f => f.type.eq('RESTAURANT'))
        .limit(limit)
        .all();
    }

    const data = restaurants.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      deliveryEta: r.deliveryEta,
      isOpen: r.isOpen
    }));

    return { ok: true, data };
  }
};

export const searchFoodItems: VoiceToolDefinition = {
  name: 'restaurants.get_menu', aliases: ['search_food_items'],
  description: 'Search for specific food, OR fetch the menu for a specific restaurant (e.g. query: "City Burgers menu").',
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
    const { db } = await import('@/src/prisma/db');
    let query = typeof args.query === 'string' ? args.query.trim() : '';
    const limit = 10;
    
    let menuItems;
    if (query.length > 2) {
      const qVec = await getQueryEmbedding(query);
      menuItems = await db.orm.public.MenuItem
        .where(f => f.isAvailable.eq(true)) // out-of-sale handling
        .orderBy((f) => f.embedding.cosineDistance(qVec).asc())
        .limit(limit)
        .include('organization')
        .all();
    } else {
      menuItems = await db.orm.public.MenuItem
        .where(f => f.isAvailable.eq(true))
        .limit(limit)
        .include('organization')
        .all();
    }

    const data = menuItems.map((m: any) => ({
      id: m.id,
      name: m.name,
      price: m.price,
      description: m.description,
      restaurantName: m.organization?.name || 'Unknown'
    }));

    if (data.length > 0 && session.user?.personId) {
      // Push ALL results so the LLM can correctly reference any item by name → ID
      for (const item of data) {
        await pushRecentEntity(session.user.personId as string, {
          type: 'PRODUCT',
          id: item.id,
          label: item.name
        });
      }
    }

    return { ok: true, data };
  }
};
