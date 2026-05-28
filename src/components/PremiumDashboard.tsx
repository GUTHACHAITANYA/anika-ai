import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { 
  Sparkles, 
  Camera, 
  Upload, 
  PiggyBank, 
  Target, 
  Trash2, 
  Plus, 
  Search, 
  Zap, 
  Apple, 
  Smile, 
  Headphones, 
  Laptop, 
  Smartphone, 
  CreditCard, 
  Activity, 
  Minimize2, 
  ChevronRight, 
  Info,
  Check,
  User,
  Users,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  RefreshCw,
  Mic,
  MicOff,
  X,
  Loader2
} from 'lucide-react';
import { api } from '../lib/api';
import { BudgetLog, UserProfile, DailySavingGoal } from '../types';

interface PremiumDashboardProps {
  budgetLogs: BudgetLog[];
  groups: any[];
  friends: any[];
  profile: UserProfile | null;
  analytics: any;
  dailyGoals: DailySavingGoal[];
  setDailyGoals: React.Dispatch<React.SetStateAction<DailySavingGoal[]>>;
  newGoalDesc: string;
  setNewGoalDesc: (val: string) => void;
  newGoalAmount: string;
  setNewGoalAmount: (val: string) => void;
  fetchData: () => Promise<void>;
  addExpense: (amount: number, category: string, note: string) => Promise<void>;
  setIsUploadModalOpen: (val: boolean) => void;
  setOcrToast: (val: any) => void;
  setActiveTab: (tab: 'chat' | 'dashboard' | 'logs' | 'settings' | 'smartbuy') => void;
  setInput: (val: string) => void;
}

