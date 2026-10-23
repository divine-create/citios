/**
 * CityOS Menu Library
 * 
 * Canonical pre-filled menu item library for RestaurantOS, CityFeed, Food Discovery,
 * and HQ Managed Business catalogs. Contains high-resolution, standardized Nigerian
 * and continental dishes, proteins, sides, and chilled beverages.
 */

export interface MenuItemLibraryEntry {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  price: number;
  description: string;
  imageUrl: string;
  image: string; // compatibility alias with legacy workspace forms
  tags: string[];
}

export const MENU_LIBRARY_CATEGORIES = [
  'All',
  'Jollof & Rice',
  'Soups & Swallow',
  'Chicken & Proteins',
  'Shawarma & Fast Eats',
  'Pastries & Bakery',
  'Local & African Classics',
  'Breakfast & Café',
  'Salads & Healthy',
  'Drinks & Smoothies',
] as const;

export type MenuLibraryCategory = typeof MENU_LIBRARY_CATEGORIES[number];

export const MENU_LIBRARY: MenuItemLibraryEntry[] = [
  // ==========================================
  // 1. Jollof & Rice
  // ==========================================
  {
    id: 'jollof-rice',
    name: 'Jollof Rice',
    category: 'Jollof & Rice',
    categoryId: 'rice-jollof',
    price: 3500,
    description: 'Iconic Nigerian party Jollof rice infused with firewood smoke, sweet bell peppers, and savory herbs.',
    imageUrl: '/images/menu/jollof-rice.jpg',
    image: '/images/menu/jollof-rice.jpg',
    tags: ['jollof', 'jollof rice', 'party jollof', 'smoky', 'rice', 'party rice'],
  },
  {
    id: 'fried-rice',
    name: 'Fried Rice',
    category: 'Jollof & Rice',
    categoryId: 'rice-jollof',
    price: 3500,
    description: 'Special Nigerian fried rice with sweet corn, green peas, carrots, liver, and aromatic herbs.',
    imageUrl: '/images/menu/fried-rice.webp',
    image: '/images/menu/fried-rice.webp',
    tags: ['fried rice', 'rice', 'vegetables', 'liver', 'stir fry'],
  },
  {
    id: 'banga-rice',
    name: 'Banga Rice',
    category: 'Jollof & Rice',
    categoryId: 'rice-jollof',
    price: 3800,
    description: 'Traditional Delta palm fruit extract rice infused with local herbs, dried fish, and native seasoning.',
    imageUrl: '/images/menu/banga-rice.jpg',
    image: '/images/menu/banga-rice.jpg',
    tags: ['banga', 'rice', 'palm fruit', 'delta', 'native rice', 'urhobo'],
  },
  {
    id: 'coconut-rice',
    name: 'Coconut Rice',
    category: 'Jollof & Rice',
    categoryId: 'rice-jollof',
    price: 3500,
    description: 'Fluffy rice simmered in fresh coconut milk with prawns, sweet peppers, and mild spice.',
    imageUrl: '/images/menu/coconut-rice.jpg',
    image: '/images/menu/coconut-rice.jpg',
    tags: ['coconut', 'rice', 'coconut rice', 'seafood', 'coconut milk'],
  },
  {
    id: 'ofada-rice',
    name: 'Ofada Rice & Ayamase',
    category: 'Jollof & Rice',
    categoryId: 'rice-jollof',
    price: 4000,
    description: 'Unpolished native brown rice served with fiery green bleached-palm-oil Ayamase sauce and assorted meat.',
    imageUrl: '/images/menu/ofada-rice.jpg',
    image: '/images/menu/ofada-rice.jpg',
    tags: ['ofada', 'rice', 'ayamase', 'designer stew', 'native rice', 'green sauce'],
  },
  {
    id: 'jambala-rice',
    name: 'Jambala Rice',
    category: 'Jollof & Rice',
    categoryId: 'rice-jollof',
    price: 3800,
    description: 'Spicy one-pot savory rice loaded with sausages, diced chicken, peppers, and Creole flair.',
    imageUrl: '/images/menu/jambala-rice.webp',
    image: '/images/menu/jambala-rice.webp',
    tags: ['jambala', 'rice', 'jambalaya', 'spicy rice', 'creole'],
  },
  {
    id: 'rice-and-beans',
    name: 'Rice and Beans',
    category: 'Jollof & Rice',
    categoryId: 'rice-jollof',
    price: 3000,
    description: 'Steamed white rice and honey beans served with a rich fried pepper stew.',
    imageUrl: '/images/menu/rice-and-beans.webp',
    image: '/images/menu/rice-and-beans.webp',
    tags: ['rice and beans', 'beans', 'rice', 'ewa', 'stew', 'honey beans'],
  },
  {
    id: 'white-rice',
    name: 'Steamed White Rice',
    category: 'Jollof & Rice',
    categoryId: 'rice-jollof',
    price: 2000,
    description: 'Fluffy steamed long grain white rice, ready for your choice of stew or native sauce.',
    imageUrl: '/images/menu/white-rice.webp',
    image: '/images/menu/white-rice.webp',
    tags: ['white rice', 'rice', 'steamed rice', 'plain rice'],
  },

  // ==========================================
  // 2. Soups & Swallow
  // ==========================================
  {
    id: 'afang-soup',
    name: 'Afang Soup',
    category: 'Soups & Swallow',
    categoryId: 'soups-swallow',
    price: 4500,
    description: 'Authentic Calabar Afang soup prepared with tender goat meat, dried fish, periwinkle, and native spices.',
    imageUrl: '/images/menu/afang-soup.webp',
    image: '/images/menu/afang-soup.webp',
    tags: ['afang', 'soup', 'calabar', 'native', 'swallow', 'goat meat', 'waterleaf', 'periwinkle'],
  },
  {
    id: 'vegetable-soup',
    name: 'Vegetable Soup (Edikang Ikong)',
    category: 'Soups & Swallow',
    categoryId: 'soups-swallow',
    price: 4500,
    description: 'Calabar rich vegetable soup loaded with waterleaf, ugwu, dry fish, kpomo, and assorted meats.',
    imageUrl: '/images/menu/vegetable-soup.jpg',
    image: '/images/menu/vegetable-soup.jpg',
    tags: ['vegetable soup', 'edikang ikong', 'edikaikong', 'ugwu', 'waterleaf', 'calabar', 'native'],
  },
  {
    id: 'egusi-soup',
    name: 'Egusi Soup',
    category: 'Soups & Swallow',
    categoryId: 'soups-swallow',
    price: 4000,
    description: 'Rich ground melon seed soup prepared with bitterleaf, pumpkin leaves, stockfish, and beef.',
    imageUrl: '/images/menu/egusi-soup.webp',
    image: '/images/menu/egusi-soup.webp',
    tags: ['egusi', 'melon', 'soup', 'swallow', 'native', 'bitterleaf'],
  },
  {
    id: 'ogbono-soup',
    name: 'Ogbono Soup',
    category: 'Soups & Swallow',
    categoryId: 'soups-swallow',
    price: 3800,
    description: 'Draw soup prepared from wild mango seeds with uziza leaves, smoked fish, and cow foot.',
    imageUrl: '/images/menu/ogbono-soup.jpg',
    image: '/images/menu/ogbono-soup.jpg',
    tags: ['ogbono', 'soup', 'swallow', 'draw soup', 'native', 'uziza'],
  },
  {
    id: 'oha-soup',
    name: 'Oha Soup',
    category: 'Soups & Swallow',
    categoryId: 'soups-swallow',
    price: 4000,
    description: 'Eastern Nigerian native Oha soup thickened with cocoyam and seasoned with ogiri and stockfish.',
    imageUrl: '/images/menu/oha-soup.webp',
    image: '/images/menu/oha-soup.webp',
    tags: ['oha', 'soup', 'swallow', 'cocoyam', 'native', 'ogiri'],
  },
  {
    id: 'pounded-yam',
    name: 'Pounded Yam',
    category: 'Soups & Swallow',
    categoryId: 'soups-swallow',
    price: 1200,
    description: 'Silky smooth, warm freshly pounded yam with zero lumps.',
    imageUrl: '/images/menu/pounded-yam.jpg',
    image: '/images/menu/pounded-yam.jpg',
    tags: ['pounded yam', 'iyan', 'swallow', 'yam'],
  },
  {
    id: 'amala',
    name: 'Amala',
    category: 'Soups & Swallow',
    categoryId: 'soups-swallow',
    price: 1000,
    description: 'Smooth, piping hot yam flour swallow (Amala dudu) crafted to pair with rich native soups.',
    imageUrl: '/images/menu/amala.webp',
    image: '/images/menu/amala.webp',
    tags: ['amala', 'swallow', 'yam flour', 'dudu', 'ewedu'],
  },
  {
    id: 'fufu',
    name: 'Fufu',
    category: 'Soups & Swallow',
    categoryId: 'soups-swallow',
    price: 800,
    description: 'Traditional fermented cassava swallow, ultra-soft and hot.',
    imageUrl: '/images/menu/fufu.webp',
    image: '/images/menu/fufu.webp',
    tags: ['fufu', 'swallow', 'cassava', 'akpu', 'native'],
  },
  {
    id: 'garri',
    name: 'Garri / Eba',
    category: 'Soups & Swallow',
    categoryId: 'soups-swallow',
    price: 800,
    description: 'Steamed yellow cassava flakes (Eba) made fluffy and firm.',
    imageUrl: '/images/menu/garri.webp',
    image: '/images/menu/garri.webp',
    tags: ['garri', 'eba', 'swallow', 'cassava', 'yellow garri'],
  },
  {
    id: 'tuwo-shinkafa',
    name: 'Tuwo Shinkafa',
    category: 'Soups & Swallow',
    categoryId: 'soups-swallow',
    price: 1000,
    description: 'Traditional soft mashed northern rice swallow, perfect with Miyan Kuka or Gbegiri.',
    imageUrl: '/images/menu/tuwo-shinkafa.jpg',
    image: '/images/menu/tuwo-shinkafa.jpg',
    tags: ['tuwo', 'tuwo shinkafa', 'rice swallow', 'northern', 'swallow'],
  },
  {
    id: 'wheat',
    name: 'Wheat Meal',
    category: 'Soups & Swallow',
    categoryId: 'soups-swallow',
    price: 1000,
    description: 'High-fiber whole wheat swallow cooked smooth and hot.',
    imageUrl: '/images/menu/wheat.png',
    image: '/images/menu/wheat.png',
    tags: ['wheat', 'swallow', 'whole wheat', 'healthy'],
  },

  // ==========================================
  // 3. Chicken & Proteins
  // ==========================================
  {
    id: 'grilled-chicken',
    name: 'Grilled Chicken',
    category: 'Chicken & Proteins',
    categoryId: 'chicken-meat',
    price: 3200,
    description: 'Marinated quarter chicken grilled over open charcoal for maximum smokiness.',
    imageUrl: '/images/menu/grilled-chicken.webp',
    image: '/images/menu/grilled-chicken.webp',
    tags: ['chicken', 'grilled chicken', 'flame', 'bbq', 'protein', 'drumstick'],
  },
  {
    id: 'grilled-turkey',
    name: 'Grilled Turkey',
    category: 'Chicken & Proteins',
    categoryId: 'chicken-meat',
    price: 4500,
    description: 'Meaty quarter turkey flame-grilled with spicy dry rub and rich glaze.',
    imageUrl: '/images/menu/grilled-turkey.webp',
    image: '/images/menu/grilled-turkey.webp',
    tags: ['turkey', 'grilled turkey', 'poultry', 'grills', 'meat', 'protein'],
  },
  {
    id: 'peppered-turkey',
    name: 'Peppered Turkey',
    category: 'Chicken & Proteins',
    categoryId: 'chicken-meat',
    price: 4800,
    description: 'Crispy fried turkey wings drenched in fiery scotch bonnet pepper sauce.',
    imageUrl: '/images/menu/peppered-turkey.webp',
    image: '/images/menu/peppered-turkey.webp',
    tags: ['turkey', 'peppered turkey', 'spicy', 'protein', 'grills', 'wings'],
  },
  {
    id: 'goat-meat',
    name: 'Tender Goat Meat',
    category: 'Chicken & Proteins',
    categoryId: 'chicken-meat',
    price: 3000,
    description: 'Tender seasoned Nigerian goat meat cuts slow-boiled in native stock and lightly tossed in pepper.',
    imageUrl: '/images/menu/goat-meat.webp',
    image: '/images/menu/goat-meat.webp',
    tags: ['goat meat', 'goat', 'meat', 'protein', 'peppersoup', 'ogunfe'],
  },
  {
    id: 'beef-in-stew',
    name: 'Beef in Stew',
    category: 'Chicken & Proteins',
    categoryId: 'chicken-meat',
    price: 2500,
    description: 'Succulent braised beef simmered in a slow-cooked aromatic tomato and pepper stew.',
    imageUrl: '/images/menu/beef-in-stew.webp',
    image: '/images/menu/beef-in-stew.webp',
    tags: ['beef', 'meat', 'stew', 'protein', 'sauce'],
  },
  {
    id: 'boiled-egg',
    name: 'Boiled Egg',
    category: 'Chicken & Proteins',
    categoryId: 'chicken-meat',
    price: 500,
    description: 'Freshly hard-boiled farm egg, perfectly seasoned side for rice, noodles, or salad.',
    imageUrl: '/images/menu/boiled-egg.webp',
    image: '/images/menu/boiled-egg.webp',
    tags: ['egg', 'boiled egg', 'protein', 'side', 'breakfast'],
  },

  // ==========================================
  // 4. Shawarma & Fast Eats
  // ==========================================
  {
    id: 'shawarma',
    name: 'Chicken Shawarma Wrap',
    category: 'Shawarma & Fast Eats',
    categoryId: 'fast-food-shawarma',
    price: 3000,
    description: 'Warm pita stuffed with shredded grilled chicken, double sausage, crunchy cabbage, and tangy garlic cream.',
    imageUrl: '/images/menu/shawarma.webp',
    image: '/images/menu/shawarma.webp',
    tags: ['shawarma', 'chicken shawarma', 'wrap', 'fast food', 'sausage', 'fast eats'],
  },
  {
    id: 'chief-burger',
    name: 'Chief Burger',
    category: 'Shawarma & Fast Eats',
    categoryId: 'fast-food-shawarma',
    price: 3500,
    description: 'Signature stacked beef burger loaded with cheese, fresh lettuce, tomatoes, and house sauce.',
    imageUrl: '/images/menu/chief-burger.webp',
    image: '/images/menu/chief-burger.webp',
    tags: ['burger', 'beef burger', 'fast food', 'chief burger', 'chips', 'cheese'],
  },

  // ==========================================
  // 5. Pastries & Bakery
  // ==========================================
  {
    id: 'meat-pie',
    name: 'Meat Pie',
    category: 'Pastries & Bakery',
    categoryId: 'pastries-bakery',
    price: 1200,
    description: 'Traditional Nigerian meat pie with tender beef mince and diced potato filling in golden crust.',
    imageUrl: '/images/menu/meat-pie.jpg',
    image: '/images/menu/meat-pie.jpg',
    tags: ['meat pie', 'pie', 'pastry', 'bakery', 'beef', 'snack'],
  },
  {
    id: 'chicken-pie',
    name: 'Chicken Pie',
    category: 'Pastries & Bakery',
    categoryId: 'pastries-bakery',
    price: 1400,
    description: 'Golden flaky pastry crust packed with savory minced chicken, carrots, and potatoes.',
    imageUrl: '/images/menu/chicken-pie.webp',
    image: '/images/menu/chicken-pie.webp',
    tags: ['pie', 'chicken pie', 'pastry', 'bakery', 'snack'],
  },

  // ==========================================
  // 6. Local & African Classics
  // ==========================================
  {
    id: 'fried-plantain',
    name: 'Fried Plantain (Dodo)',
    category: 'Local & African Classics',
    categoryId: 'local-specialties',
    price: 1200,
    description: 'Caramelized golden ripe sweet plantain slices, freshly fried to perfection.',
    imageUrl: '/images/menu/fried-plantain.webp',
    image: '/images/menu/fried-plantain.webp',
    tags: ['plantain', 'dodo', 'fried plantain', 'side', 'sweet plantain', 'alloco'],
  },
  {
    id: 'porridge-yam',
    name: 'Yam Porridge (Asaro)',
    category: 'Local & African Classics',
    categoryId: 'local-specialties',
    price: 2800,
    description: 'Comforting yam pottage cooked in palm oil, smoked fish flakes, and chopped scent leaves.',
    imageUrl: '/images/menu/porridge-yam.jpg',
    image: '/images/menu/porridge-yam.jpg',
    tags: ['asaro', 'yam porridge', 'porridge', 'yam', 'local', 'pottage'],
  },
  {
    id: 'moimoi',
    name: 'Moi Moi',
    category: 'Local & African Classics',
    categoryId: 'local-specialties',
    price: 1000,
    description: 'Savory steamed bean pudding blended with crayfish, sweet peppers, and boiled egg.',
    imageUrl: '/images/menu/moimoi.webp',
    image: '/images/menu/moimoi.webp',
    tags: ['moimoi', 'moi moi', 'beans', 'pudding', 'local', 'steamed beans'],
  },

  // ==========================================
  // 7. Breakfast & Café
  // ==========================================
  {
    id: 'boiled-yam',
    name: 'Boiled Yam',
    category: 'Breakfast & Café',
    categoryId: 'breakfast-cafe',
    price: 1500,
    description: 'Fluffy white yam slices boiled to a tender finish, ideal with egg sauce or spicy stew.',
    imageUrl: '/images/menu/boiled-yam.webp',
    image: '/images/menu/boiled-yam.webp',
    tags: ['yam', 'boiled yam', 'breakfast', 'tuber'],
  },
  {
    id: 'egg-sauce',
    name: 'Egg Sauce',
    category: 'Breakfast & Café',
    categoryId: 'breakfast-cafe',
    price: 1800,
    description: 'Nigerian homestyle scrambled egg sauce sautéed with fresh tomatoes, onions, and scotch bonnet.',
    imageUrl: '/images/menu/egg-sauce.webp',
    image: '/images/menu/egg-sauce.webp',
    tags: ['egg sauce', 'sauce', 'breakfast', 'eggs', 'sauté', 'tomatoes'],
  },

  // ==========================================
  // 8. Salads & Healthy
  // ==========================================
  {
    id: 'coleslaw',
    name: 'Creamy Coleslaw',
    category: 'Salads & Healthy',
    categoryId: 'healthy-salads',
    price: 1500,
    description: 'Crispy shredded cabbage, sweet carrots, and creamy dressing tossed fresh daily.',
    imageUrl: '/images/menu/coleslaw.jpg',
    image: '/images/menu/coleslaw.jpg',
    tags: ['coleslaw', 'salad', 'healthy', 'greens', 'cabbage', 'vegetables'],
  },

  // ==========================================
  // 9. Drinks & Smoothies
  // ==========================================
  {
    id: '5alive-berry-blast-78cl',
    name: '5Alive Berry Blast (78cl)',
    category: 'Drinks & Smoothies',
    categoryId: 'drinks-beverages',
    price: 1200,
    description: 'Refreshing 5Alive Berry Blast juice blend packed with natural berry flavor.',
    imageUrl: '/images/menu/5alive-berry-blast-78cl.webp',
    image: '/images/menu/5alive-berry-blast-78cl.webp',
    tags: ['5alive', 'berry', 'juice', 'drink', 'beverage', 'cold', 'fruit juice'],
  },
  {
    id: '5alive-cocopine-78cl',
    name: '5Alive Cocopine (78cl)',
    category: 'Drinks & Smoothies',
    categoryId: 'drinks-beverages',
    price: 1200,
    description: 'Tropical coconut and pineapple juice blend, chilled to perfection.',
    imageUrl: '/images/menu/5alive-cocopine-78cl.jpg',
    image: '/images/menu/5alive-cocopine-78cl.jpg',
    tags: ['5alive', 'cocopine', 'coconut', 'pineapple', 'juice', 'drink', 'beverage'],
  },
  {
    id: '5alive-mango-burst-90cl',
    name: '5Alive Mango Burst (90cl)',
    category: 'Drinks & Smoothies',
    categoryId: 'drinks-beverages',
    price: 1400,
    description: 'Rich and luscious mango fruit drink bursting with exotic flavor.',
    imageUrl: '/images/menu/5alive-mango-burst-90cl.jpg',
    image: '/images/menu/5alive-mango-burst-90cl.jpg',
    tags: ['5alive', 'mango', 'burst', 'juice', 'drink', 'beverage'],
  },
  {
    id: '5alive-pulpy-orange-85cl',
    name: '5Alive Pulpy Orange (85cl)',
    category: 'Drinks & Smoothies',
    categoryId: 'drinks-beverages',
    price: 1300,
    description: 'Real orange juice packed with juicy pulp for a classic citrus splash.',
    imageUrl: '/images/menu/5alive-pulpy-orange-85cl.jpg',
    image: '/images/menu/5alive-pulpy-orange-85cl.jpg',
    tags: ['5alive', 'pulpy orange', 'orange', 'juice', 'drink', 'beverage', 'citrus'],
  },
  {
    id: 'coca-cola-35cl',
    name: 'Coca-Cola (35cl Glass)',
    category: 'Drinks & Smoothies',
    categoryId: 'drinks-beverages',
    price: 500,
    description: 'Classic ice-cold Coca-Cola in the iconic 35cl returnable glass bottle.',
    imageUrl: '/images/menu/coca-cola-35cl.jpg',
    image: '/images/menu/coca-cola-35cl.jpg',
    tags: ['coca cola', 'coke', 'soda', 'soft drink', 'glass', 'drink'],
  },
  {
    id: 'coca-cola',
    name: 'Coca-Cola (PET)',
    category: 'Drinks & Smoothies',
    categoryId: 'drinks-beverages',
    price: 600,
    description: 'Chilled Coca-Cola PET bottle for on-the-go refreshment.',
    imageUrl: '/images/menu/coca-cola.webp',
    image: '/images/menu/coca-cola.webp',
    tags: ['coca cola', 'coke', 'soda', 'soft drink', 'pet', 'drink'],
  },
  {
    id: 'fanta-orange-35cl',
    name: 'Fanta Orange (35cl Glass)',
    category: 'Drinks & Smoothies',
    categoryId: 'drinks-beverages',
    price: 500,
    description: 'Sparkling orange soda in chilled 35cl glass bottle.',
    imageUrl: '/images/menu/fanta-orange-35cl.png',
    image: '/images/menu/fanta-orange-35cl.png',
    tags: ['fanta', 'orange', 'soda', 'soft drink', 'glass'],
  },
  {
    id: 'fanta-orange-pet',
    name: 'Fanta Orange (PET)',
    category: 'Drinks & Smoothies',
    categoryId: 'drinks-beverages',
    price: 600,
    description: 'Zesty orange flavor in a chilled PET bottle.',
    imageUrl: '/images/menu/fanta-orange-pet.webp',
    image: '/images/menu/fanta-orange-pet.webp',
    tags: ['fanta', 'orange', 'soda', 'soft drink', 'pet'],
  },
  {
    id: 'sprite-35cl',
    name: 'Sprite (35cl Glass)',
    category: 'Drinks & Smoothies',
    categoryId: 'drinks-beverages',
    price: 500,
    description: 'Crisp lemon-lime soda in chilled 35cl glass bottle.',
    imageUrl: '/images/menu/sprite-35cl.jpg',
    image: '/images/menu/sprite-35cl.jpg',
    tags: ['sprite', 'soda', 'lemon lime', 'glass', 'soft drink'],
  },
  {
    id: 'sprite-50cl',
    name: 'Sprite (50cl PET)',
    category: 'Drinks & Smoothies',
    categoryId: 'drinks-beverages',
    price: 700,
    description: 'Chilled 50cl PET bottle of bubbly lemon-lime Sprite.',
    imageUrl: '/images/menu/sprite-50cl.jpg',
    image: '/images/menu/sprite-50cl.jpg',
    tags: ['sprite', 'soda', 'lemon lime', 'pet', 'soft drink'],
  },
  {
    id: 'sprite-lemon-pet',
    name: 'Sprite Lemon+ (PET)',
    category: 'Drinks & Smoothies',
    categoryId: 'drinks-beverages',
    price: 700,
    description: 'Extra refreshing lemon infused Sprite PET bottle.',
    imageUrl: '/images/menu/sprite-lemon-pet.webp',
    image: '/images/menu/sprite-lemon-pet.webp',
    tags: ['sprite', 'lemon', 'soda', 'soft drink', 'pet'],
  },
  {
    id: 'schweppes-mojito',
    name: 'Schweppes Mojito',
    category: 'Drinks & Smoothies',
    categoryId: 'drinks-beverages',
    price: 1000,
    description: 'Sparkling lime and mint flavored premium carbonated drink.',
    imageUrl: '/images/menu/schweppes-mojito.png',
    image: '/images/menu/schweppes-mojito.png',
    tags: ['schweppes', 'mojito', 'lime', 'mint', 'can', 'soda'],
  },
  {
    id: 'monster-energy',
    name: 'Monster Energy Drink',
    category: 'Drinks & Smoothies',
    categoryId: 'drinks-beverages',
    price: 2000,
    description: 'Original green Monster Energy can for peak focus and stamina.',
    imageUrl: '/images/menu/monster-energy.png',
    image: '/images/menu/monster-energy.png',
    tags: ['monster', 'energy', 'energy drink', 'can', 'caffeine'],
  },
  {
    id: 'predator-energy',
    name: 'Predator Energy Drink',
    category: 'Drinks & Smoothies',
    categoryId: 'drinks-beverages',
    price: 1000,
    description: 'Crisp and invigorating malted Predator energy drink.',
    imageUrl: '/images/menu/predator-energy.jpg',
    image: '/images/menu/predator-energy.jpg',
    tags: ['predator', 'energy', 'energy drink', 'malt', 'caffeine'],
  },
  {
    id: 'mineral-water-75cl',
    name: 'Mineral Water (75cl)',
    category: 'Drinks & Smoothies',
    categoryId: 'drinks-beverages',
    price: 500,
    description: 'Pure bottled natural spring water, crisp and chilled.',
    imageUrl: '/images/menu/mineral-water-75cl.png',
    image: '/images/menu/mineral-water-75cl.png',
    tags: ['water', 'mineral water', 'bottled water', 'table water', 'drink', 'spring water'],
  },
];

