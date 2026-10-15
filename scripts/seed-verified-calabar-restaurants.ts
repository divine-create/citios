import 'dotenv/config';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

interface RestaurantSeedData {
  name: string;
  slug: string;
  storeCategory: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  website: string;
  hours: string;
  coverImage: string;
  images: string[];
  tags: string[];
  deliveryEta: string;
  menuItems: {
    name: string;
    category: string;
    price: number;
    description: string;
    imageUrl: string;
  }[];
}

const RESTAURANTS: RestaurantSeedData[] = [
  {
    name: 'Chicken Republic (Marian)',
    slug: 'chicken-republic-marian',
    storeCategory: 'Fast Food',
    description: 'Nigeria’s favorite quick-service chicken spot on Marian Road, Calabar. Soulfully spiced fried chicken, signature Naija jollof & fried rice refuel meals, and Chief burgers.',
    address: '85 Ndidem Usang Iso Rd (Marian Road), Calabar, Cross River State',
    latitude: 4.9680,
    longitude: 8.3330,
    phone: '08090165942',
    website: 'https://www.chicken-republic.net',
    hours: '08:00 AM - 10:00 PM daily',
    coverImage: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=1000&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=1000&auto=format&fit=crop&q=80'
    ],
    tags: ['Fast Food', 'Crispy Chicken', 'Jollof Refuel', 'Rotisserie', 'Chief Burger'],
    deliveryEta: '20 - 30 min',
    menuItems: [
      {
        name: 'Refuel Jollof & Chicken',
        category: 'Refuel Meals',
        price: 2400,
        description: 'Authentic Nigerian party jollof rice paired with 1 piece of soulfully spiced fried chicken and pepper sauce.',
        imageUrl: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Refuel Fried Rice & Chicken',
        category: 'Refuel Meals',
        price: 2400,
        description: 'Seasoned stir-fried rice with diced vegetables, sweet corn, and a golden spiced fried chicken piece.',
        imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Citizens Meal',
        category: 'Value Meals',
        price: 1900,
        description: 'Budget-friendly staple meal with choice of rice and 1 piece of seasoned chicken.',
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Chief Burger Meal with Fries',
        category: 'Burgers & Sandwiches',
        price: 3800,
        description: 'Crispy fried chicken breast fillet in a toasted sesame bun with cheese, lettuce, and secret sauce, served with fries and drink.',
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Full Rotisserie Roast Chicken',
        category: 'Rotisserie & Flame Grill',
        price: 11000,
        description: 'Whole plump chicken slow-roasted on the spit with African herbs and secret spices.',
        imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Half Rotisserie Roast Chicken',
        category: 'Rotisserie & Flame Grill',
        price: 5800,
        description: 'Half rotisserie chicken slow-roasted until tender and juicy inside with crispy golden skin.',
        imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Soulfully Spiced Fried Chicken (1 pc)',
        category: 'Chicken Sides',
        price: 1400,
        description: 'Single piece of freshly fried chicken coated in Chicken Republic’s proprietary peppery crumb.',
        imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Crunchy Spiced Wings (6 pcs)',
        category: 'Chicken Sides',
        price: 3500,
        description: 'Six crispy battered chicken wingettes and drumettes tossed with mild pepper seasoning.',
        imageUrl: 'https://images.unsplash.com/photo-1527477378408-1bc0b534b413?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Fried Sweet Plantain (Dodo)',
        category: 'Sides & Add-ons',
        price: 900,
        description: 'Golden caramelized ripe fried plantain slices.',
        imageUrl: 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Cold Bottled Drink (50cl PET)',
        category: 'Drinks & Beverages',
        price: 600,
        description: 'Chilled refreshing soft drink (Coca-Cola, Fanta, Sprite, or Schweppes).',
        imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    name: "Domino's Pizza & Cold Stone (Marian)",
    slug: 'dominos-pizza-coldstone-marian',
    storeCategory: 'Pizza & Ice Cream',
    description: 'The premier artisan pizza and dessert destination on Marian Road, Calabar. Freshly baked hand-tossed pizzas, cheesy stuffed bread, barbecue wings, and rich Cold Stone creamery creations.',
    address: '73 Ndidem Usang Iso Rd (Marian Road), Leopard Town, Calabar, Cross River State',
    latitude: 4.9660,
    longitude: 8.3325,
    phone: '07007009999',
    website: 'https://www.dominos.ng',
    hours: '09:00 AM - 10:00 PM daily',
    coverImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1000&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=1000&auto=format&fit=crop&q=80'
    ],
    tags: ['Pizza', 'BBQ Chicken', 'Pepperoni', 'Cheesy Bread', 'Ice Cream', 'Desserts'],
    deliveryEta: '25 - 35 min',
    menuItems: [
      {
        name: 'Medium BBQ Chicken Pizza',
        category: 'Classic Pizzas',
        price: 6800,
        description: 'Hand-tossed crust topped with tender grilled chicken slices, red onions, mozzarella, and a smoky barbecue swirl.',
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Medium Pepperoni Feast Pizza',
        category: 'Classic Pizzas',
        price: 7200,
        description: 'Loaded with premium sliced beef pepperoni, Italian herb tomato sauce, and molten melted mozzarella.',
        imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Medium Beef Suya Pizza (Local Favorite)',
        category: 'Specialty Pizzas',
        price: 6800,
        description: 'Tender spicy suya beef ribbons, fresh green peppers, red onions, and mozzarella cheese with suya spice dust.',
        imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Large Loaded Meat Lovers Pizza',
        category: 'Specialty Pizzas',
        price: 10500,
        description: 'Double cheese, beef pepperoni, minced seasoned beef, chicken sausage, and Italian herb tomato sauce.',
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Stuffed Cheesy Bread',
        category: 'Sides & Breads',
        price: 2800,
        description: 'Oven-baked crust stuffed with garlic butter and melted mozzarella cheese, served with marinara dipping sauce.',
        imageUrl: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'BBQ Chicken Wings (6 pcs)',
        category: 'Wings & Starters',
        price: 3800,
        description: 'Succulent roasted bone-in chicken wings tossed in rich hickory smoked BBQ sauce.',
        imageUrl: 'https://images.unsplash.com/photo-1527477378408-1bc0b534b413?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Cold Stone "Like It" Signature Cup',
        category: 'Cold Stone Ice Cream',
        price: 2600,
        description: 'Smooth, creamy ice cream hand-mixed on a frozen granite stone with hot fudge, brownies, and roasted nuts.',
        imageUrl: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Cold Stone "Love It" Signature Cup',
        category: 'Cold Stone Ice Cream',
        price: 3200,
        description: 'Generous serving of premium Cold Stone ice cream loaded with waffle crunch, cookie dough, and caramel.',
        imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Cinnastix Breadsticks with Sweet Glaze',
        category: 'Desserts',
        price: 2400,
        description: 'Freshly baked warm breadsticks dusted with cinnamon sugar, served with sweet vanilla cream icing.',
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Chilled 1.5L Beverage Bottle',
        category: 'Drinks & Beverages',
        price: 1200,
        description: 'Chilled 1.5-liter family bottle of Coca-Cola, Fanta, or Sprite.',
        imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    name: 'Native Delicacies Restaurant',
    slug: 'native-delicacies-restaurant-calabar',
    storeCategory: 'Authentic Calabar Soups',
    description: 'Calabar’s premier cultural kitchen dedicated to authentic Cross River cuisine. Renowned for authentic Ekpang Nkukwo, rich Edikang Ikong, Afang soup with periwinkles, and coastal Fisherman soup.',
    address: '118 Murtala Mohammed Highway, Ikot Ekan Edem, Calabar, Cross River State',
    latitude: 4.9790,
    longitude: 8.3370,
    phone: '08037241920',
    website: 'https://nativedelicaciescalabar.com',
    hours: '08:00 AM - 09:00 PM daily',
    coverImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1000&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=1000&auto=format&fit=crop&q=80'
    ],
    tags: ['Calabar Soups', 'Ekpang Nkukwo', 'Edikang Ikong', 'Afang', 'Fisherman Soup', 'Pounded Yam'],
    deliveryEta: '30 - 45 min',
    menuItems: [
      {
        name: 'Calabar Ekpang Nkukwo (Special Pot)',
        category: 'Native Specialties',
        price: 3200,
        description: 'Authentic Efik delicacy of grated cocoyam & water yam wrapped in tender leaves, slow-cooked with periwinkles, smoked catfish, dried prawns, and rich palm oil.',
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Edikang Ikong Soup & Swallow',
        category: 'Traditional Soups',
        price: 4000,
        description: 'The king of Calabar soups: waterleaf and fluted pumpkin leaves (ugwu) simmered with cow leg, beef, periwinkles, and smoked fish, served with smooth Pounded Yam or Garri.',
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Afang Soup & Swallow',
        category: 'Traditional Soups',
        price: 3800,
        description: 'Shredded wild afang leaves and fresh waterleaves cooked with stockfish head, dried crayfish, assorted meat, and yellow scotch bonnets, with choice of swallow.',
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Fisherman Seafood Soup (Coastal Special)',
        category: 'Traditional Soups',
        price: 6500,
        description: 'Aromatic coastal seafood broth loaded with fresh river catfish, blue crabs, large prawns, periwinkles, and fresh scent leaves.',
        imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'White Soup (Afia Efere) & Goat Meat',
        category: 'Traditional Soups',
        price: 4200,
        description: 'Traditional oil-less soup thickened with pounded yam, spiced with aromatic uyayak pods, and cooked with tender goat meat.',
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Atama Palm Extract Soup & Swallow',
        category: 'Traditional Soups',
        price: 3800,
        description: 'Aromatic Cross River palm fruit concentrate soup seasoned with atama herb leaves, cow skin (kanda), dry fish, and periwinkles.',
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Smoky Seafood Native Jollof Rice',
        category: 'Native Rice Dishes',
        price: 3200,
        description: 'Firewood-cooked brown native rice seasoned with crayfish, dry fish flakes, scent leaves, and whole scotch bonnet peppers.',
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Fresh Catfish Pepper Soup',
        category: 'Pepper Soups',
        price: 3500,
        description: 'Steaming bowl of spicy herbal broth containing a whole fresh catfish and African scent leaves.',
        imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Portion of Pounded Yam / Garri (Extra Swallow)',
        category: 'Swallows & Sides',
        price: 700,
        description: 'Piping hot, smooth portion of pounded yam, semo, or yellow garri.',
        imageUrl: 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Fresh Calabar Palm Wine (Cold Bottle)',
        category: 'Drinks & Beverages',
        price: 1000,
        description: 'Authentic tapped sweet fresh palm wine served well-chilled.',
        imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    name: "Freddy's Restaurant",
    slug: 'freddys-restaurant-calabar',
    storeCategory: 'Fine Dining & Grills',
    description: 'Calabar’s premier upscale dining establishment situated on Atekong Drive. Famous for fresh Atlantic grilled king prawns, aged steak tenderloins, Lebanese mezze, and international cuisine.',
    address: '90 Atekong Drive, State Housing Estate, Calabar, Cross River State',
    latitude: 4.9720,
    longitude: 8.3420,
    phone: '08033095431',
    website: 'https://freddysrestaurantcalabar.com',
    hours: '12:00 PM - 10:30 PM daily',
    coverImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1000&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=1000&auto=format&fit=crop&q=80'
    ],
    tags: ['Fine Dining', 'Grilled Prawns', 'Beef Steak', 'Shawarma', 'Lebanese Mezze', 'Seafood'],
    deliveryEta: '30 - 45 min',
    menuItems: [
      {
        name: 'Jumbo Atlantic Grilled King Prawns',
        category: 'Seafood Specialties',
        price: 14500,
        description: 'Fresh ocean king prawns basted in lemon-garlic butter, charcoal-grilled, and served with French fries or fragrant rice.',
        imageUrl: 'https://images.unsplash.com/photo-1559742811-822873691df8?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Grilled Beef Tenderloin Fillet Steak',
        category: 'Grills & Steaks',
        price: 11500,
        description: 'Prime cut tenderloin grilled to your preference, accompanied by creamy peppercorn sauce and roasted potatoes.',
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: "Freddy's Mixed Grill Platter",
        category: 'Grills & Steaks',
        price: 12000,
        description: 'Sumptuous assortment of grilled lamb chops, chicken shish tawook skewers, kofta kebab, and grilled tomatoes.',
        imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Chicken Shish Tawook Platter',
        category: 'Grills & Steaks',
        price: 6500,
        description: 'Tender chicken breast chunks marinated in yogurt and Lebanese spices, served with warm pita bread and garlic toum.',
        imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Crispy Calamari Rings with Tartar',
        category: 'Starters & Mezze',
        price: 5500,
        description: 'Tender squid rings lightly dusted in seasoned flour, flash-fried golden, and served with house tartar dip.',
        imageUrl: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: "Freddy's Special Beef Shawarma Plate",
        category: 'Sandwiches & Wraps',
        price: 3500,
        description: 'Thinly sliced spiced beef wrapped in Lebanese saj bread with tomatoes, parsley, pickles, and tahini sauce.',
        imageUrl: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Authentic Hummus Dip & Warm Pita',
        category: 'Starters & Mezze',
        price: 3200,
        description: 'Silky smooth puréed chickpeas with tahini, lemon juice, garlic, extra virgin olive oil, and warm flatbread.',
        imageUrl: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Triple-Decker Club Sandwich with Fries',
        category: 'Sandwiches & Wraps',
        price: 4800,
        description: 'Toasted artisan bread layered with roast chicken breast, fried egg, cheddar, crispy lettuce, tomato, and mayo.',
        imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Mediterranean Greek Feta Salad',
        category: 'Salads & Greens',
        price: 4000,
        description: 'Crisp lettuce, ripe tomatoes, cucumbers, bell peppers, Kalamata olives, and imported Greek feta with herb dressing.',
        imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Fresh Fruit Smoothie (Pineapple & Ginger)',
        category: 'Drinks & Beverages',
        price: 2500,
        description: 'Freshly blended Calabar sweet pineapple, ripe watermelon, and a touch of zesty ginger.',
        imageUrl: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    name: 'De Choice Fast Food',
    slug: 'de-choice-fast-food-calabar',
    storeCategory: 'Fast Food',
    description: 'Calabar’s historic fast-food brand on Calabar Road. Famous for golden meat pies, sweet pastries, downtown party jollof, and crispy chicken.',
    address: '10 Calabar Road, near Bogoberi / Watt Market, Calabar, Cross River State',
    latitude: 4.9570,
    longitude: 8.3220,
    phone: '08036728190',
    website: 'https://dechoicefastfood.com',
    hours: '07:30 AM - 09:30 PM daily',
    coverImage: 'https://images.unsplash.com/photo-1621236378699-8597fee6a1ce?w=1000&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1621236378699-8597fee6a1ce?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1000&auto=format&fit=crop&q=80'
    ],
    tags: ['Fast Food', 'Meat Pie', 'Jollof Rice', 'Pastries', 'Fried Chicken'],
    deliveryEta: '20 - 30 min',
    menuItems: [
      {
        name: 'De Choice Signature Beef Meat Pie',
        category: 'Pastries & Snacks',
        price: 900,
        description: 'Flaky golden shortcrust pastry filled with tender seasoned minced beef, potatoes, and carrots.',
        imageUrl: 'https://images.unsplash.com/photo-1621236378699-8597fee6a1ce?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Special Chicken Pie',
        category: 'Pastries & Snacks',
        price: 1000,
        description: 'Rich pastry filled with juicy spiced chicken breast chunks in herb cream gravy.',
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Downtown Jollof Rice & Chicken Quarter',
        category: 'Rice & Meals',
        price: 3200,
        description: 'Smoky party jollof rice paired with a golden fried chicken quarter, coleslaw, and fried plantain.',
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Special Fried Rice & Chicken Quarter',
        category: 'Rice & Meals',
        price: 3200,
        description: 'Stir-fried rice loaded with sweet peas, carrots, sweet corn, and a crispy fried chicken quarter.',
        imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Scotch Egg (2 pcs)',
        category: 'Pastries & Snacks',
        price: 1200,
        description: 'Hard-boiled farm eggs wrapped in seasoned minced beef sausage, breaded, and deep-fried golden.',
        imageUrl: 'https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Classic Beef Sausage Roll',
        category: 'Pastries & Snacks',
        price: 700,
        description: 'Buttery puff pastry rolled around seasoned beef sausage filling.',
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Vanilla Sponge Celebration Cake Slice',
        category: 'Bakery & Cakes',
        price: 1200,
        description: 'Fluffy vanilla sponge cake layered with sweet buttercream frosting.',
        imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Cold Bottled Soft Drink (50cl)',
        category: 'Drinks & Beverages',
        price: 600,
        description: 'Chilled carbonated soft drink or malt.',
        imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop&q=80'
      }
    ]
  }
];

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    console.log('=== SEEDING VERIFIED CALABAR RESTAURANTS ===\n');

    await client.query('BEGIN');

    // 1. Resolve Calabar City
    const cityRes = await client.query(`SELECT id FROM "city" WHERE slug = 'calabar'`);
    if (cityRes.rows.length === 0) {
      throw new Error('Calabar city not found!');
    }
    const calabarCityId = cityRes.rows[0].id;
    console.log(`Resolved Calabar City ID: ${calabarCityId}`);

    for (const resto of RESTAURANTS) {
      console.log(`\n--- Processing: ${resto.name} ---`);

      // Check if existing
      const existingOrg = await client.query(`SELECT id FROM "organization" WHERE LOWER(name) = LOWER($1)`, [resto.name]);
      if (existingOrg.rows.length > 0) {
        const oldId = existingOrg.rows[0].id;
        console.log(`Cleaning up old entry for ${resto.name}...`);
        await client.query(`DELETE FROM "discoveryListing" WHERE "organizationId" = $1`, [oldId]);
        await client.query(`DELETE FROM "organizationContactPoint" WHERE "organizationId" = $1`, [oldId]);
        await client.query(`DELETE FROM "restaurantSettings" WHERE "organizationId" = $1`, [oldId]);
        await client.query(`DELETE FROM "menuItem" WHERE "organizationId" = $1`, [oldId]);
        await client.query(`DELETE FROM "location" WHERE "organizationId" = $1`, [oldId]);
        await client.query(`DELETE FROM "wallet" WHERE "organizationId" = $1`, [oldId]);
        await client.query(`DELETE FROM "organization" WHERE id = $1`, [oldId]);
      }

      const orgId = uuidv4();
      const locId = uuidv4();
      const listingId = uuidv4();
      const walletId = uuidv4();

      // 1. Insert Organization
      await client.query(`
        INSERT INTO "organization" (
          id, name, type, "storeCategory", description, address, "logoAssetId", status, "createdAt"
        ) VALUES ($1, $2, 'RESTAURANT', $3, $4, $5, $6, 'ACTIVE', NOW())
      `, [
        orgId,
        resto.name,
        resto.storeCategory,
        resto.description,
        resto.address,
        resto.coverImage
      ]);

      // 2. Insert Location
      await client.query(`
        INSERT INTO "location" (
          id, "organizationId", name, address, latitude, longitude, "cityId"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        locId,
        orgId,
        `${resto.name} - Calabar`,
        resto.address,
        resto.latitude,
        resto.longitude,
        calabarCityId
      ]);

      // 3. Insert Wallet
      await client.query(`
        INSERT INTO "wallet" (
          id, "organizationId", balance, currency
        ) VALUES ($1, $2, 0.0, 'NGN')
      `, [
        walletId,
        orgId
      ]);

      // 4. Insert Restaurant Settings
      await client.query(`
        INSERT INTO "restaurantSettings" (
          id, "organizationId", "serviceStyle", "taxRate", "serviceCharge", "openingHours", "acceptsWalkIns", "nextOrderNumber"
        ) VALUES ($1, $2, 'HYBRID', 7.5, 0, $3, true, 1)
      `, [
        uuidv4(),
        orgId,
        resto.hours
      ]);

      // 5. Insert Verified Contact Points
      await client.query(`
        INSERT INTO "organizationContactPoint" (
          id, "organizationId", "locationId", type, value, "isPrimary", "isVerified", "createdAt", "updatedAt"
        ) VALUES 
          ($1, $2, $3, 'PHONE', $4, true, true, NOW(), NOW()),
          ($5, $2, $3, 'WEBSITE', $6, false, true, NOW(), NOW())
      `, [
        uuidv4(), orgId, locId, resto.phone,
        uuidv4(), resto.website
      ]);

      // 6. Insert Discovery Listing (rating is null - NO fake rating)
      const metadata = JSON.stringify({
        coverImage: resto.coverImage,
        images: resto.images,
        phone: resto.phone,
        hours: resto.hours,
        tags: resto.tags,
        sourceUrl: resto.website,
        rating: null,
        reviewCount: 0,
        isOpen: true,
        deliveryEta: resto.deliveryEta,
        isVerified: true
      });

      await client.query(`
        INSERT INTO "discoveryListing" (
          id, "organizationId", "locationId", "cityId", vertical, slug, title, description, "coverAssetId", "isActive", metadata, "createdAt"
        ) VALUES ($1, $2, $3, $4, 'RESTAURANT', $5, $6, $7, $8, true, $9, NOW())
      `, [
        listingId,
        orgId,
        locId,
        calabarCityId,
        resto.slug,
        resto.name,
        resto.description,
        resto.coverImage,
        metadata
      ]);

      // 7. Insert Menu Items
      for (const item of resto.menuItems) {
        await client.query(`
          INSERT INTO "menuItem" (
            id, name, description, price, category, "imageUrl", "isAvailable", "organizationId", "locationId"
          ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8)
        `, [
          uuidv4(),
          item.name,
          item.description,
          item.price,
          item.category,
          item.imageUrl,
          orgId,
          locId
        ]);
      }

      console.log(`✓ Added ${resto.name} with ${resto.menuItems.length} menu items.`);
    }

    await client.query('COMMIT');
    console.log('\n=== ALL RESTAURANTS COMMITTED SUCCESSFULLY ===');

    const totalRestos = await client.query(`SELECT COUNT(*) FROM "organization" WHERE type = 'RESTAURANT'`);
    const totalMenuItems = await client.query(`SELECT COUNT(*) FROM "menuItem"`);
    console.log(`Total Restaurant Organizations in DB: ${totalRestos.rows[0].count}`);
    console.log(`Total Restaurant Menu Items in DB: ${totalMenuItems.rows[0].count}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to seed verified restaurants:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
