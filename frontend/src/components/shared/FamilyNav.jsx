import { NavLink } from "react-router-dom";
import { Mic, Camera, Users, Heart, Home } from "lucide-react";
import { useSession } from "../../hooks/useSession";
import { t } from "../../utils/translations";

const navItems = [
  { to: "/", icon: Mic, key: "nav_symptoms", fallback: "Symptoms" },
  { to: "/diet", icon: Camera, key: "nav_diet", fallback: "Diet" },
  { to: "/family", icon: Users, key: "nav_family", fallback: "Family" },
  { to: "/wellness", icon: Heart, key: "nav_wellness", fallback: "Wellness" },
];

export default function FamilyNav() {
  const { session } = useSession();
  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-50 lg:static lg:w-64 lg:min-h-screen lg:border-r lg:border-t-0"
      style={{ borderColor: "var(--color-cream-200)" }}>
      <div className="hidden lg:flex flex-col h-full bg-white">
        <div className="px-5 pt-5 pb-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--color-coral-50)" }}>
            <Home size={18} style={{ color: "var(--color-coral-500)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--color-slate-800)" }}>Voices of Home</p>
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>Patient Portal</p>
          </div>
        </div>

        <div className="px-3 py-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `family-sidebar-link ${isActive ? "active" : ""}`}
            >
              <item.icon size={18} />
              <span>{t(session.language, item.key) || item.fallback}</span>
            </NavLink>
          ))}
        </div>
      </div>

      <div className="flex lg:hidden w-full">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `${isActive ? "active" : ""}`}
          >
            <div className="nav-dot" />
            <item.icon size={18} />
            <span style={{ marginTop: 2 }}>{t(session.language, item.key) || item.fallback}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
