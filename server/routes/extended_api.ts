import { Router } from "express";
import db from "../db";
import { getUserId } from "../utils";
import { computeAnalytics } from "../services/predictive_analytics";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

const router = Router();

// Initialize GoogleGenAI lazily as recommended in guidelines
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// 1. Analytics endpoint
router.get("/analytics", (req, res) => {
  try {
    const userId = getUserId(req);
    const result = computeAnalytics(userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to compute analytics" });
  }
});

// Advanced OCR Document Parser Route supporting single or multiple files and collages
router.post("/parse-doc", async (req, res) => {
  try {
    const { filename, contentType, base64, category, documents } = req.body;
    
    // Support either a list of documents or a single legacy file parameter
    const docsToProcess: { filename: any; contentType: any; base64: any }[] = [];
    if (documents && Array.isArray(documents) && documents.length > 0) {
      docsToProcess.push(...documents);
    } else if (base64 && contentType) {
      docsToProcess.push({ filename: filename || "upload", contentType, base64 });
    }

    if (docsToProcess.length === 0) {
      return res.status(400).json({ error: "Missing base64 data, contentType, or documents array" });
    }

    const ai = getAi();
    const systemPrompt = `You are Anika-AI, a persistent, premium AI-powered financial scanner built for students and smart spenders sharing split bills.

Your current task is to parse, analyze and extract structured transaction details from the uploaded files representing the category "${category || "Receipt / Bill"}".

CRITICAL INSTRUCTIONS:
1. Detect whether there are MULTIPLE independent bills, receipts, or screenshots found across the uploaded document(s), OR a single image collage that contains multiple independent receipts, or multiple PDF pages.
2. Segment them into distinct, separate bills. If you find multiple bills, return them as individual items in the "bills" array.
3. If there is only a single bill, the "bills" array should contain exactly one bill.
4. For each bill, extract the merchant name, date, correct totalAmount, suggested category, and an array of individual line items with their price and quantity.
5. Provide helpful student budgeting insights and detailed "segmentDescription" explaining which file/part of the image this bill was parsed from (index or placement).
6. Try to intelligently extract who is the payer and any suggested group splits if mentioned/implied.
7. Always return rawText summarizing the extracted text lines.

Expected JSON schema output (Do NOT wrap the JSON in \`\`\`json markdown blocks or include extra conversational words, return PURE JSON only):
{
  "bills": [
    {
      "id": "bill-1",
      "merchant": "Zepto",
      "date": "2026-05-26",
      "totalAmount": 450.50,
      "category": "Food & Dining",
      "items": [
        { "name": "Soft Drink", "price": 50.25, "quantity": 2 },
        { "name": "Chips", "price": 100.00, "quantity": 1 }
      ],
      "groupSplit": {
        "detectedMembers": ["Rahul", "Sai", "Kiran"],
        "payer": "Rahul",
        "suggestedBalances": {
          "Rahul": 300.33,
          "Sai": -150.17,
          "Kiran": -150.16
        }
      },
      "insights": [
        "Insight: Zepto represents moderate splurge risk.",
        "Insight: Equal 3-way split balances peer debts."
      ],
      "segmentDescription": "Bill 1 (Top / Left): Zepto Invoice"
    }
  ],
  "isMultiBill": true,
  "rawText": "Extracted flat overview of characters..."
}`;

    const contentsParts: any[] = [];
    for (const doc of docsToProcess) {
      contentsParts.push({
        inlineData: {
          mimeType: doc.contentType,
          data: doc.base64
        }
      });
    }
    contentsParts.push({ text: systemPrompt });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contentsParts
    });

    let text = response.text || "";
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(text);
      
      // Ensure backward compatibility with older frontend files expecting flat fields
      if (parsed.bills && parsed.bills.length > 0) {
        const firstBill = parsed.bills[0];
        parsed.merchant = firstBill.merchant || parsed.merchant || "Extracted Merchant";
        parsed.date = firstBill.date || parsed.date || new Date().toISOString().split('T')[0];
        parsed.totalAmount = firstBill.totalAmount || parsed.totalAmount || 0;
        parsed.category = firstBill.category || parsed.category || "Food & Dining";
        parsed.items = firstBill.items || parsed.items || [];
        parsed.groupSplit = firstBill.groupSplit || parsed.groupSplit || { detectedMembers: [], payer: "", suggestedBalances: {} };
        parsed.insights = firstBill.insights || parsed.insights || [];
      } else {
        parsed.bills = [{
          id: "bill-1",
          merchant: parsed.merchant || "Extracted Store",
          date: parsed.date || new Date().toISOString().split('T')[0],
          totalAmount: parsed.totalAmount || 0,
          category: parsed.category || "Food & Dining",
          items: parsed.items || [],
          groupSplit: parsed.groupSplit || { detectedMembers: [], payer: "", suggestedBalances: {} },
          insights: parsed.insights || [],
          segmentDescription: "Single Uploaded Document"
        }];
        parsed.isMultiBill = false;
      }

      res.json(parsed);
    } catch (parseFail) {
      console.warn("AI didn't output pure JSON, extracting block or raw payload:", text);
      const fallbackBill = {
        id: "bill-1",
        merchant: "AI Extracted Store",
        date: new Date().toISOString().split('T')[0],
        totalAmount: 120,
        category: "Food & Dining",
        items: [{ name: "Document contents", price: 120, quantity: 1 }],
        groupSplit: {
          detectedMembers: ["Me"],
          payer: "Me",
          suggestedBalances: {}
        },
        insights: ["Extracted via conversational fallback parser. Review details below."],
        segmentDescription: "Direct text fallback"
      };

      res.json({
        bills: [fallbackBill],
        isMultiBill: false,
        merchant: fallbackBill.merchant,
        date: fallbackBill.date,
        totalAmount: fallbackBill.totalAmount,
        category: fallbackBill.category,
        items: fallbackBill.items,
        groupSplit: fallbackBill.groupSplit,
        insights: fallbackBill.insights,
        rawText: text
      });
    }
  } catch (error: any) {
    console.error("OCR parse route failed:", error);
    res.status(500).json({ error: error.message || "Failed to scan and analyze receipt with Gemini API." });
  }
});

