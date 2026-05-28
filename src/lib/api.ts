import { BudgetLog, UserProfile, Message, Subscription } from "../types";

const API_BASE = "/api";

let inMemoryToken: string | null = null;

export function setSessionToken(token: string | null) {
  inMemoryToken = token;
}

export function getSessionToken(): string | null {
  return inMemoryToken;
}

function getHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = inMemoryToken || "default_user";
  return {
    "Authorization": `Bearer ${token}`,
    ...extra
  };
}

// Exponential backoff fetch retry utility
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries: number = 3,
  delay: number = 1000
): Promise<Response> {
  let lastError: any = null;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 401) {
        throw new Error("UNAUTHORIZED_SESSION_EXPIRED");
      }
      if (res.status >= 500 && res.status <= 599) {
        throw new Error(`SERVER_ERROR_STATUS_${res.status}`);
      }
      return res;
    } catch (err: any) {
      if (err.message === "UNAUTHORIZED_SESSION_EXPIRED") {
        throw err; // immediate abort for unauthorized session rejection
      }
      lastError = err;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  throw lastError || new Error(`Failed to fetch after ${retries} retries`);
}

// Global API Request Wrapper with automatic token refresh or 401 session expiration monitoring
async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    const res = await fetchWithRetry(url, options);
    return res;
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_SESSION_EXPIRED") {
      setSessionToken(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("anika-unauthorized"));
      }
    }
    throw err;
  }
}

