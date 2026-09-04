import type { Metadata } from 'next';
import JsonLd from '../../../components/seo/JsonLd';
import {
  fetchPublicProduct,
  getProductImageUrl,
} from '../../../lib/publicProducts';
import { absoluteUrl, buildPageMetadata, siteConfig } from '../../../lib/seo';
import ProductDetailClient from './ProductDetailClient';

type Props = {
  params: Promise<{ productId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productId } = await params;
  const product = await fetchPublicProduct(productId);

  if (!product) {
    return buildPageMetadata({
      title: 'Product Not Found',
      description: `This product was not found in the ${siteConfig.name} shop.`,
      path: `/shop/${encodeURIComponent(productId)}`,
      noIndex: true,
    });
  }

  const title = product.seoTitle || product.name;
  const description =
    product.seoMetaDescription ||
    product.shortDescription ||
    product.outcomePromise ||
    `${product.name} — digital trading product from ${siteConfig.name}.`;
  const image = product.primaryImage
    ? getProductImageUrl(product.primaryImage)
    : undefined;

  return buildPageMetadata({
    title,
    description,
    path: `/shop/${encodeURIComponent(product.productId)}`,
    keywords: [
      product.name,
      ...(product.tags || []),
      product.category || '',
      'forex shop',
      'trading tools',
    ].filter(Boolean),
    image,
  });
}

export default async function ProductDetailPage({ params }: Props) {
  const { productId } = await params;
  const product = await fetchPublicProduct(productId);

  const productJsonLd =
    product &&
    ({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description:
        product.seoMetaDescription ||
        product.shortDescription ||
        product.longDescription ||
        product.name,
      sku: product.productId,
      image: product.primaryImage
        ? getProductImageUrl(product.primaryImage)
        : absoluteUrl('/opengraph-image'),
      brand: {
        '@type': 'Brand',
        name: siteConfig.name,
      },
      offers: {
        '@type': 'Offer',
        url: absoluteUrl(`/shop/${encodeURIComponent(product.productId)}`),
        price: Number(product.price || 0),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
    } as const);

  return (
    <>
      {productJsonLd ? <JsonLd data={productJsonLd} /> : null}
      <ProductDetailClient />
    </>
  );
}
