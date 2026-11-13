import { lazy, Suspense } from "react";
import { SavedProvider } from "./context/SavedContext";
import AuthCallback from "./pages/AuthCallback";
const Orders = lazy(() => import("./pages/Orders"));
const Accessibility = lazy(() => import("./pages/Accessibility"));
import RouteAccessibility from "./components/RouteAccessibility";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./components/ui/Toast";
import { ConfirmProvider } from "./components/ui/ConfirmDialog";
const Cart = lazy(() => import("./pages/Cart"));
const Messages = lazy(() => import("./pages/Messages"));
const SaleDetail = lazy(() => import("./pages/SaleDetail"));
import Login from "./pages/Login";
const Privacy = lazy(() => import("./pages/Privacy"));
const Contact = lazy(() => import("./pages/Contact"));
const PostSale = lazy(() => import("./pages/PostSale"));
import Register from "./pages/Register";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
const Profile = lazy(() => import("./pages/Profile"));
const ProfileSetup = lazy(() => import("./pages/ProfileSetup"));
const MyPostings = lazy(() => import("./pages/MyPostings"));
const EditProduct = lazy(() => import("./pages/EditProduct"));
const MyYardSales = lazy(() => import("./pages/MyYardSales"));
const EditYardSale = lazy(() => import("./pages/EditYardSale"));
const SavedItems = lazy(() => import("./pages/SavedItems"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const HelpSupport = lazy(() => import("./pages/HelpSupport"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const PostYardSale = lazy(() => import("./pages/PostYardSale"));
const FindYardSale = lazy(() => import("./pages/FindYardSale"));
import Shop from "./pages/Shop";
import HomePage from "./pages/HomePage";
import { PAYMENTS_ENABLED } from "./lib/features";
import PaymentsUnavailable from "./pages/PaymentsUnavailable";
import NotFound from "./pages/NotFound";
const About = lazy(() => import("./pages/About"));

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
      <ConfirmProvider>
      <CartProvider>
      <SavedProvider>
      <RouteAccessibility />
      <Navbar />

      <Suspense fallback={<main className="route-loading"><p role="status">Loading page…</p></main>}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/orders" element={PAYMENTS_ENABLED ? <ProtectedRoute><Orders /></ProtectedRoute> : <PaymentsUnavailable />} />
        <Route path="/accessibility" element={<Accessibility />} />
        <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
        <Route path="/checkout" element={PAYMENTS_ENABLED ? <ProtectedRoute><Cart checkout /></ProtectedRoute> : <PaymentsUnavailable />} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/find-yard-sale" element={<FindYardSale />} />
        <Route path="/about" element={<About />} />

        <Route
          path="/sales/:id"
          element={<SaleDetail />}
        />
        <Route path="/yard-sale/:id" element={<SaleDetail />} />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/privacy"
          element={<Privacy />}
        />

        <Route
          path="/contact"
          element={<Contact />}
        />

        <Route
          path="/post-sale"
          element={
            <ProtectedRoute requireProfile>
              <PostSale />
            </ProtectedRoute>
          }
        />
        <Route path="/post-yard-sale" element={<ProtectedRoute requireProfile><PostYardSale /></ProtectedRoute>} />

        <Route 
          path="/register" 
          element={<Register />} />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/setup"
          element={
            <ProtectedRoute>
              <ProfileSetup />
            </ProtectedRoute>
          }
        />

        <Route path="/my-postings" element={<ProtectedRoute><MyPostings /></ProtectedRoute>} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/products/:id/edit" element={<ProtectedRoute><EditProduct /></ProtectedRoute>} />
        <Route path="/my-yard-sales" element={<ProtectedRoute><MyYardSales /></ProtectedRoute>} />
        <Route path="/yard-sales/:id/edit" element={<ProtectedRoute><EditYardSale /></ProtectedRoute>} />
        <Route path="/saved" element={<ProtectedRoute><SavedItems /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
        <Route path="/help" element={<HelpSupport />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>

      <Footer />
    </SavedProvider>
    </CartProvider>
    </ConfirmProvider>
    </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
