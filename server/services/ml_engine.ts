import crypto from "crypto";

// --- Advanced TypeScript Model definitions matching ML architecture requirements ---
export interface Product {
  id: string;
  name: string;
  category: "mobile" | "laptop" | "headphones" | "cosmetics" | "food" | "gadget" | "subscription";
  brand: string;
  price: number;
  rating: number;
  
  // Specific feature characteristics for the smart ranking scoring
  battery?: string;
  camera?: string;
  gaming_score?: number;     // 1 - 100 scale
  protein?: number;          // in grams
  sugar?: number;            // in grams
  calories?: number;         // in kcal
  value_score?: number;      // 1 - 100 value ratio
  health_score?: number;     // 1 - 100 health metrics
  oily_suitability?: number;  // 1 - 100 for moisturizers
  
  specs: Record<string, string | number>;
  reviews: string[];
  smartBuyScore?: number;
  sentimentScore?: number;
  priceDropPrediction?: {
    likelyDropPercent: number;
    timelineWeeks: number;
    verdict: string;
  };
}

// --- Extended & Highly Structured Multi-Category Dataset ---
export const PRODUCTS_DATASET: Product[] = [
  // --- MOBILES (Phones) ---
  {
    id: "m1",
    name: "Redmi Note 13 Pro 5G",
    category: "mobile",
    brand: "Xiaomi",
    price: 21999,
    rating: 4.3,
    gaming_score: 78,
    value_score: 88,
    health_score: 50,
    specs: { processor: "Snapdragon 7s Gen 2", battery: "5100 mAh", camera: "200 MP", ram: "8 GB", storage: "128 GB" },
    reviews: ["Excellent camera quality for the price!", "Battery lasts all day, but charges slow on standard plugs.", "Bloatware is a bit annoying, otherwise robust value for money."]
  },
  {
    id: "m2",
    name: "OnePlus Nord CE4 Lite",
    category: "mobile",
    brand: "OnePlus",
    price: 19999,
    rating: 4.2,
    gaming_score: 65,
    value_score: 84,
    health_score: 52,
    specs: { processor: "Snapdragon 695", battery: "5500 mAh", camera: "50 MP LYT-600", ram: "8 GB", storage: "128 GB" },
    reviews: ["Charging speed is ultra-fast!", "Decent display, but the processor feels slightly older.", "Pure oxygen OS makes it feel clean and high-fidelity."]
  },
  {
    id: "m3",
    name: "Motorola Edge 50 Fusion",
    category: "mobile",
    brand: "Motorola",
    price: 22999,
    rating: 4.5,
    gaming_score: 75,
    value_score: 92,
    health_score: 60,
    specs: { processor: "Snapdragon 7s Gen 2", battery: "5000 mAh", camera: "50 MP Lythia OIS", ram: "8 GB", storage: "256 GB" },
    reviews: ["Incredible premium curved display design!", "Very lightweight and clean ad-free software.", "Camera is top tier in outdoor lighting."]
  },
  {
    id: "m4",
    name: "Samsung Galaxy A35 5G",
    category: "mobile",
    brand: "Samsung",
    price: 27999,
    rating: 4.1,
    gaming_score: 70,
    value_score: 76,
    health_score: 65,
    specs: { processor: "Exynos 1380", battery: "5000 mAh", camera: "50 MP OIS", ram: "8 GB", storage: "128 GB" },
    reviews: ["Great build quality with Knox security.", "Processor gets warm under intensive BGMI gaming.", "Display crispness is the best Samsung premium style."]
  },
  {
    id: "m5",
    name: "iQOO Z9 5G",
    category: "mobile",
    brand: "iQOO",
    price: 19999,
    rating: 4.4,
    gaming_score: 92,
    value_score: 94,
    health_score: 45,
    specs: { processor: "MediaTek Dimensity 7200", battery: "5000 mAh", camera: "50 MP Sony IMX882", ram: "8 GB", storage: "128 GB" },
    reviews: ["Ultimate gaming performance in a medium budget!", "Extremely smooth 120Hz refresh.", "Plastic frame, but performance is unbeatable."]
  },
  {
    id: "m6",
    name: "Poco X6 Pro",
    category: "mobile",
    brand: "Poco",
    price: 24999,
    rating: 4.6,
    gaming_score: 98,
    value_score: 96,
    health_score: 40,
    specs: { processor: "Dimensity 8300 Ultra", battery: "5000 mAh", camera: "64 MP OIS", ram: "8 GB", storage: "256 GB" },
    reviews: ["Incredible Antutu score above 1.4 million!", "Unbelievable speed, handles multi-tasking effortlessly.", "Highly recommended gaming beast under 25k."]
  },

  // --- EARBUDS / HEADPHONES (Audio Elements) ---
  {
    id: "h1",
    name: "boAt Rockerz 450",
    category: "headphones",
    brand: "boAt",
    price: 1499,
    rating: 4.0,
    gaming_score: 60,
    value_score: 80,
    health_score: 55,
    specs: { battery: "15 hours", driver: "40 mm", bluetooth: "v5.0" },
    reviews: ["Super heavy bass, punchy sound.", "Ear cushions get slightly warm during prolonged usage.", "Insanely cheap, ideal budget companion."]
  },
  {
    id: "h2",
    name: "Sony WH-CH520 Wireless",
    category: "headphones",
    brand: "Sony",
    price: 4490,
    rating: 4.4,
    gaming_score: 72,
    value_score: 88,
    health_score: 70,
    specs: { battery: "50 hours", driver: "30 mm", bluetooth: "v5.2", noiseCancelling: "None" },
    reviews: ["Astonishing 50h battery, forget charging for a week!", "Extremely crisp sound, very comfortable weights.", "Microphone is extremely clear for online student group meets."]
  },
  {
    id: "h3",
    name: "JBL Tune 775NC Active Noise Cancelling",
    category: "headphones",
    brand: "JBL",
    price: 5999,
    rating: 4.3,
    gaming_score: 78,
    value_score: 85,
    health_score: 75,
    specs: { battery: "44 hours (ANC On)", driver: "40 mm", bluetooth: "v5.3", noiseCancelling: "ANC Enabled" },
    reviews: ["Deafens background noise perfectly for studying in hostels.", "Super solid passive isolation and high treble.", "Bass is clean, not bloated."]
  },
  {
    id: "h4",
    name: "OnePlus Nord Buds 2r",
    category: "headphones",
    brand: "OnePlus",
    price: 1999,
    rating: 4.4,
    gaming_score: 82,
    value_score: 93,
    health_score: 65,
    specs: { battery: "38 hours", driver: "12.4mm", bluetooth: "v5.3", noiseCancelling: "Dual Mic ANC" },
    reviews: ["Best sounding buds under 2000!", "Bass is rich and charging takes raw minutes.", "Amazing fit, stays secure during physical running."]
  },
  {
    id: "h5",
    name: "boAt Airdopes 131",
    category: "headphones",
    brand: "boAt",
    price: 999,
    rating: 3.9,
    gaming_score: 55,
    value_score: 82,
    health_score: 50,
    specs: { battery: "60 hours total", driver: "13mm", bluetooth: "v5.1", noiseCancelling: "None" },
    reviews: ["Highly affordable budget earbuds.", "Connection drops occasionally but instantly restarts.", "Super high battery with casing."]
  },

  // --- HEALTH & FOOD PRODUCTS ---
  {
    id: "f1",
    name: "MuscleBlaze High Protein Oats",
    category: "food",
    brand: "MuscleBlaze",
    price: 399,
    rating: 4.5,
    gaming_score: 40,
    value_score: 92,
    health_score: 95,
    protein: 22,
    sugar: 2,
    calories: 380,
    specs: { protein: "22g per serving", sugar: "2g per serving", calories: "380 kcal", ingredients: "Rolled Oats, Whey Protein", organic: "Yes" },
    reviews: ["Amazing high-protein breakfast helper!", "Delicious chocolate flavor, low sugar profile.", "Excellent macro nutrition for active gym-goers."]
  },
  {
    id: "f2",
    name: "Amul Sugar-Free Dark Chocolate",
    category: "food",
    brand: "Amul",
    price: 120,
    rating: 4.4,
    gaming_score: 50,
    value_score: 89,
    health_score: 90,
    protein: 8,
    sugar: 0.5,
    calories: 512,
    specs: { protein: "8g per bar", sugar: "0.5g per bar", calories: "512 kcal", ingredients: "Cocoa Solids, Maltitol substitute", organic: "No" },
    reviews: ["Real dark robust flavor without the blood sugar spikes!", "Unbelievable sugar-free taste, high-quality cocoa butter.", "A staple healthy alternative for sweets cravings."]
  },
  {
    id: "f3",
    name: "Cadbury Dairy Milk Chocolate",
    category: "food",
    brand: "Cadbury",
    price: 80,
    rating: 4.2,
    gaming_score: 45,
    value_score: 75,
    health_score: 30,
    protein: 5,
    sugar: 57,
    calories: 534,
    specs: { protein: "5.3g per bar", sugar: "57g per bar", calories: "534 kcal", ingredients: "Sugar, Milk Solids, Cocoa", organic: "No" },
    reviews: ["Classic sweet taste we all love.", "Way too sweet, full of white sugar and cheap oils.", "High-risk cheat day snack, do not eat daily!"]
  },
  {
    id: "f4",
    name: "Pintola All Natural Peanut Butter",
    category: "food",
    brand: "Pintola",
    price: 299,
    rating: 4.7,
    gaming_score: 42,
    value_score: 95,
    health_score: 98,
    protein: 30,
    sugar: 3,
    calories: 625,
    specs: { protein: "30g per 100g", sugar: "3g per 100g", calories: "625 kcal", ingredients: "100% Roasted Unsweetened Peanuts", organic: "Yes" },
    reviews: ["Super creamy texture, zero added hydrogenated oils.", "Pure peanuts, excellent proteins-to-price ratio.", "Essential budget fitness food for young students."]
  },
  {
    id: "f5",
    name: "Quaker Instant Oats",
    category: "food",
    brand: "Quaker",
    price: 180,
    rating: 4.3,
    gaming_score: 40,
    value_score: 87,
    health_score: 88,
    protein: 11,
    sugar: 1,
    calories: 389,
    specs: { protein: "11.6g", sugar: "1g", calories: "389 kcal", ingredients: "Whole Grain Rolled Oats", organic: "Yes" },
    reviews: ["Extremely convenient to make in rooms.", "Plain taste, but highly healthy source of clean carbs.", "Reliable value for daily standard meals."]
  },

  // --- SKINCARE & COSMETICS ---
  {
    id: "c1",
    name: "Minimalist Salicylic Acid 2% Face Serum",
    category: "cosmetics",
    brand: "Minimalist",
    price: 549,
    rating: 4.4,
    gaming_score: 30,
    value_score: 91,
    health_score: 93,
    oily_suitability: 95,
    specs: { volume: "30 ml", ph: "3.5 - 4.0", skinType: "Oily / Acne-prone", oilFree: "Yes" },
    reviews: ["Clears blackheads and controls oily sebum beautifully!", "Fragrance-free and medical active grading is top notch.", "Doesn't sting, very lightweight."]
  },
  {
    id: "c2",
    name: "The Derma Co 1% Hyaluronic Sunscreen",
    category: "cosmetics",
    brand: "The Derma Co",
    price: 499,
    rating: 4.5,
    gaming_score: 35,
    value_score: 89,
    health_score: 91,
    oily_suitability: 90,
    specs: { volume: "50 g", spf: "50 PA++++", skinType: "Combination / Oily", oilFree: "Yes" },
    reviews: ["Absolutely no white cast! Water-light absorption.", "Perfect protective layer for long campus outings.", "No grease, zero sweat stickiness."]
  },
  {
    id: "c3",
    name: "Cetaphil Oily Skin Cleanser",
    category: "cosmetics",
    brand: "Cetaphil",
    price: 499,
    rating: 4.6,
    gaming_score: 25,
    value_score: 94,
    health_score: 96,
    oily_suitability: 98,
    specs: { volume: "125 ml", ph: "5.5 Balanced", skinType: "Sensitive / Oily", oilFree: "Yes" },
    reviews: ["The absolute gold standard cleanser for oily skin!", "Dermatologist recommended, clears oil without drying skin.", "Unbelievable non-irritating formula."]
  },
  {
    id: "c4",
    name: "Neutrogena Hydro Boost Water Gel",
    category: "cosmetics",
    brand: "Neutrogena",
    price: 950,
    rating: 4.5,
    gaming_score: 30,
    value_score: 80,
    health_score: 92,
    oily_suitability: 94,
    specs: { volume: "50 g", ph: "6.0", skinType: "Normal to Oily / Dehydrated", oilFree: "Yes" },
    reviews: ["Instantly cools the skin, extremely hydrating gel.", "Pricey, but a tiny dab spreads incredibly far.", "Smells fantastic and skin glows gracefully."]
  },
  {
    id: "c5",
    name: "Plum Green Tea Mattifying Moisturizer",
    category: "cosmetics",
    brand: "Plum",
    price: 350,
    rating: 4.2,
    gaming_score: 28,
    value_score: 87,
    health_score: 85,
    oily_suitability: 92,
    specs: { volume: "50 ml", ph: "5.8", skinType: "Acne-prone Oily", oilFree: "Yes" },
    reviews: ["Great matte finish, controls active grease.", "Vibrant organic green tea active extract.", "Nice lightweight budget moisturizer."]
  },

  // --- GADGETS (Smart Tech) ---
  {
    id: "g1",
    name: "Realme Smart Watch S2",
    category: "gadget",
    brand: "Realme",
    price: 4499,
    rating: 4.3,
    gaming_score: 65,
    value_score: 88,
    health_score: 80,
    specs: { battery: "14 days battery", display: "AMOLED screen", sensors: "Heart Rate, SpO2, Sleep" },
    reviews: ["AMOLED display looks premium in direct sunlight.", "Incredible step tracking accuracy.", "Charging keeps the device powered for nearly 2 weeks."]
  },
  {
    id: "g2",
    name: "Echo Dot 5th Gen Active Speaker",
    category: "gadget",
    brand: "Amazon",
    price: 4999,
    rating: 4.4,
    gaming_score: 55,
    value_score: 84,
    health_score: 70,
    specs: { battery: "Wired continuous power", microphones: "4 omnidirectional", connectivity: "WiFi, Bluetooth" },
    reviews: ["Mic picks up commands from across the kitchen.", "Vastly improved sound-depth over older 4th gen.", "Smart home controls are blazingly convenient to link."]
  },
  {
    id: "g3",
    name: "Redgear Cosmo 7.1 Surround Gaming Headset",
    category: "gadget",
    brand: "Redgear",
    price: 1799,
    rating: 4.2,
    gaming_score: 90,
    value_score: 93,
    health_score: 60,
    specs: { battery: "Wired", audio: "7.1 Digital Surround", rgb: "Dynamic Color Ring" },
    reviews: ["Audio spatial directions are perfect for PUBG and CS:GO gaming!", "Thick earmuffs provide solid sound isolation in active dorms.", "Exceptional heavy-duty cable length."]
  },

  // --- LAPTOPS (Developer / Student machines) ---
  {
    id: "l1",
    name: "Lenovo IdeaPad Slim 3 AMD",
    category: "laptop",
    brand: "Lenovo",
    price: 36990,
    rating: 4.1,
    gaming_score: 60,
    value_score: 86,
    health_score: 55,
    specs: { processor: "AMD Ryzen 5 7520U", battery: "47 Wh", screen: "15.6 inch FHD", ram: "8 GB", storage: "512 GB SSD" },
    reviews: ["Good battery life for classes.", "Lightweight plastic body but reliable screen keyboard.", "Perfect for daily student study and Excel assignments."]
  },
  {
    id: "l2",
    name: "HP Laptop 15s Intel i3",
    category: "laptop",
    brand: "HP",
    price: 32990,
    rating: 4.0,
    gaming_score: 50,
    value_score: 81,
    health_score: 58,
    specs: { processor: "Intel Core i3 12th Gen", battery: "41 Wh", screen: "15.6 inch Micro-edge", ram: "8 GB", storage: "512 GB SSD" },
    reviews: ["Classic elegant look.", "Sufficient for Google Sheets and web browsing.", "Framerates lag in 4K or heavy video editing outputs."]
  },
  {
    id: "l3",
    name: "Acer Swift Go 14 OLED",
    category: "laptop",
    brand: "Acer",
    price: 54990,
    rating: 4.5,
    gaming_score: 82,
    value_score: 94,
    health_score: 72,
    specs: { processor: "Intel Core i5 13th Gen H-Series", battery: "65 Wh", screen: "14 inch 2.8K OLED 120Hz", ram: "16 GB", storage: "512 GB SSD" },
    reviews: ["OLED screen is gorgeous, deep blacks!", "Fast metal chassis, runs like a dream.", "Battery discharges slightly faster in 120Hz mode."]
  },
  {
    id: "l4",
    name: "ASUS Vivobook 16",
    category: "laptop",
    brand: "ASUS",
    price: 44990,
    rating: 4.3,
    gaming_score: 68,
    value_score: 89,
    health_score: 65,
    specs: { processor: "Ryzen 5 7530U", battery: "42 Wh", screen: "16 inch WUXGA 16:10", ram: "16 GB", storage: "512 GB SSD" },
    reviews: ["Awesome large screen and trackpad.", "Great keyboard layout and numeric pad.", "Runs very cool and silent."]
  },

  // --- SUBSCRIPTIONS (Lease Options) ---
  {
    id: "s1",
    name: "Spotify Premium Student",
    category: "subscription",
    brand: "Spotify",
    price: 59,
    rating: 4.8,
    gaming_score: 40,
    value_score: 98,
    health_score: 70,
    specs: { duration: "1 Month", concurrentDevices: 1, audioQuality: "Very High 320kbps" },
    reviews: ["Best deal ever for college students with valid verification.", "Offline download is flawless.", "No ads whatsoever, best playlist engine."]
  },
  {
    id: "s2",
    name: "YouTube Premium Solo Monthly",
    category: "subscription",
    brand: "Google",
    price: 129,
    rating: 4.7,
    gaming_score: 40,
    value_score: 93,
    health_score: 75,
    specs: { duration: "1 Month", pipMode: "Enabled", offlineDownloads: "Full HD" },
    reviews: ["PIP mode is necessary for multitasking on phone.", "Ad-free YouTube makes tutorials highly efficient.", "YouTube music inclusion is a great added bonus."]
  }
];

