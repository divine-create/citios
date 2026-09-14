'use server'

import { db } from '@/src/prisma/db'

function toInstant(date: Date) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

const MAX_ASSET_BYTES = 5 * 1024 * 1024; // 5MB — self-hosted as base64 text, keep it sane

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// ---------------------------------------------------------------------
// Microsite: read
// ---------------------------------------------------------------------

export async function getMicrosite(organizationId: string) {
  try {
    const microsite = await db.orm.public.Microsite.where({ organizationId }).all().first();
    if (!microsite) return null;
    const pages = await db.orm.public.MicrositePage.where({ micrositeId: microsite.id }).all();
    const navItemsRaw = await db.orm.public.MicrositeNavigationItem.where({ micrositeId: microsite.id }).all();
    const navItems = navItemsRaw.map(n => ({
      ...n,
      page: n.pageId ? pages.find(p => p.id === n.pageId) || null : null
    }));
    const sections = await db.orm.public.MicrositeSection.where({ micrositeId: microsite.id }).all();
    sections.sort((a, b) => a.order - b.order);

    const rawProducts = await db.orm.public.RetailProduct.where({ organizationId }).all();
    const categories = await db.orm.public.RetailCategory.where({ organizationId }).all();
    const products = rawProducts.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      categoryId: p.categoryId,
      categoryName: categories.find((c) => c.id === p.categoryId)?.name ?? null,
      isWeighed: p.isWeighed,
      unit: p.unit,
      stockQuantity: p.stockQuantity,
      imageAssetId: p.imageAssetId,
    }));

    return JSON.parse(JSON.stringify({ ...microsite, pages, navItems, sections, products }));
  } catch (error) {
    console.error('Error fetching microsite:', error);
    return null;
  }
}

export async function getOrganizationType(organizationId: string) {
  try {
    const org = await db.orm.public.Organization.where({ id: organizationId }).all().first();
    return org?.type || null;
  } catch (error) {
    console.error('Error fetching organization type:', error);
    return null;
  }
}

export async function getOrganizationName(organizationId: string) {
  try {
    const org = await db.orm.public.Organization.where({ id: organizationId }).all().first();
    return org?.name || null;
  } catch (error) {
    console.error('Error fetching organization name:', error);
    return null;
  }
}

// Public read for the rendered site — only ever returns a published site.
// Also includes the org's live Retail catalog (empty arrays for non-retail
// orgs) so a `retail-products` section can render real prices/stock instead
// of static copy — cheap to always fetch, and keeps the renderer in sync
// with Products & Inventory with no extra round trip.
export async function getMicrositeBySlug(slug: string, path: string[] = []) {
  try {
    const microsite = await db.orm.public.Microsite.where({ slug }).all().first();
    if (!microsite || microsite.status !== 'published') return null;
    
    // Find the requested page
    let pagePath = path.length > 0 ? path.join('/') : 'home';
    const pages = await db.orm.public.MicrositePage.where({ micrositeId: microsite.id }).all();
    
    // Fallback logic
    let page = pages.find(p => p.slug === pagePath);
    if (!page && path.length === 0) {
      page = pages.find(p => p.isHome) || pages[0];
    }
    
    if (!page || page.status !== 'published') return null;
    
    const organization = await db.orm.public.Organization.where({ id: microsite.organizationId }).all().first();
    const sections = (await db.orm.public.MicrositeSection.where({ pageId: page.id }).all())
      .filter((s) => s.visible)
      .sort((a, b) => a.order - b.order);

    const navItemsRaw = await db.orm.public.MicrositeNavigationItem.where({ micrositeId: microsite.id }).all();
    const navItems = navItemsRaw.map(n => ({
      ...n,
      page: n.pageId ? pages.find(p => p.id === n.pageId) || null : null
    })).sort((a, b) => a.order - b.order);

    const rawProducts = await db.orm.public.RetailProduct.where({ organizationId: microsite.organizationId }).all();
    const categories = await db.orm.public.RetailCategory.where({ organizationId: microsite.organizationId }).all();
    const products = rawProducts.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      categoryId: p.categoryId,
      categoryName: categories.find((c) => c.id === p.categoryId)?.name ?? null,
      isWeighed: p.isWeighed,
      unit: p.unit,
      stockQuantity: p.stockQuantity,
      imageAssetId: p.imageAssetId,
    }));

    const rawRooms = await db.orm.public.HotelRoom.where({ organizationId: microsite.organizationId }).all();
    const hotelRooms = Array.from(new Set(rawRooms.map(r => JSON.stringify({ type: r.type, rate: r.baseRate })))).map(s => JSON.parse(s));

    return JSON.parse(JSON.stringify({ 
      ...microsite, 
      organizationName: organization?.name ?? '',
      page,
      sections, 
      navItems,
      products, 
      categories,
      hotelRooms,
      organization 
    }));
  } catch (error) {
    console.error('Error fetching microsite page:', error);
    return null;
  }
}

