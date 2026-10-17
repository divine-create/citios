import { CANONICAL_ECOMMERCE_CATEGORIES } from '@/lib/taxonomy/retail-categorizer';

export type RetailCategorySeed = {
  name: string;
  slug: string;
  description?: string;
  subcategories: Array<{
    name: string;
    slug: string;
    description?: string;
  }>;
};

/**
 * Universal E-Commerce Categories (Jumia / Jiji / Amazon + Core Tech & Lifestyle)
 * Automatically provisioned for every store via ensureDefaultCategories() so new
 * stores never have to create categories from scratch.
 */
export const DEFAULT_RETAIL_CATEGORIES: RetailCategorySeed[] = CANONICAL_ECOMMERCE_CATEGORIES.map((cat) => ({
  name: cat.label,
  slug: cat.id,
  description: cat.description,
  subcategories: cat.subcategories.map((sub) => ({
    name: sub.name,
    slug: sub.slug,
    description: sub.description,
  })),
}));

export const DEFAULT_RETAIL_CATEGORY_NAMES = DEFAULT_RETAIL_CATEGORIES.map((category) => category.name);

export function flattenDefaultRetailCategories() {
  return DEFAULT_RETAIL_CATEGORIES.flatMap((category) => [
    { name: category.name, slug: category.slug, parentId: null },
    ...category.subcategories.map((subcategory) => ({
      name: subcategory.name,
      slug: subcategory.slug,
      parentId: category.slug,
    })),
  ]);
}
