-- Apply before deploying the category-aware frontend.
-- Existing listings remain available under Other until their owners categorize them.
begin;

alter table public.products
  add column category text not null default 'other'
  constraint products_category_check check (category in (
    'furniture',
    'home-decor',
    'kitchen-dining',
    'electronics',
    'tools-hardware',
    'lawn-garden',
    'clothing-shoes',
    'kids-baby',
    'toys-games',
    'sports-outdoors',
    'books-media',
    'collectibles-antiques',
    'jewelry-accessories',
    'automotive',
    'pet-supplies',
    'crafts-hobbies',
    'free-stuff',
    'other'
  ));

commit;
