"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/src/prisma/db";

// Currency symbol by onboarding country (V1: display-only; amounts stay numeric).
const COUNTRY_CURRENCY_SYMBOL: Record<string, string> = {
  Nigeria: "₦",
  "United States": "$",
  "United Kingdom": "£",
  Ghana: "₵",
  Kenya: "KSh",
  "South Africa": "R",
};

// ShopOS one-click storefront themes (valid keys in components/microsite/themes.ts).
const STOREFRONT_THEMES = ["minimal", "innovator", "playful", "warm", "editorial"] as const;

function slugifyStoreUrl(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 60);
}

export async function provisionShopOS(formData: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.personId) {
      return { error: "You must be logged in to provision a store." };
    }

    const { businessName, storeUrl, country, weeklyOrders, currencies, staffCount, physicalStores } = formData;

    const slug = slugifyStoreUrl(String(storeUrl || ""));
    if (!businessName?.trim()) return { error: "Business name is required." };
    if (!slug) return { error: "Store URL is required." };

    // Check if store URL (slug) is taken
    const existingSite = await db.orm.public.Microsite.where({ slug }).all().first();
    if (existingSite) {
      return { error: "That Store URL is already taken. Please choose another." };
    }

    // 1. Create Organization
    const org = await db.orm.public.Organization.create({
      name: businessName,
      type: "RETAIL",
      description: "A ShopOS Retail Store",
    });

    // 2. Add User as Owner via Membership + MembershipRole
    const ownerMembership = await db.orm.public.Membership.create({
      personId: session.user.personId,
      organizationId: org.id,
    });
    await db.orm.public.MembershipRole.create({
      membershipId: ownerMembership.id,
      role: "OWNER",
    });

    // 3. Create Retail Settings
    await db.orm.public.RetailSettings.create({
      organizationId: org.id,
      storeName: businessName,
      storeUrl: slug,
      country: country,
      weeklyOrders: weeklyOrders,
      currencies: JSON.stringify(currencies || []),
      staffCount: staffCount,
      physicalStores: physicalStores,
      currencySymbol: COUNTRY_CURRENCY_SYMBOL[country] ?? "$",
    });

    // 4. Provision the online store — one click, complete site. The merchant
    //    picks the theme during onboarding later; V1 defaults to 'minimal'
    //    and the builder lets them switch from the supported set.
    const theme: string = STOREFRONT_THEMES.includes(formData.theme) ? formData.theme : "minimal";

    const microsite = await db.orm.public.Microsite.create({
      organizationId: org.id,
      title: businessName,
      slug,
      theme,
      status: "published",
      tagline: "Shop the best of " + businessName,
      publishedAt: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now()),
    });

    const homePage = await db.orm.public.MicrositePage.create({
      micrositeId: microsite.id,
      title: "Home",
      slug: "home",
      isHome: true,
      status: "published",
    });

    // Full store generated automatically: header/nav is derived from sections
    // by the renderer; hero + featured products + about + contact + footer
    // give the merchant a usable site with zero manual arrangement.
    const defaultSections = [
      {
        type: "hero",
        content: {
          heading: "Welcome to " + businessName,
          subheading: "Discover our amazing products.",
          ctaText: "Shop Now",
          ctaLink: "#retail-products",
        },
      },
      {
        type: "retail-products",
        content: {
          heading: "Featured Products",
          subtext: "Freshly added to our store.",
        },
      },
      {
        type: "about",
        content: {
          heading: "About " + businessName,
          body:
            businessName +
            " is a retail store on CityConnect. We sell quality products at fair prices, in-store and online.",
        },
      },
      {
        type: "contact",
        content: {
          heading: "Contact Us",
          address: "",
          phone: "",
          email: "",
        },
      },
      {
        type: "footer",
        content: {
          title: businessName,
          subtitle: "Powered by CityConnect ShopOS",
        },
      },
    ];

    for (let i = 0; i < defaultSections.length; i++) {
      await db.orm.public.MicrositeSection.create({
        micrositeId: microsite.id,
        pageId: homePage.id,
        type: defaultSections[i].type,
        order: i,
        visible: true,
        content: JSON.stringify(defaultSections[i].content),
      });
    }

    return { success: true, organizationId: org.id, slug };
  } catch (err: any) {
    console.error("ShopOS Provisioning Error:", err);
    return { error: err.message || "Failed to provision store." };
  }
}
