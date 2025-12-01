import { BrowserRouter, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import NetworkChecker from "./components/NetworkChecker";
import LandingPage from "./pages/LandingPage";
import Markets from "./pages/Markets";
import Trade from "./pages/Trade";
import TradeNew from "./pages/TradeNew";
import Home from "./pages/Home";
import PrivyProvider from "./providers/PrivyProvider";

export default function App() {
  return (
    <PrivyProvider>
      <div className="min-h-screen">
        <BrowserRouter>
          <Navbar />
          <NetworkChecker />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/home" element={<Home />} />
            <Route path="/markets" element={<Markets />} />
            <Route path="/trade/:symbol" element={<TradeNew />} />
            <Route path="/trade" element={<TradeNew />} />
            <Route path="/trade-old/:symbol" element={<Trade />} />
            <Route path="/trade-old" element={<Trade />} />
          </Routes>
        </BrowserRouter>
      </div>
    </PrivyProvider>
  );
}
