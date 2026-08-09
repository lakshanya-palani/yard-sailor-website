import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SaleDetail from "./pages/SaleDetail";
import Login from "./pages/Login";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
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
          path="/Privacy"
          element={<Privacy />}
        />

        <Route
          path="/contact"
          element={<Contact />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;