import { renderBrandIcon } from '../lib/brand-icon';

export const runtime = 'edge';
export const size = { width: 48, height: 48 };
export const contentType = 'image/png';

export default function Icon() {
  return renderBrandIcon(48);
}
