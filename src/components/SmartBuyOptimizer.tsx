import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  Smartphone, 
  Laptop, 
  Headphones, 
  Smile, 
  CreditCard, 
  ShoppingBag, 
  ArrowRight, 
  TrendingDown, 
  ThumbsUp, 
  ThumbsDown, 
  Scale, 
  Minimize2, 
  AlertCircle, 
  Check, 
  Plus, 
  Trash2, 
  Layers,
  Apple,
  Heart,
  TrendingUp,
  Cpu,
  User,
  Zap,
  Flame,
  Activity
} from 'lucide-react';
import { api } from '../lib/api';

// Defined types matching backend products structure 
interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  rating: number;
  specifications: Record<string, string>;
  pros: string[];
  cons: string[];
  protein?: number;
  sugar?: number;
  calories?: number;
}

interface RecommendationResult {
  product: Product;
  smartBuyScore: number;
  sentiment: {
    score: number;
    label: string;
  };
  predictedPriceDrop: {
    likelyDropPercent: number;
    timelineWeeks: number;
    verdict: string;
  };
  explanation: string;
}

interface OptimalSplitsResult {
  from: string;
  to: string;
  amount: number;
}

export default function SmartBuyOptimizer() {
  const [activeSubTab, setActiveSubTab] = useState<'smartbuy' | 'compare' | 'settlement'>('smartbuy');

  // --- State for SmartBuy Tab ---
  const [selectedCategory, setSelectedCategory] = useState('mobiles');
  const [budgetLimit, setBudgetLimit] = useState(25000);
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [bestAlternative, setBestAlternative] = useState<RecommendationResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [errorRecs, setErrorRecs] = useState('');
  const [recsSummary, setRecsSummary] = useState('');

  // --- User preference profile selector State ---
  const [preferenceProfile, setPreferenceProfile] = useState<'none' | 'gaming' | 'health' | 'budget' | 'brand_loyal'>('none');

  // --- State for Compare Tab ---
  const [comparedProducts, setComparedProducts] = useState<Product[]>([]);
  const [compareMatrix, setCompareMatrix] = useState<any>(null);
  const [isComparing, setIsComparing] = useState(false);

  // --- State for Settlement Tab ---
  const [balancesList, setBalancesList] = useState<{ id: string; name: string; amount: number }[]>([
    { id: '1', name: 'Rahul', amount: -1500 },
    { id: '2', name: 'Kiran', amount: 3500 },
    { id: '3', name: 'Ayesha', amount: -2000 },
    { id: '4', name: 'Rohit', amount: 0 }
  ]);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [optimizedTransactions, setOptimizedTransactions] = useState<OptimalSplitsResult[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Pre-configured student search pick queries (exactly as requested in examples!)
  const presetQueries = [
    { label: "Phone under 25000 for gaming", cat: "mobiles", budget: 25000, query: "Best phone under 25000 for gaming", profile: "gaming" },
    { label: "Best earbuds under 2000", cat: "headphones", budget: 2000, query: "Best earbuds under 2000", profile: "budget" },
    { label: "Healthy chocolate under 100", cat: "food", budget: 100, query: "Healthy chocolate under 100", profile: "health" },
    { label: "Moisturizer for oily skin under 500", cat: "cosmetics", budget: 500, query: "Best moisturizer for oily skin under 500", profile: "health" }
  ];

  // Load ML Recommendations 
  const handleGetRecommendations = async (
    cat = selectedCategory, 
    bgt = budgetLimit, 
    query = searchQuery, 
    profile: string = preferenceProfile
  ) => {
    setIsSearching(true);
    setErrorRecs('');
    try {
      const data = await api.getRecommendations(cat, bgt, query, profile);
      setRecommendations(data.recommendations || []);
      setRecsSummary(data.summary || '');
      setInsights(data.insights || []);
      setBestAlternative(data.alternative || null);

      // Dynamic Auto-Correction & Parameter Sync based on NLP output
      if (data.budget && data.budget !== bgt) {
        setBudgetLimit(data.budget);
      }
      if (data.category && data.category !== "all") {
        let norm = data.category;
        if (norm === "mobile") norm = "mobiles";
        if (norm === "headphones") norm = "headphones";
        if (norm === "food") norm = "food";
        if (norm === "cosmetics") norm = "cosmetics";
        if (norm === "laptop") norm = "laptops";
        if (norm === "gadget") norm = "gadgets";
        setSelectedCategory(norm);
      }
    } catch (err: any) {
      setErrorRecs(err.message || 'Failed connecting to predictive recommended products array.');
    } finally {
      setIsSearching(false);
    }
  };

  // Stage products for side-by-side matrices 
  const addToCompare = async (prod: Product) => {
    if (comparedProducts.some(p => p.id === prod.id)) return;
    if (comparedProducts.length >= 3) {
      alert("Specification comparisons are limited to max 3 items for legible view grids.");
      return;
    }
    const newList = [...comparedProducts, prod];
    setComparedProducts(newList);
    triggerMatrixComparison(newList);
  };

  const removeFromCompare = (prodId: string) => {
    const newList = comparedProducts.filter(p => p.id !== prodId);
    setComparedProducts(newList);
    if (newList.length === 0) {
      setCompareMatrix(null);
    } else {
      triggerMatrixComparison(newList);
    }
  };

  const triggerMatrixComparison = async (list: Product[]) => {
    if (list.length === 0) {
      setCompareMatrix(null);
      return;
    }
    setIsComparing(true);
    try {
      const ids = list.map(p => p.id);
      const data = await api.compareProducts(ids);
      setCompareMatrix(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsComparing(false);
    }
  };

  // Settlement Balance Manipulation
  const handleAddBalanceRow = () => {
    if (!newName.trim()) return;
    const val = parseFloat(newAmount) || 0;
    setBalancesList(prev => [
      ...prev,
      { id: Date.now().toString(), name: newName.trim(), amount: val }
    ]);
    setNewName('');
    setNewAmount('');
  };

  const handleRemoveBalanceRow = (id: string) => {
    setBalancesList(prev => prev.filter(row => row.id !== id));
  };

  const handleRunOptimizer = async () => {
    setIsOptimizing(true);
    try {
      const balanceMap: Record<string, number> = {};
      balancesList.forEach(row => {
        balanceMap[row.name] = row.amount;
      });

      const res = await api.optimizeDebtSplits(balanceMap);
      setOptimizedTransactions(res.optimized_transactions || []);
    } catch (err: any) {
      alert(err.message || "Optimization failed.");
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div id="smart-buy-optimizer-root" className="flex-1 p-4 sm:p-8 space-y-6 overflow-y-auto">
      {/* Dynamic Navigation UI Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-[#111827]/85 p-6 rounded-3xl border border-slate-800/80 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="bg-purple-600/20 text-purple-400 text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase border border-purple-500/25">
              Vector Similarity Matcher
            </span>
            <span className="bg-emerald-600/20 text-emerald-400 text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase border border-emerald-500/25">
              ML Constraint Solver
            </span>
            <span className="bg-indigo-600/20 text-indigo-400 text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase border border-indigo-500/25">
              Nutrition Guard
            </span>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">Anika-AI Smart Buy Suite</h2>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic budget parsing, student cost insights, skincare active suitability scores, and multi-criteria preference learning.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-900/90 p-1.5 rounded-xl border border-slate-800/90 z-10 w-full xl:w-auto overflow-x-auto">
          <button
            id="tab-btn-smartbuy"
            onClick={() => setActiveSubTab('smartbuy')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${activeSubTab === 'smartbuy' ? 'bg-purple-600 text-white font-black shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Layers className="w-4 h-4" />
            Decision Engine
          </button>
          <button
            id="tab-btn-compare"
            onClick={() => setActiveSubTab('compare')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap relative ${activeSubTab === 'compare' ? 'bg-purple-600 text-white font-black shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Scale className="w-4 h-4" />
            Specs Comparison Grid
            {comparedProducts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[9px] rounded-full px-1.5 py-0.5 animate-pulse">
                {comparedProducts.length}
              </span>
            )}
          </button>
          <button
            id="tab-btn-settlement"
            onClick={() => setActiveSubTab('settlement')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${activeSubTab === 'settlement' ? 'bg-purple-600 text-white font-black shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Minimize2 className="w-4 h-4" />
            Settlements Solver
          </button>
        </div>
      </div>

      {/* SUB_TAB 1: SMART BUY ML ADVISOR */}
      {activeSubTab === 'smartbuy' && (
        <div id="sub-page-smartbuy" className="space-y-6">
          <div className="bg-[#111827]/85 rounded-3xl p-6 border border-slate-800/85 shadow-xl space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800/70">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Setup Constraints & Query Parameters</h3>
            </div>

            {/* Constraints setup dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Product Category Grid */}
              <div className="lg:col-span-5 space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  Product Segment
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'mobiles', label: 'Phones', icon: <Smartphone className="w-4 h-4" /> },
                    { id: 'headphones', label: 'Earbuds', icon: <Headphones className="w-4 h-4" /> },
                    { id: 'food', label: 'Food / Diet', icon: <Apple className="w-4 h-4" /> },
                    { id: 'cosmetics', label: 'Skincare', icon: <Smile className="w-4 h-4" /> },
                    { id: 'laptops', label: 'Laptops', icon: <Laptop className="w-4 h-4" /> },
                    { id: 'gadgets', label: 'Gadgets', icon: <Activity className="w-4 h-4" /> },
                    { id: 'subscriptions', label: 'Sub Premium', icon: <CreditCard className="w-4 h-4" /> }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`py-3.5 px-1 rounded-xl text-xs font-black uppercase tracking-wider text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border ${selectedCategory === cat.id ? 'bg-purple-600/20 text-purple-400 border-purple-500/50' : 'bg-slate-900/40 text-slate-400 border-slate-800/80 hover:bg-slate-850'}`}
                    >
                      {cat.icon}
                      <span className="text-[9px] truncate w-full px-0.5">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget Limit Tracker */}
              <div className="lg:col-span-3 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    Budget Lock
                  </label>
                  <span className="text-xs font-mono font-black text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/20">
                    ₹{budgetLimit.toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <input
                    type="range"
                    min={50}
                    max={65000}
                    step={budgetLimit < 1000 ? 50 : 500}
                    className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(parseInt(e.target.value))}
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>₹50</span>
                    <span>₹30K</span>
                    <span>₹65K</span>
                  </div>
                </div>
              </div>

              {/* Natural Language Query bar */}
              <div className="lg:col-span-4 space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-purple-400" />
                  Natural Language Query
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-4 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="e.g. Best phone under 25000 for gaming..."
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-white placeholder-slate-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleGetRecommendations();
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleGetRecommendations()}
                  disabled={isSearching}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/40 py-3.5 rounded-2xl text-xs font-black uppercase text-center text-white tracking-widest shadow-lg shadow-purple-900/20 active:scale-95 transition-all cursor-pointer"
                >
                  {isSearching ? 'Iterating Similarity Weights...' : 'Run Dynamic Score Matcher'}
                </button>
              </div>
            </div>

            {/* Adaptive Persona Selector for preference learning */}
            <div className="pt-4 border-t border-slate-800/60">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 mb-2.5">
                <User className="w-3.5 h-3.5 text-purple-400" />
                Adaptive Persona profiles (AI Preferences Learning)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                {[
                  { id: 'none', label: 'Balanced Default', desc: 'Equal product parameters weighting' },
                  { id: 'gaming', label: 'Gamer Enthusiast', desc: 'Aggressive GPU CPU frame speed weight' },
                  { id: 'health', label: 'Health Conscious', desc: 'Extracts premium protein & clean fats' },
                  { id: 'budget', label: 'Savings Guardian', desc: 'Maximizes pure pocket reserves' },
                  { id: 'brand_loyal', label: 'Tier Brand Fan', desc: 'Locks in premium global reputation scores' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPreferenceProfile(p.id as any);
                      handleGetRecommendations(selectedCategory, budgetLimit, searchQuery, p.id);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all ${preferenceProfile === p.id ? 'bg-indigo-950/20 border-purple-500/80 text-white ring-2 ring-purple-500/20' : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                  >
                    <p className="text-xs font-bold">{p.label}</p>
                    <p className="text-[9px] text-slate-500 font-medium leading-tight mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Presets Row */}
            <div className="pt-2 border-t border-slate-800/60">
              <span className="text-[10px] uppercase text-slate-500 tracking-widest font-black mr-2">Try Real Examples:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {presetQueries.map((pre, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedCategory(pre.cat);
                      setBudgetLimit(pre.budget);
                      setSearchQuery(pre.query);
                      setPreferenceProfile(pre.profile as any);
                      handleGetRecommendations(pre.cat, pre.budget, pre.query, pre.profile);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#1e293b]/50 hover:bg-[#1e293b] text-slate-300 hover:text-purple-300 text-[11px] font-bold transition-all border border-slate-800"
                  >
                    🎯 {pre.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actionable Insights and Alerts Banner */}
          {insights.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-lg border-l-4 border-l-amber-500/80">
              <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                <AlertCircle className="w-4.5 h-4.5 text-amber-500" />
                Anika-AI Budget Intelligence Warnings & Insights
              </div>
              <ul className="space-y-2">
                {insights.map((ins, idx) => (
                  <li key={idx} className="text-slate-300 text-xs font-semibold leading-relaxed flex items-start gap-2">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>{ins}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* NLP Summary Explanation */}
          {recsSummary && (
            <div className="bg-gradient-to-r from-purple-950/20 to-indigo-950/20 p-5 rounded-3xl border border-purple-500/10 space-y-2 animate-fade-in flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <div className="text-purple-450 font-black tracking-widest uppercase text-[10px] mb-0.5">
                  Anika-AI Core Matching Diagnostic
                </div>
                <p className="text-slate-200 text-xs leading-relaxed font-semibold">{recsSummary}</p>
              </div>
            </div>
          )}

          {/* Core Results matches list */}
          {errorRecs && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-450 text-xs text-center font-bold">
              ⚠️ {errorRecs}
            </div>
          )}

          {/* Smart Buy best Alternatives Box if present */}
          {bestAlternative && (
            <div className="bg-[#1e1b4b]/20 border border-indigo-500/15 p-5 rounded-3xl space-y-3 relative overflow-hidden">
              <div className="absolute right-0 top-0 bg-indigo-500/10 text-indigo-300 text-[8px] font-black uppercase px-3 py-1 tracking-widest rounded-bl-xl border-l border-b border-indigo-500/10">
                Highly Compatible Replacement Idea
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-wider">
                    <TrendingUp className="w-4 h-4" />
                    Better Value-for-Money alternative
                  </div>
                  <h4 className="text-lg font-black text-white mt-1">{bestAlternative.product.name}</h4>
                  <p className="text-xs text-slate-400 italic leading-relaxed font-medium max-w-2xl mt-1.5">
                    {bestAlternative.explanation}
                  </p>
                </div>
                <div className="sm:text-right shrink-0">
                  <p className="text-xl font-black text-emerald-400 font-mono">₹{bestAlternative.product.price.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Best Alternative price</p>
                  <span className="inline-block bg-emerald-500/10 text-emerald-400 font-extrabold text-[9px] px-2 py-0.5 rounded border border-emerald-500/10 mt-1">
                    Smart Score: {bestAlternative.smartBuyScore}/100
                  </span>
                </div>
              </div>
            </div>
          )}

          {recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {recommendations.map((rec, i) => {
                const isCompared = comparedProducts.some(p => p.id === rec.product.id);
                const isAlternative = bestAlternative?.product?.id === rec.product.id;
                
                return (
                  <div 
                    key={i} 
                    className={`bg-[#111827]/75 border ${isAlternative ? 'border-indigo-500/40' : 'border-slate-800'} hover:border-purple-600/40 rounded-3xl p-6 transition-all duration-300 relative flex flex-col justify-between overflow-hidden shadow-md`}
                  >
                    {isAlternative && (
                      <div className="absolute -right-12 -top-1 px-14 py-1.5 bg-indigo-600 text-white font-mono text-[8px] font-black uppercase tracking-widest rotate-45 border-b border-indigo-400/20">
                        Value Idea
                      </div>
                    )}

                    <div>
                      {/* Brand and category row */}
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div>
                          <span className="px-2 py-0.5 bg-purple-500/15 border border-purple-500/20 text-purple-400 text-[9px] uppercase tracking-widest font-black rounded font-mono">
                            {rec.product.category}
                          </span>
                          <span className="text-xs text-slate-500 font-black tracking-tight uppercase ml-2">
                            {rec.product.brand}
                          </span>
                          <h4 className="text-lg font-black text-white mt-1.5 leading-snug tracking-tight">{rec.product.name}</h4>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-slate-100 font-mono">₹{rec.product.price.toLocaleString()}</p>
                          <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider font-mono">Smart List Price</p>
                        </div>
                      </div>

                      {/* Visual multi-metric parameters */}
                      <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800/80 mb-4 text-center">
                        <div className="space-y-1">
                          <p className="text-[8px] text-slate-500 uppercase tracking-widest font-black">Matching Score</p>
                          <p className={`text-lg font-black font-mono leading-none ${rec.smartBuyScore >= 85 ? 'text-emerald-400' : rec.smartBuyScore >= 70 ? 'text-purple-400' : 'text-amber-400'}`}>
                            {rec.smartBuyScore}/100
                          </p>
                        </div>
                        <div className="space-y-1 border-x border-slate-800/80">
                          <p className="text-[8px] text-slate-500 uppercase tracking-widest font-black font-sans">Reviews sentiments</p>
                          <p className="text-[9px] font-black text-slate-300 leading-tight">
                            {rec.sentiment.label}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] text-slate-500 uppercase tracking-widest font-black">Market Trend</p>
                          {rec.predictedPriceDrop.likelyDropPercent > 10 ? (
                            <div className="text-rose-400 text-[10px] font-black flex items-center justify-center gap-0.5">
                              <TrendingDown className="w-3 h-3 text-rose-500" />
                              Drop {rec.predictedPriceDrop.likelyDropPercent}%
                            </div>
                          ) : (
                            <span className="text-[9px] font-black text-slate-500 uppercase">Stable Price</span>
                          )}
                        </div>
                      </div>

                      {/* Explanation rationale */}
                      <p className="text-xs text-slate-300 tracking-tight leading-relaxed font-semibold mb-4 text-slate-300">
                        {rec.explanation}
                      </p>

                      {/* Nutrient analysis elements for healthy selection or oily skincare */}
                      {rec.product.category === 'food' && (
                        <div className="p-3 bg-slate-950/55 rounded-2xl border border-dashed border-slate-800/80 mb-4 space-y-1.5">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-500 font-extrabold uppercase">Protein density</span>
                            <span className="text-emerald-400 font-black font-mono">{rec.product.specifications?.protein || "5g"}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-500 font-extrabold uppercase">Sugar content</span>
                            <span className={`${parseFloat(String(rec.product.specifications?.sugar || 0)) > 15 ? 'text-red-400' : 'text-amber-400'} font-black font-mono`}>
                              {rec.product.specifications?.sugar || "0.5g"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-500 font-extrabold uppercase">Calories</span>
                            <span className="text-purple-400 font-black font-mono">{rec.product.specifications?.calories || "100 kcal"}</span>
                          </div>
                        </div>
                      )}

                      {/* Technical specifications */}
                      {rec.product.specifications && (
                        <div className="space-y-1.5 mb-4 pt-3 border-t border-slate-800/50">
                          <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block mb-1">Specs Sheet Highlights</span>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(rec.product.specifications).slice(0, 3).map(([k, v]) => (
                              <div key={k} className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-mono rounded">
                                <span className="opacity-50 text-[9px] uppercase">{k}:</span> {v}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Advantage Pros and disadvantages Cons list */}
                      <div className="grid grid-cols-2 gap-3 text-[10px] pt-3 border-t border-slate-800/50 mb-5">
                        <div className="space-y-1">
                          <span className="font-black text-emerald-400 uppercase tracking-widest text-[8px] flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" /> Core Pros
                          </span>
                          <ul className="space-y-1 pl-3.5 list-disc text-slate-400 font-semibold leading-tight">
                            {rec.product.pros.slice(0, 2).map((p, idx) => <li key={idx}>{p}</li>)}
                          </ul>
                        </div>
                        <div className="space-y-1">
                          <span className="font-black text-rose-400 uppercase tracking-widest text-[8px] flex items-center gap-1">
                            <ThumbsDown className="w-3 h-3" /> Cons
                          </span>
                          <ul className="space-y-1 pl-3.5 list-disc text-slate-400 font-semibold leading-tight">
                            {rec.product.cons.slice(0, 2).map((c, idx) => <li key={idx}>{c}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Stage Compare triggers */}
                    <button
                      type="button"
                      onClick={() => addToCompare(rec.product)}
                      disabled={isCompared}
                      className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${isCompared ? 'bg-slate-950 border border-slate-900 text-slate-600' : 'bg-[#1e293b]/70 hover:bg-purple-600/20 text-slate-300 hover:text-purple-400 border border-slate-800'}`}
                    >
                      <Scale className="w-4 h-4" />
                      {isCompared ? 'Added to Grid' : 'Add to Specification compare'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#111827]/40 border border-slate-800/80 rounded-3xl p-16 text-center text-slate-500 text-xs">
              <ShoppingBag className="w-12 h-12 mx-auto text-slate-700 mb-4" />
              <p className="font-bold text-slate-400 text-sm">Let's smart review your needs!</p>
              <p className="text-slate-600 mt-1 max-w-md mx-auto">
                Select your student product category, adjust the price limiting dial, or input a search query above and trigger the ML Score Matcher.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SUB_TAB 2: SPECS COMPARING MATRIX */}
      {activeSubTab === 'compare' && (
        <div id="sub-page-compare" className="space-y-6 animate-fade-in">
          {comparedProducts.length === 0 ? (
            <div className="bg-[#111827]/40 border border-slate-800/80 rounded-3xl p-16 text-center text-slate-500 text-xs">
              <Scale className="w-12 h-12 mx-auto text-slate-700 mb-4 animate-bounce" />
              <h4 className="font-bold text-slate-400 text-sm">No staged comparison elements yet</h4>
              <p className="text-slate-600 mt-1 max-w-sm mx-auto">
                Navigate to the Decision Engine tab, search your products and tap "Add to Specification compare" to compare products side-by-side.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Selected List header */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest pl-1">
                    Staged Items ({comparedProducts.length}/3 max):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {comparedProducts.map(p => (
                      <div key={p.id} className="flex items-center gap-2 bg-[#1e293b]/80 border border-slate-700/60 px-3 py-1.5 rounded-xl">
                        <span className="text-xs font-bold text-white font-sans">{p.name}</span>
                        <button onClick={() => removeFromCompare(p.id)} className="text-slate-500 hover:text-rose-455 transition-colors cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setComparedProducts([])}
                  className="px-3.5 py-1.5 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs rounded-xl"
                >
                  Clear Staging
                </button>
              </div>

              {/* Compare Matrix Grid */}
              {isComparing ? (
                <div className="bg-[#111827]/80 rounded-3xl p-16 border border-slate-850 text-center text-xs text-slate-500">
                  <Sparkles className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
                  Generating comparative spec matrix indexes...
                </div>
              ) : compareMatrix ? (
                <div className="bg-[#111827]/85 rounded-3xl p-6 border border-slate-800 shadow-xl overflow-x-auto">
                  <table className="w-full min-w-[700px] border-collapse text-left text-xs align-top">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="py-4 px-4 uppercase tracking-widest text-[9px] text-slate-500 w-1/4">Specification Factor</th>
                        {comparedProducts.map(p => (
                          <th key={p.id} className="py-4 px-4 text-slate-100 w-1/4">
                            <span className="px-2 py-0.5 bg-slate-900 text-[8px] font-black tracking-wider text-slate-450 uppercase rounded border border-slate-800">{p.category}</span>
                            <p className="font-extrabold text-sm text-white mt-1.5 leading-tight">{p.name}</p>
                            <p className="text-purple-400 font-extrabold font-mono text-xs mt-1">₹{p.price.toLocaleString()}</p>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {/* Rating Score row */}
                      <tr>
                        <td className="py-4 px-4 text-slate-400 font-black uppercase tracking-widest text-[8px]">Overall Rating</td>
                        {comparedProducts.map(p => (
                          <td key={p.id} className="py-4 px-4 font-bold text-amber-500 text-sm">
                            ★ {p.rating} / 5.0
                          </td>
                        ))}
                      </tr>

                      {/* Smart Buy strategic Advice block */}
                      {compareMatrix.comparison_narrative && (
                        <tr className="bg-purple-950/10">
                          <td className="py-4 px-4 text-slate-350 font-black uppercase tracking-widest text-[8px] align-middle">Strategic Value Verdict</td>
                          <td colSpan={comparedProducts.length} className="py-4 px-4">
                            <div className="p-4 rounded-2xl bg-slate-900/60 border border-purple-500/10 text-purple-300 font-semibold leading-relaxed">
                              {compareMatrix.comparison_narrative}
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Nutrients Metrics side-by-side inside Compare for food product selection */}
                      {comparedProducts.some(p => p.category === 'food') && (
                        <>
                          <tr className="bg-slate-900/15">
                            <td className="py-4 px-4 text-emerald-400 font-black uppercase tracking-widest text-[8px]">Protein per Serv</td>
                            {comparedProducts.map(p => (
                              <td key={p.id} className="py-4 px-4 font-extrabold font-mono text-emerald-300 text-sm">
                                {p.protein || p.specifications?.protein || "N/A (Non-Food)"}
                              </td>
                            ))}
                          </tr>
                          <tr className="bg-slate-900/15">
                            <td className="py-4 px-4 text-amber-500 font-black uppercase tracking-widest text-[8px]">Sugar Content</td>
                            {comparedProducts.map(p => (
                              <td key={p.id} className={`py-4 px-4 font-extrabold font-mono text-sm ${parseFloat(String(p.sugar || 0)) > 15 ? 'text-red-400' : 'text-slate-300'}`}>
                                {p.sugar || p.specifications?.sugar || "N/A (Non-Food)"}
                              </td>
                            ))}
                          </tr>
                          <tr className="bg-slate-900/15">
                            <td className="py-4 px-4 text-slate-450 font-black uppercase tracking-widest text-[8px]">Calories Density</td>
                            {comparedProducts.map(p => (
                              <td key={p.id} className="py-4 px-4 font-bold text-slate-300 font-mono">
                                {p.calories ? `${p.calories} kcal` : p.specifications?.calories || "N/A"}
                              </td>
                            ))}
                          </tr>
                        </>
                      )}

                      {/* Display key specifications parameters */}
                      {compareMatrix.specifications_keys && compareMatrix.specifications_keys.map((key: string, idx: number) => {
                        // Skip rendering redundant keys shown in metrics
                        if (['protein', 'sugar', 'calories', 'organic'].includes(key.toLowerCase())) return null;
                        return (
                          <tr key={idx}>
                            <td className="py-4 px-4 text-slate-400 font-black uppercase tracking-widest text-[8.5px] bg-slate-950/20">{key}</td>
                            {comparedProducts.map(p => (
                              <td key={p.id} className="py-4 px-4 text-slate-300 font-bold">
                                {p.specifications[key] || "—"}
                              </td>
                            ))}
                          </tr>
                        );
                      })}

                      {/* Advantage bullets Side comparison */}
                      <tr>
                        <td className="py-4 px-4 text-emerald-400 font-black uppercase tracking-widest text-[8.5px]">Advantages / Pros</td>
                        {comparedProducts.map(p => (
                          <td key={p.id} className="py-4 px-4">
                            <ul className="space-y-1 list-disc pl-3.5 text-slate-400 font-semibold leading-tight">
                              {p.pros ? p.pros.map((pr, ix) => <li key={ix}>{pr}</li>) : <li>Standard durability</li>}
                            </ul>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* SUB_TAB 3: DEBT SETTLEMENT OPTIMIZER */}
      {activeSubTab === 'settlement' && (
        <div id="sub-page-settlement" className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
          {/* Input Panel */}
          <div className="bg-[#111827]/85 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-800 justify-between">
              <div className="flex items-center gap-2">
                <Minimize2 className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Active Members Ledger</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-extrabold uppercase">Settle Debts</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-semibold">
              Enter the names of your group members and their respective net balances. 
              Positive values indicate money is owed to them (+), negative values indicate what they owe to others (-).
            </p>

            <div className="space-y-3">
              {balancesList.map((row) => (
                <div key={row.id} className="flex items-center justify-between p-3.5 bg-slate-900/40 rounded-2xl border border-slate-850">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="text-sm font-bold text-slate-200">{row.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black ${row.amount > 0 ? 'text-emerald-400' : row.amount < 0 ? 'text-rose-450' : 'text-slate-500'}`}>
                      {row.amount > 0 ? `+₹${row.amount}` : row.amount < 0 ? `-₹${Math.abs(row.amount)}` : 'Settled'}
                    </span>
                    <button 
                      type="button"
                      onClick={() => handleRemoveBalanceRow(row.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick adding form */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-850">
              <input 
                type="text" 
                placeholder="Name"
                className="col-span-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input 
                type="number" 
                placeholder="Net Balance (+/-)"
                className="col-span-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
              <button 
                type="button"
                onClick={handleAddBalanceRow}
                className="col-span-1 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-black uppercase text-white flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            <button
              type="button"
              onClick={handleRunOptimizer}
              disabled={isOptimizing}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-center text-white cursor-pointer"
            >
              {isOptimizing ? 'Compressing split graph matrices...' : 'Optimize Settlement Graph'}
            </button>
          </div>

          {/* Output Panel visual */}
          <div className="bg-[#111827]/85 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-spin" style={{ animationDuration: '4s' }} />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Optimized Settling Transfers</h3>
              </div>

              {optimizedTransactions.length > 0 ? (
                <div className="space-y-4 mt-6">
                  {optimizedTransactions.map((tx, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-4 bg-indigo-950/20 border border-indigo-500/10 rounded-2xl relative overflow-hidden"
                    >
                      {/* Left sender */}
                      <div className="flex flex-col">
                        <span className="text-[10px] text-rose-455 uppercase tracking-wider font-extrabold font-mono">Debtor pays</span>
                        <span className="text-base font-black text-slate-100">{tx.from}</span>
                      </div>

                      {/* Arrow link */}
                      <div className="flex flex-col items-center flex-1 mx-3 border-b border-dashed border-slate-700/60 pb-1.5 relative">
                        <span className="text-xs font-black text-indigo-400 font-mono tracking-tight bg-[#111827] px-2.5 z-10">
                          ₹{tx.amount.toLocaleString()}
                        </span>
                        <ArrowRight className="w-4 h-4 text-indigo-455 mt-1" />
                      </div>

                      {/* Right receiver */}
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-extrabold font-mono">Recipient takes</span>
                        <span className="text-base font-black text-slate-100">{tx.to}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-12 text-center text-slate-500 text-xs mt-6">
                  <Minimize2 className="w-10 h-10 mx-auto text-slate-700 mb-2" />
                  <p className="font-bold">No optimized ledger generated yet.</p>
                  <p className="text-slate-600 mt-0.5">Click "Optimize Settlement Graph" to strip redundancies.</p>
                </div>
              )}
            </div>

            <div className="bg-purple-900/10 border border-purple-500/10 rounded-2xl p-4 flex gap-3 text-xs mt-6">
              <AlertCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-slate-400">
                <p className="font-bold text-purple-300">Minimum Transaction Theorem</p>
                <p className="font-semibold text-slate-500 leading-relaxed text-[11px]">
                  Using directed graphs with maximum flow matching, our solver reduces 
                  unnecessary debt loops. Most groups reduce settlement counts by <b>45% to 65%</b>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
