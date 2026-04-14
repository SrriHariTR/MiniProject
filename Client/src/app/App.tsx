import { useState, useEffect } from "react";
import {
  Upload,
  Leaf,
  AlertCircle,
  CheckCircle2,
  Info,
  Stethoscope,
  ShieldCheck,
  FlaskConical,
  Sparkles,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:10000";

interface PredictionResult {
  disease: string;
  confidence: number;
}

interface AnalysisResult {
  description: string;
  symptoms: string[];
  prevention: string[];
  treatment: string[];
}

// ── Helper Components ──────────────────────────────────────────────────────────

function InfoList({
  icon,
  title,
  items,
  bulletColor,
  bullet,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  bulletColor: string;
  bullet: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
        {icon}
        {title}
      </h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className={`${bulletColor} mt-0.5 flex-shrink-0 font-bold`}>
              {bullet === "num" ? `${i + 1}.` : bullet}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────

export default function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const [language, setLanguage] = useState<string>("en");

  const [isPredicting, setIsPredicting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [predictError, setPredictError] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline">("checking");

  // ── Server heartbeat ────────────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/`);
        setServerStatus(res.ok ? "online" : "offline");
      } catch {
        setServerStatus("offline");
      }
    };
    check();
    const t = setInterval(check, 5000);
    return () => clearInterval(t);
  }, []);

  // ── ML Prediction ────────────────────────────────────────────────────────────
  const handleImageUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      setSelectedImage(e.target?.result as string);
      setPrediction(null);
      setAnalysis(null);
      setPredictError(null);
      setAnalyzeError(null);
      setIsPredicting(true);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`${API_BASE}/predict`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Server error: ${res.status}`);
        }
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setPrediction({ disease: data.disease, confidence: data.confidence });
      } catch (err) {
        setPredictError(err instanceof Error ? err.message : "Prediction failed.");
      } finally {
        setIsPredicting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Gemini/Groq Analysis ──────────────────────────────────────────────────────────
  const handleGetAnalysis = async (targetLang: string = language) => {
    if (!prediction) return;
    setAnalyzeError(null);
    setIsAnalyzing(true);

    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disease: prediction.disease, lang: targetLang }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error: ${res.status}`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysis({
        description: data.description || "",
        symptoms: data.symptoms || [],
        prevention: data.prevention || [],
        treatment: data.treatment || [],
      });
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── File input handlers ──────────────────────────────────────────────────────
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) handleImageUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleImageUpload(file);
  };

  const resetApp = () => {
    setSelectedImage(null);
    setPrediction(null);
    setAnalysis(null);
    setPredictError(null);
    setAnalyzeError(null);
    setIsPredicting(false);
    setIsAnalyzing(false);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    if (prediction && analysis) {
      handleGetAnalysis(newLang);
    }
  };

  const isHealthy = prediction?.disease === "Healthy";

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <div
              className={`px-5 py-1.5 rounded-full text-white text-sm font-medium shadow ${
                serverStatus === "online" ? "bg-green-500"
                : serverStatus === "offline" ? "bg-red-500"
                : "bg-yellow-500"
              }`}
            >
              {serverStatus === "online" && "🟢 Backend Connected"}
              {serverStatus === "offline" && "🔴 Backend Offline"}
              {serverStatus === "checking" && "🟡 Checking Server..."}
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <Leaf className="w-9 h-9 text-green-600" />
            <h1 className="text-4xl font-bold text-gray-800">
              Tomato Leaf Disease Detector
            </h1>
          </div>
          <p className="text-gray-500 text-sm">
            Upload a leaf image — AI predicts the disease instantly, then click{" "}
            <strong>Get Analysis</strong> for expert disease insights.
          </p>
        </div>

        {/* Prediction Error */}
        {predictError && (
          <div className="mb-6 rounded-2xl shadow p-5 text-center bg-gradient-to-r from-orange-500 to-red-500">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertCircle className="w-5 h-5 text-white" />
              <h2 className="text-lg font-bold text-white">Prediction Failed</h2>
            </div>
            <p className="text-white/90 text-sm">{predictError}</p>
          </div>
        )}

        {/* Result Banner — shown after prediction */}
        {prediction && (
          <div
            className={`mb-6 rounded-2xl shadow-lg p-6 text-center transition-all ${
              isHealthy
                ? "bg-gradient-to-r from-green-500 to-emerald-600"
                : "bg-gradient-to-r from-red-500 to-rose-600"
            }`}
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              {isHealthy ? (
                <CheckCircle2 className="w-7 h-7 text-white" />
              ) : (
                <AlertCircle className="w-7 h-7 text-white" />
              )}
              <h2 className="text-2xl font-bold text-white">
                {isHealthy ? "No Disease Detected" : "Disease Detected"}
              </h2>
            </div>
            <p className="text-4xl font-extrabold text-white mb-1">
              {prediction.disease}
            </p>
            <p className="text-white/80 text-base mb-4">
              Confidence: {prediction.confidence}%
            </p>

            {/* Confidence bar */}
            <div className="w-full max-w-xs mx-auto bg-white/30 rounded-full h-2 mb-5">
              <div
                className="h-2 bg-white rounded-full transition-all duration-700"
                style={{ width: `${prediction.confidence}%` }}
              />
            </div>

            {/* Get Analysis Button */}
            {!analysis && !isAnalyzing && (
              <button
                onClick={() => handleGetAnalysis(language)}
                className="inline-flex items-center gap-2 bg-white text-gray-800 font-semibold px-6 py-2.5 rounded-full shadow hover:shadow-md hover:scale-105 active:scale-100 transition-all duration-200"
              >
                <Sparkles className="w-4 h-4 text-yellow-500" />
                Get Analysis
              </button>
            )}

            {/* Analyzing spinner inside banner */}
            {isAnalyzing && (
              <div className="flex items-center justify-center gap-3 text-white">
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span className="font-medium">Loading analysis...</span>
              </div>
            )}

            {/* Re-analyze button if analysis is already shown */}
            {analysis && !isAnalyzing && (
              <button
                onClick={() => handleGetAnalysis(language)}
                className="inline-flex items-center gap-2 bg-white/20 text-white border border-white/40 font-medium px-5 py-2 rounded-full hover:bg-white/30 transition-all text-sm"
              >
                <Sparkles className="w-4 h-4" />
                Re-analyze
              </button>
            )}
          </div>
        )}

        {/* Main Grid: Upload + Results */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Upload Panel */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-green-600" />
              Upload Image
            </h2>

            {!selectedImage ? (
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                  isDragging
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50"
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
              >
                <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600 font-medium mb-1">
                  Drag and drop a leaf image
                </p>
                <p className="text-gray-400 text-xs mb-5">JPG, PNG, WEBP supported</p>
                <label className="inline-block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <span className="cursor-pointer bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors inline-block font-medium text-sm">
                    Browse Files
                  </span>
                </label>
              </div>
            ) : (
              <div>
                <div className="rounded-xl overflow-hidden mb-4 border border-gray-100 shadow-sm">
                  <img
                    src={selectedImage}
                    alt="Uploaded tomato leaf"
                    className="w-full h-auto"
                  />
                </div>
                <button
                  onClick={resetApp}
                  className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                >
                  Upload Another Image
                </button>
              </div>
            )}

            {/* Predicting spinner */}
            {isPredicting && (
              <div className="mt-5 flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
                <p className="text-gray-500 text-sm">Running model prediction...</p>
              </div>
            )}
          </div>

          {/* Analysis Panel */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Info className="w-5 h-5 text-green-600" />
                Disease Analysis
              </h2>
              <select
                value={language}
                onChange={handleLanguageChange}
                disabled={isAnalyzing}
                className="text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-green-500 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-50 appearance-none pr-8 relative"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1em'
                }}
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="ml">മലയാളം (Malayalam)</option>
                <option value="mr">मराठी (Marathi)</option>
                <option value="bn">বাংলা (Bengali)</option>
                <option value="gu">ગુજરાતી (Gujarati)</option>
                <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
              </select>
            </div>

            {/* Empty state */}
            {!prediction && !isPredicting && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Leaf className="w-14 h-14 mb-3 opacity-40" />
                <p className="text-sm text-center">
                  Upload a leaf image to detect disease,<br />
                  then click <strong>Get Analysis</strong> for details.
                </p>
              </div>
            )}

            {/* Waiting for user to click button */}
            {prediction && !isAnalyzing && !analysis && !analyzeError && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Sparkles className="w-12 h-12 mb-3 text-yellow-400 opacity-80" />
                <p className="text-sm text-center text-gray-500">
                  Disease detected! Click <strong className="text-gray-700">Get Analysis</strong>
                  <br />in the result banner above to view detailed insights.
                </p>
              </div>
            )}

            {/* Analyzing spinner in panel */}
            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <div className="w-10 h-10 border-4 border-yellow-200 border-t-yellow-500 rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium">Groq AI is generating insights...</p>
                <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
              </div>
            )}

            {/* Analysis error */}
            {analyzeError && !isAnalyzing && (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
                <p className="text-sm font-semibold text-red-600 mb-1">Analysis Failed</p>
                <p className="text-xs text-gray-500 max-w-xs">{analyzeError}</p>
                <button
                  onClick={() => handleGetAnalysis(language)}
                  className="mt-4 text-sm bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Analysis Results */}
            {analysis && !isAnalyzing && (
              <div className="space-y-4 overflow-y-auto max-h-[480px] pr-1">

                {/* Description */}
                {analysis.description && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1.5 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" /> About
                    </h4>
                    <p className="text-sm text-gray-700 leading-relaxed">{analysis.description}</p>
                  </div>
                )}

                {/* Symptoms */}
                {analysis.symptoms.length > 0 && (
                  <InfoList
                    icon={<Stethoscope className="w-3.5 h-3.5 text-red-500" />}
                    title="Symptoms"
                    items={analysis.symptoms}
                    bulletColor="text-red-400"
                    bullet="•"
                  />
                )}

                {/* Prevention */}
                {analysis.prevention.length > 0 && (
                  <InfoList
                    icon={<ShieldCheck className="w-3.5 h-3.5 text-green-600" />}
                    title="Prevention"
                    items={analysis.prevention}
                    bulletColor="text-green-500"
                    bullet="✓"
                  />
                )}

                {/* Treatment */}
                {analysis.treatment.length > 0 && (
                  <InfoList
                    icon={<FlaskConical className="w-3.5 h-3.5 text-blue-500" />}
                    title="Treatment"
                    items={analysis.treatment}
                    bulletColor="text-blue-400"
                    bullet="num"
                  />
                )}

                <p className="text-center text-xs text-gray-400 pt-1">
                  Powered by Groq AI (llama-3.1-8b-instant)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 bg-white rounded-xl shadow p-4 text-center text-xs text-gray-400">
          Disease information is generated by <strong>Groq AI</strong> and is for educational reference only.
          Always consult an agronomist for serious crop issues.
        </div>

      </div>
    </div>
  );
}
