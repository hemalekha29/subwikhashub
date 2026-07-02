import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar/Navbar';
import AnnouncementBar from './components/AnnouncementBar/AnnouncementBar';
import Cart from './components/Cart/Cart';
import Cursor from './components/Cursor/Cursor';
import Footer from './components/Footer/Footer';
import Loader from './components/Loader/Loader';
import FloatingInstagram from './components/FloatingInstagram/FloatingInstagram';

// Every route is code-split so a visit to one page (e.g. Home) doesn't download
// the JS for every other page (Admin panel, all 9 games, Checkout, etc).
const Home = lazy(() => import('./pages/Home/Home'));
const Shop = lazy(() => import('./pages/Shop/Shop'));
const HamperBuilder = lazy(() => import('./pages/Hamper/HamperBuilder'));
const ProductDetail = lazy(() => import('./pages/ProductDetail/ProductDetail'));
const Checkout = lazy(() => import('./pages/Checkout/Checkout'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess/OrderSuccess'));
const TrackOrder = lazy(() => import('./pages/TrackOrder/TrackOrder'));
const About = lazy(() => import('./pages/About/About'));
const Contact = lazy(() => import('./pages/Contact/Contact'));
const ShippingPage = lazy(() => import('./pages/Policy/PolicyPage').then(m => ({ default: m.ShippingPage })));
const ReturnsPage = lazy(() => import('./pages/Policy/PolicyPage').then(m => ({ default: m.ReturnsPage })));
const PrivacyPage = lazy(() => import('./pages/Policy/PolicyPage').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/Policy/PolicyPage').then(m => ({ default: m.TermsPage })));
const Game = lazy(() => import('./pages/Game/Game'));
const Wishlist = lazy(() => import('./pages/Wishlist/Wishlist'));
const AdminLogin = lazy(() => import('./pages/Admin/AdminLogin'));
const AdminOrders = lazy(() => import('./pages/Admin/AdminOrders'));
const AdminOrderDetail = lazy(() => import('./pages/Admin/AdminOrderDetail'));
const AdminAnalytics = lazy(() => import('./pages/Admin/AdminAnalytics'));
const AdminProducts = lazy(() => import('./pages/Admin/AdminProducts'));
const AdminGallery = lazy(() => import('./pages/Admin/AdminGallery'));

function PageFallback() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: '2px solid rgba(201,168,76,0.25)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'rotate 0.8s linear infinite' }} />
    </div>
  );
}

const pageVariants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -12, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
};

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function ReferralCapture() {
  const location = useLocation();
  useEffect(() => {
    const ref = new URLSearchParams(location.search).get('ref');
    if (ref) localStorage.setItem('subwikha_referral', ref);
  }, [location]);
  return null;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit">
        <Suspense fallback={<PageFallback />}>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/hamper" element={<HamperBuilder />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/track-order" element={<TrackOrder />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/shipping" element={<ShippingPage />} />
            <Route path="/returns" element={<ReturnsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/game" element={<Game />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function AdminRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/orders/:orderId" element={<AdminOrderDetail />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/admin/products"  element={<AdminProducts />} />
        <Route path="/admin/gallery"   element={<AdminGallery />} />
      </Routes>
    </Suspense>
  );
}

function AppContent() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  if (isAdmin) return <AdminRoutes />;

  return (
    <>
      <ScrollToTop />
      <ReferralCapture />
      <Cursor />
      <AnnouncementBar />
      <Navbar />
      <Cart />
      <AnimatedRoutes />
      <Footer />
      <FloatingInstagram />
    </>
  );
}

export default function App() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  return (
    <>
      {!loaded && <Loader onDone={() => setLoaded(true)} />}
      <BrowserRouter>
        <CartProvider>
          <AppContent />
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: 'transparent', boxShadow: 'none', padding: 0 },
            }}
          />
        </CartProvider>
      </BrowserRouter>
    </>
  );
}

function NotFound() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: 24, textAlign: 'center', padding: '100px 20px'
    }}>
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: '8rem', color: 'var(--gold)', opacity: 0.15 }}>404</span>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem' }}>Page Not Found</h2>
      <a href="/" className="btn-gold">Go Home</a>
    </div>
  );
}
