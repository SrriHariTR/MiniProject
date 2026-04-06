from flask import Flask, request, jsonify
from tensorflow.keras.models import load_model
import numpy as np
from PIL import Image
from flask_cors import CORS

# Create app FIRST ✅
app = Flask(__name__)

# Enable CORS AFTER app creation ✅
CORS(app)

# Load model
model = load_model("model.h5")

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