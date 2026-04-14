import requests
import io
import time
from PIL import Image
import traceback

img = Image.new('RGB', (100, 100), color = 'red')
img_byte_arr = io.BytesIO()
img.save(img_byte_arr, format='PNG')
img_bytes = img_byte_arr.getvalue()

try:
    files = {"file": ("test.png", img_bytes, "image/png")}
    response = requests.post("http://127.0.0.1:10000/predict", files=files)
    print("Response:", response.status_code)
    print(response.json())
except Exception as e:
    print("Error:")
    traceback.print_exc()
