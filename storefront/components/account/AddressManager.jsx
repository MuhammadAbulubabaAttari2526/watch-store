'use client';
import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';
import { saveAddressAction, deleteAddressAction } from '@/lib/auth/actions';
import { PK_CITIES } from '@/lib/utils/phone';
import Field, { Submit, Notice } from './Field';

function AddressForm({ address, onDone }) {
  const [state, action] = useFormState(saveAddressAction, {});
  useEffect(() => { if (state.done) onDone(); }, [state.done]); // eslint-disable-line react-hooks/exhaustive-deps
  const e = state.errors || {}, a = address || {};
  return (
    <form action={action} className="box stack" noValidate>
      <Notice state={{ message: state.message }} />
      <input type="hidden" name="id" value={a.id || ''} />
      <Field name="address_name" label="Label (optional)" defaultValue={a.address_name || ''} placeholder="Home, Office" />
      <div className="two"><Field name="first_name" label="First name" defaultValue={a.first_name || ''} error={e.first_name} /><Field name="last_name" label="Last name" defaultValue={a.last_name || ''} /></div>
      <Field name="phone" label="Phone" type="tel" inputMode="tel" defaultValue={a.phone || ''} placeholder="0300 1234567" error={e.phone} />
      <Field name="address_1" label="Address" defaultValue={a.address_1 || ''} error={e.address_1} />
      <div className="two"><Field name="city" label="City" list="acc-cities" defaultValue={a.city || ''} error={e.city} /><Field name="postal_code" label="Postal code (optional)" inputMode="numeric" defaultValue={a.postal_code || ''} error={e.postal_code} /></div>
      <datalist id="acc-cities">{PK_CITIES.map((c) => <option key={c} value={c} />)}</datalist>
      <label className="check"><input type="checkbox" name="is_default" defaultChecked={!!a.is_default_shipping} /> Use as my default delivery address</label>
      <div className="row"><Submit>Save address</Submit><button type="button" className="btn btn--ghost" onClick={onDone}>Cancel</button></div>
    </form>
  );
}

export default function AddressManager({ addresses }) {
  const [editing, setEditing] = useState(null); // null | 'new' | address id
  return (
    <div className="stack" style={{ '--stack': 'var(--sp-5)' }}>
      {addresses.length === 0 && editing !== 'new' && <div className="empty"><h3>No saved addresses</h3><p>Save an address to check out faster.</p></div>}
      <ul className="addr-list">
        {addresses.map((a) => editing === a.id
          ? <li key={a.id}><AddressForm address={a} onDone={() => setEditing(null)} /></li>
          : (
            <li key={a.id} className="box addr">
              <div>
                <strong>{a.address_name || `${a.first_name} ${a.last_name || ''}`}</strong>{a.is_default_shipping && <span className="badge" style={{ marginLeft: 8 }}>Default</span>}
                <p>{a.first_name} {a.last_name}<br />{a.address_1}<br />{a.city}{a.postal_code ? `, ${a.postal_code}` : ''}<br />{a.phone}</p>
              </div>
              <div className="row">
                <button type="button" className="link-btn" onClick={() => setEditing(a.id)}>Edit<span className="visually-hidden"> address</span></button>
                <form action={deleteAddressAction}><input type="hidden" name="id" value={a.id} /><button className="link-btn" type="submit">Delete<span className="visually-hidden"> address</span></button></form>
              </div>
            </li>
          ))}
      </ul>
      {editing === 'new' ? <AddressForm onDone={() => setEditing(null)} /> : <button type="button" className="btn btn--ghost" onClick={() => setEditing('new')}>Add a new address</button>}
    </div>
  );
}
