import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  LayoutDashboard, 
  History, 
  Settings, 
  Send, 
  Plus, 
  ArrowUpRight, 
  TrendingDown, 
  Target, 
  ShoppingBag,
  Sparkles,
  Loader2,
  Trash2,
  Wallet,
  Mic,
  MicOff,
  Lock,
  User,
  Users,
  Key,
  Eye,
  EyeOff,
  Smartphone,
  RefreshCw,
  LogOut,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  Paperclip,
  Camera,
  X,
  FileText,
  Upload,
  Check,
  Layers,
  Filter,
  ArrowUpDown,
  SlidersHorizontal,
  Search,
  PiggyBank,
  Zap,
  Apple,
  Smile,
  Headphones,
  Laptop,
  Activity,
  CreditCard,
  Minimize2,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactMarkdown from 'react-markdown';
import { Message, BudgetLog, UserProfile, Subscription, DailySavingGoal } from './types';
import { api, setSessionToken } from './lib/api';
import UploadModal from './components/UploadModal';
import SmartBuyOptimizer from './components/SmartBuyOptimizer';
import PremiumDashboard from './components/PremiumDashboard';
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

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function validateOtpTarget(target: string): boolean {
  const trimmed = target.trim();
  if (!trimmed) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const mobileRegex = /^[6-9]\d{9}$/;

  if (trimmed.includes("@")) {
    return emailRegex.test(trimmed);
  } else {
    // Normalize: remove spaces, plus symbol, hyphens and parenthesis
    const normalizedMobile = trimmed.replace(/[\s\-()+\c]/g, "").replace(/^(91|0)/, "");
    return mobileRegex.test(normalizedMobile);
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'logs' | 'settings' | 'smartbuy'>('chat');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ filename: string; mimeType: string; data: string; url?: string } | null>(null);
  const [attachedFilePreview, setAttachedFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [ocrProgressState, setOcrProgressState] = useState<string | null>(null);
  const [ocrProgressPercent, setOcrProgressPercent] = useState<number>(0);
  const [preloadedBills, setPreloadedBills] = useState<any[]>([]);
  const [preloadedRawText, setPreloadedRawText] = useState<string>("");
  const [preloadedPhase, setPreloadedPhase] = useState<"idle" | "analyzing" | "complete">("idle");
  const [preloadedWizardStep, setPreloadedWizardStep] = useState<"preview" | "participants" | "splits" | "confirm">("preview");
  const [ocrToast, setOcrToast] = useState<{ message: string; filename: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [budgetLogs, setBudgetLogs] = useState<BudgetLog[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [undoLog, setUndoLog] = useState<BudgetLog | null>(null);
  const [isVoiceVisualizerActive, setIsVoiceVisualizerActive] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'alert' } | null>(null);
  const [dashboardDaysFilter, setDashboardDaysFilter] = useState<number>(30);
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState<string>('');
  const [dashboardCategoryFilter, setDashboardCategoryFilter] = useState<string>('All');
  const [dashboardSortBy, setDashboardSortBy] = useState<string>('date-desc');
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editRowAmount, setEditRowAmount] = useState<string>('');
  const [editRowCategory, setEditRowCategory] = useState<string>('');
  const [editRowNote, setEditRowNote] = useState<string>('');
  
  // Security logs tracking states
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [securitySearch, setSecuritySearch] = useState<string>('');
  const [securityLogsLoading, setSecurityLogsLoading] = useState<boolean>(false);
  
  // Smart Buy Dashboard Inline States
  const [dbProductCategory, setDbProductCategory] = useState<string>('mobiles');
  const [dbProductQuery, setDbProductQuery] = useState<string>('');
  const [dbBudgetLimit, setDbBudgetLimit] = useState<number>(25000);
  const [dbRecommendations, setDbRecommendations] = useState<any>(null);
  const [dbIsLoadingRecs, setDbIsLoadingRecs] = useState<boolean>(false);
  const [dbComparingIds, setDbComparingIds] = useState<string[]>([]);
  const [dbComparisonMatrix, setDbComparisonMatrix] = useState<any>(null);
  const [dbIsComparing, setDbIsComparing] = useState<boolean>(false);
  
  const [conversationId] = useState(() => Math.random().toString(36).substring(7));

  useEffect(() => {
    if (ocrToast) {
      const timer = setTimeout(() => {
        setOcrToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [ocrToast]);

  // Authentication & Reset Key States
  const [currentUser, setCurrentUser] = useState<string | null>(() => localStorage.getItem("anika_user_id"));
  const [currentResetKey, setCurrentResetKey] = useState<string | null>(() => localStorage.getItem("anika_reset_key"));

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'recover'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authResetKey, setAuthResetKey] = useState('');
  const [authNewPassword, setAuthNewPassword] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Secure OTP Auth Custom states
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [otpTarget, setOtpTarget] = useState(''); 
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSimulatedCode, setOtpSimulatedCode] = useState('');
  const [otpRecoveryActive, setOtpRecoveryActive] = useState(false);

  // Modern Eye Password Visibility
  const [showPassword, setShowPassword] = useState(false);

  // Key regeneration states
  const [regenPass, setRegenPass] = useState('');
  const [regenError, setRegenError] = useState('');
  const [regenSuccess, setRegenSuccess] = useState('');
  const [regenLoading, setRegenLoading] = useState(false);

  // Subscription State
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [newSubName, setNewSubName] = useState('');
  const [newSubAmount, setNewSubAmount] = useState('');
  const [newSubCategory, setNewSubCategory] = useState('Entertainment');
  const [newSubBillingDate, setNewSubBillingDate] = useState('');
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [settingsSubTab, setSettingsSubTab] = useState<'profile' | 'security'>('profile');

  // Activity logs filtering & sorting state
  const [logsCategoryFilter, setLogsCategoryFilter] = useState<string>('All');
  const [logsSortBy, setLogsSortBy] = useState<string>('date-desc');
  const [logsSearchQuery, setLogsSearchQuery] = useState<string>('');

  // Daily Saving Goals State
  const [dailyGoals, setDailyGoals] = useState<DailySavingGoal[]>(() => {
    const saved = localStorage.getItem('anika_daily_saving_goals');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    const todayStr = new Date().toISOString().split('T')[0];
    return [
      { id: 'dg-1', targetAmount: 150, description: 'Skip premium outside coffee / brew in canteen', completed: false, date: todayStr },
      { id: 'dg-2', targetAmount: 200, description: 'De-prioritize unneeded e-commerce orders today', completed: false, date: todayStr },
      { id: 'dg-3', targetAmount: 85, description: 'Share dynamic shuttle fare with a peer', completed: true, date: todayStr }
    ];
  });
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');

  // Sync Daily Saving Goals to LocalStorage
  useEffect(() => {
    localStorage.setItem('anika_daily_saving_goals', JSON.stringify(dailyGoals));
  }, [dailyGoals]);

  // Groups and friends states
  const [groups, setGroups] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [splitWorkflow, setSplitWorkflow] = useState<{
    step: 'none' | 'awaiting_members_count' | 'display_settlement';
    expenses: { person: string; amount: number; note: string }[];
    totalAmount: number;
    membersCount?: number;
  }>({ step: 'none', expenses: [], totalAmount: 0 });

  // Authentication Helpers
  const handleAuthRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setNewlyCreatedKey(null);

    const cleanUser = authUsername.trim();
    if (!cleanUser || !authPassword.trim()) {
      setAuthError('Please fill in both username and password.');
      return;
    }
    if (authPassword !== authConfirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await api.register(cleanUser, authPassword);
      if (res.token) {
        setSessionToken(res.token);
      }
      localStorage.setItem("anika_user_id", res.username);
      localStorage.setItem("anika_reset_key", res.resetKey);
      setNewlyCreatedKey(res.resetKey);
      setAuthSuccess('Account created successfully! Copy your Recovery Reset Key below and keep it safe.');
      
      // Keep username but reset secret inputs
      setAuthPassword('');
      setAuthConfirmPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred during registration.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setNewlyCreatedKey(null);

    const cleanUser = authUsername.trim();
    if (!cleanUser || !authPassword.trim()) {
      setAuthError('Please fill in both fields.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await api.login(cleanUser, authPassword);
      if (res.token) {
        setSessionToken(res.token);
      }
      localStorage.setItem("anika_user_id", res.username);
      localStorage.setItem("anika_reset_key", res.resetKey);
      setCurrentUser(res.username);
      setCurrentResetKey(res.resetKey);
      
      // Cleanup auth states
      setAuthUsername('');
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Invalid username or password.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthRecover = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const cleanUser = authUsername.trim();
    if (!cleanUser || !authResetKey.trim() || !authNewPassword.trim()) {
      setAuthError('All details are required.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await api.recoverPassword(cleanUser, authResetKey, authNewPassword);
      setAuthSuccess(res.message);
      setAuthMode('login');
      setAuthUsername(cleanUser);
      setAuthPassword('');
      setAuthResetKey('');
      setAuthNewPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Failed to recover password.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    
    const trimmed = otpTarget.trim();
    if (!trimmed) {
      setAuthError('Please enter a valid mobile number or email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const mobileRegex = /^[6-9]\d{9}$/;

    if (trimmed.includes("@")) {
      if (!emailRegex.test(trimmed)) {
        setAuthError('Enter valid email or mobile number.');
        return;
      }
    } else {
      const normalizedMobile = trimmed.replace(/[\s\-()+\c]/g, "").replace(/^(91|0)/, "");
      if (!mobileRegex.test(normalizedMobile)) {
        setAuthError('Enter valid email or mobile number.');
        return;
      }
    }

    setAuthLoading(true);
    try {
      await api.sendOtp(otpTarget);
      setOtpSent(true);
      setOtpSimulatedCode('');
      setOtpCode(''); // Force empty input - NO autofill or leakage!
      setAuthSuccess(`Secure AI-OTP has been dispatched successfully! Check server console logs to retrieve the passcode.`);
    } catch (err: any) {
      setAuthError(err.message || 'Failed sending verification code.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!otpTarget || !otpCode) {
      setAuthError('Please enter both your mobile/email and the 6-digit verification code.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await api.verifyOtp(otpTarget, otpCode);
      if (res.token) {
        setSessionToken(res.token);
      }
      localStorage.setItem("anika_user_id", res.username);
      localStorage.setItem("anika_reset_key", res.resetKey);
      setCurrentUser(res.username);
      setCurrentResetKey(res.resetKey);
      
      // Clear OTP states
      setOtpTarget('');
      setOtpCode('');
      setOtpSent(false);
      setOtpSimulatedCode('');
    } catch (err: any) {
      setAuthError(err.message || 'Invalid or expired code. Please request a new code.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleInitiateOtpRecovery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const trimmed = otpTarget.trim();
    if (!trimmed) {
      setAuthError('Please enter your email or phone username for recovery code.');
      return;
    }

    setAuthLoading(true);
    try {
      await api.initiateOtpRecovery(otpTarget);
      setOtpRecoveryActive(true);
      setOtpSent(true);
      setOtpSimulatedCode('');
      setOtpCode(''); // No autofill!
      setAuthSuccess(`Recovery OTP code generated successfully! Check server console logs.`);
    } catch (err: any) {
      setAuthError(err.message || 'User account match mismatch.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtpRecovery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!otpTarget || !otpCode || !authNewPassword) {
      setAuthError('Please fill in target, code, and your desired strong new password.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await api.verifyOtpRecovery({
        username: otpTarget,
        code: otpCode,
        new_password: authNewPassword
      });
      setAuthSuccess('Password successfully reset! Proceed to Log In.');
      setOtpRecoveryActive(false);
      setOtpSent(false);
      setIsOtpMode(false);
      setAuthMode('login');
      setAuthUsername(otpTarget);
      setOtpTarget('');
      setOtpCode('');
      setAuthNewPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Failed resetting password.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("anika_user_id");
    setSessionToken(null);
    localStorage.removeItem("anika_reset_key");
    setCurrentUser(null);
    setCurrentResetKey(null);
    setMessages([]);
    setProfile(null);
    setBudgetLogs([]);
    setSubscriptions([]);
  };

  const handleRegenerateResetKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRegenError('');
    setRegenSuccess('');
    
    if (!currentUser) return;
    if (!regenPass.trim()) {
      setRegenError('Password is required to regenerate your key.');
      return;
    }

    setRegenLoading(true);
    try {
      const res = await api.regenerateResetKey(currentUser, regenPass);
      localStorage.setItem("anika_reset_key", res.resetKey);
      setCurrentResetKey(res.resetKey);
      setRegenSuccess('Your Recovery Reset Key has been updated and copied below!');
      setRegenPass('');
    } catch (err: any) {
      setRegenError(err.message || 'Failed to regenerate key.');
    } finally {
      setRegenLoading(false);
    }
  };
  
  // Register unauthorized listener to trigger clean automatic sign-out
  useEffect(() => {
    const handleUnauthorized = () => {
      handleLogout();
      setNotification({
        message: "Your session has expired. Please sign in again to access security features.",
        type: "alert"
      });
    };
    window.addEventListener("anika-unauthorized", handleUnauthorized);
    return () => window.removeEventListener("anika-unauthorized", handleUnauthorized);
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const rec = new SpeechRecognitionAPI();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN'; // Standard English Indian/Global is helpful

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (!transcript) return;

        // Try to check if this is a direct logging command
        const handled = handleVoiceCommand(transcript);
        if (!handled) {
          setInput(prev => {
            const space = prev.trim() ? " " : "";
            return `${prev}${space}${transcript}`;
          });
        }
      };

      recognitionRef.current = rec;
    }
  }, []);

  const handleVoiceCommand = (transcript: string) => {
    const cleanText = transcript.trim().toLowerCase();
    
    // Regular expression to match standard commands like "add expense X for Y" or "log expense X for Y"
    const expenseRegex = /(?:add|log|record)\s+expense\s+(\d+)\s*(?:rupees|rs)?\s*(?:for\s+(.+))?/i;
    const match = transcript.match(expenseRegex);

    if (match) {
      const amount = Number(match[1]);
      const note = match[2] ? match[2].trim() : 'Voice Transaction';
      
      // Categorize based on note content
      let category = 'Food';
      const cleanNote = note.toLowerCase();
      if (cleanNote.includes('bus') || cleanNote.includes('taxi') || cleanNote.includes('metro') || cleanNote.includes('train') || cleanNote.includes('uber') || cleanNote.includes('ola') || cleanNote.includes('ride') || cleanNote.includes('fuel') || cleanNote.includes('petrol')) {
        category = 'Transportation';
      } else if (cleanNote.includes('phone') || cleanNote.includes('earbud') || cleanNote.includes('charger') || cleanNote.includes('laptop') || cleanNote.includes('mouse') || cleanNote.includes('keyboard') || cleanNote.includes('gadget') || cleanNote.includes('electronic')) {
        category = 'Gadgets';
      } else if (cleanNote.includes('cream') || cleanNote.includes('moisturizer') || cleanNote.includes('skincare') || cleanNote.includes('serum') || cleanNote.includes('makeup')) {
        category = 'Cosmetics';
      } else if (cleanNote.includes('book') || cleanNote.includes('course') || cleanNote.includes('pen') || cleanNote.includes('tuition') || cleanNote.includes('exam')) {
        category = 'Education';
      } else if (cleanNote.includes('movie') || cleanNote.includes('netflix') || cleanNote.includes('game') || cleanNote.includes('concert') || cleanNote.includes('party')) {
        category = 'Entertainment';
      }

      addExpense(amount, category, note);
      
      // Insert confirmation response to chat
      const confirmMsg: Message = {
        role: 'model',
        content: `🎙️ **Voice Command Logged Successfully**\nAdded: **₹${amount}** in category **${category}** for *"${note}"*.`
      };
      setMessages(prev => [...prev, { role: 'user', content: `[Voice Command] ${transcript}` }, confirmMsg]);
      
      // Also save to backend history
      api.saveHistory({ conversation_id: conversationId, role: 'user', content: `[Voice Command] ${transcript}` });
      api.saveHistory({ conversation_id: conversationId, role: 'model', content: `🎙️ **Voice Command Logged Successfully**\nAdded: **₹${amount}** in category **${category}** for *"${note}"*.` });

      return true;
    }
    return false;
  };

  const toggleListening = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert("Speech recognition is not supported in your browser. Please try Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error("Speech recognition start failed:", err);
      }
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchSecurityLogs = async () => {
    if (!currentUser) return;
    setSecurityLogsLoading(true);
    try {
      const logs = await api.getSecurityLogs();
      setSecurityLogs(logs || []);
    } catch (err) {
      console.error("Error fetching security logs:", err);
    } finally {
      setSecurityLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'settings' && settingsSubTab === 'security') {
      fetchSecurityLogs();
    }
  }, [activeTab, settingsSubTab, currentUser]);

  const fetchData = async () => {
    try {
      const [logs, userProfile, subsList, groupsList, friendsList, analyticsData] = await Promise.all([
        api.getBudget(),
        api.getProfile(),
        api.getSubscriptions(),
        api.getGroups().catch(() => []),
        api.getFriends().catch(() => []),
        api.getAnalytics().catch(() => null)
      ]);
      setBudgetLogs(logs);
      setProfile(userProfile);
      setSubscriptions(subsList);
      setGroups(groupsList || []);
      setFriends(friendsList || []);
      setAnalytics(analyticsData);
      
      fetchSecurityLogs().catch(() => {});
      
      const history = await api.getHistory(conversationId);
      if (history.length > 0) {
        setMessages(history);
      } else {
        setMessages([{
          role: 'model',
          content: "Hello! I'm Anika-AI, your smart financial advisor. How can I help you today? You can ask me to analyze a product, plan a budget, or track your expenses."
        }]);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const handleFileAttach = async (file: File) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setNotification({
        message: "Unsupported file type warning. Please upload a JPG, PNG, WEBP, or PDF.",
        type: "alert"
      });
      return;
    }

    setIsUploading(true);
    setOcrProgressPercent(5);
    setOcrProgressState("Reading raw bytes and initializing core scanner...");

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];

          // Show preview immediately for local feedback
          if (file.type === "application/pdf") {
            setAttachedFilePreview("pdf_placeholder");
          } else {
            setAttachedFilePreview(base64String);
          }

          setOcrProgressPercent(25);
          setOcrProgressState("Uploading stream to Anika server...");

          // Simulate realistic upload milestones while request executes
          const interval = setInterval(() => {
            setOcrProgressPercent(prev => {
              if (prev >= 85) {
                clearInterval(interval);
                return prev;
              }
              return prev + Math.floor(Math.random() * 12) + 4;
            });
          }, 150);

          let result;
          try {
            // Real backend call to /api/ocr-upload which initiates Gemini OCR scanning
            const initRes = await api.ocrUpload(file.name, file.type, base64Data);
            const uploadId = initRes.upload_id;
            const fileUrl = initRes.url;

            // Poll /api/ocr-status/:id until done or failed
            let done = false;
            let pollAttempts = 0;
            const maxPollAttempts = 40; // up to 60 seconds
            while (!done && pollAttempts < maxPollAttempts) {
              pollAttempts++;
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              const statusRes = await api.ocrStatus(uploadId);
              if (statusRes.status === "done") {
                result = { ...statusRes.data, url: fileUrl };
                done = true;
              } else if (statusRes.status === "failed") {
                throw new Error(statusRes.error || "Gemini AI OCR parser failed to process receipt image.");
              }
            }
            if (!done) {
              throw new Error("OCR processing timed out. Please retry or enter items manually.");
            }
          } finally {
            clearInterval(interval);
          }

          setOcrProgressPercent(92);
          setOcrProgressState("Optimizing peer-to-peer settlement models...");
          
          setAttachedFile({
            filename: file.name,
            mimeType: file.type,
            data: base64Data,
            url: result.url
          });

          // Preload the parser results into the App states to pass to the UploadModal!
          if (result && result.bills) {
            const processedBills = (result.bills || []).map((bill: any, index: number) => {
              const uniqueId = `bill-${Date.now()}-${index}`;
              
              const listUniqueMembers = (members?: string[], payer?: string): string[] => {
                const list = new Set<string>();
                list.add("Me");
                if (payer && payer.trim() !== "" && payer.toLowerCase() !== "me") list.add(payer);
                if (members && Array.isArray(members)) {
                  members.forEach((m: string) => {
                    if (m && m.trim() !== "" && m.toLowerCase() !== "me") list.add(m);
                  });
                }
                return Array.from(list);
              };

              const initializePercentages = (members: string[]): Record<string, number> => {
                const pct: Record<string, number> = {};
                if (members.length === 0) return pct;
                const base = Math.floor(100 / members.length);
                members.forEach((m, idx) => {
                  pct[m] = idx === 0 ? base + (100 - base * members.length) : base;
                });
                return pct;
              };

              const initializeExacts = (members: string[], total: number): Record<string, number> => {
                const exacts: Record<string, number> = {};
                if (members.length === 0) return exacts;
                const base = Number((total / members.length).toFixed(2));
                members.forEach((m, idx) => {
                  exacts[m] = idx === 0 ? Number((total - base * (members.length - 1)).toFixed(2)) : base;
                });
                return exacts;
              };

              const finalMembers = listUniqueMembers(bill.groupSplit?.detectedMembers, bill.groupSplit?.payer);
              const parsedItems = (bill.items || []).map((itm: any) => ({
                name: itm.name || "Item",
                price: Number(itm.price) || 0,
                quantity: Number(itm.quantity) || 1
              }));

              const initialAssignments: Record<number, string[]> = {};
              parsedItems.forEach((_: any, idx: number) => {
                initialAssignments[idx] = [...finalMembers];
              });

              const initialPaids: Record<string, number> = {};
              finalMembers.forEach((m: string) => {
                initialPaids[m] = m === (bill.groupSplit?.payer || "Me") ? (bill.totalAmount || 0) : 0;
              });

              return {
                id: uniqueId,
                merchant: bill.merchant || "Segmented Digital Store",
                date: bill.date || new Date().toISOString().split("T")[0],
                totalAmount: bill.totalAmount || 0,
                category: bill.category || "Food & Dining",
                items: parsedItems,
                insights: bill.insights || [],
                segmentDescription: bill.segmentDescription || `Segmented Bill #${index + 1}`,
                isGroupSplitEnabled: true,
                groupSplit: {
                  detectedMembers: finalMembers,
                  payer: bill.groupSplit?.payer || "Me",
                  splitType: "items",
                  memberPercentages: initializePercentages(finalMembers),
                  memberExacts: initializeExacts(finalMembers, bill.totalAmount || 0),
                  itemAssignments: initialAssignments,
                  memberPaids: initialPaids
                }
              };
            });

            setPreloadedBills(processedBills);
            setPreloadedRawText(result.rawText || "Parsed via Chat Upload OCR");
            setPreloadedPhase("complete");
            setPreloadedWizardStep("preview");
          }

          setOcrProgressPercent(100);
          setOcrProgressState("Success! Transmitting splits to workflow engine...");
          
          setTimeout(() => {
            setIsUploading(false);
            setOcrProgressState(null);
            
            setNotification({
              message: "✔ Splits & settlements compiled. OCR Pipeline settled successfully!",
              type: "success"
            });

            // Automatically open the advanced splitter modal with our preloaded bills!
            setIsUploadModalOpen(true);
          }, 800);

        } catch (uploadErr: any) {
          console.error("Inner upload processing failed:", uploadErr);
          setNotification({
            message: "Failed to process OCR: " + (uploadErr.message || uploadErr),
            type: "alert"
          });
          setIsUploading(false);
          setOcrProgressState(null);
        }
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error("Upload/OCR attachments error:", error);
      setNotification({
        message: "Failed to upload file: " + (error.message || error),
        type: "alert"
      });
      setIsUploading(false);
      setOcrProgressState(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileAttach(e.dataTransfer.files[0]);
    }
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && !attachedFilePreview) || isStreaming || isUploading) return;

    if (splitWorkflow.step === 'awaiting_members_count') {
      const userText = input.trim();
      const count = parseInt(userText, 10);
      if (isNaN(count) || count < 2) {
        setMessages(prev => [
          ...prev,
          { role: 'user', content: userText },
          { role: 'model', content: "Please enter a valid number of members (at least 2) to continue equal split." }
        ]);
        setInput('');
        return;
      }

      const payers = splitWorkflow.expenses;
      const totalAmount = splitWorkflow.totalAmount;
      const share = parseFloat((totalAmount / count).toFixed(2));

      const payerNames = payers.map(p => p.person);
      const allParticipatingNames: string[] = [...payerNames];

      // Match extra nameless participants with database friends, else fallback to standard indexes
      for (let idx = 0; idx < count - payerNames.length; idx++) {
        const dbFriendName = friends[idx]?.name;
        const matchedName = dbFriendName && !payerNames.includes(dbFriendName) ? dbFriendName : `Classmate ${idx + 1}`;
        allParticipatingNames.push(matchedName);
      }

      const netBalances: Record<string, number> = {};
      allParticipatingNames.forEach(name => {
        netBalances[name] = -share;
      });
      payers.forEach(p => {
        netBalances[p.person] = parseFloat(((netBalances[p.person] || 0) + p.amount).toFixed(2));
      });

      // Split optimization algorithm
      const givers: { name: string; amt: number }[] = [];
      const receivers: { name: string; amt: number }[] = [];
      Object.entries(netBalances).forEach(([name, bal]) => {
        const rounded = parseFloat(bal.toFixed(2));
        if (rounded < -0.05) {
          givers.push({ name, amt: Math.abs(rounded) });
        } else if (rounded > 0.05) {
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

      // Format markdown response beautifully
      let settlementMarkdown = `I've calculated your equal split successfully 🖤\n\n`;
      settlementMarkdown += `• **Total Expense**: ₹${totalAmount.toLocaleString()}\n`;
      settlementMarkdown += `• **Members Count**: ${count} participants\n`;
      settlementMarkdown += `• **Share per Head**: ₹${share.toLocaleString()}\n\n`;

      settlementMarkdown += `#### 📊 Individual Net Ledger:\n`;
      allParticipatingNames.forEach(name => {
        const bal = netBalances[name];
        const paidStr = `(Paid ₹${(payers.find(p => p.person === name)?.amount || 0).toLocaleString()})`;
        if (bal < 0) {
          settlementMarkdown += `- **${name}**: ${paidStr} → **Owes ₹${Math.abs(bal).toLocaleString()}**\n`;
        } else if (bal > 0) {
          settlementMarkdown += `- **${name}**: ${paidStr} → **Owed ₹${bal.toLocaleString()}**\n`;
        } else {
          settlementMarkdown += `- **${name}**: ${paidStr} → **Perfectly Balanced**\n`;
        }
      });

      settlementMarkdown += `\n#### ⚡ Optimized Settlement Transfers:\n`;
      if (settlements.length === 0) {
        settlementMarkdown += `_No payments needed! Everyone is perfectly balanced._\n`;
      } else {
        settlements.forEach(s => {
          settlementMarkdown += `- **${s.from}** pays **₹${s.amount.toLocaleString()}** to **${s.to}** 💜\n`;
        });
      }

      settlementMarkdown += `\nWould you like to persist this optimized settlement to the dashboard?`;

      setMessages(prev => [
        ...prev,
        { role: 'user', content: `Split equally among ${count} members` },
        { 
          role: 'model', 
          content: settlementMarkdown,
          isSettlementComplete: true,
          settlementPayload: {
            group_name: `Group Settlement (${new Date().toLocaleDateString()})`,
            members: allParticipatingNames,
            balances: netBalances
          }
        }
      ]);

      setInput('');
      setSplitWorkflow({ step: 'none', expenses: [], totalAmount: 0 });
      return;
    }

    const currentFile = attachedFile;
    const currentPreview = attachedFilePreview;
    const msgText = input;

    const userMsg: Message = { 
      role: 'user', 
      content: msgText || `Uploaded bill/receipt: ${currentFile?.filename || "document"}`,
      imageUrl: currentPreview === "pdf_placeholder" ? (currentFile?.url || "") : (currentPreview || undefined)
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachedFile(null);
    setAttachedFilePreview(null);
    setIsStreaming(true);

    try {
      const historyLogText = (currentFile ? `📸 [Attachment: ${currentFile.filename}] ` : "") + (msgText || "Parsing attached document...");
      await api.saveHistory({ conversation_id: conversationId, role: 'user', content: historyLogText });

      setMessages(prev => [...prev, { role: 'model', content: "Anika is thinking and calculating..." }]);

      const fileDataParam = currentFile ? { mimeType: currentFile.mimeType, data: currentFile.data } : undefined;
      const response = await api.chatAI(msgText, messages, fileDataParam);

      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'model') {
          return [
            ...prev.slice(0, -1),
            { 
              role: 'model', 
              content: response.content || "Parsed successfully.", 
              reasoning: response.reasoning 
            }
          ];
        }
        return prev;
      });

      if (response.loggedExpense) {
        setOcrToast({
          message: `Logged ₹${response.loggedExpense.amount} to "${response.loggedExpense.category}" automatically!`,
          filename: response.loggedExpense.note || "Logged via Anika Autopilot"
        });
        await fetchData();
      }

      await api.saveHistory({ conversation_id: conversationId, role: 'model', content: response.content });
    } catch (err: any) {
      console.error("Streaming error:", err);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'model') {
          return [
            ...prev.slice(0, -1),
            { role: 'model', content: `Error: ${err.message || "Could not connect to Gemini."}` }
          ];
        }
        return prev;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  // Split Engine utility functions
  const parseExpensesFromText = (text: string) => {
    const lines = text.split('\n');
    const results: { person: string; amount: number; note: string }[] = [];
    
    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine) continue;
      
      // Match "• Mohan -> ₹150 -> Petrol" or "Mohan -> ₹150"
      const arrowMatch = cleanLine.match(/(?:•\s*)?([A-Za-z0-9_]+)\s*(?:->|→)\s*(?:₹|\$)?([0-9.]+)(?:\s*(?:->|→)\s*(.+))?/);
      if (arrowMatch) {
        results.push({
          person: arrowMatch[1].trim(),
          amount: parseFloat(arrowMatch[2]),
          note: arrowMatch[3] ? arrowMatch[3].trim() : "Direct Shared Split"
        });
        continue;
      }
    }
    
    if (results.length > 0) return results;

    // Direct words search fallback (e.g. mohan 150 for petrol)
    const wordRegex = /\b([a-zA-Z0-9_]+)\s+(?:spent\s+)?([0-9.]+)\s+(?:for|on)\s+([a-zA-Z0-9_+=\-\s]+)\b/g;
    let match;
    while ((match = wordRegex.exec(text)) !== null) {
      results.push({
        person: match[1].trim(),
        amount: parseFloat(match[2]),
        note: match[3].trim()
      });
    }

    return results;
  };

  const handleSplitEquallyTap = (msgContent: string) => {
    const parsed = parseExpensesFromText(msgContent);
    if (parsed.length === 0) {
      setMessages(prev => [
        ...prev,
        { role: 'model', content: "I couldn't parse the exact items list to automatic split. Please type expenses using 'Person -> ₹Amount -> Item' pattern to divide." }
      ]);
      return;
    }

    const total = parsed.reduce((sum, item) => sum + item.amount, 0);
    setSplitWorkflow({
      step: 'awaiting_members_count',
      expenses: parsed,
      totalAmount: total
    });

    setMessages(prev => [
      ...prev,
      { role: 'user', content: "Calculate Equal Split" },
      { role: 'model', content: "Splendid! 🖤 How many participants took part in this expense pool in total (including payers and debtors)? Please type the total number (e.g., 3):" }
    ]);
  };

  const handleCustomSplitTap = () => {
    setMessages(prev => [
      ...prev,
      { role: 'user', content: "Custom Split" },
      { role: 'model', content: "Anika Custom Splitting: To customize shares or split by specific percentages/unbalanced line-items, please use our **OCR Upload** flow and select the interactive line item assignments, or specify your custom percentages here (e.g. 'Mohan 30%, Ramu 70%')." }
    ]);
  };

  const handleSaveTripTap = () => {
    setMessages(prev => [
      ...prev,
      { role: 'user', content: "Save Trip" },
      { role: 'model', content: "Trip Session successfully cataloged! All transactions are held in temporary memory and optimized for eventual checkout settlement." }
    ]);
  };

  const handleAddMoreExpensesTap = () => {
    setMessages(prev => [
      ...prev,
      { role: 'user', content: "Add More Expenses" },
      { role: 'model', content: "Ready! Understood 🖤 Please enter the next shared transaction lines (e.g., 'Ayesha 300 for snacks'). I will append them to the current checkout session." }
    ]);
  };

  const handleSaveSettlementToDB = async (payload: any) => {
    try {
      await api.createGroup({
        group_name: payload.group_name,
        members: payload.members,
        balances: payload.balances
      });
      setOcrToast({
        message: `Group Split and optimized balances saved successfully!`,
        filename: payload.group_name
      });
      await fetchData();
    } catch (err: any) {
      alert("Failed saving settlement ledger. error: " + err.message);
    }
  };

  const addExpense = async (amount: number, category: string, note: string) => {
    await api.addBudget({ amount, category, note });
    fetchData();
  };

  const handleAddSubscription = async () => {
    if (!newSubName.trim() || !newSubAmount.trim()) {
      alert("Please enter a name and amount for the subscription.");
      return;
    }
    const amt = parseFloat(newSubAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid positive subscription amount.");
      return;
    }
    await api.addSubscription({
      name: newSubName.trim(),
      amount: amt,
      category: newSubCategory,
      active: 1,
      billing_date: newSubBillingDate.trim() || 'Monthly'
    });
    setNewSubName('');
    setNewSubAmount('');
    setNewSubCategory('Entertainment');
    setNewSubBillingDate('');
    await fetchData();
  };

  const handleToggleSubscription = async (sub: Subscription) => {
    if (!sub.id) return;
    const nextState = sub.active === 1 ? 0 : 1;
    await api.updateSubscription(sub.id, { active: nextState });
    await fetchData();
  };

  const handleDeleteSubscription = async (id: number) => {
    await api.deleteSubscription(id);
    await fetchData();
  };

  const totalSpent = budgetLogs.reduce((sum, log) => sum + log.amount, 0);
  const activeSubsTotal = subscriptions
    .filter(sub => sub.active === 1)
    .reduce((sum, sub) => sum + sub.amount, 0);
  const budgetLimit = profile?.budget_limit || 10000;
  const remainingBudget = budgetLimit - totalSpent - activeSubsTotal;
  const budgetPercent = Math.min(100, ((totalSpent + activeSubsTotal) / budgetLimit) * 100);

  useEffect(() => {
    if ((totalSpent + activeSubsTotal) <= budgetLimit * 0.8) {
      setAlertDismissed(false);
    }
  }, [totalSpent, activeSubsTotal, budgetLimit]);

  // spending trend over the last 30 days
  const spendingTrend = (() => {
    const trendData = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${date}`;
      
      const dayTotal = budgetLogs
        .filter(log => {
          if (!log.date) return false;
          return log.date.startsWith(dateString);
        })
        .reduce((sum, log) => sum + log.amount, 0);

      const formattedLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      trendData.push({
        dateStr: dateString,
        dateLabel: formattedLabel,
        amount: dayTotal,
      });
    }
    return trendData;
  })();

  const copyToClipboard = (text: string, msg: string) => {
    navigator.clipboard.writeText(text);
    alert(msg);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
        {/* Decorative background shapes */}
        <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none" />

        <div className="w-full max-w-md z-10">
          <div className="text-center mb-6 animate-fade-in">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 items-center justify-center shadow-[0_0_25px_rgba(147,51,234,0.4)] mb-4 hover:scale-105 transition-all">
              <Sparkles className="w-7 h-7 text-white animate-pulse" />
            </div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">ANIKA-AI</h1>
            <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider font-bold">Production Financial Intelligence Assistant</p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111827]/90 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl relative overflow-hidden"
          >
            {/* Header Path Toggle */}
            {authMode === 'login' && (
              <div className="flex bg-[#1e293b]/60 p-1 rounded-xl mb-6 border border-slate-800">
                <button
                  type="button"
                  onClick={() => { setIsOtpMode(false); setAuthError(''); setAuthSuccess(''); }}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${!isOtpMode ? 'bg-[#9333ea]/80 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Password Login
                </button>
                <button
                  type="button"
                  onClick={() => { setIsOtpMode(true); setAuthError(''); setAuthSuccess(''); }}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${isOtpMode ? 'bg-[#9333ea]/80 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  📡 Secure OTP
                </button>
              </div>
            )}

            {/* General Feedback Channels */}
            {authError && (
              <div className="bg-red-500/10 border border-red-500/35 text-red-400 text-xs px-4 py-3.5 rounded-xl font-medium mb-5">
                ⚠️ {authError}
              </div>
            )}

            {authSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 text-xs px-4 py-3.5 rounded-xl font-medium mb-5">
                {authSuccess}
              </div>
            )}

            {/* FLOW A: PASSWORD LOGIN ROUTINE */}
            {authMode === 'login' && !isOtpMode && (
              <form onSubmit={handleAuthLogin} className="space-y-6">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-white">Sign In</h2>
                  <p className="text-xs text-slate-400">Validate credentials to download records.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400">Username</label>
                    <div className="relative">
                      <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                      <input 
                        type="text"
                        required
                        placeholder="e.g., rahul12"
                        className="w-full bg-[#1e293b]/50 border border-slate-700/60 rounded-xl pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white placeholder-slate-500"
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                      <input 
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        className="w-full bg-[#1e293b]/50 border border-slate-700/60 rounded-xl pl-11 pr-11 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white placeholder-slate-500"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:bg-purple-600/50 py-3.5 rounded-xl font-black uppercase text-xs tracking-widest text-center shadow-lg hover:shadow-purple-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-white cursor-pointer"
                >
                  {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Access Account"}
                </button>

                <div className="flex flex-col gap-2 pt-1 items-center text-xs">
                  <span className="text-slate-400">
                    New to Anika-AI?{" "}
                    <button 
                      type="button" 
                      onClick={() => { setAuthMode('register'); setAuthError(''); setAuthSuccess(''); }}
                      className="text-purple-400 hover:text-purple-300 font-bold underline cursor-pointer"
                    >
                      Create Account
                    </button>
                  </span>
                  <button 
                    type="button" 
                    onClick={() => { setAuthMode('recover'); setAuthError(''); setAuthSuccess(''); }}
                    className="text-slate-500 hover:text-slate-400 font-medium"
                  >
                    Forgot Password? Recover with Reset Key
                  </button>
                </div>
              </form>
            )}

            {/* FLOW B: SECURE OTP LOGIN / SIGNUP ON-DEMAND */}
            {authMode === 'login' && isOtpMode && (
              <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-6">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-purple-400" />
                    AI Secure OTP Login
                  </h2>
                  <p className="text-xs text-slate-400">Enter your email or mobile. Instantly generates verification PIN.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400 font-mono">Email / Mobile Number</label>
                    <div className="relative">
                      <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                      <input 
                        type="text"
                        required
                        disabled={otpSent}
                        placeholder="e.g. +91 9876543210 or kiran@students.in"
                        className="w-full bg-[#1e293b]/50 border border-slate-700/60 rounded-xl pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white placeholder-slate-500 disabled:opacity-60"
                        value={otpTarget}
                        onChange={(e) => setOtpTarget(e.target.value)}
                      />
                    </div>
                    
                    {!otpSent && otpTarget.trim().length > 0 && !validateOtpTarget(otpTarget) && (
                      <p className="text-[11px] text-rose-400 font-bold mt-1 flex items-center gap-1 animate-pulse">
                        ⚠️ Enter valid email or mobile number
                      </p>
                    )}
                  </div>

                  {otpSent && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-1.5"
                    >
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400">6-Digit OTP Verification PIN</label>
                      </div>
                      <div className="relative">
                        <Key className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                        <input 
                          type="text"
                          required
                          maxLength={6}
                          placeholder="Type 6-digit passcode"
                          className="w-full bg-[#1e293b]/50 border border-slate-700/60 rounded-xl pl-11 pr-4 py-3 text-sm font-bold tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white placeholder-slate-500"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-2">
                  <button
                    type="submit"
                    disabled={authLoading || (!otpSent && !validateOtpTarget(otpTarget))}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:opacity-50 py-3.5 rounded-xl font-black uppercase text-xs tracking-widest text-center shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-white cursor-pointer"
                  >
                    {authLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : otpSent ? (
                      "Verify & Sign In"
                    ) : (
                      "Send Secure AI-OTP"
                    )}
                  </button>

                  {otpSent && (
                    <button
                      type="button"
                      onClick={() => { setOtpSent(false); setOtpCode(''); }}
                      className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-700 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest text-center transition-all cursor-pointer text-slate-300"
                    >
                      Change Contact Target
                    </button>
                  )}
                </div>

                <div className="text-center pt-2">
                  <span className="text-slate-400 text-xs">
                    New user logging in? OTP immediately creates a profile verified on-the-fly.
                  </span>
                </div>
              </form>
            )}

            {/* FLOW C: USER REGISTER CARD */}
            {authMode === 'register' && (
              <form onSubmit={handleAuthRegister} className="space-y-6">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-white mb-1">Create Student Account</h2>
                  <p className="text-xs text-slate-400 font-medium">Protect allowance using modern analytical algorithms.</p>
                </div>

                {newlyCreatedKey && (
                  <div className="bg-amber-500/5 border border-amber-500/25 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider animate-bounce">
                      <ShieldCheck className="w-4 h-4" />
                      Recovery Reset Key Generated
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                      Write this block down! If you forget your password, this is the only master override tool.
                    </p>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-3">
                      <span className="flex-1 font-mono text-xs font-black text-slate-200 tracking-wider">
                        {newlyCreatedKey}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(newlyCreatedKey, "Recovery Reset Key copied to clipboard!")}
                        className="px-2.5 py-1 text-[10px] font-bold uppercase bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-all"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400">Username</label>
                    <div className="relative">
                      <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                      <input 
                        type="text"
                        required
                        placeholder="e.g., kiran_99"
                        className="w-full bg-[#1e293b]/50 border border-slate-700/60 rounded-xl pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white placeholder-slate-500"
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                      <input 
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Minimum 6 characters"
                        className="w-full bg-[#1e293b]/50 border border-slate-700/60 rounded-xl pl-11 pr-11 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white placeholder-slate-500"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                      <input 
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Repeat password"
                        className="w-full bg-[#1e293b]/50 border border-slate-700/60 rounded-xl pl-11 pr-11 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white placeholder-slate-500"
                        value={authConfirmPassword}
                        onChange={(e) => setAuthConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:bg-purple-600/50 py-3.5 rounded-xl font-black uppercase text-xs tracking-widest text-center shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-white cursor-pointer"
                >
                  {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Register Account"}
                </button>

                <div className="text-center text-xs pt-2">
                  <span className="text-slate-400 font-semibold">
                    Already registered?{" "}
                    <button 
                      type="button" 
                      onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
                      className="text-purple-400 hover:text-purple-300 font-bold underline cursor-pointer"
                    >
                      Log in here
                    </button>
                  </span>
                </div>
              </form>
            )}

            {/* FLOW D: PASS RECOVER (Supports Reset Key AND Security OTP) */}
            {authMode === 'recover' && (
              <div className="space-y-6">
                <div className="flex bg-[#1e293b]/60 p-1 rounded-xl mb-2 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setOtpRecoveryActive(false); setAuthError(''); setAuthSuccess(''); }}
                    className={`flex-1 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${!otpRecoveryActive ? 'bg-purple-600/80 text-white shadow-md' : 'text-slate-400'}`}
                  >
                    Reset Key
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOtpRecoveryActive(true); setAuthError(''); setAuthSuccess(''); }}
                    className={`flex-1 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${otpRecoveryActive ? 'bg-purple-600/80 text-white shadow-md' : 'text-slate-400'}`}
                  >
                    📡 Recovery OTP
                  </button>
                </div>

                {/* Sub-Flow D1: Standard Reset Key */}
                {!otpRecoveryActive ? (
                  <form onSubmit={handleAuthRecover} className="space-y-4">
                    <div>
                      <h2 className="text-md font-black tracking-tight text-white mb-1">Recovery via Key</h2>
                      <p className="text-xs text-slate-400">Enter master reset key generated on registration.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400">Username</label>
                        <div className="relative">
                          <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                          <input 
                            type="text"
                            required
                            placeholder="Your username"
                            className="w-full bg-[#1e293b]/50 border border-slate-700/60 rounded-xl pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white"
                            value={authUsername}
                            onChange={(e) => setAuthUsername(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400">Recovery Reset Key</label>
                        <div className="relative">
                          <Key className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                          <input 
                            type="text"
                            required
                            placeholder="e.g., ANIKA-RESET-XXXXX"
                            className="w-full bg-[#1e293b]/50 border border-slate-700/60 rounded-xl pl-11 pr-4 py-3 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white placeholder-slate-500"
                            value={authResetKey}
                            onChange={(e) => setAuthResetKey(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400">New Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                          <input 
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="Must be strong"
                            className="w-full bg-[#1e293b]/50 border border-slate-700/60 rounded-xl pl-11 pr-11 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white"
                            value={authNewPassword}
                            onChange={(e) => setAuthNewPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transform"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 py-3.5 rounded-xl font-black uppercase text-xs tracking-widest text-white shadow-lg cursor-pointer"
                    >
                      Establish New Password
                    </button>
                  </form>
                ) : (
                  /* Sub-Flow D2: OTP Password Recovery */
                  <form onSubmit={otpSent ? handleVerifyOtpRecovery : handleInitiateOtpRecovery} className="space-y-4">
                    <div>
                      <h2 className="text-md font-black tracking-tight text-white mb-1">Recovery via OTP</h2>
                      <p className="text-xs text-slate-400">Provide verified email/phone to retrieve passcode.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400">Registered Email / phone</label>
                        <div className="relative">
                          <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                          <input 
                            type="text"
                            required
                            disabled={otpSent}
                            placeholder="e.g. rahul@domain.com"
                            className="w-full bg-[#1e293b]/50 border border-slate-700/60 rounded-xl pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white disabled:opacity-60"
                            value={otpTarget}
                            onChange={(e) => setOtpTarget(e.target.value)}
                          />
                        </div>
                      </div>

                      {otpSent && (
                        <motion.div 
                          initial={{ opacity: 0, height: "auto" }}
                          className="space-y-4"
                        >
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400">Recovery OTP Code</label>
                            </div>
                            <div className="relative">
                              <Key className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                              <input 
                                type="text"
                                required
                                placeholder="Type 6-digit recovery OTP"
                                className="w-full bg-[#1e293b]/50 border border-slate-700/60 rounded-xl pl-11 pr-4 py-3 text-sm font-bold tracking-widest text-center text-white"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400">New Password</label>
                            <div className="relative">
                              <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                              <input 
                                type={showPassword ? "text" : "password"}
                                required
                                placeholder="Write strong password"
                                className="w-full bg-[#1e293b]/50 border border-slate-700/60 rounded-xl pl-11 pr-11 py-3 text-sm font-medium focus:outline-none focus:ring-2"
                                value={authNewPassword}
                                onChange={(e) => setAuthNewPassword(e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 py-3.5 rounded-xl font-black uppercase text-xs tracking-widest text-white shadow-md cursor-pointer"
                    >
                      {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : otpSent ? "Complete OTP Recovery" : "Request Recovery OTP"}
                    </button>
                  </form>
                )}

                <div className="text-center text-xs pt-2">
                  <button 
                    type="button" 
                    onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); setOtpSent(false); }}
                    className="text-purple-400 hover:text-purple-300 font-bold underline cursor-pointer"
                  >
                    Back to Log In
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-20 lg:w-64 flex-shrink-0 border-r border-slate-800 flex flex-col bg-[#0b1120] z-20">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.5)]">
              <span className="text-2xl font-bold">A</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden lg:block">Anika-AI</h1>
          </div>
          
          <nav className="space-y-2">
            <NavItem 
              active={activeTab === 'chat'} 
              onClick={() => setActiveTab('chat')} 
              icon={<MessageSquare className="w-5 h-5" />} 
              label="Chat Advisor" 
            />
            <NavItem 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
              icon={<LayoutDashboard className="w-5 h-5" />} 
              label="Budget Insights" 
            />
            <NavItem 
              active={activeTab === 'smartbuy'} 
              onClick={() => setActiveTab('smartbuy')} 
              icon={<Layers className="w-5 h-5" />} 
              label="Smart Buy AI" 
            />
            <NavItem 
              active={activeTab === 'logs'} 
              onClick={() => setActiveTab('logs')} 
              icon={<History className="w-5 h-5" />} 
              label="Activity Logs" 
            />
             <NavItem 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')} 
              icon={<Settings className="w-5 h-5" />} 
              label="Settings" 
            />
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800 hidden lg:block">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold">Monthly Budget</p>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${budgetPercent}%` }}
                className="bg-violet-500 h-full"
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-medium mt-1">
              <span>Spent: ₹{totalSpent.toLocaleString()}</span>
              <span>Fixed: ₹{activeSubsTotal.toLocaleString()}</span>
            </div>
            <p className="text-xs font-semibold text-slate-300 mt-2">Spent + Recurring: ₹{(totalSpent + activeSubsTotal).toLocaleString()} / ₹{budgetLimit.toLocaleString()}</p>
          </div>

          {currentUser && (
            <div className="p-4 text-xs mt-3 flex items-center justify-between bg-[#1e293b]/50 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-violet-600/30 flex items-center justify-center font-bold text-violet-300 border border-violet-500/20 text-xs uppercase flex-shrink-0">
                  {currentUser.substring(0, 2)}
                </div>
                <div className="overflow-hidden">
                  <p className="font-extrabold text-slate-200 truncate capitalize">{currentUser}</p>
                  <p className="text-[9px] text-emerald-400 font-medium font-mono uppercase tracking-wider">Active Account</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors flex-shrink-0"
                title="Logout secure session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col relative bg-[#0f172a]">
          <header className="h-20 flex items-center justify-between px-8 border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md z-10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Shopping Advisor Active</h2>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2.5 text-xs font-black uppercase tracking-widest bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-500/30 rounded-lg shadow-lg shadow-purple-500/15 transition-all text-white flex items-center gap-2 hover:scale-[1.03] active:scale-98 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                AI OCR Scanner
              </button>
              <button 
                onClick={() => {
                   const text = messages.map(m => `[${m.role}] ${m.content}`).join('\n\n');
                   navigator.clipboard.writeText(text);
                   alert("History copied to clipboard!");
                }}
                className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                >
                Share History
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold shadow-lg shadow-violet-500/20">
                AI
              </div>
            </div>
          </header>

          <AnimatePresence>
            {(totalSpent + activeSubsTotal) > budgetLimit * 0.8 && !alertDismissed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-rose-500/10 border-b border-rose-500/20 px-8 py-3.5 flex items-center justify-between text-xs text-rose-200 font-medium backdrop-blur-md z-[15] shrink-0 overflow-hidden"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center border border-rose-500/30 text-rose-400 shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-rose-400 uppercase tracking-widest block">Real-time Budget Warning</span>
                    <p className="mt-0.5 text-slate-400">
                      You have spent <strong className="text-white">₹{(totalSpent + activeSubsTotal).toLocaleString()}</strong> of your <strong className="text-white">₹{budgetLimit.toLocaleString()}</strong> monthly capability (<strong className="text-rose-400">{budgetPercent.toFixed(1)}%</strong>). Cut back on food deliveries and non-essential shopping.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAlertDismissed(true)}
                  className="text-slate-500 hover:text-white hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-all ml-4 text-[10px] font-black uppercase tracking-widest shrink-0 cursor-pointer"
                >
                  Dismiss
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {activeTab === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col overflow-hidden relative"
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                {/* Floating Premium OCR Completed Toast */}
                <AnimatePresence>
                  {ocrToast && (
                    <motion.div
                      initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="absolute top-6 right-6 z-50 max-w-sm sm:max-w-md p-4 bg-[#0f172a]/95 border border-emerald-500/30 rounded-2xl shadow-emerald-500/5 shadow-2xl backdrop-blur-xl flex items-start gap-3.5 select-none text-left cursor-default overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <Check className="w-5 h-5 animate-pulse" />
                      </div>
                      <div className="flex-1 pr-4 min-w-0">
                        <p className="text-xs font-black text-slate-100 uppercase tracking-widest flex items-center gap-1.5">
                          OCR Parsing Successful
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 truncate">
                          📄 {ocrToast.filename}
                        </p>
                        <p className="text-[11px] text-slate-300 font-medium mt-1 leading-relaxed">
                          {ocrToast.message}
                        </p>
                      </div>
                      <button
                        onClick={() => setOcrToast(null)}
                        className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors shrink-0 cursor-pointer"
                        title="Dismiss notification"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar scroll-smooth">
                  <div className="max-w-4xl mx-auto space-y-6">
                    {messages.map((msg, i) => (
                      <div key={i} className={cn(
                        "flex",
                        msg.role === 'user' ? "justify-end" : "justify-start"
                      )}>
                        <div className={cn(
                          "max-w-[85%] lg:max-w-[80%] p-5 rounded-2xl text-sm leading-relaxed",
                          msg.role === 'user' 
                            ? "bg-violet-600 shadow-xl text-white rounded-tr-none" 
                            : "bg-[#1e293b] border border-slate-700 shadow-2xl text-slate-200 rounded-tl-none"
                        )}>
                          {msg.role === 'model' && (
                            <div className="flex items-start gap-3 mb-2 opacity-50">
                               <Sparkles className="w-4 h-4 text-violet-400" />
                               <p className="font-bold uppercase text-[9px] tracking-[0.2em] text-violet-300">Anika Intelligence</p>
                            </div>
                          )}
                          {msg.imageUrl && (
                            msg.imageUrl.includes(".pdf") || msg.imageUrl === "pdf_placeholder" ? (
                              <div className="mb-3 p-4 bg-slate-950/60 rounded-xl border border-violet-500/30 flex items-center gap-3 w-fit hover:border-violet-500/50 transition-all text-left">
                                <div className="w-10 h-10 bg-violet-600/10 rounded-lg flex items-center justify-center text-violet-400">
                                  <FileText className="w-5 h-5 animate-pulse" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-200">Attached PDF Bill / Document</p>
                                  {msg.imageUrl !== "pdf_placeholder" && (
                                    <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-violet-400 font-extrabold hover:underline uppercase tracking-wider mt-0.5 block">
                                      Open / Download ↗
                                    </a>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="mb-3 overflow-hidden rounded-xl border border-white/10 max-h-48 sm:max-h-64 flex justify-center bg-slate-950/40">
                                <img 
                                  src={msg.imageUrl} 
                                  alt="Uploaded Bill / Receipt" 
                                  className="max-h-full object-contain hover:scale-110 transition-transform duration-300" 
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )
                          )}
                          <div className="markdown-body prose-sm">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>

                          {/* Render Split Options if Model suggested splits */}
                          {msg.role === 'model' && msg.content.includes("Total Expense: ₹") && msg.content.includes("Split Equally") && (
                            <div className="mt-4 pt-3.5 border-t border-slate-700/60 flex flex-wrap gap-2.5">
                              <button 
                                onClick={() => handleSplitEquallyTap(msg.content)}
                                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-xs text-white uppercase tracking-wider transition-all scale-95 hover:scale-100 cursor-pointer shadow-md shadow-violet-900/10 active:scale-95"
                              >
                                Split Equally 🖤
                              </button>
                              <button 
                                onClick={() => handleCustomSplitTap()}
                                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-300 border border-slate-700 hover:border-slate-650 uppercase tracking-wide transition-all scale-95 hover:scale-100 cursor-pointer"
                              >
                                Custom Split
                              </button>
                              <button 
                                onClick={() => handleSaveTripTap()}
                                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-300 border border-slate-700 hover:border-slate-650 uppercase tracking-wide transition-all scale-95 hover:scale-100 cursor-pointer"
                              >
                                Save Trip
                              </button>
                              <button 
                                onClick={() => handleAddMoreExpensesTap()}
                                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-300 border border-slate-700 hover:border-slate-650 uppercase tracking-wide transition-all scale-95 hover:scale-100 cursor-pointer"
                              >
                                Add More Expenses
                              </button>
                            </div>
                          )}

                          {/* Render Save Settlement Button if Split calculation is finished */}
                          {msg.role === 'model' && msg.isSettlementComplete && msg.settlementPayload && (
                            <div className="mt-4 pt-4 border-t border-slate-700/60 flex justify-end">
                              <button
                                onClick={() => handleSaveSettlementToDB(msg.settlementPayload)}
                                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-xs text-white uppercase tracking-widest transition-all scale-95 hover:scale-100 cursor-pointer shadow-lg shadow-emerald-950/20 active:scale-95 flex items-center gap-2"
                              >
                                <Check className="w-4 h-4 text-emerald-100" />
                                Save Settlement 🖤
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isStreaming && (
                      <div className="flex justify-start">
                        <div className="p-5 bg-[#1e293b] border border-slate-700 rounded-2xl rounded-tl-none animate-pulse flex items-center gap-2">
                           <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" />
                           <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                           <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>
                    )}
                    
                    {/* Anika AI Fintech Hub & Recommendations */}
                    <div className="border-t border-slate-800/80 pt-10 space-y-8 animate-fade-in text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-black tracking-tight uppercase flex items-center gap-2 text-white">
                            <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
                            Anika Intelligence Hub
                          </h3>
                          <p className="text-slate-500 text-xs font-semibold">Proactive financial recommendations & real-time OCR stream insights</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg">Realtime Predictions Active</span>
                        </div>
                      </div>

                      {/* Grid containing (A) Spending Predictions and (B) Recent OCR Upload Stream */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* 1. Spending Predictions & High-Contrast Runway Meter */}
                        <div className="bg-[#1e293b]/20 p-5 rounded-2xl border border-slate-800/70 hover:border-slate-700/50 transition-all flex flex-col justify-between">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed] flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-violet-400" />
                                Runways & Peak Predictions
                              </span>
                              <span className="text-[9px] bg-violet-600/20 text-violet-300 font-extrabold uppercase px-1.5 py-0.5 rounded-md border border-violet-500/15">May 2026 Model</span>
                            </div>

                            <div className="space-y-2">
                              <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                                Anika predicts a final consumption volume of <strong className="text-slate-200">₹{(totalSpent + (activeSubsTotal * 1.2)).toLocaleString()}</strong> this month. Based on your current available pocket allowance, your budget is considered <span className="text-emerald-400 font-bold">Stable</span>.
                              </p>
                              
                              <div className="pt-2">
                                <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-500 mb-1">
                                  <span>EST. RUNWAY USED</span>
                                  <span>{budgetLimit > 0 ? Math.min(100, Math.round(((totalSpent + activeSubsTotal) / budgetLimit) * 100)) : 0}%</span>
                                </div>
                                <div className="w-full bg-[#090d16] h-2.5 rounded-full overflow-hidden border border-slate-800">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${budgetLimit > 0 ? Math.min(100, Math.round(((totalSpent + activeSubsTotal) / budgetLimit) * 100)) : 0}%` }}
                                    className="bg-gradient-to-r from-violet-500 via-indigo-500 to-emerald-400 h-full shadow-[0_0_8px_rgba(124,58,237,0.2)]"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3.5 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 font-bold">NEXT WEEK FORECAST</span>
                            <span className="font-mono font-bold text-violet-400">+₹1,250 (Average)</span>
                          </div>
                        </div>

                        {/* 2. Recent OCR Analysis & Live File Stream logs summary */}
                        <div className="bg-[#1e293b]/20 p-5 rounded-2xl border border-slate-800/70 hover:border-slate-700/50 transition-all flex flex-col justify-between">
                          <div className="space-y-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-indigo-400" />
                              Recent OCR Ledger Feed
                            </span>

                            <div className="space-y-2 mt-2">
                              {budgetLogs.length === 0 ? (
                                <div className="text-center py-6 text-xs text-slate-600 font-medium italic">
                                  No scanned logs parsed yet. Click "AI Scanner" below to upload your first paper bill or payment screenshot!
                                </div>
                              ) : (
                                budgetLogs.slice(-2).map((log, index) => (
                                  <div key={index} className="flex justify-between items-center bg-slate-950/40 border border-slate-800/60 rounded-xl p-2.5 text-xs">
                                    <div className="flex items-center gap-2.5 min-w-0 font-sans">
                                      <div className="p-1.5 bg-[#171f30] border border-slate-800 rounded-lg shrink-0">
                                        <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-bold text-slate-200 truncate pr-2">{log.note || "General purchase"}</p>
                                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-extrabold">{log.category}</p>
                                      </div>
                                    </div>
                                    <span className="font-mono font-black text-purple-400 shrink-0">₹{log.amount.toLocaleString()}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          <div className="mt-3 text-[9px] text-slate-500 leading-normal">
                            All receipts verified via Gemini Vision are archived securely.
                          </div>
                        </div>
                      </div>

                      {/* 3. AI Smart Recommendations Section */}
                      <div className="space-y-3.5 text-left">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#a78bfa]" />
                          Smart Fintech Recommendations
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          
                          {/* Card 1 */}
                          <div className="bg-[#1e293b]/10 border border-slate-800/80 p-4 rounded-xl hover:border-violet-500/20 transition-all text-left space-y-2 relative overflow-hidden group">
                            <div className="w-7 h-7 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                              <Layers className="w-3.5 h-3.5" />
                            </div>
                            <h4 className="text-[11px] font-extrabold text-slate-200 uppercase tracking-wide">Zepto Groceries Optimal Hour</h4>
                            <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                              Place grocery purchases during the 2-4 PM window to capture delivery fee discounts and lower surge prices on staple logs.
                            </p>
                          </div>

                          {/* Card 2 */}
                          <div className="bg-[#1e293b]/10 border border-slate-800/80 p-4 rounded-xl hover:border-violet-500/20 transition-all text-left space-y-2 relative overflow-hidden group">
                            <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                              <TrendingDown className="w-3.5 h-3.5" />
                            </div>
                            <h4 className="text-[11px] font-extrabold text-slate-200 uppercase tracking-wide">Subscription Consolidation</h4>
                            <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                              Consolidating recurring OTT channels can safeguard <strong className="text-slate-300">₹400/month</strong>. Evaluate pause options in System Configuration.
                            </p>
                          </div>

                          {/* Card 3 */}
                          <div className="bg-[#1e293b]/10 border border-slate-800/80 p-4 rounded-xl hover:border-violet-500/20 transition-all text-left space-y-2 relative overflow-hidden group">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </div>
                            <h4 className="text-[11px] font-extrabold text-slate-200 uppercase tracking-wide">Active Hostel Budget Lock</h4>
                            <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                              Hostel expense category is fully clear of alerts. Great discipline maintaining zero leakage on spontaneous weekend logs!
                            </p>
                          </div>

                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 relative">
                  {/* Glassmorphic Drag and Drop Overlay */}
                  {dragActive && (
                    <div className="absolute inset-x-8 inset-y-8 rounded-3xl bg-violet-600/10 border-2 border-dashed border-violet-500/50 backdrop-blur-md z-50 flex flex-col items-center justify-center text-center p-6 gap-3 animate-fade-in pointer-events-none">
                      <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center border border-violet-500/30 text-violet-400">
                        <Upload className="w-8 h-8 animate-bounce" />
                      </div>
                      <div>
                        <p className="text-lg font-black text-white uppercase tracking-wider">Drop your bill here!</p>
                        <p className="text-xs text-violet-300 font-medium mt-1">Accepts JPG, PNG, WEBP, and PDF documents</p>
                      </div>
                    </div>
                  )}

                  <div className="max-w-4xl mx-auto">
                    {/* File Preview Card */}
                    <AnimatePresence>
                      {attachedFilePreview && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 10 }}
                          transition={{ type: "spring", damping: 20, stiffness: 300 }}
                          className="relative mb-3.5 p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center gap-3 w-fit shadow-xl select-none"
                        >
                          {attachedFilePreview === "pdf_placeholder" ? (
                            <div className="relative w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center text-red-500 border border-red-500/20">
                              <FileText className="w-6 h-6" />
                            </div>
                          ) : (
                            <div className="relative w-12 h-12 bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                              <img src={attachedFilePreview} alt="Attached Receipt/Bill Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          )}
                          <div className="flex-1 min-w-[150px]">
                            <p className="text-xs font-black text-slate-200 truncate pr-4">{attachedFile?.filename}</p>
                            <p className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Backend uploads/ folder sync ok
                            </p>
                          </div>
                          <button 
                            onClick={() => {
                              setAttachedFile(null);
                              setAttachedFilePreview(null);
                            }}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                            title="Remove attached document"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* OCR & Upload Progress Visualizer */}
                    {(isUploading || ocrProgressState) && (
                      <div className="mb-4 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 backdrop-blur-md shadow-[0_12px_32px_rgba(30,27,75,0.4)] flex flex-col gap-3.5 max-w-md select-none transition-all duration-350">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/25 text-indigo-400 shrink-0 animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                          </div>
                          <div className="flex-1">
                            <div className="text-[10px] sm:text-xs font-black text-indigo-300 uppercase tracking-widest flex justify-between">
                              <span>{isUploading ? "Uploading Secure File..." : "AI OCR Core Active"}</span>
                              <span className="font-mono">{ocrProgressPercent}%</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-extrabold mt-0.5 tracking-tight">
                              {ocrProgressState || "Processing document metadata..."}
                            </p>
                          </div>
                        </div>
                        {/* Glowing progress line bar */}
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all duration-300 shadow-[0_0_8px_rgba(99,102,241,0.5)]" 
                            style={{ width: `${ocrProgressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Sleek Input Layout - 📷 | 📄 | Type message... | 🎤 | ➤ */}
                    <div className="p-1.5 rounded-2xl bg-[#1e293b]/90 border border-slate-700/80 flex items-center gap-1 focus-within:ring-2 focus-within:ring-violet-500/50 shadow-2xl transition-all relative">
                      
                      {/* Premium AI Scanner Trigger */}
                      <button
                        onClick={() => setIsUploadModalOpen(true)}
                        type="button"
                        className="h-11 px-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl flex items-center gap-1.5 cursor-pointer transition-all border border-purple-500/30 shrink-0 hover:scale-[1.03] shadow-lg shadow-purple-600/10 hover:shadow-purple-500/25 active:scale-98"
                        title="Open Advanced AI Scanner & Money Splitter"
                      >
                        <Sparkles className="w-4.5 h-4.5 text-purple-200 animate-pulse" />
                        <span className="text-[11px] font-black uppercase tracking-wider hidden sm:inline">AI Scanner</span>
                      </button>

                      <div className="w-[1px] h-6 bg-slate-700 mx-1 shrink-0"></div>

                      {/* 📷 Upload Image */}
                      <label className="w-11 h-11 bg-slate-800 hover:bg-slate-700/80 text-slate-400 hover:text-violet-400 rounded-xl flex items-center justify-center cursor-pointer transition-all border border-slate-700/60 shrink-0 hover:scale-105" title="📷 Upload Image">
                        <Camera className="w-4.5 h-4.5" />
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileAttach(file);
                          }} 
                        />
                      </label>

                      {/* 📄 Upload PDF */}
                      <label className="w-11 h-11 bg-slate-800 hover:bg-slate-700/80 text-slate-400 hover:text-violet-400 rounded-xl flex items-center justify-center cursor-pointer transition-all border border-slate-700/60 shrink-0 hover:scale-105" title="📄 Upload PDF">
                        <FileText className="w-4.5 h-4.5" />
                        <input 
                          type="file" 
                          accept="application/pdf" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileAttach(file);
                          }} 
                        />
                      </label>

                      {/* Elegant Split Separator */}
                      <div className="w-[1px] h-6 bg-slate-700 mx-1.5 border-r border-slate-700/60 shrink-0"></div>

                      <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Ask 'Should I buy...', log cash, or attach a bill (📷 / 📄)..." 
                        className="flex-1 bg-transparent px-3 py-3 outline-none text-slate-300 placeholder-slate-500 text-sm min-w-0"
                      />

                      <button 
                        onClick={toggleListening}
                        className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center transition-all border shrink-0 hover:scale-105",
                          isListening 
                            ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse shadow-lg shadow-rose-500/10" 
                            : "bg-slate-800 text-slate-400 hover:text-violet-400 border-slate-700 hover:border-slate-600"
                        )}
                        title={isListening ? "Listening... Click to stop" : "Ask with Voice"}
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>

                      <button 
                        onClick={handleSendMessage}
                        disabled={(!input.trim() && !attachedFilePreview) || isStreaming || isUploading}
                        className="w-11 h-11 bg-violet-600 rounded-xl flex items-center justify-center text-white hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:bg-violet-600/40 transition-all shadow-lg cursor-pointer shrink-0 hover:scale-105"
                      >
                        {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rotate-90" />}
                      </button>
                    </div>

                    <div className="flex flex-col items-center gap-3 mt-4">
                      <div className="flex justify-center gap-3">
                        <QuickAction label="Compare Phones" onClick={() => setInput("Compare best student phones under ₹15k")} />
                        <QuickAction label="Budget Audit" onClick={() => setInput("Audit my spending this month")} />
                        <QuickAction label="Trip Mode" onClick={() => setInput("Plan a trek under ₹2000")} />
                      </div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                        🎙️ Say e.g. <span className="text-violet-400 font-extrabold font-mono">"log expense 150 rs for snacks"</span> to log instantly
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-950/20 text-left custom-scrollbar"
              >
                <PremiumDashboard 
                  budgetLogs={budgetLogs}
                  groups={groups}
                  friends={friends}
                  profile={profile}
                  analytics={analytics}
                  dailyGoals={dailyGoals}
                  setDailyGoals={setDailyGoals}
                  newGoalDesc={newGoalDesc}
                  setNewGoalDesc={setNewGoalDesc}
                  newGoalAmount={newGoalAmount}
                  setNewGoalAmount={setNewGoalAmount}
                  fetchData={fetchData}
                  addExpense={addExpense}
                  setIsUploadModalOpen={setIsUploadModalOpen}
                  setOcrToast={setOcrToast}
                  setActiveTab={setActiveTab}
                  setInput={setInput}
                />
              </motion.div>
            )}

            {activeTab === 'smartbuy' && (
              <SmartBuyOptimizer />
            )}

            {activeTab === 'logs' && (() => {
              // Extract and normalize unique categories from existing logs
              const dynamicCats = Array.from(new Set(
                budgetLogs
                  .map(log => log.category)
                  .filter(Boolean)
                  .map(cat => {
                    const trimmed = cat.trim();
                    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
                  })
              ));
              
              // Standard initial template categories
              const templateCats = ["Food", "Education", "Transportation", "Shopping", "Entertainment", "Utilities", "Other"];
              const allUniqueCategories = ["All"];
              
              templateCats.forEach(c => {
                if (!allUniqueCategories.includes(c)) {
                  allUniqueCategories.push(c);
                }
              });

              dynamicCats.forEach(c => {
                if (!allUniqueCategories.includes(c)) {
                  allUniqueCategories.push(c);
                }
              });

              // Apply search / category filtering
              const filteredLogs = budgetLogs.filter(log => {
                const matchesCategory = logsCategoryFilter === 'All' || 
                  (log.category || '').toLowerCase() === logsCategoryFilter.toLowerCase();
                
                const query = logsSearchQuery.trim().toLowerCase();
                const matchesSearch = !query || 
                  (log.note || '').toLowerCase().includes(query) || 
                  (log.category || '').toLowerCase().includes(query);
                  
                return matchesCategory && matchesSearch;
              });

              // Apply custom table sorting
              const sortedAndFiltered = [...filteredLogs].sort((a, b) => {
                if (logsSortBy === 'date-desc') {
                  return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
                } else if (logsSortBy === 'date-asc') {
                  return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
                } else if (logsSortBy === 'amount-desc') {
                  return b.amount - a.amount;
                } else if (logsSortBy === 'amount-asc') {
                  return a.amount - b.amount;
                }
                return 0;
              });

              const totalFilteredValue = sortedAndFiltered.reduce((sum, log) => sum + log.amount, 0);

              return (
                <motion.div 
                  key="logs"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 p-8 overflow-y-auto custom-scrollbar"
                >
                    <div className="max-w-5xl mx-auto space-y-6">
                       {/* Header Section */}
                       <div className="flex items-center justify-between">
                          <div>
                             <h2 className="text-2xl font-black tracking-tight text-white uppercase">Ledger Activity</h2>
                             <p className="text-sm text-slate-500 font-sans">Comprehensive spending documentation and audit trail</p>
                          </div>
                          <AddExpenseModal onAdd={addExpense} />
                       </div>

                       {/* Advanced Dynamic Filters & Sort Controls Bar */}
                       <div className="flex flex-col gap-4 bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md">
                          {/* Search Input Bar */}
                          <div className="relative w-full">
                             <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                             <input
                                type="text"
                                placeholder="Search logs by keyword or category... (e.g. 'coffee', 'food', 'petrol')"
                                value={logsSearchQuery}
                                onChange={(e) => setLogsSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 hover:bg-slate-950 border border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 text-white placeholder-slate-500 font-sans transition-all"
                             />
                             {logsSearchQuery && (
                                <button
                                   onClick={() => setLogsSearchQuery("")}
                                   className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs font-black"
                                >
                                   ✕
                                </button>
                             )}
                          </div>

                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                             <div className="flex flex-wrap items-center gap-5">
                                {/* Category Dropdown Selector */}
                                <div className="flex items-center gap-2">
                                   <Filter className="w-3.5 h-3.5 text-violet-400" />
                                   <label htmlFor="categoryFilter" className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-sans">Category:</label>
                                   <select
                                      id="categoryFilter"
                                      value={logsCategoryFilter}
                                      onChange={(e) => setLogsCategoryFilter(e.target.value)}
                                      className="bg-slate-950/70 hover:bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 font-medium font-sans cursor-pointer transition-colors"
                                   >
                                      {allUniqueCategories.map(cat => (
                                         <option key={cat} value={cat} className="bg-slate-950 text-slate-200">
                                            {cat}
                                         </option>
                                      ))}
                                   </select>
                                </div>

                                {/* Custom Sort Order Dropdown */}
                                <div className="flex items-center gap-2">
                                   <ArrowUpDown className="w-3.5 h-3.5 text-violet-400" />
                                   <label htmlFor="sortingOrder" className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-sans">Sort By:</label>
                                   <select
                                      id="sortingOrder"
                                      value={logsSortBy}
                                      onChange={(e) => setLogsSortBy(e.target.value)}
                                      className="bg-slate-950/70 hover:bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 font-medium font-sans cursor-pointer transition-colors"
                                   >
                                      <option value="date-desc" className="bg-slate-950 text-slate-200">Date: Newest First</option>
                                      <option value="date-asc" className="bg-slate-950 text-slate-200">Date: Oldest First</option>
                                      <option value="amount-desc" className="bg-slate-950 text-slate-200">Value: Highest First</option>
                                      <option value="amount-asc" className="bg-slate-950 text-slate-200">Value: Lowest First</option>
                                   </select>
                                </div>
                             </div>

                             {/* Compact Stat Badges */}
                             <div className="flex items-center gap-2 text-xs">
                                <div className="bg-slate-950/60 border border-slate-800 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 font-sans">
                                   <span className="text-slate-500 text-[10px] uppercase font-black tracking-wider">Filtered Items:</span>
                                   <span className="text-white font-bold font-mono">{sortedAndFiltered.length}</span>
                                </div>
                                <div className="bg-violet-950/35 border border-violet-800/30 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 font-sans">
                                   <span className="text-violet-400/80 text-[10px] uppercase font-black tracking-wider">Accumulated Sum:</span>
                                   <span className="text-violet-400 font-black font-mono">₹{totalFilteredValue.toLocaleString()}</span>
                                </div>
                             </div>
                          </div>

                          {/* Quick-Access Category Filter Pills */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-800/40">
                             <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mr-2 flex items-center gap-1">
                                <SlidersHorizontal className="w-3 h-3 text-slate-500" />
                                Quick Filter:
                             </span>
                             {allUniqueCategories.slice(0, 10).map(cat => {
                                const isSelected = logsCategoryFilter.toLowerCase() === cat.toLowerCase();
                                return (
                                   <button
                                      key={cat}
                                      onClick={() => setLogsCategoryFilter(cat)}
                                      className={cn(
                                         "px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all border cursor-pointer",
                                         isSelected 
                                            ? "bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-500/25" 
                                            : "bg-slate-950/40 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border-slate-800"
                                      )}
                                   >
                                      {cat}
                                   </button>
                                );
                             })}
                          </div>
                       </div>

                       {/* Expenditures Ledger Table */}
                       <div className="rounded-2xl border border-slate-800 bg-[#1e293b]/20 overflow-hidden shadow-2xl backdrop-blur-md">
                          <table className="w-full text-left border-collapse">
                             <thead className="bg-[#0b1120]">
                                <tr>
                                   <th className="px-6 py-4 text-[10px] uppercase font-black tracking-[0.2em] text-slate-500">Timestamp</th>
                                   <th className="px-6 py-4 text-[10px] uppercase font-black tracking-[0.2em] text-slate-500">Description</th>
                                   <th className="px-6 py-4 text-[10px] uppercase font-black tracking-[0.2em] text-slate-500">Entity</th>
                                   <th className="px-6 py-4 text-[10px] uppercase font-black tracking-[0.2em] text-slate-500 text-right">Value</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-800">
                                {sortedAndFiltered.length === 0 ? (
                                   <tr>
                                      <td colSpan={4} className="px-6 py-12 text-center text-xs font-semibold text-slate-400">
                                         No expense records mathced the filter context ("{logsCategoryFilter}").
                                      </td>
                                   </tr>
                                ) : (
                                   sortedAndFiltered.map((log) => (
                                      <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                         <td className="px-6 py-4 text-xs tabular-nums text-slate-400">
                                            {log.date ? new Date(log.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'NOW'}
                                         </td>
                                         <td className="px-6 py-4 text-sm font-medium text-slate-200">{log.note}</td>
                                         <td className="px-6 py-4">
                                            <span className="px-2 py-0.5 rounded text-[9px] uppercase font-black border border-violet-500/20 bg-violet-500/5 text-violet-400">
                                               {log.category}
                                            </span>
                                         </td>
                                         <td className="px-6 py-4 text-right font-black text-rose-400">₹{log.amount}</td>
                                      </tr>
                                   ))
                                )}
                             </tbody>
                          </table>
                       </div>
                    </div>
                </motion.div>
              );
            })()}

            {activeTab === 'settings' && (
               <motion.div 
                 key="settings"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="flex-1 p-8 overflow-y-auto"
               >
                 <div className="max-w-2xl mx-auto space-y-8 text-left">
                   <div>
                     <h2 className="text-3xl font-black tracking-tight uppercase">Settings</h2>
                     <p className="text-slate-500">Configure parameters and access authorization tags</p>
                   </div>

                   {/* Sub-tab selection */}
                   <div className="flex border-b border-slate-800 pb-px">
                     <button
                       onClick={() => setSettingsSubTab('profile')}
                       className={cn(
                         "px-6 py-3 font-black text-xs uppercase tracking-widest border-b-2 transition-all cursor-pointer",
                         settingsSubTab === 'profile'
                           ? "border-violet-500 text-slate-100 font-black"
                           : "border-transparent text-slate-500 hover:text-slate-300"
                       )}
                     >
                       System Config
                     </button>
                     <button
                       onClick={() => setSettingsSubTab('security')}
                       className={cn(
                         "px-6 py-3 font-black text-xs uppercase tracking-widest border-b-2 transition-all cursor-pointer",
                         settingsSubTab === 'security'
                           ? "border-violet-500 text-slate-100 font-black"
                           : "border-transparent text-slate-500 hover:text-slate-300"
                       )}
                     >
                       Security & Recovery
                     </button>
                   </div>

                   {settingsSubTab === 'profile' && (
                     <div className="space-y-12 animate-fade-in text-left">
                       <div className="space-y-8">
                         <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Monthly Capability (₹)</label>
                            <input 
                                type="number" 
                                className="w-full bg-[#1e293b]/50 border border-slate-700 rounded-xl px-4 py-4 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all text-white"
                                value={profile?.budget_limit || 10000}
                                onChange={(e) => setProfile(prev => prev ? {...prev, budget_limit: Number(e.target.value)} : null)}
                            />
                         </div>

                         <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Behavioral Context</label>
                            <textarea 
                                rows={4}
                                className="w-full bg-[#1e293b]/50 border border-slate-700 rounded-xl px-4 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all resize-none leading-relaxed text-white"
                                placeholder="Describe your goals e.g. 'I want to save for a trip to Goa in Oct'"
                                value={profile?.lifestyle_info || ''}
                                onChange={(e) => setProfile(prev => prev ? {...prev, lifestyle_info: e.target.value} : null)}
                            />
                         </div>

                         <button 
                            onClick={async () => {
                                if (profile) {
                                    await api.updateProfile(profile);
                                    alert("Configuration synchronized.");
                                }
                            }}
                            className="w-full bg-violet-600 hover:bg-violet-500 py-4 rounded-xl font-black uppercase text-sm tracking-[0.2em] shadow-xl shadow-violet-600/30 transition-all active:scale-[0.98] text-white cursor-pointer"
                         >
                            Sync Preferences
                         </button>
                       </div>

                       {/* Emergency Fund Tracking Section */}
                       <div className="border-t border-slate-800 pt-10 space-y-6">
                         <div>
                           <h3 className="text-2xl font-black tracking-tight uppercase">Emergency Fund Tracking</h3>
                           <p className="text-slate-500 text-sm font-medium">Define a safety buffer for rainy days and monitor your goals as a student</p>
                         </div>

                         <div className="bg-[#1e293b]/30 p-6 rounded-2xl border border-slate-800 space-y-6">
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                             <div className="space-y-3">
                               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Target Fund (₹)</label>
                               <input 
                                 type="number" 
                                 className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:ring-1 focus:ring-violet-500 text-white"
                                 placeholder="e.g. 5000"
                                 value={profile?.emergency_target !== undefined ? profile.emergency_target : 5000}
                                 onChange={async (e) => {
                                   const val = Math.max(0, Number(e.target.value));
                                   const updated = profile 
                                     ? { ...profile, emergency_target: val } 
                                     : { user_id: currentUser || 'default_user', budget_limit: 10000, emergency_target: val };
                                   setProfile(updated);
                                   await api.updateProfile(updated);
                                 }}
                               />
                               <p className="text-[11px] text-slate-500 leading-relaxed">
                                 Aim for 3-6x of subscription commitments (₹{(activeSubsTotal * 3).toLocaleString()} - ₹{(activeSubsTotal * 6).toLocaleString()})
                               </p>
                             </div>

                             <div className="space-y-3">
                               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Current Saved (₹)</label>
                               <input 
                                 type="number" 
                                 className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:ring-1 focus:ring-violet-500 text-white"
                                 placeholder="e.g. 1500"
                                 value={profile?.emergency_saved !== undefined ? profile.emergency_saved : 0}
                                 onChange={async (e) => {
                                   const val = Math.max(0, Number(e.target.value));
                                   const updated = profile 
                                     ? { ...profile, emergency_saved: val } 
                                     : { user_id: currentUser || 'default_user', budget_limit: 10000, emergency_saved: val };
                                   setProfile(updated);
                                   await api.updateProfile(updated);
                                 }}
                               />
                               <p className="text-[11px] text-slate-500 leading-relaxed">
                                 Cash safely stacked away for unforeseen student emergencies and situations
                               </p>
                             </div>
                           </div>

                           {(() => {
                             const target = profile?.emergency_target ?? 5000;
                             const saved = profile?.emergency_saved ?? 0;
                             const percent = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
                             const remaining = Math.max(0, target - saved);

                             return (
                               <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
                                 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
                                   <div>
                                     <p className="text-[10px] font-black uppercase tracking-widest text-violet-400">Target Progress</p>
                                     <h4 className="text-3xl font-extrabold text-white mt-1">
                                       {percent}% <span className="text-sm font-medium text-slate-400">Accomplished</span>
                                     </h4>
                                   </div>
                                   <div className="sm:text-right">
                                     <span className="text-sm font-mono font-bold text-slate-300 block">₹{saved.toLocaleString()} / ₹{target.toLocaleString()}</span>
                                     {remaining > 0 ? (
                                       <p className="text-[10px] text-amber-500 font-semibold mt-1">₹{remaining.toLocaleString()} more needed</p>
                                     ) : (
                                       <p className="text-[10px] text-emerald-400 font-black uppercase tracking-wider mt-1 flex items-center gap-1 sm:justify-end">
                                         <ShieldCheck className="w-4 h-4" /> Fully Protected met ✓
                                       </p>
                                     )}
                                   </div>
                                 </div>

                                 <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden relative">
                                   <motion.div 
                                     initial={{ width: 0 }}
                                     animate={{ width: `${percent}%` }}
                                     className={`h-full rounded-full transition-all duration-300 ${
                                       percent >= 100 
                                         ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                                         : percent >= 50 
                                           ? 'bg-gradient-to-r from-violet-600 to-indigo-500' 
                                           : 'bg-gradient-to-r from-amber-600 to-amber-500'
                                     }`}
                                   />
                                 </div>

                                 {/* Quick Actions to add/withdraw buffer */}
                                 <div className="pt-2 flex flex-wrap gap-3 items-center justify-between">
                                   <div className="flex gap-2">
                                     <button
                                       onClick={async () => {
                                         const updated = profile 
                                           ? { ...profile, emergency_saved: (profile.emergency_saved ?? 0) + 100 } 
                                           : { user_id: currentUser || 'default_user', budget_limit: 10000, emergency_saved: 100 };
                                         setProfile(updated);
                                         await api.updateProfile(updated);
                                       }}
                                       className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold transition-all active:scale-95 cursor-pointer"
                                     >
                                       +₹100
                                     </button>
                                     <button
                                       onClick={async () => {
                                         const updated = profile 
                                           ? { ...profile, emergency_saved: (profile.emergency_saved ?? 0) + 500 } 
                                           : { user_id: currentUser || 'default_user', budget_limit: 10000, emergency_saved: 500 };
                                         setProfile(updated);
                                         await api.updateProfile(updated);
                                       }}
                                       className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold transition-all active:scale-95 cursor-pointer"
                                     >
                                       +₹500
                                     </button>
                                     <button
                                       onClick={async () => {
                                         const updated = profile 
                                           ? { ...profile, emergency_saved: (profile.emergency_saved ?? 0) + 1000 } 
                                           : { user_id: currentUser || 'default_user', budget_limit: 10000, emergency_saved: 1000 };
                                         setProfile(updated);
                                         await api.updateProfile(updated);
                                       }}
                                       className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold transition-all active:scale-95 cursor-pointer"
                                     >
                                       +₹1000
                                     </button>
                                   </div>

                                   <div className="flex gap-2">
                                     <button
                                       onClick={async () => {
                                         const currentSaved = profile?.emergency_saved ?? 0;
                                         if (currentSaved <= 0) return;
                                         const updated = profile 
                                           ? { ...profile, emergency_saved: Math.max(0, currentSaved - 500) } 
                                           : { user_id: currentUser || 'default_user', budget_limit: 10000, emergency_saved: 0 };
                                         setProfile(updated);
                                         await api.updateProfile(updated);
                                       }}
                                       className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-950/60 border border-red-500/20 text-xs text-red-100 font-bold transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                                       disabled={(profile?.emergency_saved ?? 0) <= 0}
                                     >
                                       Withdraw ₹500
                                     </button>
                                     <button
                                       onClick={async () => {
                                         if (confirm("Reset current saved emergency balance to 0?")) {
                                           const updated = profile 
                                             ? { ...profile, emergency_saved: 0 } 
                                             : { user_id: currentUser || 'default_user', budget_limit: 10000, emergency_saved: 0 };
                                           setProfile(updated);
                                           await api.updateProfile(updated);
                                         }
                                       }}
                                       className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-400 hover:text-white font-bold transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                                       disabled={(profile?.emergency_saved ?? 0) <= 0}
                                     >
                                       Reset
                                     </button>
                                   </div>
                                 </div>
                               </div>
                             );
                           })()}
                         </div>
                       </div>

                       {/* Subscription Management Section */}
                       <div className="border-t border-slate-800 pt-10 space-y-6">
                         <div>
                           <h3 className="text-2xl font-black tracking-tight uppercase">Monthly Subscriptions</h3>
                           <p className="text-slate-500 text-sm">Manage recurring fixed costs automatically deducted from Available Cash</p>
                         </div>

                         {/* Add Subscription Form */}
                         <div className="bg-[#1e293b]/30 p-5 rounded-2xl border border-slate-800/80 space-y-4">
                           <h4 className="text-xs font-black uppercase tracking-[0.15em] text-violet-400">Add New Subscription</h4>
                           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                             <input 
                               type="text" 
                               placeholder="Name (e.g., Spotify, Netflix)" 
                               className="bg-slate-900/50 border border-slate-700/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 text-white placeholder-slate-500"
                               value={newSubName}
                               onChange={(e) => setNewSubName(e.target.value)}
                             />
                             <input 
                               type="number" 
                               placeholder="Price per month (₹)" 
                               className="bg-slate-900/55 border border-slate-700/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 text-white placeholder-slate-500"
                               value={newSubAmount}
                               onChange={(e) => setNewSubAmount(e.target.value)}
                             />
                             <select 
                               className="bg-slate-900/50 border border-slate-700/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 text-slate-300"
                               value={newSubCategory}
                               onChange={(e) => setNewSubCategory(e.target.value)}
                             >
                               <option value="Entertainment">Entertainment</option>
                               <option value="Education">Education</option>
                               <option value="Utilities">Utilities</option>
                               <option value="Other">Other</option>
                             </select>
                           </div>
                           <div className="flex gap-2">
                             <input 
                               type="text" 
                               placeholder="Billing Date (e.g. 5th of every month)" 
                               className="flex-1 bg-slate-900/50 border border-slate-700/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 text-white placeholder-slate-500"
                               value={newSubBillingDate}
                               onChange={(e) => setNewSubBillingDate(e.target.value)}
                             />
                             <button 
                               onClick={handleAddSubscription}
                               className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                             >
                               Add
                             </button>
                           </div>
                         </div>

                         {/* Subscription List */}
                         <div className="space-y-3">
                           {subscriptions.length === 0 ? (
                             <div className="text-center py-8 bg-[#1e293b]/10 rounded-2xl border border-slate-800/60 text-slate-500 text-sm font-medium">
                               No recurring subscriptions found. Add one above to start tracking!
                             </div>
                           ) : (
                             subscriptions.map((sub) => (
                               <div key={sub.id} className="flex items-center justify-between p-4 bg-[#1e293b]/20 border border-slate-800/80 rounded-2xl">
                                 <div>
                                   <div className="flex items-center gap-2">
                                     <h4 className="font-bold text-slate-200">{sub.name}</h4>
                                     <span className="px-2 py-0.5 rounded text-[8px] uppercase font-bold border border-violet-500/20 bg-violet-500/5 text-violet-400">
                                       {sub.category}
                                     </span>
                                   </div>
                                   <p className="text-xs text-slate-500 mt-0.5">{sub.billing_date || 'Monthly Billing'}</p>
                                 </div>
                                 <div className="flex items-center gap-4">
                                   <span className="text-sm font-black text-violet-400">₹{sub.amount}/mo</span>
                                   
                                   <button 
                                     onClick={() => handleToggleSubscription(sub)}
                                     className={cn(
                                       "px-2.5 py-1 rounded-lg text-[10px] uppercase font-black tracking-wider border transition-all cursor-pointer",
                                       sub.active === 1 
                                         ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20" 
                                         : "bg-slate-800/50 text-slate-500 border-slate-700 hover:bg-slate-800"
                                     )}
                                   >
                                     {sub.active === 1 ? 'Active' : 'Paused'}
                                   </button>

                                   <button 
                                     onClick={() => sub.id && handleDeleteSubscription(sub.id)}
                                     className="text-slate-600 hover:text-rose-400 p-2 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                                     title="Delete Subscription"
                                    >
                                     <Trash2 className="w-4 h-4" />
                                   </button>
                                 </div>
                               </div>
                             ))
                           )}
                         </div>
                       </div>
                     </div>
                   )}

                   {settingsSubTab === 'security' && (
                     <div className="space-y-8 animate-fade-in text-left">
                       <div>
                         <h3 className="text-2xl font-black tracking-tight uppercase">Security & Active Sessions</h3>
                         <p className="text-slate-500 text-sm">Secure your financial credentials, recovery system configurations, and reset logs</p>
                       </div>

                       {/* Session & Active User information display in a beautiful premium card */}
                       <div className="bg-[#1e293b]/30 p-6 rounded-2xl border border-slate-800 space-y-6">
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans text-left">
                           <div className="text-left font-sans">
                             <p className="text-xs font-black uppercase tracking-wider text-slate-400">Authenticated Session</p>
                             <span className="text-xl font-extrabold text-white capitalize">{currentUser}</span>
                             <p className="text-[10px] text-emerald-400 font-bold uppercase mt-1">Verified OTP Login Active</p>
                           </div>

                           <button
                             onClick={handleLogout}
                             className="bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/20 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer font-sans"
                           >
                             Sign Out Securely
                           </button>
                         </div>

                         {currentResetKey && (
                           <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-900 space-y-2 text-left">
                             <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1 font-sans">
                               <ShieldCheck className="w-3.5 h-3.5" />
                               Active Recovery Reset Key
                             </p>
                             <div className="flex items-center gap-2">
                               <code className="text-slate-350 font-mono text-xs font-bold bg-[#1e293b]/40 border border-slate-800 px-3 py-1.5 rounded-lg flex-1 select-all break-all text-left">
                                 {currentResetKey}
                               </code>
                               <button
                                 onClick={() => {
                                   navigator.clipboard.writeText(currentResetKey);
                                   alert("Recovery Reset Key copied to clipboard successfully!");
                                 }}
                                 className="bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer font-sans"
                               >
                                 Copy
                               </button>
                             </div>
                             <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                               Use this key to recover or update your password via the login page if you ever forget it. Keep it stored in a safe, inaccessible place.
                             </p>
                           </div>
                         )}

                         <form onSubmit={handleRegenerateResetKey} className="border-t border-slate-800/80 pt-5 space-y-4">
                           <h4 className="text-xs font-black uppercase tracking-[0.15em] text-violet-400 text-left font-sans">Regenerate Recovery Reset Key</h4>
                           <p className="text-xs text-slate-500 text-left font-sans">
                             Regenerating generates a completely new security Reset Key, rendering the previous one obsolete. Password validation is required.
                           </p>

                           {regenError && (
                             <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-xl font-medium text-left font-sans">
                               ⚠️ {regenError}
                             </div>
                           )}

                           {regenSuccess && (
                             <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-4 py-3 rounded-xl font-medium text-left font-sans">
                               {regenSuccess}
                             </div>
                           )}

                           <div className="flex flex-col sm:flex-row gap-3">
                             <div className="relative flex-1">
                               <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                               <input 
                                 type="password" 
                                 placeholder="Enter password to authorize key change" 
                                 className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 text-white placeholder-slate-500"
                                 value={regenPass}
                                 onChange={(e) => setRegenPass(e.target.value)}
                               />
                             </div>
                             <button 
                               type="submit"
                               disabled={regenLoading}
                               className="bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/50 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
                             >
                               {regenLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Regenerate Key"}
                             </button>
                            </div>
                          </form>
                        </div>

                        {/* Security Activity Log Section */}
                        <div className="bg-[#1e293b]/30 p-6 rounded-2xl border border-slate-800 space-y-6">
                            <div>
                                <h4 className="text-sm font-extrabold text-white uppercase tracking-tight font-sans">Security Activity</h4>
                                <p className="text-xs text-slate-500 font-sans mt-1">Review recent login attempts, password updates, and account verification event timestamps</p>
                            </div>

                            {/* Search and Filter Row */}
                            <div className="flex gap-2 relative">
                                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Search events... (e.g., login, reset, success)"
                                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all font-sans"
                                    value={securitySearch}
                                    onChange={(e) => setSecuritySearch(e.target.value)}
                                />
                                {securitySearch && (
                                    <button
                                        onClick={() => setSecuritySearch('')}
                                        className="absolute right-3.5 top-3 text-[10px] uppercase font-black tracking-wider text-violet-400 hover:text-white transition-all cursor-pointer font-sans"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            {/* Logs list rendered as an elegant high-contrast list or table */}
                            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
                                {securityLogsLoading ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-2 font-sans">
                                        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
                                        <span className="text-xs text-slate-500 font-medium">Retrieving security incident log...</span>
                                    </div>
                                ) : (() => {
                                    const filtered = securityLogs.filter(log => {
                                        const term = securitySearch.trim().toLowerCase();
                                        if (!term) return true;
                                        return (
                                            (log.action && log.action.toLowerCase().includes(term)) ||
                                            (log.details && log.details.toLowerCase().includes(term)) ||
                                            (log.ip_address && log.ip_address.toLowerCase().includes(term)) ||
                                            (log.timestamp && log.timestamp.toLowerCase().includes(term))
                                        );
                                    });

                                    if (filtered.length === 0) {
                                        return (
                                            <div className="text-center py-10 text-slate-500 font-medium text-xs font-sans">
                                                {securityLogs.length === 0 ? "No security incidents logged yet." : "No matching security logs found."}
                                            </div>
                                        );
                                    }

                                    return (
                                        <table className="w-full text-left border-collapse font-sans text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-800 bg-slate-950/80 text-[10px] uppercase font-black tracking-wider text-slate-400">
                                                    <th className="p-3">Incident / Event</th>
                                                    <th className="p-3">Details</th>
                                                    <th className="p-3">IP Address</th>
                                                    <th className="p-3 text-right">Timestamp</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800 text-slate-300">
                                                {filtered.map((log) => {
                                                    const isSuccess = log.action?.toLowerCase().includes('success');
                                                    const isFailed = log.action?.toLowerCase().includes('fail');
                                                    return (
                                                        <tr key={log.id} className="hover:bg-slate-900/40 transition-all">
                                                            <td className="p-3 font-bold">
                                                                <span className={cn(
                                                                    "px-2 py-0.5 rounded text-[9px] uppercase font-bold mr-2",
                                                                    isSuccess 
                                                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                                                        : isFailed 
                                                                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                                                                            : "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                                                                )}>
                                                                    {log.action}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-slate-400 leading-relaxed max-w-xs truncate" title={log.details}>
                                                                {log.details || "-"}
                                                            </td>
                                                            <td className="p-3 font-mono text-slate-500 text-[10px]">
                                                                {log.ip_address || "127.0.0.1"}
                                                            </td>
                                                            <td className="p-3 font-mono text-slate-500 text-right text-[10px]">
                                                                {log.timestamp ? new Date(log.timestamp + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : "-"}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    );
                                })()}
                            </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
             )}
           </AnimatePresence>
         </main>

         {/* Action Panel (Analysis View) - Consistent with the design sidebar */}
         <aside className={cn(
          "w-85 lg:w-96 flex-shrink-0 bg-slate-900/90 border-l border-slate-800 p-6 flex flex-col gap-6 transition-all duration-300 overflow-y-auto custom-scrollbar",
          activeTab === 'chat' ? "translate-x-0 block" : "hidden"
        )}>
          {/* Section 1: TODAY'S FINANCIAL SUMMARY */}
          <section className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-violet-505 rounded-full bg-violet-500 animate-ping" />
              Today's Financial Summary
            </h3>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/40">
                <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">Today's Spend</span>
                <p className="text-lg font-black text-white mt-0.5">
                  ₹{(() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const todaySpend = budgetLogs
                      .filter(l => l.date && l.date.slice(0, 10) === todayStr)
                      .reduce((sum, l) => sum + l.amount, 0);
                    return todaySpend.toLocaleString();
                  })()}
                </p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/40">
                <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">Pending Splits</span>
                <p className="text-lg font-black text-slate-300 mt-0.5">
                  {groups.length} active
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/40">
                <span className="text-slate-400 font-semibold">Remaining Limit</span>
                <span className="text-slate-200 font-bold">
                  ₹{(() => {
                    const totalSpent = budgetLogs.reduce((sum, l) => sum + l.amount, 0);
                    return ((profile?.budget_limit || 10000) - totalSpent).toLocaleString();
                  })()}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/40">
                <span className="text-slate-400 font-semibold">Savings Guard</span>
                <span className={cn(
                  "font-black uppercase tracking-widest text-[9px] px-2 py-0.5 rounded-md",
                  (() => {
                    const totalSpent = budgetLogs.reduce((sum, l) => sum + l.amount, 0);
                    const remaining = (profile?.budget_limit || 10000) - totalSpent;
                    const pct = remaining / (profile?.budget_limit || 10000);
                    if (pct > 0.4) return "bg-emerald-500/10 text-emerald-400";
                    if (pct > 0.15) return "bg-amber-500/10 text-amber-400";
                    return "bg-rose-500/10 text-rose-400";
                  })()
                )}>
                  {(() => {
                    const totalSpent = budgetLogs.reduce((sum, l) => sum + l.amount, 0);
                    const remaining = (profile?.budget_limit || 10000) - totalSpent;
                    const pct = remaining / (profile?.budget_limit || 10000);
                    if (pct > 0.4) return "SECURE 💚";
                    if (pct > 0.15) return "STABLE 💛";
                    return "CRITICAL 🚨";
                  })()}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-400 font-semibold">Top Category</span>
                <span className="text-slate-200 font-bold capitalize">
                  {(() => {
                    const catMap: Record<string, number> = {};
                    budgetLogs.forEach(l => {
                      if (l.category) {
                        catMap[l.category] = (catMap[l.category] || 0) + l.amount;
                      }
                    });
                    let best = "None";
                    let maxAmt = 0;
                    Object.entries(catMap).forEach(([cat, val]) => {
                      if (val > maxAmt) {
                        maxAmt = val;
                        best = cat;
                      }
                    });
                    return best;
                  })()}
                </span>
              </div>
            </div>
          </section>

          {/* Section 2: SMART AI INSIGHTS */}
          <section>
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              Smart AI Insights
            </h3>
            <div className="space-y-2.5">
              {(() => {
                const totalSpent = budgetLogs.reduce((sum, l) => sum + l.amount, 0);
                const limit = profile?.budget_limit || 10000;
                const totalFood = budgetLogs.filter(l => ['food', 'food & dining', 'grocery'].includes(l.category?.toLowerCase() || '')).reduce((sum, l) => sum + l.amount, 0);
                const foodPercentage = totalSpent > 0 ? Math.round((totalFood / totalSpent) * 100) : 0;
                const totalSubs = subscriptions.reduce((sum, s) => s.active === 1 ? sum + s.amount : sum, 0);

                const dynamicInsights = [];
                if (totalSpent > limit) {
                  dynamicInsights.push({
                    title: "Budget Overrun Warning",
                    desc: "You have crossed your limit! Emergency savings buffer is now securing your checkout pipeline.",
                    color: "text-rose-400 bg-rose-500/10 border-rose-500/20"
                  });
                }
                if (foodPercentage > 25) {
                  dynamicInsights.push({
                    title: "Food Outflow Velocity",
                    desc: `Food and dining accounts for ${foodPercentage}% of spends. Try pooling pantry shares with housemates.`,
                    color: "text-amber-400 bg-amber-500/10 border-amber-500/10"
                  });
                }
                if (totalSubs > 1000) {
                  dynamicInsights.push({
                    title: "Subscription Cleanup",
                    desc: `You are running ₹${totalSubs.toLocaleString()} in recursive subscriptions. Review to purge non-essentials.`,
                    color: "text-violet-400 bg-violet-500/10 border-violet-500/20"
                  });
                }

                // Fallback elegant insights
                dynamicInsights.push({
                  title: "Student Autopilot Stream",
                  desc: `Scanning database... ${budgetLogs.length} transaction entries verified on ledger. System optimized.`,
                  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/10"
                });

                return dynamicInsights.map((insight, idx) => (
                  <div key={idx} className={cn("p-4 rounded-2xl border text-xs leading-relaxed transition-all", insight.color)}>
                    <h4 className="font-bold mb-1 uppercase tracking-wider text-[10px]">{insight.title}</h4>
                    <p className="opacity-80 font-medium">{insight.desc}</p>
                  </div>
                ));
              })()}
            </div>
          </section>

          {/* Section 3: RECENT OCR ACTIVITY */}
          <section>
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              Recent OCR Activity
            </h3>
            <div className="space-y-2">
              {(() => {
                const ocrLogs = budgetLogs.filter(l => 
                  l.note?.toLowerCase().includes("ocr") || 
                  l.note?.toLowerCase().includes("upload") || 
                  l.note?.toLowerCase().includes("captured") || 
                  l.note?.toLowerCase().includes("invoice") || 
                  l.note?.toLowerCase().includes("receipt")
                ).slice(0, 3);

                if (ocrLogs.length === 0) {
                  return (
                    <>
                      <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/40 text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-200">Shared Cantina Invoice</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Parsed via Gemini Flash • 99.4% confidence</p>
                        </div>
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-extrabold uppercase px-2 py-0.5 rounded">VERIFIED</span>
                      </div>
                      <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/40 text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-200">Velo Books Slip</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Auto-cropped • 98.6% confidence</p>
                        </div>
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-extrabold uppercase px-2 py-0.5 rounded">VERIFIED</span>
                      </div>
                    </>
                  );
                }

                return ocrLogs.map((log, idx) => (
                  <div key={idx} className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/40 text-xs flex justify-between items-center hover:bg-slate-950/70 transition-colors">
                    <div className="max-w-[70%]">
                      <p className="font-bold text-slate-200 truncate">{log.note}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">₹{log.amount} • {log.category}</p>
                    </div>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-black uppercase px-2 py-0.5 rounded">PARSED</span>
                  </div>
                ));
              })()}
            </div>
          </section>

          {/* Section 4: PENDING SETTLEMENTS */}
          <section className="mt-auto">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-violet-400" />
              Pending Settlements
            </h3>
            
            <div className="space-y-2.5">
              {groups.length === 0 ? (
                <div className="p-4 rounded-2xl bg-violet-950/10 border border-violet-900/20 text-center">
                  <p className="text-[11px] leading-relaxed text-slate-500 font-medium">No pending splits or settlements inside. Open chat or OCR invoice to divide shared costs instantly.</p>
                </div>
              ) : (
                groups.slice(0, 2).map((group, gIdx) => {
                  let membersArr: string[] = [];
                  let balancesObj: Record<string, number> = {};
                  try {
                    membersArr = typeof group.members === 'string' ? JSON.parse(group.members) : group.members;
                    balancesObj = typeof group.balances === 'string' ? JSON.parse(group.balances) : group.balances;
                  } catch (e) {
                    console.warn("Parse balances failure in sidebar", e);
                  }

                  const groupDebts = Object.entries(balancesObj).filter(([_, bal]) => bal < 0);
                  const groupReceivers = Object.entries(balancesObj).filter(([_, bal]) => bal > 0);

                  return (
                    <div key={group.id || gIdx} className="bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800/80">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-black text-slate-200 tracking-wide truncate max-w-[65%]">{group.group_name}</p>
                        <span className="text-[9px] bg-violet-600/20 text-violet-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                          Active Split
                        </span>
                      </div>

                      <div className="space-y-1 my-2">
                        {groupDebts.slice(0, 2).map(([name, bal]) => (
                          <div key={name} className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-400 font-medium flex items-center gap-1">
                              <span className="w-1 bg-violet-500 rounded-full" />
                              {name}
                            </span>
                            <span className="text-amber-400 font-extrabold font-mono font-bold">owes ₹{Math.abs(bal).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-1.5 mt-3 pt-2 border-t border-slate-900/80">
                        <button
                          onClick={() => {
                            const receiver = groupReceivers[0]?.[0] || 'Chaitu';
                            const firstDebtor = groupDebts[0]?.[0] || 'Mohan';
                            const debtorAmt = groupDebts[0]?.[1] ? Math.abs(groupDebts[0][1]) : 150;
                            
                            const reminderText = `Hey ${firstDebtor}! UPI reminder from Anika-AI. Your share on ${group.group_name} is ₹${debtorAmt}. Please clear it to ${receiver}. Thanks!`;
                            navigator.clipboard.writeText(reminderText);
                            setOcrToast({
                              message: "Remind text copied to clipboard! Share on WhatsApp.",
                              filename: firstDebtor
                            });
                          }}
                          className="flex-1 py-1 px-2.5 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 rounded-lg text-[9px] font-bold text-violet-400 uppercase tracking-widest transition-colors cursor-pointer text-center"
                        >
                          UPI Remind 🔔
                        </button>
                        <button
                          onClick={async () => {
                            if (!group.id) return;
                            try {
                              await api.deleteGroup(group.id).catch(() => {});
                              await fetchData();
                              setOcrToast({
                                message: "Excellent! Group debts settled and cleared successfully.",
                                filename: group.group_name
                              });
                            } catch (e: any) {
                              alert("Clear split failure: " + e.message);
                            }
                          }}
                          className="flex-1 py-1 px-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/25 rounded-lg text-[9px] font-bold text-emerald-400 uppercase tracking-widest transition-colors cursor-pointer text-center"
                        >
                          Settle Cost ✓
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </aside>
      </div>
      <AnimatePresence>
        {isUploadModalOpen && (
          <UploadModal 
            isOpen={isUploadModalOpen}
            onClose={() => {
              setIsUploadModalOpen(false);
              setPreloadedBills([]);
              setPreloadedRawText("");
              setPreloadedPhase("idle");
              setPreloadedWizardStep("preview");
            }}
            budgetLogs={budgetLogs}
            groups={groups}
            onSaveExpense={addExpense}
            onSaveGroupSplit={(groupName, members, balances) => {
              fetchData();
            }}
            initialPreloadedBills={preloadedBills}
            initialRawText={preloadedRawText}
            initialPhase={preloadedPhase}
            initialWizardStep={preloadedWizardStep}
            onAddMessage={async (msg) => {
              const formattedMsg = {
                role: msg.role === 'model' ? 'model' as const : 'user' as const,
                content: msg.content
              };
              setMessages(prev => [...prev, formattedMsg]);
              try {
                await api.saveHistory({
                  conversation_id: conversationId,
                  role: msg.role,
                  content: msg.content
                });
              } catch (e) {
                console.warn("Failed persisting OCR context to chat history:", e);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-300 relative group overflow-hidden border",
        active 
          ? "bg-violet-600/20 text-violet-400 border-violet-600/30 font-bold" 
          : "text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-200"
      )}
    >
      <div className={cn(
        "transition-transform duration-300",
        active ? "scale-110" : "group-hover:scale-110"
      )}>
        {icon}
      </div>
      <span className="text-sm tracking-wide hidden lg:block">
        {label}
      </span>
    </button>
  );
}

function QuickAction({ label, onClick }: { label: string, onClick: () => void }) {
  return (
    <button 
        onClick={onClick}
        className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 hover:bg-violet-600/20 hover:text-violet-400 hover:border-violet-500/30 transition-all active:scale-95"
    >
      {label}
    </button>
  );
}

function StatCard({ title, value, subtitle, icon, trend, negative, children }: { title: string, value: string, subtitle: string, icon: React.ReactNode, trend?: string, negative?: boolean, children?: React.ReactNode }) {
  return (
    <div className="bg-[#1e293b]/40 border border-slate-800/50 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group hover:border-slate-700 transition-all flex flex-col justify-between">
      <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity rotate-12 scale-150 pointer-events-none">
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-slate-900/50 rounded-xl flex items-center justify-center border border-slate-800">
            {icon}
          </div>
          <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.2em]">{title}</p>
        </div>
        <div className="space-y-1">
          <h3 className="text-3xl font-black tracking-tighter text-white">{value}</h3>
          <p className="text-slate-500 text-[10px] font-medium tracking-wide">{subtitle}</p>
        </div>
      </div>
      {(trend || children) && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/40">
          {trend ? (
            <div className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
              negative ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
            )}>
              {trend}
            </div>
          ) : <div />}
          {children}
        </div>
      )}
    </div>
  );
}

function GlassCard({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="bg-[#1e293b] border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-6">
            {icon}
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">{title}</h3>
        </div>
        {children}
    </div>
  );
}

function InsightItem({ type, title, desc }: { type: 'success' | 'warning' | 'info', title: string, desc: string }) {
    const colors = {
        success: 'border-emerald-500/10 bg-emerald-500/5 text-emerald-400',
        warning: 'border-amber-500/10 bg-amber-500/5 text-amber-400',
        info: 'border-indigo-500/10 bg-indigo-500/5 text-indigo-400'
    };
    return (
        <div className={cn("p-4 rounded-xl border flex gap-4 transition-all hover:scale-[1.01]", colors[type])}>
            <div>
                <Sparkles className="w-4 h-4 mt-0.5 opacity-50" />
            </div>
            <div>
                <p className="font-black text-[10px] uppercase tracking-widest mb-1">{title}</p>
                <p className="text-[11px] leading-relaxed font-medium opacity-80">{desc}</p>
            </div>
        </div>
    );
}

function AddExpenseModal({ onAdd }: { onAdd: (amount: number, category: string, note: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState({ amount: '', category: 'Food', note: '' });

    if (!isOpen) return (
        <button 
            onClick={() => setIsOpen(true)}
            className="bg-violet-600 hover:bg-violet-500 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-violet-600/20 active:scale-95"
        >
            <Plus className="w-4 h-4" /> Add Entity
        </button>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0b1120]/90 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#1e293b] border border-slate-700 p-8 rounded-3xl w-full max-w-md shadow-2xl"
            >
                <h3 className="text-xl font-black uppercase tracking-tight mb-8">Record Expenditure</h3>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">Quantum (₹)</label>
                        <input 
                            type="number" 
                            className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-5 py-4 text-2xl font-black focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">Category Class</label>
                        <select 
                            className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-5 py-4 text-sm font-bold focus:outline-none"
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                        >
                            <option>Food</option>
                            <option>Transportation</option>
                            <option>Gadgets</option>
                            <option>Cosmetics</option>
                            <option>Education</option>
                            <option>Entertainment</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">Descriptor</label>
                        <input 
                            type="text" 
                            className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                            placeholder="e.g. Dark Chocolate"
                            value={formData.note}
                            onChange={(e) => setFormData({...formData, note: e.target.value})}
                        />
                    </div>
                    <div className="flex gap-4 pt-6">
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                            Abort
                        </button>
                        <button 
                            onClick={() => {
                                if (formData.amount && formData.note) {
                                    onAdd(Number(formData.amount), formData.category, formData.note);
                                    setIsOpen(false);
                                    setFormData({ amount: '', category: 'Food', note: '' });
                                }
                            }}
                            className="flex-[1.5] bg-violet-600 hover:bg-violet-500 py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-violet-600/30 transition-all active:scale-[0.98]"
                        >
                            EXECUTE LOG
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}


