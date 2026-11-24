'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { deleteBannerAction, saveBannerAction } from '@/lib/admin/actions';
import { Submit, Notice } from '@/components/account/Field';

const empty = { id: '', title: '', image_url: '', link_url: '', alt_text: '', position: 0, is_active: true };

export default function BannerManager({ banners = [] }) {
  const [state, action] = useFormState(saveBannerAction, {});
  const [banner, setBanner] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setUploadError('Choose a JPG, PNG, WebP or AVIF image up to 5 MB.');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const supabase = getSupabaseBrowser();
      const path = `banners/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
      const { error } = await supabase.storage.from('store-assets').upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });
      if (error) throw new Error(error.message);
      setBanner((current) => ({ ...current, image_url: supabase.storage.from('store-assets').getPublicUrl(path).data.publicUrl }));
    } catch (error) {
      setUploadError(`Could not upload banner image: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="admin-panel admin-fields-panel admin-banner-panel stack">
      <div className="admin-panel__head"><h2>Store banners</h2></div>
      <Notice state={state} />
      {uploadError && <div className="alert alert--error" role="alert">{uploadError}</div>}
      <form action={action} className="stack admin-fields-form">
        <input type="hidden" name="id" value={banner.id} />
        <input type="hidden" name="image_url" value={banner.image_url} />
        <div className="two">
          <label className="field">Title<input className="input" name="title" value={banner.title} onChange={(e) => setBanner({ ...banner, title: e.target.value })} required minLength={2} /></label>
          <label className="field">Link URL<input className="input" name="link_url" value={banner.link_url} onChange={(e) => setBanner({ ...banner, link_url: e.target.value })} placeholder="/products" /></label>
          <label className="field">Alt text<input className="input" name="alt_text" value={banner.alt_text} onChange={(e) => setBanner({ ...banner, alt_text: e.target.value })} /></label>
          <label className="field">Display order<input className="input" name="position" type="number" min="0" value={banner.position} onChange={(e) => setBanner({ ...banner, position: e.target.value })} /></label>
        </div>
        <label className="field">Banner image (JPG, PNG, WebP or AVIF; up to 5 MB)<input className="input" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={upload} disabled={uploading} /></label>
        {banner.image_url && <img src={banner.image_url} alt={banner.alt_text} width="240" height="100" style={{ objectFit: 'cover' }} />}
        <label className="admin-check-field"><input type="checkbox" name="is_active" checked={banner.is_active} onChange={(e) => setBanner({ ...banner, is_active: e.target.checked })} /> Active on the storefront</label>
        <div className="admin-panel__head">
          <button className="btn btn--ghost" type="button" onClick={() => setBanner(empty)}>New banner</button>
          <Submit>{banner.id ? 'Save banner' : 'Add banner'}</Submit>
        </div>
      </form>
      <ul className="admin-stock">
        {banners.map((item) => (
          <li key={item.id}>
            <div><strong>{item.title}</strong><span>{item.is_active ? 'Active' : 'Inactive'} · position {item.position}</span></div>
            <div className="stack">
              <button className="link-btn" type="button" onClick={() => setBanner({
                id: item.id, title: item.title, image_url: item.image_url, link_url: item.link_url || '',
                alt_text: item.alt_text || '', position: item.position, is_active: item.is_active,
              })}>Edit</button>
              <form action={deleteBannerAction} onSubmit={(event) => { if (!window.confirm(`Delete banner “${item.title}”?`)) event.preventDefault(); }}>
                <input type="hidden" name="id" value={item.id} />
                <button className="link-btn" type="submit">Delete</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
