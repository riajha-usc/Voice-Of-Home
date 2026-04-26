import { useState, useRef } from "react";
import { Camera, Leaf, Check, X, Shield, Flame, Droplet, Wheat } from "lucide-react";
import { LanguageSelector, LoadingDots, ListenButton, getLanguageName } from "../components/shared/UIComponents";
import { useSession } from "../hooks/useSession";
import { api } from "../utils/api";
import { t, isRTL } from "../utils/translations";

const PAGE_COPY = {
  en: {
    careCircle: "Care circle",
    linkedMembers: "linked members",
    restrictions: "Restrictions",
    tracked: "tracked",
    nutritionCompare: "Nutrition — original vs. hospital-adapted",
    sessionContext: "Session diet context",
    noRestrictions: "No dietary restrictions are currently stored for this patient.",
    restrictionsPrefix: "Restrictions:",
    privacy: "Photos are processed through Cloudinary, then analysed by Google  and stored on the active patient session. No patient identifiers are embedded in the image request.",
  },
  vi: {
    careCircle: "Vòng tròn chăm sóc",
    linkedMembers: "thành viên đã kết nối",
    restrictions: "Hạn chế ăn uống",
    tracked: "đã ghi nhận",
    nutritionCompare: "Dinh dưỡng — gốc so với phiên bản bệnh viện",
    sessionContext: "Bối cảnh dinh dưỡng phiên",
    noRestrictions: "Chưa có hạn chế ăn uống nào được ghi nhận.",
    restrictionsPrefix: "Hạn chế:",
    privacy: "Ảnh được xử lý qua Cloudinary, sau đó phân tích bằng Google  và lưu vào phiên bệnh nhân đang hoạt động.",
  },
  es: {
    careCircle: "Círculo de cuidado",
    linkedMembers: "miembros vinculados",
    restrictions: "Restricciones",
    tracked: "registradas",
    nutritionCompare: "Nutrición — original vs. adaptada para el hospital",
    sessionContext: "Contexto dietético de la sesión",
    noRestrictions: "No hay restricciones dietéticas registradas para este paciente.",
    restrictionsPrefix: "Restricciones:",
    privacy: "Las fotos se procesan a través de Cloudinary, luego se analizan con Google  y se almacenan en la sesión activa.",
  },
  ht: {
    careCircle: "Sèk swen",
    linkedMembers: "manm ki konekte",
    restrictions: "Restriksyon",
    tracked: "anrejistre",
    nutritionCompare: "Nitrisyon — orijinal vs. adapte lopital",
    sessionContext: "Kontèks rejim alimantè sesyon an",
    noRestrictions: "Pa gen okenn restriksyon alimantè anrejistre pou pasyan sa a.",
    restrictionsPrefix: "Restriksyon:",
    privacy: "Foto yo trete via Cloudinary, Google  analize yo epi yo konsève nan sesyon aktif la.",
  },
  hi: {
    careCircle: "देखभाल मंडली",
    linkedMembers: "जुड़े सदस्य",
    restrictions: "प्रतिबंध",
    tracked: "दर्ज",
    nutritionCompare: "पोषण — मूल बनाम अस्पताल-अनुकूलित",
    sessionContext: "सत्र आहार संदर्भ",
    noRestrictions: "इस रोगी के लिए कोई आहार प्रतिबंध दर्ज नहीं है।",
    restrictionsPrefix: "प्रतिबंध:",
    privacy: "फ़ोटो Cloudinary के माध्यम से प्रोसेस की जाती हैं, फिर Google  द्वारा विश्लेषण की जाती हैं।",
  },
  zh: {
    careCircle: "护理圈",
    linkedMembers: "位已连接成员",
    restrictions: "饮食限制",
    tracked: "项已记录",
    nutritionCompare: "营养对比 — 原始餐食与医院调整版",
    sessionContext: "当前饮食背景",
    noRestrictions: "当前没有为该患者记录任何饮食限制。",
    restrictionsPrefix: "限制：",
    privacy: "照片通过 Cloudinary 处理后，由 Google  分析并保存到当前患者会话中。",
  },
  tl: {
    careCircle: "Care circle",
    linkedMembers: "naka-link na miyembro",
    restrictions: "Mga paghihigpit",
    tracked: "naitala",
    nutritionCompare: "Nutrisyon — orihinal kumpara sa hospital-adapted",
    sessionContext: "Konteksto ng diyeta ng sesyon",
    noRestrictions: "Walang dietary restrictions na naitala para sa pasyenteng ito.",
    restrictionsPrefix: "Mga paghihigpit:",
    privacy: "Ang mga larawan ay pinoproseso sa pamamagitan ng Cloudinary, pagkatapos ay sinusuri ng Google .",
  },
  ko: {
    careCircle: "돌봄 서클",
    linkedMembers: "연결된 멤버",
    restrictions: "식이 제한",
    tracked: "기록됨",
    nutritionCompare: "영양소 — 원본 vs. 병원 적응 버전",
    sessionContext: "세션 식단 맥락",
    noRestrictions: "이 환자에 대해 기록된 식이 제한이 없습니다.",
    restrictionsPrefix: "제한:",
    privacy: "사진은 Cloudinary를 통해 처리된 후 Google 로 분석됩니다.",
  },
  ar: {
    careCircle: "دائرة الرعاية",
    linkedMembers: "الأعضاء المرتبطون",
    restrictions: "القيود الغذائية",
    tracked: "مسجّلة",
    nutritionCompare: "التغذية — الأصلي مقابل المُعدَّل للمستشفى",
    sessionContext: "سياق النظام الغذائي للجلسة",
    noRestrictions: "لا توجد قيود غذائية مسجّلة لهذا المريض حاليًا.",
    restrictionsPrefix: "القيود:",
    privacy: "تتم معالجة الصور عبر Cloudinary، ثم تحليلها بواسطة Google .",
  },
  fa: {
    careCircle: "حلقه مراقبت",
    linkedMembers: "عضو متصل",
    restrictions: "محدودیت‌ها",
    tracked: "ثبت شده",
    nutritionCompare: "تغذیه — اصلی در مقابل نسخه تطبیق‌یافته بیمارستان",
    sessionContext: "زمینه رژیم غذایی جلسه",
    noRestrictions: "هیچ محدودیت غذایی برای این بیمار ثبت نشده است.",
    restrictionsPrefix: "محدودیت‌ها:",
    privacy: "عکس‌ها از طریق Cloudinary پردازش می‌شوند، سپس توسط Google  تحلیل می‌شوند.",
  },
};