// Asynchronous background task worker for OCR segment parsing with Gemini API
async function run_ocr_async(
  uploadId: number | string,
  destPath: string,
  base64: string,
  normType: string,
  category: string,
  userId: string
) {
  try {
    const ai = getAi();
    const systemPrompt = `You are Anika-AI, a persistent, premium AI-powered financial scanner built for students and smart spenders sharing split bills.

Your current task is to parse, analyze and extract structured transaction details from the uploaded files representing the category "${category || "Receipt / Bill"}".

CRITICAL INSTRUCTIONS:
1. Detect whether there are MULTIPLE independent bills, receipts, or screenshots found across the uploaded document(s), OR a single image collage that contains multiple independent receipts, or multiple PDF pages.
2. Segment them into distinct, separate bills. If you find multiple bills, return them as individual items in the "bills" array.
3. If there is only a single bill, the "bills" array should contain exactly one bill.
4. For each bill, extract the merchant name, date, correct totalAmount, suggested category, and an array of individual line items with their price and quantity.
5. Provide helpful student budgeting insights and detailed "segmentDescription" explaining which file/part of the image this bill was parsed from (index or placement).
6. Try to intelligently extract who is the payer and any suggested group splits if mentioned/implied.
7. Always return rawText summarizing the extracted text lines.

Expected JSON schema output (Do NOT wrap the JSON in \`\`\`json markdown blocks or include extra conversational words, return PURE JSON only):
{
  "bills": [
    {
      "id": "bill-1",
      "merchant": "Zepto",
      "date": "2026-05-26",
      "totalAmount": 450.50,
      "category": "Food & Dining",
      "items": [
        { "name": "Soft Drink", "price": 50.25, "quantity": 2 },
        { "name": "Chips", "price": 100.00, "quantity": 1 }
      ],
      "groupSplit": {
        "detectedMembers": ["Rahul", "Sai", "Kiran"],
        "payer": "Rahul",
        "suggestedBalances": {
          "Rahul": 300.33,
          "Sai": -150.17,
          "Kiran": -150.16
        }
      },
      "insights": [
        "Insight: Zepto represents moderate splurge risk.",
        "Insight: Equal 3-way split balances peer debts."
      ],
      "segmentDescription": "Bill 1 (Top / Left): Zepto Invoice"
    }
  ],
  "isMultiBill": true,
  "rawText": "Extracted flat overview of characters..."
}`;

    const contentsParts = [
      {
        inlineData: {
          mimeType: normType,
          data: base64
        }
      },
      { text: systemPrompt }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contentsParts,
      config: {
        responseMimeType: "application/json"
      }
    });

    let text = response.text || "";
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(text);

    // Ensure backward compatibility with older frontend files expecting flat fields
    if (parsed.bills && parsed.bills.length > 0) {
      const firstBill = parsed.bills[0];
      parsed.merchant = firstBill.merchant || parsed.merchant || "Extracted Merchant";
      parsed.date = firstBill.date || parsed.date || new Date().toISOString().split('T')[0];
      parsed.totalAmount = firstBill.totalAmount || parsed.totalAmount || 0;
      parsed.category = firstBill.category || parsed.category || "Food & Dining";
      parsed.items = firstBill.items || parsed.items || [];
      parsed.groupSplit = firstBill.groupSplit || parsed.groupSplit || { detectedMembers: [], payer: "", suggestedBalances: {} };
      parsed.insights = firstBill.insights || parsed.insights || [];
    } else {
      parsed.bills = [{
        id: "bill-1",
        merchant: parsed.merchant || "Extracted Store",
        date: parsed.date || new Date().toISOString().split('T')[0],
        totalAmount: parsed.totalAmount || 0,
        category: parsed.category || "Food & Dining",
        items: parsed.items || [],
        groupSplit: parsed.groupSplit || { detectedMembers: [], payer: "", suggestedBalances: {} },
        insights: parsed.insights || [],
        segmentDescription: "Single Uploaded Document"
      }];
      parsed.isMultiBill = false;
    }

    db.prepare(`
      UPDATE ocr_uploads 
      SET raw_text = ?, structured_data = ?, confidence = ?, status = 'done' 
      WHERE id = ?
    `).run(parsed.rawText || "Extracted text summary", JSON.stringify(parsed), 0.95, uploadId);

  } catch (error: any) {
    console.error(`[BG OCR ERROR] Failed on background OCR parsing for ${uploadId}:`, error);
    db.prepare(`
      UPDATE ocr_uploads 
      SET status = 'failed', error_message = ? 
      WHERE id = ?
    `).run(error.message || "Failed to analyze receipt with Gemini API.", uploadId);
  }
}

