import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import SaleDetail from "./pages/SaleDetail";
import Login from "./pages/Login";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import PostSale from "./pages/PostSale";
import Register from "./pages/Register";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import Profile from "./pages/Profile";
import ProfileSetup from "./pages/ProfileSetup";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/sales/:id"
          element={<SaleDetail />}
        />

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
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}

export default App;
