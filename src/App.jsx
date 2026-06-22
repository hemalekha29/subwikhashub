import { useState, useEffect } from 'react';
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
import Home from './pages/Home/Home';
import Shop from './pages/Shop/Shop';
import ProductDetail from './pages/ProductDetail/ProductDetail';
import Checkout from './pages/Checkout/Checkout';
import OrderSuccess from './pages/OrderSuccess/OrderSuccess';
import About from './pages/About/About';
import Contact from './pages/Contact/Contact';
import { ShippingPage, ReturnsPage, PrivacyPage, TermsPage } from './pages/Policy/PolicyPage';
import Game from './pages/Game/Game';
import Wishlist from './pages/Wishlist/Wishlist';
import AdminLogin from './pages/Admin/AdminLogin';
import AdminOrders from './pages/Admin/AdminOrders';
import AdminOrderDetail from './pages/Admin/AdminOrderDetail';
import AdminAnalytics from './pages/Admin/AdminAnalytics';
import AdminProducts from './pages/Admin/AdminProducts';

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

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit">
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:slug" element={<ProductDetail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
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
      </motion.div>
    </AnimatePresence>
  );
}

function AdminRoutes() {
  return (
    <Routes>
      <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/orders" element={<AdminOrders />} />
      <Route path="/admin/orders/:orderId" element={<AdminOrderDetail />} />
      <Route path="/admin/analytics" element={<AdminAnalytics />} />
      <Route path="/admin/products"  element={<AdminProducts />} />
    </Routes>
  );
}

function AppContent() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  if (isAdmin) return <AdminRoutes />;

  return (
    <>
      <ScrollToTop />
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
