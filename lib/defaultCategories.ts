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

export const DEFAULT_RETAIL_CATEGORIES: RetailCategorySeed[] = [
  {
    name: 'Groceries & Food',
    slug: 'groceries-food',
    description: 'Daily essentials and packaged food products.',
    subcategories: [
      { name: 'Fresh Produce', slug: 'fresh-produce' },
      { name: 'Beverages', slug: 'beverages' },
      { name: 'Snacks & Packaged Food', slug: 'snacks-packaged-food' },
      { name: 'Bakery', slug: 'bakery' },
      { name: 'Cooking Essentials', slug: 'cooking-essentials' },
    ],
  },
  {
    name: 'Household & Cleaning',
    slug: 'household-cleaning',
    description: 'Home care, cleaning, and everyday household items.',
    subcategories: [
      { name: 'Cleaning Supplies', slug: 'cleaning-supplies' },
      { name: 'Laundry', slug: 'laundry' },
      { name: 'Paper Products', slug: 'paper-products' },
      { name: 'Air Fresheners', slug: 'air-fresheners' },
      { name: 'Storage & Organization', slug: 'storage-organization' },
    ],
  },
  {
    name: 'Health & Beauty',
    slug: 'health-beauty',
    description: 'Wellness, personal care, and beauty products.',
    subcategories: [
      { name: 'Skincare', slug: 'skincare' },
      { name: 'Hair Care', slug: 'hair-care' },
      { name: 'Bath & Body', slug: 'bath-body' },
      { name: 'Personal Care', slug: 'personal-care' },
      { name: 'Vitamins & Supplements', slug: 'vitamins-supplements' },
    ],
  },
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Consumer tech, devices, and accessories.',
    subcategories: [
      { name: 'Phones & Accessories', slug: 'phones-accessories' },
      { name: 'Computers & Laptops', slug: 'computers-laptops' },
      { name: 'Audio & Video', slug: 'audio-video' },
      { name: 'Smart Home', slug: 'smart-home' },
      { name: 'Gaming', slug: 'gaming' },
    ],
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    description: 'Apparel and accessories for everyday fashion.',
    subcategories: [
      { name: 'Women’s Fashion', slug: 'womens-fashion' },
      { name: 'Men’s Fashion', slug: 'mens-fashion' },
      { name: 'Kids’ Fashion', slug: 'kids-fashion' },
      { name: 'Shoes & Footwear', slug: 'shoes-footwear' },
      { name: 'Jewelry & Accessories', slug: 'jewelry-accessories' },
    ],
  },
  {
    name: 'Home & Living',
    slug: 'home-living',
    description: 'Furniture, decor, and home improvement essentials.',
    subcategories: [
      { name: 'Home Decor', slug: 'home-decor' },
      { name: 'Kitchen & Dining', slug: 'kitchen-dining' },
      { name: 'Furniture', slug: 'furniture' },
      { name: 'Bedding & Laundry', slug: 'bedding-laundry' },
      { name: 'Lighting', slug: 'lighting' },
    ],
  },
  {
    name: 'Office & School',
    slug: 'office-school',
    description: 'Study, work, and stationery essentials.',
    subcategories: [
      { name: 'Stationery', slug: 'stationery' },
      { name: 'School Supplies', slug: 'school-supplies' },
      { name: 'Office Equipment', slug: 'office-equipment' },
      { name: 'Printing & Packaging', slug: 'printing-packaging' },
      { name: 'Business Supplies', slug: 'business-supplies' },
    ],
  },
  {
    name: 'Baby & Kids',
    slug: 'baby-kids',
    description: 'Family-focused essentials for babies and children.',
    subcategories: [
      { name: 'Baby Care', slug: 'baby-care' },
      { name: 'Kids Accessories', slug: 'kids-accessories' },
      { name: 'Toys', slug: 'toys' },
      { name: 'Nursery', slug: 'nursery' },
      { name: 'Maternity', slug: 'maternity' },
    ],
  },
  {
    name: 'Sports & Outdoors',
    slug: 'sports-outdoors',
    description: 'Fitness, sportswear, and outdoor gear.',
    subcategories: [
      { name: 'Fitness & Exercise', slug: 'fitness-exercise' },
      { name: 'Sportswear', slug: 'sportswear' },
      { name: 'Outdoor Gear', slug: 'outdoor-gear' },
      { name: 'Camping', slug: 'camping' },
      { name: 'Travel Accessories', slug: 'travel-accessories' },
    ],
  },
  {
    name: 'Automotive & Tools',
    slug: 'automotive-tools',
    description: 'Vehicle accessories, tools, and workshop essentials.',
    subcategories: [
      { name: 'Car Accessories', slug: 'car-accessories' },
      { name: 'Tools & Equipment', slug: 'tools-equipment' },
      { name: 'Industrial Supplies', slug: 'industrial-supplies' },
      { name: 'Motorcycle Parts', slug: 'motorcycle-parts' },
      { name: 'Hardware', slug: 'hardware' },
    ],
  },
];

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
