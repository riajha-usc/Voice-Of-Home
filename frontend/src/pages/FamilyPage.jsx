import { useEffect, useMemo, useRef, useState } from "react";
import { Users, Plus, Phone, Mail, X, Copy, Check, Volume2, Globe, Send, MessageCircle, Heart } from "lucide-react";
import { useSession } from "../hooks/useSession";
import { LanguageSelector, ListenButton, getLanguageName } from "../components/shared/UIComponents";
import { api } from "../utils/api";

const RELATIONSHIPS = ["Daughter", "Son", "Spouse", "Parent", "Sibling", "Grandchild", "Caregiver", "Neighbor", "Friend", "Other"];
const RELATIONSHIP_LABELS = {
  zh: {
    Daughter: "女儿",
    Son: "儿子",
    Spouse: "配偶",
    Parent: "父母",
    Sibling: "兄弟姐妹",
    Grandchild: "孙辈",
    Caregiver: "照护者",
    Neighbor: "邻居",
    Friend: "朋友",
    Other: "其他",
  },
};
const PAGE_COPY = {
  en: {
    assistantGreeting: "I'm here to help your family understand the care plan. Ask me anything.",
    title: "Care circle",
    subtitle: "Family members, care instructions, and the shared assistant in one workspace.",
    members: "Members",
    connected: "connected",
    voiceMessages: "Voice messages",
    stored: "stored",
    shareCode: "Share this 6-digit code so family members can join the same live session.",
    liveStorage: "Live from session storage",
    memberCountSuffix: "members",
    addMember: "Add member",
    noMembers: "No one in the care circle yet. Add family or share the join code.",
    addFamilyMember: "Add a family member",
    cancel: "Cancel",
    name: "Name",
    phone: "Phone",
    email: "Email",
    preferredLanguage: "Preferred language",
    adding: "Adding...",
    careInstructions: "Care instructions",
    careInstructionsSub: "Generate a voice version of the care plan and store it on the live session for every device.",
    medication: "Medication",
    discharge: "Discharge",
    followup: "Follow-up",
    custom: "Custom",
    carePlaceholder: "Enter the instructions you want the family to hear.",
    generateVoice: "Generate voice message",
    generating: "Generating...",
    latestMessage: "Latest message",
    playPreview: "Play preview",
    stopPreview: "Stop preview",
    recentMessages: "Recent session messages",
    careMessage: "Care message",
    storedSession: "Stored on the shared care session.",
    careAssistant: "Care assistant",
    assistantPlaceholder: "Ask about medications, food, discharge, or next steps.",
    retryConnection: "I lost the connection for a moment. Please try again.",
  },
  zh: {
    assistantGreeting: "我会帮助您的家人理解护理计划。您可以随时提问。",
    title: "护理圈",
    subtitle: "家属成员、护理说明和共享助手都集中在这里。",
    members: "成员",
    connected: "位已连接",
    voiceMessages: "语音消息",
    stored: "条已保存",
    shareCode: "分享这个 6 位代码，让家属在同一个实时会话中加入。",
    liveStorage: "实时会话存储",
    memberCountSuffix: "位成员",
    addMember: "添加成员",
    noMembers: "护理圈中还没有成员。请添加家属或分享加入代码。",
    addFamilyMember: "添加家庭成员",
    cancel: "取消",
    name: "姓名",
    phone: "电话",
    email: "邮箱",
    preferredLanguage: "首选语言",
    adding: "添加中...",
    careInstructions: "护理说明",
    careInstructionsSub: "生成护理计划的语音版本，并把它保存到所有设备共享的实时会话中。",
    medication: "药物",
    discharge: "出院",
    followup: "复诊",
    custom: "自定义",
    carePlaceholder: "输入您希望家属听到的护理说明。",
    generateVoice: "生成语音消息",
    generating: "生成中...",
    latestMessage: "最新消息",
    playPreview: "播放预览",
    stopPreview: "停止预览",
    recentMessages: "最近的会话消息",
    careMessage: "护理消息",
    storedSession: "已保存到共享护理会话中。",
    careAssistant: "护理助手",
    assistantPlaceholder: "询问药物、饮食、出院或下一步安排。",
    retryConnection: "我刚才短暂断开了连接，请再试一次。",
  },
};

function nowTime(value = null) {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function AudioPreview({ audioBase64, duration, copy }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  function toggle() {
    if (!audioBase64) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }
    audioRef.current.play();
    setIsPlaying(true);
  }

  return (
    <button onClick={toggle} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm"
      style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)", color: "var(--color-slate-700)" }}>
      <Volume2 size={14} style={{ color: "var(--color-coral-500)" }} />
      <span>{isPlaying ? copy.stopPreview : copy.playPreview}</span>
      <span className="text-xs ml-auto" style={{ color: "var(--color-slate-400)" }}>
        0:{String(Math.round(duration || 0)).padStart(2, "0")}
      </span>
    </button>
  );
}

