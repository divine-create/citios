'use server';

import { db } from '@/src/prisma/db';

export async function searchCityExplore(citySlug: string, query: string, cat: string) {
  const city = await db.orm.public.City.where({ slug: citySlug }).first();
  if (!city) {
    return { organizations: [], products: [] };
  }

  // Find organizations in the city
  const orgs = await db.orm.public.Organization.where({ cityId: city.id }).all();
  
  const q = query.trim().toLowerCase();
  
  const filteredOrgs = orgs.filter((org) => {
    // Determine category based on 'type' or map it
    const orgType = org.type || 'Unknown';
    // If we want exact category match or "All"
    const inCat = cat === 'All' || orgType.toLowerCase() === cat.toLowerCase();
    
    const inQ = !q || 
      org.name.toLowerCase().includes(q) || 
      (org.description || '').toLowerCase().includes(q) ||
      (org.address || '').toLowerCase().includes(q);
      
    return inCat && inQ;
  });
  
  // Find products matching query in the city
  const cityOrgIds = orgs.map(o => o.id);
  
  let products: any[] = [];
  if (cityOrgIds.length > 0) {
    // @ts-ignore
    const allProducts = await db.orm.public.RetailProduct.where({ organizationId: { in: cityOrgIds } }).all();
    products = allProducts.filter((p: any) => {
      const biz = orgs.find((o) => o.id === p.organizationId);
      if (!biz) return false;
      const bizType = biz.type || 'Unknown';
      
      const inCat = cat === 'All' || bizType.toLowerCase() === cat.toLowerCase();
      const inQ = !q || 
        p.name.toLowerCase().includes(q) || 
        (p.description || '').toLowerCase().includes(q) ||
        biz.name.toLowerCase().includes(q);
        
      return inCat && inQ;
    }).slice(0, 6);
  }
  
  return { 
    organizations: filteredOrgs.map(o => ({
      slug: o.id,
      name: o.name,
      type: o.type,
      category: o.type || 'Business',
      area: o.address || 'Calabar',
      description: o.description,
      tagline: o.description || 'Local business in Calabar',
      rating: 4.8,
      isOpen: true,
      deliveryEta: 15,
      cover: undefined
    })), 
    products: products.map(p => {
      const biz = orgs.find(o => o.id === p.organizationId);
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        description: p.description,
        bizSlug: p.organizationId,
        bizName: biz?.name,
        image: undefined
      };
    })
  };
}
