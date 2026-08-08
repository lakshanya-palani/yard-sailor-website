import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import SaleDetail from "./pages/SaleDetail";
import Login from "./pages/Login";

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
      </Routes>
    </BrowserRouter>
  );
}

export default App;