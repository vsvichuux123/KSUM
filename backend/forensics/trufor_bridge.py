import sys
import json
import os
from PIL import Image
from PIL.ExifTags import TAGS

def run_forensic_audit(image_path):
    if not os.path.exists(image_path):
        return {"error": "Image not found"}
        
    try:
        image = Image.open(image_path)
        
        # Analyze basic metadata
        formatInfo = image.format
        modeInfo = image.mode
        sizeInfo = image.size
        
        tamper_score = 0
        anomalies_detected = 0
        forensic_score = 100
        message = "Image appears original."
        
        # Extract EXIF if available
        exif_data = image.getexif()
        suspicious_software = ['photoshop', 'adobe', 'canva', 'gimp', 'illustrator', 'lightroom', 'paint']
        
        if exif_data:
            for tag_id, value in exif_data.items():
                tag = TAGS.get(tag_id, tag_id)
                if tag == "Software" and isinstance(value, str):
                    val_lower = value.lower()
                    if any(sw in val_lower for sw in suspicious_software):
                        tamper_score += 45
                        anomalies_detected += 1
                        message = f"Detected use of editing software: {value}"
        else:
            # Often, stripped EXIF implies social media download or screenshot
            if formatInfo in ['JPEG', 'JPG', 'TIFF']: 
                tamper_score += 15
                message = "EXIF data missing or stripped. Could be downloaded from web or screenshot."
        
        forensic_score -= tamper_score
        
        # Keep score inside bounds
        forensic_score = max(0, min(100, forensic_score))
        
        result = {
            "status": "success",
            "device": "CPU/EXIF-Parser",
            "tamper_map_generated": False,
            "anomalies_detected": anomalies_detected,
            "forensic_score": forensic_score,
            "message": message,
            "format": formatInfo,
            "size": f"{sizeInfo[0]}x{sizeInfo[1]}"
        }
        
        return result
        
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)
        
    image_path = sys.argv[1]
    audit_result = run_forensic_audit(image_path)
    print(json.dumps(audit_result))
