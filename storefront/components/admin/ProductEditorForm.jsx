'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { deleteProductAction, saveProductAction } from '@/lib/admin/actions';

const initialVariant = () => ({ id: '', title: 'Default', sku: '', price: '', salePrice: '', quantity: 0, options: {}, isActive: true });

export default function ProductEditorForm({ product, categories = [], collections = [] }) {
  const router = useRouter();
  const existing = !!product;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [fields, setFields] = useState({
    title: product?.title || '',
    slug: product?.slug || '',
    brand: product?.brand || '',
    model: product?.model || '',
    description: product?.description || '',
    movement: product?.movement || '',
    case_material: product?.case_material || '',
    case_diameter: product?.case_diameter || '',
    strap_material: product?.strap_material || '',
    water_resistance: product?.water_resistance || '',
    dial_color: product?.dial_color || '',
    warranty: product?.warranty || '',
    status: product?.status || 'DRAFT',
    featured: Boolean(product?.featured),
  });
  const [variants, setVariants] = useState((product?.product_variants || []).map((variant) => ({
    id: variant.id,
    title: variant.title,
    sku: variant.sku,
    price: String(variant.price),
    salePrice: variant.sale_price == null ? '' : String(variant.sale_price),
    quantity: Array.isArray(variant.inventory) ? variant.inventory[0]?.quantity || 0 : variant.inventory?.quantity || 0,
    options: variant.options || {},
    isActive: variant.is_active,
  })));
  const [images, setImages] = useState((product?.product_images || [])
    .slice().sort((a, b) => a.position - b.position)
    .map((image) => ({ url: image.url, altText: image.alt_text || '', position: image.position })));
  const [categoryIds, setCategoryIds] = useState((product?.product_categories || []).map((item) => item.category_id));
  const [collectionIds, setCollectionIds] = useState((product?.product_collections || []).map((item) => item.collection_id));

  const setField = (event) => {
    const { name, value, type, checked } = event.target;
    setFields((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };
  const updateVariant = (index, key, value) => {
    setVariants((current) => current.map((variant, i) => i === index ? { ...variant, [key]: value } : variant));
  };
  const updateOption = (index, key, value) => {
    setVariants((current) => current.map((variant, i) => i === index
      ? { ...variant, options: { ...variant.options, [key]: value } }
      : variant));
  };

  async function uploadFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setBusy(true);
    setMessage('');
    try {
      const supabase = getSupabaseBrowser();
      const uploaded = [];
      for (const file of files) {
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) || file.size > 5 * 1024 * 1024) {
          throw new Error('Choose a JPG, PNG, WebP or AVIF image up to 5 MB.');
        }
        const path = `products/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
        const { error } = await supabase.storage.from('product-images').upload(path, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false,
        });
        if (error) throw new Error(`Could not upload ${file.name}: ${error.message}`);
        const { data } = supabase.storage.from('product-images').getPublicUrl(path);
        uploaded.push({ url: data.publicUrl, altText: '', position: images.length + uploaded.length });
      }
      setImages((current) => [...current, ...uploaded]);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const payload = {
        ...fields,
        id: product?.id || null,
        images: images.map((image, index) => ({ ...image, position: index })),
        variants: variants.map((variant) => ({
          ...variant,
          price: Number(variant.price),
          salePrice: variant.salePrice === '' ? null : Number(variant.salePrice),
          quantity: Number(variant.quantity),
          options: Object.fromEntries(Object.entries(variant.options).filter(([, value]) => String(value).trim())),
        })),
        categoryIds,
        collectionIds,
      };
      const id = await saveProductAction(payload);
      router.push(`/admin/products/${encodeURIComponent(id)}`);
      router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel__head">
        <h2>{existing ? 'Edit product' : 'Add product'}</h2>
        <Link href="/admin?tab=products">Back to catalog</Link>
      </div>
      <form className="stack" onSubmit={submit}>
        {message && <div className="alert alert--error" role="alert">{message}</div>}
        <div className="two">
          <label className="field">Product name<input className="input" name="title" value={fields.title} onChange={setField} required minLength={2} /></label>
          <label className="field">Handle<input className="input" name="slug" value={fields.slug} onChange={setField} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
          <label className="field">Brand<input className="input" name="brand" value={fields.brand} onChange={setField} required /></label>
          <label className="field">Model<input className="input" name="model" value={fields.model} onChange={setField} /></label>
          <label className="field">Status<select className="input" name="status" value={fields.status} onChange={setField}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label>
          <label className="field">Featured <span><input type="checkbox" name="featured" checked={fields.featured} onChange={setField} /> Show in featured collections</span></label>
        </div>
        <label className="field">Description<textarea className="input" name="description" value={fields.description} onChange={setField} rows="5" /></label>
        <div className="two">
          {[
            ['movement', 'Movement'], ['case_material', 'Case material'], ['case_diameter', 'Case diameter'],
            ['strap_material', 'Strap material'], ['water_resistance', 'Water resistance'], ['dial_color', 'Dial colour'], ['warranty', 'Warranty'],
          ].map(([name, label]) => <label className="field" key={name}>{label}<input className="input" name={name} value={fields[name]} onChange={setField} /></label>)}
        </div>

        <section className="stack">
          <div className="admin-panel__head"><h3>Variants and stock</h3><button className="btn btn--ghost" type="button" onClick={() => setVariants((current) => [...current, initialVariant()])}>Add variant</button></div>
          <p className="field__hint admin-variant-help">To offer colour choices, add one variant for each colour and fill in its Colour option. Customers can then select a colour on the product page.</p>
          {variants.map((variant, index) => (
            <fieldset className="box stack" key={variant.id || index}>
              <legend>{variant.title || `Variant ${index + 1}`}</legend>
              <div className="two">
                <label className="field">Variant title<input className="input" value={variant.title} onChange={(event) => updateVariant(index, 'title', event.target.value)} required /></label>
                <label className="field">SKU<input className="input" value={variant.sku} onChange={(event) => updateVariant(index, 'sku', event.target.value)} required /></label>
                <label className="field">Price<input className="input" type="number" min="0" step="0.01" value={variant.price} onChange={(event) => updateVariant(index, 'price', event.target.value)} required /></label>
                <label className="field">Sale price<input className="input" type="number" min="0" step="0.01" value={variant.salePrice} onChange={(event) => updateVariant(index, 'salePrice', event.target.value)} /></label>
                <label className="field">Stock quantity<input className="input" type="number" min="0" step="1" value={variant.quantity} onChange={(event) => updateVariant(index, 'quantity', event.target.value)} required /></label>
                <label className="field">Colour option<input className="input" value={variant.options.color || variant.options.colour || ''} onChange={(event) => updateOption(index, 'color', event.target.value)} /></label>
                <label className="field">Strap option<input className="input" value={variant.options.strap || ''} onChange={(event) => updateOption(index, 'strap', event.target.value)} /></label>
              </div>
              {variants.length > 1 && <button className="link-btn" type="button" onClick={() => setVariants((current) => current.filter((_, i) => i !== index))}>Remove variant</button>}
            </fieldset>
          ))}
        </section>

        <div className="two">
          <label className="field">Categories<select className="input" multiple value={categoryIds} onChange={(event) => setCategoryIds(Array.from(event.target.selectedOptions, (option) => option.value))}>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="field">Collections<select className="input" multiple value={collectionIds} onChange={(event) => setCollectionIds(Array.from(event.target.selectedOptions, (option) => option.value))}>{collections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        </div>

        <section className="stack">
          <label className="field">Product images (JPG, PNG, WebP or AVIF; up to 5 MB each)
            <input className="input" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={uploadFiles} disabled={busy} />
          </label>
          <div className="product-grid">
            {images.map((image, index) => (
              <div className="admin-panel stack" key={`${image.url}-${index}`}>
                <img src={image.url} alt={image.altText} width="160" height="160" style={{ objectFit: 'cover', maxWidth: '100%' }} />
                <label className="field">Alt text<input className="input" value={image.altText} onChange={(event) => setImages((current) => current.map((item, i) => i === index ? { ...item, altText: event.target.value } : item))} /></label>
                <button className="link-btn" type="button" onClick={() => setImages((current) => current.filter((_, i) => i !== index))}>Remove image</button>
              </div>
            ))}
          </div>
        </section>
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
      </form>
      {existing && <form action={deleteProductAction} onSubmit={(event) => { if (!window.confirm('Delete this product? This cannot be undone.')) event.preventDefault(); }}><input type="hidden" name="id" value={product.id} /><button className="link-btn" type="submit" disabled={busy}>Delete product</button></form>}
    </div>
  );
}
