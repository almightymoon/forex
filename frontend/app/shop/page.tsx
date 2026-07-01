'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Package, Search, ShoppingBag } from 'lucide-react';
import ShopCartButton from '../../components/shop/ShopCartButton';
import { useShopCart } from '../../context/ShopCartContext';
import {
  fetchPublicProducts,
  getProductImageUrl,
  type ShopProduct,
} from '../../lib/publicProducts';

function ShopCard({ product }: { product: ShopProduct }) {
  const { addItem } = useShopCart();
  const [added, setAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  };

  return (
    <article className="shop-card-v2">
      <Link href={`/shop/${product.productId}`} className="shop-card-v2__media">
        {product.primaryImage ? (
          <img src={getProductImageUrl(product.primaryImage)} alt="" />
        ) : (
          <div className="flex h-full items-center justify-center text-black/20">
            <Package className="h-12 w-12" aria-hidden />
          </div>
        )}
        {product.category ? (
          <span className="shop-card-v2__badge">{product.category}</span>
        ) : null}
      </Link>
      <div className="shop-card-v2__body">
        <Link href={`/shop/${product.productId}`} className="shop-card-v2__body-link">
          <span className="shop-card-v2__code">{product.productId.replace(/-/g, '-').toUpperCase()}</span>
          <h2 className="shop-card-v2__name">{product.name}</h2>
          {product.shortDescription ? (
            <p className="shop-card-v2__desc">{product.shortDescription}</p>
          ) : null}
        </Link>
        <div className="shop-card-v2__footer">
          <span className="shop-card-v2__price">${Number(product.price ?? 0).toFixed(2)}</span>
          <div className="shop-card-v2__actions">
            <Link href={`/shop/${product.productId}`} className="shop-card-v2__cta">
              View
            </Link>
            <button type="button" className="shop-card-v2__cart-add" onClick={handleAddToCart}>
              {added ? 'Added' : 'Add to cart'}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ShopPage() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const data = await fetchPublicProducts({
        category: category || undefined,
        search: debouncedSearch || undefined,
      });
      if (!alive) return;
      setProducts(data.products);
      setCategories(data.categories);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [category, debouncedSearch]);

  const hasFilters = Boolean(category || debouncedSearch);

  const emptyMessage = useMemo(() => {
    if (hasFilters) return 'No products match your filters. Try a different search or category.';
    return 'No products available yet. Check back soon for new releases.';
  }, [hasFilters]);

  return (
    <div className="shop-store" data-nav-surface="light">
      <div className="shop-store__inner">
        <div className="shop-store__top">
          <div>
            <h1 className="shop-store__title">Shop</h1>
            <p className="shop-store__subtitle">
              Trading tools, templates, and premium resources — curated for forex navigators.
            </p>
          </div>
          <div className="shop-store__actions">
            <ShopCartButton />
            <Link href="/shop/my-purchases" className="shop-store__link-btn">
              <ShoppingBag className="h-4 w-4" aria-hidden />
              My purchases
            </Link>
          </div>
        </div>

        <div className="shop-store__toolbar">
          <div className="shop-store__search">
            <Search className="shop-store__search-icon" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
            />
          </div>
          {categories.length > 0 ? (
            <div className="shop-store__filters">
              <button
                type="button"
                className={`shop-store__filter${!category ? ' shop-store__filter--active' : ''}`}
                onClick={() => setCategory('')}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`shop-store__filter${category === cat ? ' shop-store__filter--active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="shop-store__loading">
            <Loader2 className="h-8 w-8 animate-spin opacity-40" aria-hidden />
            <span>Loading products…</span>
          </div>
        ) : products.length === 0 ? (
          <div className="shop-store__empty">
            <Package className="h-12 w-12 opacity-30" aria-hidden />
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <div className="shop-store__grid">
            {products.map((product) => (
              <ShopCard key={product.productId} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
