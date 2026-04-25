import { BrowserRouter, Routes, Route, useLocation, Link } from "react-router-dom";
import { Stethoscope, Users } from "lucide-react";
import { SessionProvider } from "./hooks/useSession";
import FamilyNav from "./components/shared/FamilyNav";
import SymptomsPage from "./pages/SymptomsPage";
import DietPage from "./pages/DietPage";
import VoicePage from "./pages/VoicePage";
import ChatPage from "./pages/ChatPage";
import DoctorDashboard from "./pages/DoctorDashboard";

function ViewSwitcher() {
  const location = useLocation();
  const isDoctor = location.pathname === "/doctor";

  return (
    <div className="fixed top-3 right-3 z-50">
      <Link to={isDoctor ? "/" : "/doctor"}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
        style={{ background: isDoctor ? "var(--color-coral-400)" : "var(--color-teal-500)", color: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        {isDoctor ? <><Users size={12} /> Family view</> : <><Stethoscope size={12} /> Doctor view</>}
      </Link>
    </div>
  );
}

function Layout() {
  const location = useLocation();
  const isDoctor = location.pathname === "/doctor";

  return (
    <div style={{ background: "var(--color-cream-50)", minHeight: "100vh" }}>
      <ViewSwitcher />
      {isDoctor ? (
        <Routes>
          <Route path="/doctor" element={<DoctorDashboard />} />
        </Routes>
      ) : (
        <div className="lg:flex">
          <FamilyNav />
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<SymptomsPage />} />
              <Route path="/diet" element={<DietPage />} />
              <Route path="/voice" element={<VoicePage />} />
              <Route path="/chat" element={<ChatPage />} />
            </Routes>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Layout />
      </SessionProvider>
    </BrowserRouter>
  );
}
