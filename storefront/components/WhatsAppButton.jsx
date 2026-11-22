import { whatsappUrl } from '@/lib/utils/format';

export default function WhatsAppButton() {
  const href = whatsappUrl();
  if (!href) return null;
  return (
    <a className="wa-fab" href={href} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 20l1.3-4.1A8 8 0 1 1 8.2 18.8L4 20z" /><path d="M9 9.5c.4 2 2.5 4 4.5 4.5l1.2-1.2-1.8-1-.8.6c-.8-.3-1.6-1.1-1.9-1.9l.6-.8-1-1.8L9 9.5z" /></svg>
      <span>WhatsApp</span>
    </a>
  );
}
