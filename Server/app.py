from flask import Flask, request, jsonify
import numpy as np
from PIL import Image
from flask_cors import CORS
import os
import io
import json
import time
import re
from dotenv import load_dotenv
from tensorflow.keras.models import load_model
from deep_translator import GoogleTranslator

load_dotenv()

app = Flask(__name__)
CORS(app)

print("[*] Server starting...")

# -- Load ML Model --------------------------------------------------------------
model_path = os.path.join(os.path.dirname(__file__), "model.h5")
print("[*] Loading model at startup...")
model = load_model(model_path)
print("[OK] Model loaded successfully")

# -- Configure Groq -------------------------------------------------------------
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
groq_client = None

if GROQ_API_KEY:
    try:
        from groq import Groq
        groq_client = Groq(api_key=GROQ_API_KEY)
        print("[OK] Groq configured")
    except Exception as e:
        print(f"[WARN] Groq setup failed: {e}")
else:
    print("[WARN] GROQ_API_KEY not set -- falling back to built-in knowledge base")

# -- Class Labels ---------------------------------------------------------------
class_names = [
    "Bacterial Spot",
    "Early Blight",
    "Late Blight",
    "Leaf Mold",
    "Septoria Leaf Spot",
    "Spider Mites",
    "Target Spot",
    "Yellow Leaf Curl Virus",
    "Mosaic Virus",
    "Healthy",
]

