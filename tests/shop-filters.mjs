import assert from 'node:assert/strict';
import { ITEM_CATEGORIES } from '../src/lib/itemCategories.js';
import { filterShopProducts } from '../src/lib/shopFilters.js';

const products = ITEM_CATEGORIES.map(({ value, label }, index) => ({
  id: index, category: value, title: `${label} find`, description: 'Neighborhood treasure',
}));
products.push({ id: 'legacy', title: 'Uncategorized item' });
assert.equal(ITEM_CATEGORIES.length, 18);
assert.equal(new Set(ITEM_CATEGORIES.map(({ value }) => value)).size, 18);
assert.deepEqual(filterShopProducts(products), products);
assert.deepEqual(filterShopProducts(products, { category: 'all' }), products);
for (const { value } of ITEM_CATEGORIES) {
  const results = filterShopProducts(products, { category: value });
  assert.deepEqual(results.map(({ id }) => id), value === 'other' ? [17, 'legacy'] : [products.find(p => p.category === value).id]);
}
assert.equal(filterShopProducts(products, { category: 'furniture', search: '  FURNITURE ' }).length, 1);
assert.equal(filterShopProducts(products, { category: 'furniture', search: 'neighborhood' }).length, 1);
assert.equal(filterShopProducts(products, { category: 'furniture', search: 'electronics' }).length, 0);
assert.equal(filterShopProducts(products.filter(p => p.category !== 'electronics'), { category: 'electronics' }).length, 0);
assert.deepEqual(filterShopProducts([], { category: 'all' }), []);
assert.equal(products.length, 19);
console.log('PASS: All, all 18 categories, legacy fallback, search composition, and empty results.');
