import { useState, useEffect, useRef } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Sparkles, 
  Plus, 
  Trash, 
  Edit, 
  Check, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Send, 
  RefreshCw, 
  Sliders, 
  X, 
  ArrowRight,
  Database,
  Lock,
  Search,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  Tag,
  Filter,
  FilterX,
  Wallet,
  Coins,
  TrendingUp,
  LogIn,
  LogOut,
  Cloud,
  CloudOff,
  User,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Transaction, MonthCompetence, ChatMessage } from "./types";
import GoogleDrivePanel from "./components/GoogleDrivePanel";
import LocalBackupPanel from "./components/LocalBackupPanel";

// Firebase Integration imports
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
} from "./firebase";
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  writeBatch,
  deleteDoc
} from "firebase/firestore";

const MONTHS_ORDER = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const parseMonthYearValue = (key: string): number => {
  const parts = key.split(" ");
  if (parts.length < 2) return 0;
  const mName = parts[0];
  const year = parseInt(parts[1]) || 2026;
  const mIndex = MONTHS_ORDER.findIndex(m => m.toLowerCase() === mName.toLowerCase());
  return year * 12 + (mIndex !== -1 ? mIndex : 0);
};

const getNthMonthYear = (startMonthYear: string, offset: number): string => {
  const parts = startMonthYear.split(" ");
  const mName = parts[0];
  const year = parseInt(parts[1]) || 2026;
  const mIndex = MONTHS_ORDER.findIndex(m => m.toLowerCase() === mName.toLowerCase());
  
  let targetIndex = (mIndex !== -1 ? mIndex : 0) + offset;
  let targetYear = year + Math.floor(targetIndex / 12);
  targetIndex = targetIndex % 12;
  if (targetIndex < 0) {
    targetIndex += 12;
  }
  
  return `${MONTHS_ORDER[targetIndex]} ${targetYear}`;
};

// Suggested preset statements to help the user test exceptions
const EXAMPLE_PRESETS = [
  { label: "Gere Julho DE 2026", command: "Gere a competência para o mês de Julho de 2026" },
  { label: "Confirmar Internet & Academia", command: "Confirma o pagamento da Internet e da Academia de Junho." },
  { label: "Ajustar Supermercado", command: "Supermercado deu R$ 750 este mês." },
  { label: "Outro Gasto Pontual", command: "Inclui um gasto pontual de R$ 150 com farmácia hoje." }
];

const INITIAL_COMPETENCES: Record<string, MonthCompetence> = {
  "Junho 2026": {
    monthYear: "Junho 2026",
    income: 4000.00,
    transactions: [
      { id: "jun-1", date: "2026-06-05", category: "Habitacao & Familia", subcategory: "Aluguel / Condomínio", value: 1200.00, status: "OK", type: "Fixo", sqlTable: "Fluxo_Casa", description: "Aluguel residencial pago.", paymentMethod: "Pix", paymentDate: "2026-06-05" },
      { id: "jun-2", date: "2026-06-10", category: "Habitacao & Familia", subcategory: "Energia & Água", value: 180.00, status: "OK", type: "Fixo", sqlTable: "Categoria_Despesas", description: "Contas de consumo quitadas.", paymentMethod: "Boleto", paymentDate: "2026-06-10" },
      { id: "jun-3", date: "2026-06-10", category: "Telecomunicacoes", subcategory: "Internet & Celular", value: 120.00, status: "OK", type: "Fixo", sqlTable: "Categoria_Despesas", description: "Plano banda larga residencial.", paymentMethod: "Débito", paymentDate: "2026-06-10" },
      { id: "jun-4", date: "2026-06-11", category: "Financas & Credito", subcategory: "Cartão de Crédito", value: 450.00, status: "Previsto", type: "Variável", sqlTable: "Categoria_Despesas", description: "Fatura consolidada do cartão.", paymentMethod: "Crédito", paymentDate: "" },
      { id: "jun-5", date: "2026-06-12", category: "Saude & Bem-Estar", subcategory: "Academia & Bem-Estar", value: 110.00, status: "Previsto", type: "Fixo", sqlTable: "Categoria_Despesas", description: "Mensalidade atividade física.", paymentMethod: "Dinheiro", paymentDate: "" },
      { id: "jun-6", date: "2026-06-15", category: "Transporte", subcategory: "Transporte & Combustível", value: 250.00, status: "Previsto", type: "Variável", sqlTable: "Categoria_Despesas", description: "Deslocamento e transporte.", paymentMethod: "Pix", paymentDate: "" },
      { id: "jun-7", date: "2026-06-18", category: "Saude & Bem-Estar", subcategory: "Plano de Saúde / Farmácia", value: 150.00, status: "Previsto", type: "Fixo", sqlTable: "Categoria_Despesas", description: "Cuidados de saúde e farmácia.", paymentMethod: "Boleto", paymentDate: "" },
      { id: "jun-8", date: "2026-06-20", category: "Obrigacoes & Negocios", subcategory: "Educação & Cursos", value: 200.00, status: "Previsto", type: "Fixo", sqlTable: "Categoria_Despesas", description: "Mensalidade educacional / cursos.", paymentMethod: "Boleto", paymentDate: "" },
      { id: "jun-9", date: "2026-06-20", category: "Estilo de Vida", subcategory: "Supermercado & Feira", value: 750.00, status: "Previsto", type: "Variável", sqlTable: "Categoria_Despesas", description: "Alimentação básica e mercado.", paymentMethod: "Pix", paymentDate: "" },
      { id: "jun-10", date: "2026-06-22", category: "Estilo de Vida", subcategory: "Lazer & Entretenimento", value: 200.00, status: "Previsto", type: "Variável", sqlTable: "Categoria_Despesas", description: "Lazer, passeios e streaming.", paymentMethod: "Dinheiro", paymentDate: "" }
    ]
  }
};

const STANDARD_CATEGORIES_PRESETS = [
  { subcategory: "Aluguel / Condomínio", category: "Habitacao & Familia", value: 1200.00, type: "Fixo" as const, sqlTable: "Fluxo_Casa" as const },
  { subcategory: "Energia & Água", category: "Habitacao & Familia", value: 180.00, type: "Fixo" as const, sqlTable: "Categoria_Despesas" as const },
  { subcategory: "Supermercado & Feira", category: "Estilo de Vida", value: 750.00, type: "Variável" as const, sqlTable: "Categoria_Despesas" as const },
  { subcategory: "Internet & Celular", category: "Telecomunicacoes", value: 120.00, type: "Fixo" as const, sqlTable: "Categoria_Despesas" as const },
  { subcategory: "Transporte & Combustível", category: "Transporte", value: 250.00, type: "Variável" as const, sqlTable: "Categoria_Despesas" as const },
  { subcategory: "Academia & Bem-Estar", category: "Saude & Bem-Estar", value: 110.00, type: "Fixo" as const, sqlTable: "Categoria_Despesas" as const },
  { subcategory: "Plano de Saúde / Farmácia", category: "Saude & Bem-Estar", value: 150.00, type: "Fixo" as const, sqlTable: "Categoria_Despesas" as const },
  { subcategory: "Educação & Cursos", category: "Obrigacoes & Negocios", value: 200.00, type: "Fixo" as const, sqlTable: "Categoria_Despesas" as const },
  { subcategory: "Lazer & Entretenimento", category: "Estilo de Vida", value: 200.00, type: "Variável" as const, sqlTable: "Categoria_Despesas" as const },
  { subcategory: "Reserva & Investimentos", category: "Financas & Credito", value: 300.00, type: "Fixo" as const, sqlTable: "Categoria_Despesas" as const },
  { subcategory: "Cartão de Crédito", category: "Financas & Credito", value: 0.00, type: "Variável" as const, sqlTable: "Categoria_Despesas" as const }
];