# -- Built-in knowledge base (fallback when Groq is unavailable) ----------------
DISEASE_INFO = {
    "Bacterial Spot": {
        "description": "Bacterial Spot is caused by Xanthomonas vesicatoria and thrives in warm, wet conditions. It spreads rapidly through rain splash and infected plant debris, and can cause severe defoliation and fruit damage if left untreated.",
        "symptoms": ["Small, water-soaked spots on leaves that turn dark brown or black", "Spots surrounded by yellow halos, giving a shot-hole appearance when centers fall out", "Raised, scab-like lesions on fruits with rough, corky surfaces", "Severe defoliation in advanced stages, leaving plants bare"],
        "prevention": ["Use certified disease-free seeds and transplants", "Avoid overhead irrigation; use drip irrigation to keep foliage dry", "Practice crop rotation with non-solanaceous crops for at least 2 years", "Remove and destroy all infected plant debris at the end of the season"],
        "treatment": ["Apply copper-based bactericides at first sign of infection", "Combine copper sprays with mancozeb for improved efficacy", "Remove and discard heavily infected leaves to reduce inoculum", "Avoid working in the field when plants are wet to prevent spread"],
    },
    "Early Blight": {
        "description": "Early Blight is a fungal disease caused by Alternaria solani that primarily affects older, lower leaves first. It produces distinctive concentric ring patterns and can significantly reduce yield if not managed promptly.",
        "symptoms": ["Dark brown spots with concentric rings creating a bull's-eye pattern", "Yellow chlorotic halo surrounding each lesion on the leaf surface", "Lower and older leaves are infected first, progressing upward", "Lesions on stems and fruit near the stem end in severe infections"],
        "prevention": ["Practice 3-4 year crop rotation to break the disease cycle", "Provide adequate plant spacing to ensure good air circulation", "Apply mulch around plants to prevent soil splash onto lower leaves", "Maintain balanced fertilization; stressed plants are more susceptible"],
        "treatment": ["Remove and destroy all infected lower leaves at first symptom", "Apply fungicides containing chlorothalonil, mancozeb, or azoxystrobin", "Use organic options such as neem oil or copper-based sprays", "Repeat applications every 7-10 days during wet or humid weather"],
    },
    "Late Blight": {
        "description": "Late Blight, caused by Phytophthora infestans, is one of the most destructive tomato diseases. It spreads explosively under cool, moist conditions and can devastate a crop within days.",
        "symptoms": ["Large, irregular pale to dark brown water-soaked lesions on leaves and stems", "White cottony sporulation visible on undersides of leaves in humid conditions", "Greasy, dark brown patches on green or ripe fruits that rot rapidly", "Entire plants can collapse and die within 1-2 weeks in favorable conditions"],
        "prevention": ["Plant certified resistant tomato varieties whenever available", "Avoid overhead watering; water early so foliage dries quickly", "Ensure adequate spacing and stake plants to improve air circulation", "Monitor local disease forecasting alerts during cool, wet weather"],
        "treatment": ["Apply preventive fungicides before symptoms appear during high-risk weather", "Use systemic fungicides (metalaxyl, cymoxanil) once disease is detected", "Remove and bag infected plants immediately; do not compost them", "In severe outbreaks, remove entire plants to protect the rest of the crop"],
    },
    "Leaf Mold": {
        "description": "Leaf Mold is caused by Passalora fulva and is most common in greenhouses or high-humidity conditions. It reduces photosynthesis and can cause significant yield loss in susceptible varieties.",
        "symptoms": ["Pale green or yellow spots on the upper leaf surface without sharp margins", "Olive-green to grayish-brown velvety mold growth on undersides of leaves", "Leaves turn yellow, wither, and drop prematurely in severe infections", "Reduced fruit set and smaller fruits due to impaired photosynthesis"],
        "prevention": ["Maintain relative humidity below 85% using ventilation", "Space plants adequately and prune suckers to improve airflow", "Plant resistant varieties with Cf-resistance genes when available", "Avoid wetting foliage during irrigation; water at the base of plants"],
        "treatment": ["Apply fungicides such as chlorothalonil, mancozeb, or copper-based products", "Remove and destroy infected leaves to reduce fungal spore load", "Improve ventilation in enclosed growing areas and reduce humidity", "Rotate fungicide classes to prevent resistance development"],
    },
    "Septoria Leaf Spot": {
        "description": "Septoria Leaf Spot, caused by Septoria lycopersici, is a very common fungal disease that starts on lower leaves after fruit set. It causes severe defoliation, exposing fruits to sunscald.",
        "symptoms": ["Numerous small circular spots (3-6 mm) with dark borders and lighter gray centers", "Tiny black fruiting bodies (pycnidia) visible in the center of each spot", "Disease begins on older lower leaves and progresses rapidly up the plant", "Heavy defoliation leaving upper stems bare and fruits exposed to sunscald"],
        "prevention": ["Use disease-free transplants and rotate crops for at least 2 years", "Remove and destroy infected plant debris at season's end", "Stake and prune plants to improve airflow and reduce leaf wetness", "Avoid working among wet plants to prevent mechanical spore dispersal"],
        "treatment": ["Apply fungicides (chlorothalonil, mancozeb, or copper) at first detection", "Remove heavily infected lower leaves carefully and dispose off-site", "Maintain spray schedules every 7-10 days during rainy periods", "Use resistant varieties in subsequent seasons to reduce disease pressure"],
    },
    "Spider Mites": {
        "description": "Spider Mites (Tetranychus urticae) are tiny arachnids that pierce leaf cells to feed on plant sap. They thrive in hot, dry conditions and can reproduce rapidly, causing severe damage within weeks.",
        "symptoms": ["Tiny yellow or bronze stippling (dots) on upper leaf surfaces from feeding", "Fine silken webbing visible on leaf undersides in heavy infestations", "Leaves turn bronze or reddish-brown, dry out, and drop prematurely", "Stunted plant growth and reduced fruit production in severe infestations"],
        "prevention": ["Maintain adequate soil moisture; water-stressed plants are more vulnerable", "Avoid excessive nitrogen fertilization which promotes growth preferred by mites", "Introduce or conserve natural predators such as predatory mites", "Clean plants with water sprays to dislodge mite colonies early"],
        "treatment": ["Apply miticides such as abamectin, bifenazate, or spiromesifen", "Use insecticidal soap or neem oil sprays, reaching leaf undersides thoroughly", "Release predatory mites (Phytoseiulus persimilis) as biological control", "Rotate between miticide classes to prevent resistance buildup"],
    },
    "Target Spot": {
        "description": "Target Spot is caused by Corynespora cassiicola and gets its name from the distinctive concentric ring patterns on infected leaves. It affects all above-ground plant parts in warm, humid climates.",
        "symptoms": ["Circular to irregular brown spots with concentric rings resembling a bull's-eye", "Lesions may coalesce, forming large blighted areas that kill affected leaves", "Dark brown, slightly sunken lesions appearing on stems and petioles", "Fruit infections appear as small dark circular spots that may crack when wet"],
        "prevention": ["Maintain wide plant spacing and use trellising to improve air circulation", "Avoid overhead irrigation and water early in the day to reduce leaf wetness", "Remove lower leaves that touch the soil surface to reduce splash dispersal", "Practice crop rotation and remove all plant debris promptly after harvest"],
        "treatment": ["Apply fungicides containing azoxystrobin, chlorothalonil, or fluxapyroxad preventively", "Remove and destroy infected plant tissue to reduce spread of spores", "Begin fungicide programs early before conditions become favorable", "Rotate fungicide modes of action to delay resistance development"],
    },
    "Yellow Leaf Curl Virus": {
        "description": "Tomato Yellow Leaf Curl Virus (TYLCV) is a devastating begomovirus transmitted exclusively by the silverleaf whitefly (Bemisia tabaci). Once infected, plants cannot be cured, making prevention critical.",
        "symptoms": ["Upward curling and cupping of young leaves with yellowing of leaf margins", "Stunted plant growth with a compact bushy appearance due to shortened internodes", "Drastically reduced or complete elimination of fruit set on infected plants", "Flower drop and failure to set fruit even when flowers appear normal"],
        "prevention": ["Use TYLCV-resistant or tolerant tomato varieties as the primary defense", "Control whitefly populations using yellow sticky traps and reflective mulches", "Apply systemic insecticides as seed treatments or at transplanting", "Install insect-proof 50-mesh screens on greenhouse openings to exclude whiteflies"],
        "treatment": ["Remove and destroy infected plants immediately to prevent spread", "Apply insecticides to control the whitefly vector population aggressively", "There is no cure once a plant is infected; focus all efforts on vector management", "Replant with resistant varieties and enhanced whitefly exclusion measures"],
    },
    "Mosaic Virus": {
        "description": "Tomato Mosaic Virus (ToMV) and Tobacco Mosaic Virus (TMV) are highly contagious viruses spread by mechanical contact and contaminated tools. They persist for years in soil and plant debris.",
        "symptoms": ["Mottled mosaic pattern of light green, yellow, and dark green across leaf surfaces", "Leaf distortion including curling, blistering, and fern-leaf appearance", "Stunted overall plant growth with smaller than normal fruits", "Fruits may show internal browning or yellow spots, reducing marketability"],
        "prevention": ["Use certified virus-free seeds and resistant tomato varieties", "Disinfect all tools with 10% bleach or 70% alcohol between plants", "Wash hands thoroughly with soap before handling plants", "Remove volunteer tomato plants and weeds that may harbor the virus"],
        "treatment": ["Remove and destroy infected plants immediately; there is no chemical cure", "Disinfect the growing area, tools, stakes, and containers thoroughly", "Apply protective measures to prevent aphid or whitefly vector spread", "Replant with certified resistant varieties in subsequent growing seasons"],
    },
    "Healthy": {
        "description": "This tomato leaf shows no signs of disease, pest damage, or nutritional stress. The plant appears to be in excellent condition with vibrant, uniform green coloration and optimal leaf structure.",
        "symptoms": ["Uniform, vibrant dark green coloration across the entire leaf surface", "No spots, lesions, discoloration, or abnormal patterns of any kind", "Normal leaf texture, shape, and structure with good turgidity", "Stems are firm and green with vigorous overall plant growth"],
        "prevention": ["Maintain consistent watering at the soil level and avoid wetting foliage", "Monitor plants weekly for early signs of disease or pest pressure", "Practice crop rotation each season and maintain clean garden beds", "Ensure balanced fertilization with adequate potassium and calcium"],
        "treatment": ["No treatment is required — your plant is healthy and thriving", "Continue routine monitoring and maintain current cultural practices", "Consider preventive copper sprays during high-humidity periods", "Stake and prune suckers regularly to maintain good airflow"],
    },
}

