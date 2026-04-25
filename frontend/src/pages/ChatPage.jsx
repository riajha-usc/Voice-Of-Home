import { useState, useRef, useEffect } from "react";
import { Send, Shield, Heart } from "lucide-react";
import { useSession } from "../hooks/useSession";
import { ListenButton } from "../components/shared/UIComponents";
import { api } from "../utils/api";
import { t, isRTL } from "../utils/translations";

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
  const { session, addChatMessage } = useSession();
  const rtl = isRTL(session.language);
  const [messages, setMessages] = useState([
    { role: "assistant", content: t(session.language, "chat_greeting"), timestamp: nowTime() },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef(null);
  const lastGreetingLang = useRef(session.language);

  // Re-greet in new language when language changes
  useEffect(() => {
    if (lastGreetingLang.current !== session.language) {
      lastGreetingLang.current = session.language;
      setMessages((prev) => {
        // Replace initial greeting if still first message
        if (prev.length === 1 && prev[0].role === "assistant") {
          return [{ role: "assistant", content: t(session.language, "chat_greeting"), timestamp: nowTime() }];
        }
        return prev;
      });
    }
  }, [session.language]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = { role: "user", content: input.trim(), timestamp: nowTime() };
    setMessages((p) => [...p, userMsg]);
    addChatMessage(userMsg);
    setInput("");
    setIsLoading(true);
    try {
      const history = messages
        .filter((m) => m.role !== "system" && !m.isError)
        .map((m) => ({ role: m.role, content: m.content }));
      const data = await api.chat(
        userMsg.content,
        null,
        session.language,
        session.patientContext,
        history
      );
      const assistantMsg = { role: "assistant", content: data.reply, timestamp: nowTime() };
      setMessages((p) => [...p, assistantMsg]);
      addChatMessage(assistantMsg);
    } catch {
      setMessages((p) => [
        ...p,
        { role: "assistant", content: t(session.language, "chat_error"), timestamp: nowTime(), isError: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQ = ["Can my mother take the blue pill with food?", "What does 'discharge against medical advice' mean?", "What foods should she avoid?"];

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto" dir={rtl ? "rtl" : "ltr"}>
      <div className="p-6 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--color-coral-50)" }}>
            <Heart size={20} style={{ color: "var(--color-coral-400)" }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--color-slate-800)" }}>{t(session.language, "chat_title")}</h1>
            <p className="text-sm" style={{ color: "var(--color-slate-400)" }}>{t(session.language, "chat_subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 space-y-3 overflow-y-auto pb-40">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[80%] px-4 py-3 text-sm"
              style={msg.role === "user"
                ? { background: "var(--color-coral-400)", color: "white", borderRadius: "var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)" }
                : { background: msg.isError ? "var(--color-danger-50)" : "white", color: "var(--color-slate-700)", borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px", border: "1px solid var(--color-cream-200)" }}
            >
              <p style={{ lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{msg.content}</p>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-xs opacity-50">{msg.timestamp}</span>
                {msg.role === "assistant" && !msg.isError && (
                  <ListenButton text={msg.content} languageCode={session.language} compact />
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl" style={{ background: "white", border: "1px solid var(--color-cream-200)" }}>
              <div className="flex gap-1.5">
                {[0, 150, 300].map((d) => <div key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--color-coral-300)", animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 2 && (
        <div className="px-6 pb-2">
          <div className="flex flex-wrap gap-2">
            {quickQ.map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="text-xs px-3 py-1.5 rounded-full cursor-pointer"
                style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)", color: "var(--color-slate-500)" }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 px-6 py-3" style={{ background: "rgba(255,249,242,0.95)", backdropFilter: "blur(8px)", borderTop: "1px solid var(--color-cream-200)" }}>
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={t(session.language, "chat_placeholder")}
            dir={rtl ? "rtl" : "ltr"}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none"
            style={{ background: "white", border: "1px solid var(--color-cream-200)", color: "var(--color-slate-700)" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
            style={{ background: input.trim() ? "var(--color-coral-400)" : "var(--color-cream-200)" }}
          >
            <Send size={16} color={input.trim() ? "white" : "var(--color-slate-400)"} />
          </button>
        </div>
        <div className="max-w-2xl mx-auto flex items-center gap-1.5 mt-2">
          <Shield size={10} style={{ color: "var(--color-teal-500)" }} />
          <p className="text-xs" style={{ color: "var(--color-teal-600)" }}>{t(session.language, "chat_privacy")}</p>
        </div>
      </div>
    </div>
  );
}
