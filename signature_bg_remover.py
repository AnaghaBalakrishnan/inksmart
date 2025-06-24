import cv2
import numpy as np
import os
from fastapi import FastAPI, UploadFile, File
from io import BytesIO
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR

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

# Initialize PaddleOCR model (English, use_angle_cls for better handwriting)
ocr_model = PaddleOCR(use_angle_cls=True, lang='en')

def process_signature(image: np.ndarray) -> np.ndarray:
    # Convert to HSV for better segmentation
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    # Define range of background color (e.g., white background)
    lower_bound = np.array([0, 0, 0])  # Adjust as needed
    upper_bound = np.array([240, 50, 205])  # Adjust as needed

    # Create a mask for the background
    mask = cv2.inRange(hsv, lower_bound, upper_bound)

    # Invert the mask to get the foreground
    mask_inv = cv2.bitwise_not(mask)

    # Handle different image channel counts
    if len(image.shape) == 3:
        if image.shape[2] == 3:
            # BGR image
            b, g, r = cv2.split(image)
            alpha = mask_inv
            result = cv2.merge((b, g, r, alpha))
        elif image.shape[2] == 4:
            # BGRA image - already has alpha channel
            b, g, r, a = cv2.split(image)
            # Combine existing alpha with our mask
            new_alpha = cv2.bitwise_and(a, mask_inv)
            result = cv2.merge((b, g, r, new_alpha))
        else:
            # Grayscale or other format
            result = cv2.cvtColor(image, cv2.COLOR_GRAY2BGRA)
            result[:, :, 3] = mask_inv
    else:
        # Grayscale image
        result = cv2.cvtColor(image, cv2.COLOR_GRAY2BGRA)
        result[:, :, 3] = mask_inv

    return result

def extract_text_from_image(image: np.ndarray) -> dict:
    """Extract text from image using PaddleOCR"""
    try:
        # Always convert to 3-channel BGR if image has alpha
        if len(image.shape) == 3 and image.shape[2] == 4:
            image = cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
        if len(image.shape) == 3 and image.shape[2] == 3:
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        else:
            image_rgb = image

        # PaddleOCR expects file path or numpy array (RGB)
        results = ocr_model.ocr(image_rgb, cls=True)
        extracted_text = []
        for line in results[0]:
            text = line[1][0]
            confidence = float(line[1][1])
            bbox = [[float(x) for x in point] for point in line[0]]
            extracted_text.append({
                "text": text,
                "confidence": confidence,
                "bbox": bbox
            })
        extracted_text.sort(key=lambda x: x["confidence"], reverse=True)
        all_text = " ".join([item["text"] for item in extracted_text])
        return {
            "success": True,
            "text": all_text,
            "words": extracted_text,
            "total_confidence": float(np.mean([item["confidence"] for item in extracted_text])) if extracted_text else 0.0
        }
    except Exception as e:
        import traceback
        print("EXTRACT TEXT ERROR (PaddleOCR):", e)
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "text": "",
            "words": [],
            "total_confidence": 0.0
        }

@app.post("/remove-bg/")
async def remove_bg(file: UploadFile = File(...)):
    # Read the image file from the upload
    image_bytes = await file.read()
    np_img = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_img, cv2.IMREAD_UNCHANGED)

    # Process the image to remove background
    processed_image = process_signature(image)

    # Convert the processed image to a format suitable for streaming (PNG with transparency)
    _, buffer = cv2.imencode('.png', processed_image)

    # Return the processed image as a response
    return StreamingResponse(BytesIO(buffer), media_type="image/png")

@app.post("/extract-text/")
async def extract_text(file: UploadFile = File(...)):
    """Extract text from uploaded image"""
    try:
        # Read the image file
        image_bytes = await file.read()
        np_img = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(np_img, cv2.IMREAD_UNCHANGED)
        
        # Extract text
        result = extract_text_from_image(image)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        import traceback
        print("EXTRACT TEXT ERROR:", e)
        traceback.print_exc()  # <--- This will print the full traceback to your terminal
        return JSONResponse(
            content={
                "success": False,
                "error": str(e),
                "text": "",
                "words": [],
                "total_confidence": 0.0
            },
            status_code=500
        )

# Serve the frontend
@app.get("/")
def read_index():
    return FileResponse("static/index.html")  # InkSmart branding

# Example usage: Run with `uvicorn signature_bg_remover:app --reload`