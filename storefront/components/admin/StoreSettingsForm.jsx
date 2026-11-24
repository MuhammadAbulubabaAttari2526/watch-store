'use client';

import { useFormState } from 'react-dom';
import { useState } from 'react';
import { saveStoreSettingsAction } from '@/lib/admin/actions';
import { Submit, Notice } from '@/components/account/Field';
import { getSupabaseBrowser } from '@/lib/supabase/client';

const fields = [
  ['store_name', 'Brand name'], ['store_phone', 'Contact phone'], ['store_email', 'Contact email'],
  ['store_address', 'Store address'], ['whatsapp_number', 'WhatsApp number (digits with country code)'],
  ['announcement', 'Announcement bar text'], ['currency', 'Currency (ISO code)'],
  ['shipping_karachi', 'Karachi delivery charge'], ['shipping_nationwide', 'Nationwide delivery charge'],
  ['instagram_url', 'Instagram URL'], ['facebook_url', 'Facebook URL'],
  ['youtube_url', 'YouTube URL'], ['x_url', 'X URL'],
];

export default function StoreSettingsForm({ settings = {} }) {
  const [state, action] = useFormState(saveStoreSettingsAction, {});
  const [logoUrl, setLogoUrl] = useState(String(settings.store_logo_url || ''));
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);

  async function uploadLogo(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setUploadError('Choose a JPG, PNG, WebP or AVIF logo up to 5 MB.');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const supabase = getSupabaseBrowser();
      const path = `logos/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
      const { error } = await supabase.storage.from('store-assets').upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });
      if (error) throw new Error(error.message);
      setLogoUrl(supabase.storage.from('store-assets').getPublicUrl(path).data.publicUrl);
    } catch (error) {
      setUploadError(`Could not upload logo: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={action} className="admin-panel admin-settings-form">
      <div className="admin-panel__head">
        <div className="admin-section-heading">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.6 2.8-.2-.1a1.7 1.7 0 0 0-1.9.3l-.1.1h-3.2l-.1-.2a1.7 1.7 0 0 0-1.6-1l-.2.1-2.8-1.6.1-.2a1.7 1.7 0 0 0-.3-1.9l-.1-.1v-3.2l.2-.1a1.7 1.7 0 0 0 1-1.6l-.1-.2 1.6-2.8.2.1a1.7 1.7 0 0 0 1.9-.3l.1-.1h3.2l.1.2a1.7 1.7 0 0 0 1.6 1l.2-.1 2.8 1.6-.1.2a1.7 1.7 0 0 0 .3 1.9l.1.1v3.2l-.2.1a1.7 1.7 0 0 0-1 1.6Z" /></svg>
          <h2>Store settings</h2>
        </div>
      </div>
      <div className="admin-settings-form__body stack">
        <Notice state={state} />
        {uploadError && <div className="alert alert--error" role="alert">{uploadError}</div>}
        <div className="two">
          {fields.map(([name, label]) => (
            <label className="field" key={name}>{label}
              <input
                className="input"
                name={name}
                defaultValue={String(settings[name] ?? (name === 'currency' ? 'PKR' : ''))}
                required={name === 'store_name' || name === 'currency' || name.startsWith('shipping_')}
                type={name.startsWith('shipping_') ? 'number' : name === 'store_email' ? 'email' : 'text'}
                min={name.startsWith('shipping_') ? '0' : undefined}
                step={name.startsWith('shipping_') ? '0.01' : undefined}
              />
            </label>
          ))}
        </div>
        <label className="field">Store logo URL<input className="input" type="url" name="store_logo_url" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} /></label>
        <label className="field">Upload logo (JPG, PNG, WebP or AVIF; up to 5 MB)<input className="input" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={uploadLogo} disabled={uploading} /></label>
        {logoUrl && <img src={logoUrl} alt="Store logo preview" width="160" height="48" style={{ objectFit: 'contain' }} />}
        <p className="field__hint">Public contact, social, delivery, and brand settings are shown on the storefront. Delivery rates are recalculated by the database during checkout. Changing currency does not convert product or delivery amounts; historical orders keep their original currency.</p>
        <Submit className="admin-settings-save btn--gold">{uploading ? 'Uploading…' : 'Save settings'}</Submit>
      </div>
    </form>
  );
}
