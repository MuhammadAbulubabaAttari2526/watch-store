import { SITE_URL } from '@/lib/utils/format';
import { listProductHandles } from '@/lib/api/store';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const pages = [{ url: SITE_URL }, { url: `${SITE_URL}/products` }];
  try {
    const handles = await listProductHandles();
    handles.forEach((h) => pages.push({ url: `${SITE_URL}/products/${h.handle}`, lastModified: h.updatedAt }));
  } catch { /* backend offline: still serve the static pages */ }
  return pages;
}
