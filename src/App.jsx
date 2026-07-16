import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import SaleDetail from './pages/SaleDetail'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sale/:id" element={<SaleDetail />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App