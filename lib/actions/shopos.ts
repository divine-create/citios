"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/src/prisma/db";

export async function provisionShopOS(formData: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.userId) {
      return { error: "You must be logged in to provision a store." };
    }

    const { businessName, storeUrl, country, weeklyOrders, currencies, staffCount, physicalStores } = formData;
    
    // Check if store URL (slug) is taken
    const existingSite = await db.orm.public.Microsite.where({ slug: storeUrl }).all().first();
    if (existingSite) {
      return { error: "That Store URL is already taken. Please choose another." };
    }

    // 1. Create Organization
    const org = await db.orm.public.Organization.create({
      name: businessName,
      type: "RETAIL",
      description: "A ShopOS Retail Store",
    });

    // 2. Add User as Owner
    await db.orm.public.OrganizationMember.create({
      userId: session.user.userId,
      organizationId: org.id,
      role: "OWNER",
    });

    // 3. Create Retail Settings
    await db.orm.public.RetailSettings.create({
      organizationId: org.id,
      storeName: businessName,
      storeUrl: storeUrl,
      country: country,
      weeklyOrders: weeklyOrders,
      currencies: JSON.stringify(currencies || []),
      staffCount: staffCount,
      physicalStores: physicalStores,
      currencySymbol: country === "Nigeria" ? "?" : "$",
    });

    // 4. Provision Microsite
    const microsite = await db.orm.public.Microsite.create({
      organizationId: org.id,
      title: businessName + " Storefront",
      slug: storeUrl,
      theme: "The Modern Innovator",
      status: "published",
    });

    const homePage = await db.orm.public.MicrositePage.create({
      micrositeId: microsite.id,
      title: "Home",
      slug: "",
      isHome: true,
      status: "published",
    });

    // Sections
    const defaultSections = [
      {
        type: "hero",
        content: {
          heading: "Welcome to " + businessName,
          subheading: "Discover our amazing products.",
          ctaText: "Shop Now",
          ctaLink: "#products",
        }
      },
      {
        type: "retail-products",
        content: {
          heading: "Featured Products",
          subtext: "Freshly added to our store.",
        }
      },
      {
        type: "footer",
        content: {
          title: businessName,
          subtitle: "Powered by CityConnect ShopOS",
        }
      }
    ];

    let order = 0;
    for (const section of defaultSections) {
      await db.orm.public.MicrositeSection.create({
        micrositeId: microsite.id,
        pageId: homePage.id,
        type: section.type,
        order: order++,
        content: JSON.stringify(section.content),
      });
    }

    return { success: true, organizationId: org.id };
  } catch (err: any) {
    console.error("ShopOS Provisioning Error:", err);
    return { error: err.message || "Failed to provision store." };
  }
}
