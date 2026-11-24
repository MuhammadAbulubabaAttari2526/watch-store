import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';
import '../styles/home.css';
import '../styles/shop.css';
import '../styles/cart.css';
import '../styles/account.css';
import '../styles/motion.css';
import '../styles/admin.css';
import '../styles/premium.css';
import AnnouncementBar from '@/components/AnnouncementBar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartProvider from '@/components/CartProvider';
import CartDrawer from '@/components/CartDrawer';
import AuthProvider from '@/components/AuthProvider';
import WhatsAppButton from '@/components/WhatsAppButton';
import MotionEffects from '@/components/MotionEffects';
import StoreProvider from '@/components/StoreProvider';
import { getCustomer } from '@/lib/auth/server';
import { getPublicStoreSettings } from '@/lib/api/store';
import { SITE_URL } from '@/lib/utils/format';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'VELTRIX | Premium Watches in Pakistan',
  icons: { icon: '/favicon.svg' },
  description: 'Shop VELTRIX watches with delivery across Pakistan and cash on delivery.',
  openGraph: { title: 'VELTRIX | Premium Watches', description: 'Timeless style. Defining you.', type: 'website', siteName: 'VELTRIX' },
};
export const viewport = { themeColor: '#101010' };

export default async function RootLayout({ children }) {
  const [c, settings] = await Promise.all([getCustomer(), getPublicStoreSettings()]);
  const customer = c ? { id: c.id, email: c.email, first_name: c.first_name, last_name: c.last_name, phone: c.phone, addresses: (c.addresses || []).map((a) => ({ id: a.id, address_1: a.address_1, city: a.city, postal_code: a.postal_code, is_default_shipping: a.is_default_shipping })) } : null;
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Hanken+Grotesk:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <StoreProvider currency={settings.currency || 'PKR'}>
        <AuthProvider customer={customer}>
        <CartProvider>
          <MotionEffects />
          <a className="skip-link" href="#main">Skip to content</a>
          <AnnouncementBar settings={settings} />
          <Header settings={settings} />
          <main id="main">{children}</main>
          <Footer settings={settings} />
          <CartDrawer />
          <WhatsAppButton settings={settings} />
        </CartProvider>
        </AuthProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
