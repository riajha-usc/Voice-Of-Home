import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, MessageSquare, ClipboardList, AlertTriangle,
  Plus, Send, Leaf, Search, TrendingUp, Clock,
  ChevronRight, Calendar,
} from "lucide-react";
import { useSession } from "../hooks/useSession";
import { getLanguageName } from "../components/shared/UIComponents";

/* ------------------------------------------------------------------ */
/*  Mock data — in production these come from /api/patients, etc.      */
/* ------------------------------------------------------------------ */
const MOCK_PATIENTS = [
  { id: "p1", initials: "ML", name: "Maria Lopez", sex: "Female", age: 56, language: "es", status: "needs_review", statusLabel: "Needs Review", lastUpdate: "3 min ago", color: "#E8695A" },
  { id: "p2", initials: "LN", name: "Linh Nguyen", sex: "Female", age: 62, language: "vi", status: "stable", statusLabel: "Stable", lastUpdate: "10 min ago", color: "#3AA882" },
  { id: "p3", initials: "RK", name: "Ravi Kumar", sex: "Male", age: 48, language: "hi", status: "family_message", statusLabel: "Family Message", lastUpdate: "1 min ago", color: "#E5A030" },
  { id: "p4", initials: "AA", name: "Aisha Abdullah", sex: "Female", age: 34, language: "ar", status: "pending_data", statusLabel: "Pending Data", lastUpdate: "25 min ago", color: "#8A8680" },
  { id: "p5", initials: "JT", name: "Juan Torres", sex: "Male", age: 71, language: "es", status: "stable", statusLabel: "Stable", lastUpdate: "40 min ago", color: "#3AA882" },
];

const STATUS_STYLES = {
  needs_review: { bg: "var(--color-coral-50)", fg: "var(--color-coral-500)" },
  stable: { bg: "var(--color-teal-50)", fg: "var(--color-teal-600)" },
  family_message: { bg: "var(--color-amber-50)", fg: "var(--color-amber-600)" },
  pending_data: { bg: "var(--color-slate-50)", fg: "var(--color-slate-500)" },
};

const LANGUAGE_STATS = [
  { name: "Spanish", count: 6, color: "#E8695A" },
  { name: "Vietnamese", count: 3, color: "#3AA882" },
  { name: "English", count: 2, color: "#3B82F6" },
  { name: "Other", count: 3, color: "#E5A030" },
];

