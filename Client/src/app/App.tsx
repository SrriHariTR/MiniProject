import { useState, useEffect } from "react";
import { Upload, Leaf, AlertCircle, CheckCircle2, Info } from "lucide-react";

interface DiseaseResult {
  disease: string;
  confidence: number;
  description: string;
  symptoms: string[];
  prevention: string[];
  treatment: string[];
}

const mockDiseases: Record<string, DiseaseResult> = {
  early_blight: {
    disease: "Early Blight",
    confidence: 94.5,
    description:
      "Early blight is a common fungal disease caused by Alternaria solani that affects tomato plants, particularly older leaves.",
    symptoms: [
      "Dark brown spots with concentric rings (target-like pattern)",
      "Yellowing of leaves around the spots",
      "Lower leaves affected first",
      "Leaf drop in severe cases",
    ],
    prevention: [
      "Use disease-free seeds and transplants",
      "Practice crop rotation (3-4 year cycle)",
      "Provide adequate spacing for air circulation",
      "Water at the base of plants, avoid wetting foliage",
      "Apply mulch to prevent soil splash onto leaves",
    ],
    treatment: [
      "Remove and destroy infected leaves",
      "Apply fungicides containing chlorothalonil or copper",
      "Use organic options like neem oil or baking soda spray",
      "Ensure proper plant nutrition, especially potassium",
    ],
  },
  late_blight: {
    disease: "Late Blight",
    confidence: 92.3,
    description:
      "Late blight is a devastating disease caused by Phytophthora infestans, the same pathogen that caused the Irish potato famine.",
    symptoms: [
      "Large, irregular brown or purplish-black lesions",
      "White fuzzy growth on leaf undersides",
      "Rapid spread during cool, wet weather",
      "Can affect fruits, causing brown, greasy spots",
    ],
    prevention: [
      "Plant resistant varieties when possible",
      "Avoid overhead irrigation",
      "Ensure good air circulation",
      "Remove volunteer tomato and potato plants",
      "Monitor weather for favorable disease conditions",
    ],
    treatment: [
      "Apply preventive fungicides before symptoms appear",
      "Remove and destroy all infected plant material",
      "Use copper-based or systemic fungicides",
      "In severe cases, remove entire plants to prevent spread",
    ],
  },
  healthy: {
    disease: "Healthy Leaf",
    confidence: 98.7,
    description:
      "The tomato leaf appears healthy with no signs of disease or stress.",
    symptoms: [
      "Vibrant green color",
      "No spots, lesions, or discoloration",
      "Normal leaf structure and texture",
      "Good turgor pressure",
    ],
    prevention: [
      "Continue current good practices",
      "Maintain consistent watering schedule",
      "Monitor regularly for early disease detection",
      "Ensure balanced fertilization",
      "Keep garden area clean and weed-free",
    ],
    treatment: [
      "No treatment needed",
      "Continue routine care and monitoring",
      "Maintain optimal growing conditions",
    ],
  },
};

