import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  normalizeFoodCategory,
  normalizeCategoryId,
  getFoodCategoryById,
  inferCanonicalCategoriesForRestaurant,
  doesRestaurantMatchCategory,
  STANDARDIZED_FOOD_CATEGORIES,
} from './food-categories';

describe('CityOS Standardized Food Categories & Normalizer', () => {
  it('should have all expected canonical categories with valid properties', () => {
    assert.ok(STANDARDIZED_FOOD_CATEGORIES.length >= 10);
    for (const cat of STANDARDIZED_FOOD_CATEGORIES) {
      assert.ok(cat.id, 'category has an id');
      assert.ok(cat.label, 'category has a label');
      assert.ok(cat.shortLabel, 'category has a shortLabel');
      assert.ok(cat.emoji, 'category has an emoji');
      assert.ok(Array.isArray(cat.keywords), 'category has keywords array');
    }
  });

  it('should resolve canonical IDs and legacy aliases correctly', () => {
    assert.strictEqual(normalizeCategoryId('soups'), 'soups-swallow');
    assert.strictEqual(normalizeCategoryId('jollof'), 'rice-jollof');
    assert.strictEqual(normalizeCategoryId('suya'), 'suya-grills');
    assert.strictEqual(normalizeCategoryId('chicken'), 'chicken-meat');
    assert.strictEqual(normalizeCategoryId('shawarma'), 'fast-food-shawarma');
    assert.strictEqual(normalizeCategoryId('pizza'), 'pizza-pasta');
    assert.strictEqual(normalizeCategoryId('pastries'), 'pastries-bakery');
    assert.strictEqual(normalizeCategoryId('drinks'), 'drinks-beverages');
    assert.strictEqual(normalizeCategoryId('rice-jollof'), 'rice-jollof');

    const cat = getFoodCategoryById('soups');
    assert.ok(cat);
    assert.strictEqual(cat?.id, 'soups-swallow');
    assert.strictEqual(cat?.emoji, '🍲');
  });

  it('should normalize merchant cuisine text into canonical categories', () => {
    // Soups & Swallow
    assert.strictEqual(normalizeFoodCategory('Authentic Calabar Soups').id, 'soups-swallow');
    assert.strictEqual(normalizeFoodCategory('Edikang Ikong & Pounded Yam').id, 'soups-swallow');
    assert.strictEqual(normalizeFoodCategory('Traditional Afang Soup').id, 'soups-swallow');

    // Jollof & Rice
    assert.strictEqual(normalizeFoodCategory('Smoky Nigerian Party Jollof').id, 'rice-jollof');
    assert.strictEqual(normalizeFoodCategory('Fried Rice & Plantain').id, 'rice-jollof');
    assert.strictEqual(normalizeFoodCategory('Ofada Rice Special').id, 'rice-jollof');

    // Suya & Grills
    assert.strictEqual(normalizeFoodCategory('Charcoal Grills, Suya & BBQ').id, 'suya-grills');
    assert.strictEqual(normalizeFoodCategory('Point & Kill Catfish Grill').id, 'suya-grills');
    assert.strictEqual(normalizeFoodCategory('Spicy Asun & Meat Grills').id, 'suya-grills');

    // Chicken & Proteins
    assert.strictEqual(normalizeFoodCategory('Peppered Chicken & Turkey').id, 'chicken-meat');
    assert.strictEqual(normalizeFoodCategory('Crispy Fried Wings').id, 'chicken-meat');

    // Shawarma & Fast Eats
    assert.strictEqual(normalizeFoodCategory('Fast Food & Shawarma').id, 'fast-food-shawarma');
    assert.strictEqual(normalizeFoodCategory('Gourmet Burgers & Fries').id, 'fast-food-shawarma');

    // Pizza & Pasta
    assert.strictEqual(normalizeFoodCategory('Stone-Baked Pizza & Pasta').id, 'pizza-pasta');
    assert.strictEqual(normalizeFoodCategory('Stir Fry Spaghetti & Noodles').id, 'pizza-pasta');

    // Pastries & Bakery
    assert.strictEqual(normalizeFoodCategory('Bakery & Confectionery').id, 'pastries-bakery');
    assert.strictEqual(normalizeFoodCategory('Meatpie and Fresh Doughnuts').id, 'pastries-bakery');

    // Drinks & Smoothies
    assert.strictEqual(normalizeFoodCategory('Cocktails & Chilled Drinks').id, 'drinks-beverages');
    assert.strictEqual(normalizeFoodCategory('Fresh Smoothies & Juices').id, 'drinks-beverages');

    // Breakfast & Café
    assert.strictEqual(normalizeFoodCategory('Morning Breakfast & Waffles').id, 'breakfast-cafe');

    // Salads & Healthy
    assert.strictEqual(normalizeFoodCategory('Fresh Green Salad & Parfait').id, 'healthy-salads');

    // Local Specialties
    assert.strictEqual(normalizeFoodCategory('Catfish Pepper Soup & Bole').id, 'local-specialties');
    assert.strictEqual(normalizeFoodCategory('Native Ekpang Nkukwo Pot').id, 'local-specialties');
  });

  it('should intelligently infer category from dish name when merchant category is generic', () => {
    // Generic category: "Mains"
    assert.strictEqual(
      normalizeFoodCategory('Mains', 'Afang Soup with Goat Meat and Garri').id,
      'soups-swallow'
    );
    assert.strictEqual(
      normalizeFoodCategory('Mains', 'Party Jollof Rice with Dodo').id,
      'rice-jollof'
    );
    assert.strictEqual(
      normalizeFoodCategory('Mains', 'Grilled Quarter Chicken with Slaw').id,
      'suya-grills'
    );

    // Generic category: "Starters"
    assert.strictEqual(
      normalizeFoodCategory('Starters', 'Spicy Beef Suya Skewer').id,
      'suya-grills'
    );

    // Generic category: "Drinks"
    assert.strictEqual(
      normalizeFoodCategory('Drinks', 'Cold Bottle of Chapman').id,
      'drinks-beverages'
    );

    // Generic category: "Sides"
    assert.strictEqual(
      normalizeFoodCategory('Sides', 'Sweet Fried Plantain (Dodo)').id,
      'local-specialties'
    );
  });

  it('should infer all canonical categories for a restaurant across its cuisines and dishes', () => {
    const restaurant = {
      category: 'Restaurant',
      storeCategory: 'Native Calabar Kitchen',
      cuisines: ['Afang Soup', 'Charcoal Grills'],
      menuItems: [
        { category: 'Mains', name: 'Party Jollof Rice' },
        { category: 'Drinks', name: 'Zobo Drink' },
      ],
    };

    const categories = inferCanonicalCategoriesForRestaurant(restaurant);
    assert.ok(categories.includes('soups-swallow'), 'includes soups-swallow');
    assert.ok(categories.includes('suya-grills'), 'includes suya-grills');
    assert.ok(categories.includes('rice-jollof'), 'includes rice-jollof');
    assert.ok(categories.includes('drinks-beverages'), 'includes drinks-beverages');
  });

  it('should accurately match restaurants against target categories including "all"', () => {
    const restaurant = {
      category: 'Fast Casual',
      cuisines: ['Shawarma & Fast Eats'],
      menuItems: [{ category: 'Food', name: 'Double Cheese Burger & Fries' }],
    };

    assert.strictEqual(doesRestaurantMatchCategory(restaurant, 'all'), true);
    assert.strictEqual(doesRestaurantMatchCategory(restaurant, 'fast-food-shawarma'), true);
    assert.strictEqual(doesRestaurantMatchCategory(restaurant, 'shawarma'), true); // alias
    assert.strictEqual(doesRestaurantMatchCategory(restaurant, 'soups-swallow'), false);
  });
});