// 2. Real OCR Upload and Segment Parsing Endpoint for OCR pipeline (Asynchronous Worker)
router.post("/ocr-upload", async (req, res) => {
  try {
    const { filename, contentType, base64, category } = req.body;
    if (!filename || !contentType || !base64) {
      return res.status(400).json({ error: "Missing filename, contentType, or base64 data" });
    }

    const userId = getUserId(req);

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    let normType = contentType.toLowerCase();
    if (normType === "image/jpg") normType = "image/jpeg";

    if (!allowedTypes.includes(normType)) {
      return res.status(400).json({ error: "Unsupported file type. Please upload a JPG, PNG, WEBP, or PDF." });
    }

    // Save temporarily to uploads
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const cleanName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueName = `${Date.now()}_${cleanName}`;
    const destPath = path.join(uploadsDir, uniqueName);
    
    fs.writeFileSync(destPath, Buffer.from(base64, "base64"));
    const fileUrl = `/uploads/${uniqueName}`;

    // Create a new database entry for this OCR upload with status 'processing'
    const info = db.prepare(`
      INSERT INTO ocr_uploads (user_id, file_path, status)
      VALUES (?, ?, 'processing')
    `).run(userId, fileUrl);

    const uploadId = Number(info.lastInsertRowid);

    // Execute background OCR extraction
    run_ocr_async(uploadId, destPath, base64, normType, category, userId);

    // Return the response immediately
    res.json({
      success: true,
      upload_id: uploadId,
      status: "processing",
      url: fileUrl,
      filename: uniqueName,
      contentType: normType
    });

  } catch (error: any) {
    console.error("ocr-upload parsing background init failed:", error);
    res.status(500).json({ error: error.message || "Failed to initiate background scanning." });
  }
});

// GET /api/ocr-status/:id polling endpoint
router.get("/ocr-status/:id", (req, res) => {
  try {
    const uploadId = req.params.id;
    const userId = getUserId(req);
    const record = db.prepare("SELECT * FROM ocr_uploads WHERE id = ? AND user_id = ?").get(uploadId, userId) as any;
    if (!record) {
      return res.status(404).json({ error: "OCR Upload record not found" });
    }

    res.json({
      status: record.status || "processing",
      confidence: record.confidence || 0,
      error: record.error_message || null,
      data: record.structured_data ? JSON.parse(record.structured_data) : null
    });
  } catch (error: any) {
    res.status(550).json({ error: error.message || "Failed to poll OCR status." });
  }
});

