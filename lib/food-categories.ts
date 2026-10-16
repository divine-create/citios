/**
 * CityOS Food Taxonomy & Normalization Engine
 * 
 * Standardizes restaurant cuisines, merchant store categories, and dish types
 * into canonical discovery buckets tailored for Nigerian and cosmopolitan cities.
 */

export interface StandardizedFoodCategory {
  id: string;
  label: string;
  shortLabel: string;
  emoji: string;
  description: string;
  keywords: string[];
}

export const STANDARDIZED_FOOD_CATEGORIES: StandardizedFoodCategory[] = [
  {
    id: 'soups-swallow',
    label: 'Soups & Swallow',
    shortLabel: 'Soups & Swallow',
    emoji: '🍲',
    description: 'Traditional soups, swallows, and native delicacies',
    keywords: [
      'soup', 'soups', 'swallow', 'swallows', 'native soup', 'calabar soup', 'calabar kitchen',
      'afang', 'afang soup', 'edikang ikong', 'edikaikong', 'edikang ikong soup', 'atama',
      'atama soup', 'afia efere', 'white soup', 'egusi', 'egusi soup', 'ogbono', 'ogbono soup',
      'okro', 'okro soup', 'okra', 'okra soup', 'ewedu', 'gbegiri', 'oha', 'oha soup',
      'bitterleaf', 'bitterleaf soup', 'banga', 'banga soup', 'fisherman', 'fisherman soup',
      'fufu', 'eba', 'garri', 'pounded yam', 'amala', 'semo', 'semovita', 'wheat', 'starch',
      'tuwo', 'groundnut soup', 'vegetable soup', 'otah'
    ],
  },
  {
    id: 'rice-jollof',
    label: 'Jollof & Rice',
    shortLabel: 'Jollof & Rice',
    emoji: '🍚',
    description: 'Party Jollof, fried rice, ofada, and rice platters',
    keywords: [
      'rice', 'jollof', 'jollof rice', 'grain', 'grains', 'fried rice', 'ofada',
      'coconut rice', 'basmati', 'curry rice', 'white rice', 'stew and rice', 'rice and stew',
      'rice and beans', 'concoction', 'village rice', 'smoky jollof', 'party jollof'
    ],
  },
  {
    id: 'suya-grills',
    label: 'Suya & Street Grills',
    shortLabel: 'Suya & Grills',
    emoji: '🍢',
    description: 'Spicy roasted suya, asun, kilishi, and flame-grilled meats',
    keywords: [
      'suya', 'grill', 'grills', 'grilled', 'bbq', 'barbecue', 'roast', 'roasted',
      'charcoal', 'flame', 'asun', 'kilishi', 'catfish', 'croaker', 'point and kill',
      'point & kill', 'skewer', 'skewers', 'tozo', 'gizzard suya', 'peppered gizzard',
      'grilled fish', 'bbq wings'
    ],
  },
  {
    id: 'chicken-meat',
    label: 'Chicken & Proteins',
    shortLabel: 'Chicken & Meat',
    emoji: '🍗',
    description: 'Peppered chicken, turkey, beef, goat meat, fish, and proteins',
    keywords: [
      'chicken', 'turkey', 'meat', 'protein', 'proteins', 'poultry', 'beef', 'goat meat',
      'goat', 'peppered chicken', 'crispy chicken', 'fried chicken', 'wings', 'cow leg',
      'shaki', 'kpomo', 'assorted', 'assorted meat', 'fried fish', 'drumstick'
    ],
  },
  {
    id: 'fast-food-shawarma',
    label: 'Shawarma & Fast Eats',
    shortLabel: 'Shawarma & Fast',
    emoji: '🌯',
    description: 'Shawarma wraps, burgers, fries, nuggets, and quick bites',
    keywords: [
      'shawarma', 'fast food', 'burger', 'burgers', 'fries', 'french fries', 'chips',
      'potato chips', 'nuggets', 'hotdog', 'frankfurter', 'wrap', 'wraps', 'sandwich',
      'sandwiches', 'tacos', 'finger food', 'quick bites', 'fast eats', 'snack', 'snacks'
    ],
  },
  {
    id: 'pizza-pasta',
    label: 'Pizza & Pasta',
    shortLabel: 'Pizza & Pasta',
    emoji: '🍕',
    description: 'Handcrafted pizza, spaghetti, noodles, and pasta',
    keywords: [
      'pizza', 'pasta', 'spaghetti', 'noodles', 'indomie', 'macaroni', 'lasagna',
      'penne', 'alfredo', 'bolognese', 'italian'
    ],
  },
  {
    id: 'pastries-bakery',
    label: 'Pastries & Bakery',
    shortLabel: 'Pastries & Bakery',
    emoji: '🥐',
    description: 'Meat pies, fresh bread, doughnuts, cakes, and desserts',
    keywords: [
      'bakery', 'pastries', 'pastry', 'meat pie', 'meatpie', 'chicken pie', 'sausage roll',
      'doughnut', 'donut', 'puff puff', 'chin chin', 'cake', 'cakes', 'muffin', 'croissant',
      'bread', 'dessert', 'desserts', 'confectionery', 'bakes', 'ice cream', 'crepe'
    ],
  },
  {
    id: 'drinks-beverages',
    label: 'Drinks & Smoothies',
    shortLabel: 'Drinks & Juices',
    emoji: '🥤',
    description: 'Cold beverages, fresh smoothies, juices, cocktails, and mocktails',
    keywords: [
      'drink', 'drinks', 'beverage', 'beverages', 'smoothie', 'smoothies', 'juice', 'juices',
      'soda', 'coke', 'fanta', 'sprite', 'water', 'bottled water', 'chapman', 'zobo', 'kunu',
      'palm wine', 'cocktail', 'cocktails', 'mocktail', 'mocktails', 'wine', 'beer', 'shake',
      'milkshake', 'boba', 'tea', 'coffee', 'latte', 'malt', 'energy drink'
    ],
  },
  {
    id: 'breakfast-cafe',
    label: 'Breakfast & Café',
    shortLabel: 'Breakfast & Café',
    emoji: '☕',
    description: 'Morning breakfast, egg specials, pancakes, tea, and café eats',
    keywords: [
      'breakfast', 'cafe', 'café', 'morning', 'brunch', 'toast', 'egg', 'eggs', 'omelette',
      'pancake', 'pancakes', 'waffle', 'waffles', 'custard', 'oats', 'oatmeal', 'pap',
      'akamu', 'ogi', 'akara', 'moi moi', 'moimoi', 'french toast'
    ],
  },
  {
    id: 'healthy-salads',
    label: 'Salads & Healthy',
    shortLabel: 'Healthy & Salads',
    emoji: '🥗',
    description: 'Fresh green salads, fruit bowls, parfaits, and wholesome meals',
    keywords: [
      'salad', 'salads', 'healthy', 'greens', 'coleslaw', 'greek salad', 'caesar salad',
      'fruit salad', 'parfait', 'yogurt', 'yoghurt', 'vegan', 'vegetarian', 'avocado', 'fit'
    ],
  },
  {
    id: 'local-specialties',
    label: 'Local & African Classics',
    shortLabel: 'Local Classics',
    emoji: '🥘',
    description: 'Yam porridge, plantain delicacies, pepper soup, native pot specialties',
    keywords: [
      'african', 'local', 'specialty', 'specialties', 'pepper soup', 'peppersoup',
      'catfish peppersoup', 'goat meat peppersoup', 'yam porridge', 'asaro', 'plantain porridge',
      'bole', 'boli', 'roasted plantain', 'abacha', 'ukwa', 'nkwobi', 'isi ewu',
      'ekpang', 'ekpang nkukwo', 'native pot', 'dodo', 'plantain'
    ],
  },
  {
    id: 'other',
    label: 'Other Delicacies',
    shortLabel: 'Other Delicacies',
    emoji: '🍽️',
    description: 'Assorted delicacies and chef specials',
    keywords: [],
  },
];

