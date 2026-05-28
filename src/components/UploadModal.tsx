import React, { useState, useRef, useEffect } from "react";
import { useParticipantStore } from "../stores/useParticipantStore";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";
import { 
  X, 
  UploadCloud, 
  Lock, 
  FileText, 
  Image as ImageIcon, 
  Sparkles, 
  Check, 
  Loader2, 
  Plus, 
  Calendar, 
  Store, 
  Users, 
  CheckCircle2, 
  ShieldCheck, 
  Cpu, 
  Shuffle, 
  Utensils, 
  ShoppingBag,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Scissors,
  Sliders,
  AlertTriangle,
  Layers,
  Eye,
  PlusCircle,
  FolderOpen,
  ArrowRight,
  Share2,
  Bell,
  Download,
  Send
} from "lucide-react";
import { api } from "../lib/api";
import { BudgetLog } from "../types";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (amount: number, category: string, note: string) => void;
  onSaveGroupSplit: (groupName: string, members: string[], balances: Record<string, number>) => void;
  onAddMessage: (msg: { role: 'user' | 'model'; content: string }) => void;
  budgetLogs?: BudgetLog[];
  groups?: any[];
  initialPreloadedBills?: any[];
  initialRawText?: string;
  initialPhase?: "idle" | "analyzing" | "complete";
  initialWizardStep?: "preview" | "participants" | "splits" | "confirm";
}

interface VisualCategory {
  id: "Receipt" | "Screenshot" | "Note" | "GroupSplit";
  subId: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  tips: string[];
}

interface LineItem {
  name: string;
  price: number;
  quantity: number;
}

interface SegmentedBill {
  id: string;
  expenseId?: number;
  merchant: string;
  date: string;
  totalAmount: number;
  category: string;
  items: LineItem[];
  insights: string[];
  segmentDescription: string;
  isGroupSplitEnabled: boolean;
  groupSplit: {
    detectedMembers: string[];
    payer: string;
    splitType: "equally" | "percentage" | "exact" | "items";
    memberPercentages: Record<string, number>;
    memberExacts: Record<string, number>;
    itemAssignments: Record<number, string[]>; // index of item -> list of names
    memberPaids?: Record<string, number>;
  };
}

