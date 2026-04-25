// ============================================================
// VOICES OF HOME - Shared Types
// Used by frontend, backend, agents, and MCP server
// ============================================================

// --- Cultural Knowledge Base ---
export interface CulturalEntry {
  id: string;
  language: string;
  language_code: string;
  cultural_expression: string;
  literal_translation: string;
  clinical_mapping: string;
  icd10_codes: string[];
  recommended_screenings: string[];
  body_system: string;
  confidence_level: "high" | "medium" | "low";
  source_citation: string;
  embedding?: number[];
}

// --- Symptom Analysis ---
export interface SymptomAnalysisRequest {
  text: string;
  language_code: string;
  session_id: string;
}

export interface ClinicalInsight {
  cultural_expression: string;
  literal_translation: string;
  clinical_mapping: string;
  icd10_codes: string[];
  recommended_screenings: string[];
  confidence: "high" | "medium" | "low";
  source: string;
  body_system: string;
  alert_level: "critical" | "warning" | "info";
}

export interface SymptomAnalysisResponse {
  session_id: string;
  insights: ClinicalInsight[];
  raw_text: string;
  language: string;
  timestamp: string;
}

// --- Dietary Analysis ---
export interface DietaryAnalysisRequest {
  image_url: string;
  language_code: string;
  session_id: string;
  dietary_restrictions?: string[];
}

export interface NutritionInfo {
  calories: number;
  protein_g: number;
  sodium_mg: number;
  sugar_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g: number;
}

export interface DietaryAnalysisResponse {
  session_id: string;
  dish_name: string;
  dish_name_english: string;
  cuisine: string;
  ingredients: string[];
  nutrition_original: NutritionInfo;
  nutrition_adapted: NutritionInfo;
  adaptation_notes: string;
  hospital_meal_plan: string;
  cultural_notes: string;
  timestamp: string;
}

// --- Voice Messages ---
export interface VoiceMessageRequest {
  text: string;
  target_language_code: string;
  session_id: string;
  message_type: "medication" | "discharge" | "followup" | "custom";
}

export interface VoiceMessageResponse {
  session_id: string;
  audio_url: string;
  duration_seconds: number;
  language: string;
  message_type: string;
  simplified_text: string;
  delivery_status: DeliveryStatus[];
  timestamp: string;
}

export interface DeliveryStatus {
  family_member_id: string;
  name: string;
  role: string;
  status: "delivered" | "pending" | "failed";
  heard: boolean;
}

// --- Care Assistant (Claude) ---
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatRequest {
  message: string;
  session_id: string;
  language_code: string;
  patient_context?: PatientContext;
}

export interface ChatResponse {
  reply: string;
  session_id: string;
  disclaimer?: string;
}

// --- Patient & Session ---
export interface PatientContext {
  language: string;
  language_code: string;
  conditions: string[];
  medications: string[];
  dietary_restrictions: string[];
  cultural_background: string;
}

export interface Session {
  session_id: string;
  patient_context: PatientContext;
  care_circle: CareCircleMember[];
  insights: ClinicalInsight[];
  dietary_plans: DietaryAnalysisResponse[];
  voice_messages: VoiceMessageResponse[];
  chat_history: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface CareCircleMember {
  id: string;
  name: string;
  role: "primary_caregiver" | "secondary" | "emergency_contact";
  relationship: string;
  phone?: string;
  email?: string;
  messages_heard: number;
  messages_total: number;
}

// --- Agent Types (Fetch.ai) ---
export interface AgentStatus {
  agent_name: string;
  agent_type: "cultural_nlp" | "dietary" | "voice" | "orchestrator";
  status: "active" | "inactive" | "error";
  address?: string;
  last_heartbeat: string;
}

// --- MCP Server Types (Cognition) ---
export interface MCPToolRequest {
  tool: "get_cultural_context" | "get_dietary_profile" | "get_care_translation";
  params: Record<string, string>;
}

export interface MCPToolResponse {
  result: unknown;
  source: string;
  confidence: string;
}

// --- Supported Languages ---
export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", native_name: "English" },
  { code: "es", name: "Spanish", native_name: "Espa\u00f1ol" },
  { code: "vi", name: "Vietnamese", native_name: "Ti\u1ebfng Vi\u1ec7t" },
  { code: "ht", name: "Haitian Creole", native_name: "Krey\u00f2l Ayisyen" },
  { code: "hi", name: "Hindi", native_name: "\u0939\u093f\u0928\u094d\u0926\u0940" },
  { code: "tl", name: "Tagalog", native_name: "Tagalog" },
  { code: "zh", name: "Mandarin", native_name: "\u4e2d\u6587" },
  { code: "ko", name: "Korean", native_name: "\ud55c\uad6d\uc5b4" },
  { code: "ar", name: "Arabic", native_name: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629" },
  { code: "fa", name: "Farsi", native_name: "\u0641\u0627\u0631\u0633\u06cc" },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]["code"];
