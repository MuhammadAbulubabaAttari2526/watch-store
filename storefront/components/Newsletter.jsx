'use client';

import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState(null);
  async function submit(e) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setMsg({ type: 'error', text: 'Enter a valid email address.' });
    try {
      const { error } = await getSupabaseBrowser().rpc('subscribe_newsletter', { p_email: email });
      if (error) throw new Error(error.message);
      setMsg({ type: 'success', text: 'You are subscribed.' }); setEmail('');
    } catch (error) { setMsg({ type: 'error', text: `Could not subscribe: ${error.message}` }); }
  }
  return (
    <section className="section newsletter" aria-labelledby="nl-t">
      <div className="container newsletter__inner">
        <div className="newsletter__heading">
          <div className="newsletter__icon" aria-hidden="true">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45">
              <rect x="2.5" y="5" width="19" height="14" rx="1.5" />
              <path d="M3.5 6l8.5 7 8.5-7M3.5 18l6-6M20.5 18l-6-6" />
            </svg>
          </div>
          <div>
            <h2 id="nl-t">Get an email when <span>new collections</span> arrive.</h2>
            <p>Be the first to know about our latest drops, offers and more.</p>
          </div>
        </div>
        <form onSubmit={submit} noValidate className="newsletter__form">
          <div className={'newsletter__field' + (msg?.type === 'error' ? ' has-error' : '')}>
            <label className="visually-hidden" htmlFor="nl-email">Email address</label>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="1" />
              <path d="M4 6l8 7 8-7" />
            </svg>
            <input id="nl-email" type="email" autoComplete="email" placeholder="Enter your email address..." value={email} onChange={(e) => setEmail(e.target.value)} />
            {msg?.type === 'error' && <span className="newsletter__error" role="alert">{msg.text}</span>}
          </div>
          {msg?.type === 'success' && <div className="newsletter__success" role="status">{msg.text}</div>}
          <button className="newsletter__submit" type="submit">SUBSCRIBE <span aria-hidden="true">→</span></button>
        </form>
      </div>
    </section>
  );
}
