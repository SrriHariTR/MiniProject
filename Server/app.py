from flask import Flask, request, jsonify
import numpy as np
from PIL import Image
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

print("🚀 Server started (without model)")

# Lazy load model
model = None

def get_model():
    global model
    if model is None:
        print("⏳ Loading model...")
        from tensorflow.keras.models import load_model
        model_path = os.path.join(os.path.dirname(__file__), "model.h5")
        model = load_model(model_path)
        print("✅ Model loaded")
    return model


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

    file = request.files["file"]

    try:
        model = get_model()   # ✅ lazy load here

        img = Image.open(file).convert("RGB").resize((256, 256))
        img_array = np.array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        prediction = model.predict(img_array)

        index = int(np.argmax(prediction))
        confidence = float(prediction[0][index] * 100)

        return jsonify({
            "disease": class_names[index],
            "confidence": confidence
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)