import os
import joblib
import random
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# List of student expense categories
CATEGORIES = [
    "Food & Dining",
    "Transportation",
    "Gadgets",
    "Cosmetics",
    "Education",
    "Entertainment",
    "Utilities",
    "Shopping & Lifestyle",
    "Impulse / Splurge"
]

# Vocabulary hints to generate high-fidelity dataset rows
KEYWORDS_BY_CATEGORY = {
    "Food & Dining": [
        "tea", "coffee", "canteen", "lunch", "dinner", "breakfast", "burger", "pizza",
        "starbucks", "mcdonalds", "kfc", "restaurant", "snack", "maggi", "samosa",
        "grocery", "zepto", "blinkit", "instamart", "swiggy", "zomato", "biryani"
    ],
    "Transportation": [
        "uber", "ola", "shuttle", "auto", "metro", "cab", "taxi", "bus fare", "fuel",
        "petrol", "parking", "train ticket", "flight", "rapido", "rickshaw"
    ],
    "Gadgets": [
        "charger", "usb cable", "headphones", "earbuds", "mouse", "keyboard", "ssd",
        "powerbank", "iphone", "oneplus", "screen card", "adapter", "speakers", "monitor"
    ],
    "Cosmetics": [
        "moisturizer", "sunscreen", "face wash", "cleanser", "serum", "lip balm",
        "cream", "perfume", "salon", "styling gel", "shampoo", "acne gel", "skincare"
    ],
    "Education": [
        "photocopy", "book", "mandal prep", "exam fee", "notepad", "calculator",
        "pen", "tuition", "course", "udemy", "stationery", "journal", "library card"
    ],
    "Entertainment": [
        "movie ticket", "netflix", "spotify", "youtube premium", "arcade", "concert",
        "gaming zone", "pubg bundle", "clubbing", "bowling", "standup comedy"
    ],
    "Utilities": [
        "room rent", "electricity", "wi-fi subscription", "mobile recharge", "water bill",
        "gas cylinder", "laundry", "hostel maintenance"
    ],
    "Shopping & Lifestyle": [
        "jeans", "t-shirt", "shoes", "sneakers", "bag", "jacket", "myntra", "amazon",
        "ajio", "sunglasses", "watch", "perfume", "wardrobe"
    ],
    "Impulse / Splurge": [
        "vape", "cigarette", "alcohol", "hookah", "unplanned pub crawl", "late night clubbing",
        "giga burger combo print", "mystery box", "collectibles"
    ]
}

TEMPLATES = [
    "Bought some {} for the team",
    "Paid for {} bill",
    "Spent rupees on {}",
    "Logged transaction regarding {}",
    "Standard {} charges",
    "Late-night {} order",
    "Shared {} expense with roommate",
    "Monthly payment for {}",
    "Emergency {} purchase",
    "Quick {} trip",
    "{} for college students discount coupon",
    "Routine {}"
]

def generate_synthetic_dataset(num_samples=6000):
    """
    Generates a high-quality rich dataset of synthetic student expense strings
    consisting of 5000 - 10000 balanced rows as requested in Phase 1 constraints.
    """
    dataset_texts = []
    dataset_labels = []
    
    print(f"[PREPARATION] Generating balanced text dataset of {num_samples} samples across {len(CATEGORIES)} segments...")
    
    for _ in range(num_samples):
        category = random.choice(CATEGORIES)
        keywords = KEYWORDS_BY_CATEGORY[category]
        
        # Pull 1-2 random keywords corresponding to target category
        selected_kw = []
        if random.random() > 0.5 and len(keywords) > 1:
            selected_kw.append(random.choice(keywords))
            second_kw = random.choice(keywords)
            while second_kw == selected_kw[0]:
                second_kw = random.choice(keywords)
            selected_kw.append(second_kw)
        else:
            selected_kw.append(random.choice(keywords))
            
        kw_phrase = " and ".join(selected_kw)
        
        # Occasionally mix with price terms or rupee signals to resemble real inputs
        price_num = random.randint(30, 4500)
        rupee_decorations = [
            f"rs {price_num}", f"costing {price_num}", f"paid ₹{price_num}", f"spent rs {price_num}", ""
        ]
        price_signal = random.choice(rupee_decorations)
        
        # Bind with templated phrase structures
        template = random.choice(TEMPLATES)
        text_entry = template.format(kw_phrase)
        if price_signal:
            if random.random() > 0.5:
                text_entry = f"{text_entry} {price_signal}"
            else:
                text_entry = f"{price_signal} - {text_entry}"
                
        # Inject standard structural lowercase normalization
        dataset_texts.append(text_entry.lower())
        dataset_labels.append(category)
        
    return dataset_texts, dataset_labels

def main():
    print("====================================================")
    print("PHASE 1 - TRAINING CATEGORY CLASSIFIER MODEL")
    print("====================================================")
    
    # 1. Synthesize Dataset
    texts, labels = generate_synthetic_dataset(7500)
    
    # 2. Train-Test Split (Strategic validation parameters)
    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.20, random_state=42, stratify=labels
    )
    
    # 3. TF-IDF Representation Vectorization
    print("[MODEL] Transforming token matrices using TF-IDF vectorizer...")
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2), 
        max_features=2500, 
        stop_words='english',
        sublinear_tf=True
    )
    
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)
    
    # 4. Logistic Regression Classifier Calibration
    print("[TRAINING] Fitting high-fidelity multi-class Logistic Regression estimator...")
    clf = LogisticRegression(
        C=1.5, 
        max_iter=1000, 
        multi_class='multinomial', 
        solver='saga', 
        random_state=42
    )
    clf.fit(X_train_vec, y_train)
    
    # 5. Evaluate Metrics
    y_pred = clf.predict(X_test_vec)
    print("\n[EVALUATION] Estimator classification reports:")
    print(classification_report(y_test, y_pred))
    
    # Ensure preservation of output pickle directories
    os.makedirs("backend/ml_assets", exist_ok=True)
    
    # 6. Export Pickled Artifacts
    print("[SERIALIZATION] Exporting models to artifacts folder...")
    joblib.dump(clf, "backend/ml_assets/expense_model.pkl")
    joblib.dump(vectorizer, "backend/ml_assets/vectorizer.pkl")
    print("✔ CALIBRATION SUCCESSFUL - Saved 'expense_model.pkl' & 'vectorizer.pkl'")
    print("====================================================\n")

if __name__ == "__main__":
    main()