const CATEGORY_MAP = new Map<string, StandardizedFoodCategory>(
  STANDARDIZED_FOOD_CATEGORIES.map((cat) => [cat.id, cat])
);

const CATEGORY_ALIASES: Record<string, string> = {
  soups: 'soups-swallow',
  jollof: 'rice-jollof',
  chicken: 'chicken-meat',
  suya: 'suya-grills',
  shawarma: 'fast-food-shawarma',
  pizza: 'pizza-pasta',
  pastries: 'pastries-bakery',
  drinks: 'drinks-beverages',
  breakfast: 'breakfast-cafe',
  salads: 'healthy-salads',
  healthy: 'healthy-salads',
  local: 'local-specialties',
  'fast-food': 'fast-food-shawarma',
  rice: 'rice-jollof',
  soup: 'soups-swallow',
  swallow: 'soups-swallow',
  grill: 'suya-grills',
  grills: 'suya-grills',
  beverages: 'drinks-beverages',
  bakery: 'pastries-bakery',
  fast: 'fast-food-shawarma',
};

const GENERIC_LABELS = new Set([
  'mains', 'main', 'starters', 'starter', 'sides', 'side', 'specials', 'special',
  'combos', 'combo', 'platters', 'platter', 'others', 'other', 'general', 'food',
  'restaurant', 'dishes', 'dish', 'all', 'menu'
]);

