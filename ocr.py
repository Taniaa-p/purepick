import sys
import pytesseract
from PIL import Image

def extract_text(image_path):
    try:
        img = Image.open(image_path)
        text = pytesseract.image_to_string(img)
        return text
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 ocr.py /Users/tania/purepick-backend/purepickimage.png")
    else:
        image_path = sys.argv[1]
        extracted_text = extract_text(image_path)
        print("Extracted Text:\n", extracted_text)

        