// --- Simple Lexicon-based NLP Sentiment Analyzer ---
export function analyzeSentiment(reviews: string[]): number {
  if (!reviews || reviews.length === 0) return 70;
  
  const positiveWords = ["great", "excellent", "amazing", "good", "gorgeous", "best", "unbeatable", "fast", "speed", "impressed", "love", "perfect", "clean", "smooth", "crisp", "clear", "flawless", "highly", "affordable", "insanely", "creamy", "dermatologist", "cooling", "hydrating"];
  const negativeWords = ["slow", "lag", "bloatware", "annoying", "older", "warm", "framerates", "plastic", "expensive", "sting", "discharges", "overpriced", "disappointed", "bad", "average", "issues", "hate", "sugar", "excessive", "sweet", "grease", "pricey"];
  
  let score = 50; // Neutral baseline
  let totalWordsChecked = 0;

  reviews.forEach(review => {
    const words = review.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/);
    words.forEach(word => {
      if (positiveWords.includes(word)) {
        score += 8;
        totalWordsChecked++;
      }
      if (negativeWords.includes(word)) {
        score -= 9;
        totalWordsChecked++;
      }
    });
  });

  return Math.min(100, Math.max(10, score));
}

// --- Vector Space Similarity & ML Engine ---
// Simulates scikit-learn & pandas weighted preference scoring and Cosine Similarity
export function calculateVectorCosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Parses natural language query to dynamically map preferences and targets
export interface ParsedQuery {
  category: string;
  extractedBudget: number | null;
  featuresPriority: {
    gaming: number;
    camera: number;
    batteryActive: number;
    healthNutrition: number;
    valueWeight: number;
    skincareOily: number;
  };
  intentType: "search" | "compare" | "recommend";
  compareTargets: string[];
}