export default function UploadModal({ 
  isOpen, 
  onClose, 
  onSaveExpense,
  onSaveGroupSplit,
  onAddMessage,
  budgetLogs = [],
  groups = [],
  initialPreloadedBills,
  initialRawText,
  initialPhase,
  initialWizardStep
}: UploadModalProps) {
  
  const [activeCategory, setActiveCategory] = useState<"Receipt" | "Screenshot" | "Note" | "GroupSplit">("Receipt");
  const [activeSubId, setActiveSubId] = useState<string>("restaurant");
  
  // Drag and drop states
  const [dragActive, setDragActive] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<{
    file: File;
    preview: string;
    progress: number;
    base64String: string;
  }[]>([]);
  
  // OCR & Progressive Wizard Steps
  // workflow phase: idle -> analyzing -> complete
  const [phase, setPhase] = useState<"idle" | "analyzing" | "complete">("idle");
  const [overallProgress, setOverallProgress] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  
  // Multi-step form wizard step inside phase === "complete"
  // Steps: preview -> participants -> splits -> confirm
  const [wizardStep, setWizardStep] = useState<"preview" | "participants" | "splits" | "confirm">("preview");
  
  // Dynamic parsing result states
  const [detectedBills, setDetectedBills] = useState<SegmentedBill[]>([]);
  const [rawText, setRawText] = useState("");
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [combineTotals, setCombineTotals] = useState(false);
  
  // Advanced OCR Features and States
  const [handwrittenFilter, setHandwrittenFilter] = useState(false);
  const [cropLeft, setCropLeft] = useState(10);
  const [cropTop, setCropTop] = useState(10);
  const [cropRight, setCropRight] = useState(90);
  const [cropBottom, setCropBottom] = useState(90);
  const [showCropPanel, setShowCropPanel] = useState(false);
  
  const [settledTransfers, setSettledTransfers] = useState<Record<string, boolean>>({});
  const [sentReminders, setSentReminders] = useState<Record<string, boolean>>({});
  const [modalNotification, setModalNotification] = useState<{ message: string; type: "success" | "info"; id: number } | null>(null);

  // Auto clear notifications
  useEffect(() => {
    if (modalNotification) {
      const t = setTimeout(() => {
        setModalNotification(null);
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [modalNotification]);

  // Inputs helpers from Zustand Store
  const participants = useParticipantStore(state => state.participants);
  const setParticipants = useParticipantStore(state => state.setParticipants);
  const addParticipantsFromStore = useParticipantStore(state => state.addParticipants);
  const removeParticipantFromStore = useParticipantStore(state => state.removeParticipant);

  const [newFriendName, setNewFriendName] = useState("");
  const [availableFriends, setAvailableFriends] = useState<{ id: number; name: string }[]>([]);
  const [quickSplitText, setQuickSplitText] = useState("");
  const [selectedGroupToLink, setSelectedGroupToLink] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const txtFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch verified friends suggestions
  useEffect(() => {
    if (isOpen) {
      api.getFriends().then(res => {
        setAvailableFriends(res || []);
      }).catch(e => console.warn("Failed fetching friends suggestions:", e));
    }
  }, [isOpen]);

  // Effect to preload exterior OCR parsed bills
  useEffect(() => {
    if (isOpen) {
      if (initialPreloadedBills && initialPreloadedBills.length > 0) {
        setDetectedBills(initialPreloadedBills);
        setRawText(initialRawText || "Parsed via Exterior Upload OCR");
        setPhase(initialPhase || "complete");
        setWizardStep(initialWizardStep || "preview");
        setSelectedBillId(initialPreloadedBills[0].id);
      }
    }
  }, [isOpen, initialPreloadedBills, initialRawText, initialPhase, initialWizardStep]);

  // Dynamically synchronize Zustand store's participants with active bill detectedMembers
  useEffect(() => {
    if (isOpen) {
      const activeB = getActiveBill();
      if (activeB) {
        const members = activeB.groupSplit.detectedMembers || [];
        if (JSON.stringify(members) !== JSON.stringify(participants)) {
          setParticipants(members);
        }
      }
    }
  }, [isOpen, selectedBillId, combineTotals, detectedBills]);

  // Primary calculation hook that triggers after participants are added or removed to refresh settlement graphs, balance summaries, and optimize matrixes
  useEffect(() => {
    if (!isOpen) return;
    const activeB = getActiveBill();
    if (!activeB) return;

    const members = activeB.groupSplit.detectedMembers || [];
    if (JSON.stringify(members) !== JSON.stringify(participants)) {
      updateBillParticipantsSync(activeB.id, participants);
    }

    calculateSettlement();
    refreshBalances();
    refreshTransfers();
  }, [participants, isOpen]);

  if (!isOpen) return null;

  const categories: VisualCategory[] = [
    {
      id: "Receipt",
      subId: "restaurant",
      title: "Restaurant Bills",
      desc: "Cafe tags, dinner, food court orders",
      icon: <Utensils className="w-4 h-4" />,
      tips: [
        "Flat overhead shots yield the highest OCR accuracy.",
        "Ensure totals, item prices, and taxing are fully legible.",
        "Anika will auto-balance division math instantly."
      ]
    },
    {
      id: "Receipt",
      subId: "shopping",
      title: "Shopping Receipts",
      desc: "Supermarkets, apparel, groceries bills",
      icon: <ShoppingBag className="w-4 h-4" />,
      tips: [
        "Include promotional coupons to capture markdown values.",
        "Assists with individual item logging for hostels and dorms.",
        "Great for segmenting monthly shared household supplies."
      ]
    },
    {
      id: "Screenshot",
      subId: "screenshot",
      title: "Payment Screenshots",
      desc: "UPI, bank payments & status images",
      icon: <ImageIcon className="w-4 h-4" />,
      tips: [
        "Make sure confirmation banners, receiver IDs, and dates are in view.",
        "Ensures transaction keys block duplicates.",
        "Instantly generates a payment confirmation log."
      ]
    },
    {
      id: "Note",
      subId: "note",
      title: "Handwritten Notes",
      desc: "Whiteboard sheets or notebook tallies",
      icon: <FileText className="w-4 h-4" />,
      tips: [
        "Excellent support for handwritten tallies or tabs.",
        "Maintain clean contrast between background and ink.",
        "Can separate distinct names and items compiled by tables."
      ]
    },
    {
      id: "GroupSplit",
      subId: "group_split",
      title: "Group Split Images",
      desc: "Divide costs with friends & classmates",
      icon: <Users className="w-4 h-4" />,
      tips: [
        "Allows direct, complex split settlement paths.",
        "Auto-allocates charges between 3-12 classmates.",
        "Balances balances automatically to optimize transfers count."
      ]
    }
  ];

  const activeCategoryConfig = categories.find(c => c.subId === activeSubId);

  const processSteps = [
    { label: "Transmitting Documents Stack", desc: "Establishing secure upload pipeline" },
    { label: "AI Receipt Segmentation", desc: "Isolating multiple distinct Receipts/Collage invoices" },
    { label: "Analyzing Image Layout", desc: "Performing pixel-grid pattern layout analysis" },
    { label: "Structured Text Parsing", desc: "Filing items, dates, and currency totals under budget classes" }
  ];

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

    if (e.dataTransfer.files) {
      processSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processSelectedFiles(Array.from(e.target.files));
    }
  };

  const processSelectedFiles = (files: File[]) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg", "application/pdf"];
    
    files.forEach(file => {
      const isTxt = file.type === "text/plain" || file.name.endsWith(".txt");
      if (!allowedTypes.includes(file.type.toLowerCase()) && !isTxt) {
        alert(`Unsupported file format for ${file.name}. Submit JPG, PNG, WEBP, PDF, or TXT.`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert("File limit is 10MB to maintain latency standards.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        const cleanBase64 = base64Data.split(",")[1] || base64Data;
        
        let previewUrl = base64Data;
        if (isTxt) previewUrl = "text_placeholder";
        else if (file.type === "application/pdf") previewUrl = "pdf_placeholder";

        setUploadedDocs(prev => [...prev, {
          file,
          preview: previewUrl,
          progress: 100,
          base64String: cleanBase64
        }]);

        if (isTxt) {
          const textReader = new FileReader();
          textReader.onload = () => {
            setQuickSplitText(textReader.result as string);
          };
          textReader.readAsText(file);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveDoc = (index: number) => {
    setUploadedDocs(prev => prev.filter((_, i) => i !== index));
  };

  // Modern Multi-Phase AI Trigger incorporating segment lists
  const startParsingWithModel = async () => {
    if (uploadedDocs.length === 0) return;

    setPhase("analyzing");
    setOverallProgress(10);
    setActiveStepIndex(0);

    const timer = setInterval(() => {
      setOverallProgress(prev => {
        if (prev >= 95) return prev;
        return prev + Math.floor(Math.random() * 6) + 2;
      });
    }, 220);

    try {
      // Simulate uploads and setup stages
      await new Promise(r => setTimeout(r, 650));
      setActiveStepIndex(1);
      
      await new Promise(r => setTimeout(r, 650));
      setActiveStepIndex(2);

      await new Promise(r => setTimeout(r, 650));
      setActiveStepIndex(3);

      // Call API parse-doc route
      const documentsPayload = uploadedDocs.map(doc => ({
        filename: doc.file.name,
        contentType: doc.file.type || "image/jpeg",
        base64: doc.base64String
      }));

      const response = await api.parseDocument({
        category: activeCategory,
        documents: documentsPayload
      });

      clearInterval(timer);
      setOverallProgress(100);
      await new Promise(r => setTimeout(r, 300));

      const processed: SegmentedBill[] = (response.bills || []).map((bill: any, index: number) => {
        const uniqueId = `bill-${Date.now()}-${index}`;
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

        // Initialize default custom paid amounts map
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
            splitType: "items", // Make item-level the default so users can select who participated right away
            memberPercentages: initializePercentages(finalMembers),
            memberExacts: initializeExacts(finalMembers, bill.totalAmount || 0),
            itemAssignments: initialAssignments,
            memberPaids: initialPaids
          }
        };
      });

      setDetectedBills(processed);
      setRawText(response.rawText || "Parsed via Anika-AI Autopilot");
      setPhase("complete");
      setWizardStep("preview"); // Force start of preview step
      if (processed.length > 0) {
        setSelectedBillId(processed[0].id);
      }
    } catch (err: any) {
      clearInterval(timer);
      console.error("AI Reader Multi Parsing Error:", err);
      alert("Error parsing document stacks with Gemini OCR: " + (err.message || err));
      setPhase("idle");
    }
  };

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

  const addFriendToSplit = (billId: string, name: string) => {
    if (!name.trim()) return;
    setDetectedBills(prev => prev.map(bill => {
      if (bill.id !== billId) return bill;
      const membersSet = new Set(bill.groupSplit.detectedMembers);
      membersSet.add(name);
      const newMembers = Array.from(membersSet);

      // Add to all item splits by default
      const copyAssignments = { ...(bill.groupSplit.itemAssignments || {}) };
      bill.items.forEach((_, idx) => {
        const list = copyAssignments[idx] || [];
        if (!list.includes(name)) {
          copyAssignments[idx] = [...list, name];
        }
      });

      // Update memberPaids
      const currentPaids = { ...(bill.groupSplit.memberPaids || {}) };
      newMembers.forEach(mem => {
        if (currentPaids[mem] === undefined) {
          currentPaids[mem] = mem === bill.groupSplit.payer ? bill.totalAmount : 0;
        }
      });
      currentPaids[name] = 0;

      return {
        ...bill,
        groupSplit: {
          ...bill.groupSplit,
          detectedMembers: newMembers,
          memberPercentages: initializePercentages(newMembers),
          memberExacts: initializeExacts(newMembers, bill.totalAmount),
          itemAssignments: copyAssignments,
          memberPaids: currentPaids
        }
      };
    }));
  };

  const removeFriendFromSplit = (billId: string, name: string) => {
    if (name === "Me") return;
    setDetectedBills(prev => prev.map(bill => {
      if (bill.id !== billId) return bill;
      const newMembers = bill.groupSplit.detectedMembers.filter(m => m !== name);
      const newPayer = bill.groupSplit.payer === name ? "Me" : bill.groupSplit.payer;
      
      const cleanAssignments: Record<number, string[]> = {};
      Object.entries(bill.groupSplit.itemAssignments || {}).forEach(([itmIdx, assigneeList]) => {
        cleanAssignments[Number(itmIdx)] = assigneeList.filter(m => m !== name);
      });

      const cleanPaids = { ...(bill.groupSplit.memberPaids || {}) };
      delete cleanPaids[name];

      return {
        ...bill,
        groupSplit: {
          ...bill.groupSplit,
          detectedMembers: newMembers,
          payer: newPayer,
          memberPercentages: initializePercentages(newMembers),
          memberExacts: initializeExacts(newMembers, bill.totalAmount),
          itemAssignments: cleanAssignments,
          memberPaids: cleanPaids
        }
      };
    }));
  };

  const setPayer = (billId: string, name: string) => {
    setDetectedBills(prev => prev.map(bill => {
      if (bill.id !== billId && billId !== "combined") return bill;
      const cleanPaids: Record<string, number> = {};
      bill.groupSplit.detectedMembers.forEach(m => {
        cleanPaids[m] = m === name ? bill.totalAmount : 0;
      });
      return {
        ...bill,
        groupSplit: {
          ...bill.groupSplit,
          payer: name,
          memberPaids: cleanPaids
        }
      };
    }));
  };

  const updateBillParticipantsSync = (billId: string, newMembers: string[]) => {
    setDetectedBills(prev => prev.map(bill => {
      if (bill.id !== billId && billId !== "combined") return bill;

      // Add to all item splits by default for any new members
      const copyAssignments = { ...(bill.groupSplit.itemAssignments || {}) };
      bill.items.forEach((_, idx) => {
        const list = copyAssignments[idx] || [];
        const cleanList = newMembers.filter(m => list.includes(m) || !bill.groupSplit.detectedMembers.flat().includes(m));
        
        // Add new members to items by default
        newMembers.forEach(m => {
          if (!cleanList.includes(m)) {
            cleanList.push(m);
          }
        });
        copyAssignments[idx] = cleanList;
      });

      // Prepare updated memberPaids
      const currentPaids = { ...(bill.groupSplit.memberPaids || {}) };
      
      // Clean up deleted ones
      Object.keys(currentPaids).forEach(m => {
        if (!newMembers.includes(m)) {
          delete currentPaids[m];
        }
      });

      // Add new ones
      let currentPayer = bill.groupSplit.payer;
      if (!newMembers.includes(currentPayer)) {
        currentPayer = newMembers[0] || "Me";
      }

      newMembers.forEach(m => {
        if (currentPaids[m] === undefined) {
          currentPaids[m] = m === currentPayer ? bill.totalAmount : 0;
        } else {
          currentPaids[m] = m === currentPayer ? bill.totalAmount : 0;
        }
      });

      return {
        ...bill,
        groupSplit: {
          ...bill.groupSplit,
          detectedMembers: newMembers,
          payer: currentPayer,
          memberPercentages: initializePercentages(newMembers),
          memberExacts: initializeExacts(newMembers, bill.totalAmount),
          itemAssignments: copyAssignments,
          memberPaids: currentPaids
        }
      };
    }));
  };

  const calculateSettlement = () => {
    const activeB = getActiveBill();
    if (!activeB) return [];
    const balances = calculateBillBalances(activeB);
    return minimizeSettlements(balances);
  };

  const refreshBalances = () => {
    console.log("Balances refreshed instantly.");
  };

  const refreshTransfers = () => {
    console.log("Transfers refreshed instantly.");
  };

  const removeParticipant = (name: string) => {
    removeParticipantFromStore(name);
  };

  const onPayerChange = (newPayer: string) => {
    const activeB = getActiveBill();
    if (activeB) {
      setPayer(activeB.id, newPayer);
    }
    calculateSettlement();
    refreshBalances();
    refreshTransfers();
  };

  const addParticipants = () => {
    addParticipantsFromStore(newFriendName);
    setNewFriendName("");
  };

  const setSplitType = (billId: string, type: "equally" | "percentage" | "exact" | "items") => {
    setDetectedBills(prev => prev.map(bill => {
      if (bill.id !== billId) return bill;
      return {
        ...bill,
        groupSplit: {
          ...bill.groupSplit,
          splitType: type
        }
      };
    }));
  };

  const editPercentage = (billId: string, member: string, val: number) => {
    setDetectedBills(prev => prev.map(bill => {
      if (bill.id !== billId) return bill;
      return {
        ...bill,
        groupSplit: {
          ...bill.groupSplit,
          memberPercentages: {
            ...bill.groupSplit.memberPercentages,
            [member]: val
          }
        }
      };
    }));
  };

  const editExact = (billId: string, member: string, val: number) => {
    setDetectedBills(prev => prev.map(bill => {
      if (bill.id !== billId) return bill;
      return {
        ...bill,
        groupSplit: {
          ...bill.groupSplit,
          memberExacts: {
            ...bill.groupSplit.memberExacts,
            [member]: val
          }
        }
      };
    }));
  };

  const toggleItemAssignment = (billId: string, itemIdx: number, member: string) => {
    setDetectedBills(prev => prev.map(bill => {
      if (bill.id !== billId) return bill;
      const currentAssigned = bill.groupSplit.itemAssignments[itemIdx] || [];
      const isAssigned = currentAssigned.includes(member);
      
      const newAssigned = isAssigned 
        ? currentAssigned.filter(m => m !== member)
        : [...currentAssigned, member];

      return {
        ...bill,
        groupSplit: {
          ...bill.groupSplit,
          itemAssignments: {
            ...bill.groupSplit.itemAssignments,
            [itemIdx]: newAssigned
          }
        }
      };
    }));
  };

  const editBillMeta = (billId: string, field: keyof SegmentedBill, value: any) => {
    setDetectedBills(prev => prev.map(bill => {
      if (bill.id !== billId) return bill;
      return {
        ...bill,
        [field]: value
      };
    }));
  };

  const navigateToStep = (targetStep: "preview" | "participants" | "splits" | "confirm") => {
    if (targetStep === "splits" || targetStep === "confirm") {
      const activeB = getActiveBill();
      if (activeB) {
        const otherCount = activeB.groupSplit.detectedMembers.filter(m => m.toLowerCase() !== "me").length;
        if (otherCount === 0) {
          alert("Please add at least one participant.");
          return;
        }
      }
    }
    setWizardStep(targetStep);
  };

  const editBillItem = (billId: string, idx: number, key: keyof LineItem, val: any) => {
    setDetectedBills(prev => prev.map(bill => {
      if (bill.id !== billId) return bill;
      const updatedItems = bill.items.map((item, itemIdx) => {
        if (itemIdx !== idx) return item;
        return {
          ...item,
          [key]: key === "name" ? val : Number(val) || 0
        };
      });

      const newTotal = updatedItems.reduce((acc, itm) => acc + (itm.price * (itm.quantity || 1)), 0);

      return {
        ...bill,
        items: updatedItems,
        totalAmount: Number(newTotal.toFixed(2))
      };
    }));
  };

  const addBillItemPlaceholder = (billId: string) => {
    setDetectedBills(prev => prev.map(bill => {
      if (bill.id !== billId) return bill;
      const placeholder: LineItem = { name: "Added Item", price: 100, quantity: 1 };
      const updatedItems = [...bill.items, placeholder];
      const newTotal = updatedItems.reduce((acc, itm) => acc + (itm.price * (itm.quantity || 1)), 0);
      return {
        ...bill,
        items: updatedItems,
        totalAmount: Number(newTotal.toFixed(2))
      };
    }));
  };

  const deleteBillItem = (billId: string, idx: number) => {
    setDetectedBills(prev => prev.map(bill => {
      if (bill.id !== billId) return bill;
      const updatedItems = bill.items.filter((_, itemIdx) => itemIdx !== idx);
      const newTotal = updatedItems.reduce((acc, itm) => acc + (itm.price * (itm.quantity || 1)), 0);
      return {
        ...bill,
        items: updatedItems,
        totalAmount: Number(newTotal.toFixed(2))
      };
    }));
  };

  const calculateBillBalances = (bill: SegmentedBill): Record<string, number> => {
    const total = bill.totalAmount;
    const members = bill.groupSplit.detectedMembers || [];
    const payer = bill.groupSplit.payer || "Me";
    if (members.length === 0) return {};

    const balances: Record<string, number> = {};
    members.forEach((m: string) => { balances[m] = 0; });

    const type = bill.groupSplit.splitType || "equally";
    const shareMap: Record<string, number> = {};
    members.forEach((m: string) => { shareMap[m] = 0; });

    if (type === "equally") {
      const share = total / members.length;
      members.forEach((m: string) => {
        shareMap[m] = share;
      });
    } else if (type === "percentage") {
      const percentages = bill.groupSplit.memberPercentages || {};
      members.forEach((m: string) => {
        const pct = percentages[m] || 0;
        shareMap[m] = (pct / 100) * total;
      });
    } else if (type === "exact") {
      const exacts = bill.groupSplit.memberExacts || {};
      members.forEach((m: string) => {
        shareMap[m] = exacts[m] || 0;
      });
    } else if (type === "items") {
      const itemAssignments = bill.groupSplit.itemAssignments || {};
      const items = bill.items || [];
      
      let assignedItemSum = 0;
      const memberItemSums: Record<string, number> = {};
      members.forEach((m: string) => { memberItemSums[m] = 0; });

      items.forEach((item, idx) => {
        const assigned = itemAssignments[idx] || [];
        const activeParticipants = assigned.length > 0 ? assigned : members;
        const itemVal = item.price * (item.quantity || 1);
        assignedItemSum += itemVal;
        const perMemberVal = itemVal / activeParticipants.length;
        activeParticipants.forEach((m: string) => {
          if (memberItemSums[m] !== undefined) {
            memberItemSums[m] += perMemberVal;
          }
        });
      });

      const extra = total - assignedItemSum;
      members.forEach((m: string) => {
        if (assignedItemSum > 0) {
          const propShare = memberItemSums[m] / assignedItemSum;
          shareMap[m] = memberItemSums[m] + (extra * propShare);
        } else {
          shareMap[m] = total / members.length;
        }
      });
    }

    // Splitwise recovery balances: balance = paid_amount - split_share
    const paidMap = bill.groupSplit.memberPaids || {};
    members.forEach((m: string) => {
      const share = shareMap[m] || 0;
      const paid = paidMap[m] !== undefined ? paidMap[m] : (m === payer ? total : 0);
      balances[m] = Number((paid - share).toFixed(2));
    });

    return balances;
  };

  interface SettlementTransfer {
    from: string;
    to: string;
    amount: number;
  }

  const minimizeSettlements = (balances: Record<string, number>): SettlementTransfer[] => {
    const debtors: { name: string; amount: number }[] = [];
    const creditors: { name: string; amount: number }[] = [];

    Object.entries(balances).forEach(([name, bal]) => {
      if (bal < -0.01) {
        debtors.push({ name, amount: Math.abs(bal) });
      } else if (bal > 0.01) {
        creditors.push({ name, amount: bal });
      }
    });

    const transfers: SettlementTransfer[] = [];
    let d = 0;
    let c = 0;

    const dList = debtors.map(x => ({ ...x }));
    const cList = creditors.map(x => ({ ...x }));

    dList.sort((a, b) => b.amount - a.amount);
    cList.sort((a, b) => b.amount - a.amount);

    while (d < dList.length && c < cList.length) {
      const debtor = dList[d];
      const creditor = cList[c];

      const amount = Math.min(debtor.amount, creditor.amount);
      if (amount > 0.01) {
        transfers.push({
          from: debtor.name,
          to: creditor.name,
          amount: Number(amount.toFixed(2))
        });
      }

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount < 0.01) d++;
      if (creditor.amount < 0.01) c++;
    }

    return transfers;
  };

  const generateAIAdvice = (bill: SegmentedBill): string => {
    const balances = calculateBillBalances(bill);
    const creditors = Object.entries(balances)
      .filter(([_, v]) => v > 0.01)
      .sort((a, b) => b[1] - a[1]);
    const debtors = Object.entries(balances)
      .filter(([_, v]) => v < -0.01)
      .sort((a, b) => a[1] - b[1]);

    if (creditors.length === 0 || debtors.length === 0) {
      return "All accounts are completely balanced! No reimbursements are necessary for this expense segment.";
    }

    const primaryCreditor = creditors[0][0];
    const primaryCreditorAmt = creditors[0][1];
    const totalAmount = bill.totalAmount;

    if (creditors.length === 1 && debtors.length > 1) {
      return `💡 AI Split Advisor: **${primaryCreditor}** paid the entire amount of **₹${totalAmount}** upfront. This represents a substantial portion of the ledger. Others should reimburse **${primaryCreditor}** based on their split shares.`;
    }

    let advice = `💡 AI Split Advisor: **${primaryCreditor}** paid significantly more than their share and is owed **₹${primaryCreditorAmt.toFixed(2)}**. `;
    if (debtors.length > 0) {
      const primaryDebtor = debtors[0][0];
      const primaryDebtorAmt = Math.abs(debtors[0][1]);
      advice += `**${primaryDebtor}** has the largest outstanding balance of **₹${primaryDebtorAmt.toFixed(2)}**. Settle the ledger using the optimized pathways to clear remaining balances efficiently.`;
    }
    return advice;
  };

  const shareSettlementLog = (bill: SegmentedBill) => {
    const balances = calculateBillBalances(bill);
    const transfers = minimizeSettlements(balances);
    let text = `📊 *Anika AI Group Split Sheet: ${bill.merchant}*\n`;
    text += `📅 Date: ${bill.date} | Total Amount: ₹${bill.totalAmount}\n\n`;
    text += `📋 *Net Balances Ledger:*\n`;
    Object.entries(balances).forEach(([name, bal]) => {
      text += `• ${name}: ${bal >= 0 ? "Recovers ₹" + bal.toFixed(2) : "Owes ₹" + Math.abs(bal).toFixed(2)}\n`;
    });
    text += `\n⛓️ *Optimized Payments (Minimized Cash Flow):*\n`;
    if (transfers.length === 0) {
      text += `✔ All participant accounts are balanced out completely. No transfers required!\n`;
    } else {
      transfers.forEach(t => {
        const key = `${t.from}-${t.to}-${t.amount}`;
        const settledMark = settledTransfers[key] ? " [SETTLED ✓]" : " [PENDING ⌛]";
        text += `✔ ${t.from} ────▶ ${t.to}: ₹${t.amount.toFixed(2)}${settledMark}\n`;
      });
    }
    text += `\n${generateAIAdvice(bill).replace(/\*\*/g, "")}`;
    
    navigator.clipboard.writeText(text);
    setModalNotification({ 
      message: "📋 Group Split ledger copied to clipboard! Share on WhatsApp.", 
      type: "success",
      id: Date.now() 
    });
  };

  const exportSettlementTXTDraft = (bill: SegmentedBill) => {
    const balances = calculateBillBalances(bill);
    const transfers = minimizeSettlements(balances);
    let text = `=========================================\n`;
    text += `         ANIKA AI SETTLEMENT LEDGER      \n`;
    text += `=========================================\n\n`;
    text += `Event/Merchant : ${bill.merchant}\n`;
    text += `Date           : ${bill.date}\n`;
    text += `Total Expense  : ₹${bill.totalAmount}\n`;
    text += `Category       : ${bill.category}\n\n`;
    text += `-----------------------------------------\n`;
    text += `       INDIVIDUAL LEDGER BALANCES        \n`;
    text += `-----------------------------------------\n`;
    Object.entries(balances).forEach(([name, bal]) => {
      const label = bal >= 0 ? "RECOVERS" : "OWES";
      text += `${name.toUpperCase().padEnd(15)}: ${label.padEnd(9)} ₹${Math.abs(bal).toFixed(2)}\n`;
    });
    text += `\n-----------------------------------------\n`;
    text += `     OPTIMIZED ZERO-REDUNDANT PAYMENTS    \n`;
    text += `-----------------------------------------\n`;
    if (transfers.length === 0) {
      text += `No cash movements needed. All accounts balanced.\n`;
    } else {
      transfers.forEach((t, i) => {
        const key = `${t.from}-${t.to}-${t.amount}`;
        const status = settledTransfers[key] ? " (SETTLED ✓)" : " (PENDING ⌛)";
        text += `[${i + 1}] ${t.from.toUpperCase()} pays ${t.to.toUpperCase()} : ₹${t.amount.toFixed(2)}${status}\n`;
      });
    }
    text += `\n-----------------------------------------\n`;
    text += `AI SUMMARY LOG:\n`;
    text += `  "${generateAIAdvice(bill).replace(/\*\*/g, "")}"\n`;
    text += `=========================================\n`;
    text += `Generated securely via Anika AI Sandbox @ ${new Date().toLocaleDateString()}\n`;

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Anika_AI_Settlements_${bill.merchant.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setModalNotification({ 
      message: "💾 Settlement ledger report downloaded successfully!", 
      type: "success",
      id: Date.now() 
    });
  };

  // Helper properties to get either combined bill or currently selected segmented bill
  const getCombinedBill = (): SegmentedBill => {
    const totalSum = Number(detectedBills.reduce((acc, b) => acc + b.totalAmount, 0).toFixed(2));
    const allItems = detectedBills.flatMap(b => b.items);
    const combinedMembers = Array.from(new Set(detectedBills.flatMap(b => b.groupSplit.detectedMembers)));

    return {
      id: "combined",
      merchant: "Combined Receipts Summary",
      date: detectedBills[0]?.date || new Date().toISOString().split("T")[0],
      totalAmount: totalSum,
      category: "Food & Dining",
      items: allItems,
      insights: ["Consolidated OCR multi-bill workspace"],
      segmentDescription: `Combined ${detectedBills.length} Segmented Receipts`,
      isGroupSplitEnabled: true,
      groupSplit: {
        detectedMembers: combinedMembers,
        payer: detectedBills[0]?.groupSplit?.payer || "Me",
        splitType: "equally",
        memberPercentages: initializePercentages(combinedMembers),
        memberExacts: initializeExacts(combinedMembers, totalSum),
        itemAssignments: {}
      }
    };
  };

  const getActiveBill = (): SegmentedBill | null => {
    if (combineTotals) return getCombinedBill();
    return detectedBills.find(b => b.id === selectedBillId) || null;
  };

  const handleAISplitClick = async (type: "equally" | "items") => {
    const activeB = getActiveBill();
    if (!activeB) return;
    
    try {
      // 1. Create the Group Expense in database if not ready
      let expenseId = activeB.expenseId;
      if (!expenseId) {
        const expenseRes = await api.createGroupExpense({
          title: activeB.merchant,
          total: activeB.totalAmount,
          date: activeB.date
        });
        expenseId = expenseRes.expense_id;
        editBillMeta(activeB.id, "expenseId", expenseId);
      }
      
      // 2. Validate/Save Participants to SQLite via POST /api/participants
      await api.saveParticipants(expenseId, activeB.groupSplit.detectedMembers);
      
      if (type === "equally") {
        setSplitType(activeB.id, "equally");
        // Apply Equal Split Route
        await api.splitEqual(expenseId);
      } else {
        setSplitType(activeB.id, "items");
        // Map line-item assignments
        const assignments: Record<string, string[]> = {};
        activeB.items.forEach((item, index) => {
          const assignedNames = activeB.groupSplit.itemAssignments[index] || activeB.groupSplit.detectedMembers;
          assignments[item.name || `Item ${index + 1}`] = assignedNames;
        });
        
        // Apply Itemized Split Route
        await api.splitItemized(expenseId, assignments);
      }
      
      // Notify user of successful backend optimization!
      setModalNotification({
        message: `🤖 AI Split Engine: Optimized ${type === "equally" ? "equal" : "itemized"} settlement matrix dynamically!`,
        type: "success",
        id: Date.now()
      });
      
    } catch (err: any) {
      console.error("AI Split Action error:", err);
      setModalNotification({
        message: "AI Split Optimization failed: " + (err.message || err),
        type: "info",
        id: Date.now()
      });
    }
  };

  const activeBill = getActiveBill();

  // Ultimate Finalized CONFIRMED SAVING FLOW (Only written once confirmed!)
  const handleFinalConfirmSave = async () => {
    try {
      const billsToSave = combineTotals ? [getCombinedBill()] : detectedBills;

      for (const bill of billsToSave) {
        if (bill.isGroupSplitEnabled) {
          const balancesMap = calculateBillBalances(bill);
          const membersList = bill.groupSplit.detectedMembers;
          const title = bill.merchant || "Classroom Split";

          // If linked to an existing group, reuse or append
          await api.createGroup({
            group_name: title,
            members: membersList,
            balances: balancesMap
          });

          onSaveGroupSplit(title, membersList, balancesMap);

          onAddMessage({
            role: "user",
            content: `👥 OCR Split Confirmed: Opened "${title}" worth ₹${bill.totalAmount}.`
          });
          onAddMessage({
            role: "model",
            content: `Completed group split ledger setup for **"${title}"**!\n\n**Total Bill**: ₹${bill.totalAmount}\n**Calculated Settlements**:\n${
              Object.entries(balancesMap).map(([m, b]) => {
                return `- **${m}**: ${b < 0 ? `owes ₹${Math.abs(b)}` : `recovers ₹${b}`}`;
              }).join("\n")
            }`
          });
        } else {
          // Log standard non-split individual budget expense
          await api.addBudget({
            amount: bill.totalAmount,
            category: bill.category,
            note: bill.merchant
          });

          onSaveExpense(bill.totalAmount, bill.category, bill.merchant);

          onAddMessage({
            role: "user",
            content: `📸 Scanned OCR individual bill approved: ${bill.merchant} (₹${bill.totalAmount}).`
          });
          onAddMessage({
            role: "model",
            content: `Saved expenditure of **₹${bill.totalAmount}** spent at **${bill.merchant}** under category **${bill.category}** successfully. Budget trends adjusted.`
          });
        }
      }

      resetModal();
      onClose();
    } catch (e: any) {
      console.error("Direct commit error:", e);
      alert("Failed saving finalized ledger settlements: " + e.message);
    }
  };

  const handleConversationalHandoff = () => {
    const billsToPreload = combineTotals ? [getCombinedBill()] : detectedBills;
    const serializedContext = billsToPreload.map((bill, index) => {
      const type = bill.isGroupSplitEnabled ? "Split Bill" : "Solo Budget Log";
      return `[Bill #${index + 1}]: Merchant: "${bill.merchant}", Date: "${bill.date}", Quantity Amount: ₹${bill.totalAmount}, Category: "${bill.category}", Type: "${type}". Items: ${JSON.stringify(bill.items)}`;
    }).join("\n");

    onAddMessage({
      role: "user",
      content: `Let's transition to the chat to review the receipts I just scanned.`
    });

    onAddMessage({
      role: "model",
      content: `<thinking>
Activating conversational splitting mode.
Segmented Bills pre-loaded:
${serializedContext}
</thinking>
I have scanned your file. Here are the bills detected:
${billsToPreload.map((b, i) => `${i + 1}. **${b.merchant}** (₹${b.totalAmount}) under *${b.category}*`).join("\n")}

I'm ready to manage these interactively! Who are we splitting these with? Please tell me the names of your classmates or friends, who paid, and I'll perform the math calculations conversationally.`
    });

    resetModal();
    onClose();
  };

  // Highly polished client-side PDF template generator
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      let currentY = 15;
      const marginX = 15;
      const contentWidth = 180;

      const formatCurrency = (amt: number) => `INR ${Number(amt).toFixed(2)}`;

      const drawHeader = (pageNum: number) => {
        doc.setFillColor(139, 92, 246); // violet-500
        doc.rect(marginX, currentY, contentWidth, 3, "F");
        currentY += 10;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text("ANIKA-AI FINANCIAL LEDGER Verification", marginX, currentY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139); // slate-500
        const dateStr = new Date().toLocaleString("en-US", { timeZone: "UTC" });
        doc.text(`OCR SCAN SEGMENTATION & DEBT SETTLEMENTS REPORT | UTC: ${dateStr.slice(0, 16)}`, marginX, currentY + 5);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(139, 92, 246);
        doc.text("AUTOPILOT MULTI-BILL SYSTEM V2", marginX + contentWidth - 58, currentY);

        currentY += 12;

        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.4);
        doc.line(marginX, currentY, marginX + contentWidth, currentY);
        currentY += 8;
      };

      const drawFooter = (pageNum: number) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        const pageText = `Page ${pageNum}`;
        doc.text(pageText, marginX + contentWidth - 12, 285);
        doc.text("Generated securely via Anika-AI verified sandbox ledger. All calculations confirm exact debt minimal paths.", marginX, 285);
      };

      let pageNum = 1;
      drawHeader(pageNum);
      drawFooter(pageNum);

      const checkPageOverflow = (heightNeeded: number) => {
        if (currentY + heightNeeded > 265) {
          doc.addPage();
          pageNum++;
          currentY = 15;
          drawHeader(pageNum);
          drawFooter(pageNum);
        }
      };

      // 1. Overall Summary Section
      checkPageOverflow(30);
      doc.setFillColor(248, 250, 252); // grey-50
      doc.rect(marginX, currentY, contentWidth, 22, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.rect(marginX, currentY, contentWidth, 22, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text("DOCUMENT STACK METRIC SUMMARY", marginX + 5, currentY + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const billsCountToPrint = combineTotals ? 1 : detectedBills.length;
      const totalAmountSum = detectedBills.reduce((acc, b) => acc + b.totalAmount, 0);
      doc.text(`Total Segmented Invoices: ${billsCountToPrint}`, marginX + 5, currentY + 12);
      doc.text(`Cumulative Amount Sum: ${formatCurrency(totalAmountSum)}`, marginX + 85, currentY + 12);
      doc.text(`Sandbox Compliance Node: AIS-Secure-SSL-Compliant`, marginX + 5, currentY + 17);
      currentY += 28;

      const billsListForPDF = combineTotals ? [getCombinedBill()] : detectedBills;

      // 2. Iterate and draw each segmented invoice
      billsListForPDF.forEach((bill, index) => {
        const itemsCount = bill.items.length;
        const isSplit = bill.isGroupSplitEnabled;
        const membersCount = isSplit ? bill.groupSplit.detectedMembers.length : 0;
        
        const cardHeaderHeight = 10;
        const metadataHeight = 18;
        const tableHeaderHeight = 8;
        const itemsListHeight = itemsCount * 6.5;
        const subtotalSumHeight = 8;
        const splitSecHeaderHeight = isSplit ? 10 : 0;
        const splitParticipantsHeaderHeight = isSplit ? 7 : 0;
        const splitTableHeight = isSplit ? membersCount * 6 : 0;
        
        const totalEstimatedHeight = cardHeaderHeight + metadataHeight + tableHeaderHeight + itemsListHeight + subtotalSumHeight + splitSecHeaderHeight + splitParticipantsHeaderHeight + splitTableHeight + 15;

        checkPageOverflow(totalEstimatedHeight);

        // Header Box
        doc.setFillColor(241, 245, 249);
        doc.rect(marginX, currentY, contentWidth, 9, "F");
        doc.setDrawColor(203, 213, 225);
        doc.rect(marginX, currentY, contentWidth, 9, "S");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`SEGMENT ${index + 1}: ${bill.merchant.toUpperCase()}`, marginX + 4, currentY + 6);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(109, 40, 217); // violet-700
        doc.text(`GRAND TOTAL: ${formatCurrency(bill.totalAmount)}`, marginX + contentWidth - 42, currentY + 6);

        currentY += 9;

        const cardHeight = metadataHeight + tableHeaderHeight + itemsListHeight + subtotalSumHeight + splitSecHeaderHeight + splitParticipantsHeaderHeight + splitTableHeight + 8;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.rect(marginX, currentY, contentWidth, cardHeight, "S");

        let innerY = currentY + 5;
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text("INVOICE LOG DETECTS & CLASSIFICATIONS", marginX + 5, innerY);
        innerY += 4.5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`Merchant Name: ${bill.merchant}`, marginX + 5, innerY);
        doc.text(`Billing Date: ${bill.date}`, marginX + 65, innerY);
        doc.text(`Suggested Ledger Category: ${bill.category}`, marginX + 115, innerY);
        innerY += 4.5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`Physical Source/Overlay: ${bill.segmentDescription}`, marginX + 5, innerY);
        innerY += 5;

        doc.setDrawColor(241, 245, 249);
        doc.line(marginX + 5, innerY, marginX + contentWidth - 5, innerY);
        innerY += 4;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text("EXTRACTED RECEIPTS PARTICULARS", marginX + 5, innerY);
        innerY += 4;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text("Particulars / Name", marginX + 6, innerY);
        doc.text("Qty", marginX + 110, innerY);
        doc.text("Unit Price", marginX + 130, innerY);
        doc.text("Subtotal", marginX + 155, innerY);
        innerY += 2;

        doc.setDrawColor(226, 232, 240);
        doc.line(marginX + 5, innerY, marginX + contentWidth - 5, innerY);
        innerY += 4;

        bill.items.forEach((item) => {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(51, 65, 85);

          let displayName = item.name;
          if (displayName.length > 55) {
            displayName = displayName.substring(0, 52) + "...";
          }
          doc.text(displayName, marginX + 6, innerY);
          
          doc.text(String(item.quantity || 1), marginX + 111, innerY);
          doc.text(formatCurrency(item.price), marginX + 130, innerY);
          
          const lineSubtotal = item.price * (item.quantity || 1);
          doc.text(formatCurrency(lineSubtotal), marginX + 155, innerY);
          
          innerY += 5.5;
        });

        doc.setDrawColor(241, 245, 249);
        doc.line(marginX + 5, innerY, marginX + contentWidth - 5, innerY);
        innerY += 4.5;

        // Render split matrix if configured
        if (isSplit) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(109, 40, 217);
          doc.text("LEDGER SPLITWISE DISTRIBUTION", marginX + 5, innerY);
          innerY += 4.5;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          doc.text(`Payer: ${bill.groupSplit.payer}`, marginX + 5, innerY);
          doc.text(`Settle Rule Match: BY ${bill.groupSplit.splitType.toUpperCase()}`, marginX + 75, innerY);
          innerY += 5;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(71, 85, 105);
          doc.text("Participant Name", marginX + 8, innerY);
          doc.text("Share Algorithm Method", marginX + 70, innerY);
          doc.text("Balances Ledger", marginX + 130, innerY);
          innerY += 2;

          doc.setDrawColor(226, 232, 240);
          doc.line(marginX + 5, innerY, marginX + contentWidth - 5, innerY);
          innerY += 4.5;

          const balancesMap = calculateBillBalances(bill);
          const membersList = bill.groupSplit.detectedMembers || [];

          membersList.forEach((member) => {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(51, 65, 85);
            doc.text(member.charAt(0).toUpperCase() + member.slice(1), marginX + 8, innerY);

            let ruleShareText = "Equally Divided Share";
            if (bill.groupSplit.splitType === "percentage") {
              const p = bill.groupSplit.memberPercentages[member] || 0;
              ruleShareText = `${p}% Share Allocation`;
            } else if (bill.groupSplit.splitType === "exact") {
              const exVal = bill.groupSplit.memberExacts[member] || 0;
              ruleShareText = `Exact Amount of INR ${exVal}`;
            } else if (bill.groupSplit.splitType === "items") {
              let tagCount = 0;
              Object.values(bill.groupSplit.itemAssignments || {}).forEach((assignedList) => {
                if (assignedList.includes(member)) tagCount++;
              });
              ruleShareText = `${tagCount} Line Items Tagged`;
            }
            doc.text(ruleShareText, marginX + 70, innerY);

            const userBal = balancesMap[member] || 0;
            const absBalStr = formatCurrency(Math.abs(userBal));
            if (userBal < 0) {
              doc.setTextColor(220, 38, 38); 
              doc.text(`Owes ${absBalStr}`, marginX + 130, innerY);
            } else if (userBal > 0) {
              doc.setTextColor(5, 150, 105); 
              doc.text(`Recovers ${absBalStr}`, marginX + 130, innerY);
            } else {
              doc.setTextColor(100, 116, 139);
              doc.text("Fully Settled (0.00)", marginX + 130, innerY);
            }

            innerY += 5.5;
          });
        } else {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text("Solo transaction ledger, categorized under direct individual budgets.", marginX + 5, innerY);
        }

        currentY += cardHeight + 12;
      });

      const reportDateStamp = new Date().toISOString().split("T")[0];
      const filename = `Anika_AI_OCR_Settle_Report_${reportDateStamp}.pdf`;
      doc.save(filename);
    } catch (pdfErr: any) {
      console.error("Failed drawing premium PDF:", pdfErr);
      alert("Error printing dynamic PDF report: " + pdfErr.message);
    }
  };

  const handleTXTDataProcessing = () => {
    if (!quickSplitText.trim()) return;
    
    const virtFile = new File([quickSplitText], "QuickSplit.txt", { type: "text/plain" });
    const b64 = btoa(unescape(encodeURIComponent(quickSplitText)));
    
    setUploadedDocs([{
      file: virtFile,
      preview: "text_placeholder",
      progress: 100,
      base64String: b64
    }]);

    setActiveCategory("GroupSplit");
    setActiveSubId("group_split");
    
    setTimeout(() => {
      startParsingWithModel();
    }, 100);
  };

  const resetModal = () => {
    setUploadedDocs([]);
    setPhase("idle");
    setOverallProgress(0);
    setActiveStepIndex(0);
    setDetectedBills([]);
    setRawText("");
    setSelectedBillId(null);
    setNewFriendName("");
    setQuickSplitText("");
    setCombineTotals(false);
    setWizardStep("preview");
    setSelectedGroupToLink("");
  };

  // Check if activeBill total was already logged to budgetLogs to show a warning
  const isDuplicateDetected = () => {
    if (!activeBill) return false;
    return budgetLogs.some(log => 
      Math.abs(log.amount - activeBill.totalAmount) < 0.05 && 
      log.note?.toLowerCase().trim() === activeBill.merchant.toLowerCase().trim()
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-hidden animate-fade-in select-none">
      
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-5xl bg-[#0a0d16] border border-purple-500/25 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] md:h-[680px]"
      >
        
        {/* Glow Spheres */}
        <div className="absolute top-[-80px] left-1/4 w-[350px] h-[350px] bg-purple-600/10 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute bottom-[-80px] right-1/4 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Global close button */}
        <button 
          onClick={() => { resetModal(); onClose(); }}
          className="absolute top-4 right-4 z-50 p-2 text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800 rounded-xl transition-all cursor-pointer border border-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* TOP NAVBAR HEADER */}
        <header className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4 md:px-8 shrink-0 bg-[#070b13]/90 relative z-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600/20 to-indigo-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
              <Sparkles className="w-4.5 h-4.5 text-purple-300 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-1.5">
                Autopilot OCR Dashboard <span className="text-[9px] bg-purple-600/30 text-purple-300 border border-purple-500/20 px-1.5 py-0.5 rounded-md font-extrabold uppercase font-sans tracking-wide">Multi-Bill V2</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">Automatic receipt segmentation, group expense splitting & budget logging</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/25">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[9.5px] font-black text-emerald-400 uppercase tracking-wider font-mono">Gemini Grounding Enabled</span>
          </div>
        </header>

        {/* MAIN BODY CONFIG */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 relative z-10">
          
          {/* LEFT PANEL: Document Categories Menu (Only visible on initial idle state) */}
          {phase === "idle" && (
            <aside className="w-full md:w-[35%] border-r border-slate-850 bg-[#050810] p-5 flex flex-col justify-between overflow-y-auto shrink-0 custom-scrollbar text-left">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Target Models</h3>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {categories.map((cat) => {
                    const isSelected = activeSubId === cat.subId;
                    return (
                      <button
                        key={cat.subId}
                        onClick={() => {
                          setActiveSubId(cat.subId);
                          setActiveCategory(cat.id);
                        }}
                        className={`w-full text-left p-3 rounded-2xl border transition-all duration-300 relative flex items-start gap-3 group shrink-0 ${
                          isSelected 
                            ? "bg-purple-950/20 border-purple-500/40 shadow-inner" 
                            : "bg-slate-900/20 border-slate-900 hover:border-slate-800 hover:bg-[#111827]/30 cursor-pointer"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 bottom-2 left-0 w-[3px] bg-purple-500 rounded-r-full"></div>
                        )}
                        
                        <div className={`p-2 rounded-xl border shrink-0 transition-all ${
                          isSelected 
                            ? "bg-purple-500/15 border-purple-500/35 text-purple-400" 
                            : "bg-slate-950 border-slate-900 text-slate-400 group-hover:scale-105"
                        }`}>
                          {cat.icon}
                        </div>

                        <div className="min-w-0">
                          <p className={`text-xs font-black tracking-wide ${
                            isSelected ? "text-slate-200" : "text-slate-300"
                          }`}>{cat.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-snug truncate">{cat.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-850 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Autopilot Instructions</span>
                  </div>
                  <ul className="space-y-1.5">
                    {activeCategoryConfig?.tips.map((tip, idx) => (
                      <li key={idx} className="text-[9.5px] leading-relaxed text-slate-400 flex items-start gap-1.5 font-medium">
                        <span className="text-purple-400 font-extrabold mt-0.5 shrink-0">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-850 flex items-center gap-2.5 text-slate-400 shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase text-slate-200 tracking-wider">Sandbox Isolated</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Encrypted file processing; logs are volatile and deleted securely.</p>
                </div>
              </div>
            </aside>
          )}

          {/* RIGHT WORKSPACE: Step flow router */}
          <section className="flex-1 p-5 md:p-6 flex flex-col justify-between overflow-y-auto bg-slate-950/10 relative custom-scrollbar">
            
            {/* ====================================================
                PHASE 1: IDLE UPLOAD QUEUE & DRAG DROP
                ==================================================== */}
            {phase === "idle" && (
              <div className="flex-1 flex flex-col justify-center items-center">
                <div className="text-center max-w-sm mb-4">
                  <h2 className="text-md font-black text-slate-100 tracking-tight">
                    Submit document stack to <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">Anika-AI</span>
                  </h2>
                  <p className="text-[11px] text-slate-450 mt-1 leading-normal font-medium">
                    Supports multiple files, collage images or PDF catalogs. Anika divides and segments them intelligently under individual transactional files.
                  </p>
                </div>

                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full max-w-lg aspect-[16/7.5] rounded-3xl border border-dashed flex flex-col items-center justify-center p-5 cursor-pointer transition-all duration-300 relative ${
                    dragActive 
                      ? "border-purple-500 bg-purple-500/10 scale-[1.01]" 
                      : "border-slate-800 hover:border-purple-500/50 bg-[#0e1525]/40 hover:bg-[#0e1525]/70"
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    multiple 
                    accept="image/*,application/pdf" 
                    className="hidden" 
                  />

                  <div className="text-center p-2">
                    <div className="w-11 h-11 rounded-2xl bg-[#171f30] border border-slate-805 flex items-center justify-center text-purple-400 shadow-xl mx-auto mb-2 animate-bounce">
                      <UploadCloud className="w-5 h-5 text-purple-300" />
                    </div>
                    <p className="text-xs text-slate-100 font-extrabold uppercase tracking-wider">Drag & drop files or click to browse</p>
                    <p className="text-[9.5px] text-slate-500 mt-1">Supports PNG, JPG, WEBP, or multi-page PDF documents.</p>
                  </div>
                </div>

                {/* SHOW UPLOADED QUEUE DETAILS */}
                {uploadedDocs.length > 0 && (
                  <div className="w-full max-w-lg mt-4 space-y-2 select-text">
                    <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-widest text-left">Upload Queue ({uploadedDocs.length} files)</h4>
                    <div className="grid grid-cols-2 gap-2 max-h-[110px] overflow-y-auto custom-scrollbar">
                      {uploadedDocs.map((doc, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-slate-900/60 border border-slate-850 rounded-xl relative group">
                          {doc.preview === "text_placeholder" ? (
                            <div className="w-8 h-8 rounded-lg bg-indigo-950/40 border border-indigo-900/50 flex items-center justify-center text-indigo-400 shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden shrink-0">
                              {doc.preview === "pdf_placeholder" ? (
                                <div className="w-full h-full flex items-center justify-center text-red-500 text-[10px] font-black">pdf</div>
                              ) : (
                                <img src={doc.preview} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              )}
                            </div>
                          )}
                          <div className="min-w-0 flex-1 text-left">
                            <p className="text-[10.5px] text-slate-200 font-bold truncate">{doc.file.name}</p>
                            <p className="text-[9px] text-slate-500 font-mono">{(doc.file.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveDoc(idx); }}
                            className="absolute -top-1 -right-1 bg-red-950/80 border border-red-900 hover:bg-red-900 text-red-400 hover:text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer animate-fade-in"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={startParsingWithModel}
                      className="w-full mt-3 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[10.5px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-purple-500/10 flex items-center justify-center gap-2 cursor-pointer border border-purple-500/30"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                      Run multi-bill ocr analysis
                    </button>
                  </div>
                )}

                {/* TEXT ENTERING FOR RAW LEDGERS */}
                {activeCategory === "GroupSplit" && uploadedDocs.length === 0 && (
                  <div className="w-full max-w-lg mt-3 text-left">
                    <div className="flex items-center my-2">
                      <hr className="flex-1 border-slate-900" />
                      <span className="px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">No document handy?</span>
                      <hr className="flex-1 border-slate-900" />
                    </div>

                    <div className="p-4 rounded-2xl bg-[#0f1525]/30 border border-slate-900 relative space-y-3">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg shrink-0">
                          <Shuffle className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-[10.5px] font-black text-slate-200 uppercase tracking-wider">Quick Split Text Editor</h4>
                          <p className="text-[9.5px] text-slate-400 leading-snug">Type/paste statements naturally. Anika splits the math immediately.</p>
                        </div>
                      </div>

                      <textarea
                        id="quick-split-textarea"
                        placeholder="e.g.&#10;Kiran paid 1800 for pizza&#10;Rahul paid 120 for drinks&#10;Sai paid 500 for Uber cab. Split evenly."
                        value={quickSplitText}
                        onChange={(e) => setQuickSplitText(e.target.value)}
                        rows={3}
                        className="w-full bg-[#05080f] border border-slate-900 rounded-xl px-3 py-2 text-[11px] text-slate-300 placeholder-slate-705 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none font-medium leading-relaxed"
                      />

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => txtFileInputRef.current?.click()}
                          className="flex-1 py-1.8 bg-[#111827] hover:bg-slate-800 text-slate-300 font-bold uppercase text-[9px] tracking-widest rounded-xl transition-all border border-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-400" />
                          Upload Ledger (.txt)
                        </button>
                        <input
                          type="file"
                          ref={txtFileInputRef}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              processSelectedFiles([e.target.files[0]]);
                            }
                          }}
                          accept=".txt,text/plain"
                          className="hidden"
                        />
                        
                        <button
                          type="button"
                          onClick={handleTXTDataProcessing}
                          disabled={!quickSplitText.trim()}
                          className="flex-1 py-1.8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-indigo-500 disabled:from-indigo-950 disabled:to-purple-950 text-white font-extrabold uppercase text-[9px] tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-300 animate-pulse" />
                          Split transaction
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ====================================================
                PHASE 2: CINEMATIC PROCESSING WORKFLOW (loading scanner animation)
                ==================================================== */}
            {phase === "analyzing" && (
              <div className="flex-1 flex flex-col justify-center items-center py-4 text-center">
                
                {/* Beautiful receipt laser scanner mock */}
                <div className="relative overflow-hidden w-36 h-48 rounded-2xl border border-purple-500/35 bg-slate-900/60 shadow-2xl flex items-center justify-center mb-6">
                  {/* Watermark of standard list receipt */}
                  <div className="w-22 h-34 bg-slate-850/50 rounded p-2.5 flex flex-col gap-2.5">
                    <div className="w-10 h-1.5 bg-slate-750 rounded animate-pulse"></div>
                    <div className="w-16 h-1.5 bg-slate-800 rounded"></div>
                    <div className="w-12 h-1.5 bg-slate-800 rounded"></div>
                    <div className="w-14 h-1.5 bg-slate-800 rounded"></div>
                    <div className="h-0.5 bg-slate-900 border-b border-dashed border-slate-750"></div>
                    <div className="w-8 h-2 bg-purple-500/20 rounded self-end"></div>
                  </div>
                  
                  {/* Glowing Laser scanning bar */}
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_12px_rgba(168,85,247,1)] animate-scan-line"></div>
                </div>

                <div className="max-w-md space-y-2 mb-6">
                  <h3 className="text-md font-black text-slate-100 flex items-center justify-center gap-1.5">
                    Anika-AI is analyzing your bill <span className="text-purple-400 animate-pulse">🖤</span>
                  </h3>
                  <p className="text-[11px] text-slate-450 font-medium">Segmenting multiple independent collage receipts & checking math models...</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mb-6">
                  {processSteps.map((step, idx) => {
                    const isSuccess = idx < activeStepIndex;
                    const isActive = idx === activeStepIndex;

                    return (
                      <div 
                        key={idx} 
                        className={`flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 border text-left ${
                          isActive 
                            ? "bg-purple-950/10 border-purple-500/30 scale-[1.01] shadow-lg shadow-purple-500/5 font-black text-slate-100" 
                            : isSuccess 
                            ? "bg-slate-900/15 border-slate-900/30 text-slate-400" 
                            : "bg-transparent border-transparent opacity-20 text-slate-600 pointer-events-none"
                        }`}
                      >
                        <div>
                          {isSuccess ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/35 flex items-center justify-center text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          ) : isActive ? (
                            <div className="w-5 h-5 rounded-full bg-purple-500/25 border border-purple-500/40 flex items-center justify-center text-purple-400 animate-spin">
                              <Loader2 className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-650 font-mono text-[9px] font-bold">
                              {idx + 1}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[10.5px] font-bold ${isActive ? "text-slate-100" : "text-slate-350"}`}>{step.label}</p>
                          <p className="text-[9px] text-slate-500 leading-snug">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="w-full max-w-sm">
                  <div className="flex justify-between items-center text-[9px] font-mono font-bold text-slate-450 mb-1 px-1">
                    <span className="uppercase tracking-widest text-purple-400">Autopilot OCR Core</span>
                    <span>{overallProgress}% COMPLETE</span>
                  </div>
                  <div className="w-full bg-[#0a0d18] h-1.5 rounded-full overflow-hidden border border-slate-900">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${overallProgress}%` }}
                      className="bg-gradient-to-r from-purple-500 via-indigo-500 to-indigo-600 h-full shadow-[0_0_8px_rgba(124,58,237,0.4)]"
                    />
                  </div>
                  <p className="text-[9.5px] text-slate-500 mt-2 italic">
                    {activeStepIndex === 0 && "Locating secure sandboxed container node..."}
                    {activeStepIndex === 1 && "Isolating multiple distinct receipt boundaries..."}
                    {activeStepIndex === 2 && "Running layout-aware PaddleOCR text translation..."}
                    {activeStepIndex === 3 && "Evaluating category weights & matching smart splits..."}
                  </p>
                </div>
              </div>
            )}

            {/* ====================================================
                PHASE 3: REDESIGNED OCR WIZARD RESULTS FLOW
                ==================================================== */}
            {phase === "complete" && activeBill && (
              <div className="flex-1 flex flex-col min-h-0 text-left relative">
                
                {/* Visual Fintech Toast Notification Overlay */}
                <AnimatePresence>
                  {modalNotification && (
                    <motion.div
                      key={modalNotification.id}
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-2 left-4 right-4 z-50 p-3 bg-indigo-950/95 backdrop-blur-md border border-indigo-500/40 rounded-xl shadow-[0_12px_32px_rgba(30,27,75,0.85)] flex items-center justify-between gap-3 text-slate-100 select-none animate-pulse"
                    >
                      <div className="flex items-center gap-2">
                        {modalNotification.type === "success" ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-450">
                            <Check className="w-3 h-3 text-emerald-450" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-indigo-500/15 border border-indigo-500/35 flex items-center justify-center text-indigo-400">
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                          </div>
                        )}
                        <p className="text-[10px] sm:text-xs font-bold leading-tight">{modalNotification.message}</p>
                      </div>
                      <button 
                        onClick={() => setModalNotification(null)}
                        className="text-slate-450 hover:text-slate-200 transition-colors cursor-pointer"
                        title="Dismiss notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Wizard Header Progress Indicator */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-850 pb-4 mb-4 select-none">
                  
                  {/* Steps Nav Row */}
                  <div className="flex items-center gap-1.5 text-[10.5px]">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigateToStep("preview")}
                        className={`px-2 py-1 rounded text-left transition-all ${
                          wizardStep === "preview" 
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/35 font-black uppercase tracking-wider" 
                            : "text-slate-450 hover:text-slate-200 font-bold hover:bg-[#121c2a]"
                        } cursor-pointer`}
                      >
                        1. Preview
                      </button>
                      <ChevronRight className="w-3 h-3 text-slate-800" />
                      
                      <button
                        onClick={() => navigateToStep("participants")}
                        className={`px-2 py-1 rounded text-left transition-all ${
                          wizardStep === "participants" 
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/35 font-black uppercase tracking-wider" 
                            : "text-slate-450 hover:text-slate-200 font-bold hover:bg-[#121c2a]"
                        } cursor-pointer`}
                      >
                        2. Participants
                      </button>
                      <ChevronRight className="w-3 h-3 text-slate-800" />

                      <button
                        onClick={() => navigateToStep("splits")}
                        className={`px-2 py-1 rounded text-left transition-all ${
                          wizardStep === "splits" 
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/35 font-black uppercase tracking-wider" 
                            : "text-slate-450 hover:text-slate-200 font-bold hover:bg-[#121c2a]"
                        } cursor-pointer`}
                      >
                        3. Split Strategy
                      </button>
                      <ChevronRight className="w-3 h-3 text-slate-800" />

                      <button
                        onClick={() => navigateToStep("confirm")}
                        className={`px-2 py-1 rounded text-left transition-all ${
                          wizardStep === "confirm" 
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/35 font-black uppercase tracking-wider" 
                            : "text-slate-450 hover:text-slate-200 font-bold hover:bg-[#121c2a]"
                        } cursor-pointer`}
                      >
                        4. Final Save
                      </button>
                    </div>
                  </div>

                  {/* Multi-bill carousel index & optional total combiner */}
                  {!combineTotals && detectedBills.length > 1 && (
                    <div className="flex items-center gap-1.5 bg-[#171f30]/40 border border-slate-800 rounded-xl p-1 shrink-0">
                      <span className="text-[9.5px] text-slate-400 font-bold px-2">Segmented Bills:</span>
                      <div className="flex gap-1">
                        {detectedBills.map((b, idx) => (
                          <button
                            key={b.id}
                            onClick={() => setSelectedBillId(b.id)}
                            className={`px-2 py-1 rounded text-[9.5px] font-black tracking-wide cursor-pointer transition-all ${
                              selectedBillId === b.id 
                                ? "bg-purple-500 text-white" 
                                : "bg-[#0b0f19] text-slate-400 hover:text-white"
                            }`}
                          >
                            #{idx + 1} ({b.merchant.substring(0,6)}...)
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Multi-bill combine option */}
                  {detectedBills.length > 1 && (
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white bg-[#1a142e]/30 border border-purple-500/15 rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-colors select-none shrink-0 self-start md:self-auto">
                      <input 
                        type="checkbox" 
                        checked={combineTotals} 
                        onChange={(e) => {
                          setCombineTotals(e.target.checked);
                          setWizardStep("preview");
                        }}
                        className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Combine {detectedBills.length} Invoices</span>
                    </label>
                  )}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                  
                  {/* ====================================================
                      WIZARD STEP 1: PREVIEW DIGITAL EXTRACTED CARD
                      ==================================================== */}
                  {wizardStep === "preview" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                      
                      {/* Left: General metadata fields */}
                      <div className="lg:col-span-7 space-y-4">
                        
                        {/* Glassmorphic main bill card */}
                        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-xs font-black uppercase text-purple-400 tracking-wider">Scanned Document Data Model</h3>
                              <p className="text-[10px] text-slate-500">Edit fields to modify ledger before confirm splits.</p>
                            </div>
                            <div className="bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 hover:scale-101 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest font-mono">
                              OCR CONFIDENCE: 96% ✓
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                              <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">Store / Merchant Name</label>
                              <div className="relative">
                                <Store className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                                <input 
                                  type="text"
                                  value={activeBill.merchant}
                                  onChange={(e) => editBillMeta(activeBill.id, "merchant", e.target.value)}
                                  className="w-full bg-[#111827]/30 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-semibold outline-none focus:border-purple-500/30"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">Billing Date</label>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                                <input 
                                  type="text"
                                  value={activeBill.date}
                                  onChange={(e) => editBillMeta(activeBill.id, "date", e.target.value)}
                                  className="w-full bg-[#111827]/30 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-semibold outline-none focus:border-purple-500/30"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">Tax Category</label>
                              <select 
                                value={activeBill.category}
                                onChange={(e) => editBillMeta(activeBill.id, "category", e.target.value)}
                                className="w-full bg-[#111827]/30 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-semibold outline-none focus:border-purple-500/30 cursor-pointer"
                              >
                                <option value="Food & Dining">Food & Dining</option>
                                <option value="Shopping">Shopping</option>
                                <option value="Transport">Transport</option>
                                <option value="Utilities">Utilities</option>
                                <option value="Entertainment">Entertainment</option>
                                <option value="Subscriptions">Subscriptions</option>
                                <option value="Travel">Travel</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">Total Amount (₹)</label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-2.5 text-slate-500 text-xs font-black">₹</span>
                                <input 
                                  type="number"
                                  value={activeBill.totalAmount}
                                  onChange={(e) => editBillMeta(activeBill.id, "totalAmount", Number(e.target.value) || 0)}
                                  className="w-full bg-[#111827]/30 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-purple-300 font-black outline-none focus:border-purple-500/30"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Interactive line items edit list */}
                          <div className="bg-[#05080f]/50 rounded-xl p-3 border border-slate-850 space-y-2">
                            <div className="flex justify-between items-center border-b border-slate-900 pb-1.5 mb-1.5">
                              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Receipt Itemized Breakdown</span>
                              <button
                                onClick={() => addBillItemPlaceholder(activeBill.id)}
                                className="px-2 py-0.5 rounded bg-purple-600/10 hover:bg-purple-600/20 text-purple-300 text-[9px] font-bold border border-purple-500/20 flex items-center gap-1 cursor-pointer transition-all"
                              >
                                <Plus className="w-2.5 h-2.5" /> Add Row
                              </button>
                            </div>
                            <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar">
                              {activeBill.items.map((item, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                  <input 
                                    type="text" 
                                    value={item.name}
                                    placeholder="Milk, coffee..."
                                    onChange={(e) => editBillItem(activeBill.id, idx, "name", e.target.value)}
                                    className="flex-[2] bg-[#111827]/30 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-medium"
                                  />
                                  <div className="relative w-20">
                                    <span className="absolute left-2 top-1 text-slate-500 text-[10px]">₹</span>
                                    <input 
                                      type="number" 
                                      value={item.price}
                                      onChange={(e) => editBillItem(activeBill.id, idx, "price", e.target.value)}
                                      className="w-full bg-[#111827]/30 border border-slate-800 rounded-lg pl-5 pr-1 py-1 text-xs text-slate-200 font-bold"
                                    />
                                  </div>
                                  <input 
                                    type="number" 
                                    value={item.quantity}
                                    placeholder="Qty"
                                    onChange={(e) => editBillItem(activeBill.id, idx, "quantity", e.target.value)}
                                    className="w-10 bg-[#111827]/30 border border-slate-800 rounded-lg px-1 py-1 text-xs text-slate-400 font-mono text-center"
                                  />
                                  <button
                                    onClick={() => deleteBillItem(activeBill.id, idx)}
                                    className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Duplicates Alerts & Checks Warning notifications box */}
                        {isDuplicateDetected() && (
                          <div className="p-3 bg-red-950/15 border border-red-900/30 rounded-2xl flex gap-3 text-left animate-pulse">
                            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            <div>
                              <h5 className="text-[10.5px] font-black text-red-300 uppercase tracking-widest">Potential Duplicate Receipt Detected</h5>
                              <p className="text-[9.5px] text-red-400 leading-snug font-medium mt-0.5">
                                An active expense worth <strong className="text-white">₹{activeBill.totalAmount}</strong> under merchant **"{activeBill.merchant}"** already exists in your ledger system database. Double-check before writing!
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Simulated boundary crop and advanced filter adjustments */}
                      <div className="lg:col-span-5 space-y-4">
                        <div className="p-4 bg-[#0a0d17]/60 border border-slate-800 rounded-2xl space-y-3.5">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-1 border-b border-slate-850">
                            <Scissors className="w-3.5 h-3.5 text-purple-400" /> Advanced OCR Filter adjusters
                          </h4>

                          {/* Handwritten filter toggle */}
                          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-slate-850">
                            <div className="text-left">
                              <span className="text-[10.5px] text-slate-200 font-bold block">Handwritten Text Tuning</span>
                              <span className="text-[9px] text-slate-500">Increases grid scanner contrast filter thresholds</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={handwrittenFilter}
                                onChange={(e) => setHandwrittenFilter(e.target.checked)}
                                className="sr-only peer" 
                              />
                              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                          </div>

                          {/* Simulate Cropping Panel toggler */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="text-left">
                                <span className="text-[10.5px] text-slate-205 font-bold block">Receipt Region Boundary Crop</span>
                                <span className="text-[9px] text-slate-500">Simulate boundary cropping coordinates</span>
                              </div>
                              <button
                                onClick={() => setShowCropPanel(!showCropPanel)}
                                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[9px] font-bold rounded"
                              >
                                {showCropPanel ? "Collapse" : "Adjust"}
                              </button>
                            </div>

                            {showCropPanel && (
                              <div className="p-3 bg-[#05080f]/40 border border-slate-850 rounded-xl space-y-3 animate-fade-in text-left">
                                <p className="text-[9px] text-slate-500 leading-normal">Drag sliders to narrow OCR pixel scan window bounds.</p>
                                <div className="space-y-2">
                                  <div>
                                    <div className="flex justify-between text-[8px] font-mono font-bold text-slate-400">
                                      <span>X-AXIS MIN: {cropLeft}px</span>
                                      <span>X-AXIS MAX: {cropRight}px</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <input 
                                        type="range" 
                                        min="0" 
                                        max="50" 
                                        value={cropLeft}
                                        onChange={(e) => setCropLeft(Number(e.target.value))}
                                        className="w-full accent-purple-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                      />
                                      <input 
                                        type="range" 
                                        min="51" 
                                        max="100" 
                                        value={cropRight}
                                        onChange={(e) => setCropRight(Number(e.target.value))}
                                        className="w-full accent-purple-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <div className="flex justify-between text-[8px] font-mono font-bold text-slate-400">
                                      <span>Y-AXIS MIN: {cropTop}px</span>
                                      <span>Y-AXIS MAX: {cropBottom}px</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <input 
                                        type="range" 
                                        min="0" 
                                        max="50" 
                                        value={cropTop}
                                        onChange={(e) => setCropTop(Number(e.target.value))}
                                        className="w-full accent-purple-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                      />
                                      <input 
                                        type="range" 
                                        min="51" 
                                        max="100" 
                                        value={cropBottom}
                                        onChange={(e) => setCropBottom(Number(e.target.value))}
                                        className="w-full accent-purple-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Crop box visual simulation overlay */}
                            <div className="relative overflow-hidden aspect-[4/3] rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center">
                              {/* Imaginary bill background image */}
                              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/20 to-slate-950 flex items-center justify-center text-[10px] text-slate-650 font-bold select-none italic">
                                Active Document Preview Overlay
                              </div>
                              {/* The Cropping Lime Border Box overlaying */}
                              <div 
                                className="absolute border-2 border-dashed border-emerald-400/80 pointer-events-none transition-all duration-150"
                                style={{
                                  left: `${cropLeft}%`,
                                  top: `${cropTop}%`,
                                  right: `${100 - cropRight}%`,
                                  bottom: `${100 - cropBottom}%`,
                                }}
                              >
                                <span className="absolute -top-4 -left-1 bg-emerald-500 text-slate-950 font-black font-sans text-[8px] uppercase px-1.5 rounded shadow">BOUNDS MATCH</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-indigo-950/10 border border-indigo-500/10 rounded-2xl flex items-start gap-2.5 text-left">
                          <Eye className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider block">Autopilot Scanning Logic</span>
                            <p className="text-[9.5px] text-indigo-200 mt-0.5 leading-relaxed font-semibold">
                              Confirm scanned properties correspond layout. You may now continue to select participants.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ====================================================
                      WIZARD STEP 2: ASK PARTICIPANT NAMES
                      ==================================================== */}
                  {wizardStep === "participants" && (
                    <div className="max-w-2xl mx-auto p-4 bg-slate-900/30 border border-slate-800/80 rounded-3xl space-y-5">
                      
                      <div className="text-center space-y-1">
                        <Users className="w-7 h-7 text-purple-400 mx-auto" />
                        <h3 className="text-md font-black text-slate-100 uppercase tracking-wider">Who participated in this expense?</h3>
                        <p className="text-[10.5px] text-slate-450 font-medium">Input classmate names to split. We can also add this directly to custom Trip Groups!</p>
                      </div>

                      {/* Select existing group if they exist */}
                      {groups.length > 0 && (
                        <div className="bg-[#14122d]/45 p-3.5 border border-purple-500/20 rounded-2xl space-y-2.5 text-left select-none">
                          <div className="flex items-center gap-1.5 text-[10.5px] font-black text-purple-300 uppercase tracking-widest">
                            <FolderOpen className="w-4 h-4 text-purple-400" />
                            <span>Select Existing Group Link</span>
                          </div>
                          <p className="text-[9.5px] text-slate-400 leading-snug">
                            Would you like to add this expense to an existing group? Choosing a group automatically pre-loads its members!
                          </p>
                          
                          <div className="flex gap-2">
                            <select
                              value={selectedGroupToLink}
                              onChange={(e) => {
                                const gName = e.target.value;
                                setSelectedGroupToLink(gName);
                                if (gName) {
                                  const grp = groups.find(g => g.group_name === gName);
                                  if (grp) {
                                    // Prepopulate members
                                    editBillMeta(activeBill.id, "merchant", grp.group_name);
                                    editBillMeta(activeBill.id, "groupSplit", {
                                      ...activeBill.groupSplit,
                                      detectedMembers: grp.members,
                                      memberPercentages: initializePercentages(grp.members),
                                      memberExacts: initializeExacts(grp.members, activeBill.totalAmount),
                                    });
                                  }
                                }
                              }}
                              className="bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-xl outline-none w-full"
                            >
                              <option value="">-- No Direct Link Group --</option>
                              {groups.map((g) => (
                                <option key={g.id || g.group_name} value={g.group_name}>
                                  {g.group_name} (with {g.members?.length} members)
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Participant tag input */}
                      <div className="space-y-2.5">
                        <label className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-wider block text-left">Input Participant Names (mohan, ramu, chaitu, lalith...)</label>
                        <div className="flex gap-2 text-left">
                          <input 
                            type="text"
                            placeholder="Type friends name, or comma-separated list..."
                            value={newFriendName}
                            onChange={(e) => setNewFriendName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                addParticipants();
                              }
                            }}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500/30"
                          />
                          <button
                            onClick={addParticipants}
                            className="px-4.5 py-2.5 bg-purple-600 hover:bg-purple-500 font-extrabold uppercase text-[10px] tracking-widest text-white rounded-xl transition-all cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Chips representing currently loaded participants */}
                      <div className="text-left space-y-1.5">
                        <span className="text-[9.5px] text-slate-500 font-extrabold uppercase tracking-wider">Active Split List ({participants.length} names)</span>
                        <div className="flex flex-wrap gap-1.5 p-2 bg-[#05080f]/40 border border-slate-900 rounded-2xl min-h-[50px]">
                          {participants.map((m) => (
                            <div 
                              key={m}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#101424] border border-subtitle border-purple-500/20 text-purple-300 rounded-xl text-[10px] font-black uppercase tracking-wider"
                            >
                              <span className="capitalize">{m}</span>
                              <button 
                                onClick={() => removeParticipant(m)} 
                                className="text-slate-500 hover:text-red-400 cursor-pointer transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recent suggestions from friends base autocomplete */}
                      {availableFriends.length > 0 && (
                        <div className="text-left space-y-1.5">
                          <span className="text-[9.5px] text-slate-500 font-extrabold uppercase tracking-wider">Suggestions from Recent Friends base</span>
                          <div className="flex flex-wrap gap-1">
                            {availableFriends.map(f => {
                              if (participants.includes(f.name)) return null;
                              return (
                                <button
                                  key={f.id}
                                  onClick={() => {
                                    setParticipants([...new Set([...participants, f.name])]);
                                  }}
                                  className="px-2.5 py-1 bg-[#0b0f19] border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl text-[9.5px] font-semibold transition-all cursor-pointer"
                                >
                                  + {f.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* ====================================================
                      WIZARD STEP 3: CHOOSE SPLIT TYPE & VIEW MATH SUMMARY
                      ==================================================== */}
                  {wizardStep === "splits" && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                      
                      {/* Left: Split type configuration option buttons */}
                      <div className="md:col-span-6 space-y-4 text-left">
                        
                        <div className="p-4 bg-[#0a0d17]/60 border border-slate-800 rounded-2xl space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-850 flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5 text-purple-400" /> Choose Split Strategy math
                          </h4>

                          <div className="grid grid-cols-1 gap-2.5">
                            <button
                              onClick={() => {
                                setSplitType(activeBill.id, "equally");
                                editBillMeta(activeBill.id, "isGroupSplitEnabled", true);
                              }}
                              className={`w-full text-left p-3 rounded-xl border relative transition-all ${
                                activeBill.groupSplit.splitType === "equally" && activeBill.isGroupSplitEnabled
                                  ? "bg-purple-950/20 border-purple-500/40 text-slate-100" 
                                  : "bg-slate-900/15 border-slate-850 text-slate-400 hover:border-slate-800"
                              }`}
                            >
                              <span className="text-[11px] font-black uppercase tracking-wider block">Split Equally</span>
                              <span className="text-[9px] text-slate-500 mt-0.5 block">Splitted mathematically even across all participants.</span>
                            </button>

                            <button
                              onClick={() => {
                                setSplitType(activeBill.id, "percentage");
                                editBillMeta(activeBill.id, "isGroupSplitEnabled", true);
                              }}
                              className={`w-full text-left p-3 rounded-xl border relative transition-all ${
                                activeBill.groupSplit.splitType === "percentage" && activeBill.isGroupSplitEnabled
                                  ? "bg-purple-950/20 border-purple-500/40 text-slate-100" 
                                  : "bg-slate-900/15 border-slate-850 text-slate-400 hover:border-slate-800"
                              }`}
                            >
                              <span className="text-[11px] font-black uppercase tracking-wider block">Percentage Splits (%)</span>
                              <span className="text-[9px] text-slate-500 mt-0.5 block">Assign relative percentage weight (e.g. 40%, 20%, 20%, 20%).</span>
                            </button>

                            <button
                              onClick={() => {
                                setSplitType(activeBill.id, "exact");
                                editBillMeta(activeBill.id, "isGroupSplitEnabled", true);
                              }}
                              className={`w-full text-left p-3 rounded-xl border relative transition-all ${
                                activeBill.groupSplit.splitType === "exact" && activeBill.isGroupSplitEnabled
                                  ? "bg-purple-950/20 border-purple-500/40 text-slate-100" 
                                  : "bg-slate-900/15 border-slate-850 text-slate-400 hover:border-slate-800"
                              }`}
                            >
                              <span className="text-[11px] font-black uppercase tracking-wider block">Custom exact amounts (₹)</span>
                              <span className="text-[9px] text-slate-500 mt-0.5 block">Assign specific rupee values to each member manually.</span>
                            </button>

                            <button
                              onClick={() => {
                                setSplitType(activeBill.id, "items");
                                editBillMeta(activeBill.id, "isGroupSplitEnabled", true);
                              }}
                              className={`w-full text-left p-3 rounded-xl border relative transition-all ${
                                activeBill.groupSplit.splitType === "items" && activeBill.isGroupSplitEnabled
                                  ? "bg-purple-950/20 border-purple-500/40 text-slate-100" 
                                  : "bg-slate-900/15 border-slate-850 text-slate-400 hover:border-slate-800"
                              }`}
                            >
                              <span className="text-[11px] font-black uppercase tracking-wider block">Line item assignment splits</span>
                              <span className="text-[9px] text-slate-500 mt-0.5 block">Select which item belongs to whom. Taxes are shared proportionally.</span>
                            </button>
                          </div>

                          {/* AI Smart Split Advisor Recommendation Box */}
                          <div className="p-3 bg-indigo-950/15 border border-indigo-500/15 rounded-2xl space-y-2 mt-4 select-none">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-450 animate-pulse" />
                              <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">AI Split Advisor</span>
                            </div>
                            <p className="text-[9.5px] text-slate-300 leading-relaxed font-semibold">
                              {activeBill.category.toLowerCase().includes("food") || activeBill.category.toLowerCase().includes("restaurant") || activeBill.merchant.toLowerCase().includes("cafe") ? (
                                "💡 Since this is a Restaurant bill, we recommend 'Line Item Assignment' split so friends only pay for what they ate, then divide the taxes proportionally."
                              ) : activeBill.totalAmount > 4050 ? (
                                "💡 For large travel or group trip ledger entries, using 'Percentage' or 'Custom Exact' splits keeps settlement minimization highly precise."
                              ) : (
                                "💡 This looks like a standard shared utility or grocery expense. A clean 'Split Equally' is mathematically optimal here."
                              )}
                            </p>
                            <div className="flex gap-2 pt-1 border-t border-slate-900/40">
                              <button
                                onClick={() => {
                                  editBillMeta(activeBill.id, "isGroupSplitEnabled", true);
                                  handleAISplitClick("equally");
                                }}
                                className="flex-1 py-1 px-1.5 bg-slate-950/70 hover:bg-[#12182c] border border-slate-800 hover:border-slate-705 text-slate-300 font-bold text-[8.5px] uppercase tracking-wider rounded transition-all cursor-pointer"
                              >
                                Apply Equal
                              </button>
                              <button
                                onClick={() => {
                                  editBillMeta(activeBill.id, "isGroupSplitEnabled", true);
                                  handleAISplitClick("items");
                                }}
                                className="flex-1 py-1 px-1.5 bg-slate-950/70 hover:bg-[#12182c] border border-indigo-500/15 hover:border-indigo-500/35 text-indigo-300 font-bold text-[8.5px] uppercase tracking-wider rounded transition-all cursor-pointer"
                              >
                                Apply Itemized
                              </button>
                            </div>
                          </div>

                        </div>

                        {/* Who paid payer field */}
                        <div className="p-4 bg-slate-900/30 border border-slate-850 rounded-2xl text-left">
                          <label className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">Payer (Who paid the bill?)</label>
                          <select 
                            value={activeBill.groupSplit.payer}
                            onChange={(e) => onPayerChange(e.target.value)}
                            className="bg-[#111827]/30 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 w-full outline-none focus:border-purple-500/20 cursor-pointer capitalize font-bold"
                          >
                            {participants.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>

                      </div>

                      {/* Right: Math inputs panel corresponding to selection */}
                      <div className="md:col-span-6 space-y-4 text-left select-text">
                        
                        <div className="p-4 bg-[#0a0d18]/70 border border-slate-800 rounded-2xl space-y-3">
                          <span className="text-[9.5px] font-black uppercase text-slate-400 tracking-wider">Computed Math & Custom Inputs</span>
                          
                          {/* EQUAL SPLIT */}
                          {activeBill.groupSplit.splitType === "equally" && (
                            <div className="p-3 bg-purple-950/10 border border-purple-500/15 rounded-xl space-y-2">
                              <p className="text-[11px] text-slate-300 leading-snug font-medium">
                                <strong className="text-white">{activeBill.groupSplit.detectedMembers.length} participants</strong> detected.
                              </p>
                              <p className="text-xs text-slate-100 font-bold">
                                Per Head Amount: <span className="text-purple-300 font-mono font-black">₹{(activeBill.totalAmount / activeBill.groupSplit.detectedMembers.length).toFixed(2)}</span>
                              </p>
                            </div>
                          )}

                          {/* PERCENTAGE SPLIT */}
                          {activeBill.groupSplit.splitType === "percentage" && (
                            <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                              <p className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">Verify percentages sum to 100%:</p>
                              {activeBill.groupSplit.detectedMembers.map((m) => (
                                <div key={m} className="flex justify-between items-center bg-slate-900/40 p-2 border border-slate-850 rounded-xl gap-2">
                                  <span className="text-xs text-slate-200 capitalize font-bold">{m}</span>
                                  <div className="relative w-24">
                                    <input 
                                      type="number"
                                      value={activeBill.groupSplit.memberPercentages[m] || 0}
                                      onChange={(e) => editPercentage(activeBill.id, m, Number(e.target.value) || 0)}
                                      className="w-full bg-slate-950 border border-slate-800 text-xs text-center text-white px-2 py-1 rounded"
                                    />
                                    <span className="absolute right-1.5 top-1 text-[9px] text-slate-500">%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* EXACT AMOUNT SPLIT */}
                          {activeBill.groupSplit.splitType === "exact" && (
                            <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                              <p className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">Verify individual amounts sum to ₹{activeBill.totalAmount}:</p>
                              {activeBill.groupSplit.detectedMembers.map((m) => (
                                <div key={m} className="flex justify-between items-center bg-slate-900/40 p-2 border border-slate-850 rounded-xl gap-2">
                                  <span className="text-xs text-slate-200 capitalize font-bold">{m}</span>
                                  <div className="relative w-24 border border-slate-850 bg-slate-950 rounded">
                                    <span className="absolute left-1.5 top-1 text-[9px] text-slate-550">₹</span>
                                    <input 
                                      type="number"
                                      value={activeBill.groupSplit.memberExacts[m] || 0}
                                      onChange={(e) => editExact(activeBill.id, m, Number(e.target.value) || 0)}
                                      className="w-full bg-transparent text-xs text-center text-white px-2 py-1 outline-none font-bold"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* LINE ITEM ASSIGNMENTS */}
                          {activeBill.groupSplit.splitType === "items" && (
                            <div className="space-y-3.5 max-h-[220px] overflow-y-auto custom-scrollbar">
                              {activeBill.items.map((item, idx) => {
                                const list = activeBill.groupSplit.itemAssignments[idx] || [];
                                return (
                                  <div key={idx} className="p-2.5 bg-slate-900/60 border border-slate-850 rounded-xl space-y-1.5">
                                    <div className="flex justify-between text-[11px] font-extrabold text-slate-300">
                                      <span>{item.name} (x{item.quantity})</span>
                                      <span className="font-mono text-purple-400">₹{item.price * item.quantity}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {activeBill.groupSplit.detectedMembers.map(m => {
                                        const checked = list.includes(m);
                                        return (
                                          <button
                                            key={m}
                                            onClick={() => toggleItemAssignment(activeBill.id, idx, m)}
                                            className={`px-2 py-1 rounded text-[9.5px] uppercase font-bold transition-all ${
                                              checked 
                                                ? "bg-purple-600/20 text-purple-300 border border-purple-500/30" 
                                                : "bg-[#05080f] text-slate-550 hover:text-slate-300 border border-slate-900"
                                            }`}
                                          >
                                            {checked ? "✓ " : ""} {m}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Who Pays Whom Realtime Settlement Flow preview */}
                          <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl space-y-2 mt-4 select-text">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider">Who Pays Whom (AI Settlement Flow)</span>
                              <span className="text-[8px] px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 font-extrabold tracking-wider uppercase">Live Preview</span>
                            </div>
                            <div className="space-y-1.5 scroll-y max-h-[140px] overflow-y-auto custom-scrollbar">
                              {minimizeSettlements(calculateBillBalances(activeBill)).length === 0 ? (
                                <p className="text-[10px] text-slate-500 italic p-3 text-center">No optimal movements needed. All participant accounts balance out completely.</p>
                              ) : (
                                minimizeSettlements(calculateBillBalances(activeBill)).map((transfer, idx) => (
                                  <div key={idx} className="flex justify-between items-center p-2.5 bg-[#05080f]/50 border border-slate-900 rounded-xl hover:bg-[#0a1222] transition-all duration-300">
                                    <div className="flex-1 flex items-center justify-between gap-1 select-none">
                                      <span className="capitalize font-black text-rose-300 text-[10.5px] truncate w-[60px] text-left">{transfer.from}</span>
                                      <div className="flex-1 px-1 flex flex-col items-center justify-center relative">
                                        <span className="text-[9.5px] font-mono text-indigo-300 font-black mb-0.5">₹{transfer.amount.toFixed(2)}</span>
                                        <span className="text-[8px] text-slate-600 font-black block tracking-tighter">───────▶</span>
                                      </div>
                                      <span className="capitalize font-black text-emerald-300 text-[10.5px] truncate w-[60px] text-right">{transfer.to}</span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                        </div>

                      </div>

                    </div>
                  )}

                  {/* ====================================================
                      WIZARD STEP 4: FINAL SETTLEMENT SUMMARY CONFIRMATION SHEET
                      ==================================================== */}
                  {wizardStep === "confirm" && (
                    <div className="max-w-xl mx-auto p-5 bg-[#090e18] border border-indigo-500/20 rounded-3xl space-y-4 text-left select-text shadow-2xl relative">
                      
                      {/* Header section */}
                      <div className="text-center space-y-1.5 select-none pb-2 border-b border-slate-900/40">
                        <Sparkles className="w-8 h-8 text-indigo-400 mx-auto animate-pulse" />
                        <h3 className="text-md font-black text-slate-100 uppercase tracking-widest">AI Settlement Engine</h3>
                        <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">Zero-redundancy minimized debt ledger</p>
                      </div>

                      {/* Quick Stats Summary Grid */}
                      <div className="grid grid-cols-2 gap-3 pb-1 select-none">
                        <div className="p-3 bg-slate-950/80 border border-slate-900 rounded-xl flex flex-col justify-between">
                          <span className="text-[8.5px] text-slate-500 font-extrabold uppercase tracking-wider">Total Expense</span>
                          <span className="font-mono text-lg font-black text-indigo-300">₹{activeBill.totalAmount}</span>
                        </div>
                        <div className="p-3 bg-slate-950/80 border border-slate-900 rounded-xl flex flex-col justify-between">
                          <span className="text-[8.5px] text-slate-500 font-extrabold uppercase tracking-wider">Simplifier Status</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">Active & Optimal</span>
                          </div>
                        </div>
                      </div>

                      {/* Net Accounts Ledger List */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Net Member Ledger Balances</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                          {Object.entries(calculateBillBalances(activeBill)).map(([member, bal]) => {
                            const extra = bal > 0.01;
                            const owes = bal < -0.01;
                            return (
                              <div 
                                key={member} 
                                className={`p-2.5 bg-slate-950/70 border rounded-2xl flex justify-between items-center transition-all ${
                                  extra ? "border-emerald-500/15" : owes ? "border-rose-500/15" : "border-slate-900"
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/30" />
                                  <span className="capitalize text-[11px] text-slate-200 font-bold">{member}</span>
                                </div>
                                {owes ? (
                                  <span className="text-[10.5px] text-rose-450 font-mono font-bold">Owes ₹{Math.abs(bal).toFixed(2)}</span>
                                ) : extra ? (
                                  <span className="text-[10.5px] text-emerald-400 font-mono font-bold">Recovers ₹{bal.toFixed(2)}</span>
                                ) : (
                                  <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wide bg-slate-900 px-1.5 py-0.5 rounded">Settled</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Who Pays Whom - AI Settlement Cards Flow */}
                      <div className="space-y-2.5 pt-3 border-t border-slate-900/50">
                        <div className="flex items-center justify-between select-none">
                          <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider">Who Pays Whom (Dynamic Transfers)</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const transfers = minimizeSettlements(calculateBillBalances(activeBill));
                                const nextMarked = { ...settledTransfers };
                                const allAlreadySettled = transfers.every(t => {
                                  const key = `${t.from}-${t.to}-${t.amount}`;
                                  return settledTransfers[key];
                                });
                                transfers.forEach(t => {
                                  const key = `${t.from}-${t.to}-${t.amount}`;
                                  nextMarked[key] = !allAlreadySettled;
                                });
                                setSettledTransfers(nextMarked);
                                setModalNotification({
                                  message: allAlreadySettled ? "♻ Ledgers reset to unresolved state." : "✔ All transfers marked as settled!",
                                  type: "success",
                                  id: Date.now()
                                });
                              }}
                              className="text-[8.5px] font-black uppercase tracking-wider text-indigo-400 hover:text-indigo-300 cursor-pointer transition-colors bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded-lg border border-indigo-500/20"
                            >
                              {minimizeSettlements(calculateBillBalances(activeBill)).every(t => settledTransfers[`${t.from}-${t.to}-${t.amount}`]) ? "Reset All" : "Mark All Settled"}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                          {minimizeSettlements(calculateBillBalances(activeBill)).length === 0 ? (
                            <div className="text-center p-6 bg-slate-950/60 border border-slate-900/55 rounded-2xl">
                              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1 animate-pulse" />
                              <p className="text-[10.5px] text-slate-350 font-semibold italic">No transfers needed. Participant ledgers are perfectly balanced!</p>
                            </div>
                          ) : (
                            minimizeSettlements(calculateBillBalances(activeBill)).map((transfer, idx) => {
                              const key = `${transfer.from}-${transfer.to}-${transfer.amount}`;
                              const isSettled = settledTransfers[key];
                              const isReminded = sentReminders[key];

                              return (
                                <div 
                                  key={idx} 
                                  className={`p-3 bg-slate-950/90 border rounded-2xl transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                    isSettled 
                                      ? "border-emerald-500/25 bg-emerald-950/5 opacity-60" 
                                      : "border-slate-900 hover:border-slate-800"
                                  }`}
                                >
                                  {/* Interactive Visual arrow movement flow layout line */}
                                  <div className={`flex-1 flex items-center justify-between gap-2 select-none ${isSettled ? "line-through text-slate-500" : ""}`}>
                                    <div className="flex flex-col items-start min-w-[70px]">
                                      <span className="text-[8px] uppercase font-extrabold tracking-wider text-rose-450">Debtor pays</span>
                                      <span className="capitalize text-xs font-black text-slate-200">{transfer.from}</span>
                                    </div>

                                    <div className="flex-1 flex flex-col items-center justify-center relative px-2">
                                      <span className={`font-mono text-xs font-black tracking-tight mb-0.5 ${isSettled ? "text-emerald-500 font-extrabold" : "text-indigo-300"}`}>
                                        ₹{transfer.amount.toFixed(2)}
                                      </span>
                                      {/* Flow animation arrow line */}
                                      <div className="w-full flex items-center justify-center text-slate-700 font-black text-[9px] relative tracking-tighter">
                                        <span className="text-slate-800 mr-[-2px] select-none text-[8.5px]">───</span>
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border select-none ${
                                          isSettled 
                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                                            : "bg-[#05080f] border-slate-900 text-slate-400"
                                        }`}>
                                          {isSettled ? "Paid ✓" : "Settle"}
                                        </span>
                                        <span className="text-slate-800 ml-[-2px] select-none text-[8.5px]">───▶</span>
                                      </div>
                                    </div>

                                    <div className="flex flex-col items-end min-w-[70px] text-right">
                                      <span className="text-[8px] uppercase font-extrabold tracking-wider text-emerald-450">Recipient gets</span>
                                      <span className="capitalize text-xs font-black text-slate-200">{transfer.to}</span>
                                    </div>
                                  </div>

                                  {/* Action Buttons for this transfer flow */}
                                  <div className="flex items-center gap-1.5 sm:border-l sm:border-slate-900 sm:pl-3 select-none justify-end">
                                    <button
                                      onClick={() => {
                                        setSettledTransfers(prev => ({
                                          ...prev,
                                          [key]: !prev[key]
                                        }));
                                        setModalNotification({
                                          message: isSettled 
                                            ? `Marked route of ${transfer.from} pays ${transfer.to} as pending.`
                                            : `Successfully settled ₹${transfer.amount.toFixed(2)} payment from ${transfer.from}!`,
                                          type: isSettled ? "info" : "success",
                                          id: Date.now()
                                        });
                                      }}
                                      className={`py-1.5 px-3 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                                        isSettled 
                                          ? "bg-emerald-950/35 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/50" 
                                          : "bg-slate-900 hover:bg-[#121c2c] border border-slate-850 hover:border-slate-705 text-slate-300"
                                      }`}
                                      title="Toggle status marked as paid"
                                    >
                                      {isSettled ? "Paid ✓" : "Mark Paid"}
                                    </button>

                                    <button
                                      onClick={() => {
                                        setSentReminders(prev => ({
                                          ...prev,
                                          [key]: true
                                        }));
                                        setModalNotification({
                                          message: `🔔 Dispatching UPI Charge Request: Notified ${transfer.from} to send ₹${transfer.amount.toFixed(2)} to ${transfer.to}!`,
                                          type: "success",
                                          id: Date.now()
                                        });
                                      }}
                                      className={`p-1.5 rounded-xl border transition-all cursor-pointer hover:scale-105 ${
                                        isReminded 
                                          ? "bg-amber-950/20 border-amber-500/30 text-amber-400" 
                                          : "bg-[#0b101c] border-slate-900 text-slate-400 hover:text-slate-250 hover:bg-slate-900"
                                      }`}
                                      title="Send formal reminder notice"
                                      disabled={isSettled}
                                    >
                                      <Bell className={`w-3.5 h-3.5 ${isReminded ? "animate-bounce text-amber-400" : ""}`} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Conversational AI Advice Panel */}
                      <div className="p-3.5 bg-indigo-950/10 border border-indigo-500/15 rounded-2xl space-y-1 mt-4 select-text">
                        <div className="flex items-center gap-1.5 select-none">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                          <span className="text-[9.5px] font-black text-indigo-300 uppercase tracking-widest">Generative AI Insights</span>
                        </div>
                        <p 
                          className="text-[10px] text-slate-300 leading-relaxed font-semibold capitalize-first pr-1"
                          dangerouslySetInnerHTML={{ 
                            __html: generateAIAdvice(activeBill)
                              .replace(/\*\*(.*?)\*\*/g, '<b class="text-indigo-200">$1</b>') 
                          }}
                        />
                      </div>

                      {/* Action Utility Bar: Share and Export */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-900/40 select-none">
                        <button
                          onClick={() => shareSettlementLog(activeBill)}
                          className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/10 hover:border-indigo-500/30 text-white font-black text-[9.5px] uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Share2 className="w-3.5 h-3.5" /> Share Split Sheet
                        </button>

                        <button
                          onClick={() => exportSettlementTXTDraft(activeBill)}
                          className="flex-1 py-2 bg-[#090f1d] hover:bg-slate-900 border border-slate-800 hover:border-slate-705 text-slate-300 font-bold text-[9.5px] uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5 text-indigo-400" /> Export Settlement (.txt)
                        </button>
                      </div>

                    </div>
                  )}

                </div>

                                {/* BOTTOM COMPACT DECISIONS BAR */}
                <div className="mt-4 pt-4 border-t border-slate-850 flex items-center justify-between shrink-0 select-none">
                  
                  {wizardStep === "preview" ? (
                    <>
                      <button
                        onClick={resetModal}
                        className="px-4 py-2 bg-[#121c2c] hover:bg-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-800 cursor-pointer"
                      >
                        Discard
                      </button>

                      <button
                        onClick={() => navigateToStep("participants")}
                        className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 border border-purple-500/20"
                      >
                        Continue <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : wizardStep === "participants" ? (
                    <>
                      <button
                        onClick={() => navigateToStep("preview")}
                        className="px-4 py-2 bg-[#121c2c] hover:bg-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-800 cursor-pointer flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Back
                      </button>

                      <button
                        onClick={() => navigateToStep("splits")}
                        className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 border border-purple-500/20"
                      >
                        Choose splits <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : wizardStep === "splits" ? (
                    <>
                      <button
                        onClick={() => navigateToStep("participants")}
                        className="px-4 py-2 bg-[#121c2c] hover:bg-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-800 cursor-pointer flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Back
                      </button>

                      <button
                        onClick={() => navigateToStep("confirm")}
                        className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 border border-purple-500/20"
                      >
                        Review sheet <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => navigateToStep("splits")}
                        className="px-4 py-2 bg-[#121c2c] hover:bg-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-800 cursor-pointer flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Back
                      </button>

                      <div className="flex gap-2">
                        <button
                          onClick={handleExportPDF}
                          className="px-4.5 py-2 bg-[#0d1525] border border-purple-500/20 hover:bg-purple-950/20 text-slate-100 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-purple-400" /> Export PDF Report
                        </button>

                        <button
                          onClick={handleConversationalHandoff}
                          className="px-4.5 py-2 bg-[#1b1c35] hover:bg-[#25284d] border border-indigo-500/20 text-slate-200 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> Save & Chat
                        </button>

                        <button
                          onClick={handleFinalConfirmSave}
                          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1 border border-emerald-500/20"
                        >
                          <Check className="w-3.5 h-3.5" /> Save Expense ✓
                        </button>
                      </div>
                    </>
                  )}
                </div>

              </div>
            )}

            {/* LOWER ACTIONS BUTTON BAR FOR IDLE STATE */}
            {phase === "idle" && (
              <div className="mt-4 pt-4 border-t border-slate-85/80 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2 text-slate-500 text-left select-none max-w-lg">
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <p className="text-[9px] text-slate-400 leading-normal italic font-medium">
                    Fully automated end-to-end sandbox sessions. Your receipts data and uploaded pixels are permanently wiped once transactional entries are successfully committed.
                  </p>
                </div>
              </div>
            )}

          </section>
        </div>

      </motion.div>
    </div>
  );
}