/**
 * Returns a canonical food category by its unique ID or alias
 */
export function getFoodCategoryById(id: string): StandardizedFoodCategory | undefined {
  const cleanId = id.trim().toLowerCase();
  const resolvedId = CATEGORY_ALIASES[cleanId] || cleanId;
  return CATEGORY_MAP.get(resolvedId);
}

/**
 * Normalizes any category ID or alias into canonical category ID
 */
export function normalizeCategoryId(id: string): string {
  const cleanId = id.trim().toLowerCase();
  return CATEGORY_ALIASES[cleanId] || cleanId;
}

// Precomputed keyword rules sorted by length descending so specific phrases
// (e.g. "pepper soup", "jollof rice", "fried chicken") match before single words (e.g. "soup", "rice")
const FLATTENED_KEYWORD_RULES = STANDARDIZED_FOOD_CATEGORIES
  .filter((cat) => cat.id !== 'other')
  .flatMap((cat) =>
    cat.keywords.map((kw) => ({
      keyword: kw.toLowerCase(),
      category: cat,
      isShort: kw.length <= 4,
    }))
  )
  .sort((a, b) => b.keyword.length - a.keyword.length);

/**
 * Match a text string against canonical category keywords
 */
function matchCategoryByKeywords(text: string): StandardizedFoodCategory | null {
  const lower = text.toLowerCase();

  // If text mentions soup/swallow, prioritize soup/swallow over accompanying protein (e.g. "Afang Soup with Goat Meat")
  const hasSoupSwallowIndicator =
    (/\b(soup|soups|swallow|swallows|garri|eba|fufu|pounded yam|amala|semo|semovita)\b/i.test(lower) &&
      !lower.includes('pepper soup') &&
      !lower.includes('peppersoup')) ||
    lower.includes('afang') ||
    lower.includes('edikang ikong') ||
    lower.includes('edikaikong') ||
    lower.includes('atama') ||
    lower.includes('egusi') ||
    lower.includes('ogbono');

  for (const rule of FLATTENED_KEYWORD_RULES) {
    // When dish is fundamentally soup/swallow, do not let accompanying meat keyword classify it as plain protein
    if (hasSoupSwallowIndicator && rule.category.id === 'chicken-meat') {
      continue;
    }

    if (rule.isShort) {
      const regex = new RegExp(`\\b${rule.keyword}\\b`, 'i');
      if (regex.test(lower)) return rule.category;
    } else {
      if (lower.includes(rule.keyword)) return rule.category;
    }
  }

  return null;
}