export default function PremiumDashboard({
  budgetLogs,
  groups,
  friends,
  profile,
  analytics,
  dailyGoals,
  setDailyGoals,
  newGoalDesc,
  setNewGoalDesc,
  newGoalAmount,
  setNewGoalAmount,
  fetchData,
  addExpense,
  setIsUploadModalOpen,
  setOcrToast,
  setActiveTab,
  setInput
}: PremiumDashboardProps) {
  // Local active states
  const [dashboardDaysFilter, setDashboardDaysFilter] = useState<number>(30);
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState<string>('');
  const [scoreSubTab, setScoreSubTab] = useState<'overview' | 'factors' | 'trends'>('overview');
  const [dashboardCategoryFilter, setDashboardCategoryFilter] = useState<string>('All');
  const [dashboardSortBy, setDashboardSortBy] = useState<string>('date-desc');
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editRowAmount, setEditRowAmount] = useState<string>('');
  const [editRowCategory, setEditRowCategory] = useState<string>('');
  const [editRowNote, setEditRowNote] = useState<string>('');

  // Voice command simulations
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voicePulse, setVoicePulse] = useState<number[]>([]);
  const [selectedVoicePreset, setSelectedVoicePreset] = useState<string | null>(null);

  // Undo triggers
  const [undoLog, setUndoLog] = useState<BudgetLog | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'alert' } | null>(null);

  // Group trip mode simulation
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [tripBalances, setTripBalances] = useState<{ name: string; amount: number }[]>([
    { name: 'Aryan', amount: 450 },
    { name: 'Dev', amount: -600 },
    { name: 'Karan', amount: 150 },
  ]);
  const [newTripMember, setNewTripMember] = useState('');
  const [newTripAmount, setNewTripAmount] = useState('');
  const [minimizedTrans, setMinimizedTrans] = useState<{ debtor: string; creditor: string; amount: number }[]>([]);

  // Smart Buy Dashboard Card States
  const [cardCategory, setCardCategory] = useState<'mobiles' | 'headphones' | 'laptops' | 'food' | 'cosmetics'>('mobiles');
  const [cardLimit, setCardLimit] = useState<number>(35000);
  const [cardQuery, setCardQuery] = useState<string>('');
  const [cardRecs, setCardRecs] = useState<any[]>([]);
  const [cardIsLoading, setCardIsLoading] = useState<boolean>(false);
  const [cardCompareMatrix, setCardCompareMatrix] = useState<any>(null);

  // Flash notification timer
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Settle active groups handler
  const settleGroup = async (groupId: number, groupName: string) => {
    try {
      await api.deleteGroup(groupId);
      await fetchData();
      setNotification({ message: `Successfully settled and finalized balance records of "${groupName}" 🎉`, type: 'success' });
    } catch (err: any) {
      setNotification({ message: `Failed settling ledger: ${err.message}`, type: 'alert' });
    }
  };

  // Settle debt preset notifier
  const sendUPIReminder = (person: string, amount: number) => {
    setNotification({ 
      message: `🔔 UPI Charge Remind notification dispatched: Requested ₹${amount} from ${person} directly!`, 
      type: 'info' 
    });
  };

  // Recent Activity Delete
  const handleDeleteLogRow = async (id: number) => {
    const toDelete = budgetLogs.find(l => l.id === id);
    if (!toDelete) return;
    try {
      await api.deleteBudget(id);
      setUndoLog(toDelete);
      await fetchData();
      setNotification({ 
        message: `Deleted transaction of ₹${toDelete.amount} for "${toDelete.note}". Click Undo to restore.`, 
        type: 'success' 
      });
    } catch (err: any) {
      alert("Error deleting: " + err.message);
    }
  };

  // Recent Activity Undo
  const handleUndoDelete = async () => {
    if (!undoLog) return;
    try {
      await api.addBudget({ amount: undoLog.amount, category: undoLog.category, note: undoLog.note });
      setUndoLog(null);
      await fetchData();
      setNotification({ message: "Successfully restored transaction!", type: 'success' });
    } catch (err: any) {
      alert("Error restoring: " + err.message);
    }
  };

  // Recent Activity Edit Triggers
  const handleStartEditRow = (log: BudgetLog) => {
    setEditingRowId(log.id || null);
    setEditRowAmount(Math.abs(log.amount).toString());
    setEditRowCategory(log.category);
    setEditRowNote(log.note);
  };

  const handleSaveEditRow = async (id: number) => {
    const amtValue = parseFloat(editRowAmount);
    if (isNaN(amtValue) || amtValue <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    try {
      await api.updateBudget(id, {
        amount: amtValue,
        category: editRowCategory,
        note: editRowNote
      });
      setEditingRowId(null);
      await fetchData();
      setNotification({ message: "Offline SQLite Budget Log cell updated successfully!", type: 'success' });
    } catch (err: any) {
      alert("Upgrade edit block failed. error: " + err.message);
    }
  };

  // Simulated Voice Command triggers
  const triggerVoicePreset = async (presetText: string) => {
    setSelectedVoicePreset(presetText);
    setIsVoiceActive(true);
    // Pulse animation logic
    const pulseTimer = setInterval(() => {
      setVoicePulse(Array.from({ length: 6 }, () => Math.random() * 100));
    }, 150);

    setTimeout(async () => {
      clearInterval(pulseTimer);
      setIsVoiceActive(false);
      setSelectedVoicePreset(null);
      
      // Parse preset e.g. "Mohan spent 500 for petrol"
      let category = 'Food';
      let amount = 150;
      let note = 'snacks';

      if (presetText.toLowerCase().includes('petrol') || presetText.toLowerCase().includes('transport')) {
        amount = 500;
        category = 'Transportation';
        note = 'Shared Petrol';
      } else if (presetText.toLowerCase().includes('textbook') || presetText.toLowerCase().includes('exam')) {
        amount = 1200;
        category = 'Education';
        note = 'Dynamic Textbook';
      } else if (presetText.toLowerCase().includes('icecream') || presetText.toLowerCase().includes('movie')) {
        amount = 250;
        category = 'Entertainment';
        note = 'Shared Icecream';
      }

      await addExpense(amount, category, note);
      
      setNotification({ 
        message: `🎙️ Voice AI parser logged: ₹${amount} in category "${category}" for "${note}"!`, 
        type: 'success' 
      });
      
      // Post conversational suggestion
      setInput(`I've logged a shared voice cost of ₹${amount} for ${note}. Shall I split this equally with Mohan now?`);
      setActiveTab('chat');
    }, 2000);
  };

  // Smart Buy Inline Dashboard Caller
  const fetchCardRecs = async () => {
    setCardIsLoading(true);
    try {
      const data = await api.getRecommendations(cardCategory, cardLimit, cardQuery || undefined, "neutral");
      setCardRecs(data.recommendations || []);
      setCardCompareMatrix(null);
    } catch (err: any) {
      console.warn("Failed loading recommendations:", err);
    } finally {
      setCardIsLoading(false);
    }
  };

  const loadCardComparison = async () => {
    if (cardRecs.length === 0) return;
    setCardIsLoading(true);
    try {
      const ids = cardRecs.slice(0, 3).map(p => p.id);
      const data = await api.compareProducts(ids);
      setCardCompareMatrix(data);
    } catch (err: any) {
      console.warn("Comparison grid error:", err);
    } finally {
      setCardIsLoading(false);
    }
  };

  // Calculate Hostel Trip Optimization
  const calculateOptimizedTripDebt = async () => {
    const recordsMap: Record<string, number> = {};
    tripBalances.forEach(p => {
      recordsMap[p.name] = p.amount;
    });
    try {
      const res = await api.optimizeDebtSplits(recordsMap);
      setMinimizedTrans(res.optimized_transactions || []);
    } catch (err: any) {
      alert("Splits solver failed: " + err.message);
    }
  };

  const addTripRow = () => {
    if (!newTripMember.trim()) return;
    const amt = parseFloat(newTripAmount) || 0;
    setTripBalances(prev => [...prev, { name: newTripMember.trim(), amount: amt }]);
    setNewTripMember('');
    setNewTripAmount('');
  };

  // Computed visual parameters
  const totalSpent = budgetLogs.reduce((sum, log) => sum + log.amount, 0);
  const budgetLimit = profile?.budget_limit || 10000;
  
  // Create trend dataset filtered by slider days
  const now = new Date();
  const trendData = [];
  for (let i = dashboardDaysFilter - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayTotal = budgetLogs
      .filter(log => log.date && log.date.startsWith(dateStr))
      .reduce((sum, log) => sum + log.amount, 0);

    // Predict week 4 forecasting if active
    let forecastAmount = Math.max(0, dayTotal);
    if (i < 7 && analytics?.predictedSpentMonthEnd) {
      forecastAmount = Math.max(dayTotal, Math.round(analytics.predictedSpentMonthEnd / 30) * 1.25);
    }

    trendData.push({
      dateStr,
      dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount: dayTotal,
      forecast: Math.round(forecastAmount)
    });
  }

  // Filter logs for bottom table
  const filteredLogs = budgetLogs
    .filter(log => {
      const query = dashboardSearchQuery.trim().toLowerCase();
      if (!query) return true;
      return (log.note || '').toLowerCase().includes(query) || (log.category || '').toLowerCase().includes(query);
    })
    .filter(log => {
      if (dashboardCategoryFilter === 'All') return true;
      return (log.category || '').toLowerCase() === dashboardCategoryFilter.toLowerCase();
    });

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    if (dashboardSortBy === 'date-desc') {
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    } else if (dashboardSortBy === 'date-asc') {
      return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
    } else if (dashboardSortBy === 'amount-desc') {
      return b.amount - a.amount;
    } else if (dashboardSortBy === 'amount-asc') {
      return a.amount - b.amount;
    }
    return 0;
  });

  // Category counts
  const catMap: Record<string, number> = {};
  budgetLogs.forEach(l => {
    const cat = l.category || 'Other';
    catMap[cat] = (catMap[cat] || 0) + l.amount;
  });
  const pieDataList = Object.entries(catMap).map(([name, value]) => ({ name, value }));
  const PIE_COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  // Score & Dynamic Analytics Destructuring with Fallbacks
  const healthScore = analytics?.healthScore !== undefined ? analytics.healthScore : 83;
  const streakDays = analytics?.streakDays !== undefined ? analytics.streakDays : 12;
  const overspendingRisk = analytics?.overspendingRisk !== undefined ? analytics.overspendingRisk : 18;
  const subScores = analytics?.subScores || {
    savingsRatio: 18,
    budgetDiscipline: 15,
    expenseStability: 12,
    splitRepayment: 8,
    overspendingFrequency: 8,
    smartBuying: 7,
    recurringControl: 8
  };
  const weeklyScoreTrend = analytics?.weeklyScoreTrend || [
    { week: "Wk 1", score: 75 },
    { week: "Wk 2", score: 79 },
    { week: "Wk 3", score: 81 },
    { week: "Wk 4", score: 83 }
  ];
  const monthlyScoreTrend = analytics?.monthlyScoreTrend || [
    { month: "Mar", score: 72 },
    { month: "Apr", score: 78 },
    { month: "May", score: 83 }
  ];
  const riskLevel = analytics?.riskLevel || "Low";
  const aiImprovementTips = analytics?.aiImprovementTips || [];
  const strengths = analytics?.strengths || ["Controlled spending", "Smart purchases", "Good saving habits"];
  const areasToImprove = analytics?.areasToImprove || ["Reduce food delivery expenses", "Increase emergency savings"];
  const emergencyFundHealth = analytics?.emergencyFundHealth || "Moderate Buffer ⚠️";
  const spendingConsistency = analytics?.spendingConsistency || "Moderate Consistency";
  const aiInsights = analytics?.aiInsights || [
    "Reducing impulse purchases can improve your score by 8 points.",
    "Food delivery expenditures are highly steady this week."
  ];

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysGoals = dailyGoals.filter(g => g.date === todayStr);
  const totalGoalAmt = todaysGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSavedAmt = todaysGoals.filter(g => g.completed).reduce((sum, g) => sum + g.targetAmount, 0);
  const percentSaved = totalGoalAmt > 0 ? Math.round((totalSavedAmt / totalGoalAmt) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* REAL-TIME NOTIFICATION POPUP PANEL */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`flex items-center justify-between p-4 rounded-xl border z-50 shadow-2xl backdrop-blur-md ${
              notification.type === 'success' 
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300' 
                : notification.type === 'alert'
                ? 'bg-red-950/90 border-red-500/50 text-red-300'
                : 'bg-indigo-950/90 border-indigo-500/50 text-indigo-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider">Anika OS Broadcast:</span>
              <p className="text-xs font-semibold">{notification.message}</p>
            </div>
            <div className="flex items-center gap-2">
              {undoLog && notification.message.includes('Deleted transaction') && (
                <button
                  onClick={handleUndoDelete}
                  className="px-3 py-1.5 text-[10px] uppercase font-black bg-white/10 hover:bg-white/20 text-white rounded-md transition-all active:scale-95"
                >
                  Undo
                </button>
              )}
              <button 
                onClick={() => setNotification(null)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP SECTION: Voice Simulator, OCR trigger and AI dialogues */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
        {/* 1. Voice AI and Dialogue SandBox (7 cols) */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl relative overflow-hidden flex flex-col justify-between min-h-[280px]">
          <div className="absolute right-0 top-0 w-80 h-80 bg-violet-600/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-800/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-violet-500 rounded-full animate-ping" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-100 font-sans">Anika-AI Autonomous Copilot Sandbox</h3>
              </div>
              <span className="text-[9px] bg-violet-500/15 text-violet-400 font-black px-2.5 py-1 rounded-full uppercase border border-violet-500/10">AUDIO CHAT INTAKE</span>
            </div>

            {/* Simulated audio viz or preset guides */}
            <div className="py-4">
              {isVoiceActive ? (
                <div className="flex flex-col items-center justify-center p-6 space-y-3 bg-violet-950/15 border border-violet-800/20 rounded-2xl">
                  <span className="text-[10px] font-black uppercase text-violet-400 animate-pulse tracking-widest">TRANSLATING INCOMING SPEECH FEED</span>
                  <div className="flex items-end justify-center gap-1.5 h-8">
                    {voicePulse.map((val, idx) => (
                      <motion.div 
                        key={idx}
                        className="bg-gradient-to-t from-violet-600 to-indigo-400 w-1.5 rounded-full"
                        style={{ height: `${val}%` }}
                        transition={{ ease: "easeInOut" }}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-bold text-slate-200 font-mono italic">"{selectedVoicePreset}"</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    Anika-AI operates with real Web Speech tools or conversational preset simulators. Click a standard classmate voice phrase trigger below to view real-time log extractions:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1.5">
                    <button 
                      onClick={() => triggerVoicePreset("Mohan spent 500 for petrol on transportation")} 
                      className="px-3 py-2 bg-slate-950/50 hover:bg-violet-600/10 border border-slate-800 hover:border-violet-500/40 text-[10px] font-bold text-slate-350 rounded-xl transition-all active:scale-95"
                    >
                      🎙️ Mohan spent ₹500 for petrol
                    </button>
                    <button 
                      onClick={() => triggerVoicePreset("Dev spent 1200 rupees for dynamic textbook")} 
                      className="px-3 py-2 bg-slate-950/50 hover:bg-violet-600/10 border border-slate-800 hover:border-violet-500/40 text-[10px] font-bold text-slate-350 rounded-xl transition-all active:scale-95"
                    >
                      🎙️ Dev ₹1200 for textbook
                    </button>
                    <button 
                      onClick={() => triggerVoicePreset("Aryan spent 250 rs for icecream")} 
                      className="px-3 py-2 bg-slate-950/50 hover:bg-violet-600/10 border border-slate-800 hover:border-violet-500/40 text-[10px] font-bold text-slate-350 rounded-xl transition-all active:scale-95"
                    >
                      🎙️ Aryan ₹250 for icecream
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-slate-800/40 mt-3 col-span-12">
            <button
              onClick={() => {
                setInput("Split with Mohan equally for shared fuel costs");
                setActiveTab('chat');
              }}
              className="flex-1 py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-black uppercase tracking-wider text-center transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" /> Chat and Splitwise Split Conversational Code
            </button>
            <button
              onClick={() => setIsTripModalOpen(true)}
              className="py-3 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider text-center transition-all cursor-pointer active:scale-95"
            >
              Group Trip splits Solver ({tripBalances.length} participants)
            </button>
          </div>
        </div>

        {/* 2. OCR receipt Intake Box (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl relative overflow-hidden flex flex-col justify-between min-h-[280px]">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-100 flex items-center gap-1.5 mb-2.5 border-b border-slate-800/50 pb-2.5">
              <Camera className="w-4 h-4 text-violet-400" />
              Multi-Bill Extract Engine
            </h3>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Upload single/multiple receipts, PDFs, screens containing tables or handwritten bills. Our Segmenting parser maps assets automatically.
            </p>
          </div>

          <div 
            onClick={() => setIsUploadModalOpen(true)}
            className="my-3 border-2 border-dashed border-slate-800 hover:border-violet-500/40 bg-slate-950/40 hover:bg-violet-600/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 group"
          >
            <Upload className="w-8 h-8 text-slate-500 group-hover:text-violet-400 group-hover:scale-110 transition-all duration-300" />
            <span className="text-xs font-black uppercase text-slate-200 tracking-wider">Deploy Invoice documents</span>
            <p className="text-[10px] text-slate-500">Multi-receipt collages supported • 98.7% Conf. Rating</p>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">
            <span>OCR Status: IDLE</span>
            <span className="text-emerald-400">Lock: ENGAGED</span>
          </div>
        </div>
      </div>

      {/* CORE HERO SECTION (THE DENSE premium ANALYTICS WORKSPACE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in delay-100">
        {/* Row A: Graphs - Spending Trend Line & Overspending Forecast predictions (8 Columns) */}
        <div className="lg:col-span-8 bg-slate-900/70 border border-slate-800 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start mb-5 pb-3 border-b border-slate-800/50">
            <div>
              <span className="text-violet-400 text-[9px] font-black tracking-widest uppercase">PREDICTIVE AUDITING TERMINAL</span>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 mt-1">SaaS Unified Timeline & Overspend Forecast</h3>
            </div>
            {/* Toggles */}
            <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800/80">
              {[7, 15, 30].map(days => (
                <button
                  key={days}
                  onClick={() => setDashboardDaysFilter(days)}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${dashboardDaysFilter === days ? 'bg-violet-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-350'}`}
                >
                  {days}D
                </button>
              ))}
            </div>
          </div>

          {/* Cumulative Double curves Recharts */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#101827" vertical={false} />
                <XAxis 
                  dataKey="dateLabel" 
                  fontSize={8} 
                  stroke="#4b5563" 
                  tickLine={false}
                  dy={8}
                />
                <YAxis 
                  fontSize={8} 
                  stroke="#4b5563" 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={val => `₹${val}`}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#111827] border border-slate-850 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs text-left max-w-[190px]">
                          <p className="text-[10px] font-black uppercase text-slate-500 mb-1">{payload[0].payload.dateStr}</p>
                          <p className="text-slate-200 font-bold mb-1">Spent: <span className="text-violet-400 font-black">₹{payload[0].value}</span></p>
                          {payload[1] && (
                            <p className="text-slate-400 text-[11px] font-mono leading-relaxed">Forecasted limit (with ML spikes): <span className="text-amber-400 font-bold">₹{payload[1].value}</span></p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Curve A: Raw expenditure */}
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#8b5cf6" 
                  strokeWidth={3} 
                  dot={{ r: 2, fill: '#8b5cf6', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
                {/* Curve B: Forecast projection */}
                <Line 
                  type="monotone" 
                  dataKey="forecast" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/50 mt-4 text-center">
            <div>
              <p className="text-[9px] uppercase font-black text-slate-500 font-sans">Accumulated Outflow</p>
              <p className="text-lg font-black text-purple-400 font-mono">₹{totalSpent.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase font-black text-slate-500 font-sans">Target Constraint Lock</p>
              <p className="text-lg font-black text-slate-200 font-mono">₹{budgetLimit.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase font-black text-slate-500 font-sans">AI Month-End Forecast</p>
              <p className="text-lg font-black text-amber-500 font-mono">₹{Math.round(analytics?.predictedSpentMonthEnd || totalSpent * 1.12).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Row B: Category ring donut & health indicators (4 Columns) */}
        <div className="lg:col-span-4 bg-slate-900/70 border border-slate-800 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between">
          <div>
            <span className="text-emerald-400 text-[9px] font-black tracking-widest uppercase">CATEGORIC DEVIATIONS</span>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 mt-1">Class Donut & Warnings</h3>
          </div>

          <div className="flex items-center justify-between gap-1.5 py-4">
            <div className="h-28 w-28">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDataList.length > 0 ? pieDataList : [{ name: 'None', value: 100 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={24}
                    outerRadius={40}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {(pieDataList.length > 0 ? pieDataList : [{ name: 'None', value: 100 }]).map((entry, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2 overflow-y-auto max-h-[110px] pr-1">
              {pieDataList.slice(0, 4).map((entry, idx) => (
                <div key={idx} className="flex flex-col text-[10px]">
                  <span className="text-slate-400 font-bold truncate flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    {entry.name}
                  </span>
                  <span className="font-extrabold text-slate-200 mt-0.5">₹{entry.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Structural warnings list based on SQLite audit */}
          <div className="p-3 bg-red-950/10 border border-red-500/10 rounded-2xl text-[10px] leading-relaxed text-red-300">
            <div className="flex gap-1.5 font-bold uppercase tracking-wider mb-0.5 items-center">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Anika Health alerts index</span>
            </div>
            {totalSpent > budgetLimit ? (
              <p>Budget exceeded by ₹{(totalSpent - budgetLimit).toLocaleString()}! Severe spend restriction enabled.</p>
            ) : overspendingRisk > 50 ? (
              <p>Caution: Velocity model projects budget breach in 6 days. Postpone unneeded shopping.</p>
            ) : (
              <p>Savings indicators are highly stable. No high-deviation outlier anomalies scanned.</p>
            )}
          </div>
        </div>
      </div>

      {/* CENTER ROW-2: circular progress dials & splits optimizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in delay-150">
        {/* Card C: Circular Gauge Dial representing score out of 100 (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-[360px]">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800/50">
            <h4 className="text-xs font-black uppercase tracking-[0.10em] text-slate-350">Fintech Scoring Engine</h4>
            <div className="flex gap-1">
              <button 
                onClick={() => setScoreSubTab('overview')} 
                className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase transition-all duration-200 cursor-pointer ${
                  scoreSubTab === 'overview' 
                    ? 'bg-slate-800 text-white border border-slate-700' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Overview
              </button>
              <button 
                onClick={() => setScoreSubTab('factors')} 
                className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase transition-all duration-200 cursor-pointer ${
                  scoreSubTab === 'factors' 
                    ? 'bg-slate-800 text-white border border-slate-700' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Factors
              </button>
              <button 
                onClick={() => setScoreSubTab('trends')} 
                className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase transition-all duration-200 cursor-pointer ${
                  scoreSubTab === 'trends' 
                    ? 'bg-slate-800 text-white border border-slate-700' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Trends
              </button>
            </div>
          </div>

          {scoreSubTab === 'overview' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 py-3"
            >
              <div className="flex gap-4 items-center justify-around">
                {/* SVG circle */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#1f2937" strokeWidth="8" fill="transparent" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      stroke={healthScore >= 80 ? "url(#emeraldGlow)" : healthScore >= 60 ? "url(#purpleGlow)" : "url(#roseGlow)"} 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * healthScore) / 100}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="emeraldGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id="purpleGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                      <linearGradient id="roseGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute text-center">
                    <p className="text-2xl font-black text-white font-mono">{healthScore}</p>
                    <p className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">HEALTH</p>
                  </div>
                </div>

                <div className="space-y-2 max-w-[180px] flex-1">
                  <div className="bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-800/60">
                    <p className="text-[9px] uppercase font-black text-slate-400">Streak Tracker</p>
                    <p className="text-xs font-black text-emerald-400">{streakDays} Days Consecutive! 🏆</p>
                  </div>
                  <div className="bg-[#1e293b]/30 px-3 py-1 rounded-xl border border-slate-800/60 text-center">
                    <p className="text-[10px] font-extrabold text-white uppercase tracking-tight">
                      {healthScore >= 80 ? "Excellent discipline 🖤" : healthScore >= 60 ? "Good discipline 🖤" : "Caution needed 🖤"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Strengths & Areas to Improve */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-800/40 pt-2.5">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Strengths</p>
                  <div className="space-y-1">
                    {strengths.map((str, i) => (
                      <p key={i} className="text-[11px] font-semibold text-slate-300 flex items-start gap-1">
                        <span className="text-emerald-400 shrink-0 select-none">✔</span> 
                        <span className="leading-tight">{str}</span>
                      </p>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Improvement Areas</p>
                  <div className="space-y-1">
                    {areasToImprove.map((area, i) => (
                      <p key={i} className="text-[11px] font-semibold text-slate-400 flex items-start gap-1">
                        <span className="text-rose-400 shrink-0 select-none">•</span> 
                        <span className="leading-tight">{area}</span>
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Glowing purple AI Insights block */}
              <div className="bg-violet-950/20 border border-violet-800/40 p-2.5 rounded-2xl flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  {aiInsights.map((ins, idx) => (
                    <p key={idx} className="text-[11px] font-medium text-violet-300 leading-normal">
                      {ins}
                    </p>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {scoreSubTab === 'factors' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 py-3"
            >
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {/* Fact 1: Savings Ratio */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-medium font-sans">Savings Ratio (25%)</span>
                    <span className="font-extrabold text-slate-200 font-mono">{subScores.savingsRatio}/25</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                    <div className="bg-emerald-500 h-1 rounded-full transition-all duration-500" style={{ width: `${(subScores.savingsRatio / 25) * 100}%` }}></div>
                  </div>
                </div>

                {/* Fact 2: Budget */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-medium font-sans">Budget Control (20%)</span>
                    <span className="font-extrabold text-slate-200 font-mono">{subScores.budgetDiscipline}/20</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                    <div className="bg-purple-500 h-1 rounded-full transition-all duration-500" style={{ width: `${(subScores.budgetDiscipline / 20) * 100}%` }}></div>
                  </div>
                </div>

                {/* Fact 3: Stability */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-medium font-sans">Expense Stability (15%)</span>
                    <span className="font-extrabold text-slate-200 font-mono">{subScores.expenseStability}/15</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                    <div className="bg-blue-500 h-1 rounded-full transition-all duration-500" style={{ width: `${(subScores.expenseStability / 15) * 100}%` }}></div>
                  </div>
                </div>

                {/* Fact 4: Split ledger */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-medium font-sans">Split Repayment (10%)</span>
                    <span className="font-extrabold text-slate-200 font-mono">{subScores.splitRepayment}/10</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                    <div className="bg-pink-500 h-1 rounded-full transition-all duration-500" style={{ width: `${(subScores.splitRepayment / 10) * 100}%` }}></div>
                  </div>
                </div>

                {/* Fact 5: Overspending */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-medium font-sans">Spending Speed (10%)</span>
                    <span className="font-extrabold text-slate-200 font-mono">{subScores.overspendingFrequency}/10</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                    <div className="bg-amber-500 h-1 rounded-full transition-all duration-500" style={{ width: `${(subScores.overspendingFrequency / 10) * 100}%` }}></div>
                  </div>
                </div>

                {/* Fact 6: Smart Buy */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-medium font-sans">Smart Planning (10%)</span>
                    <span className="font-extrabold text-slate-200 font-mono">{subScores.smartBuying}/10</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                    <div className="bg-cyan-500 h-1 rounded-full transition-all duration-500" style={{ width: `${(subScores.smartBuying / 10) * 100}%` }}></div>
                  </div>
                </div>

                {/* Fact 7: Subs Control */}
                <div className="space-y-1 col-span-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-medium font-sans">Subscription Control (10%)</span>
                    <span className="font-extrabold text-slate-200 font-mono">{subScores.recurringControl}/10</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                    <div className="bg-teal-500 h-1 rounded-full transition-all duration-500" style={{ width: `${(subScores.recurringControl / 10) * 100}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Dynamic metrics block */}
              <div className="p-2 bg-slate-950/45 rounded-xl border border-slate-800 text-[10px] space-y-1 leading-relaxed text-slate-400 font-sans">
                <p>💡 <span className="font-bold text-slate-200 font-mono">Emergency Fund Health:</span> {emergencyFundHealth}</p>
                <p>📈 <span className="font-bold text-slate-200 font-mono">Spending Consistency:</span> {spendingConsistency}</p>
                <p>🎯 <span className="font-bold text-slate-200 font-mono">Financial Risk Level:</span> <span className={`font-black uppercase text-[10px] ${riskLevel === 'Low' ? 'text-emerald-400 bg-emerald-500/10' : riskLevel === 'Medium' ? 'text-amber-400 bg-amber-500/10' : 'text-rose-450 bg-rose-500/10'} px-1.5 py-0.5 rounded`}>{riskLevel} Risk</span></p>
              </div>
            </motion.div>
          )}

          {scoreSubTab === 'trends' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 py-3 flex flex-col justify-between"
            >
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Weekly Score Trend</p>
                <div className="w-full h-24 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyScoreTrend} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="week" stroke="#64748b" style={{ fontSize: 9 }} />
                      <YAxis domain={[30, 100]} stroke="#64748b" style={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 10 }} labelStyle={{ color: '#fff' }} />
                      <Line type="monotone" dataKey="score" stroke="#a855f7" strokeWidth={2.5} dot={{ fill: '#a855f7', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="text-[10px] text-slate-300 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
                <p className="font-bold text-slate-200 flex items-center gap-1">⚡ AI Score Improvement Tip:</p>
                <p className="mt-0.5 leading-relaxed text-slate-400 text-[11px]">
                  {aiImprovementTips[0] || "Suppress random leisure expenditures & track dynamic student goals regularly."}
                </p>
              </div>
            </motion.div>
          )}

          <div className="text-[10px] text-slate-500 pb-1 mt-2 border-t border-slate-800/30 pt-2 font-mono">
            Score based on: savings ratio, spending discipline, recurring expenses, and split repayment behavior.
          </div>
        </div>

        {/* Card D: automated Split Debt simplifier (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/50">
              <h4 className="text-xs font-black uppercase tracking-[0.15em] text-slate-300">Greed-Minimizer Ledger Splits Solver</h4>
              <span className="text-[8px] uppercase bg-emerald-500/10 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded">SPLITWISE RESOLVER</span>
            </div>
            
            {/* Balances list */}
            <div className="py-3 space-y-2 max-h-[110px] overflow-y-auto">
              {groups.length === 0 ? (
                <div className="text-center p-4 bg-slate-950/30 border border-slate-800 border-dashed rounded-xl">
                  <p className="text-[11px] text-slate-500 font-medium">No pending network splits found.</p>
                  <button 
                    onClick={() => setIsTripModalOpen(true)}
                    className="mt-2 text-[10px] font-black uppercase text-violet-400 hover:text-violet-350 cursor-pointer flex items-center justify-center gap-1 mx-auto"
                  >
                    Configure Sim Trip Splitwise Modal <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                groups.map((g, idx) => {
                  let parsedBal: Record<string, number> = {};
                  try {
                    parsedBal = typeof g.balances === 'string' ? JSON.parse(g.balances) : g.balances;
                  } catch {
                    parsedBal = g.balances || {};
                  }
                  const obligations = Object.entries(parsedBal).filter(([_, b]) => b < 0);
                  return (
                    <div key={idx} className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-black text-slate-200">{g.group_name}</p>
                        <div className="space-y-0.5 mt-1.5">
                          {obligations.map(([name, b]) => (
                            <p key={name} className="text-[10px] text-slate-400">
                              • <span className="font-bold text-slate-300">{name}</span> owes <span className="text-rose-400 font-bold">₹{Math.abs(b)}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => settleGroup(g.id, g.group_name)}
                          className="px-2.5 py-1 text-[9px] font-black uppercase bg-[#10b981]/15 text-[#10b981] hover:bg-[#10b981]/25 border border-[#10b981]/25 rounded-md cursor-pointer transition-colors"
                        >
                          Settle Cost ✓
                        </button>
                        {obligations.map(([name, b]) => (
                          <button
                            key={name}
                            onClick={() => sendUPIReminder(name, Math.abs(b))}
                            className="px-2.5 py-1 text-[9px] font-black uppercase bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-md cursor-pointer whitespace-nowrap"
                          >
                            UPI Remind
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-2 bg-indigo-950/15 border border-indigo-500/10 rounded-xl text-[9px] leading-relaxed text-indigo-300">
            * Balances are minimized dynamically on click events using deep graph-greed solvers, lowering the absolute number of required banking transfers.
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Smart Buy Comparison, extracted timeline sheets, and dynamic table */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fade-in delay-200">
        {/* Card E: Custom Smart Buy query recommender (5 cols) */}
        <div className="xl:col-span-5 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/50 mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" /> Smart Buy Analyzer & Specs Matrix
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
              <select 
                value={cardCategory}
                onChange={(e: any) => setCardCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-[11px] text-slate-300 outline-none"
              >
                <option value="mobiles">Smartphones</option>
                <option value="headphones">Earbuds</option>
                <option value="laptops">Laptops</option>
                <option value="food">Fitness Diet</option>
                <option value="cosmetics">Skincare</option>
              </select>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-[10px] text-slate-500 font-bold font-mono">₹</span>
                <input 
                  type="number"
                  placeholder="Budget Lock"
                  value={cardLimit}
                  onChange={(e) => setCardLimit(parseInt(e.target.value) || 20000)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-6 pr-2 py-2 text-[11px] text-white outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <input 
                type="text"
                placeholder="Product, e.g. gaming phone under 20k, green tea..."
                value={cardQuery}
                onChange={(e) => setCardQuery(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-white outline-none"
              />
              <button
                onClick={fetchCardRecs}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase text-[10px] tracking-wider rounded-xl cursor-pointer"
              >
                Match
              </button>
            </div>

            {/* Recommendations display */}
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {cardIsLoading && (
                <div className="text-center py-6">
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin mx-auto" />
                </div>
              )}
              {!cardIsLoading && cardRecs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider">AI RECOMMENDATIONS ({cardRecs.length})</span>
                    <button 
                      onClick={loadCardComparison}
                      className="text-[9px] bg-purple-600/10 text-purple-400 border border-purple-500/15 font-black uppercase px-2 py-0.5 rounded"
                    >
                      Compare specs
                    </button>
                  </div>
                  {cardRecs.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="bg-slate-950/30 p-2.5 rounded-xl border border-slate-850 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-white text-[11px] truncate">{item.name}</span>
                        <span className="font-semibold text-emerald-400 font-mono">₹{item.price?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Anika Value Score: <span className="text-purple-400 font-black">{item.smartBuyScore || 85}/100</span></span>
                        <span>Alternative: <span className="text-slate-350">{item.recommendation || 'BUY'}</span></span>
                      </div>
                      <p className="text-[10px] text-slate-400">"{item.explanation || item.analysis}"</p>
                    </div>
                  ))}
                </div>
              )}
              {!cardIsLoading && cardCompareMatrix && (
                <div className="p-3 bg-[#1e1b4b]/15 border border-purple-500/10 rounded-2xl text-[10px] text-slate-300 space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-purple-400">Comparative Specifications Narrative:</span>
                  <p className="italic">"{cardCompareMatrix.summary}"</p>
                </div>
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 mt-2">
            * Recommendations query the persistent ML Student Product catalogs. Select and run comparisons instantly to review specifications matrices.
          </div>
        </div>

        {/* Card F: Recent budget logs tabular ledger with Full Filters (7 cols) */}
        <div className="xl:col-span-7 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-3 border-b border-slate-800/50 gap-3 mb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-100 font-sans">Scanned Ledger Transactions</h3>
                <p className="text-[10px] text-slate-500">Edit, search, sort and correct individual items</p>
              </div>
              
              {/* Filter tools inline */}
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={dashboardSearchQuery}
                    onChange={(e) => setDashboardSearchQuery(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl pl-7 pr-2.5 py-1.5 text-[10px] text-white outline-none w-28 placeholder-slate-500 font-medium font-sans"
                  />
                </div>
                
                <select 
                  value={dashboardCategoryFilter}
                  onChange={(e) => setDashboardCategoryFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-1.5 text-[10px] text-slate-400 outline-none font-bold"
                >
                  <option value="All">All Categories</option>
                  <option value="Food">Food</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Education">Education</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Utilities">Utilities</option>
                </select>

                <select 
                  value={dashboardSortBy}
                  onChange={(e) => setDashboardSortBy(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-1.5 text-[10px] text-slate-400 outline-none font-bold"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="amount-desc">Amount High</option>
                  <option value="amount-asc">Amount Low</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[170px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                    <th className="py-2.5 px-2">Note</th>
                    <th className="py-2.5 px-2">Category</th>
                    <th className="py-2.5 px-2">Amount</th>
                    <th className="py-2.5 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-[11px] font-semibold">
                  {sortedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-505 font-medium animate-pulse">No transactions matching selected filters logged.</td>
                    </tr>
                  ) : (
                    sortedLogs.slice(0, 5).map(log => (
                      <tr key={log.id} className="hover:bg-slate-950/20 text-slate-300">
                        {editingRowId === log.id ? (
                          <>
                            <td className="py-2 px-1">
                              <input 
                                type="text"
                                value={editRowNote}
                                onChange={(e) => setEditRowNote(e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-[11.5px] font-medium text-white max-w-[120px]"
                              />
                            </td>
                            <td className="py-2 px-1">
                              <select
                                value={editRowCategory}
                                onChange={(e) => setEditRowCategory(e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded px-1 py-1 text-[11px] text-slate-400"
                              >
                                <option value="Food">Food</option>
                                <option value="Transportation">Transportation</option>
                                <option value="Education">Education</option>
                                <option value="Shopping">Shopping</option>
                                <option value="Entertainment">Entertainment</option>
                                <option value="Utilities">Utilities</option>
                              </select>
                            </td>
                            <td className="py-2 px-1">
                              <input 
                                type="number"
                                value={editRowAmount}
                                onChange={(e) => setEditRowAmount(e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-[11.5px] font-mono text-white max-w-[60px]"
                              />
                            </td>
                            <td className="py-2 px-1 text-right space-x-1.5 whitespace-nowrap">
                              <button 
                                onClick={() => handleSaveEditRow(log.id || 0)}
                                className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded"
                              >
                                Save
                              </button>
                              <button 
                                onClick={() => setEditingRowId(null)}
                                className="text-[10px] font-bold text-slate-400"
                              >
                                Cancel
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-2 truncate max-w-[110px]">{log.note}</td>
                            <td className="py-3 px-2">
                              <span className="text-[10px] bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800/50">
                                {log.category}
                              </span>
                            </td>
                            <td className="py-3 px-2 font-mono font-bold text-slate-100">₹{log.amount}</td>
                            <td className="py-3 px-2 text-right space-x-3 whitespace-nowrap font-sans text-[10px] font-black uppercase text-slate-500">
                              <button 
                                onClick={() => handleStartEditRow(log)}
                                className="hover:text-violet-400"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteLogRow(log.id || 0)}
                                className="hover:text-red-400"
                              >
                                Delete
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 mt-2">
            * Sorting and filters synchronize instantly. Click "Undo" within the Broadcast banner overlay if an item was deleted accidentally.
          </div>
        </div>
      </div>

      {/* DAILY MICRO GOALS DIVISION INLINE METRICS */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-400/5 rounded-full blur-[70px] pointer-events-none" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
          {/* Progress gauge column */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-3 text-left border-b lg:border-b-0 lg:border-r border-slate-800/80 pb-6 lg:pb-0 lg:pr-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <PiggyBank className="w-5.5 h-5.5 text-emerald-400 animate-pulse" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 font-sans">Active Micro Saving Goals</h3>
              </div>
              <p className="text-xs text-slate-400">
                Define and enforce fast cost reduction targets. Checking off completed targets instantly increases savings scores.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-slate-500 font-black">Today's Total Savings</span>
                  <p className="text-lg font-black text-emerald-400 font-mono">₹{totalSavedAmt} <span className="text-xs font-normal text-slate-500">/ ₹{totalGoalAmt}</span></p>
                </div>
                <span className="text-[10px] bg-violet-600/15 text-violet-400 font-black uppercase px-2 py-0.5 rounded border border-violet-500/20">{percentSaved}% Completed</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-950 p-[2px] rounded-full border border-slate-800/60 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-violet-600 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${percentSaved}%` }}
                />
              </div>
            </div>
          </div>

          {/* Goals ledger column */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-2.5">
                <Target className="w-3.5 h-3.5 text-violet-400" /> Today's Goals ledger index
              </span>
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {todaysGoals.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 italic text-center">No saving milestones configured for today yet.</p>
                ) : (
                  todaysGoals.map(g => (
                    <div key={g.id} className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${g.completed ? 'bg-emerald-950/15 border-emerald-500/10 text-slate-400' : 'bg-slate-950/40 border-slate-800 text-slate-100'}`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          onClick={() => {
                            setDailyGoals(prev => prev.map(item => item.id === g.id ? { ...item, completed: !item.completed } : item));
                          }}
                          className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${g.completed ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-700 hover:border-violet-500'}`}
                        >
                          {g.completed && <Check className="w-3 h-3 stroke-[4]" />}
                        </button>
                        <span className={`text-[11px] font-bold truncate ${g.completed ? 'line-through text-slate-500' : ''}`}>{g.description}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800/60">₹{g.targetAmount}</span>
                        <button
                          onClick={() => setDailyGoals(prev => prev.filter(item => item.id !== g.id))}
                          className="text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Form column */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!newGoalDesc.trim() || !newGoalAmount.trim()) return;
              const amt = parseFloat(newGoalAmount);
              if (isNaN(amt) || amt <= 0) return;
              const newGoal: DailySavingGoal = {
                id: 'dg-' + Math.random().toString(36).substring(4),
                description: newGoalDesc.trim(),
                targetAmount: amt,
                completed: false,
                date: todayStr
              };
              setDailyGoals(prev => [...prev, newGoal]);
              setNewGoalDesc('');
              setNewGoalAmount('');
              setNotification({ message: `Configured new saving goal: "${newGoal.description}"!`, type: 'success' });
            }}
            className="lg:col-span-3 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60 flex flex-col justify-between gap-2.5"
          >
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Configure Saving Target</span>
            <input 
              type="text"
              placeholder="Save by skips..."
              value={newGoalDesc}
              onChange={(e) => setNewGoalDesc(e.target.value)}
              className="bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-violet-500 rounded-xl px-3 py-1.5 text-[11px] text-white outline-none placeholder-slate-500"
              required
            />
            <div className="relative">
              <span className="absolute left-2 top-1.5 text-[10px] text-slate-500 font-bold font-mono">₹</span>
              <input 
                type="number"
                placeholder="Target Cost"
                value={newGoalAmount}
                onChange={(e) => setNewGoalAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-violet-500 rounded-xl pl-5 pr-2 py-1.5 text-[11px] text-white outline-none placeholder-slate-500 font-mono font-bold"
                required
                min="1"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-black uppercase text-[10px] tracking-wider py-2 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Enlist Goal
            </button>
          </form>
        </div>
      </div>

      {/* DETAILED TRIP SETTLEMENT OPTIMIZATION MODAL */}
      <AnimatePresence>
        {isTripModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-850 rounded-3xl p-6 max-w-lg w-full space-y-5"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-100 flex items-center gap-1.5">
                  <Users className="w-5 h-5 text-indigo-400" /> Direct Hostel Trip Splitting Solver
                </h3>
                <button 
                  onClick={() => setIsTripModalOpen(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter individual raw net values (Positive means lent, negative means owed/due to the pool). Our optimal transactions minimizer balances the network.
                </p>

                {/* Tabular form */}
                <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-2 max-h-[140px] overflow-y-auto">
                  {tripBalances.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-200">{item.name}</span>
                      <div className="flex items-center gap-3">
                        <span className={`font-mono font-bold ${item.amount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {item.amount < 0 ? `-₹${Math.abs(item.amount)}` : `₹${item.amount}`}
                        </span>
                        <button 
                          onClick={() => setTripBalances(prev => prev.filter((_, i) => i !== idx))}
                          className="text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Inputs Row */}
                <div className="grid grid-cols-12 gap-2">
                  <input 
                    type="text"
                    placeholder="Member Name"
                    value={newTripMember}
                    onChange={(e) => setNewTripMember(e.target.value)}
                    className="col-span-6 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-white outline-none"
                  />
                  <input 
                    type="number"
                    placeholder="Net (+/-)"
                    value={newTripAmount}
                    onChange={(e) => setNewTripAmount(e.target.value)}
                    className="col-span-4 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-white outline-none font-mono font-semibold"
                  />
                  <button 
                    onClick={addTripRow}
                    className="col-span-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-center flex items-center justify-center font-bold text-xs cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {minimizedTrans.length > 0 && (
                <div className="p-3 bg-emerald-950/15 border border-emerald-500/10 rounded-2xl space-y-1.5 text-left max-h-[110px] overflow-y-auto">
                  <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider block">Simplified Optimal Transactions Matrix:</span>
                  {minimizedTrans.map((tr, i) => (
                    <p key={i} className="text-xs text-slate-300">
                      👉 <span className="font-bold text-slate-100">{tr.debtor}</span> pays <span className="text-emerald-400 font-extrabold font-mono">₹{tr.amount}</span> directly to <span className="font-bold text-slate-100">{tr.creditor}</span>
                    </p>
                  ))}
                </div>
              )}

              <div className="flex gap-2.5 pt-3 border-t border-slate-800">
                <button
                  onClick={calculateOptimizedTripDebt}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider text-center transition-all cursor-pointer"
                >
                  Minimize Balances Graph
                </button>
                <button
                  onClick={async () => {
                    const balanceMap: Record<string, number> = {};
                    tripBalances.forEach(p => balanceMap[p.name] = p.amount);
                    try {
                      await api.createGroup({
                        group_name: "Simulated Trip Group",
                        members: tripBalances.map(p => p.name),
                        balances: balanceMap
                      });
                      await fetchData();
                      setIsTripModalOpen(false);
                      setNotification({ message: 'Simulated split group synced to Anika SQLite! ', type: 'success' });
                    } catch (e: any) {
                      alert("Database sync failed: " + e.message);
                    }
                  }}
                  className="px-4 py-2.5 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider text-center cursor-pointer"
                >
                  Save Splitwise Group
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
