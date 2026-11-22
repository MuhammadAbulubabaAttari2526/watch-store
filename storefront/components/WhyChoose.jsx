const ITEMS = [
  {
    title: 'Cash on delivery',
    text: 'Inspect your order and pay when it arrives.',
    icon: <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 11h23v21H8zM31 20h7l5 7v5H31z"/><path d="M31 20v12M38 27h5M13 32a5 5 0 1 0 10 0M31 32a5 5 0 1 0 10 0M18 32h18"/><path d="M13 17h12"/></svg>,
  },
  {
    title: 'Delivery across Pakistan',
    text: 'Shipping charges are shown before you confirm.',
    icon: <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M24 7l14 7v17l-14 8-14-8V14l14-7z"/><path d="M10 14l14 8 14-8M24 22v17M17 11l14 8"/></svg>,
  },
  {
    title: 'Warranty on every watch',
    text: 'Warranty period is listed on each product page.',
    icon: <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M24 7l13 5v8c0 9-5 16-13 20-8-4-13-11-13-20v-8l13-5z"/><path d="M18 24l4 4 8-9"/></svg>,
  },
  {
    title: 'Help on WhatsApp',
    text: 'Message us any time with questions about a watch.',
    icon: <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 31v-8a12 12 0 0 1 24 0v8M12 23l-2 1v7h5v-8h-3M36 23l2 1v7h-5v-8h3"/><path d="M36 31c0 5-4 7-9 7h-3"/></svg>,
  },
];
export default function WhyChoose() {
  return (
    <section className="section why-section" aria-labelledby="why-t">
      <div className="container">
        <div className="why-heading">
          <div className="why-heading__eyebrow"><span>Our advantage</span><i aria-hidden="true" /></div>
          <h2 id="why-t">Why choose <strong>VELTRIX</strong></h2>
          <p>Experience more than just a product — enjoy a complete shopping experience.</p>
          <span className="why-heading__accent" aria-hidden="true" />
        </div>
        <ul className="why-grid">
          {ITEMS.map(({ title, text, icon }) => (
            <li key={title} className="why-item">
              <div className="why-item__icon" aria-hidden="true">{icon}</div>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
