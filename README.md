# 🌱 Tomato Leaf Disease Prediction with AI Insights

A full-stack, AI-powered web application that identifies tomato leaf diseases using a custom-trained Deep Learning model and provides actionable agronomical insights using Generative AI (Groq) and multi-language translation.

## 🚀 Features

- **Instant ML Prediction**: Upload a picture of a tomato leaf, and the application's trained TensorFlow Keras model (`model.h5`) will instantly classify the disease from a list of 10 possible conditions (including Healthy).
- **AI-Powered Disease Insights**: Generates a detailed breakdown of the disease using the Groq AI API (`llama-3.1-8b-instant`), including:
  - Brief Description
  - Symptoms
  - Prevention Tips
  - Treatment Methods
- **Native Multi-Language Support (i18n)**: The entire Frontend UI (headers, buttons, labels) automatically translates with 1-click into 9 Indian regional languages alongside the AI-generated insights, providing a fully native and accessible agronomical experience.
- **Graceful Fallback**: If internet is down or the Groq API limit is reached, the application seamlessly falls back to a vast built-in plant pathology knowledge base with zero downtime. 
- **Server-Side Caching**: Translations and AI generation are cached in-memory. If a user asks for "Early Blight" in "Tamil", it fetches instantly without using API calls on subsequent requests.
- **Modern UI**: Clean, responsive, interactive React front-end styled beautifully with Tailwind CSS and Lucide Icons.

---

## 🛠️ Technology Stack

### Backend (`/Server`)
- **Python Flask**: Lightweight backend routing and coordination.
- **TensorFlow / Keras**: Executes the deep learning image classification model.
- **Pillow / Numpy**: Handles image pre-processing before ML inference.
- **Groq API SDK**: Used for rapid, low-latency Generative AI prompt completion.
- **Deep-Translator**: Connects with Google Translate for flawless regional language generation.

### Frontend (`/Client`)
- **React (Vite)**: Lightning-fast front-end framework. 
- **TypeScript**: Ensuring scalable and strongly typed component logic.
- **Tailwind CSS**: Utility-first CSS framework for aesthetic and responsive UI.
- **Lucide-React**: Clean, simple SVG icon integration.

---

## 📂 Supported Diseases

The model classifies uploaded leaves into one of the following categories:
- Bacterial Spot
- Early Blight
- Late Blight
- Leaf Mold
- Septoria Leaf Spot
- Spider Mites
- Target Spot
- Yellow Leaf Curl Virus
- Mosaic Virus
- Healthy

---

## 🧠 Model Architecture & Training

### 📊 Dataset
The model was trained on the standard **PlantVillage tomato leaf dataset**. 
- **Balanced Data**: The dataset is perfectly balanced with 10,000 training images and 1,000 validation images across the 10 classes.
- **Image Specifications**: All images were verified for integrity and standardized to a size of 256×256 pixels.

### ⚙️ Preprocessing
To maximize learning efficiency, the following preprocessing pipeline was implemented:
- **Normalization**: Pixel values were scaled down from a 0–255 range to 0–1.
- **Performance Optimization**: Leveraged TensorFlow’s `tf.data` dataset pipeline alongside **prefetching** to accelerate data loading and prevent hardware bottlenecks during training.
- *(Note: Since the dataset was cleanly balanced out-of-the-box, no artificial SMOTE or class weighting was required).*

### 🏗️ Model Building (DenseNet121)
The classification engine is built using **DenseNet121**. DenseNet connects each layer to every other layer in a feed-forward fashion, drastically improving feature reuse and gradient flow—which is exceptionally powerful for texture-heavy image sets like leaf diseases.

**Transfer Learning Approach**:
- The model was initialized with weights pretrained on **ImageNet**.
- Base layers were **frozen** to strictly utilize them as feature extractors.
- **Custom Top Layers** were appended, consisting of:
  - Fully connected Dense layers for the 10-class output.
  - **Batch Normalization** for learning stability.
  - **Dropout** steps for aggressive regularization.
- The network was compiled using the **Adam optimizer** and **Categorical Cross-Entropy loss**.

**Results**: The model achieved a robust **validation accuracy of ~92.8%** with stable convergence and no problematic overfitting.

---

## 💻 Getting Started

### 1. Prerequisites
- **Node.js** (v16+)
- **Python** (v3.9+)

### 2. Backend Setup
Navigate into your Server folder and install the Python dependencies.

```bash
cd Server
pip install -r requirements.txt
```

**Environment Variables**:
Create a `.env` file in the `/Server` folder and add your Groq API key (optional but recommended for dynamic AI responses). Get one free at [console.groq.com](https://console.groq.com). Wait-free fallback data is provided if left blank.

```env
GROQ_API_KEY=your_api_key_here
```

**Run the Server**:
```bash
python app.py
```
*The Flask server will start locally on port 10000.*

### 3. Frontend Setup
Open a new terminal and navigate to the Client folder.

```bash
cd Client
npm install
npm run dev
```

*Your Vite server will serve the frontend UI, usually accessible at port 5173 or similar.*

---

## 🌍 Supported Regional Languages for Translation

The entire Application UI and AI output supports full native translation. English is selected natively by default. Available translations:
- Hindi (हिंदी)
- Tamil (தமிழ்)
- Telugu (తెలుగు)
- Kannada (ಕನ್ನಡ)
- Malayalam (മലയാളം)
- Marathi (मराठी)
- Bengali (বাংলা)
- Gujarati (ગુજરાતી)
- Punjabi (ਪੰਜਾਬੀ)

---

## ⚠️ Disclaimer
The agronomical insights provided by this software are generated using Artificial Intelligence and are intended for educational and reference purposes only. Always consult a certified agronomist or plant pathologist for serious or large-scale crop issues.
