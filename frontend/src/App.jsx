import React from "react";
import { Routes, Route, Outlet, useLocation, Navigate } from "react-router-dom";
import { Stethoscope, LogOut } from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { SessionProvider, useSession } from "./hooks/useSession";
import FamilyNav from "./components/shared/FamilyNav";
import DoctorLayout from "./components/doctor/DoctorLayout";
import SymptomsPage from "./pages/SymptomsPage";
import DietPage from "./pages/DietPage";
import FamilyPage from "./pages/FamilyPage";
import MentalHealthPage from "./pages/MentalHealthPage";
import OnboardingPage from "./pages/OnboardingPage";
import DoctorHome from "./pages/DoctorHome";
import DoctorPatientDetail from "./pages/DoctorPatientDetail";

/* Wrapper layout for the family/patient-facing side */
function FamilyLayout() {
  return (
    <div className="min-h-screen lg:flex">
      <FamilyNav />
      <main className="flex-1 min-w-0 pt-16 pb-24 lg:pt-6 lg:pb-6">
        <Outlet />
      </main>
    </div>
  );
}

function AuthGuard({ children }) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  if (isLoading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh"}}>Loading...</div>;
  if (!isAuthenticated) {
    loginWithRedirect({ appState: { returnTo: window.location.pathname } });
    return null;
  }
  return children;
}

function ViewSwitcher() {
  const location = useLocation();
  const { reset } = useSession();
  const { isAuthenticated, logout, user, loginWithRedirect } = useAuth0();
  const isDoctor = location.pathname.startsWith("/doctor");
  const isOnboarding = location.pathname === "/welcome";

  if (isOnboarding || isDoctor) return null;

  return (
    <div className="fixed top-3 right-3 z-50 flex gap-2">
      <button onClick={reset}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
        style={{ background: "rgba(255,255,255,0.85)", color: "var(--color-slate-600)", border: "1px solid var(--color-cream-200)", backdropFilter: "blur(8px)" }}>
        <LogOut size={12} /> Reset
      </button>
      <button
        onClick={() => {
          if (isAuthenticated) {
            window.location.href = "/doctor";
          } else {
            localStorage.setItem("auth_redirect", "/doctor");
            loginWithRedirect();
          }
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
        style={{ background: "var(--color-teal-500)", color: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <Stethoscope size={12} /> Doctor view
      </button>
      {isAuthenticated && (
        <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ background: "rgba(255,255,255,0.85)", color: "var(--color-slate-600)", border: "1px solid var(--color-cream-200)", backdropFilter: "blur(8px)" }}>
          {user?.name || "Logout"}
        </button>
      )}
    </div>
  );
}

function Layout() {
  const location = useLocation();
  const { session } = useSession();
  const { isLoading } = useAuth0();
  const isDoctor = location.pathname.startsWith("/doctor");
  const isOnboarding = location.pathname === "/welcome";
  const isAuth0Callback = location.search.includes("code=") && location.search.includes("state=");

  // Wait for Auth0 to finish processing the callback
  if (isLoading || isAuth0Callback) return null;

  // If we don't have a session yet, force the onboarding flow.
  if (!session.onboarded && !isOnboarding && !isDoctor) {
    return <Navigate to="/welcome" replace />;
  }
  // If we DO have a session and the user is on /welcome, push them home.
  if (session.onboarded && isOnboarding) {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{ background: "var(--color-cream-50)", minHeight: "100vh" }}>
      <ViewSwitcher />
      <Routes>
        {/* Onboarding */}
        <Route path="/welcome" element={<OnboardingPage />} />

        {/* Doctor portal — protected by Auth0 */}
        <Route path="/doctor" element={<AuthGuard><DoctorLayout /></AuthGuard>}>
          <Route index element={<DoctorHome />} />
          <Route path="patient" element={<DoctorPatientDetail />} />
          <Route path="patient/:id" element={<DoctorPatientDetail />} />
          <Route path="patients" element={<DoctorHome />} />
          <Route path="search" element={<DoctorPatientDetail />} />
        </Route>

        {/* Family / patient-facing views — nested under FamilyLayout */}
        <Route element={<FamilyLayout />}>
          <Route path="/" element={<SymptomsPage />} />
          <Route path="/diet" element={<DietPage />} />
          <Route path="/family" element={<FamilyPage />} />
          <Route path="/wellness" element={<MentalHealthPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <Layout />
    </SessionProvider>
  );
}