export function parseQueryWithRegexNLP(queryString: string): ParsedQuery {
  const queryLow = queryString.toLowerCase();
  
  // 1. Extract Budget (e.g. under 25000, under ₹500, below 2000)
  let extractedBudget: number | null = null;
  
  // Match patterns like: under 25000, under rs 2000, under ₹100, below 500
  const budgetRegex = /(?:under|below|less\s*than|max|\bof\b|₹|rs\.?)\s*([0-9,]+)/i;
  const match = queryLow.match(budgetRegex);
  if (match) {
    const rawVal = match[1].replace(/,/g, "");
    const parsedNum = parseInt(rawVal, 10);
    if (!isNaN(parsedNum) && parsedNum > 10) {
      extractedBudget = parsedNum;
    }
  }

  // 2. Classify Product Category
  let category = "all";
  if (queryLow.match(/(phone|smartphone|mobile|android|poco|iqoo|galaxy|xiaomi|redmi|oneplus)/i)) {
    category = "mobile";
  } else if (queryLow.match(/(earbud|buds|earphone|headphone|sound|anc|sony|boat|jbl)/i)) {
    category = "headphones";
  } else if (queryLow.match(/(chocolate|food|protein|oats|eat|drink|healthy|snack|peanut|butter)/i)) {
    category = "food";
  } else if (queryLow.match(/(moisturizer|skin|sunscreen|cleanser|cream|acne|gel|minimalist|derma|cetaphil|neutrogena)/i)) {
    category = "cosmetics";
  } else if (queryLow.match(/(laptop|vivobook|acer|swift|ideapad|coding)/i)) {
    category = "laptop";
  } else if (queryLow.match(/(watch|smart watch|echo|dot|alexa|speaker|gadget)/i)) {
    category = "gadget";
  } else if (queryLow.match(/(spotify|youtube|premium|sub|duration)/i)) {
    category = "subscription";
  }

  // 3. Extract Feature Weights (Simulating scikit-learn target feature vector)
  let gaming = 0.1;
  let camera = 0.1;
  let batteryActive = 0.1;
  let healthNutrition = 0.1;
  let valueWeight = 0.4; // Default value-for-money focus
  let skincareOily = 0.1;

  if (queryLow.includes("gaming") || queryLow.includes("play") || queryLow.includes("bgmi") || queryLow.includes("fps") || queryLow.includes("performance")) {
    gaming = 0.95;
    valueWeight = 0.4;
  }
  if (queryLow.includes("camera") || queryLow.includes("lens") || queryLow.includes("photo") || queryLow.includes("megapixels") || queryLow.includes("sensor")) {
    camera = 0.90;
    valueWeight = 0.3;
  }
  if (queryLow.includes("battery") || queryLow.includes("mah") || queryLow.includes("charge") || queryLow.includes("charging") || queryLow.includes("last")) {
    batteryActive = 0.90;
  }
  if (queryLow.includes("healthy") || queryLow.includes("nutrition") || queryLow.includes("protein") || queryLow.includes("carbs") || queryLow.includes("organic") || queryLow.includes("low sugar") || queryLow.includes("sugar-free") || queryLow.includes("diet")) {
    healthNutrition = 0.95;
    valueWeight = 0.25;
  }
  if (queryLow.includes("oily") || queryLow.includes("acne") || queryLow.includes("clogged") || queryLow.includes("sebum")) {
    skincareOily = 0.95;
  }
  if (queryLow.includes("budget") || queryLow.includes("value") || queryLow.includes("cheap") || queryLow.includes("saving") || queryLow.includes("save")) {
    valueWeight = 0.95;
  }

  // 4. Intent Detection: is it interactive comparison?
  let intentType: "search" | "compare" | "recommend" = "search";
  const compareTargets: string[] = [];
  if (queryLow.includes("compare") || queryLow.includes(" vs ") || queryLow.includes(" versus ")) {
    intentType = "compare";
    // Look up words matching products in the database
    PRODUCTS_DATASET.forEach(p => {
      if (queryLow.includes(p.name.toLowerCase()) || queryLow.includes(p.brand.toLowerCase())) {
        compareTargets.push(p.id);
      }
    });

    // Handle generic cross-named checks (e.g., "iQOO Z9 vs Poco X6 Pro")
    if (compareTargets.length === 0) {
      if (queryLow.includes("iqoo")) compareTargets.push("m5");
      if (queryLow.includes("poco")) compareTargets.push("m6");
      if (queryLow.includes("motorola") || queryLow.includes("edge")) compareTargets.push("m3");
      if (queryLow.includes("redmi")) compareTargets.push("m1");
      if (queryLow.includes("oneplus")) compareTargets.push("m2");
    }
  }

  return {
    category,
    extractedBudget,
    featuresPriority: {
      gaming,
      camera,
      batteryActive,
      healthNutrition,
      valueWeight,
      skincareOily
    },
    intentType,
    compareTargets
  };
}

