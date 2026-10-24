export const SUPPORTED_LANGUAGES = [
  { label: "English", value: "English", bcp47: "en-IN" },
  { label: "Tamil (தமிழ்)", value: "Tamil", bcp47: "ta-IN" },
  { label: "Telugu (తెలుగు)", value: "Telugu", bcp47: "te-IN" },
  { label: "Hindi (हिन्दी)", value: "Hindi", bcp47: "hi-IN" },
  { label: "Kannada (ಕನ್ನಡ)", value: "Kannada", bcp47: "kn-IN" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["value"];

