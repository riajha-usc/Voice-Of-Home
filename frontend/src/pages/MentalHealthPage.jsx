import { useEffect, useMemo, useRef, useState } from "react";
import {
  Heart, Send, AlertCircle, Sparkles, Database, Mic, MicOff,
  BookOpen, Image, FileText, ChevronRight, Lock, Phone, Globe,
  Wind, Music, Footprints, Droplets, Calendar,
  BookHeart, Briefcase, Users, DollarSign, GraduationCap, HeartHandshake,
  MoreHorizontal, Activity,
} from "lucide-react";
import { useSession } from "../hooks/useSession";
import { getLanguageName, ListenButton } from "../components/shared/UIComponents";
import { api } from "../utils/api";

const CRISIS_TRIGGERS = /(suicid|kill myself|kill mself|end my life|end it all|hurt myself|self.?harm|i want to die|don't want to live)/i;

const TRIGGER_CATEGORIES = [
  { key: "study", icon: GraduationCap },
  { key: "relationship", icon: HeartHandshake },
  { key: "family", icon: Users },
  { key: "health", icon: Activity },
  { key: "work", icon: Briefcase },
  { key: "finances", icon: DollarSign },
  { key: "other", icon: MoreHorizontal },
];

const PAGE_COPY = {
  en: {
    title: "Mental wellness companion",
    subtitle: "A space to be heard. Not a therapist. Listens first, doesn't rush to advice.",
    checkins: "Check-ins",
    saved: "saved",
    appointments: "Appointments",
    requested: "requested",
    language: "Language",
    crisisTitle: "What you're feeling matters and I want you to be safe.",
    crisisBody: "In the US: Call or text 988 (Suicide & Crisis Lifeline). Outside the US: please reach a local crisis line.",
    sectionTalk: "1. Let's Talk — How Are You Feeling Today?",
    sectionTalkSub: "Speak or type in your language. We'll understand.",
    typeDivider: "OR TYPE YOUR MESSAGE",
    chatPlaceholder: "Take your time...",
    fallbackReply: "I'm here. Tell me a little more?",
    lostConnection: "I lost connection for a moment. I'm still here when you're ready.",
    youSaid: "You said:",
    systemUnderstood: "System understood:",
    journalTitle: "2. Your Journal — Your Story Matters",
    journalSub: "Upload, write, or capture your journal.",
    tabWrite: "Write",
    tabImage: "Upload Image",
    tabFile: "Upload File",
    journalPlaceholder: "Write your thoughts in your own language...",
    uploadImageTitle: "Attach an image from your journal",
    uploadImageMeta: "JPG, PNG, HEIC",
    uploadFileTitle: "Attach a journal file",
    uploadFileMeta: "PDF, DOCX, TXT",
    selectImage: "Choose image",
    selectFile: "Choose file",
    attached: "Attached",
    privateJournal: "Your journal is private and secure.",
    triggerTitle: "3. What's Triggering You?",
    triggerSub: "Help us understand what affects your well-being.",
    triggerIntensity: "How intense is it right now?",
    triggerCategory: "What is it regarding?",
    triggerNotes: "Anything you want to add?",
    triggerPlaceholder: "Tell us more...",
    intensityLabels: ["Not at all", "Mild", "Moderate", "High", "Very High"],
    categories: {
      study: "Study / School",
      relationship: "Relationship",
      family: "Family",
      health: "Health",
      work: "Work",
      finances: "Finances",
      other: "Other",
    },
    patternsTitle: "4. What's Helped People Like You",
    patternsSub: "From anonymized cases in our dataset",
    patternsFootnote: "These are patterns, not prescriptions. If anything resonates, talking to a professional is always an option.",
    feelingsTitle: "5. Rate Your Feelings Right Now",
    feelingsSub: "Slide to express intensity",
    recommendationsTitle: "6. Therapeutic Recommendations",
    recommendationsSub: "Personalized suggestions based on your check-in.",
    viewResources: "View More Resources",
    patient: "Patient",
    feedbackQuestion: "Did these recommendations help?",
    feedbackHelpful: "Yes, I'm feeling better!",
    feedbackNeedMore: "Not really, I need more support",
    supportTitle: "We're here for you",
    supportBody: "It's okay to need professional support. Let's connect you with a mental health provider.",
    appointmentReason: "Reason for support",
    appointmentContact: "Preferred contact",
    appointmentTime: "Preferred time",
    appointmentReasonPlaceholder: "Tell us what kind of support you want from the doctor or counselor.",
    appointmentTimePlaceholder: "Today afternoon, tomorrow morning, after 5 PM...",
    appointmentButton: "Request appointment with mental health provider",
    appointmentSaving: "Saving appointment request...",
    appointmentRequested: "Appointment request saved",
    appointmentMeta: "Available 24/7 · Multilingual support · Secure & confidential",
    latestSummary: "Latest wellness summary",
    latestJournal: "Latest journal note",
    latestAttachment: "Latest attachment",
    latestAppointment: "Latest appointment request",
    appointmentStatusRequested: "requested",
    doctorView: "Doctor sees this after you submit your check-in.",
    submitSaved: "Check-in saved — your doctor can see the summary",
    submitSaving: "Saving check-in...",
    submitButton: "Submit Wellness Check-in",
    privacy: "Your privacy is our priority. All your data is encrypted and protected.",
    helpNow: "Need immediate help?",
    call988: "Call 988",
    findHelpPrefix: "or visit",
    feelingLabels: {
      anxiety: "Anxiety Level",
      stress: "Stress Level",
      energy: "Energy Level",
      focus: "Focus & Concentration",
      hopelessness: "Hopelessness / Despair",
      anger: "Anger / Irritability",
      confidence: "Confidence / Self-Esteem",
      overwhelmed: "Feeling Overwhelmed",
    },
    recommendations: [
      { label: "Box Breathing Exercise", desc: "4-4-4-4 technique to calm anxiety" },
      { label: "5-4-3-2-1 Grounding", desc: "Use your senses to stay present" },
      { label: "Listen to Calm Music", desc: "Try binaural beats or nature sounds" },
      { label: "Take a Short Walk", desc: "Even 5 minutes outside can help" },
      { label: "Drink Water", desc: "Stay hydrated to support your mood" },
    ],
  },
  zh: {
    title: "心理健康陪伴",
    subtitle: "一个可以安心表达的空间。不是治疗师，但会先倾听，不急着给建议。",
    checkins: "健康记录",
    saved: "条已保存",
    appointments: "预约申请",
    requested: "条已提交",
    language: "语言",
    crisisTitle: "你的感受很重要，我也希望你是安全的。",
    crisisBody: "如果你在美国：请拨打或短信联系 988。若不在美国，请联系当地危机干预热线。",
    sectionTalk: "1. 说说看 — 你今天感觉怎么样？",
    sectionTalkSub: "可以用你的语言说或写，我们会理解。",
    typeDivider: "或输入你的内容",
    chatPlaceholder: "慢慢来……",
    fallbackReply: "我在这里。你愿意的话，可以再多说一点。",
    lostConnection: "我刚刚短暂断开了，但我还在这里，准备好了就继续。",
    youSaid: "你说的是：",
    systemUnderstood: "系统理解为：",
    journalTitle: "2. 你的日记 — 你的故事很重要",
    journalSub: "上传、书写或记录你的日记。",
    tabWrite: "书写",
    tabImage: "上传图片",
    tabFile: "上传文件",
    journalPlaceholder: "用你的语言写下此刻的想法……",
    uploadImageTitle: "附上日记图片",
    uploadImageMeta: "JPG、PNG、HEIC",
    uploadFileTitle: "附上日记文件",
    uploadFileMeta: "PDF、DOCX、TXT",
    selectImage: "选择图片",
    selectFile: "选择文件",
    attached: "已附加",
    privateJournal: "你的日记内容是私密且安全的。",
    triggerTitle: "3. 是什么在影响你？",
    triggerSub: "帮助我们了解哪些事情正在影响你的状态。",
    triggerIntensity: "现在的强度有多高？",
    triggerCategory: "主要与什么有关？",
    triggerNotes: "还想补充什么吗？",
    triggerPlaceholder: "再多告诉我们一点……",
    intensityLabels: ["完全没有", "轻度", "中等", "较高", "非常高"],
    categories: {
      study: "学习 / 学校",
      relationship: "关系",
      family: "家庭",
      health: "健康",
      work: "工作",
      finances: "财务",
      other: "其他",
    },
    patternsTitle: "4. 类似经历的人通常什么会有帮助",
    patternsSub: "来自我们数据集中的匿名案例",
    patternsFootnote: "这些只是参考模式，不是处方。如果有任何内容让你有共鸣，寻求专业帮助始终是一个选择。",
    feelingsTitle: "5. 为你此刻的感受打分",
    feelingsSub: "滑动来表达强度",
    recommendationsTitle: "6. 推荐的舒缓方式",
    recommendationsSub: "基于本次记录，为你整理的个性化建议。",
    viewResources: "查看更多资源",
    patient: "患者",
    feedbackQuestion: "这些建议对你有帮助吗？",
    feedbackHelpful: "有，我感觉好一些了！",
    feedbackNeedMore: "还不够，我需要更多支持",
    supportTitle: "我们会支持你",
    supportBody: "需要专业支持是很正常的。我们可以帮你联系心理健康服务提供者。",
    appointmentReason: "支持原因",
    appointmentContact: "偏好的联系方式",
    appointmentTime: "偏好的时间",
    appointmentReasonPlaceholder: "告诉我们你希望医生或咨询师提供什么帮助。",
    appointmentTimePlaceholder: "今天下午、明天上午、晚上 5 点后……",
    appointmentButton: "申请心理健康服务预约",
    appointmentSaving: "正在保存预约申请……",
    appointmentRequested: "预约申请已保存",
    appointmentMeta: "24/7 可用 · 多语言支持 · 安全保密",
    latestSummary: "最近一次健康摘要",
    latestJournal: "最近一次日记内容",
    latestAttachment: "最近一次附件",
    latestAppointment: "最近一次预约申请",
    appointmentStatusRequested: "已提交",
    doctorView: "提交后，医生会在他的界面看到这份摘要。",
    submitSaved: "记录已保存，医生现在可以看到摘要",
    submitSaving: "正在保存记录……",
    submitButton: "提交健康记录",
    privacy: "你的隐私很重要。所有数据都会被加密并受到保护。",
    helpNow: "如果你现在就需要帮助？",
    call988: "拨打 988",
    findHelpPrefix: "或访问",
    feelingLabels: {
      anxiety: "焦虑程度",
      stress: "压力程度",
      energy: "精力水平",
      focus: "专注与集中",
      hopelessness: "无助 / 绝望",
      anger: "愤怒 / 易怒",
      confidence: "自信 / 自我评价",
      overwhelmed: "不堪重负感",
    },
    recommendations: [
      { label: "方块呼吸练习", desc: "用 4-4-4-4 的节奏帮助缓解焦虑" },
      { label: "5-4-3-2-1 觉察练习", desc: "用感官把自己带回当下" },
      { label: "听舒缓的音乐", desc: "可以试试听双耳节拍或自然声音" },
      { label: "出去短走一会儿", desc: "哪怕 5 分钟，也可能让状态缓下来" },
      { label: "喝点水", desc: "保持水分有助于稳定情绪" },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Slider helper with gradient color                                  */
/* ------------------------------------------------------------------ */
function GradientSlider({ label, value, onChange, colors }) {
  const gradient = `linear-gradient(to right, ${colors.join(", ")})`;
  const pct = value;
  const dotColor = colors[Math.min(Math.floor((value / 100) * colors.length), colors.length - 1)];

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-sm w-44 flex-shrink-0" style={{ color: "var(--color-slate-600)" }}>{label}</span>
      <div className="flex-1 relative h-3">
        {/* Track background */}
        <div className="absolute inset-0 rounded-full" style={{ background: "var(--color-cream-200)" }} />
        {/* Filled track */}
        <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${pct}%`, background: gradient }} />
        {/* Thumb */}
        <input
          type="range" min="0" max="100" value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ height: "100%" }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white"
          style={{ left: `calc(${pct}% - 8px)`, background: dotColor, boxShadow: "0 1px 4px rgba(0,0,0,0.2)", pointerEvents: "none" }}
        />
      </div>
      <span className="text-sm font-semibold w-10 text-right" style={{ color: dotColor }}>{pct}%</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Therapeutic recommendations                                        */
/* ------------------------------------------------------------------ */
const RECOMMENDATIONS = [
  { icon: Wind, label: "Box Breathing Exercise", desc: "4-4-4-4 technique to calm anxiety", color: "var(--color-info-500)" },
  { icon: Users, label: "5-4-3-2-1 Grounding", desc: "Use your senses to stay present", color: "var(--color-coral-400)" },
  { icon: Music, label: "Listen to Calm Music", desc: "Try binaural beats or nature sounds", color: "var(--color-teal-600)" },
  { icon: Footprints, label: "Take a Short Walk", desc: "Even 5 minutes outside can help", color: "var(--color-coral-500)" },
  { icon: Droplets, label: "Drink Water", desc: "Stay hydrated to support your mood", color: "var(--color-info-700)" },
];

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function MentalHealthPage() {
  const { session, onAnalyzed } = useSession();
  const copy = PAGE_COPY[session.language] || PAGE_COPY.en;
  const patientName = session.patient?.first_name || copy.patient;
  const latestCheckin = session.mentalHealthCheckins?.length
    ? session.mentalHealthCheckins[session.mentalHealthCheckins.length - 1]
    : null;
  const latestAppointment = session.mentalHealthAppointments?.length
    ? session.mentalHealthAppointments[session.mentalHealthAppointments.length - 1]
    : null;

  /* ---- Section 1: Let's Talk (voice + text) ---- */
  const [messages, setMessages] = useState([
    { role: "assistant", content: PAGE_COPY[session.language]?.fallbackReply || PAGE_COPY.en.fallbackReply },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef(null);

  /* ---- Section 2: Journal ---- */
  const [journalTab, setJournalTab] = useState("write"); // write | image | file
  const [journalText, setJournalText] = useState("");
  const [journalAsset, setJournalAsset] = useState(null);

  /* ---- Section 3: Triggers ---- */
  const [intensity, setIntensity] = useState(5);
  const [selectedTriggers, setSelectedTriggers] = useState([]);
  const [triggerNotes, setTriggerNotes] = useState("");

  /* ---- Section 5: Feelings ---- */
  const [feelings, setFeelings] = useState({
    anxiety: 30, stress: 40, energy: 60, focus: 45,
    hopelessness: 25, anger: 30, confidence: 55, overwhelmed: 45,
  });

  /* ---- Section 6: Recommendation feedback ---- */
  const [recFeedback, setRecFeedback] = useState(null); // "helpful" | "need_more"
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [appointmentReason, setAppointmentReason] = useState("");
  const [preferredContact, setPreferredContact] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [appointmentBusy, setAppointmentBusy] = useState(false);
  const [appointmentSaved, setAppointmentSaved] = useState(false);

  /* ---- Pattern matches ---- */
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const recommendationList = useMemo(
    () => RECOMMENDATIONS.map((rec, index) => ({ ...rec, ...(copy.recommendations[index] || {}) })),
    [copy.recommendations]
  );

  useEffect(() => {
    api.getMentalHealthStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    setMessages((existing) => {
      if (existing.length > 1) return existing;
      return [{ role: "assistant", content: copy.fallbackReply }];
    });
  }, [copy.fallbackReply]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  /* ---- Chat send ---- */
  async function sendChat() {
    const text = input.trim();
    if (!text || busy) return;
    if (CRISIS_TRIGGERS.test(text)) setShowCrisis(true);

    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setBusy(true);

    api.matchMentalHealthPattern(text, 2).then((res) => setMatches(res.matches || [])).catch(() => {});

    try {
      const result = await api.chat(
        text, session.sessionId, session.language,
        session.patientContext,
        messages.map((m) => ({ role: m.role, content: m.content })),
        "mental_health"
      );
      const reply = result.response || result.reply || copy.fallbackReply;
      setMessages((m) => [...m, { role: "assistant", content: reply, method: result.method }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: copy.lostConnection, method: "error" }]);
    } finally {
      setBusy(false);
    }
  }

  /* ---- Speech recognition ---- */
  function toggleRecording() {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) return;
    if (isRecording) { setIsRecording(false); return; }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = session.language || "en";
    recognition.continuous = false;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => prev + (prev ? " " : "") + transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    setIsRecording(true);
  }

  /* ---- Submit entire check-in ---- */
  async function submitCheckin() {
    setSubmitting(true);
    try {
      await api.submitMentalHealthCheckin({
        session_id: session.sessionId,
        feelings,
        triggers: triggerNotes || null,
        trigger_categories: selectedTriggers,
        intensity,
        journal_text: journalText || null,
        journal_asset: journalAsset,
        recommendations_feedback: recFeedback,
      });
      onAnalyzed();
      setSubmitted(true);
    } catch (err) {
      console.error("[MentalHealth] checkin submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function requestAppointment() {
    if (!session.sessionId || appointmentBusy || !appointmentReason.trim()) return;
    setAppointmentBusy(true);
    try {
      await api.requestMentalHealthAppointment({
        session_id: session.sessionId,
        request_reason: appointmentReason.trim(),
        preferred_contact: preferredContact.trim() || null,
        preferred_time: preferredTime.trim() || null,
      });
      setAppointmentSaved(true);
      setAppointmentReason("");
      setPreferredContact("");
      setPreferredTime("");
      onAnalyzed();
    } catch (err) {
      console.error("[MentalHealth] appointment request failed:", err);
    } finally {
      setAppointmentBusy(false);
    }
  }

  function handleJournalFile(kind, file) {
    if (!file) return;
    setJournalAsset({
      kind,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size || null,
    });
  }

  const toggleTrigger = (key) => {
    setSelectedTriggers((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const updateFeeling = (key, val) => {
    setFeelings((prev) => ({ ...prev, [key]: val }));
  };

  /* Intensity label */
  const intensityLabel = intensity <= 2 ? copy.intensityLabels[0] : intensity <= 4 ? copy.intensityLabels[1] : intensity <= 6 ? copy.intensityLabels[2] : intensity <= 8 ? copy.intensityLabels[3] : copy.intensityLabels[4];
  const intensityColor = intensity <= 4 ? "var(--color-teal-600)" : intensity <= 6 ? "var(--color-amber-600)" : "var(--color-coral-500)";

  return (
    <div className="patient-page pb-32 lg:pb-6">
      <div className="space-y-6">
        {/* Page header */}
        <div className="patient-page-header pt-1">
          <div className="patient-page-title">
            <div className="patient-page-title-icon" style={{ background: "var(--color-coral-50)" }}>
              <Heart size={20} style={{ color: "var(--color-coral-500)" }} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: "var(--color-slate-800)" }}>{copy.title}</h1>
              <p className="text-xs" style={{ color: "var(--color-slate-500)" }}>
                {copy.subtitle}
                {stats && ` · grounded in ${stats.total_records || 600} cleaned cases`}
              </p>
            </div>
          </div>
          <div className="patient-stat-grid">
            <div className="patient-stat-card">
              <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>{copy.checkins}</p>
              <p className="text-sm font-semibold mt-1" style={{ color: "var(--color-slate-700)" }}>{session.mentalHealthCheckins?.length || 0} {copy.saved}</p>
            </div>
            <div className="patient-stat-card">
              <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>{copy.language}</p>
              <p className="text-sm font-semibold mt-1" style={{ color: "var(--color-slate-700)" }}>{getLanguageName(session.language)}</p>
            </div>
            <div className="patient-stat-card">
              <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>{copy.appointments}</p>
              <p className="text-sm font-semibold mt-1" style={{ color: "var(--color-slate-700)" }}>{session.mentalHealthAppointments?.length || 0} {copy.requested}</p>
            </div>
          </div>
        </div>

        {/* Crisis banner */}
        {showCrisis && (
          <div className="warm-card p-4 flex items-start gap-3" style={{
            background: "var(--color-coral-50)", borderLeft: "3px solid var(--color-coral-500)"
          }}>
            <AlertCircle size={18} style={{ color: "var(--color-coral-600)", marginTop: 2 }} />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: "var(--color-coral-700)" }}>
                {copy.crisisTitle}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-coral-600)" }}>
                {copy.crisisBody}
              </p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 1: Let's Talk                                         */}
        {/* ============================================================ */}
        <div className="warm-card p-5">
          <h2 className="font-semibold mb-1" style={{ color: "var(--color-slate-800)" }}>
            {copy.sectionTalk}
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--color-slate-500)" }}>
            {copy.sectionTalkSub}
          </p>

          {/* Language badge */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)", color: "var(--color-slate-600)" }}>
              <Globe size={12} /> {getLanguageName(session.language)}
            </div>
          </div>

          {/* Mic button */}
          <div className="flex justify-center mb-3">
            <button
              onClick={toggleRecording}
              className={`mic-btn ${isRecording ? "recording" : ""}`}
            >
              {isRecording ? <MicOff size={24} style={{ color: "white" }} /> : <Mic size={24} style={{ color: "var(--color-teal-600)" }} />}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px" style={{ background: "var(--color-cream-200)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--color-slate-400)" }}>{copy.typeDivider}</span>
            <div className="flex-1 h-px" style={{ background: "var(--color-cream-200)" }} />
          </div>

          {/* Chat messages */}
          <div ref={scrollRef} className="space-y-3 mb-3 overflow-y-auto" style={{ maxHeight: "300px" }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%] p-3 rounded-2xl"
                  style={{
                    background: m.role === "user" ? "var(--color-teal-500)" : "var(--color-cream-100)",
                    color: m.role === "user" ? "white" : "var(--color-slate-700)",
                    borderTopRightRadius: m.role === "user" ? "4px" : undefined,
                    borderTopLeftRadius: m.role === "assistant" ? "4px" : undefined,
                  }}>
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  {m.role === "assistant" && i > 0 && (
                    <div className="mt-2">
                      <ListenButton text={m.content} languageCode={session.language} compact />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="p-3 rounded-2xl" style={{ background: "var(--color-cream-100)" }}>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full"
                        style={{ background: "var(--color-slate-400)", animation: `pulse 1.4s ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Text input */}
          <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid var(--color-cream-200)" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
              placeholder={copy.chatPlaceholder}
              disabled={busy}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{ background: "var(--color-cream-50)", border: "1px solid var(--color-cream-200)" }}
            />
            <button onClick={sendChat} disabled={busy || !input.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--color-teal-500)", color: "white" }}>
              <Send size={16} />
            </button>
          </div>

          {/* System understood callout */}
          {messages.length > 2 && messages[messages.length - 1].role === "assistant" && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: "var(--color-cream-100)" }}>
              <p className="text-xs" style={{ color: "var(--color-slate-500)" }}>
                <span className="font-medium" style={{ color: "var(--color-slate-600)" }}>{copy.youSaid}</span> "{messages[messages.length - 2]?.content}"
              </p>
              <p className="text-xs mt-1">
                <span className="font-medium" style={{ color: "var(--color-slate-600)" }}>{copy.systemUnderstood}</span>{" "}
                <span style={{ color: "var(--color-slate-700)" }}>{messages[messages.length - 1]?.content?.slice(0, 100)}</span>
              </p>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* SECTION 2: Your Journal                                       */}
        {/* ============================================================ */}
        <div className="warm-card p-5">
          <h2 className="font-semibold mb-1" style={{ color: "var(--color-slate-800)" }}>
            {copy.journalTitle}
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--color-slate-500)" }}>
            {copy.journalSub}
          </p>

          {/* Tabs */}
          <div className="flex gap-0 mb-4" style={{ borderBottom: "1px solid var(--color-cream-200)" }}>
            {[
              { key: "write", label: copy.tabWrite },
              { key: "image", label: copy.tabImage },
              { key: "file", label: copy.tabFile },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setJournalTab(tab.key)}
                className="px-4 py-2 text-sm font-medium"
                style={{
                  color: journalTab === tab.key ? "var(--color-slate-800)" : "var(--color-slate-400)",
                  borderBottom: journalTab === tab.key ? "2px solid var(--color-slate-800)" : "2px solid transparent",
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          {journalTab === "write" && (
            <div>
              <textarea
                value={journalText}
                onChange={(e) => setJournalText(e.target.value.slice(0, 2000))}
                placeholder={copy.journalPlaceholder}
                rows={5}
                className="w-full px-3 py-3 rounded-xl text-sm focus:outline-none resize-none"
                style={{ background: "var(--color-cream-50)", border: "1px solid var(--color-cream-200)" }}
              />
              <p className="text-xs text-right mt-1" style={{ color: "var(--color-slate-400)" }}>
                {journalText.length}/2000
              </p>
            </div>
          )}

          {journalTab === "image" && (
            <div className="p-4 rounded-xl flex items-center gap-3"
              style={{ background: "var(--color-cream-50)", border: "1px dashed var(--color-cream-300)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "var(--color-teal-50)" }}>
                <Image size={18} style={{ color: "var(--color-teal-600)" }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-teal-600)" }}>{copy.uploadImageTitle}</p>
                <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>{copy.uploadImageMeta}</p>
              </div>
              <button
                onClick={() => imageInputRef.current?.click()}
                className="ml-auto px-3 py-2 rounded-xl text-sm font-medium"
                style={{ background: "white", border: "1px solid var(--color-cream-200)", color: "var(--color-slate-700)" }}
              >
                {copy.selectImage}
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleJournalFile("image", e.target.files?.[0])}
              />
            </div>
          )}

          {journalTab === "file" && (
            <div className="p-4 rounded-xl flex items-center gap-3"
              style={{ background: "var(--color-cream-50)", border: "1px dashed var(--color-cream-300)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "var(--color-teal-50)" }}>
                <FileText size={18} style={{ color: "var(--color-teal-600)" }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-teal-600)" }}>{copy.uploadFileTitle}</p>
                <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>{copy.uploadFileMeta}</p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="ml-auto px-3 py-2 rounded-xl text-sm font-medium"
                style={{ background: "white", border: "1px solid var(--color-cream-200)", color: "var(--color-slate-700)" }}
              >
                {copy.selectFile}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={(e) => handleJournalFile("file", e.target.files?.[0])}
              />
            </div>
          )}

          {journalAsset?.file_name && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: "white", border: "1px solid var(--color-cream-200)" }}>
              <p className="text-xs font-medium" style={{ color: "var(--color-slate-500)" }}>{copy.attached}</p>
              <p className="text-sm mt-1" style={{ color: "var(--color-slate-700)" }}>{journalAsset.file_name}</p>
            </div>
          )}

          <div className="flex items-center gap-1.5 mt-3">
            <Lock size={11} style={{ color: "var(--color-slate-400)" }} />
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>{copy.privateJournal}</p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 3: What's Triggering You?                             */}
        {/* ============================================================ */}
        <div className="warm-card p-5">
          <h2 className="font-semibold mb-1" style={{ color: "var(--color-slate-800)" }}>
            {copy.triggerTitle}
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--color-slate-500)" }}>
            {copy.triggerSub}
          </p>

          {/* Intensity slider */}
          <div className="mb-5">
            <p className="text-sm font-medium mb-2" style={{ color: "var(--color-slate-700)" }}>{copy.triggerIntensity}</p>
            <div className="relative">
              <div className="relative h-3 rounded-full" style={{ background: "var(--color-cream-200)" }}>
                <div className="absolute left-0 top-0 h-full rounded-full"
                  style={{ width: `${intensity * 10}%`, background: "var(--color-teal-500)" }} />
                <input type="range" min="0" max="10" value={intensity}
                  onChange={(e) => setIntensity(parseInt(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer" style={{ height: "100%" }} />
                <div className="absolute -top-7 px-2 py-0.5 rounded-lg text-xs font-semibold text-white"
                  style={{ left: `calc(${intensity * 10}% - 12px)`, background: "var(--color-teal-600)" }}>
                  {intensity}
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white"
                  style={{ left: `calc(${intensity * 10}% - 8px)`, background: "var(--color-teal-600)", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", pointerEvents: "none" }} />
              </div>
              <div className="flex justify-between mt-2">
                {copy.intensityLabels.map((l) => (
                  <span key={l} className="text-xs"
                    style={{ color: l === intensityLabel ? intensityColor : "var(--color-slate-400)", fontWeight: l === intensityLabel ? 600 : 400 }}>
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Category pills */}
          <div className="mb-4">
            <p className="text-sm font-medium mb-2" style={{ color: "var(--color-slate-700)" }}>{copy.triggerCategory}</p>
            <div className="flex flex-wrap gap-2">
              {TRIGGER_CATEGORIES.map((cat) => {
                const active = selectedTriggers.includes(cat.key);
                return (
                  <button key={cat.key} onClick={() => toggleTrigger(cat.key)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      background: active ? "var(--color-teal-50)" : "white",
                      color: active ? "var(--color-teal-700)" : "var(--color-slate-600)",
                      border: `1px solid ${active ? "var(--color-teal-300)" : "var(--color-cream-200)"}`,
                    }}>
                    <cat.icon size={14} /> {copy.categories[cat.key] || cat.key}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: "var(--color-slate-700)" }}>{copy.triggerNotes}</p>
            <textarea
              value={triggerNotes}
              onChange={(e) => setTriggerNotes(e.target.value.slice(0, 500))}
              placeholder={copy.triggerPlaceholder}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none"
              style={{ background: "var(--color-cream-50)", border: "1px solid var(--color-cream-200)" }}
            />
            <p className="text-xs text-right" style={{ color: "var(--color-slate-400)" }}>{triggerNotes.length}/500</p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 4: Pattern matches (from AI)                          */}
        {/* ============================================================ */}
        {matches.length > 0 && (
          <div className="warm-card p-5">
            <div className="flex items-center gap-2 mb-1">
                <Database size={14} style={{ color: "var(--color-info-600)" }} />
              <h2 className="font-semibold" style={{ color: "var(--color-slate-800)" }}>
                {copy.patternsTitle}
              </h2>
            </div>
            <p className="text-xs mb-3" style={{ color: "var(--color-slate-400)" }}>
              {copy.patternsSub}
            </p>
            <div className="space-y-3">
              {matches.map((m) => (
                <div key={m.id} className="p-3 rounded-xl" style={{ background: "var(--color-cream-50)" }}>
                  <p className="text-sm font-medium" style={{ color: "var(--color-slate-700)" }}>{m.title}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-slate-500)" }}>{m.summary}</p>
                  {m.what_helped?.length > 0 && (
                    <ul className="text-xs mt-2 space-y-1" style={{ color: "var(--color-slate-600)" }}>
                      {m.what_helped.slice(0, 3).map((w, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Sparkles size={10} style={{ color: "var(--color-teal-500)", marginTop: 3, flexShrink: 0 }} />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs mt-3 italic" style={{ color: "var(--color-slate-400)" }}>
              {copy.patternsFootnote}
            </p>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 5: Rate Your Feelings                                 */}
        {/* ============================================================ */}
        <div className="warm-card p-5">
          <h2 className="font-semibold mb-1" style={{ color: "var(--color-slate-800)" }}>
            {copy.feelingsTitle}
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--color-slate-500)" }}>
            {copy.feelingsSub}
          </p>

          <div className="space-y-1">
            <GradientSlider label={copy.feelingLabels.anxiety} value={feelings.anxiety} onChange={(v) => updateFeeling("anxiety", v)}
              colors={["#3B82F6", "#8B5CF6", "#A78BFA"]} />
            <GradientSlider label={copy.feelingLabels.stress} value={feelings.stress} onChange={(v) => updateFeeling("stress", v)}
              colors={["#3B82F6", "#8B5CF6", "#A78BFA"]} />
            <GradientSlider label={copy.feelingLabels.energy} value={feelings.energy} onChange={(v) => updateFeeling("energy", v)}
              colors={["#E24B4A", "#E5A030", "#3AA882"]} />
            <GradientSlider label={copy.feelingLabels.focus} value={feelings.focus} onChange={(v) => updateFeeling("focus", v)}
              colors={["#3B82F6", "#8B5CF6", "#A78BFA"]} />
            <GradientSlider label={copy.feelingLabels.hopelessness} value={feelings.hopelessness} onChange={(v) => updateFeeling("hopelessness", v)}
              colors={["#E24B4A", "#8B5CF6"]} />
            <GradientSlider label={copy.feelingLabels.anger} value={feelings.anger} onChange={(v) => updateFeeling("anger", v)}
              colors={["#E5A030", "#E24B4A"]} />
            <GradientSlider label={copy.feelingLabels.confidence} value={feelings.confidence} onChange={(v) => updateFeeling("confidence", v)}
              colors={["#3B82F6", "#8B5CF6", "#3AA882"]} />
            <GradientSlider label={copy.feelingLabels.overwhelmed} value={feelings.overwhelmed} onChange={(v) => updateFeeling("overwhelmed", v)}
              colors={["#3B82F6", "#8B5CF6", "#E24B4A", "#3AA882"]} />
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 6: Therapeutic Recommendations                        */}
        {/* ============================================================ */}
        <div className="warm-card p-5">
          <h2 className="font-semibold mb-1" style={{ color: "var(--color-slate-800)" }}>
            {copy.recommendationsTitle}
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--color-slate-500)" }}>
            {copy.recommendationsSub}
          </p>

          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-cream-200)" }}>
            {recommendationList.map((rec, i) => (
              <div key={i}
                className="flex items-center gap-3 p-4"
                style={{ borderBottom: i < RECOMMENDATIONS.length - 1 ? "1px solid var(--color-cream-100)" : "none" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--color-cream-100)" }}>
                  <rec.icon size={18} style={{ color: rec.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: "var(--color-slate-800)" }}>{rec.label}</p>
                  <p className="text-xs" style={{ color: "var(--color-slate-500)" }}>{rec.desc}</p>
                </div>
                <ChevronRight size={16} style={{ color: "var(--color-slate-300)" }} />
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-4">
              <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium"
              style={{ border: "1px solid var(--color-teal-300)", color: "var(--color-teal-600)" }}>
              {copy.viewResources} <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {(latestCheckin || latestAppointment) && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <div className="warm-card p-5 xl:col-span-8">
              <div className="flex items-center gap-2 mb-2">
                <BookHeart size={16} style={{ color: "var(--color-coral-500)" }} />
                <h2 className="font-semibold" style={{ color: "var(--color-slate-800)" }}>{copy.latestSummary}</h2>
              </div>
              <p className="text-xs mb-3" style={{ color: "var(--color-slate-500)" }}>{copy.doctorView}</p>
              <div className="space-y-3">
                {latestCheckin?.summary && (
                  <div className="p-3 rounded-xl" style={{ background: "var(--color-cream-50)", border: "1px solid var(--color-cream-200)" }}>
                    <p className="text-sm" style={{ color: "var(--color-slate-700)" }}>{latestCheckin.summary}</p>
                  </div>
                )}
                {latestCheckin?.journal_text && (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: "var(--color-slate-500)" }}>{copy.latestJournal}</p>
                    <p className="text-sm" style={{ color: "var(--color-slate-700)" }}>{latestCheckin.journal_text}</p>
                  </div>
                )}
                {latestCheckin?.journal_asset?.file_name && (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: "var(--color-slate-500)" }}>{copy.latestAttachment}</p>
                    <p className="text-sm" style={{ color: "var(--color-slate-700)" }}>{latestCheckin.journal_asset.file_name}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="warm-card p-5 xl:col-span-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} style={{ color: "var(--color-teal-600)" }} />
                <h2 className="font-semibold" style={{ color: "var(--color-slate-800)" }}>{copy.latestAppointment}</h2>
              </div>
              {latestAppointment ? (
                <div className="space-y-2 text-sm" style={{ color: "var(--color-slate-700)" }}>
                  <p>{latestAppointment.request_reason}</p>
                  {latestAppointment.preferred_contact && <p style={{ color: "var(--color-slate-500)" }}>{latestAppointment.preferred_contact}</p>}
                  {latestAppointment.preferred_time && <p style={{ color: "var(--color-slate-500)" }}>{latestAppointment.preferred_time}</p>}
                  <p className="text-xs" style={{ color: "var(--color-teal-600)" }}>{latestAppointment.status || copy.appointmentStatusRequested}</p>
                </div>
              ) : (
                <p className="text-sm" style={{ color: "var(--color-slate-500)" }}>{copy.appointmentMeta}</p>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* FEEDBACK + BOOK APPOINTMENT BAR                               */}
        {/* ============================================================ */}
        <div className="warm-card p-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Feedback */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden"
                  style={{ background: "var(--color-cream-200)" }}>
                  <span className="text-xs font-semibold" style={{ color: "var(--color-slate-600)" }}>
                    {(patientName[0] || "?").toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--color-slate-700)" }}>{patientName}</p>
                  <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>{copy.patient}</p>
                </div>
              </div>
              <p className="text-sm font-medium mb-3" style={{ color: "var(--color-slate-700)" }}>
                {copy.feedbackQuestion}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setRecFeedback("helpful")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium"
                  style={{
                    background: recFeedback === "helpful" ? "var(--color-teal-50)" : "white",
                    color: recFeedback === "helpful" ? "var(--color-teal-700)" : "var(--color-teal-600)",
                    border: `1px solid ${recFeedback === "helpful" ? "var(--color-teal-300)" : "var(--color-cream-200)"}`,
                  }}>
                  <span>👍</span> {copy.feedbackHelpful}
                </button>
                <button onClick={() => setRecFeedback("need_more")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium"
                  style={{
                    background: recFeedback === "need_more" ? "var(--color-coral-50)" : "white",
                    color: recFeedback === "need_more" ? "var(--color-coral-600)" : "var(--color-slate-600)",
                    border: `1px solid ${recFeedback === "need_more" ? "var(--color-coral-200)" : "var(--color-cream-200)"}`,
                  }}>
                  <span>👎</span> {copy.feedbackNeedMore}
                </button>
              </div>
            </div>

            {/* Book appointment */}
            <div className="p-4 rounded-xl" style={{ background: "var(--color-cream-50)" }}>
              <div className="flex items-start gap-2 mb-2">
                <Heart size={16} style={{ color: "var(--color-coral-500)" }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-slate-800)" }}>{copy.supportTitle}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-slate-500)" }}>
                    {copy.supportBody}
                  </p>
                </div>
              </div>
              <div className="space-y-2 mt-3">
                <input
                  value={appointmentReason}
                  onChange={(e) => setAppointmentReason(e.target.value)}
                  placeholder={copy.appointmentReasonPlaceholder}
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{ background: "white", border: "1px solid var(--color-cream-200)" }}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    value={preferredContact}
                    onChange={(e) => setPreferredContact(e.target.value)}
                    placeholder={copy.appointmentContact}
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ background: "white", border: "1px solid var(--color-cream-200)" }}
                  />
                  <input
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    placeholder={copy.appointmentTimePlaceholder}
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ background: "white", border: "1px solid var(--color-cream-200)" }}
                  />
                </div>
              </div>
              <button
                onClick={requestAppointment}
                disabled={appointmentBusy || !appointmentReason.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold mt-3"
                style={{ background: "var(--color-coral-400)", color: "white" }}>
                <Calendar size={14} /> {appointmentBusy ? copy.appointmentSaving : appointmentSaved ? copy.appointmentRequested : copy.appointmentButton}
              </button>
              <p className="text-xs text-center mt-2" style={{ color: "var(--color-slate-400)" }}>
                {copy.appointmentMeta}
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SUBMIT CHECK-IN                                               */}
        {/* ============================================================ */}
        <div className="flex justify-center">
          <button
            onClick={submitCheckin}
            disabled={submitting || submitted}
            className="px-8 py-3 rounded-xl text-sm font-semibold flex items-center gap-2"
            style={{
              background: submitted ? "var(--color-teal-500)" : "var(--color-teal-600)",
              color: "white",
              opacity: submitting ? 0.7 : 1,
            }}>
            {submitted ? (
              <><Sparkles size={14} /> {copy.submitSaved}</>
            ) : submitting ? (
              <><div className="spinner" style={{ width: 14, height: 14, borderTopColor: "white", borderColor: "rgba(255,255,255,0.3)" }} /> {copy.submitSaving}</>
            ) : (
              <><Send size={14} /> {copy.submitButton}</>
            )}
          </button>
        </div>

        {/* ============================================================ */}
        {/* PRIVACY FOOTER                                                */}
        {/* ============================================================ */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
          <div className="flex items-center gap-1.5">
            <Lock size={11} style={{ color: "var(--color-slate-400)" }} />
            <p className="text-xs" style={{ color: "var(--color-slate-500)" }}>
              {copy.privacy}
            </p>
          </div>
          <p className="text-xs" style={{ color: "var(--color-slate-500)" }}>
            {copy.helpNow} <a href="tel:988" className="font-semibold" style={{ color: "var(--color-slate-700)" }}>{copy.call988}</a> {copy.findHelpPrefix}{" "}
            <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className="font-semibold" style={{ color: "var(--color-slate-700)" }}>findahelpline.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