export default function DoctorHome() {
  const { session } = useSession();
  const navigate = useNavigate();
  const doctorName = session.doctor?.name?.split(" ")[1] || session.doctor?.name || "Smith";

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  /* Use real session data when available, fallback to demo numbers */
  const activePatientCount = MOCK_PATIENTS.length + (session.patient ? 9 : 0);
  const unreadMessages = 6;
  const pendingReviews = session.dietaryResults?.length || 3;
  const criticalAlerts = 1;

  const stats = [
    { label: "Active Patients", value: activePatientCount, sub: "+2 from yesterday", icon: Users, color: "var(--color-teal-500)", bg: "var(--color-teal-50)" },
    { label: "Unread Messages", value: unreadMessages, sub: "+3 new", icon: MessageSquare, color: "var(--color-coral-400)", bg: "var(--color-coral-50)" },
    { label: "Pending Reviews", value: pendingReviews, sub: "Diet plans to review", icon: ClipboardList, color: "var(--color-amber-600)", bg: "var(--color-amber-50)" },
    { label: "Critical Alerts", value: criticalAlerts, sub: "Needs immediate attention", icon: AlertTriangle, color: "var(--color-danger-500)", bg: "var(--color-danger-50)" },
  ];

  const quickActions = [
    { icon: Plus, label: "Add New Patient Session", desc: "Start a new patient session", action: () => navigate("/welcome") },
    { icon: Send, label: "Send Broadcast Instructions", desc: "Send voice instructions to multiple families" },
    { icon: Leaf, label: "Review Diet Uploads", desc: `${pendingReviews} diet uploads pending review` },
    { icon: Search, label: "Search Cultural Expression", desc: "Look up cultural symptom expressions", action: () => navigate("/doctor/patient") },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--color-slate-800)" }}>
            Hello Dr. {doctorName} <span role="img" aria-label="wave">👋</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-slate-500)" }}>
            Here's your care summary for today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-slate-500)" }}>
          <Calendar size={14} />
          <span>{dateStr}</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="warm-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium" style={{ color: "var(--color-slate-500)" }}>{s.label}</p>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: s.bg }}
              >
                <s.icon size={16} style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--color-slate-800)" }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--color-slate-400)" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Active patients + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Active Patients Table */}
        <div className="lg:col-span-2 warm-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium" style={{ color: "var(--color-slate-700)" }}>Active Patients</h2>
            <button
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: "var(--color-teal-600)" }}
            >
              View all patients <ChevronRight size={12} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-cream-200)" }}>
                  <th className="text-left py-2 text-xs font-medium" style={{ color: "var(--color-slate-400)" }}>Patient</th>
                  <th className="text-left py-2 text-xs font-medium" style={{ color: "var(--color-slate-400)" }}>Language</th>
                  <th className="text-left py-2 text-xs font-medium" style={{ color: "var(--color-slate-400)" }}>Status</th>
                  <th className="text-left py-2 text-xs font-medium" style={{ color: "var(--color-slate-400)" }}>Last Update</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {MOCK_PATIENTS.map((p) => {
                  const st = STATUS_STYLES[p.status] || STATUS_STYLES.stable;
                  return (
                    <tr
                      key={p.id}
                      className="cursor-pointer"
                      style={{ borderBottom: "1px solid var(--color-cream-100)" }}
                      onClick={() => navigate("/doctor/patient")}
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                            style={{ background: p.color }}
                          >
                            {p.initials}
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: "var(--color-slate-700)" }}>{p.name}</p>
                            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>
                              {p.sex} · {p.age}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="flex items-center gap-1.5">
                          <span className="text-xs">●</span> {getLanguageName(p.language)}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className="text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ background: st.bg, color: st.fg }}
                        >
                          {p.statusLabel}
                        </span>
                      </td>
                      <td className="py-3 text-xs" style={{ color: "var(--color-slate-400)" }}>
                        {p.lastUpdate}
                      </td>
                      <td className="py-3">
                        <span
                          className="text-xs px-2 py-1 rounded-lg cursor-pointer"
                          style={{ background: "var(--color-cream-100)", color: "var(--color-slate-500)" }}
                        >
                          Open
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="warm-card p-5">
          <h2 className="font-medium mb-4" style={{ color: "var(--color-slate-700)" }}>Quick Actions</h2>
          <div className="space-y-2">
            {quickActions.map((qa, i) => (
              <button
                key={i}
                onClick={qa.action}
                className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors"
                style={{ background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-cream-100)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "var(--color-cream-100)" }}
                >
                  <qa.icon size={15} style={{ color: "var(--color-slate-600)" }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--color-slate-700)" }}>{qa.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-slate-400)" }}>{qa.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Insights */}
      <div className="warm-card p-5">
        <h2 className="font-medium mb-4" style={{ color: "var(--color-slate-700)" }}>Today's Insights</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Language distribution */}
          <div className="p-4 rounded-xl" style={{ background: "var(--color-cream-50)" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs" style={{ color: "var(--color-slate-400)" }}>Most Common Languages</span>
            </div>
            {/* Simple bar chart */}
            <div className="space-y-2">
              {LANGUAGE_STATS.map((l) => (
                <div key={l.name} className="flex items-center gap-2">
                  <span className="text-xs w-20 truncate" style={{ color: "var(--color-slate-600)" }}>{l.name}</span>
                  <div className="flex-1 h-3 rounded-full" style={{ background: "var(--color-cream-200)" }}>
                    <div
                      className="h-3 rounded-full"
                      style={{ width: `${(l.count / 6) * 100}%`, background: l.color }}
                    />
                  </div>
                  <span className="text-xs font-semibold w-4 text-right" style={{ color: "var(--color-slate-600)" }}>{l.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Average Response Time */}
          <div className="p-4 rounded-xl" style={{ background: "var(--color-cream-50)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} style={{ color: "var(--color-slate-400)" }} />
              <span className="text-xs" style={{ color: "var(--color-slate-400)" }}>Average Response Time</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-slate-800)" }}>
              4.2 <span className="text-base font-normal" style={{ color: "var(--color-slate-500)" }}>hrs</span>
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--color-teal-600)" }}>
              -0.8 hrs from yesterday
            </p>
          </div>

          {/* Readmission Risk */}
          <div className="p-4 rounded-xl" style={{ background: "var(--color-cream-50)" }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} style={{ color: "var(--color-slate-400)" }} />
              <span className="text-xs" style={{ color: "var(--color-slate-400)" }}>Readmission Risk Alerts</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-danger-500)" }}>2</p>
            <p className="text-xs mt-2" style={{ color: "var(--color-slate-500)" }}>
              Patients at high risk
            </p>
          </div>

          {/* Family Engagement */}
          <div className="p-4 rounded-xl" style={{ background: "var(--color-cream-50)" }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} style={{ color: "var(--color-slate-400)" }} />
              <span className="text-xs" style={{ color: "var(--color-slate-400)" }}>Family Engagement</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-teal-600)" }}>85%</p>
            <p className="text-xs mt-2" style={{ color: "var(--color-teal-600)" }}>
              +10% from yesterday
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