// --- Dynamic Score Matcher & AI Explanation Generation ---
export function calculateSmartBuyScore(product: Product, userBudget: number, preferences: ParsedQuery["featuresPriority"]): number {
  // Construct targeted numerical feature vectors representing product statistics [0.0 to 1.0]
  const gamingVal = (product.gaming_score || 50) / 100;
  const ratingVal = (product.rating) / 5;
  const valueVal = (product.value_score || 70) / 100;
  const healthVal = (product.health_score || 50) / 100;
  const oilyVal = (product.oily_suitability || 50) / 100;

  // Extract battery score from specifications
  let batteryVal = 0.6;
  const bSpec = String(product.specs.battery || "").toLowerCase();
  if (bSpec.includes("5500") || bSpec.includes("50 hours") || bSpec.includes("60 hours") || bSpec.includes("14 days")) {
    batteryVal = 0.95;
  } else if (bSpec.includes("5100") || bSpec.includes("5000") || bSpec.includes("44 hours") || bSpec.includes("38 hours")) {
    batteryVal = 0.85;
  }

  // Camera sound value
  let cameraVal = 0.6;
  const cSpec = String(product.specs.camera || product.specs.driver || "").toLowerCase();
  if (cSpec.includes("200") || cSpec.includes("imx882") || cSpec.includes("lythia") || cSpec.includes("lyt-600") || cSpec.includes("driver") || cSpec.includes("anc")) {
    cameraVal = 0.90;
  }

  // Construct target vector
  const targetVector = [
    preferences.gaming,
    preferences.camera,
    preferences.batteryActive,
    preferences.healthNutrition,
    preferences.skincareOily,
    preferences.valueWeight,
    0.3 // baseline rating bias
  ];

  const productVector = [
    gamingVal,
    cameraVal,
    batteryVal,
    healthVal,
    oilyVal,
    valueVal,
    ratingVal
  ];

  // Apply Cosine Similarity logic
  const similarityMultiplier = calculateVectorCosineSimilarity(targetVector, productVector);

  // Apply absolute price constraints & penalties for exceeding budget boundaries
  let budgetMultiplier = 1.0;
  if (product.price > userBudget) {
    const excessPct = (product.price - userBudget) / userBudget;
    budgetMultiplier = Math.max(0.1, 1.0 - (excessPct * 2.5)); // Steep slope penalty
  } else {
    // Reward savings: if item utilizes less of budget saving up to 35% of funds
    const savingsRatio = (userBudget - product.price) / userBudget;
    budgetMultiplier = 0.75 + (Math.min(0.25, savingsRatio * 0.4));
  }

  let finalPctScore = (similarityMultiplier * 60) + (product.rating * 5) + (valueVal * 15);
  finalPctScore = finalPctScore * budgetMultiplier;

  return Math.round(Math.min(100, Math.max(10, finalPctScore)));
}

