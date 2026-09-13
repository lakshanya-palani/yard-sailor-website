import { lazy, Suspense } from "react";
import { SavedProvider } from "./context/SavedContext";
import AuthCallback from "./pages/AuthCallback";
const Orders = lazy(() => import("./pages/Orders"));
const Accessibility = lazy(() => import("./pages/Accessibility"));
import RouteAccessibility from "./components/RouteAccessibility";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { CartProvider } from "./context/CartContext";
const Cart = lazy(() => import("./pages/Cart"));
const Messages = lazy(() => import("./pages/Messages"));
const HomePage = lazy(() => import("./pages/HomePage"));
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
const About = lazy(() => import("./pages/About"));

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <CartProvider>
      <SavedProvider>
      <RouteAccessibility />
      <Navbar />

      <Suspense fallback={<main><p role="status">Loading page…</p></main>}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/accessibility" element={<Accessibility />} />
        <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
        <Route path="/checkout" element={<ProtectedRoute><Cart checkout /></ProtectedRoute>} />
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
      </Routes>
      </Suspense>

      <Footer />
    </SavedProvider>
    </CartProvider>
    </BrowserRouter>
  );
}

export default App;