export default function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<DiseaseResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [serverStatus, setServerStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");

  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/");
        setServerStatus(res.ok ? "online" : "offline");
      } catch {
        setServerStatus("offline");
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleImageUpload = async (file: File) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      setSelectedImage(e.target?.result as string);
      setPrediction(null);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("http://127.0.0.1:5000/predict", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        // Map backend response to your UI format
        const key = data.disease.toLowerCase().replace(/ /g, "_");
        const diseaseData = mockDiseases[key];

        setPrediction({
          disease: data.disease, // ✅ THIS FIXES YOUR ISSUE
          confidence: data.confidence,
          description: diseaseData?.description || "No description available",
          symptoms: diseaseData?.symptoms || [],
          prevention: diseaseData?.prevention || [],
          treatment: diseaseData?.treatment || [],
        });
      } catch (err) {
        console.error("Error:", err);
      }
    };

    reader.readAsDataURL(file);
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleImageUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleImageUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const resetApp = () => {
    setSelectedImage(null);
    setPrediction(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <div
              className={`px-6 py-2 rounded-full text-white font-semibold shadow ${
                serverStatus === "online"
                  ? "bg-green-500"
                  : serverStatus === "offline"
                    ? "bg-red-500"
                    : "bg-yellow-500"
              }`}
            >
              {serverStatus === "online" && "🟢 Backend Connected"}
              {serverStatus === "offline" && "🔴 Backend Offline"}
              {serverStatus === "checking" && "🟡 Checking Server..."}
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Leaf className="w-10 h-10 text-green-600" />
            <h1 className="text-4xl font-bold text-gray-800">
              Tomato Leaf Disease Detector
            </h1>
          </div>
          <p className="text-gray-600">
            Upload a tomato leaf image to identify diseases and get prevention
            tips
          </p>
        </div>

        {/* Disease Detection Result Box */}
        {prediction && (
          <div
            className={`mb-6 rounded-2xl shadow-lg p-6 text-center ${
              prediction.disease === "Healthy Leaf"
                ? "bg-gradient-to-r from-green-500 to-emerald-600"
                : "bg-gradient-to-r from-red-500 to-rose-600"
            }`}
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              {prediction.disease === "Healthy Leaf" ? (
                <CheckCircle2 className="w-8 h-8 text-white" />
              ) : (
                <AlertCircle className="w-8 h-8 text-white" />
              )}
              <h2 className="text-3xl font-bold text-white">
                {prediction.disease === "Healthy Leaf"
                  ? "No Disease Detected"
                  : "Disease Detected"}
              </h2>
            </div>
            <p className="text-5xl font-extrabold text-white mb-2">
              {prediction.disease}
            </p>
            <p className="text-xl text-white/90">
              Confidence: {prediction.confidence}%
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Upload Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Image
            </h2>

            {!selectedImage ? (
              <div
                className={`border-3 border-dashed rounded-xl p-8 text-center transition-colors ${
                  isDragging
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 bg-gray-50 hover:border-green-400"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-2">
                  Drag and drop an image here
                </p>
                <p className="text-gray-400 text-sm mb-4">or</p>
                <label className="inline-block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <span className="cursor-pointer bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors inline-block">
                    Browse Files
                  </span>
                </label>
              </div>
            ) : (
              <div>
                <div className="relative rounded-lg overflow-hidden mb-4">
                  <img
                    src={selectedImage}
                    alt="Uploaded tomato leaf"
                    className="w-full h-auto"
                  />
                </div>
                <button
                  onClick={resetApp}
                  className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Upload Another Image
                </button>
              </div>
            )}

            {selectedImage && !prediction && (
              <div className="mt-4 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <p className="text-gray-600 mt-2">Analyzing image...</p>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Analysis Results
            </h2>

            {!prediction ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Leaf className="w-16 h-16 mb-4 opacity-50" />
                <p>Upload an image to see disease analysis</p>
              </div>
            ) : (
              <div>
                {/* Disease Name & Confidence */}
                <div
                  className={`rounded-lg p-4 mb-4 ${
                    prediction.disease === "Healthy Leaf"
                      ? "bg-green-50 border-2 border-green-200"
                      : "bg-red-50 border-2 border-red-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold text-gray-800">
                      {prediction.disease}
                    </h3>
                    {prediction.disease === "Healthy Leaf" ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Confidence: {prediction.confidence}%
                  </p>
                </div>

                {/* Description */}
                <div className="mb-4">
                  <p className="text-gray-700">{prediction.description}</p>
                </div>

                {/* Symptoms
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2">
                    Symptoms:
                  </h4>
                  <ul className="space-y-1">
                    {prediction.symptoms.map((symptom, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <span className="text-red-500 mt-1">•</span>
                        <span>{symptom}</span>
                      </li>
                    ))}
                  </ul>
                </div> */}

                {/* Prevention */}
                {/* <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Prevention:
                  </h4>
                  <ul className="space-y-1">
                    {prediction.prevention.map((tip, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <span className="text-green-500 mt-1">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div> */}

                {/* Treatment */}
                {/* <div>
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                    Treatment:
                  </h4>
                  <ul className="space-y-1">
                    {prediction.treatment.map((treatment, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{treatment}</span>
                      </li>
                    ))}
                  </ul>
                </div> */}
              </div>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 bg-white rounded-xl shadow p-4 text-center text-sm text-gray-600">
          <p>
            <strong>Note:</strong> This is a demonstration interface with mock
            predictions. For production use, integrate with a trained ML model
            API for accurate disease detection.
          </p>
        </div>
      </div>
    </div>
  );
}