/**
 * Intelligently maps arbitrary merchant input (category, cuisines, or dish name)
 * into a standardized canonical category.
 */
export function normalizeFoodCategory(
  inputCategory?: string | null,
  dishName?: string | null
): StandardizedFoodCategory {
  const cleanCat = inputCategory?.trim();
  const cleanDish = dishName?.trim();

  // 1. Direct match on ID or Alias
  if (cleanCat) {
    const direct = getFoodCategoryById(cleanCat);
    if (direct) return direct;

    // Check by exact label or shortLabel
    const lowerCat = cleanCat.toLowerCase();
    const byLabel = STANDARDIZED_FOOD_CATEGORIES.find(
      (c) => c.label.toLowerCase() === lowerCat || c.shortLabel.toLowerCase() === lowerCat
    );
    if (byLabel) return byLabel;

    // Check if category is non-generic and matches keywords
    if (!GENERIC_LABELS.has(lowerCat)) {
      const matched = matchCategoryByKeywords(cleanCat);
      if (matched) return matched;
    }
  }

  // 2. If category was generic or did not match, try matching on dishName
  if (cleanDish) {
    const fromDish = matchCategoryByKeywords(cleanDish);
    if (fromDish) return fromDish;
  }

  // 3. Fallback: try matching combined text
  if (cleanCat && cleanDish) {
    const combined = matchCategoryByKeywords(`${cleanCat} ${cleanDish}`);
    if (combined) return combined;
  }

  // 4. Default fallback
  return CATEGORY_MAP.get('other')!;
}

/**
 * Determines all standardized category IDs that a restaurant satisfies
 * based on its storeCategory, cuisines, and dish menu items.
 */
export function inferCanonicalCategoriesForRestaurant(restaurant: {
  category?: string | null;
  storeCategory?: string | null;
  cuisines?: string[] | null;
  menuItems?: Array<{ category?: string | null; name?: string | null }>;
}): string[] {
  const categoryIds = new Set<string>();

  // Check restaurant category / storeCategory
  const mainCat = restaurant.category || restaurant.storeCategory;
  if (mainCat && mainCat !== 'Restaurant') {
    const norm = normalizeFoodCategory(mainCat);
    if (norm.id !== 'other') categoryIds.add(norm.id);
  }

  // Check cuisines
  if (Array.isArray(restaurant.cuisines)) {
    for (const c of restaurant.cuisines) {
      if (c && c.trim()) {
        const norm = normalizeFoodCategory(c);
        if (norm.id !== 'other') categoryIds.add(norm.id);
      }
    }
  }

  // Check dishes
  if (Array.isArray(restaurant.menuItems)) {
    for (const item of restaurant.menuItems) {
      const norm = normalizeFoodCategory(item.category, item.name);
      if (norm.id !== 'other') categoryIds.add(norm.id);
    }
  }

  return Array.from(categoryIds);
}

/**
 * Checks if a restaurant matches a target category ID (including alias handling).
 */
export function doesRestaurantMatchCategory(
  restaurant: {
    category?: string | null;
    storeCategory?: string | null;
    cuisines?: string[] | null;
    menuItems?: Array<{ category?: string | null; name?: string | null }>;
    canonicalCategoryIds?: string[];
  },
  targetCategoryId: string
): boolean {
  if (targetCategoryId === 'all') return true;

  const resolvedTarget = normalizeCategoryId(targetCategoryId);

  // If pre-computed canonicalCategoryIds exists on restaurant
  if (Array.isArray(restaurant.canonicalCategoryIds)) {
    return restaurant.canonicalCategoryIds.includes(resolvedTarget);
  }

  // Otherwise infer dynamically
  const categories = inferCanonicalCategoriesForRestaurant(restaurant);
  return categories.includes(resolvedTarget);
}
