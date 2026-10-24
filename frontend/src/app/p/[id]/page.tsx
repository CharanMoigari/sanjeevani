"use client";

import { useState, useEffect, useRef } from "react";
import { getPrescription, translatePrescription, getTTSAudio } from "@/lib/api";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/languages";

interface Prescription {
  id: string;
  patient_name: string;
  original_text: string;
  simplified_text: string;
  original_language: string;
  created_at: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PatientPage({ params }: PageProps) {
  const [id, setId] = useState<string>("");
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>("English");
  const [translatedText, setTranslatedText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [error, setError] = useState("");
  const [ttsError, setTtsError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Resolve params
  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  // Load prescription
  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    getPrescription(id)
      .then((data) => {
        setPrescription(data);
        setTranslatedText(data.simplified_text);
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  // ── Translate ──────────────────────────────────────────────────
  const handleTranslate = async () => {
    if (!prescription) return;
    setTtsError("");

    if (selectedLanguage === "English") {
      setTranslatedText(prescription.simplified_text);
      return;
    }

    setIsTranslating(true);
    try {
      const { translated_text } = await translatePrescription(prescription.id, selectedLanguage);
      setTranslatedText(translated_text);
    } catch (e: any) {
      setError(`Translation failed: ${e.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  // ── Listen / TTS ───────────────────────────────────────────────
  const handleListen = async () => {
    if (!translatedText) return;
    setTtsError("");

    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();

    const bcp47 = SUPPORTED_LANGUAGES.find((l) => l.value === selectedLanguage)?.bcp47 ?? "en-IN";

    // Try Gemini TTS first
    setIsPlayingTTS(true);
    try {
      const buffer = await getTTSAudio(translatedText, selectedLanguage);
      const blob = new Blob([buffer], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setIsPlayingTTS(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setIsPlayingTTS(false);
        URL.revokeObjectURL(url);
        setTtsError("Audio playback failed. Falling back to browser voice.");
        useBrowserTTS(translatedText, bcp47);
      };
      await audio.play();
      return;
    } catch (e: any) {
      setIsPlayingTTS(false);
      setTtsError(`Gemini TTS: ${e.message}. Using browser voice fallback.`);
    }

    // Browser SpeechSynthesis fallback
    useBrowserTTS(translatedText, bcp47);
  };

  const useBrowserTTS = (text: string, bcp47: string) => {
    if (!("speechSynthesis" in window)) {
      setTtsError("Your browser does not support text-to-speech. Please use a modern browser.");
      return;
    }
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    const matchingVoice = voices.find(
      (v) => v.lang === bcp47 || v.lang.startsWith(bcp47.split("-")[0])
    );

    if (voices.length > 0 && !matchingVoice) {
      setTtsError(
        `No browser voice available for ${selectedLanguage} (${bcp47}). Try updating your OS or browser.`
      );
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = bcp47;
    if (matchingVoice) utterance.voice = matchingVoice;
    utterance.onstart = () => setIsPlayingTTS(true);
    utterance.onend = () => setIsPlayingTTS(false);
    utterance.onerror = () => {
      setIsPlayingTTS(false);
      setTtsError("Browser voice playback failed.");
    };
    synth.speak(utterance);
  };

  // ── Loading / Error states ──────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Loading prescription…</p>
        </div>
      </div>
    );
  }

  if (error && !prescription) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 max-w-sm w-full text-center space-y-3">
          <div className="text-4xl">❌</div>
          <h2 className="font-semibold text-slate-800">Prescription Not Found</h2>
          <p className="text-sm text-slate-500">{error}</p>
          <p className="text-xs text-slate-400">
            Please ask your doctor to re-generate the QR code.
          </p>
        </div>
      </div>
    );
  }

  if (!prescription) return null;

  const hasTranslation = translatedText && translatedText !== prescription.simplified_text;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Your Prescription</h1>
            <p className="text-xs text-slate-500">Patient: {prescription.patient_name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* AI Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700 flex gap-2 items-start">
          <span className="text-base leading-none mt-0.5">⚠️</span>
          <span>
            AI-generated explanation. Follow your doctor&apos;s original prescription if anything is unclear.
          </span>
        </div>

        {/* Original Prescription */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Original Prescription
          </h2>
          <p className="text-slate-700 text-sm font-mono whitespace-pre-wrap leading-relaxed">
            {prescription.original_text}
          </p>
          <p className="text-xs text-slate-400">Language: {prescription.original_language}</p>
        </section>

        {/* Simplified (English) */}
        <section className="bg-white rounded-xl shadow-sm border border-blue-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
            Patient-Friendly Explanation
          </h2>
          <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
            {prescription.simplified_text}
          </p>
        </section>

        {/* Language Selection */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Translate to Your Language</h2>

          <select
            value={selectedLanguage}
            onChange={(e) => {
              setSelectedLanguage(e.target.value as SupportedLanguage);
              setTtsError("");
            }}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleTranslate}
            disabled={isTranslating}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isTranslating ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Translating…
              </>
            ) : (
              "🌐 Translate"
            )}
          </button>
        </section>

        {/* Translated Text */}
        {translatedText && (
          <section className="bg-white rounded-xl shadow-sm border border-green-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-green-700 uppercase tracking-wide">
              {selectedLanguage === "English" ? "Prescription" : `In ${selectedLanguage}`}
            </h2>
            <p className="text-slate-800 text-base leading-relaxed whitespace-pre-wrap">
              {translatedText}
            </p>

            {/* Listen button */}
            <button
              onClick={handleListen}
              disabled={isPlayingTTS}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isPlayingTTS ? (
                <>
                  <svg className="animate-pulse w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                  </svg>
                  Playing…
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                  🔊 Listen Prescription
                </>
              )}
            </button>

            {/* TTS error / fallback notice */}
            {ttsError && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                {ttsError}
              </div>
            )}
          </section>
        )}

        {/* Footer */}
        <div className="text-center pb-4">
          <p className="text-xs text-slate-400">
            Prescription ID: {prescription.id.slice(0, 8)}…
          </p>
        </div>
      </main>
    </div>
  );
}

