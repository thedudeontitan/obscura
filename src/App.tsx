import { BrowserRouter, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import Markets from "./pages/Markets";
import Trade from "./pages/Trade";
import Home from "./pages/Home";

export default function App() {
  return (
    <div className="min-h-screen">
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<Home />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/trade/:symbol" element={<Trade />} />
          <Route path="/trade" element={<Trade />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
