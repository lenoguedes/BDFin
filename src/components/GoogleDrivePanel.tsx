import { useState, useEffect } from "react";
import { 
  Cloud, 
  CloudUpload, 
  CloudDownload, 
  Check, 
  LogOut, 
  FolderOpen, 
  FileSpreadsheet, 
  AlertCircle, 
  Trash2, 
  Settings, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  Info,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MonthCompetence, Transaction } from "../types";

export interface GoogleDrivePanelProps {
  activeMonthYear: string;
  currentTransactions: Transaction[];
  competences: Record<string, MonthCompetence>;
  onRestoreCompetences: (newCompetences: Record<string, MonthCompetence>) => void;
  onAddSystemMessage: (text: string) => void;
}

interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
  isMock?: boolean;
}

interface UserProfile {
  name: string;
  email: string;
  picture?: string;
}

export default function GoogleDrivePanel({
  activeMonthYear,
  currentTransactions,
  competences,
  onRestoreCompetences,
  onAddSystemMessage
}: GoogleDrivePanelProps) {
  const [clientId, setClientId] = useState<string>(() => {
    return localStorage.getItem("finops_google_client_id") || import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  });
  
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem("finops_google_access_token") || null;
  });

  const [isSimulated, setIsSimulated] = useState<boolean>(() => {
    return localStorage.getItem("finops_google_is_simulated") === "true";
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load profile and files when token changes or simulation toggles
  useEffect(() => {
    if (isSimulated) {
      setProfile({
        name: "Engenheiro de Dados (Mock)",
        email: "finops.demo@gmail.com",
        picture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80"
      });
      loadMockFiles();
    } else if (accessToken) {
      fetchRealProfile(accessToken);
      fetchRealFiles(accessToken);
    } else {
      setProfile(null);
      setDriveFiles([]);
    }
  }, [accessToken, isSimulated]);

  // Handle popup-based OAuth postMessage handler
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security check: Only trust events from our own origin
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "GOOGLE_OAUTH_SUCCESS") {
        const token = event.data.token;
        setAccessToken(token);
        setIsSimulated(false);
        localStorage.setItem("finops_google_access_token", token);
        localStorage.setItem("finops_google_is_simulated", "false");
        onAddSystemMessage("🔒 **Google Drive conectado com sucesso!** Conexão ativa realizada via OAuth 2.0.");
      }
    };
    
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onAddSystemMessage]);

  // If redirect lands with token directly (same-window fallback)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token=")) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get("access_token");
      const state = params.get("state");
      
      if (token) {
        if (window.opener && state === "google_drive_oauth") {
          window.opener.postMessage({ type: "GOOGLE_OAUTH_SUCCESS", token }, window.location.origin);
          window.close();
        } else {
          setAccessToken(token);
          setIsSimulated(false);
          localStorage.setItem("finops_google_access_token", token);
          localStorage.setItem("finops_google_is_simulated", "false");
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      }
    }
  }, []);

  const loadMockFiles = () => {
    const cached = localStorage.getItem("finops_drive_mock_files");
    if (cached) {
      try {
        setDriveFiles(JSON.parse(cached));
      } catch (e) {
        setDriveFiles([]);
      }
    } else {
      const defaultMocks: DriveFile[] = [
        {
          id: "mock-1",
          name: "finops_month_backup_Janeiro_2026.json",
          createdTime: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
          size: "4.2 KB",
          isMock: true
        }
      ];
      localStorage.setItem("finops_drive_mock_files", JSON.stringify(defaultMocks));
      setDriveFiles(defaultMocks);
    }
  };

  const fetchRealProfile = async (token: string) => {
    try {
      setIsLoading(true);
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 401) handleLogout(); // token expired
        throw new Error("Expired or invalid access token");
      }
      const data = await res.json();
      setProfile({
        name: data.name,
        email: data.email,
        picture: data.picture
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRealFiles = async (token: string) => {
    try {
      setIsLoading(true);
      // Query specific to our backups (name starting with finops_ and we fetch meta fields including createdTime, size)
      const query = encodeURIComponent("name contains 'finops_' and trashed = false");
      const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,size)&orderBy=createdTime%20desc`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        const formatted = (data.files || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          createdTime: f.createdTime,
          size: f.size ? `${(parseInt(f.size) / 1024).toFixed(1)} KB` : "N/A"
        }));
        setDriveFiles(formatted);
      }
    } catch (e) {
      console.error("Error reading Drive files:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = () => {
    if (!clientId.trim()) {
      setShowSettings(true);
      alert("Por favor, configure o ID do Cliente Google nas configurações do painel.");
      return;
    }

    localStorage.setItem("finops_google_client_id", clientId.trim());
    
    // Google Implicit Flow Authorization URL
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId.trim())}&` +
      `redirect_uri=${encodeURIComponent(window.location.origin)}&` +
      `response_type=token&` +
      `scope=${encodeURIComponent("https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email")}&` +
      `state=google_drive_oauth&` +
      `include_granted_scopes=true`;

    const popup = window.open(authUrl, "google_oauth_popup", "width=600,height=700");
    if (!popup) {
      alert("O bloqueador de popups impediu a autenticação. Por favor, libere popups para o aplicativo.");
    }
  };

  const handleSimulateConnection = () => {
    setIsSimulated(true);
    localStorage.setItem("finops_google_is_simulated", "true");
    onAddSystemMessage("🧪 **Google Drive conectado em Modo Simulação (Offline)**. Você pode realizar testes de upload e restauração virtuais.");
  };

  const handleLogout = () => {
    setAccessToken(null);
    setIsSimulated(false);
    setProfile(null);
    setDriveFiles([]);
    localStorage.removeItem("finops_google_access_token");
    localStorage.removeItem("finops_google_is_simulated");
    onAddSystemMessage("📤 **Desconectado do Google Drive**. Seus dados permanecem locais.");
  };

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("finops_google_client_id", clientId.trim());
    setSuccessMessage("ID do Cliente salvo!");
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  const handleExportMonth = async () => {
    const confirm = window.confirm(`Deseja exportar a competência "${activeMonthYear}" para o Google Drive?`);
    if (!confirm) return;

    setIsExporting(true);
    const content = JSON.stringify({
      version: "finops-v2",
      type: "month_backup",
      monthYear: activeMonthYear,
      income: competences[activeMonthYear]?.income || 4000,
      transactions: currentTransactions,
      exportedAt: new Date().toISOString()
    }, null, 2);

    const filename = `finops_month_backup_${activeMonthYear.replace(/\s+/g, "_")}.json`;

    if (isSimulated) {
      // Simulated upload to mock files list
      setTimeout(() => {
        const newMockFile: DriveFile = {
          id: `mock-${Date.now()}`,
          name: filename,
          createdTime: new Date().toISOString(),
          size: `${(content.length / 1024).toFixed(1)} KB`,
          isMock: true
        };
        const currentMocks = [...driveFiles];
        // replace if exists, else append
        const existIdx = currentMocks.findIndex(f => f.name === filename);
        if (existIdx !== -1) {
          currentMocks[existIdx] = newMockFile;
        } else {
          currentMocks.unshift(newMockFile);
        }
        localStorage.setItem("finops_drive_mock_files", JSON.stringify(currentMocks));
        setDriveFiles(currentMocks);
        setIsExporting(false);
        onAddSystemMessage(`✅ [Simulação] Backup **${filename}** enviado com sucesso para o Drive fictício!`);
        alert(`Backup simulação de ${activeMonthYear} realizado com sucesso!`);
      }, 1000);
    } else if (accessToken) {
      try {
        // Multi-part related upload for Google Drive API v3
        const metadata = {
          name: filename,
          mimeType: "application/json"
        };
        
        const boundary = "finops_multipart_boundary";
        const body = `--${boundary}\r\n` +
          `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
          `${JSON.stringify(metadata)}\r\n` +
          `--${boundary}\r\n` +
          `Content-Type: application/json\r\n\r\n` +
          `${content}\r\n` +
          `--${boundary}--`;

        const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": `multipart/related; boundary=${boundary}`
          },
          body: body
        });

        if (res.ok) {
          onAddSystemMessage(`✅ Backup **${filename}** foi enviado com sucesso para o seu Google Drive real!`);
          alert("Backup exportado para o Google Drive com sucesso!");
          fetchRealFiles(accessToken);
        } else {
          throw new Error("Failed to write to Google Drive API");
        }
      } catch (e: any) {
        console.error(e);
        alert(`Erro ao exportar real para o Drive: ${e.message}`);
      } finally {
        setIsExporting(false);
      }
    }
  };

  const handleExportFullBackup = async () => {
    const confirm = window.confirm(`Deseja exportar um backup TOTAL de todas as competências gravadas?`);
    if (!confirm) return;

    setIsExporting(true);
    const content = JSON.stringify({
      version: "finops-v2",
      type: "full_backup",
      competences: competences,
      exportedAt: new Date().toISOString()
    }, null, 2);

    const filename = `finops_full_backup_${new Date().toISOString().split("T")[0]}.json`;

    if (isSimulated) {
      setTimeout(() => {
        const newMockFile: DriveFile = {
          id: `mock-${Date.now()}`,
          name: filename,
          createdTime: new Date().toISOString(),
          size: `${(content.length / 1024).toFixed(1)} KB`,
          isMock: true
        };
        const currentMocks = [...driveFiles];
        const existIdx = currentMocks.findIndex(f => f.name === filename);
        if (existIdx !== -1) {
          currentMocks[existIdx] = newMockFile;
        } else {
          currentMocks.unshift(newMockFile);
        }
        localStorage.setItem("finops_drive_mock_files", JSON.stringify(currentMocks));
        setDriveFiles(currentMocks);
        setIsExporting(false);
        onAddSystemMessage(`✅ [Simulação] Backup Geral completo **${filename}** salvo!`);
        alert("Backup integral gerado com sucesso offline!");
      }, 1000);
    } else if (accessToken) {
      try {
        const metadata = { name: filename, mimeType: "application/json" };
        const boundary = "finops_multipart_boundary";
        const body = `--${boundary}\r\n` +
          `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
          `${JSON.stringify(metadata)}\r\n` +
          `--${boundary}\r\n` +
          `Content-Type: application/json\r\n\r\n` +
          `${content}\r\n` +
          `--${boundary}--`;

        const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": `multipart/related; boundary=${boundary}`
          },
          body: body
        });

        if (res.ok) {
          onAddSystemMessage(`✅ Backup Total **${filename}** exportado com sucesso.`);
          alert("Backup geral enviado com sucesso!");
          fetchRealFiles(accessToken);
        } else {
          throw new Error("Failed to write full backup to Google Drive API");
        }
      } catch (e: any) {
        alert(`Erro na exportação do backup total: ${e.message}`);
      } finally {
        setIsExporting(false);
      }
    }
  };

  const handleDownloadAndRestore = async (file: DriveFile) => {
    const confirm = window.confirm(`ATENÇÃO: Deseja importar o backup "${file.name}"? Os dados de competência correspondentes no aplicativo serão sobrepostos pelo conteúdo desse arquivo.`);
    if (!confirm) return;

    if (file.isMock) {
      // Simulation mode read
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        // Find dummy contents
        if (file.name.includes("month_backup")) {
          // restored content mock
          setCompetencesAndLog({
            ...competences,
            [activeMonthYear]: {
              monthYear: activeMonthYear,
              income: competences[activeMonthYear]?.income || 4000,
              transactions: [
                ...currentTransactions,
                {
                  id: `restored-trans-${Date.now()}`,
                  date: new Date().toISOString().split("T")[0],
                  category: "Estilo de Vida",
                  subcategory: "Ajuste de Restaurado",
                  value: 250.00,
                  status: "OK",
                  type: "Variável",
                  sqlTable: "Categoria_Despesas",
                  description: "Registro de auditoria importado via backup Drive."
                }
              ]
            }
          }, `Importado e mesclado backup mensal offline para ${activeMonthYear}`);
        } else {
          // Full restore simulator has standard competences
          setCompetencesAndLog(competences, "Backup Geral simulação reprocessado com sucesso!");
        }
      }, 800);
    } else if (accessToken) {
      try {
        setIsLoading(true);
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        if (!res.ok) throw new Error("Erro ao baixar dados do arquivo do Drive.");
        const data = await res.json();
        
        if (data.type === "month_backup" && data.monthYear) {
          const updated = {
            ...competences,
            [data.monthYear]: {
              monthYear: data.monthYear,
              income: data.income || 4000,
              transactions: data.transactions || []
            }
          };
          setCompetencesAndLog(updated, `Restaurado de forma integrada o backup real da competência ${data.monthYear}.`);
        } else if (data.type === "full_backup" && data.competences) {
          setCompetencesAndLog(data.competences, "Backup completo restaurado integralmente do Google Drive real.");
        } else {
          throw new Error("O arquivo importado não possui o formato estruturado do FinOps Engine v2.");
        }
      } catch (err: any) {
        alert(`Falha ao restaurar Backup: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleTrashFile = async (file: DriveFile) => {
    const confirm = window.confirm(`Deseja excluir permanentemente o backup "${file.name}" do Drive?`);
    if (!confirm) return;

    if (file.isMock) {
      const current = driveFiles.filter(f => f.id !== file.id);
      localStorage.setItem("finops_drive_mock_files", JSON.stringify(current));
      setDriveFiles(current);
      onAddSystemMessage(`🗑️ [Simulação] Backup **${file.name}** removido do diretório virtual.`);
    } else if (accessToken) {
      try {
        setIsLoading(true);
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (res.ok) {
          onAddSystemMessage(`🗑️ Backup **${file.name}** removido.`);
          fetchRealFiles(accessToken);
        } else {
          throw new Error("Erro ao apagar o arquivo do Drive.");
        }
      } catch (e: any) {
        alert(e.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const setCompetencesAndLog = (updated: Record<string, MonthCompetence>, message: string) => {
    onRestoreCompetences(updated);
    onAddSystemMessage(`📥 **Dados Restaurados:** ${message}`);
    alert("Dados importados com sucesso!");
  };

  return (
    <div className="relative bg-[#1e293b] p-5 rounded-2xl border border-[#334155] shadow-md space-y-4 overflow-hidden">
      
      {/* Premium Lock Overlay */}
      <div className="absolute inset-0 bg-[#0f172a]/92 backdrop-blur-[3px] flex flex-col items-center justify-center text-center p-6 z-30">
        <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full mb-3 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.25)]">
          <Lock className="h-5 w-5" />
        </div>
        <span className="text-[9px] uppercase font-black tracking-widest text-amber-400 bg-amber-550/15 border border-amber-500/25 px-2.5 py-0.5 rounded-full mb-1.5 font-mono">
          BDFin PRO
        </span>
        <h4 className="font-extrabold text-xs text-[#f8fafc] tracking-tight uppercase">
          Nuvem Google Drive
        </h4>
        <p className="text-[10px] text-slate-450 max-w-[210px] mt-1 text-center font-sans leading-normal">
          Sincronização redundante inteligente e salvamento em nuvem oficial automatizado via Google OAuth 2.0.
        </p>
        <button
          onClick={() => alert("Simulação BDFin PRO: Obrigado pelo feedback! Esta funcionalidade estará disponível e será desbloqueada para assinantes do plano PRO.")}
          className="mt-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider px-4 py-1.5 rounded-lg transition-all active:scale-95 shadow-md shadow-amber-550/10 cursor-pointer"
        >
          Assinar BDFin PRO
        </button>
      </div>

      <div className="opacity-15 pointer-events-none select-none filter blur-[1px]">
        {/* Title block */}
        <div className="flex items-center justify-between border-b border-[#334155] pb-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-bold text-sm text-[#f8fafc] uppercase tracking-wide flex items-center gap-1.5">
              <Cloud className="h-4 w-4 text-emerald-400" />
              Backup & Google Drive
            </h3>
          </div>
          <button 
            disabled
            className="p-1 hover:bg-[#334155] rounded text-slate-400 hover:text-[#f8fafc] transition-colors"
            title="Configurações de API"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Settings collapsible panel */}
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-[#0f172a] border border-[#334155] p-3 rounded-lg text-slate-300 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-sky-400 uppercase tracking-widest flex items-center gap-1">
                <Settings className="h-3 w-3" />
                Parâmetros OAuth 2.0
              </span>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-[10px] text-slate-400 hover:text-slate-100"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleSaveClientId} className="space-y-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block font-bold">Google Consent Client ID</label>
                <input 
                  type="text" 
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Ex: 773134-xyz.apps.googleusercontent.com"
                  className="w-full bg-slate-900 border border-[#334155] text-xs text-[#f8fafc] p-1.5 px-2.5 rounded focus:outline-none"
                />
              </div>
              
              <div className="flex items-center justify-between gap-2 pt-1 font-mono text-[9px] text-[#f8fafc]/60">
                <span className="flex items-center gap-0.5"><Info className="h-2.5 w-2.5 text-sky-400" /> Web App Origin URI</span>
                <span className="bg-slate-900 px-1 py-0.5 rounded select-all border border-slate-850">{window.location.origin}</span>
              </div>

              <div className="flex justify-between items-center pt-1.5 border-t border-[#334155]">
                {successMessage ? (
                  <span className="text-[10px] text-emerald-400 font-bold">{successMessage}</span>
                ) : <div />}
                <button 
                  type="submit" 
                  className="bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-[10px] px-3 py-1.5 rounded transition-all active:scale-95"
                >
                  Gravar ID
                </button>
              </div>
            </form>

            <div className="border-t border-[#334155] pt-2 space-y-1 text-[10px] text-slate-400 leading-normal">
              <p className="font-bold text-slate-300 mb-1">Como conectar o Drive real:</p>
              <p>1. Acesse o <span className="text-sky-400 font-mono">Google Cloud Console</span>.</p>
              <p>2. Ative a <span className="text-slate-200">Google Drive API</span>.</p>
              <p>3. Sob "Credenciais", crie um ID do cliente OAuth para Aplicativos Web.</p>
              <p>4. Adicione o Web App Origin acima em <span className="text-slate-200">Origens JavaScript</span> e <span className="text-slate-200">URIs de redirecionamento</span> autorizados.</p>
            </div>
          </motion.div>
        )}

        {/* Main Connection / Profile Block */}
        {!profile ? (
          <div className="space-y-3 pt-2">
            <p className="text-[11px] text-slate-450 leading-relaxed">
              Faça backup ou restaure seus lançamentos por exceção diretamente do seu Google Drive particular, guardando suas competências financeiras em nuvem de forma segura.
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <button
                disabled
                className="bg-[#1a253c] hover:bg-[#1a253c]/80 text-[#f8fafc] hover:border-emerald-400 border border-[#334155] p-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 group transition-all"
              >
                {/* Google stylized G icon */}
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.82-2.6-2.67-4.53-5.84-4.53z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Acessar Google Drive Oficial</span>
              </button>
              <button
                disabled
                className="bg-slate-900 border border-amber-500/20 text-amber-400 hover:bg-slate-800 p-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all active:scale-95"
              >
                Testar em Modo Simulação (Offline)
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* User profile capsule info */}
            <div className="flex items-center justify-between bg-slate-950/40 p-2.5 rounded-xl border border-[#334155]/60">
              <div className="flex items-center gap-2">
                {profile.picture ? (
                  <img 
                    src={profile.picture} 
                    alt="user" 
                    referrerPolicy="no-referrer"
                    className="h-8 w-8 rounded-full border border-sky-400/30"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                    {profile.name[0]}
                  </div>
                )}
                <div className="text-left">
                  <p className="text-[11px] font-black leading-tight text-[#f8fafc]">{profile.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono leading-tight">{profile.email}</p>
                </div>
              </div>
              
              <button 
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-900"
                title="Desconectar da Nuvem"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Drive operational controls container */}
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled
                className="bg-[#1a253c] hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-50 border border-[#334155] hover:border-emerald-500 p-2.5 py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 transition-colors focus:outline-none"
              >
                <CloudUpload className="h-4 w-4 text-sky-400" />
                <span className="text-[10px]">Exportar Mês</span>
              </button>

              <button
                disabled
                className="bg-[#1a253c] hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-50 border border-[#334155] hover:border-emerald-500 p-2.5 py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 transition-colors focus:outline-none"
              >
                <FileSpreadsheet className="h-4 w-4 text-amber-400" />
                <span className="text-[10px]">Backup Geral</span>
              </button>
            </div>

            {/* Backups file explorer panel list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider px-0.5">
                <span className="flex items-center gap-1"><FolderOpen className="h-3.5 w-3.5" /> Backups em Nuvem</span>
                <span className="text-sky-400 text-[9px]">Atualizar Lista</span>
              </div>

              <div className="bg-[#0f172a]/60 border border-[#334155]/60 rounded-xl max-h-[160px] overflow-y-auto divide-y divide-[#334155]/40 text-left scrollbar-thin">
                {driveFiles.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 italic">
                    Nenhum arquivo de backup encontrado.
                  </div>
                ) : (
                  driveFiles.map((file) => (
                    <div key={file.id} className="p-2.5 flex items-center justify-between group hover:bg-slate-900/30 transition-all">
                      <div className="space-y-0.5 max-w-[65%]">
                        <p className="text-[11px] font-bold truncate text-[#f8fafc] tracking-tight group-hover:text-sky-400" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-[9px] text-slate-500 font-mono leading-none">
                          {new Date(file.createdTime).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                          {file.size && ` · ${file.size}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          disabled
                          className="bg-sky-500/10 hover:bg-sky-500 hover:text-slate-950 text-sky-400 p-1 px-2 rounded-md text-[9px] font-bold transition-all"
                        >
                          Importar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
