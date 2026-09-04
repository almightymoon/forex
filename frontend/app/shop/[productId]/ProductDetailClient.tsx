'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProductDetailView, {
  ProductDetailLoading,
  ProductDetailNotFound,
} from '../../../components/shop/ProductDetailView';
import { fetchPublicProduct, type ShopProduct } from '../../../lib/publicProducts';

export default function ProductDetailClient() {
  const params = useParams();
  const productId = String(params?.productId || '');
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setNotFound(false);
      const data = await fetchPublicProduct(productId);
      if (!alive) return;
      if (!data) {
        setNotFound(true);
        setProduct(null);
      } else {
        setProduct(data);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [productId]);

  if (loading) return <ProductDetailLoading />;
  if (notFound || !product) return <ProductDetailNotFound />;
  return <ProductDetailView product={product} />;
}
