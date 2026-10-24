"use client";

import { useState, useRef, useCallback } from "react";
import {
  uploadAudio,
  simplifyPrescription,
  createPrescription,
} from "@/lib/api";

type Step = "input" | "simplified" | "qr";

export default function DoctorPage() {
  // Form state
  const [patientName, setPatientName] = useState("");
  const [prescriptionText, setPrescriptionText] = useState("");
  const [recognizedText, setRecognizedText] = useState("");
  const [simplifiedText, setSimplifiedText] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [prescriptionId, setPrescriptionId] = useState("");

  // UI state
  const [step, setStep] = useState<Step>("input");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const clearError = () => setError("");

  // Determine the effective prescription text (voice recognized or typed)
  const effectivePrescriptionText =
    inputMode === "voice" && recognizedText ? recognizedText : prescriptionText;

  // ── Voice Recording ─────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    clearError();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setIsTranscribing(true);
        try {
          const { transcribed_text } = await uploadAudio(blob);
          setRecognizedText(transcribed_text);
        } catch (e: any) {
          setError(`Transcription failed: ${e.message}`);
        } finally {
          setIsTranscribing(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (e: any) {
      setError(`Microphone access denied: ${e.message}`);
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  // ── Simplify ─────────────────────────────────────────────────────
  const handleSimplify = async () => {
    const text = effectivePrescriptionText.trim();
    if (!text) {
      setError("Please enter or record a prescription first.");
      return;
    }
    clearError();
    setIsSimplifying(true);
    try {
      const result = await simplifyPrescription(text);
      setSimplifiedText(result.simplified_text);
      setDetectedLanguage(result.detected_language);
      setStep("simplified");
    } catch (e: any) {
      setError(`Simplification failed: ${e.message}`);
    } finally {
      setIsSimplifying(false);
    }
  };

  // ── Save & Generate QR ───────────────────────────────────────────
  const handleGenerateQR = async () => {
    if (!patientName.trim()) {
      setError("Please enter the patient name.");
      return;
    }
    if (!simplifiedText.trim()) {
      setError("Simplified text is empty.");
      return;
    }
    clearError();
    setIsSaving(true);
    try {
      const result = await createPrescription({
        patient_name: patientName.trim(),
        original_text: effectivePrescriptionText.trim(),
        simplified_text: simplifiedText.trim(),
        original_language: detectedLanguage || "English",
      });
      setQrImage(result.qr_image);
      setQrUrl(result.qr_url);
      setPrescriptionId(result.prescription_id);
      setStep("qr");
    } catch (e: any) {
      setError(`Failed to save prescription: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────
  const handleReset = () => {
    setPatientName("");
    setPrescriptionText("");
    setRecognizedText("");
    setSimplifiedText("");
    setDetectedLanguage("");
    setQrImage("");
    setQrUrl("");
    setPrescriptionId("");
    setStep("input");
    setError("");
    setInputMode("text");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Doctor Portal</h1>
            <p className="text-xs text-slate-500">AI Multilingual Prescription Assistant</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={clearError} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* ── STEP 1: Input ── */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center justify-center font-bold">1</span>
            Patient Information
          </h2>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Patient Name</label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Enter patient's full name"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={step === "qr"}
            />
          </div>
        </section>

        {/* ── STEP 2: Prescription Input ── */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center justify-center font-bold">2</span>
            Prescription Input
          </h2>

          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setInputMode("text")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                inputMode === "text"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              disabled={step === "qr"}
            >
              ✍️ Type Prescription
            </button>
            <button
              onClick={() => setInputMode("voice")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                inputMode === "voice"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              disabled={step === "qr"}
            >
              🎙️ Voice Input
            </button>
          </div>

          {/* Text input */}
          {inputMode === "text" && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Prescription Text</label>
              <textarea
                value={prescriptionText}
                onChange={(e) => setPrescriptionText(e.target.value)}
                placeholder="e.g. Tab PCM 650 BD x 5D, Tab Metformin 500 OD PC"
                rows={4}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                disabled={step === "qr"}
              />
            </div>
          )}

          {/* Voice input */}
          {inputMode === "voice" && (
            <div className="space-y-3">
              <div className="flex gap-3 items-center">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={isTranscribing || step === "qr"}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <span className="w-2 h-2 bg-white rounded-full" />
                    Start Recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                    Stop Recording
                  </button>
                )}
                {isRecording && (
                  <span className="text-sm text-red-500 animate-pulse font-medium">● Recording…</span>
                )}
                {isTranscribing && (
                  <span className="text-sm text-blue-500 animate-pulse">Transcribing…</span>
                )}
              </div>

              {/* Recognized Text */}
              {(recognizedText || isTranscribing) && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Recognized Text (editable)</label>
                  <textarea
                    value={recognizedText}
                    onChange={(e) => setRecognizedText(e.target.value)}
                    rows={4}
                    placeholder="Transcribed text will appear here…"
                    className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                    disabled={step === "qr"}
                  />
                </div>
              )}
            </div>
          )}

          {/* Simplify button */}
          {step !== "qr" && (
            <button
              onClick={handleSimplify}
              disabled={isSimplifying || !effectivePrescriptionText.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSimplifying ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Simplifying with AI…
                </>
              ) : (
                "✨ Simplify with AI"
              )}
            </button>
          )}
        </section>

        {/* ── STEP 3: AI Simplified Text ── */}
        {(step === "simplified" || step === "qr") && (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full text-xs flex items-center justify-center font-bold">3</span>
                AI Simplified Text
                <span className="text-xs text-slate-400 font-normal">(edit before saving)</span>
              </h2>
              {detectedLanguage && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                  🌐 Detected: {detectedLanguage}
                </span>
              )}
            </div>

            <textarea
              value={simplifiedText}
              onChange={(e) => setSimplifiedText(e.target.value)}
              rows={5}
              className="w-full border border-green-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 bg-green-50"
              disabled={step === "qr"}
            />

            {step === "simplified" && (
              <button
                onClick={handleGenerateQR}
                disabled={isSaving || !simplifiedText.trim() || !patientName.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Saving & Generating QR…
                  </>
                ) : (
                  "📱 Generate QR Code"
                )}
              </button>
            )}
          </section>
        )}

        {/* ── STEP 4: QR Code ── */}
        {step === "qr" && qrImage && (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full text-xs flex items-center justify-center font-bold">4</span>
              QR Code — Ready for Patient
            </h2>

            <div className="flex flex-col items-center gap-4">
              <div className="border-2 border-slate-200 rounded-xl p-4 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImage} alt="Prescription QR Code" className="w-56 h-56" />
              </div>

              <div className="text-center space-y-1">
                <p className="text-sm text-slate-600">
                  Patient: <span className="font-semibold">{patientName}</span>
                </p>
                <p className="text-xs text-slate-400 break-all max-w-xs">{qrUrl}</p>
              </div>

              <div className="flex gap-3 w-full max-w-xs">
                <a
                  href={qrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  Open Patient Page
                </a>
                <a
                  href={qrImage}
                  download={`prescription-${prescriptionId}.png`}
                  className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  Download QR
                </a>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={handleReset}
                className="w-full border border-slate-300 hover:bg-slate-50 text-slate-600 font-medium py-2.5 rounded-lg transition-colors"
              >
                + New Prescription
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

