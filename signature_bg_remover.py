import cv2
import numpy as np
import os
from fastapi import FastAPI, UploadFile, File
from io import BytesIO
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Serve static files (frontend)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Allow CORS for local development (optional, but helps with frontend-backend integration)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def process_signature(image: np.ndarray) -> np.ndarray:
    # Convert to HSV for better segmentation
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    lower_bound = np.array([0, 0, 0])
    upper_bound = np.array([240, 50, 205])
    mask = cv2.inRange(hsv, lower_bound, upper_bound)
    mask_inv = cv2.bitwise_not(mask)
    if len(image.shape) == 3:
        if image.shape[2] == 3:
            b, g, r = cv2.split(image)
            alpha = mask_inv
            result = cv2.merge((b, g, r, alpha))
        elif image.shape[2] == 4:
            b, g, r, a = cv2.split(image)
            new_alpha = cv2.bitwise_and(a, mask_inv)
            result = cv2.merge((b, g, r, new_alpha))
        else:
            result = cv2.cvtColor(image, cv2.COLOR_GRAY2BGRA)
            result[:, :, 3] = mask_inv
    else:
        result = cv2.cvtColor(image, cv2.COLOR_GRAY2BGRA)
        result[:, :, 3] = mask_inv
    return result

@app.post("/remove-bg/")
async def remove_bg(file: UploadFile = File(...)):
    # Read the image file from the upload
    image_bytes = await file.read()
    np_img = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_img, cv2.IMREAD_UNCHANGED)
    processed_image = process_signature(image)
    _, buffer = cv2.imencode('.png', processed_image)
    return StreamingResponse(BytesIO(buffer), media_type="image/png")

@app.get("/")
def read_index():
    return FileResponse("static/index.html")  # InkSmart branding

# Example usage: Run with `uvicorn signature_bg_remover:app --reload`