export default function DietPage() {
  const { session, updateLanguage, onAnalyzed } = useSession();
  const [imagePreview, setImagePreview]   = useState(null);
  const [imageBase64, setImageBase64]     = useState(null);
  const [cloudinaryUrl, setCloudinaryUrl] = useState(null);
  const [stage, setStage]   = useState("idle"); // idle | uploading | analyzing
  const [result, setResult] = useState(null);
  const [error, setError]   = useState(null);
  const fileInputRef = useRef(null);
  const rtl  = isRTL(session.language);
  const copy = PAGE_COPY[session.language] || PAGE_COPY.en;

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null); setError(null); setCloudinaryUrl(null);
    const reader = new FileReader();
    reader.onload = (ev) => { setImagePreview(ev.target.result); setImageBase64(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageBase64) return;
    setError(null);
    try {
      // 1) Upload to Cloudinary → get URL
      setStage("uploading");
      let sourceForGemini = imageBase64;
      try {
        const uploadData = await api.uploadFood(imageBase64);
        if (uploadData.url) {
          setCloudinaryUrl(uploadData.url);
          sourceForGemini = uploadData.url;
        }
      } catch (uploadErr) {
        console.warn("[DietPage] Cloudinary upload failed, falling back to base64:", uploadErr);
      }

      // 2) Google  vision analysis
      setStage("analyzing");
      const data = await api.analyzeDiet(
        sourceForGemini,
        session.language,
        session.sessionId,
        session.patientContext?.dietary_restrictions || []
      );
      if (data.error) { setError(data.error); }
      else            { setResult(data); onAnalyzed(); }
    } catch (err) {
      setError(err.message);
    } finally {
      setStage("idle");
    }
  };

  const resetAll = () => {
    setImagePreview(null); setImageBase64(null);
    setCloudinaryUrl(null); setResult(null); setError(null);
  };

  // ── Resolve the patient-facing confirmation message ──────────────────────
  // gemini-2.5- returns result.patient_message as:
  //   { [languageCode]: "…native script…", en: "…" }
  // Fall back to the translation key if the field is absent (mock / older API).
  function resolvePatientMessage(res) {
    if (!res) return null;
    if (typeof res.patient_message === "string") {
      return res.patient_message;
    }
    if (res.patient_message && typeof res.patient_message === "object") {
      return res.patient_message[session.language]
        || res.patient_message.en
        || null;
    }
    return t(session.language, "diet_meal_ready");
  }

  return (
    <div className="patient-page pb-24 lg:pb-6" dir={rtl ? "rtl" : "ltr"}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="patient-page-header">
        <div className="patient-page-title">
          <div className="patient-page-title-icon" style={{ background: "var(--color-teal-100)" }}>
            <Camera size={20} style={{ color: "var(--color-teal-600)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "var(--color-slate-800)" }}>
              {t(session.language, "diet_title")}
            </h1>
            <p className="text-sm" style={{ color: "var(--color-slate-400)" }}>
              {t(session.language, "diet_subtitle")}
            </p>
          </div>
        </div>
        <div className="patient-stat-grid">
          <div className="patient-stat-card">
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>{copy.careCircle}</p>
            <p className="text-sm font-semibold mt-1" style={{ color: "var(--color-slate-700)" }}>
              {session.careCircle.length} {copy.linkedMembers}
            </p>
          </div>
          <div className="patient-stat-card">
            <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>{copy.restrictions}</p>
            <p className="text-sm font-semibold mt-1" style={{ color: "var(--color-slate-700)" }}>
              {session.patientContext?.dietary_restrictions?.length || 0} {copy.tracked}
            </p>
          </div>
        </div>
      </div>

      <div className="patient-main-grid">
        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="patient-stack">
          {/* Language selector */}
          <div className="glass-card p-4">
            <p className="text-xs font-medium mb-2" style={{ color: "var(--color-slate-400)" }}>
              {t(session.language, "diet_language")}
            </p>
            <LanguageSelector selected={session.language} onSelect={updateLanguage} />
          </div>

          {/* Image picker */}
          <div className="glass-card p-4">
            {!imagePreview ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-16 rounded-xl flex flex-col items-center gap-3 cursor-pointer transition-all hover:opacity-90"
                style={{ border: "2px dashed var(--color-cream-300)", background: "var(--color-cream-100)" }}
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--color-coral-50)" }}>
                  <Camera size={28} style={{ color: "var(--color-coral-400)" }} />
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--color-slate-600)" }}>
                  {t(session.language, "diet_upload_prompt")}
                </p>
              </button>
            ) : (
              <div className="relative">
                <img src={imagePreview} alt="Food" className="w-full h-[360px] object-cover rounded-xl" />
                <button
                  onClick={resetAll}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.5)" }}
                >
                  <X size={16} color="white" />
                </button>
                {cloudinaryUrl && cloudinaryUrl.startsWith("http") && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 rounded text-xs"
                    style={{ background: "rgba(30, 140, 102, 0.9)", color: "white" }}>
                    ✓ Cloudinary
                  </div>
                )}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
              onChange={handleFileSelect} className="hidden" />
          </div>

          {/* Analyse button */}
          <button
            onClick={handleAnalyze}
            disabled={!imageBase64 || stage !== "idle"}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {stage === "uploading" ? (
              <><div className="spinner" style={{ width: 16, height: 16, borderTopColor: "white", borderColor: "rgba(255,255,255,0.3)" }} /> {t(session.language, "diet_uploading")}</>
            ) : stage === "analyzing" ? (
              <><div className="spinner" style={{ width: 16, height: 16, borderTopColor: "white", borderColor: "rgba(255,255,255,0.3)" }} /> {t(session.language, "diet_analyzing")}…</>
            ) : (
              <><Leaf size={16} /> {t(session.language, "diet_analyze")}</>
            )}
          </button>

          {error && (
            <div className="alert-critical p-3">
              <p className="text-sm" style={{ color: "var(--color-danger-700)" }}>{error}</p>
            </div>
          )}

          {stage !== "idle" && (
            <LoadingDots text={
              stage === "uploading"
                ? "Uploading to Cloudinary"
                : "Analysing with Google "
            } />
          )}

          {/* ── Success confirmation — native-language message from Gemini ── */}
          {result && !result.error && (() => {
            const patientMsg = resolvePatientMessage(result);
            return (
              <div className="alert-success p-4">
                <div className="flex items-start gap-3">
                  <Check size={18} style={{ color: "var(--color-teal-600)", marginTop: 2, flexShrink: 0 }} />
                  <div className="flex-1">
                    {/* Dish name */}
                    <p className="font-medium" style={{ color: "var(--color-teal-700)" }}>
                      {result.dish_name}
                      {result.dish_name_english && result.dish_name_english !== result.dish_name && (
                        <span style={{ color: "var(--color-teal-600)", fontWeight: 400 }}>
                          {" "}— {result.dish_name_english}
                        </span>
                      )}
                    </p>

                    {/* Native-script patient message from Google  */}
                    {patientMsg && (
                      <p className="text-sm mt-2" dir={rtl ? "rtl" : "ltr"}
                        style={{ color: "var(--color-teal-600)", lineHeight: 1.7 }}>
                        {patientMsg}
                      </p>
                    )}

                    {/* Listen button plays the native message */}
                    {patientMsg && (
                      <div className="mt-3">
                        <ListenButton
                          text={patientMsg}
                          languageCode={session.language}
                        />
                      </div>
                    )}

                    {/* Model attribution badge */}
                    <p className="text-xs mt-2" style={{ color: "var(--color-teal-500)", opacity: 0.7 }}>
                      ✦ Analysed by Google 
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── Right aside ─────────────────────────────────────────────────── */}
        <aside className="patient-aside">
          {result?.nutrition_original && result?.nutrition_adapted && (
            <div className="warm-card p-4">
              <p className="text-xs font-medium mb-3" style={{ color: "var(--color-slate-400)" }}>
                {copy.nutritionCompare}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <NutritionCell icon={Flame}   label="Calories" original={result.nutrition_original.calories}  adapted={result.nutrition_adapted.calories}  unit="" />
                <NutritionCell icon={Droplet} label="Sodium"   original={result.nutrition_original.sodium_mg} adapted={result.nutrition_adapted.sodium_mg} unit="mg" />
                <NutritionCell icon={Wheat}   label="Sugar"    original={result.nutrition_original.sugar_g}   adapted={result.nutrition_adapted.sugar_g}   unit="g" />
              </div>
            </div>
          )}

          {result?.hospital_meal_plan && (
            <div className="warm-card p-4" style={{ borderLeft: "3px solid var(--color-teal-400)" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--color-slate-400)" }}>
                {t(session.language, "diet_hospital_plan")}
              </p>
              <p className="text-sm" style={{ color: "var(--color-slate-700)", lineHeight: 1.6 }}>
                {result.hospital_meal_plan}
              </p>
            </div>
          )}

          {result?.cultural_notes && (
            <div className="warm-card p-4" style={{ borderLeft: "3px solid var(--color-coral-400)" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--color-slate-400)" }}>
                {t(session.language, "diet_cultural_notes")}
              </p>
              <p className="text-sm" style={{ color: "var(--color-slate-700)", lineHeight: 1.6 }}>
                {result.cultural_notes}
              </p>
            </div>
          )}

          {/* Adaptation notes */}
          {result?.adaptation_notes && (
            <div className="warm-card p-4" style={{ borderLeft: "3px solid var(--color-amber-400)" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--color-slate-400)" }}>
                Adaptation changes
              </p>
              <p className="text-sm" style={{ color: "var(--color-slate-700)", lineHeight: 1.6 }}>
                {result.adaptation_notes}
              </p>
            </div>
          )}

          <div className="warm-card p-4">
            <p className="text-xs font-medium mb-2" style={{ color: "var(--color-slate-400)" }}>
              {copy.sessionContext}
            </p>
            <p className="text-sm" style={{ color: "var(--color-slate-700)", lineHeight: 1.6 }}>
              {session.patientContext?.dietary_restrictions?.length > 0
                ? `${copy.restrictionsPrefix} ${session.patientContext.dietary_restrictions.join(", ")}`
                : copy.noRestrictions}
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "var(--color-teal-50)" }}>
            <Shield size={14} style={{ color: "var(--color-teal-500)", marginTop: 2, flexShrink: 0 }} />
            <p className="text-xs" style={{ color: "var(--color-teal-700)" }}>{copy.privacy}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Nutrition comparison cell ─────────────────────────────────────────────────
function NutritionCell({ icon: Icon, label, original, adapted, unit }) {
  const delta    = adapted - original;
  const improved = delta < 0; // lower is better for calories, sodium, sugar
  return (
    <div className="p-3 rounded-lg" style={{ background: "var(--color-cream-100)" }}>
      <div className="flex items-center gap-1 mb-1">
        <Icon size={12} style={{ color: "var(--color-slate-400)" }} />
        <p className="text-xs" style={{ color: "var(--color-slate-400)" }}>{label}</p>
      </div>
      <p className="text-xs" style={{ color: "var(--color-danger-500)" }}>
        <span className="line-through">{original}{unit}</span>
      </p>
      <p className="text-sm font-semibold"
        style={{ color: improved ? "var(--color-teal-600)" : "var(--color-slate-600)" }}>
        {adapted}{unit}
      </p>
    </div>
  );
}