/**
 * Filter items by category or keyword search
 */
export function getMenuLibraryItems(category?: string, search?: string): MenuItemLibraryEntry[] {
  return MENU_LIBRARY.filter((item) => {
    if (category && category !== 'All' && item.category !== category) {
      return false;
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const inName = item.name.toLowerCase().includes(q);
      const inDesc = item.description.toLowerCase().includes(q);
      const inCategory = item.category.toLowerCase().includes(q);
      const inTags = item.tags.some((t) => t.toLowerCase().includes(q));
      if (!inName && !inDesc && !inCategory && !inTags) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Lookup by ID or exact name
 */
export function findMenuLibraryItem(idOrName: string): MenuItemLibraryEntry | undefined {
  const norm = idOrName.trim().toLowerCase();
  return MENU_LIBRARY.find(
    (item) => item.id.toLowerCase() === norm || item.name.toLowerCase() === norm
  );
}

/**
 * Smart image matcher: Given any freeform dish name, finds the most relevant
 * library image. Returns null if confidence is low.
 */
export function matchImageForMenuItem(name: string): string | null {
  if (!name || typeof name !== 'string') return null;
  const q = name.toLowerCase().trim();

  // 1. Direct or strong phrase matches
  if (q.includes('afang')) return '/images/menu/afang-soup.webp';
  if (q.includes('edikang') || q.includes('edikaikong') || (q.includes('vegetable') && q.includes('soup'))) return '/images/menu/vegetable-soup.jpg';
  if (q.includes('egusi')) return '/images/menu/egusi-soup.webp';
  if (q.includes('ogbono')) return '/images/menu/ogbono-soup.jpg';
  if (q.includes('oha')) return '/images/menu/oha-soup.webp';

  if (q.includes('jollof')) return '/images/menu/jollof-rice.jpg';
  if (q.includes('fried rice')) return '/images/menu/fried-rice.webp';
  if (q.includes('banga rice')) return '/images/menu/banga-rice.jpg';
  if (q.includes('coconut rice')) return '/images/menu/coconut-rice.jpg';
  if (q.includes('ofada')) return '/images/menu/ofada-rice.jpg';
  if (q.includes('rice and beans') || q.includes('rice & beans')) return '/images/menu/rice-and-beans.webp';
  if (q.includes('jambala') || q.includes('jambalaya')) return '/images/menu/jambala-rice.webp';
  if (q.includes('white rice')) return '/images/menu/white-rice.webp';

  if (q.includes('pounded yam')) return '/images/menu/pounded-yam.jpg';
  if (q.includes('amala')) return '/images/menu/amala.webp';
  if (q.includes('fufu') || q.includes('akpu')) return '/images/menu/fufu.webp';
  if (q.includes('garri') || q.includes('eba')) return '/images/menu/garri.webp';
  if (q.includes('tuwo')) return '/images/menu/tuwo-shinkafa.jpg';
  if (q.includes('wheat')) return '/images/menu/wheat.png';

  if (q.includes('shawarma')) return '/images/menu/shawarma.webp';
  if (q.includes('burger')) return '/images/menu/chief-burger.webp';

  if (q.includes('chicken pie')) return '/images/menu/chicken-pie.webp';
  if (q.includes('meat pie')) return '/images/menu/meat-pie.jpg';

  if (q.includes('plantain') || q.includes('dodo') || q.includes('alloco')) return '/images/menu/fried-plantain.webp';
  if (q.includes('asaro') || q.includes('yam porridge') || q.includes('porridge yam')) return '/images/menu/porridge-yam.jpg';
  if (q.includes('moi moi') || q.includes('moimoi')) return '/images/menu/moimoi.webp';
  if (q.includes('boiled yam')) return '/images/menu/boiled-yam.webp';
  if (q.includes('egg sauce')) return '/images/menu/egg-sauce.webp';
  if (q.includes('boiled egg')) return '/images/menu/boiled-egg.webp';
  if (q.includes('coleslaw') || q.includes('salad')) return '/images/menu/coleslaw.jpg';

  if (q.includes('turkey') && q.includes('pepper')) return '/images/menu/peppered-turkey.webp';
  if (q.includes('turkey')) return '/images/menu/grilled-turkey.webp';
  if (q.includes('chicken') && (q.includes('grill') || q.includes('roasted') || q.includes('flame'))) return '/images/menu/grilled-chicken.webp';
  if (q.includes('chicken')) return '/images/menu/grilled-chicken.webp';
  if (q.includes('goat meat') || q.includes('goat') || q.includes('ogunfe')) return '/images/menu/goat-meat.webp';
  if (q.includes('beef') || q.includes('meat')) return '/images/menu/beef-in-stew.webp';

  // Beverages
  if (q.includes('5alive') || q.includes('five alive')) {
    if (q.includes('berry')) return '/images/menu/5alive-berry-blast-78cl.webp';
    if (q.includes('coco') || q.includes('pine')) return '/images/menu/5alive-cocopine-78cl.jpg';
    if (q.includes('mango')) return '/images/menu/5alive-mango-burst-90cl.jpg';
    if (q.includes('orange') || q.includes('pulpy')) return '/images/menu/5alive-pulpy-orange-85cl.jpg';
    return '/images/menu/5alive-pulpy-orange-85cl.jpg';
  }
  if (q.includes('coke') || q.includes('coca')) {
    if (q.includes('35') || q.includes('glass')) return '/images/menu/coca-cola-35cl.jpg';
    return '/images/menu/coca-cola.webp';
  }
  if (q.includes('fanta')) {
    if (q.includes('35') || q.includes('glass')) return '/images/menu/fanta-orange-35cl.png';
    return '/images/menu/fanta-orange-pet.webp';
  }
  if (q.includes('sprite')) {
    if (q.includes('35') || q.includes('glass')) return '/images/menu/sprite-35cl.jpg';
    if (q.includes('lemon')) return '/images/menu/sprite-lemon-pet.webp';
    return '/images/menu/sprite-50cl.jpg';
  }
  if (q.includes('mojito') || q.includes('schweppes')) return '/images/menu/schweppes-mojito.png';
  if (q.includes('monster')) return '/images/menu/monster-energy.png';
  if (q.includes('predator')) return '/images/menu/predator-energy.jpg';
  if (q.includes('water') || q.includes('eva') || q.includes('nestle') || q.includes('aquafina')) return '/images/menu/mineral-water-75cl.png';

  // 2. Keyword fallback matching
  for (const item of MENU_LIBRARY) {
    for (const tag of item.tags) {
      if (q === tag || q.includes(` ${tag} `) || q.startsWith(`${tag} `) || q.endsWith(` ${tag}`)) {
        return item.imageUrl;
      }
    }
  }

  return null;
}

/**
 * Find library item metadata by image URL
 */
export function findLibraryItemByImageUrl(imageUrl?: string | null): MenuItemLibraryEntry | null {
  if (!imageUrl) return null;
  const clean = imageUrl.trim();
  return MENU_LIBRARY.find((item) => item.imageUrl === clean) || null;
}
