import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  MENU_LIBRARY,
  MENU_LIBRARY_CATEGORIES,
  getMenuLibraryItems,
  findMenuLibraryItem,
  matchImageForMenuItem,
  findLibraryItemByImageUrl,
} from './menu-library';

test('Menu Library: Catalog, Physical Assets & Categorization', async (t) => {
  await t.test('1. Catalog contains exactly 50 standardized menu entries', () => {
    assert.equal(MENU_LIBRARY.length, 50, 'Catalog must contain 50 items');
  });

  await t.test('2. Every catalog item has a valid, existing image on disk', () => {
    for (const item of MENU_LIBRARY) {
      assert.ok(item.imageUrl.startsWith('/images/menu/'), `Item ${item.id} must point to /images/menu/`);
      const diskPath = path.join(process.cwd(), 'public', item.imageUrl.replace(/^\//, ''));
      assert.ok(fs.existsSync(diskPath), `Physical file must exist at ${diskPath}`);
      const stats = fs.statSync(diskPath);
      assert.ok(stats.size > 0, `Image file ${diskPath} must not be empty (size=${stats.size})`);
    }
  });

  await t.test('3. Every catalog item has required fields: id, name, category, price, description, tags', () => {
    const ids = new Set<string>();
    for (const item of MENU_LIBRARY) {
      assert.ok(item.id && !ids.has(item.id), `ID must be unique and non-empty: ${item.id}`);
      ids.add(item.id);
      assert.ok(item.name && item.name.trim().length > 0, `Name must be non-empty for ${item.id}`);
      assert.ok(item.category && item.category.trim().length > 0, `Category must be non-empty for ${item.id}`);
      assert.ok(typeof item.price === 'number' && item.price > 0, `Price must be positive for ${item.id}`);
      assert.ok(item.description && item.description.trim().length > 0, `Description must be non-empty for ${item.id}`);
      assert.ok(Array.isArray(item.tags) && item.tags.length > 0, `Tags must be populated for ${item.id}`);
    }
  });

  await t.test('4. getMenuLibraryItems filters by category accurately', () => {
    const all = getMenuLibraryItems('All');
    assert.equal(all.length, 50);

    const soups = getMenuLibraryItems('Soups & Swallow');
    assert.ok(soups.length >= 10, 'Expected at least 10 soup and swallow items');
    assert.ok(soups.every(s => s.category === 'Soups & Swallow'));

    const jollof = getMenuLibraryItems('Jollof & Rice');
    assert.ok(jollof.length >= 7, 'Expected at least 7 rice items');
    assert.ok(jollof.every(r => r.category === 'Jollof & Rice'));

    const drinks = getMenuLibraryItems('Drinks & Smoothies');
    assert.ok(drinks.length >= 14, 'Expected at least 14 drink items');
    assert.ok(drinks.every(d => d.category === 'Drinks & Smoothies'));
  });

  await t.test('5. getMenuLibraryItems filters by keyword search', () => {
    const afang = getMenuLibraryItems(undefined, 'afang');
    assert.equal(afang.length, 1);
    assert.equal(afang[0].id, 'afang-soup');

    const rice = getMenuLibraryItems(undefined, 'jollof');
    assert.ok(rice.length >= 1);
    assert.equal(rice[0].name, 'Jollof Rice');

    const energy = getMenuLibraryItems(undefined, 'energy');
    assert.ok(energy.length >= 2, 'Expected at least Monster and Predator energy drinks');
  });

  await t.test('6. findMenuLibraryItem resolves by ID and exact name', () => {
    const byId = findMenuLibraryItem('chief-burger');
    assert.ok(byId);
    assert.equal(byId?.name, 'Chief Burger');

    const byName = findMenuLibraryItem('Afang Soup');
    assert.ok(byName);
    assert.equal(byName?.id, 'afang-soup');
  });

  await t.test('7. matchImageForMenuItem resolves variations of dish names to local library assets', () => {
    // Soups
    assert.equal(matchImageForMenuItem('Calabar Afang Soup and Pounded Yam'), '/images/menu/afang-soup.webp');
    assert.equal(matchImageForMenuItem('Rich Egusi Soup with Assorted'), '/images/menu/egusi-soup.webp');
    assert.equal(matchImageForMenuItem('Edikang Ikong Vegetable Soup'), '/images/menu/vegetable-soup.jpg');

    // Rice
    assert.equal(matchImageForMenuItem('Party Jollof Rice with Fried Chicken'), '/images/menu/jollof-rice.jpg');
    assert.equal(matchImageForMenuItem('Delta Banga Rice Pot'), '/images/menu/banga-rice.jpg');
    assert.equal(matchImageForMenuItem('Ofada Rice & Spicy Sauce'), '/images/menu/ofada-rice.jpg');

    // Proteins & Fast Food
    assert.equal(matchImageForMenuItem('Flame Grilled Chicken Drumstick'), '/images/menu/grilled-chicken.webp');
    assert.equal(matchImageForMenuItem('Spicy Peppered Turkey Wings'), '/images/menu/peppered-turkey.webp');
    assert.equal(matchImageForMenuItem('Special Chicken Shawarma Roll'), '/images/menu/shawarma.webp');
    assert.equal(matchImageForMenuItem('Chief Double Burger'), '/images/menu/chief-burger.webp');

    // Drinks
    assert.equal(matchImageForMenuItem('5Alive Berry Blast Chilled'), '/images/menu/5alive-berry-blast-78cl.webp');
    assert.equal(matchImageForMenuItem('Chilled Coke Bottle'), '/images/menu/coca-cola.webp');
    assert.equal(matchImageForMenuItem('Cold Sprite Glass 35cl'), '/images/menu/sprite-35cl.jpg');
    assert.equal(matchImageForMenuItem('Predator Energy Can'), '/images/menu/predator-energy.jpg');
    assert.equal(matchImageForMenuItem('Bottled Mineral Water'), '/images/menu/mineral-water-75cl.png');
  });

  await t.test('8. findLibraryItemByImageUrl resolves metadata for valid menu library images', () => {
    const afang = findLibraryItemByImageUrl('/images/menu/afang-soup.webp');
    assert.ok(afang);
    assert.equal(afang?.name, 'Afang Soup');
    assert.equal(afang?.category, 'Soups & Swallow');

    const jollof = findLibraryItemByImageUrl('/images/menu/jollof-rice.jpg');
    assert.ok(jollof);
    assert.equal(jollof?.name, 'Jollof Rice');

    const unknown = findLibraryItemByImageUrl('/uploads/custom-photo.jpg');
    assert.equal(unknown, null);

    const empty = findLibraryItemByImageUrl('');
    assert.equal(empty, null);
  });
});
