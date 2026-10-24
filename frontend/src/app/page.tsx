import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col items-center justify-center p-8">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Logo / Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-slate-800">AI Multilingual</h1>
          <h2 className="text-2xl font-bold text-blue-600">Prescription Assistant</h2>
          <p className="mt-3 text-slate-500 text-sm leading-relaxed">
            Doctors create patient-friendly prescriptions with AI simplification. Patients scan a QR code and read their
            prescription in their own language.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Link
            href="/doctor"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow transition-colors"
          >
            🩺 Doctor Portal
          </Link>
          <p className="text-xs text-slate-400">
            Patients: Scan the QR code from your doctor to view your prescription
          </p>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-400">
            Supports: English · Tamil · Telugu · Hindi · Kannada
          </p>
          <p className="text-xs text-slate-300 mt-1">Powered by Gemini AI</p>
        </div>
      </div>
    </main>
  );
}