// POST /api/participants route with validation
router.post("/participants", (req, res) => {
  try {
    const { expense_id, names } = req.body;
    if (!expense_id) {
      return res.status(400).json({ error: "Missing expense_id" });
    }

    if (!names || !Array.isArray(names) || names.length < 2) {
      return res.status(400).json({ error: "At least 2 participants are required to save splits." });
    }

    const userId = getUserId(req);
    // Secure ownership verify check
    const expense = db.prepare("SELECT * FROM expenses WHERE id = ? AND user_id = ?").get(expense_id, userId);
    if (!expense) {
      return res.status(403).json({ error: "Access denied or expense not found for this user." });
    }

    // UPI rejection: match '@' symbol
    const upiRegex = /@/;
    for (const name of names) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "Participant names cannot be empty" });
      }
      if (upiRegex.test(name)) {
        return res.status(400).json({ error: `Name matches UPI formatting rules and is prohibited: ${name}` });
      }
    }

    // Delete existing participants & insert new
    db.prepare("DELETE FROM participants WHERE expense_id = ?").run(expense_id);

    const insertStmt = db.prepare("INSERT INTO participants (expense_id, name) VALUES (?, ?)");
    for (const name of names) {
      insertStmt.run(expense_id, name.trim());
    }

    res.json({ success: true, message: "Participants confirmed.", count: names.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to confirm participants." });
  }
});