export async function isSlugAvailable(slug: string, excludeOrganizationId?: string) {
  try {
    const existing = await db.orm.public.Microsite.where({ slug }).all().first();
    if (!existing) return true;
    return excludeOrganizationId ? existing.organizationId === excludeOrganizationId : false;
  } catch (error) {
    console.error('Error checking slug availability:', error);
    return false;
  }
}

// ---------------------------------------------------------------------
// Microsite: write
// ---------------------------------------------------------------------

export async function createMicrosite(organizationId: string, input: { title: string; slug?: string; templateId?: string; features?: string[]; customContent?: Record<string, any> }) {
  try {
    const existing = await db.orm.public.Microsite.where({ organizationId }).all().first();
    if (existing) return { error: 'This organization already has a website.' };

    const baseSlug = slugify(input.slug || input.title);
    if (!baseSlug) return { error: 'Could not derive a valid slug from that title - try a different one.' };

    let slug = baseSlug;
    let suffix = 1;
    while (await db.orm.public.Microsite.where({ slug }).all().first()) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const org = await db.orm.public.Organization.where({ id: organizationId }).all().first();
    const orgType = org?.type;

    let theme = 'minimal';
    if (input.templateId === 'luxury-resort') theme = 'horizon';
    else if (input.templateId === 'city-boutique') theme = 'minimal';
    else if (input.templateId === 'prep-academy' || input.templateId === 'scholastic') theme = 'scholastic';
    else if (input.templateId === 'modern-college' || input.templateId === 'innovator') theme = 'innovator';
    else if (input.templateId === 'playful') theme = 'playful';
    else if (input.templateId === 'modern-apparel') theme = 'editorial';
    else if (input.templateId === 'local-market') theme = 'warm';
    else if (orgType === 'HOTEL') theme = 'horizon';
    else if (orgType === 'SCHOOL') theme = 'scholastic';

    // Fetch dynamic defaults for professional look out-of-the-box
    let defaultPhone = "";
    let defaultEmail = "";
    let defaultAddress = "";
    let defaultHeadName = "Administration";
    let defaultLogo = null;

    if (orgType === 'SCHOOL') {
      const settings = await db.orm.public.SchoolSettings.where({ organizationId }).all().first();
      if (settings) {
        if (settings.phone) defaultPhone = settings.phone;
        if (settings.email) defaultEmail = settings.email;
        if (settings.logo) defaultLogo = settings.logo;
        let addrParts = [];
        if (settings.address) addrParts.push(settings.address);
        if (settings.lga) addrParts.push(settings.lga);
        if (settings.state) addrParts.push(settings.state);
        if (addrParts.length > 0) defaultAddress = addrParts.join(", ");
      }
      
      const ownerMember = await db.orm.public.OrganizationMember.where({ organizationId, role: 'OWNER' }).all().first();
      if (ownerMember) {
        const ownerUser = await db.orm.public.User.where({ id: ownerMember.userId }).all().first();
        if (ownerUser?.name) defaultHeadName = ownerUser.name;
      }
    }

    const microsite = await db.orm.public.Microsite.create({
      organizationId,
      slug,
      title: input.title,
      status: 'published',
      theme,
      logoAssetId: defaultLogo,
    });

    const defaultSections: { type: string, content: any }[] = [];
    
    if (orgType === 'HOTEL') {
      if (input.templateId === 'city-boutique') {
        // City Boutique (Minimal theme, urban/chic vibes, high contrast)
        defaultSections.push({ type: 'hero', content: { heading: input.title, subheading: "Urban elegance in the heart of the city.", ctaText: "Check Availability", ctaLink: "#hotel-booking", imageAssetId: "https://images.unsplash.com/photo-1518733057094-95b5ee1404c3?q=80&w=2000&auto=format&fit=crop" } });
        defaultSections.push({ type: 'hotel-booking', content: { heading: "Reservations", subtext: "Secure your stay in the city center." } });
        defaultSections.push({ type: 'hotel-feature', content: { heading: "Rooftop Lounge", subheading: "Skyline Views", body: "Sip artisan cocktails while taking in panoramic views of the downtown skyline.", imageAssetId: "https://images.unsplash.com/photo-1572364769167-198dcb7b520c?q=80&w=1200&auto=format&fit=crop", reverseLayout: false } });
        defaultSections.push({ type: 'hotel-rooms', content: { heading: "Our Lofts", items: [
          { name: "The Penthouse Loft", description: "Industrial chic meets modern luxury.", imageAssetId: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200&auto=format&fit=crop" },
          { name: "Urban Studio", description: "Perfect for the business traveler.", imageAssetId: "https://images.unsplash.com/photo-1536250325148-8d48858a3605?q=80&w=1200&auto=format&fit=crop" }
        ] } });
      } else {
        // Luxury Resort (Default)
        defaultSections.push({ type: 'hero', content: { heading: input.title, subheading: "Experience uncompromised luxury and unparalleled service at our exclusive property.", ctaText: "Reserve a Room", ctaLink: "#hotel-booking", imageAssetId: "https://images.unsplash.com/photo-1542314831-c6a4d14248cb?q=80&w=2000&auto=format&fit=crop" } });
        defaultSections.push({ type: 'hotel-rooms', content: { heading: "Rooms & Suites", items: [
          { name: "Oceanview Suite", description: "Spacious luxury with panoramic views of the sea, featuring a king-size bed and private balcony.", imageAssetId: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=1200&auto=format&fit=crop" },
          { name: "Deluxe King", description: "Modern elegance and comfort wrapped into a beautifully appointed space for ultimate relaxation.", imageAssetId: "https://images.unsplash.com/photo-1590490359683-658d3d23f972?q=80&w=1200&auto=format&fit=crop" }
        ] } });
        defaultSections.push({ type: 'hotel-amenities', content: { heading: "Premium Amenities", items: [{ name: "Tranquility Spa", description: "Rejuvenate your body and mind with our world-class treatments." }, { name: "Infinity Pool", description: "Swim overlooking the horizon in our temperature-controlled infinity pool." }] } });
        defaultSections.push({ type: 'hotel-feature', content: { heading: "Culinary Excellence", subheading: "Unforgettable Dining", body: "Savor a symphony of flavors crafted by our Michelin-starred chefs, set against the breathtaking backdrop of the ocean. Our signature restaurant offers an intimate and unforgettable gastronomic journey.", imageAssetId: "https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=1200&auto=format&fit=crop", reverseLayout: false } });
        defaultSections.push({ type: 'hotel-booking', content: { heading: "Book Your Stay", subtext: "Best rate guaranteed when you book direct." } });
      }
    } else if (orgType === 'SCHOOL') {
      if (input.features && input.features.length > 0) {
        const c = input.customContent || {};
        
        if (input.features.includes('hero')) {
           defaultSections.push({ type: 'hero', content: { heading: input.title, subheading: c.hero?.subheading || "A tradition of excellence. Inspiring minds.", ctaText: "Admissions", ctaLink: "#contact", imageAssetId: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2000&auto=format&fit=crop" } });
        }
        if (input.features.includes('welcome')) {
           defaultSections.push({ type: 'school-head-welcome', content: { heading: c.welcome?.heading || "Welcome from the Headmaster", body: c.welcome?.body || "At our academy, we believe in nurturing not just academic excellence, but character, leadership, and a lifelong love for learning.", signature: defaultHeadName, imageAssetId: "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1200&auto=format&fit=crop" } });
        }
        if (input.features.includes('mission')) {
           defaultSections.push({ type: 'hotel-amenities', content: { heading: "Our Core Values", items: c.mission || [
             { name: "Excellence", description: "Striving for the highest standards in all academic and personal endeavors." },
             { name: "Character", description: "Building integrity, empathy, and strong moral foundations." },
             { name: "Community", description: "Fostering a supportive, inclusive, and diverse environment." }
           ] } });
        }
        if (input.features.includes('curriculum')) {
           defaultSections.push({ type: 'school-curriculum', content: { heading: "Academic Divisions", items: c.curriculum || [
             { phase: "Early Years", description: "Play-based learning focusing on social and cognitive development." },
             { phase: "Primary School", description: "Building a strong foundation in core subjects with an emphasis on curiosity." },
             { phase: "Secondary School", description: "Rigorous coursework preparing students for higher education and leadership." }
           ] } });
        }
        if (input.features.includes('facilities')) {
           defaultSections.push({ type: 'hotel-feature', content: { heading: "World-Class Facilities", subheading: "Campus Life", body: c.facilities || "Our sprawling campus features state-of-the-art science laboratories, a comprehensive modern library, and professional-grade sports complexes designed to support holistic student development.", imageAssetId: "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=1200&auto=format&fit=crop", reverseLayout: false } }); 
        }
        if (input.features.includes('admissions')) {
           defaultSections.push({ type: 'school-admissions-timeline', content: { heading: "Admissions Process", steps: c.admissions || [
             { title: "Submit Application", description: "Complete the online application form and submit required documents." },
             { title: "Entrance Assessment", description: "Students will be invited for a grade-appropriate assessment." },
             { title: "Family Interview", description: "A brief conversation with our admissions team to ensure a mutual fit." }
           ] } });
        }
        if (input.features.includes('events')) {
           defaultSections.push({ type: 'hotel-booking', content: { heading: "Upcoming Events", subtext: "Stay tuned for our academic calendar." } }); // Reusing a simple CTA block as a placeholder for Events
        }
        if (input.features.includes('testimonials')) {
           defaultSections.push({ type: 'testimonials', content: { heading: "What Parents Say", items: c.testimonials || [
             { quote: "The teachers truly care about each student's personal growth and academic success.", author: "Parent of Grade 4 Student" },
             { quote: "The best decision we made for our children. The community here is incredible.", author: "Alumni Parent" }
           ] } });
        }
      } else {
        // Fallback for old templates
        if (input.templateId === 'prep-academy') {
          defaultSections.push({ type: 'hero', content: { heading: input.title, subheading: "A tradition of excellence. Inspiring minds since 1952.", ctaText: "Admissions", ctaLink: "#contact", imageAssetId: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2000&auto=format&fit=crop" } });
          defaultSections.push({ type: 'school-head-welcome', content: { heading: "Welcome from the Headmaster", body: "At our academy, we believe in nurturing not just academic excellence, but character, leadership, and a lifelong love for learning. Our historic campus provides the perfect environment for students to thrive.", signature: defaultHeadName } });
          defaultSections.push({ type: 'school-curriculum', content: { heading: "Academic Divisions", items: [
            { phase: "Lower School", description: "Building a strong foundation in core subjects with an emphasis on curiosity." },
            { phase: "Upper School", description: "Rigorous college-preparatory coursework including AP and Honors programs." }
          ] } });
        } else if (input.templateId === 'modern-college') {
          defaultSections.push({ type: 'hero', content: { heading: input.title, subheading: "Innovating the future. Your journey starts here.", ctaText: "Apply Now", ctaLink: "#contact", imageAssetId: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?q=80&w=2000&auto=format&fit=crop" } });
          defaultSections.push({ type: 'school-curriculum', content: { heading: "Featured Programs", items: [
            { phase: "School of Engineering", description: "Cutting-edge labs and industry partnerships." },
            { phase: "College of Arts", description: "Fostering creativity and critical thinking in a digital age." }
          ] } });
          defaultSections.push({ type: 'school-head-welcome', content: { heading: "President's Message", body: "We are committed to providing a dynamic, inclusive, and forward-thinking environment. Join us in shaping tomorrow.", signature: defaultHeadName } });
        } else {
          defaultSections.push({ type: 'hero', content: { heading: input.title, subheading: "Welcome to our institution.", ctaText: "Learn More", ctaLink: "#contact" } });
          defaultSections.push({ type: 'school-head-welcome', content: { heading: "Welcome", body: "We are thrilled to welcome you.", signature: defaultHeadName } });
        }
      }
    } else if (orgType === 'RETAIL') {
      if (input.templateId === 'modern-apparel') {
        defaultSections.push({ type: 'hero', content: { heading: input.title, subheading: "Elevate your everyday style.", ctaText: "Shop Collection", ctaLink: "#retail-products", imageAssetId: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=2000&auto=format&fit=crop" } });
        defaultSections.push({ type: 'retail-products', content: { heading: "New Arrivals", categoryId: "" } });
      } else if (input.templateId === 'local-grocery') {
        defaultSections.push({ type: 'hero', content: { heading: input.title, subheading: "Fresh, local, and delivered to your door.", ctaText: "Start Shopping", ctaLink: "#retail-products", imageAssetId: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=2000&auto=format&fit=crop" } });
        defaultSections.push({ type: 'retail-products', content: { heading: "Featured Produce", categoryId: "" } });
      } else {
        defaultSections.push({ type: 'hero', content: { heading: input.title, subheading: "Welcome to our store.", ctaText: "Shop Now", ctaLink: "#retail-products" } });
        defaultSections.push({ type: 'retail-products', content: { heading: "Our Products", categoryId: "" } });
      }
    } else {
      defaultSections.push({ type: 'hero', content: { heading: input.title, subheading: "Welcome to our website.", ctaText: "Contact Us", ctaLink: "#contact" } });
    }

    const pagesToCreate: { title: string, slug: string, isHome: boolean, sections: any[] }[] = [];

    if (orgType === 'SCHOOL' && input.features && input.features.length > 0) {
      // Hybrid setup: Home gets About/Academics. Admissions, Events and Contact get their own pages.
      const homeSections = [];
      const admissionsSections = [];
      const eventsSections = [];

      for (const sec of defaultSections) {
        if (sec.type === 'school-admissions-timeline') {
          admissionsSections.push(sec);
        } else if (sec.type === 'hotel-booking') { // Used as placeholder for Events
          eventsSections.push(sec);
        } else {
          // Everything else (Hero, Welcome, Mission, Curriculum, Facilities, Testimonials) goes to Home
          homeSections.push(sec);
        }
      }
      
      pagesToCreate.push({ title: "Home", slug: "home", isHome: true, sections: homeSections });
      
      if (admissionsSections.length > 0) {
        pagesToCreate.push({ title: "Admissions", slug: "admissions", isHome: false, sections: admissionsSections });
      }

      if (eventsSections.length > 0) {
        pagesToCreate.push({ title: "Events", slug: "events", isHome: false, sections: eventsSections });
      }
      
      // Always create a dedicated Contact page
      pagesToCreate.push({ title: "Contact", slug: "contact", isHome: false, sections: [{ type: 'contact', content: { heading: "Get in Touch", address: defaultAddress, phone: defaultPhone, email: defaultEmail } }] });
      
    } else {
      defaultSections.push({ type: 'contact', content: { heading: "Get in Touch", address: defaultAddress, phone: defaultPhone, email: defaultEmail } });
      pagesToCreate.push({ title: "Home", slug: "home", isHome: true, sections: defaultSections });
    }

    let navOrder = 0;
    for (const pageDef of pagesToCreate) {
      const page = await db.orm.public.MicrositePage.create({
        micrositeId: microsite.id,
        title: pageDef.title,
        slug: pageDef.slug,
        isHome: pageDef.isHome,
        status: "published",
      });

      for (let i = 0; i < pageDef.sections.length; i++) {
        await db.orm.public.MicrositeSection.create({
          micrositeId: microsite.id,
          pageId: page.id,
          type: pageDef.sections[i].type,
          order: i,
          visible: true,
          content: JSON.stringify(pageDef.sections[i].content),
        });
      }

      await db.orm.public.MicrositeNavigationItem.create({
        micrositeId: microsite.id,
        label: pageDef.title,
        pageId: page.id,
        order: navOrder++,
        isHidden: false,
      });
    }

    return { success: true, microsite: JSON.parse(JSON.stringify(microsite)) };
  } catch (error) {
    console.error('Error creating microsite:', error);
    return { error: 'Failed to create website.' };
  }
}

export async function updateMicrositeSettings(micrositeId: string, input: {
  title?: string;
  tagline?: string | null;
  slug?: string;
  theme?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  logoAssetId?: string | null;
  faviconAssetId?: string | null;
  primaryColor?: string;
  accentColor?: string;
  headingFont?: string;
  bodyFont?: string;
  borderRadius?: string;
}) {
  try {
    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.tagline !== undefined) data.tagline = input.tagline;
    if (input.theme !== undefined) data.theme = input.theme;
    if (input.seoTitle !== undefined) data.seoTitle = input.seoTitle;
    if (input.seoDescription !== undefined) data.seoDescription = input.seoDescription;
    if (input.logoAssetId !== undefined) data.logoAssetId = input.logoAssetId;
    if (input.faviconAssetId !== undefined) data.faviconAssetId = input.faviconAssetId;
    if (input.primaryColor !== undefined) data.primaryColor = input.primaryColor;
    if (input.accentColor !== undefined) data.accentColor = input.accentColor;
    if (input.headingFont !== undefined) data.headingFont = input.headingFont;
    if (input.bodyFont !== undefined) data.bodyFont = input.bodyFont;
    if (input.borderRadius !== undefined) data.borderRadius = input.borderRadius;

    if (input.slug !== undefined) {
      const slug = slugify(input.slug);
      if (!slug) return { error: 'Invalid slug.' };
      const existing = await db.orm.public.Microsite.where({ slug }).all().first();
      if (existing && existing.id !== micrositeId) return { error: 'That web address is already taken — try another.' };
      data.slug = slug;
    }

    await db.orm.public.Microsite.where({ id: micrositeId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating microsite settings:', error);
    return { error: 'Failed to save website settings.' };
  }
}

export async function publishMicrosite(micrositeId: string) {
  try {
    const sections = await db.orm.public.MicrositeSection.where({ micrositeId }).all();
    if (sections.filter((s) => s.visible).length === 0) {
      return { error: 'Add at least one visible section before publishing.' };
    }
    await db.orm.public.Microsite.where({ id: micrositeId }).update({ status: 'published', publishedAt: toInstant(new Date()) });
    return { success: true };
  } catch (error) {
    console.error('Error publishing microsite:', error);
    return { error: 'Failed to publish website.' };
  }
}

export async function unpublishMicrosite(micrositeId: string) {
  try {
    await db.orm.public.Microsite.where({ id: micrositeId }).update({ status: 'draft' });
    return { success: true };
  } catch (error) {
    console.error('Error unpublishing microsite:', error);
    return { error: 'Failed to unpublish website.' };
  }
}

// ---------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------

export async function addMicrositeSection(micrositeId: string, input: { pageId: string, type: string; content: Record<string, unknown> }) {
  try {
    const existing = await db.orm.public.MicrositeSection.where({ micrositeId, pageId: input.pageId }).all();
    const maxOrder = existing.reduce((max, s) => Math.max(max, s.order), -1);
    const section = await db.orm.public.MicrositeSection.create({
      micrositeId,
      pageId: input.pageId,
      type: input.type,
      order: maxOrder + 1,
      content: JSON.stringify(input.content),
    });
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/', 'layout');
    return { success: true, section: JSON.parse(JSON.stringify(section)) };
  } catch (error) {
    console.error('Error adding microsite section:', error);
    return { error: 'Failed to add section.' };
  }
}

export async function updateMicrositeSection(sectionId: string, input: { content?: Record<string, unknown>; visible?: boolean }) {
  try {
    const data: Record<string, unknown> = {};
    if (input.content !== undefined) data.content = JSON.stringify(input.content);
    if (input.visible !== undefined) data.visible = input.visible;
    await db.orm.public.MicrositeSection.where({ id: sectionId }).update(data);
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error updating microsite section:', error);
    return { error: 'Failed to update section.' };
  }
}

export async function deleteMicrositeSection(sectionId: string) {
  try {
    await db.orm.public.MicrositeSection.where({ id: sectionId }).delete();
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error deleting microsite section:', error);
    return { error: 'Failed to delete section.' };
  }
}

// Applies a full reordering in one call — `orderedIds` is the section id
// list in the desired display order (index becomes the new `order`).
export async function reorderMicrositeSections(micrositeId: string, orderedIds: string[]) {
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.orm.public.MicrositeSection.where({ id: orderedIds[i] }).update({ order: i });
    }
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error reordering microsite sections:', error);
    return { error: 'Failed to reorder sections.' };
  }
}

// ---------------------------------------------------------------------
// Assets (self-hosted, base64-in-Postgres — see contract.prisma note)
// ---------------------------------------------------------------------

export async function uploadAsset(organizationId: string, input: { fileName: string; mimeType: string; base64Data: string }) {
  try {
    if (!input.mimeType.startsWith('image/')) return { error: 'Only image uploads are supported.' };
    const approxBytes = Math.ceil((input.base64Data.length * 3) / 4);
    if (approxBytes > MAX_ASSET_BYTES) return { error: 'Image is too large — please use one under 5MB.' };

    const asset = await db.orm.public.Asset.create({
      organizationId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: approxBytes,
      data: input.base64Data,
    });
    return { success: true, assetId: asset.id };
  } catch (error) {
    console.error('Error uploading asset:', error);
    return { error: 'Failed to upload image.' };
  }
}

export async function deleteAsset(assetId: string) {
  try {
    await db.orm.public.Asset.where({ id: assetId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting asset:', error);
    return { error: 'Failed to delete image.' };
  }
}

export async function submitInquiry(micrositeId: string, name: string, email: string, message: string) {
  try {
    await db.orm.public.MicrositeInquiry.create({ micrositeId, name, email, message });
    return { success: true };
  } catch (error) {
    console.error('Error submitting inquiry:', error);
    return { error: 'Failed to send message.' };
  }
}

export async function getInquiries(organizationId: string) {
  try {
    const microsite = await db.orm.public.Microsite.where({ organizationId }).all().first();
    if (!microsite) return [];
    return await db.orm.public.MicrositeInquiry.where({ micrositeId: microsite.id }).all();
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    return [];
  }
}


// ---------------------------------------------------------------------
// Pages & Navigation
// ---------------------------------------------------------------------

export async function addMicrositePage(micrositeId: string, input: { title: string, slug: string }) {
  try {
    const slug = slugify(input.slug);
    const existing = await db.orm.public.MicrositePage.where({ micrositeId, slug }).all().first();
    if (existing) return { error: "A page with this slug already exists." };
    
    const page = await db.orm.public.MicrositePage.create({
      micrositeId,
      title: input.title,
      slug,
      status: "published"
    });

    // Auto-sync: automatically add a navigation item for this new page
    const existingNavs = await db.orm.public.MicrositeNavigationItem.where({ micrositeId }).all();
    await db.orm.public.MicrositeNavigationItem.create({
      micrositeId,
      label: input.title,
      pageId: page.id,
      order: existingNavs.length,
      isHidden: false,
    });
    
    return { success: true, page: JSON.parse(JSON.stringify(page)) };
  } catch (error) {
    console.error("Error adding page", error);
    return { error: "Failed to add page." };
  }
}

export async function updateMicrositePage(pageId: string, input: { title?: string, slug?: string, status?: string }) {
  try {
    const data: any = { ...input };
    if (input.slug) data.slug = slugify(input.slug);
    const page = await db.orm.public.MicrositePage.where({ id: pageId }).update(data);
    
    // Auto-sync: update the navigation label if the page title was changed
    if (input.title) {
      await db.orm.public.MicrositeNavigationItem.where({ pageId }).update({ label: input.title });
    }

    return { success: true, page: JSON.parse(JSON.stringify(page)) };
  } catch (error) {
    return { error: "Failed to update page." };
  }
}

export async function deleteMicrositePage(pageId: string) {
  try {
    const page = await db.orm.public.MicrositePage.where({ id: pageId }).all().first();
    if (page?.isHome) return { error: "Cannot delete the home page." };

    // Auto-sync cleanup: remove any navigation items pointing to this page
    await db.orm.public.MicrositeNavigationItem.where({ pageId }).delete();
    
    await db.orm.public.MicrositePage.where({ id: pageId }).delete();
    return { success: true };
  } catch(error) {
    return { error: "Failed to delete page." };
  }
}

export async function updateMicrositeNavigation(micrositeId: string, items: { id?: string, label: string, url: string | null, pageId: string | null }[]) {
  try {
    // Basic approach: delete all and recreate for simplicity
    await db.orm.public.MicrositeNavigationItem.where({ micrositeId }).delete();
    for (let i = 0; i < items.length; i++) {
      await db.orm.public.MicrositeNavigationItem.create({
        micrositeId,
        label: items[i].label,
        url: items[i].url,
        pageId: items[i].pageId,
        order: i
      });
    }
    return { success: true };
  } catch(error) {
    return { error: "Failed to update navigation." };
  }
}

export async function resetMicrosite(micrositeId: string) {
  try {
    await db.orm.public.Microsite.where({ id: micrositeId }).delete();
    return { success: true };
  } catch (error) {
    console.error("Error resetting microsite", error);
    return { error: "Failed to reset website." };
  }
}
