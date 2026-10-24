// Central API client for all backend calls
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface SimplifyResponse {
  simplified_text: string;
  detected_language: string;
}

export interface CreatePrescriptionResponse {
  prescription_id: string;
  qr_url: string;
  qr_image: string;
}

export interface PrescriptionResponse {
  id: string;
  patient_name: string;
  original_text: string;
  simplified_text: string;
  original_language: string;
  created_at: string;
}

export interface TranslateResponse {
  translated_text: string;
}

export interface HealthResponse {
  status: string;
  db: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {}
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function uploadAudio(audioBlob: Blob): Promise<{ transcribed_text: string }> {
  const form = new FormData();
  form.append("file", audioBlob, "recording.webm");
  const res = await fetch(`${API_URL}/upload-audio`, { method: "POST", body: form });
  return handleResponse(res);
}

export async function simplifyPrescription(prescriptionText: string): Promise<SimplifyResponse> {
  const res = await fetch(`${API_URL}/simplify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prescription_text: prescriptionText }),
  });
  return handleResponse(res);
}

export async function createPrescription(data: {
  patient_name: string;
  original_text: string;
  simplified_text: string;
  original_language: string;
}): Promise<CreatePrescriptionResponse> {
  const res = await fetch(`${API_URL}/prescriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function getPrescription(id: string): Promise<PrescriptionResponse> {
  const res = await fetch(`${API_URL}/prescriptions/${id}`);
  return handleResponse(res);
}

export async function translatePrescription(
  prescriptionId: string,
  targetLanguage: string
): Promise<TranslateResponse> {
  const res = await fetch(`${API_URL}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prescription_id: prescriptionId, target_language: targetLanguage }),
  });
  return handleResponse(res);
}

export async function getTTSAudio(text: string, language: string): Promise<ArrayBuffer> {
  const res = await fetch(`${API_URL}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {}
    throw new Error(detail);
  }
  return res.arrayBuffer();
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}/health`);
  return handleResponse(res);
}