# -- In-memory cache (Groq called at most once per disease per server run) -------
_analysis_cache: dict[str, dict] = {}

# -- Groq prompt ----------------------------------------------------------------
PROMPT_TEMPLATE = """You are an expert plant pathologist. A tomato leaf has been diagnosed with: "{disease}".

Return ONLY a valid JSON object (no markdown, no code fences) with exactly these keys:
{{
  "description": "<2-3 sentence overview of the disease>",
  "symptoms": ["<symptom 1>", "<symptom 2>", "<symptom 3>", "<symptom 4>"],
  "prevention": ["<tip 1>", "<tip 2>", "<tip 3>", "<tip 4>"],
  "treatment": ["<step 1>", "<step 2>", "<step 3>", "<step 4>"]
}}

If the diagnosis is "Healthy", describe what a healthy tomato leaf looks like and give general care tips.
Keep each item concise (one sentence). Return strictly valid JSON with no extra text."""


def _parse_json(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


def get_disease_info(disease_name: str) -> dict:
    """
    Return disease analysis. Priority:
    1. In-memory cache (instantaneous)
    2. Groq API (if key is set) -- with one retry on rate-limit
    3. Built-in knowledge base (offline fallback)
    """
    # Cache hit
    if disease_name in _analysis_cache:
        print(f"[CACHE] Returning cached result for '{disease_name}'")
        return _analysis_cache[disease_name]

    # Try Groq first
    if groq_client:
        prompt = PROMPT_TEMPLATE.format(disease=disease_name)
        for attempt in range(2):
            try:
                completion = groq_client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    max_tokens=512,
                    messages=[{"role": "user", "content": prompt}],
                )
                raw_text = completion.choices[0].message.content
                result = _parse_json(raw_text)
                _analysis_cache[disease_name] = result
                print(f"[OK] Groq analysis cached for '{disease_name}'")
                return result

            except Exception as e:
                err_str = str(e)
                if ("429" in err_str or "rate" in err_str.lower()) and attempt == 0:
                    wait = 10
                    match = re.search(r"retry.after[:\s]+(\d+)", err_str, re.IGNORECASE)
                    if match:
                        wait = min(int(match.group(1)) + 1, 30)
                    print(f"[WAIT] Groq rate limit -- waiting {wait}s...")
                    time.sleep(wait)
                    continue
                print(f"[WARN] Groq failed: {e} -- falling back to built-in data")
                break   # fall through to built-in data

    # Fallback: built-in knowledge base
    info = DISEASE_INFO.get(disease_name)
    if info:
        _analysis_cache[disease_name] = info
        print(f"[FALLBACK] Serving built-in data for '{disease_name}'")
        return info

    raise ValueError(f"No information available for: '{disease_name}'")


