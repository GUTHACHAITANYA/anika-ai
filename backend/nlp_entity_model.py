import re
import os
import random
import json

# Compile precise regex tokens representing financial parameters
RUPEE_REGEX = re.compile(r'(?:rs\.?|rupees|₹|inr)\s*([0-9,]+(?:\.[0-9]{2})?)', re.IGNORECASE)
NUMBER_VALUE_REGEX = re.compile(r'\b([0-9,]+(?:\.[0-9]{2})?)\b')

VERBS_ACTIONS_LEXICON = {
    "split": ["split", "divide", "share", "splitwise", "equally", "settle", "ledger"],
    "log": ["spent", "paid", "record", "log", "bought", "purchased", "ordered"]
}

PARTICIPANTS_FORBIDDEN_LEXICON = {
    "upi": [r'@', r'gpay', r'phonepe', r'paytm', r'upi'],
    "methods": [r'credit', r'debit', r'visa', r'mastercard', r'card', r'cash', r'bank', r'sbi', r'hdfc']
}

def clean_and_verify_name(raw_name: str) -> bool:
    """
    Implements core validation checks protecting names against payment triggers in compliance with absolute rules.
    Reject any name that resembles UPI, credit card, bank name, payment methods, or transaction IDs.
    """
    low_name = raw_name.lower().strip()
    if not low_name:
        return False
        
    # Check length
    if len(low_name) < 2 or len(low_name) > 50:
        return False
        
    # Check UPI symbols or forbidden keywords
    for label, patterns in PARTICIPANTS_FORBIDDEN_LEXICON.items():
        for pat in patterns:
            if re.search(pat, low_name):
                return False
                
    # Reject standard transaction id/number structures
    if re.fullmatch(r'[A-Za-z0-9]{12,}', low_name) and any(c.isdigit() for c in low_name):
        return False
        
    return True

class NLPEntityExtractor:
    """
    Advanced pattern and lexicon-based named entity recognition (NER) architecture
    matching Model 2 constraints. Identifies:
      - Rupee amounts
      - Participant names (excluding UPI triggers)
      - Merchant entities
      - Expense categories
      - Intent actions
    """
    def __init__(self, categories_list=None):
        self.categories = categories_list or [
            "Food & Dining", "Transportation", "Gadgets", "Cosmetics", "Education", "Entertainment"
        ]
        
    def extract_entities(self, text: str) -> dict:
        text_low = text.lower().strip()
        entities = {
            "merchant": None,
            "total_amount": 0.0,
            "participants": [],
            "suggested_category": "General",
            "detected_action": "query",
            "confidence_scores": {}
        }
        
        # 1. Extract Amount (Rupees value check)
        rupee_matches = RUPEE_REGEX.findall(text)
        if rupee_matches:
            # Parse highest value
            amounts_parsed = [float(val.replace(",", "")) for val in rupee_matches]
            entities["total_amount"] = max(amounts_parsed)
            entities["confidence_scores"]["amount"] = 0.95
        else:
            # Fallback to plain numbers if context suggests money
            nums = NUMBER_VALUE_REGEX.findall(text)
            numeric_vals = []
            for n in nums:
                try:
                    numeric_vals.append(float(n.replace(",", "")))
                except ValueError:
                    continue
            if numeric_vals:
                # Filter out values that might be quantities or dates
                filtered_vals = [v for v in numeric_vals if v > 5]
                if filtered_vals:
                    entities["total_amount"] = filtered_vals[0]
                    entities["confidence_scores"]["amount"] = 0.70
                    
        # 2. Extract Intent/Actions
        action_found = "query"
        for act, keywords in VERBS_ACTIONS_LEXICON.items():
            for kw in keywords:
                if kw in text_low:
                    action_found = act
                    break
        entities["detected_action"] = action_found
        
        # 3. Detect Category via lexical cues
        detected_category = "General"
        category_weights = {cat: 0 for cat in self.categories}
        
        cues = {
            "Food & Dining": ["coffee", "tea", "bites", "brew", "meal", "food", "dinner", "pizza", "canteen", "grocery"],
            "Transportation": ["uber", "ola", "metro", "auto", "shuttle", "ticket", "petrol", "fuel"],
            "Gadgets": ["charger", "cable", "adapter", "earbud", "headphones", "phone", "mouse"],
            "Cosmetics": ["face wash", "cream", "moisturizer", "sunscreen", "cleanser", "shampoo"],
            "Education": ["copy", "book", "pen", "notepad", "exam", "course", "tuition"]
        }
        
        for category, keywords in cues.items():
            for kw in keywords:
                if kw in text_low:
                    category_weights[category] = category_weights.get(category, 0) + 1.0
                    
        max_v = max(category_weights.values()) if category_weights else 0
        if max_v > 0:
            for cat, weight in category_weights.items():
                if weight == max_v:
                    detected_category = cat
                    break
                    
        entities["suggested_category"] = detected_category
        entities["confidence_scores"]["category"] = 0.85 if max_v > 0 else 0.50
        
        # 4. Filter Names and Merchants
        # Simple NER parse using capitalized tokens
        words = text.split()
        potential_names = []
        for word in words:
            clean_word = word.replace(",", "").replace(".", "").replace(":", "").strip()
            if clean_word and clean_word[0].isupper() and clean_word.lower() not in ["i", "we", "the", "rs", "inr"]:
                potential_names.append(clean_word)
                
        # Classify merchant vs participants
        merchants_cues = ["store", "mart", "canteen", "cafe", "starbucks", "mcdonalds", "kfc", "zomato", "swiggy", "zepto"]
        for name in potential_names:
            if any(cue in name.lower() for cue in merchants_cues):
                entities["merchant"] = name
            else:
                if clean_and_verify_name(name):
                    entities["participants"].append(name)
                    
        # Remove duplicate participants
        entities["participants"] = list(set(entities["participants"]))
        entities["confidence_scores"]["participants"] = 0.90 if len(entities["participants"]) > 0 else 0.40
        
        return entities

def run_tests():
    extractor = NLPEntityExtractor()
    test_texts = [
        "Logged ₹450 for Starbucks Coffee with Anchal and Nitin",
        "Record 1200 rupees on auto ride with Rahul@upi", # UPI name must be excluded
        "Spent rs 2100 at Cetaphil Cleanser for Sai and Pranav yesterday"
    ]
    
    print("====================================================")
    print("NLP ENTITY EXTRACTION UNIT TESTS")
    print("====================================================")
    for t in test_texts:
        print(f"Input text: '{t}'")
        res = extractor.extract_entities(t)
        print("Extracted entities:", json.dumps(res, indent=2))
        print("----------------------------------------------------")

if __name__ == "__main__":
    run_tests()