export default function App() {
  const [competences, setCompetences] = useState<Record<string, MonthCompetence>>(() => {
    const cached = localStorage.getItem("finops_competences");
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { /* ignore */ }
    }
    return INITIAL_COMPETENCES;
  });

  const [activeMonthYear, setActiveMonthYear] = useState<string>("Junho 2026");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  
  // Categories configurations
  const [categoriesConfig, setCategoriesConfig] = useState(() => {
    const cached = localStorage.getItem("finops_categories_config");
    if (cached) {
      try { return JSON.parse(cached); } catch(e) {}
    }
    return STANDARD_CATEGORIES_PRESETS;
  });

  // Firebase auth & DB state variables
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isDbLoading, setIsDbLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Synchronize Auth & DB load on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsDbLoading(true);
        setDbError(null);
        try {
          // 1. Fetch user categories/presets config
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          let cloudPresets: any[] = [];
          if (userDocSnap.exists()) {
            const cloudData = userDocSnap.data();
            cloudPresets = cloudData.categoriesConfig || [];
            if (cloudPresets.length > 0) {
              setCategoriesConfig(cloudPresets);
            }
          } else {
            // New cloud account: save current local ones to Cloud
            await setDoc(userDocRef, {
              uid: user.uid,
              email: user.email || "",
              categoriesConfig: categoriesConfig,
              updatedAt: new Date().toISOString()
            });
          }

          // 2. Fetch all month competences from Firestore
          const competencesColRef = collection(db, "users", user.uid, "competences");
          const competencesSnap = await getDocs(competencesColRef);
          
          if (!competencesSnap.empty) {
            const loadedCompetences: Record<string, MonthCompetence> = {};
            competencesSnap.forEach((d) => {
              loadedCompetences[d.id] = d.data() as MonthCompetence;
            });
            setCompetences(loadedCompetences);
            
            // Adjust active month if necessary
            const firstLoadedKey = Object.keys(loadedCompetences)[0];
            if (firstLoadedKey && !loadedCompetences[activeMonthYear]) {
              setActiveMonthYear(firstLoadedKey);
            }
          } else {
            // New cloud account: batch-save all current local months to Firestore
            const batch = writeBatch(db);
            Object.entries(competences).forEach(([mKey, mVal]) => {
              const compDocRef = doc(db, "users", user.uid, "competences", mKey);
              batch.set(compDocRef, {
                ...mVal,
                updatedAt: new Date().toISOString()
              });
            });
            await batch.commit();
          }
        } catch (error: any) {
          console.error("Erro ao sincronizar com nuvem:", error);
          setDbError(`Houve um problema de permissão ou conexão ao ler o banco de dados: ${error?.message || error}`);
        } finally {
          setIsDbLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Save categoriesConfig to localStorage and Firebase on update
  useEffect(() => {
    localStorage.setItem("finops_categories_config", JSON.stringify(categoriesConfig));
    
    if (currentUser) {
      const syncConfig = async () => {
        setIsSyncing(true);
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          await setDoc(userDocRef, {
            uid: currentUser.uid,
            email: currentUser.email || "",
            categoriesConfig: categoriesConfig,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (error) {
          console.error("Erro ao persistir configuração de parâmetros na nuvem:", error);
        } finally {
          setIsSyncing(false);
        }
      };
      
      const timeoutId = setTimeout(syncConfig, 600);
      return () => clearTimeout(timeoutId);
    }
  }, [categoriesConfig, currentUser]);

  // Google Sign In
  const handleGoogleSignIn = async () => {
    setIsDbLoading(true);
    setDbError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Erro no login Google:", error);
      setDbError(`Erro ao conectar com a conta do Google: ${error?.message || error}`);
    } finally {
      setIsDbLoading(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    setIsDbLoading(true);
    setDbError(null);
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error("Erro ao sair:", error);
    } finally {
      setIsDbLoading(false);
    }
  };

  // Workspace layout components
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"lançamentos" | "receitas" | "parâmetros">("lançamentos");
  const [showAiAssistant, setShowAiAssistant] = useState<boolean>(() => {
    const cached = localStorage.getItem("finops_show_ai_assistant");
    return cached === null ? true : cached === "true";
  });

  const [showBackupDrive, setShowBackupDrive] = useState<boolean>(() => {
    const cached = localStorage.getItem("bdfin_show_backup_drive");
    return cached === null ? true : cached === "true";
  });

  useEffect(() => {
    localStorage.setItem("finops_show_ai_assistant", String(showAiAssistant));
  }, [showAiAssistant]);

  useEffect(() => {
    localStorage.setItem("bdfin_show_backup_drive", String(showBackupDrive));
  }, [showBackupDrive]);

  // Parameters editing substate
  const [newParameterSubcat, setNewParameterSubcat] = useState("");
  const [newParameterCat, setNewParameterCat] = useState("Habitacao & Familia");
  const [newParameterVal, setNewParameterVal] = useState("200.00");
  const [newParameterType, setNewParameterType] = useState<"Fixo" | "Variável">("Fixo");
  const [newParameterSql, setNewParameterSql] = useState<"Fluxo_Casa" | "Categoria_Despesas">("Categoria_Despesas");
  const [newParameterPaymentMethod, setNewParameterPaymentMethod] = useState<'Pix' | 'Dinheiro' | 'Crédito' | 'Débito' | 'Boleto' | ''>("");
  const [newParameterPaymentDate, setNewParameterPaymentDate] = useState("");

  // Export Tab selector state
  const [activeExportTab, setActiveExportTab] = useState<"lancamentos" | "parametros" | "indicadores" | "receitas">("lancamentos");

  // Helper to synchronize parameter modifications back into existing months instantly, preventing any data divergence!
  const updateCategoriesConfigAndSync = (newConfig: typeof categoriesConfig) => {
    setCategoriesConfig(newConfig);
    setCompetences(prev => {
      const copy = { ...prev };
      const activeVal = parseMonthYearValue(activeMonthYear);
      Object.keys(copy).forEach(mKey => {
        const mVal = parseMonthYearValue(mKey);
        if (mVal >= activeVal) {
          copy[mKey] = {
            ...copy[mKey],
            transactions: copy[mKey].transactions.map(t => {
              // Match transaction by subcategory
              const match = newConfig.find(cfg => cfg.subcategory === t.subcategory);
              if (match) {
                const isSubsequent = mVal > activeVal;
                // Only override the value in subsequent months if it is a "Fixo" expense.
                const shouldOverrideValue = !isSubsequent || match.type === "Fixo";
                return {
                  ...t,
                  category: match.category,
                  value: shouldOverrideValue ? match.value : t.value,
                  type: match.type,
                  // Do not override if transaction is paid, except to align standard fields
                  paymentMethod: t.paymentMethod || match.paymentMethod || "",
                  paymentDate: t.paymentDate || match.paymentDate || ""
                };
              }
              return t;
            })
          };
        }
      });
      return copy;
    });
  };

  // Helper to rename a subcategory across all active months' transactions in real-time
  const handleRenameSubcategory = (idx: number, newSubcatName: string) => {
    const oldSubcat = categoriesConfig[idx].subcategory;
    const nextConfig = [...categoriesConfig];
    nextConfig[idx].subcategory = newSubcatName;
    setCategoriesConfig(nextConfig);

    setCompetences(prev => {
      const copy = { ...prev };
      const activeVal = parseMonthYearValue(activeMonthYear);
      Object.keys(copy).forEach(mKey => {
        const mVal = parseMonthYearValue(mKey);
        if (mVal >= activeVal) {
          copy[mKey] = {
            ...copy[mKey],
            transactions: copy[mKey].transactions.map(t => {
              if (t.subcategory === oldSubcat) {
                return { ...t, subcategory: newSubcatName };
              }
              return t;
            })
          };
        }
      });
      return copy;
    });
  };

  // Custom manual edit states
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [monthlyIncomeInput, setMonthlyIncomeInput] = useState<number>(4000.00);
  const [csvCopied, setCsvCopied] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showCompetenceGenerator, setShowCompetenceGenerator] = useState<boolean>(false);
  const [confirmStateKey, setConfirmStateKey] = useState<string | null>(null);

  // Custom view and safety configurations
  const [showCategories, setShowCategories] = useState<boolean>(() => {
    const cached = localStorage.getItem("finops_show_categories");
    return cached === null ? true : cached === "true";
  });
  const [showPaymentMethod, setShowPaymentMethod] = useState<boolean>(() => {
    const cached = localStorage.getItem("finops_show_payment_method");
    return cached === null ? true : cached === "true";
  });
  const [showType, setShowType] = useState<boolean>(() => {
    const cached = localStorage.getItem("finops_show_type");
    return cached === null ? true : cached === "true";
  });
  const [hideValues, setHideValues] = useState<boolean>(() => {
    const cached = localStorage.getItem("finops_hide_values");
    return cached === "true";
  });

  useEffect(() => {
    localStorage.setItem("finops_show_categories", String(showCategories));
  }, [showCategories]);

  useEffect(() => {
    localStorage.setItem("finops_show_payment_method", String(showPaymentMethod));
  }, [showPaymentMethod]);

  useEffect(() => {
    localStorage.setItem("finops_show_type", String(showType));
  }, [showType]);

  useEffect(() => {
    localStorage.setItem("finops_hide_values", String(hideValues));
  }, [hideValues]);

  // Inline filter states
  const [filterStatus, setFilterStatus] = useState<string>("Todos");
  const [filterSearch, setFilterSearch] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("Todos");
  const [filterValueMax, setFilterValueMax] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("Todos");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>("Todos");
  const [filterPaymentDate, setFilterPaymentDate] = useState<string>("");

  const clearAllFilters = () => {
    setFilterStatus("Todos");
    setFilterSearch("");
    setFilterCategory("Todos");
    setFilterValueMax("");
    setFilterType("Todos");
    setFilterPaymentMethod("Todos");
    setFilterPaymentDate("");
  };

  // New month creator variables
  const [newMonthName, setNewMonthName] = useState<string>("Julho");
  const [newMonthYear, setNewMonthYear] = useState<string>("2026");

  // New manual transaction input forms
  const [newTransCategory, setNewTransCategory] = useState<string>("Estilo de Vida");
  const [newTransSubcategory, setNewTransSubcategory] = useState<string>("Gasto Extra");
  const [newTransValue, setNewTransValue] = useState<string>("100.00");
  const [newTransStatus, setNewTransStatus] = useState<"Previsto" | "OK">("OK");
  const [newTransType, setNewTransType] = useState<"Fixo" | "Variável">("Variável");
  const [newTransSqlTable, setNewTransSqlTable] = useState<"Fluxo_Casa" | "Categoria_Despesas">("Categoria_Despesas");
  const [newTransDesc, setNewTransDesc] = useState<string>("");
  const [newTransPaymentMethod, setNewTransPaymentMethod] = useState<'Pix' | 'Dinheiro' | 'Crédito' | 'Débito' | 'Boleto' | ''>("");
  const [newTransPaymentDate, setNewTransPaymentDate] = useState<string>("");
  const [newTransScope, setNewTransScope] = useState<'vigent_only' | 'all_future' | 'future_with_end' | 'installments'>('vigent_only');
  const [newTransEndMonth, setNewTransEndMonth] = useState<string>("Dezembro 2026");
  const [newTransInstallmentsCount, setNewTransInstallmentsCount] = useState<string>("2");
  const [newTransExcludeFromTotal, setNewTransExcludeFromTotal] = useState<boolean>(false);
  const [newIncomeDesc, setNewIncomeDesc] = useState<string>("");
  const [newIncomeVal, setNewIncomeVal] = useState<string>("500.00");
  const [newIncomeDate, setNewIncomeDate] = useState<string>("");

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Save competences to localStorage and cloud on change
  const prevCompetencesRef = useRef<Record<string, MonthCompetence>>({});

  useEffect(() => {
    localStorage.setItem("finops_competences", JSON.stringify(competences));
    
    if (currentUser) {
      const syncModifiedCompetences = async () => {
        setIsSyncing(true);
        try {
          const batch = writeBatch(db);
          let hasChanges = false;
          
          // Detect additions & updates
          Object.entries(competences).forEach(([mKey, mVal]) => {
            const prevVal = prevCompetencesRef.current[mKey];
            if (!prevVal || JSON.stringify(prevVal) !== JSON.stringify(mVal)) {
              const compDocRef = doc(db, "users", currentUser.uid, "competences", mKey);
              batch.set(compDocRef, {
                ...mVal,
                updatedAt: new Date().toISOString()
              });
              hasChanges = true;
            }
          });

          // Detect deletions
          Object.keys(prevCompetencesRef.current).forEach((mKey) => {
            if (!competences[mKey]) {
              const compDocRef = doc(db, "users", currentUser.uid, "competences", mKey);
              batch.delete(compDocRef);
              hasChanges = true;
            }
          });

          if (hasChanges) {
            await batch.commit();
          }
          prevCompetencesRef.current = competences;
        } catch (error) {
          console.error("Erro ao sincronizar competências no Firebase:", error);
        } finally {
          setIsSyncing(false);
        }
      };

      const handler = setTimeout(syncModifiedCompetences, 800);
      return () => clearTimeout(handler);
    } else {
      prevCompetencesRef.current = competences;
    }
  }, [competences, currentUser]);

  // Welcome AI message
  useEffect(() => {
    if (chatHistory.length === 0) {
      setChatHistory([
        {
          id: "sys-welcome",
          sender: "assistant",
          text: "Olá, bem-vindo ao **BDFin v1**. Eu sou seu motor inteligente de gerenciamento de dados financeiro! Digite o que deseja fazer ou clique nos botões rápidos em 'Controle por Exceção' para começar.",
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isAiLoading]);

  // Current active competence data
  const currentCompetence = competences[activeMonthYear] || {
    monthYear: activeMonthYear,
    income: 4000.00,
    transactions: []
  };

  const currentTransactions = currentCompetence.transactions;
  const currentIncome = currentCompetence.income;

  const isTransactionPaid = (t: Transaction) => {
    if (t.status === "OK") return true;
    if (t.excludeFromTotal) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (t.date && t.date <= todayStr) {
        return true;
      }
    }
    return false;
  };

  const getFilteredAndSortedTransactions = () => {
    let filtered = [...currentTransactions];

    if (filterStatus !== "Todos") {
      filtered = filtered.filter(t => {
        const isPaid = isTransactionPaid(t);
        return filterStatus === "OK" ? isPaid : !isPaid;
      });
    }
    if (filterSearch.trim()) {
      const searchLower = filterSearch.toLowerCase();
      filtered = filtered.filter(t => 
        t.subcategory.toLowerCase().includes(searchLower) || 
        (t.description || "").toLowerCase().includes(searchLower)
      );
    }
    if (filterCategory !== "Todos") {
      filtered = filtered.filter(t => t.category === filterCategory);
    }
    if (filterValueMax.trim()) {
      const maxVal = parseFloat(filterValueMax);
      if (!isNaN(maxVal)) {
        filtered = filtered.filter(t => t.value <= maxVal);
      }
    }
    if (filterType !== "Todos") {
      filtered = filtered.filter(t => t.type === filterType);
    }
    if (filterPaymentMethod !== "Todos") {
      filtered = filtered.filter(t => (t.paymentMethod || "") === filterPaymentMethod);
    }
    if (filterPaymentDate.trim()) {
      const pDateLower = filterPaymentDate.toLowerCase();
      filtered = filtered.filter(t => (t.paymentDate || "").toLowerCase().includes(pDateLower));
    }

    // Sort: por default ordenados por dia de pagamento (paymentDate)
    filtered.sort((a, b) => {
      const dateA = a.paymentDate || "";
      const dateB = b.paymentDate || "";
      
      if (dateA && !dateB) return -1;
      if (!dateA && dateB) return 1;
      if (dateA && dateB) {
        return dateA.localeCompare(dateB);
      }
      return (a.date || "").localeCompare(b.date || "");
    });

    return filtered;
  };

  // Calculativos do dashboard
  const currentAdditionalIncomes = currentCompetence.additionalIncomes || [];
  const totalAdditionalIncomeVal = currentAdditionalIncomes.reduce((sum, inc) => sum + inc.value, 0);
  const totalMonthlyIncome = currentIncome + totalAdditionalIncomeVal;

  const totalPredicted = currentTransactions
    .filter(t => t.excludeFromTotal !== true)
    .reduce((acc, curr) => acc + curr.value, 0);
  const totalPaid = currentTransactions
    .filter(t => t.status === "OK" && t.excludeFromTotal !== true)
    .reduce((acc, curr) => acc + curr.value, 0);
  const totalPending = currentTransactions
    .filter(t => t.status === "Previsto" && t.excludeFromTotal !== true)
    .reduce((acc, curr) => acc + curr.value, 0);
  
  // Percent savings
  const leftover = totalMonthlyIncome - totalPredicted;
  const savingsPercent = totalMonthlyIncome > 0 ? (leftover / totalMonthlyIncome) * 100 : 0;

  // Helper to format values securely when masking is enabled
  const formatValue = (val: number): string => {
    if (hideValues) return "R$ ••••";
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  // Selected months for consolidation. If empty, defaults to only the current active month.
  const [selectedMetricMonths, setSelectedMetricMonths] = useState<string[]>([]);

  const actualMetricMonths = selectedMetricMonths.length > 0 
    ? selectedMetricMonths.filter(m => competences[m]) // Must represent actually loaded ones
    : [activeMonthYear];

  // Anual stats aggregated across selected (or current) competences
  const totalYearSpent = Object.entries(competences)
    .filter(([mName]) => actualMetricMonths.includes(mName))
    .reduce((sum, [_, m]) => {
      return sum + m.transactions.filter(t => t.excludeFromTotal !== true).reduce((acc, curr) => acc + curr.value, 0);
    }, 0);
  const totalYearEarned = Object.entries(competences)
    .filter(([mName]) => actualMetricMonths.includes(mName))
    .reduce((sum, [_, m]) => {
      const base = m.income;
      const additional = (m.additionalIncomes || []).reduce((acc, curr) => acc + curr.value, 0);
      return sum + base + additional;
    }, 0);
  const annualSavingsPercent = totalYearEarned > 0 ? ((totalYearEarned - totalYearSpent) / totalYearEarned) * 100 : 0;
  const annualSavingsRemaining = totalYearEarned - totalYearSpent;

  // Generate real-time CSV text for table 1: tb_lancamentos (revising properties, eliminating obsolete tables selector)
  const generateCSV = (trans: Transaction[]) => {
    let csv = "id;data;categoria;subcategoria;valor;status;tipo;meio_pagamento;data_pagamento\n";
    trans.forEach(t => {
      csv += `${t.id};${t.date};${t.category};${t.subcategory};${t.value.toFixed(2)};${t.status};${t.type};${t.paymentMethod || ""};${t.paymentDate || ""}\n`;
    });
    return csv;
  };

  // Generate real-time CSV text for table 2: tb_parametros_modelos
  const generateParametrosCSV = (presets: typeof categoriesConfig) => {
    let csv = "subcategoria;categoria;valor_padrao;tipo;meio_pagamento;data_pagamento\n";
    presets.forEach(p => {
      csv += `${p.subcategory};${p.category};${p.value.toFixed(2)};${p.type};${p.paymentMethod || ""};${p.paymentDate || ""}\n`;
    });
    return csv;
  };

  // Generate real-time CSV text for table 3: tb_indicadores
  const generateIndicadoresCSV = () => {
    const list = [
      { name: "Renda Mensal de Referencia", val: currentIncome, unit: "BRL", ref: activeMonthYear },
      { name: "Receitas Adicionais do Mes", val: totalAdditionalIncomeVal, unit: "BRL", ref: activeMonthYear },
      { name: "Renda Total Liquida do Mes", val: totalMonthlyIncome, unit: "BRL", ref: activeMonthYear },
      { name: "Total Previsto do Mes (Despesas)", val: totalPredicted, unit: "BRL", ref: activeMonthYear },
      { name: "Economia Liquida Estimada (Mes)", val: leftover, unit: "BRL", ref: activeMonthYear },
      { name: "Taxa de Poupança Estimada (Mes)", val: savingsPercent, unit: "PERCENT", ref: activeMonthYear },
      { name: "Total Efetivado/Pago (Mes)", val: totalPaid, unit: "BRL", ref: activeMonthYear },
      { name: "Total Pendente/Previsto (Mes)", val: totalPending, unit: "BRL", ref: activeMonthYear },
      { name: "Total de Entradas Consolidado (Periodo)", val: totalYearEarned, unit: "BRL", ref: actualMetricMonths.join(", ") },
      { name: "Total de Saidas Consolidado (Periodo)", val: totalYearSpent, unit: "BRL", ref: actualMetricMonths.join(", ") },
      { name: "Sobras Financeiras Consolidadas (Periodo)", val: annualSavingsRemaining, unit: "BRL", ref: actualMetricMonths.join(", ") },
      { name: "Media de Poupanca Consolidada (Periodo)", val: annualSavingsPercent, unit: "PERCENT", ref: actualMetricMonths.join(", ") }
    ];
    let csv = "indicador;valor;unidade;competencias_referencia\n";
    list.forEach(item => {
      csv += `${item.name};${item.val.toFixed(2)};${item.unit};${item.ref}\n`;
    });
    return csv;
  };

  // Generate real-time CSV text for table 4: tb_receitas
  const generateReceitasCSV = () => {
    let csv = "id;descricao;valor;data;tipo\n";
    // Base ref income
    csv += `base-referencia;Renda Mensal de Referência;${currentIncome.toFixed(2)};${activeMonthYear};Referência\n`;
    // Additional incomes
    const additional = currentCompetence.additionalIncomes || [];
    additional.forEach(inc => {
      csv += `${inc.id};${inc.description};${inc.value.toFixed(2)};${inc.date || ""};Adicional\n`;
    });
    return csv;
  };

  const getActiveCsvText = () => {
    if (activeExportTab === "lancamentos") {
      return generateCSV(currentTransactions);
    } else if (activeExportTab === "parametros") {
      return generateParametrosCSV(categoriesConfig);
    } else if (activeExportTab === "receitas") {
      return generateReceitasCSV();
    } else {
      return generateIndicadoresCSV();
    }
  };

  const csvText = getActiveCsvText();

  const copyCsvToClipboard = () => {
    navigator.clipboard.writeText(csvText);
    setCsvCopied(true);
    setTimeout(() => setCsvCopied(false), 2000);
  };

  // Dispatch natural language command to our full-stack Express API
  const handleSendCommand = async (commandText: string) => {
    if (!commandText.trim()) return;

    // Add user message to historical chat
    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: commandText,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistory(prev => [...prev, userMsg]);
    setChatInput("");
    setIsAiLoading(true);

    try {
      const response = await fetch("/api/process-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: commandText,
          transactions: currentTransactions,
          currentMonthYear: activeMonthYear
        })
      });

      if (!response.ok) {
        throw new Error("Falha ao se comunicar com a API do FinOps.");
      }

      const data = await response.json();

      setIsAiLoading(false);

      // Add AI assistant response
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        text: data.message,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistory(prev => [...prev, aiMsg]);

      // Update competence values
      if (data.actionPerformed === "create_month") {
        const nextMonthYear = data.targetMonthYear || `${newMonthName} ${newMonthYear}`;
        
        // Ensure new month transactions has IDs
        const cleanedTransactions = data.updatedTransactions.map((t: any, idx: number) => ({
          ...t,
          id: t.id || `ai-gen-${Date.now()}-${idx}`
        }));

        setCompetences(prev => ({
          ...prev,
          [nextMonthYear]: {
            monthYear: nextMonthYear,
            income: prev[activeMonthYear]?.income || 4000.00,
            transactions: cleanedTransactions
          }
        }));
        setActiveMonthYear(nextMonthYear);
      } else {
        // Apply transaction status/value edits or custom additions
        setCompetences(prev => ({
          ...prev,
          [activeMonthYear]: {
            ...prev[activeMonthYear],
            transactions: data.updatedTransactions
          }
        }));
      }

    } catch (err: any) {
      setIsAiLoading(false);
      setChatHistory(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: "assistant",
          text: `Desculpe, ocorreu um erro de conexão com a IA: "${err.message}". Executando heurística offline padrão para atualizar o painel.`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  const addSystemMessage = (text: string) => {
    setChatHistory(prev => [
      ...prev,
      {
        id: `sys-msg-${Date.now()}`,
        sender: "assistant",
        text: text,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Confirm standard entries quickly with buttons
  const confirmAluguelQuickly = () => {
    handleSendCommand("Confirma o pagamento de Aluguel de " + activeMonthYear.split(" ")[0]);
  };

  const confirmEnergiaQuickly = () => {
    handleSendCommand("Beleza. Confirma o pagamento da Energia.");
  };

  const adjustAlimentacaoQuickly = () => {
    handleSendCommand("O Supermercado fechou em R$ 750 este mês. Atualiza aí.");
  };

  // Toggle transaction status directly from check box
  const toggleStatusDirect = (id: string) => {
    setCompetences(prev => {
      const activeData = prev[activeMonthYear];
      const updated = activeData.transactions.map(t => {
        if (t.id === id) {
          const newStatus = t.status === "Previsto" ? "OK" : "Previsto";
          return { ...t, status: newStatus as any };
        }
        return t;
      });
      return {
        ...prev,
        [activeMonthYear]: {
          ...activeData,
          transactions: updated
        }
      };
    });
  };

  // Delete transaction physically
  const deleteTransaction = (id: string) => {
    setCompetences(prev => {
      const activeData = prev[activeMonthYear];
      const updated = activeData.transactions.filter(t => t.id !== id);
      return {
        ...prev,
        [activeMonthYear]: {
          ...activeData,
          transactions: updated
        }
      };
    });
  };

  // Manual save of edited item + sequential propagation for FIXED transactions
  const saveManualEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingTransaction) return;

    let subcatToMatch = editingTransaction.subcategory;
    let wasFixo = false;
    let isFixo = editingTransaction.type === "Fixo";

    setCompetences(prev => {
      const activeData = prev[activeMonthYear] || { transactions: [] };
      const originalTransaction = activeData.transactions.find(t => t.id === editingTransaction.id);
      
      wasFixo = originalTransaction?.type === "Fixo" || false;
      subcatToMatch = originalTransaction ? originalTransaction.subcategory : editingTransaction.subcategory;
      const targetValue = parseMonthYearValue(activeMonthYear);
      
      const updatedCompetences = { ...prev };

      Object.keys(prev).forEach(monthKey => {
        if (monthKey === activeMonthYear) {
          updatedCompetences[monthKey] = {
            ...prev[monthKey],
            transactions: prev[monthKey].transactions.map(t => t.id === editingTransaction.id ? editingTransaction : t)
          };
        } else if ((wasFixo || isFixo) && parseMonthYearValue(monthKey) > targetValue) {
          // This is a subsequent month! Adjust matching fixed expense rows as well
          updatedCompetences[monthKey] = {
            ...prev[monthKey],
            transactions: prev[monthKey].transactions.map(t => {
              if (t.subcategory === subcatToMatch) {
                return {
                  ...t,
                  value: editingTransaction.value,
                  category: editingTransaction.category,
                  subcategory: editingTransaction.subcategory,
                  type: editingTransaction.type,
                  description: editingTransaction.description,
                  sqlTable: editingTransaction.sqlTable,
                  defaultValue: editingTransaction.defaultValue,
                  useDefaultValue: editingTransaction.useDefaultValue,
                  paymentMethod: editingTransaction.paymentMethod,
                  paymentDate: editingTransaction.paymentDate,
                  excludeFromTotal: editingTransaction.excludeFromTotal
                };
              }
              return t;
            })
          };
        }
      });

      return updatedCompetences;
    });

    if (wasFixo || isFixo) {
      setCategoriesConfig(prevConfig => {
        const nextConfig = prevConfig.map(p => {
          if (p.subcategory === subcatToMatch) {
            return {
              ...p,
              value: editingTransaction.value,
              category: editingTransaction.category,
              subcategory: editingTransaction.subcategory,
              type: editingTransaction.type,
              paymentMethod: editingTransaction.paymentMethod,
              paymentDate: editingTransaction.paymentDate
            };
          }
          return p;
        });
        // We only save to local storage here, the Firebase sync will happen implicitly if needed
        localStorage.setItem("finops_categories_config", JSON.stringify(nextConfig));
        return nextConfig;
      });
    }

    setEditingTransaction(null);
  };

  const getMonthNumStr = (mName: string): string => {
    const idx = MONTHS_ORDER.findIndex(m => m.toLowerCase() === mName.toLowerCase());
    return String(idx !== -1 ? idx + 1 : 6).padStart(2, '0');
  };

  const adjustDateForMonthYear = (origDate: string, monthYearKey: string): string => {
    const parts = monthYearKey.split(" ");
    const mName = parts[0];
    const yearStr = parts[1] || "2026";
    const mNumStr = getMonthNumStr(mName);
    
    if (origDate && origDate.length === 10) {
      const dayStr = origDate.split("-")[2] || "10";
      return `${yearStr}-${mNumStr}-${dayStr}`;
    }
    return `${yearStr}-${mNumStr}-10`;
  };

  // Add extra custom item manually
  const triggerManualAdd = (event: React.FormEvent) => {
    event.preventDefault();
    
    const currDate = new Date().toISOString().split('T')[0];
    const baseTrans: Omit<Transaction, 'id' | 'date'> = {
      category: newTransCategory,
      subcategory: newTransSubcategory,
      value: parseFloat(newTransValue) || 0,
      status: newTransStatus,
      type: newTransType,
      sqlTable: "Categoria_Despesas" as any,
      description: newTransDesc || `Gasto adicionado manualmente.`,
      paymentMethod: newTransPaymentMethod,
      paymentDate: newTransPaymentDate,
      excludeFromTotal: newTransExcludeFromTotal
    };

    const parsedActiveVal = parseMonthYearValue(activeMonthYear);
    const parsedEndVal = newTransScope === 'future_with_end' ? parseMonthYearValue(newTransEndMonth) : Infinity;

    setCompetences(prev => {
      const copy = { ...prev };
      
      if (newTransScope === 'installments') {
        const count = parseInt(newTransInstallmentsCount) || 2;
        for (let i = 0; i < count; i++) {
          const targetMonthYear = getNthMonthYear(activeMonthYear, i);
          const transDate = adjustDateForMonthYear(currDate, targetMonthYear);
          const newTransId = `manual-trans-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          const isFirst = i === 0;
          
          const descStr = `${baseTrans.description} (${i + 1}/${count})`;
          
          const newTransItem: Transaction = {
            ...baseTrans,
            id: newTransId,
            date: transDate,
            description: descStr,
            paymentDate: isFirst ? newTransPaymentDate : ""
          };
          
          if (!copy[targetMonthYear]) {
            copy[targetMonthYear] = {
              monthYear: targetMonthYear,
              income: 0, // Fallback if month is totally new
              transactions: []
            };
          }
          
          copy[targetMonthYear] = {
            ...copy[targetMonthYear],
            transactions: [...copy[targetMonthYear].transactions, newTransItem]
          };
        }
      } else {
        // Go through all months matched by the scope
        Object.keys(copy).forEach(monthKey => {
          const parsedKeyVal = parseMonthYearValue(monthKey);
          
          let shouldInclude = false;
          if (monthKey === activeMonthYear) {
            shouldInclude = true;
          } else if (newTransScope === 'all_future' && parsedKeyVal > parsedActiveVal) {
            shouldInclude = true;
          } else if (newTransScope === 'future_with_end' && parsedKeyVal > parsedActiveVal && parsedKeyVal <= parsedEndVal) {
            shouldInclude = true;
          }

          if (shouldInclude) {
            const transDate = adjustDateForMonthYear(currDate, monthKey);
            const newTransId = `manual-trans-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            
            const newTransItem: Transaction = {
              ...baseTrans,
              id: newTransId,
              date: transDate,
              // Since it's a future month, maybe clear payment date unless it's currently selected month
              paymentDate: monthKey === activeMonthYear ? newTransPaymentDate : ""
            };

            copy[monthKey] = {
              ...copy[monthKey],
              transactions: [...copy[monthKey].transactions, newTransItem]
            };
          }
        });
      }
      return copy;
    });

    setShowAddModal(false);
    setNewTransDesc("");
    setNewTransValue("100.00");
    setNewTransPaymentMethod("");
    setNewTransPaymentDate("");
    setNewTransScope("vigent_only");
    setNewTransInstallmentsCount("2");
    setNewTransExcludeFromTotal(false);
  };

  // Generate competence through interactive standard modal
  const generateCompetenceManually = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanMonth = newMonthName.charAt(0).toUpperCase() + newMonthName.slice(1).toLowerCase();
    const cleanYear = newMonthYear.trim();
    const monthYearStr = `${cleanMonth} ${cleanYear}`;
    const mNumStr = getMonthNumStr(cleanMonth);
    const previousCompetence = competences[activeMonthYear];

    // Build base transactions directly from standard updated Parameter models (categoriesConfig)
    const baseTransactions = categoriesConfig.map((p, idx) => ({
      id: `preset-gen-${cleanMonth}-${cleanYear}-${idx}`,
      date: `${cleanYear}-${mNumStr}-${p.paymentDate && /^\d+$/.test(p.paymentDate) ? p.paymentDate.padStart(2, "0") : "10"}`,
      category: p.category,
      subcategory: p.subcategory,
      value: p.value,
      status: "Previsto" as const,
      type: p.type,
      sqlTable: "Categoria_Despesas" as any,
      description: `Gasto previsto para ${monthYearStr}.`,
      paymentMethod: p.paymentMethod || "",
      paymentDate: p.paymentDate || ""
    }));

    // Optionally carry forward extra unique transactions that are not part of the standard template
    let carryTransactions: Transaction[] = [];
    if (previousCompetence && previousCompetence.transactions.length > 0) {
      previousCompetence.transactions.forEach((t, idx) => {
        const inConfig = categoriesConfig.some(p => p.subcategory === t.subcategory);
        if (!inConfig) {
          const newDate = adjustDateForMonthYear(t.date, monthYearStr);
          carryTransactions.push({
            ...t,
            id: `t-carry-${Date.now()}-${idx}`,
            date: newDate,
            status: "Previsto" as const,
            paymentDate: ""
          });
        }
      });
    }

    const initialTransactions = [...baseTransactions, ...carryTransactions];

    setCompetences(prev => ({
      ...prev,
      [monthYearStr]: {
        monthYear: monthYearStr,
        income: prev[activeMonthYear]?.income || 4000.00,
        transactions: initialTransactions
      }
    }));

    setActiveMonthYear(monthYearStr);
    setShowCompetenceGenerator(false);

    // append notification to chat
    setChatHistory(prev => [
      ...prev,
      {
        id: `sys-gen-${Date.now()}`,
        sender: "assistant",
        text: `Excelência operacional! A competência de **${monthYearStr}** foi criada com base nas regras de carryover de **${activeMonthYear}**!`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleApplyThreshold = (e: React.FormEvent) => {
    e.preventDefault();
    setCompetences(prev => {
      const current = prev[activeMonthYear];
      return {
        ...prev,
        [activeMonthYear]: {
          ...current,
          income: monthlyIncomeInput
        }
      };
    });
    setShowConfigModal(false);
  };

  const handleAddAdditionalIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncomeDesc.trim()) return;
    const valNumerico = parseFloat(newIncomeVal) || 0;
    if (valNumerico <= 0) return;

    setCompetences(prev => {
      const current = prev[activeMonthYear] || {
        monthYear: activeMonthYear,
        income: 4000.00,
        transactions: []
      };
      const currentAdditional = current.additionalIncomes || [];
      const newItem = {
        id: `income-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        description: newIncomeDesc.trim(),
        value: valNumerico,
        date: newIncomeDate || new Date().toISOString().split('T')[0]
      };
      return {
        ...prev,
        [activeMonthYear]: {
          ...current,
          additionalIncomes: [...currentAdditional, newItem]
        }
      };
    });
    
    setNewIncomeDesc("");
    setNewIncomeVal("500.00");
    setNewIncomeDate("");
  };

  const handleDeleteAdditionalIncome = (id: string) => {
    setCompetences(prev => {
      const current = prev[activeMonthYear];
      if (!current) return prev;
      const currentAdditional = current.additionalIncomes || [];
      return {
        ...prev,
        [activeMonthYear]: {
          ...current,
          additionalIncomes: currentAdditional.filter(inc => inc.id !== id)
        }
      };
    });
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] font-sans antialiased overflow-x-hidden">
      
      {/* Visual Header */}
      <header className="border-b border-[#334155] bg-[#1e293b]/70 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-400 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Database className="h-5 w-5 text-slate-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-slate-100">
                  BDFin v1
                </span>
                <span className="text-[10px] bg-sky-500/10 text-sky-400 font-bold px-2 py-0.5 rounded border border-sky-500/20 uppercase tracking-widest hidden sm:inline-block animate-pulse">
                  Assistente Pessoal Financeiro
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono tracking-tight hidden sm:block">
                Planejamento, Controle e Previsão
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 justify-between sm:justify-end flex-wrap sm:flex-nowrap">
            <div className="flex flex-col gap-2 items-stretch sm:items-end w-full sm:w-auto">
              <div className="flex items-center gap-2 text-sm bg-slate-950/60 p-1.5 px-3 rounded-lg border border-[#334155] justify-between sm:justify-start">
                <span className="text-slate-400 font-medium">Competência:</span>
                <select 
                  value={activeMonthYear} 
                  onChange={(e) => {
                    setActiveMonthYear(e.target.value);
                    setMonthlyIncomeInput(competences[e.target.value]?.income || 4000.00);
                  }}
                  className="bg-transparent text-sky-400 font-bold outline-none cursor-pointer focus:ring-1 focus:ring-sky-500 rounded border-none py-0.5 pr-8 pl-1 text-xs"
                >
                  {Object.keys(competences).map((month) => (
                    <option key={month} value={month} className="bg-slate-900 text-[#f8fafc] font-medium">
                      {month}
                    </option>
                  ))}
                </select>
                {Object.keys(competences).length > 1 && (
                  <button
                    onClick={() => {
                      if (confirmStateKey === activeMonthYear) {
                        const remainingKeys = Object.keys(competences).filter(k => k !== activeMonthYear);
                        setCompetences(prev => {
                          const copy = { ...prev };
                          delete copy[activeMonthYear];
                          return copy;
                        });
                        setActiveMonthYear(remainingKeys[0]);
                        setConfirmStateKey(null);
                        setChatHistory(prev => [
                          ...prev,
                          {
                            id: `sys-del-${Date.now()}`,
                            sender: "assistant",
                            text: `A competência de **${activeMonthYear}** foi removida.`,
                            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                          }
                        ]);
                      } else {
                        setConfirmStateKey(activeMonthYear);
                        setTimeout(() => setConfirmStateKey(null), 3500);
                      }
                    }}
                    className={`ml-2 text-rose-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors flex items-center gap-1 font-semibold text-[10px] uppercase font-mono`}
                    title="Excluir esta competência"
                  >
                    <Trash className="h-3.5 w-3.5 text-rose-400" />
                    <span>{confirmStateKey === activeMonthYear ? "Confirmar?" : "Excluir"}</span>
                  </button>
                )}
              </div>

              {/* Micro-toggles block (Indicated rectangles on the user reference image) */}
              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setShowAiAssistant(!showAiAssistant)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all focus:outline-none cursor-pointer select-none active:scale-95 ${
                    showAiAssistant 
                      ? "bg-sky-500/10 text-sky-400 border-sky-400/40 hover:bg-sky-500/20" 
                      : "bg-[#1e293b]/60 text-slate-500 border-[#334155]"
                  }`}
                  title={showAiAssistant ? "Minimizar Chatbot AI" : "Exibir Chatbot AI"}
                >
                  <Sparkles className={`h-3 w-3 ${showAiAssistant ? "text-sky-400 animate-pulse" : "text-slate-500"}`} />
                  <span>Chatbot AI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBackupDrive(!showBackupDrive)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all focus:outline-none cursor-pointer select-none active:scale-95 ${
                    showBackupDrive 
                      ? "bg-sky-500/10 text-sky-400 border-sky-400/40 hover:bg-sky-500/20" 
                      : "bg-[#1e293b]/60 text-slate-500 border-[#334155]"
                  }`}
                  title={showBackupDrive ? "Minimizar Backup & Drive" : "Exibir Backup & Drive"}
                >
                  <Database className={`h-3 w-3 ${showBackupDrive ? "text-sky-455" : "text-slate-500"}`} />
                  <span>Backup & Drive</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
              {/* Firebase Cloud Sync Control */}
              <div id="db-cloud-sync" className="flex items-center gap-2">
                {isDbLoading ? (
                  <button
                    disabled
                    className="bg-[#1e293b]/80 border border-[#334155] text-slate-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2 font-mono"
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
                    <span className="hidden sm:inline text-[10px]">Conectando...</span>
                  </button>
                ) : currentUser ? (
                  <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 pr-2.5 pl-1.5 rounded-lg border border-[#334155] text-xs h-9">
                    <div className="relative">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          referrerPolicy="no-referrer"
                          alt="Google Avatar"
                          className="h-5 w-5 rounded-full border border-sky-400/30"
                        />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-[#334155] flex items-center justify-center text-[10px] font-bold text-sky-400">
                          <User className="h-3 w-3" />
                        </div>
                      )}
                      <span className={`absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-slate-950 ${isSyncing ? "bg-amber-400 animate-ping" : "bg-emerald-500"}`} />
                    </div>
                    
                    <div className="flex flex-col leading-tight select-none">
                      <span className="text-[9px] font-bold text-slate-200 max-w-[65px] truncate">
                        {currentUser.displayName?.split(" ")[0] || currentUser.email?.split("@")[0] || "Usuário"}
                      </span>
                      <span className="text-[8px] text-emerald-400 font-mono font-medium flex items-center gap-0.5">
                        {isSyncing ? (
                          <>
                            <Loader2 className="h-1.5 w-1.5 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Cloud className="h-1.5 w-1.5" />
                            Nuvem OK
                          </>
                        )}
                      </span>
                    </div>

                    <button
                      onClick={handleSignOut}
                      className="ml-2 text-[8px] font-bold uppercase hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 px-1.5 py-0.5 rounded transition-all focus:outline-none flex items-center justify-center border border-slate-800"
                      title="Sair da Conta Google"
                    >
                      <span>Sair</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGoogleSignIn}
                    className="bg-slate-950 hover:bg-[#334155]/30 text-[#f8fafc] hover:text-sky-400 active:scale-95 transition-all text-[11px] font-bold px-2.5 py-2 rounded-lg border border-[#334155] flex items-center gap-1 focus:outline-none shadow-md shadow-slate-950/50"
                    title="Conectar com o Google para salvar dados"
                  >
                    <LogIn className="h-3 w-3 text-sky-400 animate-pulse" />
                    <span>Salvar Nuvem</span>
                  </button>
                )}
              </div>

              <button 
                id="btn-crypt-top"
                onClick={() => setHideValues(!hideValues)}
                className={`active:scale-95 transition-all text-xs font-bold px-4 py-2.5 rounded-lg border flex items-center gap-1.5 focus:outline-none ${
                  hideValues 
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-lg shadow-amber-500/5 font-black" 
                    : "bg-[#334155] text-slate-300 border-[#475569] hover:text-white"
                }`}
                title={hideValues ? "Mostrar valores" : "Ocultar/Criptografar valores"}
              >
                {hideValues ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-amber-500 animate-pulse" />}
                <span>R$ Cripto</span>
              </button>
              <button 
                id="btn-config"
                onClick={() => {
                  setMonthlyIncomeInput(currentIncome);
                  setShowConfigModal(true);
                }}
                className="bg-[#334155] text-[#f8fafc] hover:bg-[#334155]/80 active:scale-95 transition-all text-xs font-semibold px-4 py-2.5 rounded-lg border border-[#475569] flex items-center gap-1.5 focus:outline-none"
              >
                <Sliders className="h-3.5 w-3.5 text-sky-400" />
                <span className="hidden md:inline">Configurações</span>
              </button>
              <button 
                id="btn-generate-month"
                onClick={() => {
                  setNewMonthName("Julho");
                  setNewMonthYear("2026");
                  setShowCompetenceGenerator(true);
                }}
                className="bg-sky-400 text-[#0f172a] hover:bg-sky-300 active:scale-95 transition-all text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 focus:outline-none shadow-md shadow-sky-400/10"
              >
                <Plus className="h-3.5 w-3.5 font-bold" />
                <span>Competência</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Structural Layout Grid */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        
        {/* Connection/Sync Error Notification Banner */}
        {dbError && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 animate-fade-in z-30">
            <div className="flex items-center gap-2">
              <CloudOff className="h-4 w-4 animate-bounce shrink-0 text-rose-400" />
              <span>{dbError}</span>
            </div>
            <button 
              onClick={() => setDbError(null)}
              className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        
        {/* KPI metrics row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#1e293b] p-4 rounded-xl border border-[#334155] shadow-md flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Calendar className="h-12 w-12 text-slate-400" />
            </div>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Previsto Total</span>
            <span className="text-xl sm:text-2xl font-black text-[#f8fafc]">
              {formatValue(totalPredicted)}
            </span>
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
              <span>Limiares / Custos</span>
            </div>
          </div>

          <div className="bg-[#1e293b] p-4 rounded-xl border border-[#334155] shadow-md flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-12 w-12 text-emerald-400" />
            </div>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Pago (Efetivado)</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400">
              {formatValue(totalPaid)}
            </span>
            <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-500/80">
              <Check className="h-3 w-3" />
              <span>
                {currentTransactions.length > 0 
                  ? `${currentTransactions.filter(t => isTransactionPaid(t)).length} de ${currentTransactions.length} pagos` 
                  : "Nenhum gasto"
                }
              </span>
            </div>
          </div>

          <div className="bg-[#1e293b] p-4 rounded-xl border border-[#334155] shadow-md flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Clock className="h-12 w-12 text-amber-400" />
            </div>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Pendente</span>
            <span className="text-xl sm:text-2xl font-black text-amber-400">
              {formatValue(totalPending)}
            </span>
            <div className="flex items-center gap-1 text-[11px] font-mono text-amber-500/80">
              <span>Aguardando exceções</span>
            </div>
          </div>

          <div className="bg-[#1e293b] p-4 rounded-xl border border-[#334155] shadow-md flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-12 w-12 text-sky-400" />
            </div>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Economia Estimada</span>
            <span className={`text-xl sm:text-2xl font-black ${savingsPercent < 0 ? 'text-red-400' : 'text-sky-400'}`}>
              {savingsPercent.toFixed(1)}%
            </span>
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
              <span>Sobra: {formatValue(leftover)}</span>
            </div>
          </div>
        </section>

        {/* Métricas Consolidadas (Full width) */}
        <div className="bg-[#1e293b] p-5 rounded-2xl border border-[#334155] shadow-md space-y-4">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between border-b border-[#334155]/60 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-sky-400" />
                Métricas Consolidadas de Programação e Previsibilidade
              </h3>
              <p className="text-[10px] text-slate-400 leading-tight">
                Acumulado histórico obtido agregando exclusivamente as competências selecionadas.
              </p>
            </div>
          </div>

          {/* Selection filter */}
          <div className="bg-slate-950/35 p-2.5 rounded-xl border border-[#334155]/50 flex flex-wrap items-center gap-3">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase mr-1 select-none font-mono">Meses Ativos para Consolidar:</span>
            <div className="flex flex-wrap gap-1.5 flex-1 max-h-[85px] overflow-y-auto pr-1">
              {Object.keys(competences).map((mKey) => {
                const checkDefault = selectedMetricMonths.length === 0 ? mKey === activeMonthYear : selectedMetricMonths.includes(mKey);
                return (
                  <button
                    key={mKey}
                    type="button"
                    onClick={() => {
                      const currentSelected = selectedMetricMonths.length === 0 ? [activeMonthYear] : [...selectedMetricMonths];
                      if (currentSelected.includes(mKey)) {
                        if (currentSelected.length > 1) {
                          setSelectedMetricMonths(currentSelected.filter(x => x !== mKey));
                        }
                      } else {
                        setSelectedMetricMonths([...currentSelected, mKey]);
                      }
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all flex items-center gap-1.5 focus:outline-none cursor-pointer ${
                      checkDefault
                        ? "bg-sky-500/10 text-sky-400 border-sky-400/40"
                        : "bg-[#1e293b]/60 text-slate-500 border-[#334155] hover:text-slate-300"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${checkDefault ? "bg-sky-400" : "bg-slate-700"}`} />
                    {mKey}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-1.5 shrink-0 ml-auto pt-1 sm:pt-0">
              <button
                onClick={() => setSelectedMetricMonths([activeMonthYear])}
                className="text-[9px] text-[#f8fafc] bg-slate-800 hover:bg-slate-700 font-bold px-2.5 py-1 rounded transition-all focus:outline-none border border-[#334155] cursor-pointer"
              >
                Mês Atual
              </button>
              <button
                onClick={() => setSelectedMetricMonths(Object.keys(competences))}
                className="text-[9px] text-sky-400 bg-slate-800/80 hover:bg-slate-700 font-bold px-2.5 py-1 rounded transition-all focus:outline-none border border-[#334155] cursor-pointer"
              >
                Consolidar Tudo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-2.5 bg-slate-950/20 border border-[#334155]/40 rounded-xl">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold mb-0.5">Acumulado Receitas</span>
              <span className="text-sm font-black text-[#f8fafc] block">
                {formatValue(totalYearEarned)}
              </span>
            </div>
            
            <div className="p-2.5 bg-slate-950/20 border border-[#334155]/40 rounded-xl">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold mb-0.5">Somas de Gastos</span>
              <span className="text-sm font-black text-rose-450 block">
                {formatValue(totalYearSpent)}
              </span>
            </div>

            <div className="p-2.5 bg-slate-950/20 border border-[#334155]/40 rounded-xl">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold mb-0.5">Gastos / Rendas</span>
              <span className="text-sm font-black text-amber-400 block">
                {hideValues ? "•••%" : `${((totalYearSpent / (totalYearEarned || 1)) * 100).toFixed(1)}%`}
              </span>
            </div>

            <div className="p-2.5 bg-slate-950/30 border border-[#334155]/40 rounded-xl">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold mb-0.5">Saldo Líquido</span>
              <span className={`text-sm font-black block ${annualSavingsRemaining >= 0 ? 'text-sky-400' : 'text-red-400'}`}>
                {formatValue(annualSavingsRemaining)}
              </span>
              <span className="text-[8px] block font-mono text-slate-500 mt-0.5 leading-none">
                {hideValues ? "(••• Poupado)" : `(${annualSavingsPercent.toFixed(1)}% Poupado)`}
              </span>
            </div>
          </div>
        </div>

        {/* Console de Detalhamento DBFin (Full width block) */}
        <div className="space-y-6 flex flex-col w-full">
          <div className="bg-[#1e293b] rounded-2xl border border-[#334155] shadow-md overflow-hidden flex flex-col flex-1">
              
              {/* Table Toolbar Header */}
              <div className="p-4 border-b border-[#334155] bg-[#1e293b]/50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-sm tracking-tight text-[#f8fafc] flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-sky-400" />
                    Detalhamento DBFin
                  </h3>
                  <p className="text-slate-400 text-[11px] leading-tight">
                    Previsibilidade para a competência de <span className="text-sky-400 font-bold">{activeMonthYear}</span>
                  </p>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Toggle Exibição Categoria */}
                  <button
                    onClick={() => setShowCategories(!showCategories)}
                    className={`p-1.5 px-2.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all focus:outline-none ${
                      showCategories 
                        ? "bg-[#334155] text-sky-400 border-[#475569]" 
                        : "bg-slate-950/80 text-slate-500 border-[#334155]"
                    }`}
                    title={showCategories ? "Ocultar coluna de categorias" : "Exibir coluna de categorias"}
                  >
                    <Tag className="h-3 w-3" />
                    <span>Categoria</span>
                  </button>

                  {/* Toggle Meio de Pagamento */}
                  <button
                    onClick={() => setShowPaymentMethod(!showPaymentMethod)}
                    className={`p-1.5 px-2.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all focus:outline-none ${
                      showPaymentMethod 
                        ? "bg-[#334155] text-sky-400 border-[#475569]" 
                        : "bg-slate-950/80 text-slate-500 border-[#334155]"
                    }`}
                    title="Ocultar ou Mostrar Coluna de Meio de Pagamento"
                  >
                    <Wallet className="h-3 w-3" />
                    <span>Meio Pagto</span>
                  </button>

                  {/* Toggle Tipo */}
                  <button
                    onClick={() => setShowType(!showType)}
                    className={`p-1.5 px-2.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all focus:outline-none ${
                      showType 
                        ? "bg-[#334155] text-sky-400 border-[#475569]" 
                        : "bg-slate-950/80 text-slate-500 border-[#334155]"
                    }`}
                    title="Ocultar ou Mostrar Coluna de Tipo"
                  >
                    <Sliders className="h-3 w-3" />
                    <span>Tipo</span>
                  </button>

                  {/* Toggle Assistente AI
                  <button
                    onClick={() => setShowAiAssistant(!showAiAssistant)}
                    className={`p-1.5 px-2.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all focus:outline-none ${
                      showAiAssistant 
                        ? "bg-[#334155] text-sky-400 border-[#475569]" 
                        : "bg-slate-950/80 text-slate-500 border-[#334155]"
                    }`}
                    title="Ocupar ou Exibir bloco de assistente chatbot"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Chatbot AI</span>
                  </button>
                  */}

                  {/* Toggle Criptografia / Mascara de valor */}
                  <button
                    onClick={() => setHideValues(!hideValues)}
                    className={`p-1.5 px-2.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all focus:outline-none ${
                      hideValues 
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                        : "bg-[#334155] text-slate-300 border-[#475569]"
                    }`}
                    title={hideValues ? "Mostrar valores" : "Ocultar/Criptografar valores"}
                  >
                    {hideValues ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    <span>R$ Cripto</span>
                  </button>

                  <button
                    id="btn-add-extra"
                    onClick={() => {
                      setNewTransDesc("");
                      setNewTransCategory("Estilo de Vida");
                      setNewTransSubcategory("Gasto Extra");
                      setNewTransValue("150.00");
                      setNewTransStatus("OK");
                      setNewTransType("Variável");
                      setNewTransSqlTable("Categoria_Despesas");
                      setNewTransPaymentMethod("");
                      setNewTransPaymentDate("");
                      setShowAddModal(true);
                    }}
                    className="bg-sky-400 hover:bg-sky-300 text-[#0f172a] text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Novo Gasto</span>
                  </button>
                </div>
              </div>

              {/* Workspace Split Tabs */}
              <div className="flex border-b border-[#334155] bg-slate-950/20">
                <button
                  onClick={() => setActiveWorkspaceTab("lançamentos")}
                  className={`flex-1 py-2.5 text-[11px] font-extrabold uppercase tracking-widest transition-colors border-b-2 flex items-center justify-center gap-2 ${
                    activeWorkspaceTab === "lançamentos"
                      ? "text-sky-400 border-sky-400 bg-sky-500/5"
                      : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/10"
                  }`}
                >
                  <Database className="h-3.5 w-3.5" />
                  Lançamentos do Mês
                </button>
                <button
                  onClick={() => setActiveWorkspaceTab("receitas")}
                  className={`flex-1 py-2.5 text-[11px] font-extrabold uppercase tracking-widest transition-colors border-b-2 flex items-center justify-center gap-2 ${
                    activeWorkspaceTab === "receitas"
                      ? "text-emerald-400 border-emerald-400 bg-emerald-500/5"
                      : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/10"
                  }`}
                >
                  <Coins className="h-3.5 w-3.5 text-emerald-400" />
                  Receitas & Entradas
                </button>
                <button
                  onClick={() => setActiveWorkspaceTab("parâmetros")}
                  className={`flex-1 py-2.5 text-[11px] font-extrabold uppercase tracking-widest transition-colors border-b-2 flex items-center justify-center gap-2 ${
                    activeWorkspaceTab === "parâmetros"
                      ? "text-sky-400 border-sky-400 bg-sky-500/5"
                      : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/10"
                  }`}
                >
                  <Sliders className="h-3.5 w-3.5" />
                  Parâmetros de Modelos
                </button>
              </div>

              {/* Conditional Workspace Tabs Content renderer */}
              {activeWorkspaceTab === "parâmetros" ? (
                <div className="p-4 space-y-4 text-[#f8fafc]">
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-[#334155] space-y-3">
                    <h4 className="text-xs font-black uppercase text-sky-400 tracking-wider flex items-center gap-1.5">
                      <Plus className="h-4 w-4" />
                      Novo Modelo de Gasto Padrão (Parameters)
                    </h4>
                    
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newParameterSubcat.trim()) return;
                        const newItem = {
                          subcategory: newParameterSubcat.trim(),
                          category: newParameterCat,
                          value: parseFloat(newParameterVal) || 0,
                          type: newParameterType,
                          sqlTable: "Categoria_Despesas" as any,
                          paymentMethod: newParameterPaymentMethod,
                          paymentDate: newParameterPaymentDate
                        };
                        updateCategoriesConfigAndSync([...categoriesConfig, newItem]);
                        setNewParameterSubcat("");
                        setNewParameterVal("100.00");
                        setNewParameterPaymentMethod("");
                        setNewParameterPaymentDate("");
                      }} 
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div className="space-y-1 col-span-1">
                          <label className="text-[10px] text-slate-400 font-bold block uppercase">Subcategoria / Nome Especial</label>
                          <input
                            type="text"
                            required
                            value={newParameterSubcat}
                            onChange={(e) => setNewParameterSubcat(e.target.value)}
                            placeholder="Ex: Aluguel, Luz..."
                            className="w-full bg-slate-950 border border-[#334155] rounded p-1.5 px-2.5 text-xs text-[#f8fafc] focus:ring-1 focus:ring-sky-500 outline-none font-medium"
                          />
                        </div>

                        <div className="space-y-1 col-span-1">
                          <label className="text-[10px] text-slate-400 font-bold block uppercase">Categoria</label>
                          <select
                            value={newParameterCat}
                            onChange={(e) => setNewParameterCat(e.target.value)}
                            className="w-full bg-slate-950 border border-[#334155] rounded p-1.5 text-xs text-[#f8fafc] outline-none cursor-pointer font-medium"
                          >
                            <option>Habitacao & Familia</option>
                            <option>Obrigacoes & Negocios</option>
                            <option>Transporte</option>
                            <option>Saude & Bem-Estar</option>
                            <option>Estilo de Vida</option>
                            <option>Telecomunicacoes</option>
                            <option>Financas & Credito</option>
                          </select>
                        </div>

                        <div className="space-y-1 col-span-1">
                          <label className="text-[10px] text-slate-400 font-bold block uppercase">Valor Padrão Inicial (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={newParameterVal}
                            onChange={(e) => setNewParameterVal(e.target.value)}
                            className="w-full bg-slate-950 border border-[#334155] rounded p-1.5 px-2 text-xs text-[#f8fafc] font-mono outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-left">
                        <div className="space-y-1 col-span-1">
                          <label className="text-[10px] text-slate-400 font-bold block uppercase">Periodicidade</label>
                          <select
                            value={newParameterType}
                            onChange={(e) => setNewParameterType(e.target.value as any)}
                            className="w-full bg-slate-950 border border-[#334155] rounded p-1.5 text-xs text-[#f8fafc] outline-none font-medium"
                          >
                            <option value="Fixo">Fixo</option>
                            <option value="Variável">Variável</option>
                          </select>
                        </div>

                        <div className="space-y-1 col-span-1">
                          <label className="text-[10px] text-slate-400 font-bold block uppercase">Meio de Pagamento</label>
                          <select
                            value={newParameterPaymentMethod}
                            onChange={(e) => setNewParameterPaymentMethod(e.target.value as any)}
                            className="w-full bg-slate-950 border border-[#334155] rounded p-1.5 text-xs text-[#f8fafc] outline-none text-slate-300"
                          >
                            <option value="">Nenhum</option>
                            <option value="Pix">Pix</option>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="Crédito">Crédito</option>
                            <option value="Débito">Débito</option>
                            <option value="Boleto">Boleto</option>
                          </select>
                        </div>

                        <div className="space-y-1 col-span-1">
                          <label className="text-[10px] text-slate-400 font-bold block uppercase">Data de Pagamento</label>
                          <input
                            type="text"
                            value={newParameterPaymentDate}
                            onChange={(e) => setNewParameterPaymentDate(e.target.value)}
                            placeholder="Dia ou data (ex: 10)"
                            className="w-full bg-slate-950 border border-[#334155] rounded p-1.5 px-2.5 text-xs text-[#f8fafc] focus:ring-1 focus:ring-sky-500 outline-none font-mono"
                          />
                        </div>

                        <div className="col-span-1">
                          <button
                            type="submit"
                            className="w-full bg-sky-400 hover:bg-sky-300 text-[#0f172a] rounded-lg text-xs font-black p-1.5 transition-all h-[34px]"
                          >
                            Adicionar Modelo
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Parameter presets list */}
                  <div className="overflow-x-auto rounded-xl border border-[#334155] scrollbar-thin scrollbar-thumb-slate-700 bg-slate-900/30">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-[#334155] font-mono text-[10px] text-slate-400 uppercase tracking-widest">
                          <th className="p-3 pl-4">Subcategoria / Nome</th>
                          <th className="p-3">Categoria</th>
                          <th className="p-3">Valor Padrão</th>
                          <th className="p-3">Tipo</th>
                          <th className="p-3">Meio Pagto</th>
                          <th className="p-3">Data Pagto</th>
                          <th className="p-3 text-center">Remover</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#334155]/50 text-xs">
                        {categoriesConfig.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-500 font-mono text-[11px]">
                              Nenhum parâmetro pré-estabelecido cadastrado. Adicione acima.
                            </td>
                          </tr>
                        ) : (
                          categoriesConfig.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                              <td className="p-3 pl-4 font-bold text-slate-100">
                                <input
                                  type="text"
                                  value={item.subcategory}
                                  onChange={(e) => handleRenameSubcategory(idx, e.target.value)}
                                  className="bg-transparent border-b border-transparent hover:border-slate-600 focus:border-sky-500 outline-none w-full"
                                />
                              </td>
                              <td className="p-3 text-slate-300">
                                <select
                                  value={item.category}
                                  onChange={(e) => {
                                    const next = [...categoriesConfig];
                                    next[idx].category = e.target.value;
                                    updateCategoriesConfigAndSync(next);
                                  }}
                                  className="bg-transparent outline-none cursor-pointer focus:ring-1 focus:ring-sky-500 rounded border-none p-1 bg-slate-900 text-[11px]"
                                >
                                  <option>Habitacao & Familia</option>
                                  <option>Obrigacoes & Negocios</option>
                                  <option>Transporte</option>
                                  <option>Saude & Bem-Estar</option>
                                  <option>Estilo de Vida</option>
                                  <option>Telecomunicacoes</option>
                                  <option>Financas & Credito</option>
                                </select>
                              </td>
                              <td className="p-3 font-mono font-bold text-sky-400">
                                <span className="mr-1 text-slate-500">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.value}
                                  onChange={(e) => {
                                    const next = [...categoriesConfig];
                                    next[idx].value = parseFloat(e.target.value) || 0;
                                    updateCategoriesConfigAndSync(next);
                                  }}
                                  className="bg-transparent border-b border-transparent hover:border-slate-600 focus:border-sky-500 outline-none w-16 ml-1 font-mono font-bold text-sky-400"
                                />
                              </td>
                              <td className="p-3">
                                <select
                                  value={item.type}
                                  onChange={(e) => {
                                    const next = [...categoriesConfig];
                                    next[idx].type = e.target.value as any;
                                    updateCategoriesConfigAndSync(next);
                                  }}
                                  className={`bg-transparent outline-none cursor-pointer p-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                                    item.type === "Fixo" ? "text-cyan-400" : "text-amber-400"
                                  }`}
                                >
                                  <option value="Fixo" className="bg-slate-900 text-cyan-400">Fixo</option>
                                  <option value="Variável" className="bg-slate-900 text-amber-400">Variável</option>
                                </select>
                              </td>
                              <td className="p-3 font-mono text-[10px] text-slate-400">
                                <select
                                  value={item.paymentMethod || ""}
                                  onChange={(e) => {
                                    const next = [...categoriesConfig];
                                    next[idx].paymentMethod = e.target.value as any;
                                    updateCategoriesConfigAndSync(next);
                                  }}
                                  className="bg-transparent border-b border-transparent hover:border-slate-600 focus:border-sky-500 outline-none text-slate-300 bg-slate-900 rounded p-1 text-[11px]"
                                >
                                  <option value="">Nenhum</option>
                                  <option value="Pix">Pix</option>
                                  <option value="Dinheiro">Dinheiro</option>
                                  <option value="Crédito">Crédito</option>
                                  <option value="Débito">Débito</option>
                                  <option value="Boleto">Boleto</option>
                                </select>
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={item.paymentDate || ""}
                                  placeholder="Dia ou data"
                                  onChange={(e) => {
                                    const next = [...categoriesConfig];
                                    next[idx].paymentDate = e.target.value;
                                    updateCategoriesConfigAndSync(next);
                                  }}
                                  className="bg-transparent border-b border-transparent hover:border-slate-600 focus:border-sky-500 outline-none w-20 font-mono text-[11px] text-slate-300"
                                />
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateCategoriesConfigAndSync(categoriesConfig.filter((_, i) => i !== idx));
                                  }}
                                  className="text-rose-400 hover:text-rose-300 font-semibold p-1 hover:bg-rose-500/10 rounded transition-all inline-flex items-center justify-center"
                                >
                                  <Trash className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : activeWorkspaceTab === "receitas" ? (
                <div className="p-4 space-y-4 text-[#f8fafc]">
                  {/* Overview Grid showing base / reference income + additional + total consolidated income */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* Base Income block */}
                    <div className="bg-slate-900/60 p-4 rounded-xl border border-[#334155] flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Renda Mensal de Referência</span>
                        <p className="text-[9.5px] text-slate-500 mt-0.5 leading-tight">Configurada como o salário ou retirada padrão fixa cadastrada para este mês.</p>
                      </div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-xl font-mono font-black text-slate-200">{formatValue(currentIncome)}</span>
                        <button
                          onClick={() => {
                            setMonthlyIncomeInput(currentIncome);
                            setShowConfigModal(true);
                          }}
                          className="text-[10px] uppercase font-bold text-sky-400 hover:text-sky-300 hover:underline transition-all"
                        >
                          Alterar R$
                        </button>
                      </div>
                    </div>

                    {/* Additional Incomes Summary block */}
                    <div className="bg-slate-900/60 p-4 rounded-xl border border-[#334155] flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Receitas Adicionais</span>
                        <p className="text-[9.5px] text-slate-500 mt-0.5 leading-tight">Soma de bônus, serviços extras, vendas de produtos ou outras entradas no mês.</p>
                      </div>
                      <div className="mt-3">
                        <span className="text-xl font-mono font-black text-emerald-400">+{formatValue(totalAdditionalIncomeVal)}</span>
                      </div>
                    </div>

                    {/* Total Net Consolidated Income block */}
                    <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/20 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">Renda Total Líquida</span>
                        <p className="text-[9.5px] text-emerald-600/80 mt-0.5 leading-tight">A soma total das entradas disponíveis para fazer frente às despesas.</p>
                      </div>
                      <div className="mt-3">
                        <span className="text-2xl font-mono font-black text-emerald-400">{formatValue(totalMonthlyIncome)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Two columns: Left: add income form, Right: list of additional incomes */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Form block */}
                    <div className="lg:col-span-5 bg-slate-900/40 p-4 rounded-xl border border-[#334155] h-fit">
                      <h4 className="text-xs font-black uppercase text-sky-400 tracking-wider flex items-center gap-1.5 mb-3">
                        <TrendingUp className="h-4 w-4" />
                        Lançar Receita Adicional
                      </h4>
                      <form onSubmit={handleAddAdditionalIncome} className="space-y-3.5">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 block font-bold">Descrição da Receita</label>
                          <input 
                            type="text"
                            required
                            value={newIncomeDesc}
                            onChange={(e) => setNewIncomeDesc(e.target.value)}
                            className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] focus:ring-1 focus:ring-sky-500 focus:outline-none"
                            placeholder="Ex: Trabalho Freelancer, Venda de Monitor, PIX recebido..."
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 block font-bold">Valor (R$)</label>
                            <input 
                              type="number"
                              required
                              step="0.01"
                              value={newIncomeVal}
                              onChange={(e) => setNewIncomeVal(e.target.value)}
                              className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] font-bold font-mono focus:ring-1 focus:ring-sky-500 focus:outline-none"
                              placeholder="500.00"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 block font-bold font-sans">Data de Entrada</label>
                            <input 
                              type="text"
                              value={newIncomeDate}
                              onChange={(e) => setNewIncomeDate(e.target.value)}
                              className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] font-mono focus:ring-1 focus:ring-sky-500 focus:outline-none"
                              placeholder="Ex: 2026-06-15"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black py-2 rounded-lg flex items-center justify-center gap-1 transition-all"
                        >
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span>Adicionar à Renda</span>
                        </button>
                      </form>
                    </div>

                    {/* Listing block */}
                    <div className="lg:col-span-7 bg-slate-900/40 p-4 rounded-xl border border-[#334155] flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5 mb-3">
                          <Coins className="h-4 w-4 text-emerald-400" />
                          Receitas Adicionais Registradas
                        </h4>

                        {currentAdditionalIncomes.length === 0 ? (
                          <div className="p-8 text-center text-slate-500 border border-dashed border-[#334155] rounded-xl flex flex-col items-center justify-center gap-2">
                            <Coins className="h-8 w-8 text-slate-600 stroke-1" />
                            <p className="text-xs font-medium">Nenhuma receita adicional cadastrada para {activeMonthYear}.</p>
                            <p className="text-[10px] max-w-[280px]">Utilize o painel ao lado para registrar entradas pontuais além do salário referência.</p>
                          </div>
                        ) : (
                          <div className="border border-[#334155] rounded-xl overflow-hidden bg-slate-950/40 divide-y divide-[#334155]/60">
                            {currentAdditionalIncomes.map((inc) => (
                              <div key={inc.id} className="flex items-center justify-between p-3 hover:bg-slate-900/20 transition-all font-sans">
                                <div>
                                  <div className="text-xs font-bold text-[#f8fafc]">{inc.description}</div>
                                  <div className="text-[9.5px] text-slate-500 font-mono mt-0.5">{inc.date}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-mono font-bold text-emerald-400">+{formatValue(inc.value)}</span>
                                  <button
                                    onClick={() => handleDeleteAdditionalIncome(inc.id)}
                                    className="p-1 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded transition-all"
                                    title="Remover receita adicional"
                                  >
                                    <Trash className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {currentAdditionalIncomes.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-[#334155] flex items-center justify-between text-xs select-none">
                          <span className="text-[11px] text-slate-400 font-mono">
                            {currentAdditionalIncomes.length} receita{currentAdditionalIncomes.length > 1 ? 's' : ''} adicional{currentAdditionalIncomes.length > 1 ? 'is' : ''}
                          </span>
                          <span className="font-mono font-bold text-emerald-400 bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/10">
                            Total Adicional: {formatValue(totalAdditionalIncomeVal)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Actual Table Component container */
                <div className="flex-1 overflow-x-auto min-h-[300px] scrollbar-thin scrollbar-thumb-slate-700">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-[#334155]">
                        <th className="py-2.5 px-4 text-[10px] text-slate-400 font-black uppercase tracking-wider w-[10%]">Status</th>
                        <th className="py-2.5 px-4 text-[10px] text-slate-400 font-black uppercase tracking-wider w-[22%]">Lançamento</th>
                        {showCategories && (
                          <th className="py-2.5 px-4 text-[10px] text-slate-400 font-black uppercase tracking-wider w-[18%]">Categoria</th>
                        )}
                        <th className="py-2.5 px-4 text-[10px] text-slate-400 font-black uppercase tracking-wider w-[14%]">Valor</th>
                        {showType && (
                          <th className="py-2.5 px-4 text-[10px] text-slate-400 font-black uppercase tracking-wider w-[10%]">Tipo</th>
                        )}
                        {showPaymentMethod && (
                          <th className="py-2.5 px-4 text-[10px] text-slate-400 font-black uppercase tracking-wider w-[14%]">Meio Pagto</th>
                        )}
                        <th className="py-2.5 px-4 text-[10px] text-slate-400 font-black uppercase tracking-wider w-[14%]">Data Pagto</th>
                        <th className="py-2.5 px-4 text-[10px] text-slate-400 font-black uppercase tracking-wider w-[12%] text-center">Ações</th>
                      </tr>

                      {/* Header Filters Row */}
                      <tr className="bg-slate-950/70 border-b border-[#334155]/60">
                        {/* Status Filter */}
                        <td className="p-1 px-3">
                          <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full bg-slate-900 border border-[#334155]/80 rounded text-[10px] text-[#f8fafc] p-1 font-semibold focus:outline-none"
                          >
                            <option value="Todos">Status</option>
                            <option value="OK">OK</option>
                            <option value="Previsto">Previsto</option>
                          </select>
                        </td>
                        {/* Lançamento Search */}
                        <td className="p-1 px-3">
                          <input
                            type="text"
                            value={filterSearch}
                            onChange={(e) => setFilterSearch(e.target.value)}
                            className="w-full bg-slate-900 border border-[#334155]/80 rounded text-[10px] text-[#f8fafc] p-1 px-1.5 focus:outline-none"
                            placeholder="Buscar..."
                          />
                        </td>
                        {/* Categoria Filter */}
                        {showCategories && (
                          <td className="p-1 px-3">
                            <select
                              value={filterCategory}
                              onChange={(e) => setFilterCategory(e.target.value)}
                              className="w-full bg-slate-900 border border-[#334155]/80 rounded text-[10px] text-[#f8fafc] p-1 focus:outline-none"
                            >
                              <option value="Todos">Todas</option>
                              <option>Habitacao & Familia</option>
                              <option>Obrigacoes & Negocios</option>
                              <option>Transporte</option>
                              <option>Saude & Bem-Estar</option>
                              <option>Estilo de Vida</option>
                              <option>Telecomunicacoes</option>
                              <option>Financas & Credito</option>
                            </select>
                          </td>
                        )}
                        {/* Valor Filter */}
                        <td className="p-1 px-3">
                          <input
                            type="number"
                            value={filterValueMax}
                            onChange={(e) => setFilterValueMax(e.target.value)}
                            className="w-full bg-slate-900 border border-[#334155]/80 rounded text-[10px] text-[#f8fafc] p-1 focus:outline-none font-mono"
                            placeholder="Máx..."
                          />
                        </td>
                        {/* Tipo Filter */}
                        {showType && (
                          <td className="p-1 px-3">
                            <select
                              value={filterType}
                              onChange={(e) => setFilterType(e.target.value)}
                              className="w-full bg-slate-900 border border-[#334155]/80 rounded text-[10px] text-[#f8fafc] p-1 focus:outline-none"
                            >
                              <option value="Todos">Todos</option>
                              <option value="Fixo">Fixo</option>
                              <option value="Variável">Variável</option>
                            </select>
                          </td>
                        )}
                        {/* Meio de Pagamento Filter */}
                        {showPaymentMethod && (
                          <td className="p-1 px-3">
                            <select
                              value={filterPaymentMethod}
                              onChange={(e) => setFilterPaymentMethod(e.target.value)}
                              className="w-full bg-slate-900 border border-[#334155]/80 rounded text-[10px] text-[#f8fafc] p-1 focus:outline-none"
                            >
                              <option value="Todos">Todos</option>
                              <option value="Pix">Pix</option>
                              <option value="Dinheiro">Dinheiro</option>
                              <option value="Crédito">Crédito</option>
                              <option value="Débito">Débito</option>
                              <option value="Boleto">Boleto</option>
                            </select>
                          </td>
                        )}
                        {/* Data de Pagamento Filter */}
                        <td className="p-1 px-2.5">
                          <input
                            type="text"
                            value={filterPaymentDate}
                            onChange={(e) => setFilterPaymentDate(e.target.value)}
                            className="w-full bg-slate-900 border border-[#334155]/80 rounded text-[10px] text-[#f8fafc] p-1 focus:outline-none font-mono"
                            placeholder="Filtrar data..."
                          />
                        </td>
                        {/* Undo Filters Button */}
                        <td className="p-1 text-center">
                          <button
                            type="button"
                            onClick={clearAllFilters}
                            className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-[#334155] hover:border-amber-400 hover:text-amber-450 font-bold px-1.5 py-1 rounded inline-flex items-center gap-1 transition-all active:scale-95 text-amber-400"
                            title="Desfazer todos os filtros ativos"
                          >
                            <FilterX className="h-3 w-3" />
                            <span>Limpar</span>
                          </button>
                        </td>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#334155]">
                      {getFilteredAndSortedTransactions().length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-12 px-4 text-center text-slate-500 font-mono text-xs">
                            <Database className="h-8 w-8 text-slate-600 mx-auto mb-2 opacity-50" />
                            Nenhuma transação atende aos filtros estabelecidos. <br/>
                            <button 
                              onClick={clearAllFilters} 
                              className="text-sky-400 font-bold hover:underline mt-2 text-[11px]"
                            >
                              Limpar filtros aplicados
                            </button>
                          </td>
                        </tr>
                      ) : (
                        getFilteredAndSortedTransactions().map((t) => (
                          <tr 
                            key={t.id} 
                            className={`hover:bg-[#1e293b]/40 transition-colors group ${isTransactionPaid(t) ? "bg-slate-900/10" : ""}`}
                          >
                            <td className="py-2.5 px-4">
                              <button
                                id={`toggle-${t.id}`}
                                onClick={() => toggleStatusDirect(t.id)}
                                className="focus:outline-none"
                                title={isTransactionPaid(t) ? "Marcar como Previsto" : "Marcar como Pago"}
                              >
                                {isTransactionPaid(t) ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-500/25">
                                    ● OK
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-950/80 text-amber-500 border border-amber-500/25 animate-pulse">
                                    ○ PREV
                                  </span>
                                )}
                              </button>
                            </td>
                            <td className="py-2.5 px-4">
                              <div>
                                <div className="font-bold text-xs text-[#f8fafc] group-hover:text-sky-400 transition-colors flex items-center gap-1.5 flex-wrap">
                                  <span>{t.subcategory}</span>
                                  {t.excludeFromTotal && (
                                    <span className="bg-amber-500/10 text-amber-400 text-[8px] font-black uppercase px-1 py-0.5 rounded border border-amber-500/20" title="Despesa duplicada ignorada nos totais">
                                      💳 Crédito Automático
                                    </span>
                                  )}
                                </div>
                                {t.description && (
                                  <div className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                                    {t.description}
                                  </div>
                                )}
                              </div>
                            </td>
                            {showCategories && (
                              <td className="py-2.5 px-4">
                                <span className="bg-slate-900 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded border border-[#334155]">
                                  {t.category}
                                </span>
                              </td>
                            )}
                            <td className="py-2.5 px-4 font-mono font-bold text-xs">
                              <span className={t.excludeFromTotal ? "text-slate-500 line-through decoration-slate-600 font-normal" : t.status === "OK" ? "text-emerald-400" : "text-slate-300"}>
                                {formatValue(t.value)}
                              </span>
                            </td>
                            {showType && (
                              <td className="py-2.5 px-4">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${t.type === 'Fixo' ? 'bg-[#334155] text-slate-300' : 'bg-slate-950 text-slate-400'}`}>
                                  {t.type}
                                </span>
                              </td>
                            )}
                            {showPaymentMethod && (
                              <td className="py-2.5 px-4 font-mono text-[10px] text-sky-300">
                                {t.paymentMethod || <span className="text-slate-600 italic">-</span>}
                              </td>
                            )}
                            <td className="py-2.5 px-4 font-mono text-[11px] text-slate-300">
                              {t.paymentDate ? (
                                <span className="bg-slate-950/40 p-1 px-1.5 rounded border border-[#334155]/50 text-slate-300 font-mono">
                                  {t.paymentDate}
                                </span>
                              ) : (
                                <span className="text-slate-605 italic">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  id={`edit-${t.id}`}
                                  onClick={() => setEditingTransaction(t)}
                                  className="p-1 px-2 text-[10px] uppercase font-bold tracking-wider text-sky-400 hover:text-sky-300 bg-sky-500/5 hover:bg-sky-500/10 rounded transition-all focus:outline-none"
                                >
                                  Edit
                                </button>
                                <button
                                  id={`delete-${t.id}`}
                                  onClick={() => deleteTransaction(t.id)}
                                  className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-red-500/5 transition-all focus:outline-none"
                                  title="Eliminar lançamento"
                                >
                                  <Trash className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Table Footer Stats & Counter info */}
              <div className="p-3 px-4 border-t border-[#334155] bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <span className="text-[11px] text-slate-400 font-mono">
                  {currentTransactions.length} de {currentTransactions.length} registros automáticos e complementares
                </span>

                <div className="bg-sky-500/10 border border-sky-450/20 rounded-lg px-3 py-1 font-mono flex items-center gap-1.5 shadow-sm text-xs select-none">
                  <span className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wide">Total Geral:</span>
                  <span className="text-sky-400 font-black">
                    {formatValue(totalPredicted)}
                  </span>
                </div>
                
                <span className="text-[10px] text-slate-500 font-mono">
                  Fixo: {formatValue(currentTransactions.filter(t => t.type === 'Fixo' && t.excludeFromTotal !== true).reduce((cur, t) => cur + t.value, 0))} | Variável: {formatValue(currentTransactions.filter(t => t.type === 'Variável' && t.excludeFromTotal !== true).reduce((cur, t) => cur + t.value, 0))}
                </span>
              </div>
            </div>

            {/* SQL Ready Real-time Database Export View Box */}
            <div className="bg-[#1e293b] p-5 rounded-2xl border border-[#334155] shadow-md flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#334155] pb-2 gap-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-emerald-400" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#f8fafc]">
                    Bases de Dados Relacionais SQL (CSV)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyCsvToClipboard}
                    className="bg-[#334155] hover:bg-[#475569] active:scale-95 text-[10px] font-bold text-sky-400 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{csvCopied ? "Copiado!" : "Copiar Tabela"}</span>
                  </button>
                </div>
              </div>

              {/* 4 tabs in the UI representing the separate tables */}
              <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-xl border border-[#334155]">
                <button
                  type="button"
                  onClick={() => setActiveExportTab("lancamentos")}
                  className={`flex-1 min-w-[120px] text-center text-[10px] font-mono py-2 px-3 rounded-lg transition-all ${
                    activeExportTab === "lancamentos"
                      ? "bg-[#334155] text-emerald-400 font-bold shadow"
                      : "text-slate-400 hover:text-[#f8fafc] hover:bg-slate-900"
                  }`}
                >
                  [TB] tb_lancamentos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveExportTab("parametros")}
                  className={`flex-1 min-w-[120px] text-center text-[10px] font-mono py-2 px-3 rounded-lg transition-all ${
                    activeExportTab === "parametros"
                      ? "bg-[#334155] text-emerald-400 font-bold shadow"
                      : "text-slate-400 hover:text-[#f8fafc] hover:bg-slate-900"
                  }`}
                >
                  [TB] tb_parametros_modelos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveExportTab("receitas")}
                  className={`flex-1 min-w-[120px] text-center text-[10px] font-mono py-2 px-3 rounded-lg transition-all ${
                    activeExportTab === "receitas"
                      ? "bg-[#334155] text-emerald-400 font-bold shadow"
                      : "text-slate-400 hover:text-[#f8fafc] hover:bg-slate-900"
                  }`}
                >
                  [TB] tb_receitas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveExportTab("indicadores")}
                  className={`flex-1 min-w-[120px] text-center text-[10px] font-mono py-2 px-3 rounded-lg transition-all ${
                    activeExportTab === "indicadores"
                      ? "bg-[#334155] text-emerald-400 font-bold shadow"
                      : "text-slate-400 hover:text-[#f8fafc] hover:bg-slate-900"
                  }`}
                >
                  [TB] tb_indicadores
                </button>
              </div>

              <div className="relative bg-slate-950 rounded-xl p-3 border border-[#334155] max-h-[140px] overflow-y-auto font-mono text-[10px] scrollbar-thin scrollbar-thumb-slate-800">
                <pre className="text-emerald-400 leading-relaxed whitespace-pre font-mono">
                  {csvText}
                </pre>
              </div>
              <p className="text-[10px] text-slate-400 font-sans leading-tight">
                {activeExportTab === "lancamentos" && (
                  <span>* <strong>tb_lancamentos</strong>: Registros de despesa reais e planejados lançados no mês de {activeMonthYear}.</span>
                )}
                {activeExportTab === "parametros" && (
                  <span>* <strong>tb_parametros_modelos</strong>: Estrutura referencial de parâmetros padrão (modelos) das despesas recorrentes e fixas que servem como guia para outros meses.</span>
                )}
                {activeExportTab === "receitas" && (
                  <span>* <strong>tb_receitas</strong>: Cadastro de renda e faturamento mensal de referência consolidado com as receitas adicionais agregadas ao mês de {activeMonthYear}.</span>
                )}
                {activeExportTab === "indicadores" && (
                  <span>* <strong>tb_indicadores</strong>: Consolidação de todas as métricas agregadas de programação, sobras e conformidade dos meses selecionados.</span>
                )}
              </p>
            </div>

          </div>

        {/* Sincronização, Backups e Inteligência IA (Dynamic section governed by the header micro-toggles) */}
        {(showBackupDrive || showAiAssistant) && (
          <section className="grid grid-cols-1 lg:grid-cols-6 gap-6 pt-2">
            {showBackupDrive && (
              <div className={`${showAiAssistant ? "lg:col-span-3" : "lg:col-span-6"} grid grid-cols-1 md:grid-cols-2 gap-6`}>
                
                {/* Google Drive Integration Panel */}
                <GoogleDrivePanel
                  activeMonthYear={activeMonthYear}
                  currentTransactions={currentTransactions}
                  competences={competences}
                  onRestoreCompetences={(newCompetences) => setCompetences(newCompetences)}
                  onAddSystemMessage={addSystemMessage}
                />

                {/* Offline Local Backup Panel */}
                <LocalBackupPanel
                  activeMonthYear={activeMonthYear}
                  currentTransactions={currentTransactions}
                  competences={competences}
                  categoriesConfig={categoriesConfig}
                  onRestoreCompetences={(newCompetences) => setCompetences(newCompetences)}
                  onRestoreCategoriesConfig={(newCategories) => setCategoriesConfig(newCategories)}
                  onAddSystemMessage={addSystemMessage}
                />
              </div>
            )}

            {/* Chatbot AI Component */}
            {showAiAssistant && (
              <div className={`${showBackupDrive ? "lg:col-span-3" : "lg:col-span-6"} flex flex-col relative overflow-hidden rounded-2xl`}>
                <div className="relative bg-[#1e293b] p-5 rounded-2xl border border-[#334155] shadow-md flex-1 flex flex-col min-h-[420px] max-h-[500px] justify-between overflow-hidden">
                  
                  {/* Premium Lock Overlay */}
                  <div className="absolute inset-0 bg-[#0f172a]/92 backdrop-blur-[3px] flex flex-col items-center justify-center text-center p-6 z-30">
                    <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full mb-3 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                      <Lock className="h-5 w-5" />
                    </div>
                    <span className="text-[9px] uppercase font-black tracking-widest text-amber-400 bg-amber-550/15 border border-amber-500/25 px-2.5 py-0.5 rounded-full mb-1.5 font-mono">
                      BDFin PRO
                    </span>
                    <h4 className="font-extrabold text-xs text-[#f8fafc] tracking-tight uppercase">
                      Assistente Chatbot AI
                    </h4>
                    <p className="text-[10px] text-slate-450 max-w-[210px] mt-1 text-center font-sans leading-normal">
                      Instruções em linguagem natural, reprocessamento automatizado de competências e análises via Gemini 1.5 Pro.
                    </p>
                    <button
                      onClick={() => alert("Simulação BDFin PRO: Obrigado pelo feedback! Esta funcionalidade estará disponível e será desbloqueada para assinantes do plano PRO.")}
                      className="mt-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider px-4 py-1.5 rounded-lg transition-all active:scale-95 shadow-md shadow-amber-550/10 cursor-pointer"
                    >
                      Assinar BDFin PRO
                    </button>
                  </div>

                  {/* Blurred Background Chat content */}
                  <div className="opacity-15 pointer-events-none select-none filter blur-[1px] flex-1 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between border-b border-[#334155] pb-3 mb-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-[#38bdf8]/10 text-[#38bdf8]">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-xs uppercase tracking-wider text-[#f8fafc]">
                            Chatbot AI
                          </h3>
                          <p className="text-[10px] text-slate-400">Processamento em linguagem natural</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] text-slate-400 font-mono">Gemini 3.5 Active</span>
                      </div>
                    </div>

                    {/* Chat history display */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-700 min-h-[160px] max-h-[300px]">
                      <AnimatePresence initial={false}>
                        {chatHistory.map((msg) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex flex-col max-w-[85%] ${msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
                          >
                            <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                              msg.sender === "user" 
                                ? "bg-sky-400 text-slate-950 font-medium rounded-tr-none" 
                                : "bg-slate-900 border border-[#334155] text-slate-100 rounded-tl-none font-sans"
                            }`}>
                              {/* Simple markdown bold renderer tool */}
                              {msg.text.split("**").map((text, idx) => (
                                idx % 2 === 1 ? <strong key={idx} className="font-bold text-sky-300">{text}</strong> : text
                              ))}
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono mt-1 px-1">
                              {msg.timestamp}
                            </span>
                          </motion.div>
                        ))}
                        
                        {isAiLoading && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mr-auto flex items-center gap-2 bg-slate-900 p-3 px-4 rounded-xl border border-[#334155] text-xs text-sky-400"
                          >
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            <span>Processamento Engine...</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Chat Input & Suggestions panel */}
                    <div className="mt-3 border-t border-[#334155] pt-3 space-y-2 shrink-0">
                      
                      {/* Visual Suggested Presets quick-pills */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {EXAMPLE_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            disabled
                            className="text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-[#334155] whitespace-nowrap px-2.5 py-1 rounded-full pointer transition-all active:scale-95 flex-shrink-0 opacity-80 hover:opacity-100"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 relative bg-slate-950 rounded-xl border border-[#475569] p-1 shadow-inner focus-within:ring-1 focus-within:ring-sky-400 focus-within:border-sky-400">
                        <input
                          type="text"
                          disabled
                          placeholder="Ex: Confirma a internet de junho e atualiza supermercado para 750..."
                          className="flex-1 bg-transparent text-xs text-[#f8fafc] px-3 outline-none border-none py-2 window-input placeholder-slate-500"
                        />
                        <button
                          disabled
                          className="bg-[#334155] text-sky-400 px-3.5 py-2 rounded-lg"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </section>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#334155] mt-12 py-6 text-center text-[11px] text-slate-500 max-w-7xl mx-auto px-4">
        <p className="font-mono">BDFin v1 - Desenvolvido exclusivamente para gestão inteligente de planejamento e controle financeiro.</p>
        <p className="mt-1">Nenhum dado é enviado para servidores externos além das APIs seguras de IA do Google AI Studio.</p>
      </footer>

      {/* -------------------- DYNAMIC MODALS -------------------- */}

      {/* 1. Modal: CONFIGURATION / SET MONTHLY RECEIPT THRESHOLD */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1e293b] rounded-2xl border border-[#475569] p-6 max-w-sm w-full space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-[#334155] pb-2">
                <span className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-1.5">
                  <Sliders className="h-4 w-4 text-sky-400" />
                  Premissas da Receita
                </span>
                <button 
                  onClick={() => setShowConfigModal(false)}
                  className="p-1 text-slate-400 hover:text-[#f8fafc]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleApplyThreshold} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono block">Renda Mensal de Referência (R$)</label>
                  <input 
                    type="number"
                    value={monthlyIncomeInput}
                    onChange={(e) => setMonthlyIncomeInput(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2.5 text-xs text-[#f8fafc] font-bold font-mono focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    placeholder="Ex: 4000.00"
                    step="50"
                  />
                  <p className="text-[9px] text-slate-500">
                    * Usado para aferir as sobras e o potencial de poupança (economias estimado) do mês de {activeMonthYear}.
                  </p>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="bg-slate-900 border border-[#334155] text-xs hover:bg-slate-800 font-medium px-4 py-2 rounded-lg"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg"
                  >
                    Salvar Premissas
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Modal: ADD EXTRA TRANSACTION MANUALLY */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1e293b] rounded-2xl border border-[#475569] p-6 max-w-md w-full space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-[#334155] pb-2">
                <span className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-sky-400" />
                  Lançar Gasto Extra Pontual
                </span>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-slate-400 hover:text-[#f8fafc]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={triggerManualAdd} className="space-y-3.5">
                {/* 1. Preset Template Quick-Filler Selector to maintain data integrity */}
                <div className="bg-slate-900/60 p-3 rounded-xl border border-[#334155] space-y-1">
                  <label className="text-[9px] text-sky-400 font-extrabold uppercase tracking-widest block">
                    Preencher com Base em Modelo:
                  </label>
                  <select
                    onChange={(e) => {
                      const selectedSub = e.target.value;
                      if (!selectedSub) return;
                      const match = categoriesConfig.find(p => p.subcategory === selectedSub);
                      if (match) {
                        setNewTransSubcategory(match.subcategory);
                        setNewTransCategory(match.category);
                        setNewTransValue(String(match.value));
                        setNewTransType(match.type);
                        setNewTransPaymentMethod(match.paymentMethod || "");
                        setNewTransPaymentDate(match.paymentDate || "");
                      }
                    }}
                    className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Preencher manualmente abaixo --</option>
                    {categoriesConfig.map((p, pIdx) => (
                      <option key={pIdx} value={p.subcategory}>
                        {p.subcategory} ({p.category} | R$ {p.value.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold">Subcategoria / Nome</label>
                    <input 
                      type="text"
                      required
                      value={newTransSubcategory}
                      onChange={(e) => setNewTransSubcategory(e.target.value)}
                      className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] focus:ring-1 focus:ring-sky-500 focus:outline-none font-medium"
                      placeholder="Ex: Manutenção da Bike"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold">Valor (R$)</label>
                    <input 
                      type="number"
                      required
                      step="0.01"
                      value={newTransValue}
                      onChange={(e) => setNewTransValue(e.target.value)}
                      className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] font-mono focus:ring-1 focus:ring-sky-500 focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold">Categoria</label>
                    <select
                      value={newTransCategory}
                      onChange={(e) => setNewTransCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] focus:outline-none"
                    >
                      <option>Habitacao & Familia</option>
                      <option>Obrigacoes & Negocios</option>
                      <option>Transporte</option>
                      <option>Saude & Bem-Estar</option>
                      <option>Estilo de Vida</option>
                      <option>Telecomunicacoes</option>
                      <option>Financas & Credito</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold">Status Inicial</label>
                    <select
                      value={newTransStatus}
                      onChange={(e) => setNewTransStatus(e.target.value as any)}
                      className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] focus:outline-none font-bold"
                    >
                      <option value="OK">OK (Efetivado/Pago)</option>
                      <option value="Previsto">Previsto (Aguardando)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold">Meio de Pagamento</label>
                    <select
                      value={newTransPaymentMethod}
                      onChange={(e) => setNewTransPaymentMethod(e.target.value as any)}
                      className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] focus:outline-none"
                    >
                      <option value="">Nenhum</option>
                      <option value="Pix">Pix</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Crédito">Crédito</option>
                      <option value="Débito">Débito</option>
                      <option value="Boleto">Boleto</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold">Data de Pagamento</label>
                    <input
                      type="text"
                      value={newTransPaymentDate}
                      onChange={(e) => setNewTransPaymentDate(e.target.value)}
                      placeholder="Dia ou data"
                      className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] focus:ring-1 focus:ring-sky-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold">Natureza da Despesa</label>
                    <select
                      value={newTransType}
                      onChange={(e) => setNewTransType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] focus:outline-none"
                    >
                      <option value="Variável">Variável</option>
                      <option value="Fixo">Fixo</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold">Recorrência</label>
                    <select
                      value={newTransScope}
                      onChange={(e) => setNewTransScope(e.target.value as any)}
                      className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] focus:outline-none"
                    >
                      <option value="vigent_only">Apenas neste mês</option>
                      <option value="all_future">Todos os meses (Fixo)</option>
                      <option value="installments">Parcelado (em X vezes)</option>
                    </select>
                  </div>
                </div>

                {newTransScope === 'installments' && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold">Quantidade de Parcelas</label>
                    <input
                      type="number"
                      min="2"
                      max="120"
                      value={newTransInstallmentsCount}
                      onChange={(e) => setNewTransInstallmentsCount(e.target.value)}
                      className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] focus:outline-none"
                      placeholder="Ex: 5"
                    />
                  </div>
                )}

                {/* Ignorar duplicado no Cartão de Crédito */}
                <div className="space-y-1">
                  <label className="flex items-center gap-2 bg-slate-950 border border-[#334155]/80 rounded-lg p-2.5 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={newTransExcludeFromTotal}
                      onChange={(e) => setNewTransExcludeFromTotal(e.target.checked)}
                      className="rounded border-[#334155] text-sky-500 focus:ring-sky-500 h-4 w-4 bg-slate-900"
                    />
                    <div className="text-left">
                      <span className="text-[11px] font-black text-[#f8fafc] block leading-tight">Ignorar despesa no Total do mês</span>
                      <span className="text-[9px] text-slate-400 block font-mono leading-none mt-0.5">Evita duplicação se já estiver inclusa no Cartão de Crédito</span>
                    </div>
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block font-bold">Descrição da Exceção</label>
                  <input
                    type="text"
                    value={newTransDesc}
                    onChange={(e) => setNewTransDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    placeholder="Descrição do gasto extra"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-[#334155]">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="bg-slate-900 border border-[#334155] text-xs hover:bg-slate-800 font-medium px-4 py-2 rounded-lg text-slate-200"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-black px-4 py-2 rounded-lg"
                  >
                    Incluir Lançamento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Modal: GENERATE NEW MONTH/COMPETENCE MANUALLY */}
      <AnimatePresence>
        {showCompetenceGenerator && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1e293b] rounded-2xl border border-[#475569] p-6 max-w-sm w-full space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-[#334155] pb-2">
                <span className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-sky-400" />
                  Gerar Nova Competência
                </span>
                <button 
                  onClick={() => setShowCompetenceGenerator(false)}
                  className="p-1 text-slate-400 hover:text-[#f8fafc]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={generateCompetenceManually} className="space-y-4">
                <p className="text-[11px] text-slate-400">
                  O sistema irá gerar automaticamente todas as premissas de gastos padrão previstos para o novo mês selecionado.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-mono block">Mês</label>
                    <select
                      value={newMonthName}
                      onChange={(e) => setNewMonthName(e.target.value)}
                      className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2.5 text-xs text-[#f8fafc] font-bold focus:outline-none"
                    >
                      <option>Janeiro</option>
                      <option>Fevereiro</option>
                      <option>Março</option>
                      <option>Abril</option>
                      <option>Maio</option>
                      <option>Junho</option>
                      <option>Julho</option>
                      <option>Agosto</option>
                      <option>Setembro</option>
                      <option>Outubro</option>
                      <option>Novembro</option>
                      <option>Dezembro</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-mono block">Ano</label>
                    <input 
                      type="text"
                      required
                      value={newMonthYear}
                      onChange={(e) => setNewMonthYear(e.target.value)}
                      className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2.5 text-xs text-[#f8fafc] font-bold font-mono focus:outline-none"
                      placeholder="2026"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-[#334155]">
                  <button
                    type="button"
                    onClick={() => setShowCompetenceGenerator(false)}
                    className="bg-slate-900 border border-[#334155] text-xs hover:bg-slate-800 font-medium px-4 py-2 rounded-lg text-slate-200"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-black px-4 py-2 rounded-lg"
                  >
                    Auto-Gerar Mês
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Modal: EDIT TRANSACTION INLINE */}
      <AnimatePresence>
        {editingTransaction && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1e293b] rounded-2xl border border-[#475569] p-6 max-w-md w-full space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-[#334155] pb-2">
                <span className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-1.5 text-sky-400">
                  <Edit className="h-4 w-4" />
                  Editar Registro Detalhado
                </span>
                <button 
                  onClick={() => setEditingTransaction(null)}
                  className="p-1 text-slate-400 hover:text-[#f8fafc]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={saveManualEdit} className="space-y-3.5">
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold">Lançamento / Nome</label>
                    <input 
                      type="text"
                      required
                      value={editingTransaction.subcategory}
                      onChange={(e) => setEditingTransaction({ ...editingTransaction, subcategory: e.target.value })}
                      className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-slate-400 block font-bold">Valor (R$)</label>
                      {editingTransaction.defaultValue !== undefined && (
                        <button
                          type="button"
                          onClick={() => setEditingTransaction({ 
                            ...editingTransaction, 
                            value: editingTransaction.defaultValue || 0,
                            useDefaultValue: true 
                          })}
                          className="text-[9px] text-sky-400 hover:underline font-bold"
                          title="Carregar valor padrão"
                        >
                          Usar Padrão
                        </button>
                      )}
                    </div>
                    <input 
                      type="number"
                      required
                      step="0.01"
                      value={editingTransaction.value}
                      onChange={(e) => setEditingTransaction({ ...editingTransaction, value: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] font-semibold font-mono focus:ring-1 focus:ring-sky-500 focus:outline-none text-sky-400"
                    />
                  </div>
                </div>

                <div className="bg-slate-900/50 p-2.5 rounded-lg border border-[#334155]/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-350 font-bold block flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      Configurar Valor Padrão (Opcional)
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={!!editingTransaction.useDefaultValue} 
                        onChange={(e) => setEditingTransaction({ ...editingTransaction, useDefaultValue: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-7 h-4 bg-slate-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[#f8fafc] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-sky-500 peer-checked:after:bg-slate-950"></div>
                      <span className="ml-1.5 text-[9px] font-semibold text-slate-400">Habilitar</span>
                    </label>
                  </div>

                  {editingTransaction.useDefaultValue && (
                    <div className="grid grid-cols-2 gap-2 animate-fadeIn">
                      <div className="space-y-1 col-span-2">
                        <label className="text-[9px] text-slate-400 block font-semibold">Valor Padrão Recorrente (R$)</label>
                        <div className="relative">
                          <input 
                            type="number"
                            step="0.01"
                            value={editingTransaction.defaultValue ?? editingTransaction.value}
                            onChange={(e) => setEditingTransaction({ 
                              ...editingTransaction, 
                              defaultValue: parseFloat(e.target.value) || 0 
                            })}
                            className="w-full bg-slate-950 border border-[#334155] rounded-lg p-1.5 text-xs text-[#f8fafc] font-semibold font-mono focus:ring-1 focus:ring-sky-500 focus:outline-none text-sky-400"
                            placeholder="Ex: 120.00"
                          />
                          <button
                            type="button"
                            onClick={() => setEditingTransaction({
                              ...editingTransaction,
                              value: editingTransaction.defaultValue ?? editingTransaction.value
                            })}
                            className="absolute right-2 top-1 shadow-sm text-[8px] bg-[#334155] text-[#f8fafc] py-0.5 px-1.5 rounded active:scale-95 transition-all hover:bg-slate-600 font-bold"
                          >
                            Copiar p/ Atual
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block font-bold">Categoria</label>
                  <select
                    value={editingTransaction.category}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, category: e.target.value })}
                    className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] focus:outline-none cursor-pointer"
                  >
                    <option>Habitacao & Familia</option>
                    <option>Obrigacoes & Negocios</option>
                    <option>Transporte</option>
                    <option>Saude & Bem-Estar</option>
                    <option>Estilo de Vida</option>
                    <option>Telecomunicacoes</option>
                    <option>Financas & Credito</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold">Status_Pagamento</label>
                    <select
                      value={editingTransaction.status}
                      onChange={(e) => setEditingTransaction({ ...editingTransaction, status: e.target.value as any })}
                      className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] focus:outline-none font-bold"
                    >
                      <option value="OK">OK (Efetivado/Pago)</option>
                      <option value="Previsto">Previsto (Aguardando)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold">Tipo Custo</label>
                    <select
                      value={editingTransaction.type}
                      onChange={(e) => setEditingTransaction({ ...editingTransaction, type: e.target.value as any })}
                      className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] focus:outline-none"
                    >
                      <option value="Fixo">Fixo</option>
                      <option value="Variável">Variável</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold">Meio de Pagamento</label>
                    <select
                      value={editingTransaction.paymentMethod || ""}
                      onChange={(e) => setEditingTransaction({ ...editingTransaction, paymentMethod: e.target.value as any })}
                      className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] focus:outline-none text-slate-350"
                    >
                      <option value="">Nenhum</option>
                      <option value="Pix">Pix</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Crédito">Crédito</option>
                      <option value="Débito">Débito</option>
                      <option value="Boleto">Boleto</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold">Data de Pagamento</label>
                    <input
                      type="text"
                      value={editingTransaction.paymentDate || ""}
                      onChange={(e) => setEditingTransaction({ ...editingTransaction, paymentDate: e.target.value })}
                      placeholder="Ex: 2026-06-10"
                      className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] focus:ring-1 focus:ring-sky-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block font-bold">Descrição da Exception</label>
                  <input
                    type="text"
                    value={editingTransaction.description}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, description: e.target.value })}
                    className="w-full bg-slate-950 border border-[#334155] rounded-lg p-2 text-xs text-[#f8fafc] focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    placeholder="Descrição do ajuste ou pagamento por exceção"
                  />
                </div>

                {/* Ignorar duplicado no Cartão de Crédito em Edição */}
                <div className="space-y-1">
                  <label className="flex items-center gap-2 bg-slate-950 border border-[#334155]/80 rounded-lg p-2.5 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={editingTransaction.excludeFromTotal || false}
                      onChange={(e) => setEditingTransaction({
                        ...editingTransaction,
                        excludeFromTotal: e.target.checked
                      })}
                      className="rounded border-[#334155] text-sky-500 focus:ring-sky-500 h-4 w-4 bg-slate-900"
                    />
                    <div className="text-left font-sans">
                      <span className="text-[11px] font-black text-[#f8fafc] block leading-tight">Ignorar despesa no Total do mês</span>
                      <span className="text-[9px] text-slate-450 block font-mono leading-none mt-0.5">Evita duplicação se já estiver inclusa no Cartão de Crédito</span>
                    </div>
                  </label>
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-[#334155]">
                  <button
                    type="button"
                    onClick={() => setEditingTransaction(null)}
                    className="bg-slate-900 border border-[#334155] text-xs hover:bg-slate-800 font-medium px-4 py-2 rounded-lg text-slate-200"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-black px-4 py-2 rounded-lg"
                  >
                    Gravar Alteração
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
