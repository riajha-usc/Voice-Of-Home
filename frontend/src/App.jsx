import { BrowserRouter, Routes, Route, useLocation, Link, Navigate } from "react-router-dom";
import { Stethoscope, Users, LogOut } from "lucide-react";
import { SessionProvider, useSession } from "./hooks/useSession";
import FamilyNav from "./components/shared/FamilyNav";
import SymptomsPage from "./pages/SymptomsPage";
import DietPage from "./pages/DietPage";
import VoicePage from "./pages/VoicePage";
import ChatPage from "./pages/ChatPage";
import FamilyPage from "./pages/FamilyPage";
import MentalHealthPage from "./pages/MentalHealthPage";
import OnboardingPage from "./pages/OnboardingPage";
import DoctorDashboard from "./pages/DoctorDashboard";

function ViewSwitcher() {
  const location = useLocation();
  const { reset } = useSession();
  const isDoctor = location.pathname === "/doctor";
  const isOnboarding = location.pathname === "/welcome";

  if (isOnboarding) return null;

  return (
    <div className="fixed top-3 right-3 z-50 flex gap-2">
      <button onClick={reset}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
        style={{ background: "rgba(255,255,255,0.85)", color: "var(--color-slate-600)", border: "1px solid var(--color-cream-200)", backdropFilter: "blur(8px)" }}>
        <LogOut size={12} /> Reset
      </button>
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
  const { session } = useSession();
  const isDoctor = location.pathname === "/doctor";
  const isOnboarding = location.pathname === "/welcome";

  // If we don't have a session yet, force the onboarding flow.
  if (!session.onboarded && !isOnboarding) {
    return <Navigate to="/welcome" replace />;
  }
  // If we DO have a session and the user is on /welcome, push them home.
  if (session.onboarded && isOnboarding) {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{ background: "var(--color-cream-50)", minHeight: "100vh" }}>
      <ViewSwitcher />
      {isOnboarding ? (
        <Routes>
          <Route path="/welcome" element={<OnboardingPage />} />
        </Routes>
      ) : isDoctor ? (
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
              <Route path="/family" element={<FamilyPage />} />
              <Route path="/wellness" element={<MentalHealthPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
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
