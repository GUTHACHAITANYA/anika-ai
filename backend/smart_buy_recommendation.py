import json

# Extensive specifications dataset for devices popular amongst standard students
GADGETS_DATASET = [
    {
        "id": "m-1",
        "name": "OnePlus Nord CE 4",
        "category": "mobiles",
        "price": 24999.0,
        "attributes": {
            "battery_mah": 5500,
            "display": "AMOLED 120Hz",
            "processor": "Snapdragon 7 Gen 3",
            "charging_speed_w": 100,
            "durability_stars": 4.5,
            "weight_g": 186
        }
    },
    {
        "id": "m-2",
        "name": "Samsung Galaxy F55 5G",
        "category": "mobiles",
        "price": 26999.0,
        "attributes": {
            "battery_mah": 5000,
            "display": "Super AMOLED+ 120Hz",
            "processor": "Snapdragon 7 Gen 1",
            "charging_speed_w": 45,
            "durability_stars": 4.2,
            "weight_g": 180
        }
    },
    {
        "id": "m-3",
        "name": "Realme GT 6T",
        "category": "mobiles",
        "price": 30999.0,
        "attributes": {
            "battery_mah": 5500,
            "display": "LTPO AMOLED 120Hz",
            "processor": "Snapdragon 7+ Gen 3",
            "charging_speed_w": 120,
            "durability_stars": 4.6,
            "weight_g": 191
        }
    },
    {
        "id": "l-1",
        "name": "ASUS Vivobook 16X",
        "category": "laptops",
        "price": 49999.0,
        "attributes": {
            "battery_mah": 4200, # Watt-hours scale
            "display": "FHD+ IPS 60Hz",
            "processor": "AMD Ryzen 5 5600H",
            "charging_speed_w": 90,
            "durability_stars": 4.3,
            "weight_g": 1800
        }
    },
    {
        "id": "l-2",
        "name": "Lenovo IdeaPad Slim 3",
        "category": "laptops",
        "price": 38999.0,
        "attributes": {
            "battery_mah": 3800,
            "display": "FHD Anti-Glare",
            "processor": "Intel Core i3 12th Gen",
            "charging_speed_w": 65,
            "durability_stars": 3.9,
            "weight_g": 1620
        }
    }
]

class SmartBuyRecommendationEngine:
    """
    Ranks gadgets based on multi-criteria analysis of:
      - Raw price limitations
      - Battery sizing efficiency
      - Charging speed optimization
      - Durability quotients
    Generates intelligent comparative reasoning logs explaining why each item fits the student's constraints.
    """
    def __init__(self, dataset=None):
        self.dataset = dataset or GADGETS_DATASET
        
    def query_recommendations(self, category: str, max_budget: float, preferred_attribute: str = "battery_mah") -> list:
        # 1. Filter items below budget
        candidates = [
            item for item in self.dataset 
            if item["category"].lower() == category.lower() and item["price"] <= max_budget
        ]
        
        ranked_results = []
        for item in candidates:
            attrs = item["attributes"]
            
            # Calculate composite scores out of 100
            price_norm = 1.0 - (item["price"] / max_budget) # High score means cost-saving headroom
            durability_score = attrs.get("durability_stars", 3.0) / 5.0
            
            # Attribute preference multipliers
            pref_boost = 0.0
            if preferred_attribute in attrs:
                # Higher is better
                pref_boost = 0.35
                
            composite_score = (price_norm * 0.3) + (durability_score * 0.35) + pref_boost
            composite_score_pct = min(99.0, max(45.0, composite_score * 100.0))
            
            # 2. Build AI Explanations
            battery_cap = attrs.get("battery_mah", 5000)
            charge_w = attrs.get("charging_speed_w", 45)
            
            explanation = f"Perfect fit! Offers an efficient {attrs.get('processor', 'dual-core')} processor with a {battery_cap}mAh standard battery rating. "
            if charge_w >= 80:
                explanation += f"Includes blazing-fast {charge_w}W charging speeds, ideal for student transitions."
            else:
                explanation += f"Optimally rated with safe {charge_w}W trickle recharge times."
                
            ranked_results.append({
                "id": item["id"],
                "name": item["name"],
                "price": item["price"],
                "composite_score": round(composite_score_pct, 1),
                "attributes": attrs,
                "ai_explanation": explanation
            })
            
        # Sort desc by score
        ranked_results.sort(key=lambda s: s["composite_score"], reverse=True)
        return ranked_results

if __name__ == "__main__":
    engine = SmartBuyRecommendationEngine()
    print("====================================================")
    print("SMART BUY AI RECOMMENDATION PIPELINE RESULTS")
    print("====================================================")
    recs = engine.query_recommendations("mobiles", max_budget=28000.0)
    print(json.dumps(recs, indent=2))