export default function FamilyPage() {
  const { session, addCareCircleMember, removeCareCircleMember, onAnalyzed } = useSession();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("Daughter");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [language, setLanguage] = useState(session.language || "en");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const [careText, setCareText] = useState("");
  const [messageType, setMessageType] = useState("custom");
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [latestVoice, setLatestVoice] = useState(null);

  const [messages, setMessages] = useState(() => {
    const persisted = (session.chatHistory || []).flatMap((entry) => {
      const list = [];
      if (entry.user_message) list.push({ role: "user", content: entry.user_message, timestamp: nowTime(entry.timestamp) });
      if (entry.assistant_message) list.push({ role: "assistant", content: entry.assistant_message, timestamp: nowTime(entry.timestamp) });
      return list;
    });
    return persisted.length > 0
      ? persisted
      : [{ role: "assistant", content: PAGE_COPY[session.language]?.assistantGreeting || PAGE_COPY.en.assistantGreeting, timestamp: nowTime() }];
  });
  const [input, setInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatBusy]);

  useEffect(() => {
    const persisted = (session.chatHistory || []).flatMap((entry) => {
      const list = [];
      if (entry.user_message) list.push({ role: "user", content: entry.user_message, timestamp: nowTime(entry.timestamp) });
      if (entry.assistant_message) list.push({ role: "assistant", content: entry.assistant_message, timestamp: nowTime(entry.timestamp) });
      return list;
    });
    if (persisted.length > 0) {
      setMessages(persisted);
    }
  }, [session.chatHistory]);

  const recentVoiceMessages = useMemo(
    () => [...(session.voiceMessages || [])].slice(-3).reverse(),
    [session.voiceMessages]
  );
  const copy = PAGE_COPY[session.language] || PAGE_COPY.en;
  const relationshipLabels = RELATIONSHIP_LABELS[session.language] || {};

  async function handleAdd() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addCareCircleMember({
        name: name.trim(),
        relationship,
        phone: phone.trim() || null,
        email: email.trim() || null,
        language_code: language,
      });
      setName("");
      setPhone("");
      setEmail("");
      setShowAdd(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function copyJoinCode() {
    if (!session.joinCode) return;
    navigator.clipboard.writeText(session.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleGenerateVoice() {
    if (!careText.trim()) return;
    setVoiceBusy(true);
    setVoiceError(null);
    try {
      const data = await api.generateVoice(careText.trim(), session.language, session.sessionId, messageType);
      setLatestVoice(data);
      setCareText("");
      onAnalyzed();
    } catch (err) {
      setVoiceError(err.message);
    } finally {
      setVoiceBusy(false);
    }
  }

  async function handleSendChat() {
    if (!input.trim() || chatBusy) return;
    const userText = input.trim();
    const userMessage = { role: "user", content: userText, timestamp: nowTime() };
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setChatBusy(true);
    try {
      const result = await api.chat(
        userText,
        session.sessionId,
        session.language,
        session.patientContext,
        history,
        "care"
      );
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply || result.response, timestamp: nowTime() },
      ]);
      onAnalyzed();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: err.message || copy.retryConnection, timestamp: nowTime() },
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <div className="patient-page">
      <div className="patient-page-header">
        <div className="patient-page-title">
          <div className="patient-page-title-icon" style={{ background: "var(--color-coral-50)" }}>
            <Users size={20} style={{ color: "var(--color-coral-500)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "var(--color-slate-800)" }}>{copy.title}</h1>
            <p className="text-sm" style={{ color: "var(--color-slate-400)" }}>{copy.subtitle}</p>
          </div>
        </div>
        <div className="patient-stat-grid">
          <div className="patient-stat-card">
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>{copy.members}</p>
            <p className="text-sm font-semibold mt-1" style={{ color: "var(--color-slate-700)" }}>{session.careCircle.length} {copy.connected}</p>
          </div>
          <div className="patient-stat-card">
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>{copy.voiceMessages}</p>
            <p className="text-sm font-semibold mt-1" style={{ color: "var(--color-slate-700)" }}>{session.voiceMessages?.length || 0} {copy.stored}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {session.joinCode && (
          <div className="warm-card p-5" style={{ background: "linear-gradient(135deg, var(--color-teal-50) 0%, var(--color-cream-50) 100%)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--color-slate-500)" }}>
              {copy.shareCode}
            </p>
            <div className="flex items-center gap-3">
              <p className="text-3xl font-semibold tracking-widest" style={{ color: "var(--color-teal-700)" }}>{session.joinCode}</p>
              <button onClick={copyJoinCode} className="p-2 rounded-lg" style={{ background: "var(--color-cream-100)" }}>
                {copied ? <Check size={16} style={{ color: "var(--color-teal-600)" }} /> : <Copy size={16} style={{ color: "var(--color-slate-500)" }} />}
              </button>
              <span className="text-xs ml-auto" style={{ color: "var(--color-slate-500)" }}>{copy.liveStorage}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="warm-card p-5 xl:col-span-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium" style={{ color: "var(--color-slate-700)" }}>
                {session.careCircle.length} {copy.memberCountSuffix}
              </h2>
              <button onClick={() => setShowAdd(true)} className="btn-primary text-sm flex items-center gap-1">
                <Plus size={14} /> {copy.addMember}
              </button>
            </div>

            {session.careCircle.length === 0 ? (
              <div className="text-center py-8">
                <Users size={28} style={{ color: "var(--color-slate-300)", margin: "0 auto 8px" }} />
                <p className="text-sm" style={{ color: "var(--color-slate-400)" }}>
                  {copy.noMembers}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {session.careCircle.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--color-cream-100)" }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                      style={{ background: "var(--color-info-50)", color: "var(--color-info-700)" }}>
                      {m.initials || (m.name || "?")[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: "var(--color-slate-800)" }}>{m.name}</p>
                      <p className="text-xs" style={{ color: "var(--color-slate-500)" }}>
                        {relationshipLabels[m.relationship] || m.relationship}
                        {m.language_code && ` · ${getLanguageName(m.language_code)}`}
                      </p>
                      {(m.phone || m.email) && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--color-slate-400)" }}>
                          {m.phone && <span className="inline-flex items-center gap-1 mr-3"><Phone size={10} />{m.phone}</span>}
                          {m.email && <span className="inline-flex items-center gap-1"><Mail size={10} />{m.email}</span>}
                        </p>
                      )}
                    </div>
                    <button onClick={() => removeCareCircleMember(m.id)}
                      className="p-1.5 rounded-lg opacity-50 hover:opacity-100"
                      style={{ color: "var(--color-slate-400)" }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showAdd && (
              <div className="mt-4 pt-4 space-y-3" style={{ borderTop: "1px solid var(--color-cream-200)" }}>
                <div className="flex items-center justify-between">
                  <h3 className="font-medium" style={{ color: "var(--color-slate-700)" }}>{copy.addFamilyMember}</h3>
                  <button onClick={() => setShowAdd(false)} className="text-sm" style={{ color: "var(--color-slate-400)" }}>{copy.cancel}</button>
                </div>

                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={copy.name}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none"
                  style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)" }} />

                <div className="flex flex-wrap gap-2">
                  {RELATIONSHIPS.map((r) => (
                    <button key={r} onClick={() => setRelationship(r)} className="px-3 py-1 rounded-full text-xs"
                      style={{
                        background: relationship === r ? "var(--color-coral-500)" : "var(--color-cream-100)",
                        color: relationship === r ? "white" : "var(--color-slate-600)",
                        border: "1px solid var(--color-cream-200)",
                      }}>
                      {relationshipLabels[r] || r}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={copy.phone}
                    className="w-full px-3 py-2 rounded-lg focus:outline-none"
                    style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)" }} />
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={copy.email}
                    className="w-full px-3 py-2 rounded-lg focus:outline-none"
                    style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)" }} />
                </div>

                <div>
                  <label className="text-xs block mb-1 flex items-center gap-1" style={{ color: "var(--color-slate-500)" }}>
                    <Globe size={11} /> {copy.preferredLanguage}
                  </label>
                  <LanguageSelector selected={language} onSelect={setLanguage} />
                </div>

                {error && <p className="text-xs" style={{ color: "var(--color-danger-500)" }}>{error}</p>}

                <button onClick={handleAdd} disabled={busy || !name.trim()} className="btn-primary w-full">
                  {busy ? copy.adding : copy.addMember}
                </button>
              </div>
            )}
          </div>

          <div className="warm-card p-5 xl:col-span-7">
            <div className="flex items-center gap-2 mb-3">
              <Volume2 size={16} style={{ color: "var(--color-coral-500)" }} />
              <h2 className="font-medium" style={{ color: "var(--color-slate-700)" }}>{copy.careInstructions}</h2>
            </div>
            <p className="text-xs mb-3" style={{ color: "var(--color-slate-500)" }}>
              {copy.careInstructionsSub}
            </p>

            <div className="flex gap-2 flex-wrap mb-3">
              {[
                { value: "medication", label: copy.medication },
                { value: "discharge", label: copy.discharge },
                { value: "followup", label: copy.followup },
                { value: "custom", label: copy.custom },
              ].map((type) => (
                <button key={type.value} onClick={() => setMessageType(type.value)} className="px-3 py-1 rounded-full text-xs"
                  style={{
                    background: messageType === type.value ? "var(--color-teal-500)" : "var(--color-cream-100)",
                    color: messageType === type.value ? "white" : "var(--color-slate-600)",
                    border: "1px solid var(--color-cream-200)",
                  }}>
                  {type.label}
                </button>
              ))}
            </div>

            <textarea value={careText} onChange={(e) => setCareText(e.target.value)}
              placeholder={copy.carePlaceholder}
              rows={4}
              className="w-full px-3 py-2 rounded-xl text-sm resize-none focus:outline-none"
              style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)", color: "var(--color-slate-700)" }} />

            <button onClick={handleGenerateVoice} disabled={!careText.trim() || voiceBusy} className="btn-primary w-full mt-3">
              {voiceBusy ? copy.generating : copy.generateVoice}
            </button>

            {voiceError && <p className="text-xs mt-2" style={{ color: "var(--color-danger-500)" }}>{voiceError}</p>}

            {latestVoice?.audio_base64 && (
              <div className="mt-4 p-3 rounded-xl" style={{ background: "var(--color-cream-50)", border: "1px solid var(--color-cream-200)" }}>
                <p className="text-sm font-medium mb-2" style={{ color: "var(--color-slate-700)" }}>
                  {copy.latestMessage}
                </p>
                {latestVoice.simplified_text?.translated && (
                  <p className="text-sm mb-3" style={{ color: "var(--color-slate-600)" }}>{latestVoice.simplified_text.translated}</p>
                )}
                <AudioPreview audioBase64={latestVoice.audio_base64} duration={latestVoice.duration_seconds} copy={copy} />
              </div>
            )}

            {recentVoiceMessages.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium" style={{ color: "var(--color-slate-400)" }}>{copy.recentMessages}</p>
                {recentVoiceMessages.map((msg) => (
                  <div key={msg.id || msg.timestamp} className="p-3 rounded-xl" style={{ background: "var(--color-cream-50)" }}>
                    <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-slate-400)" }}>
                      <Heart size={11} style={{ color: "var(--color-coral-500)" }} />
                      <span>{msg.typeLabel || msg.message_type || copy.careMessage}</span>
                      <span>{nowTime(msg.timestamp)}</span>
                    </div>
                    <p className="text-sm mt-1" style={{ color: "var(--color-slate-700)" }}>
                      {msg.simplified_text?.translated || msg.simplified_text?.simplified_english || msg.message || msg.original_text || copy.storedSession}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="warm-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle size={16} style={{ color: "var(--color-teal-600)" }} />
            <h2 className="font-medium" style={{ color: "var(--color-slate-700)" }}>{copy.careAssistant}</h2>
          </div>
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {messages.map((msg, idx) => (
              <div key={`${msg.role}-${idx}-${msg.timestamp}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%] px-4 py-3 text-sm"
                  style={msg.role === "user"
                    ? { background: "var(--color-coral-400)", color: "white", borderRadius: "var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)" }
                    : { background: "white", color: "var(--color-slate-700)", borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px", border: "1px solid var(--color-cream-200)" }}>
                  <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{msg.content}</p>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-xs opacity-50">{msg.timestamp}</span>
                    {msg.role === "assistant" && <ListenButton text={msg.content} languageCode={session.language} compact />}
                  </div>
                </div>
              </div>
            ))}
            {chatBusy && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl" style={{ background: "white", border: "1px solid var(--color-cream-200)" }}>
                  <div className="flex gap-1.5">
                    {[0, 150, 300].map((d) => <div key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--color-coral-300)", animationDelay: `${d}ms` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          <div className="flex gap-2 mt-4">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              placeholder={copy.assistantPlaceholder}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{ background: "white", border: "1px solid var(--color-cream-200)", color: "var(--color-slate-700)" }} />
            <button onClick={handleSendChat} disabled={!input.trim() || chatBusy}
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: input.trim() ? "var(--color-coral-400)" : "var(--color-cream-200)" }}>
              <Send size={16} color={input.trim() ? "white" : "var(--color-slate-400)"} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