// Generate highly personalized dynamic explanations
export function generateSmartExplanation(product: Product, preferences: ParsedQuery["featuresPriority"], budgetLimit: number): string {
  const brand = product.brand;
  let explanation = `${product.name} is selected because of its `;

  if (product.category === "mobile") {
    if (preferences.gaming > 0.7) {
      explanation += `top-tier gaming performance (Gaming Score: ${product.gaming_score}/100) powered by the high-performance ${product.specs.processor} gaming chipset. `;
    } else if (preferences.camera > 0.7) {
      explanation += `superior imaging output capability with a robust ${product.specs.camera} sensor layout, ideal for premium blogging. `;
    } else {
      explanation += `balanced hardware configuration with a durable ${product.specs.battery} battery life, keeping you connected throughout student shifts. `;
    }
    
    if (product.price < budgetLimit * 0.8) {
      explanation += `It offers incredible value, costing ₹${(budgetLimit - product.price).toLocaleString()} less than your lock limit.`;
    } else {
      explanation += `It matches your high feature expectations completely.`;
    }
  } else if (product.category === "food") {
    explanation += `excellent nutrition stats: packed with ${product.protein}g protein and containing only ${product.sugar}g sugar per serving, minimizing calorie inflation (${product.calories} kcal). `;
    if (product.sugar && product.sugar > 10) {
      explanation += `Note: Sugar metrics are slightly elevated; recommend eating in moderation.`;
    } else {
      explanation += `It provides a marvelous nutrition-to-price ratio compared to standard market sweets.`;
    }
  } else if (product.category === "cosmetics") {
    explanation += `outstanding oily skin oil-control compatibility (${product.oily_suitability}/100) and completely oil-free formula (${product.specs.oilFree || "Yes"}) matching dermatological safeties. `;
    explanation += `Perfect daily wear keeping pore surfaces hydrated without building up grease.`;
  } else {
    explanation += `highly optimized specifications (${product.specs.battery || "reliable action"}) coupled with exceptional ${product.brand} brand rating (★ ${product.rating}). `;
  }

  return explanation;
}

