import { useState, createContext, useContext } from "react";

const SessionContext = createContext(null);

const INITIAL_STATE = {
  sessionId: "session_" + Date.now().toString(36),
  language: "vi",
  patientContext: {
    language: "Vietnamese",
    conditions: [],
    medications: [],
    dietary_restrictions: [],
  },
  careCircle: [
    { id: "1", name: "Trang Nguyen", role: "Daughter", initials: "TN", messagesHeard: 0, messagesTotal: 0 },
    { id: "2", name: "Minh Nguyen", role: "Son", initials: "MN", messagesHeard: 0, messagesTotal: 0 },
    { id: "3", name: "Lan Tran", role: "Neighbor", initials: "LT", messagesHeard: 0, messagesTotal: 0 },
  ],
  symptomInsights: [],
  dietaryResults: [],
  voiceMessages: [],
  chatHistory: [],
};

export function SessionProvider({ children }) {
  const [session, setSession] = useState(INITIAL_STATE);

  const updateLanguage = (code) => {
    const names = { vi: "Vietnamese", es: "Spanish", ht: "Haitian Creole", hi: "Hindi", zh: "Mandarin", tl: "Tagalog", ko: "Korean", ar: "Arabic", fa: "Farsi", en: "English" };
    setSession((s) => ({ ...s, language: code, patientContext: { ...s.patientContext, language: names[code] || code } }));
  };

  const addInsight = (insight) => {
    setSession((s) => ({ ...s, symptomInsights: [...s.symptomInsights, ...( Array.isArray(insight) ? insight : [insight])] }));
  };

  const addDietaryResult = (result) => {
    setSession((s) => ({ ...s, dietaryResults: [...s.dietaryResults, result] }));
  };

  const addVoiceMessage = (msg) => {
    setSession((s) => ({
      ...s,
      voiceMessages: [...s.voiceMessages, msg],
      careCircle: s.careCircle.map((m) => ({ ...m, messagesTotal: m.messagesTotal + 1, messagesHeard: m.messagesHeard + (Math.random() > 0.3 ? 1 : 0) })),
    }));
  };

  const addChatMessage = (msg) => {
    setSession((s) => ({ ...s, chatHistory: [...s.chatHistory, msg] }));
  };

  return (
    <SessionContext.Provider value={{ session, updateLanguage, addInsight, addDietaryResult, addVoiceMessage, addChatMessage }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