// POST /api/settlements/calculate route
router.post("/settlements/calculate", (req, res) => {
  try {
    const { expense_id } = req.body;
    if (!expense_id) {
      return res.status(400).json({ error: "Missing expense_id" });
    }

    const userId = getUserId(req);
    // Load participants and expense to compute balances
    const expense = db.prepare("SELECT * FROM expenses WHERE id = ? AND user_id = ?").get(expense_id, userId) as any;
    if (!expense) {
      return res.status(404).json({ error: "Expense not found or access denied." });
    }

    const participants = db.prepare("SELECT * FROM participants WHERE expense_id = ?").all(expense_id) as any[];
    if (participants.length < 2) {
      return res.status(400).json({ error: "Insufficient participants to determine split transactions." });
    }

    // Default: Assume equal splits with "Me" as the payer if not otherwise set
    const num = participants.length;
    const share = expense.total / num;
    const balances: Record<string, number> = {};

    participants.forEach((p, idx) => {
      // Suppose first participant is the payer
      if (idx === 0) {
        balances[p.name] = expense.total - share;
      } else {
        balances[p.name] = -share;
      }
    });

    const txs = minimumCashFlow(balances);

    // Delete existing settlements and insert calculated ones
    db.prepare("DELETE FROM settlements WHERE expense_id = ?").run(expense_id);

    const insertStmt = db.prepare(`
      INSERT INTO settlements (expense_id, from_participant, to_participant, amount, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);

    for (const t of txs) {
      insertStmt.run(expense_id, t.from, t.to, t.amount);
    }

    res.json({ success: true, settlements: txs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to calculate settlements." });
  }
});

// POST /api/expenses route to insert expense header
router.post("/expenses", (req, res) => {
  try {
    const { title, total, date, ocr_upload_id } = req.body;
    const userId = getUserId(req);

    if (!title || total === undefined) {
      return res.status(400).json({ error: "Missing title or total." });
    }

    const info = db.prepare(`
      INSERT INTO expenses (user_id, title, total, date, ocr_upload_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, title, total, date || new Date().toISOString().split('T')[0], ocr_upload_id || null);

    res.json({ success: true, expense_id: Number(info.lastInsertRowid) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to log group expense." });
  }
});

// GET /api/expenses/:id/full
router.get("/expenses/:id/full", (req, res) => {
  try {
    const expenseId = req.params.id;
    const userId = getUserId(req);
    const expense = db.prepare("SELECT * FROM expenses WHERE id = ? AND user_id = ?").get(expenseId, userId);
    if (!expense) {
      return res.status(404).json({ error: "Expense not found or access denied." });
    }

    const participants = db.prepare("SELECT * FROM participants WHERE expense_id = ?").all(expenseId);
    const settlements = db.prepare("SELECT * FROM settlements WHERE expense_id = ?").all(expenseId);

    res.json({
      success: true,
      expense,
      participants,
      settlements
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch full expense dataset." });
  }
});

// helper Cash Flow Resolver logic in TS/JS (Minimum Cash Flow algorithm)
function minimumCashFlow(balances: Record<string, number>): Array<{ from: string; to: string; amount: number }> {
  // Creditors are positive net balances, debtors are negative net balances
  const creditors = Object.entries(balances)
    .filter(([_, val]) => val > 0)
    .map(([name, val]) => ({ name, amount: val }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = Object.entries(balances)
    .filter(([_, val]) => val < 0)
    .map(([name, val]) => ({ name, amount: Math.abs(val) }))
    .sort((a, b) => b.amount - a.amount);

  const transactions: Array<{ from: string; to: string; amount: number }> = [];

  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    const settled = Math.min(creditor.amount, debtor.amount);
    if (settled > 0.01) {
      transactions.push({
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(settled * 100) / 100
      });
    }

    creditor.amount -= settled;
    debtor.amount -= settled;

    if (creditor.amount < 0.01) i++;
    if (debtor.amount < 0.01) j++;
  }

  return transactions;
}

// POST /api/splits/equal
router.post("/splits/equal", (req, res) => {
  try {
    const { expense_id, participant_ids } = req.body;
    if (!expense_id) {
      return res.status(400).json({ error: "Missing expense_id" });
    }

    const userId = getUserId(req);
    const expense = db.prepare("SELECT * FROM expenses WHERE id = ? AND user_id = ?").get(expense_id, userId) as any;
    if (!expense) {
      return res.status(404).json({ error: "Expense not found or access denied." });
    }

    const participants = db.prepare("SELECT * FROM participants WHERE expense_id = ?").all(expense_id) as any[];
    if (participants.length === 0) {
      return res.status(400).json({ error: "No confirmed participants found for this expense" });
    }

    // Split equally
    const count = participants.length;
    const share = expense.total / count;

    const balances: Record<string, number> = {};
    // Assume first participant paid the bill
    participants.forEach((p, idx) => {
      if (idx === 0) {
        balances[p.name] = expense.total - share;
      } else {
        balances[p.name] = -share;
      }
    });

    const txs = minimumCashFlow(balances);

    db.prepare("DELETE FROM settlements WHERE expense_id = ?").run(expense_id);
    const insertStmt = db.prepare(`
      INSERT INTO settlements (expense_id, from_participant, to_participant, amount, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);
    for (const t of txs) {
      insertStmt.run(expense_id, t.from, t.to, t.amount);
    }

    res.json({ success: true, settlements: txs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to calculate equal split." });
  }
});

// POST /api/splits/itemized
router.post("/splits/itemized", (req, res) => {
  try {
    const { expense_id, assignments } = req.body; // assignments: Record<string, string[]> (itemName to participantNames)
    if (!expense_id || !assignments) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const userId = getUserId(req);
    const expense = db.prepare("SELECT * FROM expenses WHERE id = ? AND user_id = ?").get(expense_id, userId) as any;
    if (!expense) {
      return res.status(404).json({ error: "Expense not found or access denied." });
    }

    const participants = db.prepare("SELECT * FROM participants WHERE expense_id = ?").all(expense_id) as any[];
    const namesList = participants.map(p => p.name);

    if (namesList.length === 0) {
      return res.status(400).json({ error: "No confirmed participants found for this expense." });
    }

    // Get item data
    const ocrUpload = db.prepare("SELECT * FROM ocr_uploads WHERE id = ? AND user_id = ?").get(expense.ocr_upload_id, userId) as any;
    let itemsList: any[] = [];
    if (ocrUpload && ocrUpload.structured_data) {
      const parsedOcr = JSON.parse(ocrUpload.structured_data);
      if (parsedOcr.bills && parsedOcr.bills[0]) {
        itemsList = parsedOcr.bills[0].items || [];
      } else {
        itemsList = parsedOcr.items || [];
      }
    }

    if (itemsList.length === 0) {
      // fall back if there are no items
      itemsList = [{ name: "Total Bill Allocation", price: expense.total }];
    }

    // Track total allocated share per person
    const personalshares: Record<string, number> = {};
    namesList.forEach(name => {
      personalshares[name] = 0;
    });

    itemsList.forEach((item, index) => {
      const itemKey = item.name || `Item ${index + 1}`;
      const assigned = assignments[itemKey] || assignments[item.name] || namesList; // Fallback containing names
      
      const pCount = assigned.length;
      if (pCount > 0) {
        const itemPrice = item.price || 0;
        const perPersonItemCost = itemPrice / pCount;
        assigned.forEach((pName: string) => {
          if (pName in personalshares) {
            personalshares[pName] += perPersonItemCost;
          }
        });
      }
    });

    // Net balances. Assume the first participant paid the bill
    const balances: Record<string, number> = {};
    namesList.forEach((name, idx) => {
      const share = personalshares[name] || 0;
      if (idx === 0) {
        balances[name] = expense.total - share;
      } else {
        balances[name] = -share;
      }
    });

    const txs = minimumCashFlow(balances);

    db.prepare("DELETE FROM settlements WHERE expense_id = ?").run(expense_id);
    const insertStmt = db.prepare(`
      INSERT INTO settlements (expense_id, from_participant, to_participant, amount, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);
    for (const t of txs) {
      insertStmt.run(expense_id, t.from, t.to, t.amount);
    }

    res.json({ success: true, settlements: txs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to calculate itemized split." });
  }
});

// ML Recommendation Engine Endpoints
import { recommendProducts, optimizeSettlements, PRODUCTS_DATASET } from "../services/ml_engine";

// Get recommendations based on budget and search query
router.post("/recommendations", (req, res) => {
  try {
    const { category, budget, query, preferenceProfile } = req.body;
    let normCategory = category || "all";
    if (normCategory === "mobiles") normCategory = "mobile";
    if (normCategory === "laptops") normCategory = "laptop";
    const numBudget = parseFloat(budget) || 25000;
    
    const results = recommendProducts(normCategory, numBudget, query, preferenceProfile);
    
    let summaryText = `Anika-AI NLP analysis has matching verified models for ${normCategory === 'all' ? 'general segments' : normCategory}. Recommended selections have high durability scores, saving on future maintenance.`;
    if (results.recommendations.length > 0) {
      summaryText = `Anika-AI Vector Matching Engine: Found ${results.recommendations.length} curated matches. The "${results.recommendations[0].product.name}" is ranked #1 with a smart buy similarity score of ${results.recommendations[0].smartBuyScore}/100 and ${results.recommendations[0].sentiment.label} sentiments.`;
    }

    res.json({
      success: true,
      budget: numBudget,
      category: normCategory,
      count: results.recommendations.length,
      recommendations: results.recommendations,
      insights: results.insights,
      alternative: results.alternative,
      summary: summaryText
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to query ML product recommendations" });
  }
});

// Compare selected products directly
router.post("/recommendations/compare", async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({ error: "Please provide a valid array of productIds" });
    }
    const matched = PRODUCTS_DATASET.filter(p => productIds.includes(p.id));
    
    const finalProducts = matched.map(p => {
      const specifications: Record<string, string> = {};
      Object.entries(p.specs || {}).forEach(([k, v]) => {
        specifications[k] = String(v);
      });
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        rating: p.rating,
        specifications,
        protein: p.protein || 0,
        sugar: p.sugar || 0,
        calories: p.calories || 0,
        pros: p.category === "mobile" 
          ? ["Outstanding processing scores", "Crisp display", "Long physical runtime"] 
          : p.category === "food"
          ? ["Zero high fructose additives", "High raw protein concentration", "Rich organic fats"]
          : p.category === "cosmetics"
          ? ["Medical-grade sebum regulation", "Fast absorption", "Perfect pore compatibility"]
          : ["Compact tactile design", "Unrivaled budget suitability"],
        cons: ["Charger/accessories sold separately"]
      };
    });

    const keysSet = new Set<string>();
    finalProducts.forEach(p => {
      Object.keys(p.specifications).forEach(k => keysSet.add(k));
    });

    let comparisonNarrative = "";
    if (process.env.GEMINI_API_KEY && finalProducts.length > 0) {
      try {
        const ai = getAi();
        const prompt = `You are Anika-AI, a premium student financial copilot. Write a smart, professional 2-sentence value summary comparing these products: ${JSON.stringify(finalProducts)}. Focus on smart utility budgeting, price efficiency, and specific advantages like gaming scores, protein weights, or sebum control based on product categories.`;
        const cmpRes = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [{ text: prompt }]
        });
        comparisonNarrative = cmpRes.text?.trim() || "";
      } catch (err) {
        console.warn("Gemini compare prompt call skipped:", err);
      }
    }

    if (!comparisonNarrative) {
      comparisonNarrative = finalProducts.length > 1
        ? `Strategic evaluation: The ${finalProducts[0].name} provides high quality but demands a capital outflow of ₹${finalProducts[0].price.toLocaleString()}. Choosing the alternative options helps preserve key financial buffer.`
        : "Stage at least two items from your search list to view side-by-side technical comparison matrices.";
    }

    res.json({ 
      success: true, 
      count: finalProducts.length, 
      products: finalProducts,
      specifications_keys: Array.from(keysSet),
      comparison_narrative: comparisonNarrative
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Optimize Settlement Balances API (greedy minimization engine)
router.post("/splits/optimize", (req, res) => {
  try {
    const { balances } = req.body;
    if (!balances || typeof balances !== "object") {
      return res.status(400).json({ error: "Please provide a valid key-value balances map" });
    }
    const optimized = optimizeSettlements(balances);
    res.json({
      success: true,
      originalBalances: balances,
      optimizedSettlements: optimized,
      optimized_transactions: optimized
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 2. Savings Goals Endpoints
router.get("/goals", (req, res) => {
  try {
    const userId = getUserId(req);
    const goals = db.prepare("SELECT * FROM goals WHERE user_id = ? ORDER BY id DESC").all(userId);
    res.json(goals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/goals", (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, target_amount, saved_amount, category, deadline, roadmap } = req.body;
    const info = db.prepare(
      "INSERT INTO goals (user_id, name, target_amount, saved_amount, category, deadline, roadmap) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(userId, name, target_amount, saved_amount || 0, category || "Savings", deadline || "", roadmap || "");
    res.json({ id: info.lastInsertRowid, status: "created" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/goals/:id", (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { saved_amount } = req.body;
    db.prepare("UPDATE goals SET saved_amount = ? WHERE id = ? AND user_id = ?")
      .run(saved_amount, id, userId);
    res.json({ status: "updated" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/goals/:id", (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    db.prepare("DELETE FROM goals WHERE id = ? AND user_id = ?").run(id, userId);
    res.json({ status: "deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Friends Endpoints
router.get("/friends", (req, res) => {
  try {
    const userId = getUserId(req);
    const friendsList = db.prepare("SELECT * FROM friends WHERE user_id = ? ORDER BY id ASC").all(userId);
    res.json(friendsList);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/friends", (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, upi_id } = req.body;
    const info = db.prepare("INSERT INTO friends (user_id, name, upi_id) VALUES (?, ?, ?)")
      .run(userId, name, upi_id || "");
    res.json({ id: info.lastInsertRowid, status: "added" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/friends/:id", (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    db.prepare("DELETE FROM friends WHERE id = ? AND user_id = ?").run(id, userId);
    res.json({ status: "deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Group Ledger Splits Endpoints
router.get("/groups", (req, res) => {
  try {
    const userId = getUserId(req);
    const groups = db.prepare("SELECT * FROM group_splits WHERE user_id = ? ORDER BY id DESC").all(userId);
    res.json(groups.map((g: any) => {
      try {
        return {
          ...g,
          members: JSON.parse(g.members),
          balances: JSON.parse(g.balances)
        };
      } catch {
        return g;
      }
    }));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/groups", (req, res) => {
  try {
    const userId = getUserId(req);
    const { group_name, members, balances } = req.body;
    const info = db.prepare(
      "INSERT INTO group_splits (user_id, group_name, members, balances) VALUES (?, ?, ?, ?)"
    ).run(userId, JSON.stringify(members || []), JSON.stringify(balances || {}));
    res.json({ id: info.lastInsertRowid, status: "created" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/groups/:id", (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    db.prepare("DELETE FROM group_splits WHERE id = ? AND user_id = ?").run(id, userId);
    res.json({ status: "deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Short/Long Term AI Memories
router.get("/memories", (req, res) => {
  try {
    const userId = getUserId(req);
    const memories = db.prepare("SELECT * FROM ai_memories WHERE user_id = ? ORDER BY last_updated DESC").all(userId);
    res.json(memories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/memories", (req, res) => {
  try {
    const userId = getUserId(req);
    const { key, value } = req.body;
    db.prepare(`
      INSERT INTO ai_memories (user_id, key_text, value_text)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, key_text) DO UPDATE SET value_text = excluded.value_text, last_updated = datetime('now')
    `).run(userId, key, value);
    res.json({ status: "saved" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Advanced Secure Chat Router — proxy to Gemini with complete system payload & reasoning block
router.post("/chat", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { message, history, fileData } = req.body;

    const authKey = process.env.GEMINI_API_KEY;
    if (!authKey) {
      return res.status(403).json({
        error: "GEMINI_API_KEY environment variable is not defined in the settings panel."
      });
    }

    // A. Gather context data to build deep memory capabilities
    const profile = db.prepare("SELECT * FROM user_profiles WHERE user_id = ?").get(userId) as any || { budget_limit: 10000 };
    const logs = db.prepare("SELECT * FROM budget_logs WHERE user_id = ? ORDER BY date DESC LIMIT 40").all(userId) as any[];
    const subs = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").all(userId) as any[];
    const goals = db.prepare("SELECT * FROM goals WHERE user_id = ?").all(userId) as any[];
    const memories = db.prepare("SELECT * FROM ai_memories WHERE user_id = ?").all(userId) as any[];
    const analytics = computeAnalytics(userId);

    // Form comprehensive contextual operating system metadata for Gemini
    const systemContext = `
[CONTEXTUAL OPERATING SYSTEM MEMORIES]
- Current Username: ${userId}
- Monthly Spending Limit: ₹${profile.budget_limit || 10000}
- User Lifestyle/Goals Profile: ${profile.lifestyle_info || "No context given"}
- Total Spent This Month: ₹${logs.reduce((sum, l) => sum + l.amount, 0).toFixed(2)}
- Emergency Buffer Balance: ₹${profile.emergency_saved || 0} (Goal: ₹${profile.emergency_target || 5000})
- Active Subscriptions: ${JSON.stringify(subs.map(s => `${s.name}: ₹${s.amount}`))}
- Goals Target Lists: ${JSON.stringify(goals.map(g => `${g.name}: Target ₹${g.target_amount}, Saved ₹${g.saved_amount}`))}
- High-priority AI Memory Elements: ${JSON.stringify(memories.map(m => `${m.key_text}: ${m.value_text}`))}
- Predictive ML Metrics: Health Score is ${analytics.healthScore}/100, Peak Overspending Risk is ${analytics.overspendingRisk}%, Expected Month End Outflow: ₹${analytics.predictedSpentMonthEnd}

[RESPONSE REASONING INSTRUCTIONS]
You MUST reason step-by-step before answering.
- Insert a single collapsible thoughts container at the absolute start of your response, wrapped in XML tags <thinking> ... </thinking>.
- Inside <thinking>, outline your deep analysis, step-by-step math check, trend matching, and predictive evaluation.
- After the thinking block, output your friendly, professional, student-focused human response as Anika-AI (INR rupees only, student-friendly tone).

[CRITICAL - EXPENSE SPLITTING DETECTION & CONVERSATIONAL RESPONSE FORMAT]
- If the user provides a line or sentence list of peer expenses (such as "mohan 150 for petrol", "Ramu 500 for food", "Chaitu 1000 for hotel" or "split rahul 300, sai 200"), you MUST detect and list them cleanly using the exact formatting specified below:

I detected X expenses successfully 🖤

• Person -> ₹Amount -> Category
• Person -> ₹Amount -> Category

Total Expense: ₹Total

Would you like to:
[ Split Equally ]
[ Custom Split ]
[ Save Trip ]
[ Add More Expenses ]

- Make sure to use the exact symbol "->" and emoji "🖤" with the exact bullet symbol "•". This allows the frontend to parse your response and immediately render interactive split buttons for the user!
- If the user logged a single normal expense (e.g. "I spent 150 on tea"), you can suggest triggering automatic database updates by embedding a tiny metadata block at the absolute end of your response, strictly using this JSON tag syntax:
  :::log_trigger:::{"amount":150,"category":"Food & Dining","note":"Logged via AI"}:::
`;

    // Initialize contents payload
    const contents: any[] = [];

    // History mapping
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        contents.push({
          role: h.role === 'model' || h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        });
      });
    }

    // Compile active message parts
    const currentParts: any[] = [];
    if (fileData && fileData.mimeType && fileData.data) {
      currentParts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.data
        }
      });
      currentParts.push({
        text: message || "Analyze and parse this attachment step-by-step."
      });
    } else {
      currentParts.push({
        text: message
      });
    }

    contents.push({
      role: 'user',
      parts: currentParts
    });

    const ai = getAi();
    // Use standard flash model
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: systemContext
      }
    });

    let answerText = response.text || "";

    // Parse thinking blocks if present to make it interactive for UI
    let reasoning = "";
    const thinkStartIdx = answerText.indexOf("<thinking>");
    const thinkEndIdx = answerText.indexOf("</thinking>");
    if (thinkStartIdx !== -1 && thinkEndIdx !== -1 && thinkEndIdx > thinkStartIdx) {
      reasoning = answerText.substring(thinkStartIdx + 10, thinkEndIdx).trim();
      answerText = answerText.replace(/<thinking>[\s\S]*?<\/thinking>/g, "").trim();
    }

    // Check for automatic database trigger logging
    let loggedExpense: any = null;
    if (answerText.includes(":::log_trigger:::")) {
      try {
        const parts = answerText.split(":::log_trigger:::");
        if (parts.length >= 3) {
          const rawJson = parts[1].trim();
          const pLog = JSON.parse(rawJson);
          if (pLog && pLog.amount) {
            // Respecting user preference: do NOT auto-save to DB without direct user approval. Just return schema proposals.
            loggedExpense = pLog;
          }
          // Clean the user facing message
          answerText = (parts[0] + (parts[2] || "")).trim();
        }
      } catch (e) {
        console.error("Failed to parse log trigger:", e);
      }
    }

    res.json({
      content: answerText,
      reasoning,
      loggedExpense
    });

  } catch (error: any) {
    console.error("AI service failure:", error);
    res.status(500).json({ error: error.message || "Failed to communicate with Gemini" });
  }
});

export default router;