// Price drop forecast simulation
export function predictPriceDrop(product: Product): { likelyDropPercent: number; timelineWeeks: number; verdict: string } {
  const hash = crypto.createHash("md5").update(product.name).digest("hex");
  const seed = parseInt(hash.substring(0, 2), 16) % 15;
  
  let baseDrop = 5;
  let timeline = 3;
  
  if (product.price > 40000) {
    baseDrop = 12;
    timeline = 5;
  } else if (product.price > 15000) {
    baseDrop = 8;
    timeline = 4;
  } else if (product.price > 2000) {
    baseDrop = 10;
    timeline = 2;
  }

  const dropFactor = Math.min(25, Math.max(2, baseDrop + (seed % 6) - 2));
  const weeks = Math.max(1, timeline + (seed % 3) - 1);
  
  let verdict = "Stable pricing currently. Proceed with checkout.";
  if (dropFactor > 12) {
    verdict = `Highly predictive alert: Wait and save! Expected price drop of ${dropFactor}% (approx. Save ₹${Math.round(product.price * (dropFactor/100))}) during scheduled Flipkart/Amazon clearance events inside next ${weeks} weeks.`;
  } else if (dropFactor > 8) {
    verdict = `Upcoming dynamic seller markdown drops forecasted inside ${weeks} weeks. Waiting is moderately recommended.`;
  }

  return {
    likelyDropPercent: dropFactor,
    timelineWeeks: weeks,
    verdict
  };
}

