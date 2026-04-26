import { NavLink, Outlet } from "react-router-dom";
import {
  Home, Users, MessageSquare, Leaf, Bell, Search,
  BookOpen, Settings, Stethoscope, ChevronDown,
} from "lucide-react";
import { useSession } from "../../hooks/useSession";

const sidebarItems = [
  { to: "/doctor", icon: Home, label: "Home", end: true },
  { to: "/doctor/patients", icon: Users, label: "Active Patients" },
  { to: "/doctor", icon: MessageSquare, label: "Messages", badge: 6, end: true },
  { to: "/doctor", icon: Leaf, label: "Diet Reviews", badge: 3, end: true },
  { to: "/doctor", icon: Bell, label: "Alerts", badge: 1, badgeType: "danger", end: true },
  { to: "/doctor/search", icon: Search, label: "Search", end: true },
  { to: "/doctor", icon: BookOpen, label: "Resources", end: true },
  { to: "/doctor", icon: Settings, label: "Settings", end: true },
];

export default function DoctorLayout() {
  const { session } = useSession();
  const doctorName = session.doctor?.name || "Dr. Smith";
  const doctorSpecialty = session.doctor?.specialty || "Cardiology";
  const initials = doctorName.split(" ").map((w) => w[0]).join("").slice(0, 2);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--color-cream-50)" }}>
      {/* Sidebar */}
      <aside
        className="hidden lg:flex flex-col w-64 border-r"
        style={{
          background: "white",
          borderColor: "var(--color-cream-200)",
        }}
      >
        {/* Logo */}
        <div className="px-5 pt-5 pb-4 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "var(--color-teal-50)" }}
          >
            <Home size={18} style={{ color: "var(--color-teal-600)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--color-slate-800)" }}>
              Voices of Home
            </p>
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>
              Doctor Portal
            </p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {sidebarItems.map((item, i) => (
            <NavLink
              key={i}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? "doctor-nav-active" : "doctor-nav-item"
                }`
              }
            >
              <item.icon size={18} />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background:
                      item.badgeType === "danger"
                        ? "var(--color-danger-500)"
                        : "var(--color-coral-400)",
                    color: "white",
                    minWidth: 20,
                    textAlign: "center",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Doctor profile */}
        <div
          className="px-4 py-4 border-t flex items-center gap-3"
          style={{ borderColor: "var(--color-cream-200)" }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{ background: "var(--color-teal-50)", color: "var(--color-teal-700)" }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--color-slate-700)" }}>
              {doctorName}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--color-slate-400)" }}>
              {doctorSpecialty}
            </p>
          </div>
          <ChevronDown size={14} style={{ color: "var(--color-slate-400)" }} />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
