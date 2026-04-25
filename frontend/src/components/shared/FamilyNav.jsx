import { NavLink } from "react-router-dom";
import { Mic, Camera, Volume2, MessageCircle, Users, Heart } from "lucide-react";
import { useSession } from "../../hooks/useSession";
import { t } from "../../utils/translations";

const navItems = [
  { to: "/", icon: Mic, key: "nav_symptoms", fallback: "Symptoms" },
  { to: "/diet", icon: Camera, key: "nav_diet", fallback: "Diet" },
  { to: "/voice", icon: Volume2, key: "nav_voice", fallback: "Voice" },
  { to: "/chat", icon: MessageCircle, key: "nav_chat", fallback: "Chat" },
  { to: "/family", icon: Users, key: "nav_family", fallback: "Family" },
  { to: "/wellness", icon: Heart, key: "nav_wellness", fallback: "Wellness" },
];

export default function FamilyNav() {
  const { session } = useSession();
  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-50 lg:static lg:flex-col lg:w-56 lg:min-h-screen lg:border-r lg:border-t-0 lg:pt-6"
      style={{ borderColor: "var(--color-cream-200)" }}>
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
    </nav>
  );
}