// --- Primary API Handler: Personalized Vector Search Matcher ---
export function recommendProducts(category: string, budget: number, query?: string, preferenceProfile?: string): { recommendations: any[], insights: string[], alternative?: any } {
  // 1. NLP Parse Query
  const parsed = parseQueryWithRegexNLP(query || "");
  const limitBudget = parsed.extractedBudget || budget || 25000;
  
  // Apply preference profile override if presented
  if (preferenceProfile) {
    if (preferenceProfile === "gaming") {
      parsed.featuresPriority.gaming = 0.95;
    } else if (preferenceProfile === "health") {
      parsed.featuresPriority.healthNutrition = 0.95;
    } else if (preferenceProfile === "budget") {
      parsed.featuresPriority.valueWeight = 0.95;
    } else if (preferenceProfile === "brand_loyal") {
      parsed.featuresPriority.valueWeight = 0.2; // Doesn't care much, focused on brand score
    }
  }

  // Category normalization matching
  let targetCategory = parsed.category !== "all" ? parsed.category : category || "all";
  if (targetCategory === "mobiles") targetCategory = "mobile";
  if (targetCategory === "laptops") targetCategory = "laptop";
  if (targetCategory === "headphones" || targetCategory === "earbuds") targetCategory = "headphones";
  if (targetCategory === "cosmetics" || targetCategory === "skincare") targetCategory = "cosmetics";

  // 2. Filter dataset including mild overhead boundary limits
  let list = PRODUCTS_DATASET;
  if (targetCategory !== "all") {
    list = list.filter(p => p.category.toLowerCase() === targetCategory.toLowerCase());
  }

  // 3. Score everyone using vector matching rules
  const scored = list.map(p => {
    const buyScore = calculateSmartBuyScore(p, limitBudget, parsed.featuresPriority);
    const sentScore = analyzeSentiment(p.reviews);
    const dropPredict = predictPriceDrop(p);
    
    return {
      product: {
        id: p.id,
        name: p.name,
        category: p.category,
        brand: p.brand,
        price: p.price,
        rating: p.rating,
        specifications: p.specs,
        pros: p.category === "mobile" 
          ? ["Aggressive price-to-CPU performance ratio", "Highly rated thermal cooling mechanics", "Stretched wide-gamut screen"]
          : p.category === "food"
          ? ["Extremely high protein density ratios", "Dermatologist organic raw clean ingredients", "Zero empty carbohydrate spikes"]
          : p.category === "cosmetics"
          ? ["100% matte surface, eliminates sweat sheen", "Medical-approved active salicylic compositions", "Felt water-light, fast absorbency"]
          : ["Premium physical chassis elements", "Spectacular acoustic driver ranges", "Outstanding student budget compatibility"],
        cons: p.category === "mobile"
          ? ["Slightly loaded system custom launcher UI", "Adapter heads are sold separately"]
          : p.category === "food"
          ? ["Plain base taste profiles, requires pairing", "Packagin seal requires heavy pressure to lock"]
          : ["Needs gentle preservation handling"]
      },
      smartBuyScore: buyScore,
      sentiment: {
        score: sentScore,
        label: sentScore >= 85 ? "Extremely Loved" : sentScore >= 72 ? "Mostly Commended" : "Slightly Divided reviews"
      },
      predictedPriceDrop: dropPredict,
      explanation: generateSmartExplanation(p, parsed.featuresPriority, limitBudget)
    };
  });

  // Sort matched options by dynamic smart buy scores desc
  const sorted = scored.sort((a, b) => b.smartBuyScore - a.smartBuyScore);

  // Generate actionable financial insights and alert signals
  const insights: string[] = [];
  let alternative: any = null;

  if (sorted.length > 0) {
    const bestMatch = sorted[0];
    
    // Budgets warnings
    if (bestMatch.product.price > limitBudget) {
      insights.push(`🚨 Overspending Warning: The top matching model "${bestMatch.product.name}" (₹${bestMatch.product.price.toLocaleString()}) list price exceeds your locking budget parameters by ₹${(bestMatch.product.price - limitBudget).toLocaleString()}! Consider checking alternatives.`);
    }

    // Health analysis insights for food category
    if (targetCategory === "food") {
      insights.push(`🌱 Health Insights: High-protein profiles are extracted. Amul & MuscleBlaze provide cleaner organic substitutions, bypassing severe glucose crashes.`);
    }

    // Alternative pricing value search
    const cheaperOption = sorted.find(item => item.product.price < bestMatch.product.price && item.smartBuyScore >= 78);
    if (cheaperOption) {
      const budgetSavings = bestMatch.product.price - cheaperOption.product.price;
      if (budgetSavings >= 50) {
        insights.push(`💡 Budget Optimization: You can save ₹${budgetSavings.toLocaleString()} by choosing the "${cheaperOption.product.name}" as an alternative, still promising a robust Smart Buy Score of ${cheaperOption.smartBuyScore}/100.`);
        alternative = cheaperOption;
      }
    }
  }

  return {
    recommendations: sorted,
    insights,
    alternative
  };
}

// --- Standalone Settlement minimizing engine ---
export function optimizeSettlements(balances: Record<string, number>): { from: string; to: string; amount: number }[] {
  const givers: { name: string; amt: number }[] = [];
  const receivers: { name: string; amt: number }[] = [];

  Object.entries(balances).forEach(([name, bal]) => {
    const rounded = parseFloat(bal.toFixed(2));
    if (rounded < 0) {
      givers.push({ name, amt: Math.abs(rounded) });
    } else if (rounded > 0) {
      receivers.push({ name, amt: rounded });
    }
  });

  const settlements: { from: string; to: string; amount: number }[] = [];
  let i = 0;
  let j = 0;

  while (i < givers.length && j < receivers.length) {
    const giver = givers[i];
    const receiver = receivers[j];

    const minAmount = Math.min(giver.amt, receiver.amt);
    if (minAmount > 0.05) {
      settlements.push({
        from: giver.name,
        to: receiver.name,
        amount: parseFloat(minAmount.toFixed(2))
      });
    }

    giver.amt -= minAmount;
    receiver.amt -= minAmount;

    if (giver.amt <= 0.05) i++;
    if (receiver.amt <= 0.05) j++;
  }

  return settlements;
}