export const api = {
  // Authentication APIs
  register: async (username: string, password: string): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to register account");
    }
    return data;
  },

  login: async (username: string, password: string): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to log in");
    }
    return data;
  },

  recoverPassword: async (username: string, reset_key: string, new_password: string): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/auth/recover-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, reset_key, new_password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to recover password");
    }
    return data;
  },

  regenerateResetKey: async (username: string, password: string): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/auth/reset-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to regenerate key");
    }
    return data;
  },

  // OTP Authentication APIs
  sendOtp: async (target: string): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/auth/otp-send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to generate security OTP");
    }
    return data;
  },

  verifyOtp: async (target: string, code: string): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/auth/otp-verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, code })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to verify security OTP");
    }
    return data;
  },

  initiateOtpRecovery: async (username: string): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/auth/otp-recover-initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to register password recovery code");
    }
    return data;
  },

  verifyOtpRecovery: async (payload: { username: string; code: string; new_password: string }): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/auth/otp-recover-verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to reset password using code");
    }
    return data;
  },

  getSecurityLogs: async (): Promise<any[]> => {
    const res = await apiFetch(`${API_BASE}/auth/security-logs`, {
      headers: getHeaders()
    });
    if (!res.ok) {
      throw new Error("Failed to retrieve security activity logs");
    }
    return res.json();
  },

  // ML Recommendation & Comparing APIs
  getRecommendations: async (category: string, budget: number, query?: string, preferenceProfile?: string): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/recommendations`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ category, budget, query, preferenceProfile })
    });
    const data = await res.json();
    if (!res.ok) {
       throw new Error(data.error || "Failed to match ML budget recommendations");
    }
    return data;
  },

  compareProducts: async (productIds: string[]): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/recommendations/compare`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ productIds })
    });
    const data = await res.json();
    if (!res.ok) {
       throw new Error(data.error || "Failed comparing specs matrix");
    }
    return data;
  },

  optimizeDebtSplits: async (balances: Record<string, number>): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/splits/optimize`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ balances })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed calculating dynamic splits optimizing graph");
    }
    return data;
  },

  // Existing Budget APIs - scoper integrated
  getSubscriptions: async (): Promise<Subscription[]> => {
    const res = await apiFetch(`${API_BASE}/subscriptions`, {
      headers: getHeaders()
    });
    return res.json();
  },
  addSubscription: async (sub: Omit<Subscription, 'id'>): Promise<void> => {
    await apiFetch(`${API_BASE}/subscriptions`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(sub),
    });
  },
  updateSubscription: async (id: number, sub: Partial<Subscription>): Promise<void> => {
    await apiFetch(`${API_BASE}/subscriptions/${id}`, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(sub),
    });
  },
  deleteSubscription: async (id: number): Promise<void> => {
    await apiFetch(`${API_BASE}/subscriptions/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  },
  getBudget: async (): Promise<BudgetLog[]> => {
    const res = await apiFetch(`${API_BASE}/budget`, {
      headers: getHeaders()
    });
    return res.json();
  },
  addBudget: async (log: Omit<BudgetLog, 'id' | 'date'>): Promise<void> => {
    await apiFetch(`${API_BASE}/budget`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(log),
    });
  },
  updateBudget: async (id: number, log: Partial<BudgetLog>): Promise<void> => {
    await apiFetch(`${API_BASE}/budget/${id}`, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(log),
    });
  },
  deleteBudget: async (id: number): Promise<void> => {
    await apiFetch(`${API_BASE}/budget/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },
  getProfile: async (): Promise<UserProfile> => {
    const res = await apiFetch(`${API_BASE}/profile`, {
      headers: getHeaders()
    });
    return res.json();
  },
  updateProfile: async (profile: Partial<UserProfile>): Promise<void> => {
    await apiFetch(`${API_BASE}/profile`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(profile),
    });
  },
  getHistory: async (conversationId: string): Promise<Message[]> => {
    const res = await apiFetch(`${API_BASE}/history/${conversationId}`, {
      headers: getHeaders()
    });
    return res.json();
  },
  saveHistory: async (msg: { conversation_id: string; role: string; content: string }): Promise<void> => {
    await apiFetch(`${API_BASE}/history`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(msg),
    });
  },
  getAnalytics: async (): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/analytics`, {
      headers: getHeaders()
    });
    return res.json();
  },
  getGoals: async (): Promise<any[]> => {
    const res = await apiFetch(`${API_BASE}/goals`, {
      headers: getHeaders()
    });
    return res.json();
  },
  addGoal: async (goal: { name: string; target_amount: number; saved_amount?: number; category?: string; deadline?: string; roadmap?: string }): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/goals`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(goal)
    });
    return res.json();
  },
  updateGoal: async (id: number, saved_amount: number): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/goals/${id}`, {
      method: "PUT",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ saved_amount })
    });
    return res.json();
  },
  deleteGoal: async (id: number): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/goals/${id}`, {
      method: "DELETE",
      headers: getHeaders()
    });
    return res.json();
  },
  getFriends: async (): Promise<any[]> => {
    const res = await apiFetch(`${API_BASE}/friends`, {
      headers: getHeaders()
    });
    return res.json();
  },
  addFriend: async (friend: { name: string; upi_id?: string }): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/friends`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(friend)
    });
    return res.json();
  },
  deleteFriend: async (id: number): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/friends/${id}`, {
      method: "DELETE",
      headers: getHeaders()
    });
    return res.json();
  },
  getGroups: async (): Promise<any[]> => {
    const res = await apiFetch(`${API_BASE}/groups`, {
      headers: getHeaders()
    });
    return res.json();
  },
  createGroup: async (group: { group_name: string; members: string[]; balances: Record<string, number> }): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/groups`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(group)
    });
    return res.json();
  },
  deleteGroup: async (id: number): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/groups/${id}`, {
      method: "DELETE",
      headers: getHeaders()
    });
    return res.json();
  },
  saveMemory: async (key: string, value: string): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/memories`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ key, value })
    });
    return res.json();
  },
  chatAI: async (message: string, history: any[], fileData?: { mimeType: string; data: string }): Promise<{ content: string; reasoning?: string; loggedExpense?: any }> => {
    const res = await apiFetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ message, history, fileData })
    });
    const data = await res.json();
    if (!res.ok) {
       throw new Error(data.error || "Failed to establish AI response stream");
    }
    return data;
  },
  uploadFile: async (filename: string, contentType: string, base64: string): Promise<{ success: boolean; url: string; filename: string; contentType: string }> => {
    const res = await apiFetch(`/upload`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ filename, contentType, base64 }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to upload file");
    }
    return data;
  },
  parseDocument: async (payload: { filename?: string; contentType?: string; base64?: string; category: string; documents?: { filename: string; contentType: string; base64: string }[] }): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/parse-doc`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to parse document with AI OCR");
    }
    return data;
  },
  
  // Real OCR asynchronous endpoints matching Bug 3/4
  ocrUpload: async (filename: string, contentType: string, base64: string, category: string = "Food & Dining"): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/ocr-upload`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ filename, contentType, base64, category })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to initiate document scan");
    }
    return data;
  },

  ocrStatus: async (uploadId: number): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/ocr-status/${uploadId}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to retrieve scanning status");
    }
    return data;
  },

  saveParticipants: async (expense_id: number, names: string[]): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/participants`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ expense_id, names })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to confirm participants");
    }
    return data;
  },

  calculateSettlements: async (expense_id: number): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/settlements/calculate`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ expense_id })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to process minimum cash flow settlement path");
    }
    return data;
  },

  getFullExpense: async (expense_id: number): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/expenses/${expense_id}/full`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to query full expense information");
    }
    return data;
  },

  splitEqual: async (expense_id: number, participant_ids?: string[]): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/splits/equal`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ expense_id, participant_ids })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to balance equally split invoice");
    }
    return data;
  },

  splitItemized: async (expense_id: number, assignments: Record<string, string[]>): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/splits/itemized`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ expense_id, assignments })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to distribute itemized split assignment weights");
    }
    return data;
  },

  createGroupExpense: async (expense: { title: string; total: number; date?: string; ocr_upload_id?: number }): Promise<any> => {
    const res = await apiFetch(`${API_BASE}/expenses`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(expense)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to create group expense database entry");
    }
    return data;
  }
};
