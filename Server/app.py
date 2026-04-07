from flask import Flask, request, jsonify
import numpy as np
from PIL import Image
from flask_cors import CORS
import os
from tensorflow.keras.models import load_model

app = Flask(__name__)
CORS(app)

print("🚀 Server starting...")

# ✅ Load model ONCE at startup (IMPORTANT)
model_path = os.path.join(os.path.dirname(__file__), "model.h5")

print("⏳ Loading model at startup...")
model = load_model(model_path)
print("✅ Model loaded successfully")


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
    "Healthy"
]


@app.route("/", methods=["GET"])
def home():
    return {"status": "ok"}


@app.route("/predict", methods=["POST"])
def predict():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    try:
        file = request.files["file"]

        img = Image.open(file).convert("RGB").resize((256, 256))
        img_array = np.array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        prediction = model.predict(img_array)

        index = int(np.argmax(prediction))
        confidence = float(prediction[0][index] * 100)

        return jsonify({
            "disease": class_names[index],
            "confidence": round(confidence, 2)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)