def translate_info(disease_name: str, english_info: dict, target_lang: str) -> dict:
    cache_key = f"{disease_name}_{target_lang}"
    if cache_key in _analysis_cache:
        print(f"[CACHE] Hit translation for '{cache_key}'")
        return _analysis_cache[cache_key]

    if target_lang == 'en':
        return english_info

    print(f"[*] Translating '{disease_name}' to {target_lang}...")
    translator = GoogleTranslator(source='en', target=target_lang)
    try:
        translated_info = {}
        translated_info["description"] = translator.translate(english_info["description"])
        
        # Batch translation lists if possible, or translate individually
        translated_info["symptoms"] = [translator.translate(s) for s in english_info["symptoms"]]
        translated_info["prevention"] = [translator.translate(p) for p in english_info["prevention"]]
        translated_info["treatment"] = [translator.translate(t) for t in english_info["treatment"]]
        
        _analysis_cache[cache_key] = translated_info
        return translated_info
    except Exception as e:
        print(f"[WARN] Translation to {target_lang} failed: {e}")
        return english_info  # Fallback to English

# -- Routes ---------------------------------------------------------------------

@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "ok", "groq": bool(groq_client)})


@app.route("/predict", methods=["POST"])
def predict():
    """Run the ML model on the uploaded image. Returns disease + confidence only."""
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    try:
        file = request.files["file"]
        
        # Save to physical disk first. On Windows, passing FileStorage
        # or even io.BytesIO to PIL can occasionally trigger [Errno 22]
        # depending on the image format/size. 
        temp_path = os.path.join(os.path.dirname(__file__), "temp_uploaded_img.png")
        file.save(temp_path)
        
        try:
            img = Image.open(temp_path).convert("RGB").resize((256, 256))
            img_array = np.array(img) / 255.0
            img_array = np.expand_dims(img_array, axis=0)
            
            prediction = model.predict(img_array)
            index = int(np.argmax(prediction))
            confidence = round(float(prediction[0][index] * 100), 2)
            disease = class_names[index]
            
        finally:
            # Clean up the file so we don't leave trash behind
            img.close()
            if os.path.exists(temp_path):
                os.remove(temp_path)

        return jsonify({"disease": disease, "confidence": confidence})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/analyze", methods=["POST"])
def analyze():
    """Return disease analysis from Groq AI (with built-in fallback)."""
    data = request.get_json()
    if not data or "disease" not in data:
        return jsonify({"error": "Missing 'disease' field in request body"}), 400

    disease_name = data["disease"].strip()
    if not disease_name:
        return jsonify({"error": "Disease name cannot be empty"}), 400

    target_lang = data.get("lang", "en").strip()

    try:
        english_info = get_disease_info(disease_name)
        final_info = translate_info(disease_name, english_info, target_lang)
        
        return jsonify({**final_info, "cached": False}) # simplified cached flag
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000, debug=True)