export interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp?: string;
  imageUrl?: string;
  reasoning?: string;
  isSettlementComplete?: boolean;
  settlementPayload?: any;
}

export interface BudgetLog {
  id?: number;
  amount: number;
  category: string;
  note: string;
  date: string;
}

export interface UserProfile {
  user_id: string;
  budget_limit: number;
  lifestyle_info?: string;
  emergency_target?: number;
  emergency_saved?: number;
}

export interface Subscription {
  id?: number;
  name: string;
  amount: number;
  category: string;
  active: number;
  billing_date?: string;
}

export interface ProductAnalysis {
  name: string;
  price?: string;
  healthScore?: number;
  recommendation: 'BUY' | 'AVOID' | 'WAIT' | 'BETTER ALTERNATIVE';
  analysis: string;
}

export interface DailySavingGoal {
  id: string;
  targetAmount: number;
  description: string;
  completed: boolean;
  date: string;
}

