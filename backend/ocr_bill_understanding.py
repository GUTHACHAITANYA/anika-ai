import os
import json
import random

# Coordinates model representing structured extraction bounds
class ReceiptSegmentBox:
    def __init__(self, xmin, ymin, xmax, ymax, text, confidence=0.99):
        self.xmin = xmin
        self.ymin = ymin
        self.xmax = xmax
        self.ymax = ymax
        self.text = text
        self.confidence = confidence
        
    def to_dict(self):
        return {
            "box": [self.xmin, self.ymin, self.xmax, self.ymax],
            "text": self.text,
            "confidence": self.confidence
        }

class OCRBillUnderstandingPipeline:
    """
    Simulated computer-vision pipeline representing Model 3 OCR operations.
    Leverages Gemini Vision API structure combined with coordinates segmentation to:
      - Isolate physical bill boundaries (multi-bill scanning)
      - Read merchants, itemized rows, tax details, and totals
      - Build bullet-proof error recovery mechanisms to guard against silent failures
    """
    def __init__(self, api_key=None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        
    def process_multibill_image(self, base64_image: str) -> dict:
        """
        Segments a single image file (holding potential collages of receipts)
        into discrete, independent visual bills with high structural resolution.
        """
        if not base64_image:
            raise ValueError("Empty image stream provided. Please attach a valid JPG or webp file.")
            
        print("[IMAGE PROCESSING] Initializing coordinate segmentation metrics...")
        
        # 1. Simulate image shape discovery (Multi-bill boundary boxes)
        bills_detected = []
        
        # Generate 1 to 2 bills representing segmented items within a collage
        num_bills = random.randint(1, 2)
        
        for k in range(num_bills):
            # Layout segment boxes mimicking OpenCV bounding contours
            height_offset = k * 500
            merchant_box = ReceiptSegmentBox(30, 20 + height_offset, 650, 110 + height_offset, f"Store Segment #{k+1}")
            item_box_1 = ReceiptSegmentBox(30, 150 + height_offset, 450, 210 + height_offset, "Margarita Pizza - 480")
            item_box_2 = ReceiptSegmentBox(30, 220 + height_offset, 450, 280 + height_offset, "Iced Latte - 180")
            total_box = ReceiptSegmentBox(450, 420 + height_offset, 760, 485 + height_offset, "Total: rs 660")
            
            bill_data = {
                "bill_index": k + 1,
                "segmentDescription": f"Physically cropped receipt bounding region #{k+1}",
                "merchant": f"Cafe Coffee Day" if k == 0 else "Pizza Express",
                "totalAmount": 660.0 if k == 0 else 1250.0,
                "currency": "INR",
                "date": "2026-05-28",
                "category": "Food & Dining",
                "items": [
                    {"name": "Margarita Pizza" if k == 1 else "Filter Coffee", "price": 480.0 if k == 1 else 150.0, "quantity": 1},
                    {"name": "Iced Latte" if k == 1 else "Spicy Garlic Bread", "price": 180.0 if k == 1 else 220.0, "quantity": 1}
                ],
                "bounding_boxes": [
                    merchant_box.to_dict(),
                    item_box_1.to_dict(),
                    item_box_2.to_dict(),
                    total_box.to_dict()
                ],
                "insights": [
                    "Identified equal-repayment indicators.",
                    "Merchant matches traditional student dining spots close to the state campus."
                ]
            }
            bills_detected.append(bill_data)
            
        return {
            "status": "success",
            "detected_bill_count": len(bills_detected),
            "bills": bills_detected,
            "rawText": "Cafe Coffee Day\n2026-05-28\nItem 1: rs 150\nItem 2: rs 220\nTotal Amount: rs 370"
        }

if __name__ == "__main__":
    pipeline = OCRBillUnderstandingPipeline()
    sample_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    print("====================================================")
    print("OCR MULTI-BILL SEGMENTATION PROCESSOR RUN")
    print("====================================================")
    result = pipeline.process_multibill_image(sample_b64)
    print(json.dumps(result, indent=2))
