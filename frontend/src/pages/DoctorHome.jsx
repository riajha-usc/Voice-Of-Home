import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, MessageSquare, ClipboardList, AlertTriangle,
  Plus, Send, Leaf, Search, Calendar, ChevronRight,
} from "lucide-react";
import { useSession } from "../hooks/useSession";
import { getLanguageName } from "../components/shared/UIComponents";
import { api } from "../utils/api";

const STATUS_STYLES = {
  needs_review: { bg: "var(--color-coral-50)", fg: "var(--color-coral-500)", label: "Needs Review" },
  stable: { bg: "var(--color-teal-50)", fg: "var(--color-teal-600)", label: "Stable" },
  family_message: { bg: "var(--color-amber-50)", fg: "var(--color-amber-600)", label: "Family Message" },
  pending_data: { bg: "var(--color-slate-50)", fg: "var(--color-slate-500)", label: "Pending Data" },
};

function buildStatus(sessionRecord) {
  if ((sessionRecord.symptom_insights || []).length > 0) return "needs_review";
  if ((sessionRecord.chat_history || []).length > 0 || (sessionRecord.voice_messages || []).length > 0) return "family_message";
  if ((sessionRecord.dietary_results || []).length > 0) return "stable";
  return "pending_data";
}

export default function DoctorHome() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const doctorId = session.doctor?.id || session.patient?.assigned_doctor_id || null;
  const hospitalId = session.hospital?.id || session.patient?.hospital_id || null;
  const doctorName = session.doctor?.name?.split(" ").slice(1).join(" ") || session.doctor?.name || "Care Team";
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!doctorId && !hospitalId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [{ sessions }, { patients }] = await Promise.all([
          api.listSessions(doctorId, hospitalId, 50),
          api.listPatients(doctorId, hospitalId),
        ]);

        if (cancelled) return;

        const patientMap = new Map((patients || []).map((patient) => [patient.id, patient]));
        const merged = (sessions || []).map((sessionRecord) => {
          const patient = patientMap.get(sessionRecord.patient_id);
          const yob = patient?.year_of_birth || (patient?.dob ? parseInt(patient.dob.slice(0, 4), 10) : null);
          return {
            session: sessionRecord,
            patient,
            age: yob ? new Date().getFullYear() - yob : null,
            status: buildStatus(sessionRecord),
          };
        }).filter((entry) => entry.patient);

        setRecords(merged);
      } catch (err) {
        console.error("[DoctorHome] load failed:", err);
        if (!cancelled) setRecords([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [doctorId, hospitalId]);

  const activePatientCount = records.length;
  const unreadMessages = useMemo(
    () => records.reduce((sum, entry) => sum + (entry.session.chat_history || []).length, 0),
    [records]
  );
  const pendingReviews = useMemo(
    () => records.filter((entry) => (entry.session.symptom_insights || []).length > 0 || (entry.session.dietary_results || []).length > 0).length,
    [records]
  );
  const criticalAlerts = useMemo(
    () => records.filter((entry) => (entry.session.symptom_insights || []).some((item) => (item.insights || []).some((ins) => ins.alert_level === "critical"))).length,
    [records]
  );

  const languageStats = useMemo(() => {
    const counts = records.reduce((acc, entry) => {
      const name = getLanguageName(entry.patient?.language_code || entry.session.language_code || "en");
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 4);
  }, [records]);

  const stats = [
    { label: "Active Patients", value: activePatientCount, sub: "From live sessions", icon: Users, color: "var(--color-teal-500)", bg: "var(--color-teal-50)" },
    { label: "Family Messages", value: unreadMessages, sub: "Stored chat turns", icon: MessageSquare, color: "var(--color-coral-400)", bg: "var(--color-coral-50)" },
    { label: "Pending Reviews", value: pendingReviews, sub: "Symptoms or diet to review", icon: ClipboardList, color: "var(--color-amber-600)", bg: "var(--color-amber-50)" },
    { label: "Critical Alerts", value: criticalAlerts, sub: "Flagged clinical signals", icon: AlertTriangle, color: "var(--color-danger-500)", bg: "var(--color-danger-50)" },
  ];

  const quickActions = [
    { icon: Plus, label: "Start Patient Session", desc: "Create a new patient flow", action: () => navigate("/welcome") },
    { icon: Send, label: "Open Latest Family Thread", desc: "Continue a live care conversation", action: () => records[0] && navigate(`/doctor/patient/${records[0].patient.id}?session=${records[0].session.session_id}`) },
    { icon: Leaf, label: "Review Diet Uploads", desc: `${records.filter((entry) => (entry.session.dietary_results || []).length > 0).length} active sessions`, action: () => records[0] && navigate(`/doctor/patient/${records[0].patient.id}?session=${records[0].session.session_id}`) },
    { icon: Search, label: "Search Cultural Expression", desc: "Open the doctor research view", action: () => navigate("/doctor/search") },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--color-slate-800)" }}>
            Hello Dr. {doctorName}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-slate-500)" }}>
            Live patient sessions and family communication from the database.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-slate-500)" }}>
          <Calendar size={14} />
          <span>{today}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="warm-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium" style={{ color: "var(--color-slate-500)" }}>{s.label}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.bg }}>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--color-slate-800)" }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--color-slate-400)" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 warm-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium" style={{ color: "var(--color-slate-700)" }}>Active Patients</h2>
            <button className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--color-teal-600)" }}>
              Live from API <ChevronRight size={12} />
            </button>
          </div>

          {loading ? (
            <p className="text-sm" style={{ color: "var(--color-slate-400)" }}>Loading patient sessions...</p>
          ) : records.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-slate-400)" }}>
              No sessions found for this doctor yet. Start a patient session from onboarding.
            </p>
          ) : (
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
                  {records.map((entry) => {
                    const patient = entry.patient;
                    const style = STATUS_STYLES[entry.status] || STATUS_STYLES.stable;
                    return (
                      <tr key={entry.session.session_id}
                        className="cursor-pointer"
                        style={{ borderBottom: "1px solid var(--color-cream-100)" }}
                        onClick={() => navigate(`/doctor/patient/${patient.id}?session=${entry.session.session_id}`)}>
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                              style={{ background: "var(--color-coral-400)" }}>
                              {(patient.first_name?.[0] || "") + (patient.last_name?.[0] || "")}
                            </div>
                            <div>
                              <p className="font-medium" style={{ color: "var(--color-slate-700)" }}>
                                {[patient.first_name, patient.last_name].filter(Boolean).join(" ")}
                              </p>
                              <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>
                                {patient.sex || "Unknown"}{entry.age ? ` · ${entry.age}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">{getLanguageName(patient.language_code || entry.session.language_code || "en")}</td>
                        <td className="py-3">
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: style.bg, color: style.fg }}>
                            {style.label}
                          </span>
                        </td>
                        <td className="py-3 text-xs" style={{ color: "var(--color-slate-400)" }}>
                          {new Date(entry.session.updated_at).toLocaleString()}
                        </td>
                        <td className="py-3">
                          <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "var(--color-cream-100)", color: "var(--color-slate-500)" }}>
                            Open
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="warm-card p-5">
          <h2 className="font-medium mb-4" style={{ color: "var(--color-slate-700)" }}>Quick Actions</h2>
          <div className="space-y-2">
            {quickActions.map((qa) => (
              <button key={qa.label} onClick={qa.action}
                className="w-full flex items-start gap-3 p-3 rounded-xl text-left"
                style={{ background: "transparent" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "var(--color-cream-100)" }}>
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

      <div className="warm-card p-5">
        <h2 className="font-medium mb-4" style={{ color: "var(--color-slate-700)" }}>Language Distribution</h2>
        {languageStats.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-slate-400)" }}>No live patient data yet.</p>
        ) : (
          <div className="space-y-3">
            {languageStats.map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="text-sm w-32" style={{ color: "var(--color-slate-600)" }}>{item.name}</span>
                <div className="flex-1 h-3 rounded-full" style={{ background: "var(--color-cream-200)" }}>
                  <div className="h-3 rounded-full" style={{ width: `${(item.count / Math.max(activePatientCount, 1)) * 100}%`, background: "var(--color-teal-500)" }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: "var(--color-slate-700)" }}>{item.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
