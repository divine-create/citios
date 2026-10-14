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

    const trimmedName = (businessName || "").trim();
    const slug = slugifyStoreUrl(String(storeUrl || ""));
    if (!trimmedName) return { error: "Business name is required." };
    if (!slug) return { error: "Store URL is required." };

    // Check if store URL (slug) is taken
    const existingSite = await db.orm.public.Microsite.where({ slug }).all().first();
    if (existingSite) {
      return { error: "That Store URL is already taken. Please choose another." };
    }

    // Check if listing slug is taken
    const existingListing = await db.orm.public.DiscoveryListing.where({ slug }).all().first();
    if (existingListing) {
      return { error: "That Store URL is already reserved for a discovery listing. Please choose another." };
    }

    // Prevent duplicate store registration by the same owner
    const existingOrgs = await db.orm.public.Organization.where({ name: trimmedName }).all();
    if (existingOrgs.length > 0) {
      for (const org of existingOrgs) {
        const mem = await db.orm.public.Membership.where({ organizationId: org.id, personId: session.user.personId }).all().first();
        if (mem) {
          return { error: `You already own or belong to a store named "${trimmedName}".` };
        }
      }
    }

    // Resolve canonical City
    const citySlug = (formData.citySlug || '').trim().toLowerCase();
    let city = null;
    if (citySlug) {
      city = await db.orm.public.City.where({ slug: citySlug, isActive: true }).all().first();
    }
    if (!city) {
      city = await db.orm.public.City.where({ isActive: true }).all().first();
    }
    if (!city) {
      return { error: "No active city available for store registration." };
    }

    const orgId = await db.transaction(async (tx: any) => {
      // 1. Create Organization
      const org = await tx.orm.public.Organization.create({
        name: trimmedName,
        type: "RETAIL",
        description: "A ShopOS Retail Store",
        address: formData.address || null,
      });

      // 2. Add User as Owner via Membership + MembershipRole
      const ownerMembership = await tx.orm.public.Membership.create({
        personId: session.user.personId,
        organizationId: org.id,
      });
      await tx.orm.public.MembershipRole.create({
        membershipId: ownerMembership.id,
        role: "OWNER",
      });

      // 3. Provision primary Location bound to canonical City
      const location = await tx.orm.public.Location.create({
        organizationId: org.id,
        name: 'Main Location',
        address: formData.address || null,
        cityId: city.id,
      });

      // Bind member to primary location
      await tx.orm.public.MembershipLocation.create({
        membershipId: ownerMembership.id,
        locationId: location.id,
      });

      // 4. Provision canonical organization wallet
      await tx.orm.public.Wallet.create({
        organizationId: org.id,
        balance: 0.0,
        currency: city.currency || "NGN",
      });

      // 5. Create Retail Settings
      await tx.orm.public.RetailSettings.create({
        organizationId: org.id,
        storeName: trimmedName,
        storeUrl: slug,
        country: country,
        weeklyOrders: weeklyOrders,
        currencies: JSON.stringify(currencies || []),
        staffCount: staffCount,
        physicalStores: physicalStores,
        currencySymbol: COUNTRY_CURRENCY_SYMBOL[country] ?? "$",
      });

      // 6. Provision the online store microsite
      const theme: string = STOREFRONT_THEMES.includes(formData.theme) ? formData.theme : "minimal";

      const microsite = await tx.orm.public.Microsite.create({
        organizationId: org.id,
        title: trimmedName,
        slug,
        theme,
        status: "draft",
        tagline: "Shop the best of " + trimmedName,
        publishedAt: null,
      });

      const homePage = await tx.orm.public.MicrositePage.create({
        micrositeId: microsite.id,
        title: "Home",
        slug: "home",
        isHome: true,
        status: "published",
      });

      const defaultSections = [
        {
          type: "hero",
          content: {
            heading: "Welcome to " + trimmedName,
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
            heading: "About " + trimmedName,
            body:
              trimmedName +
              " is a retail store on CityConnect. We sell quality products at fair prices, in-store and online.",
          },
        },
        {
          type: "contact",
          content: {
            heading: "Contact Us",
            address: formData.address || "",
            phone: "",
            email: "",
          },
        },
        {
          type: "footer",
          content: {
            title: trimmedName,
            subtitle: "Powered by CityConnect ShopOS",
          },
        },
      ];

      for (let i = 0; i < defaultSections.length; i++) {
        await tx.orm.public.MicrositeSection.create({
          micrositeId: microsite.id,
          pageId: homePage.id,
          type: defaultSections[i].type,
          order: i,
          visible: true,
          content: JSON.stringify(defaultSections[i].content),
        });
      }

      // 7. Provision canonical DiscoveryListing for marketplace discovery
      await tx.orm.public.DiscoveryListing.create({
        organizationId: org.id,
        locationId: location.id,
        cityId: city.id,
        vertical: 'RETAIL',
        slug,
        title: trimmedName,
        description: `Shop the best of ${trimmedName}`,
        isActive: true,
      });

      return org.id;
    });

    return { success: true, organizationId: orgId, slug };
  } catch (err: any) {
    console.error("ShopOS Provisioning Error:", err);
    return { error: err.message || "Failed to provision store." };
  }
}
