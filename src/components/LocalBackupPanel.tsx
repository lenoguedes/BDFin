import { useState, useRef } from "react";
import { MonthCompetence, Transaction } from "../types";
import { Download, Upload, Check, AlertCircle, FileJson, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface LocalBackupPanelProps {
  activeMonthYear: string;
  currentTransactions: Transaction[];
  competences: Record<string, MonthCompetence>;
  categoriesConfig: any[];
  onRestoreCompetences: (newCompetences: Record<string, MonthCompetence>) => void;
  onRestoreCategoriesConfig?: (newCategories: any[]) => void;
  onAddSystemMessage: (text: string) => void;
}

export default function LocalBackupPanel({
  activeMonthYear,
  currentTransactions,
  competences,
  categoriesConfig,
  onRestoreCompetences,
  onRestoreCategoriesConfig,
  onAddSystemMessage
}: LocalBackupPanelProps) {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download utilities
  const downloadJSON = (data: any, filename: string) => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportMonth = () => {
    const data = {
      version: "bdfin-v1",
      type: "month_backup",
      monthYear: activeMonthYear,
      income: competences[activeMonthYear]?.income || 4000.00,
      transactions: currentTransactions,
      exportedAt: new Date().toISOString()
    };
    const sanitizedMonth = activeMonthYear.replace(/\s+/g, "_");
    downloadJSON(data, `bdfin_backup_mes_${sanitizedMonth}.json`);
    onAddSystemMessage(`💾 **Backup local exportado:** Competência **${activeMonthYear}** baixada como JSON.`);
    showNotification("Backup mensal baixado!", "success");
  };

  const handleExportFull = () => {
    const data = {
      version: "bdfin-v1",
      type: "full_backup",
      competences: competences,
      categoriesConfig: categoriesConfig,
      exportedAt: new Date().toISOString()
    };
    downloadJSON(data, `bdfin_backup_geral_${new Date().toISOString().split("T")[0]}.json`);
    onAddSystemMessage("💾 **Backup local completo exportado:** Todas as competências e configurações baixadas.");
    showNotification("Backup geral baixado!", "success");
  };

  // Notification triggers
  const showNotification = (msg: string, type: "success" | "error") => {
    if (type === "success") {
      setSuccessMsg(msg);
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(msg);
      setSuccessMsg(null);
      setTimeout(() => setErrorMsg(null), 6000);
    }
  };

  // File parsing logic
  const processUploadedFile = (file: File) => {
    if (!file) return;
    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      showNotification("Por favor, envie um arquivo .json válido.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        
        // Let's support both BDFin and FinOps legacy models
        const isMonthBackup = parsed.type === "month_backup" || parsed.monthYear !== undefined;
        const isFullBackup = parsed.type === "full_backup" || parsed.competences !== undefined;

        if (isMonthBackup) {
          const targetMonth = parsed.monthYear || activeMonthYear;
          const updated = {
            ...competences,
            [targetMonth]: {
              monthYear: targetMonth,
              income: parsed.income || 4000.00,
              transactions: parsed.transactions || []
            }
          };
          onRestoreCompetences(updated);
          onAddSystemMessage(`📥 **Backup local restaurado:** Dados de **${targetMonth}** foram carregados com sucesso.`);
          showNotification(`Dados de ${targetMonth} restaurados!`, "success");
        } else if (isFullBackup) {
          onRestoreCompetences(parsed.competences);
          if (parsed.categoriesConfig && onRestoreCategoriesConfig) {
            onRestoreCategoriesConfig(parsed.categoriesConfig);
          }
          onAddSystemMessage(`📥 **Backup local completo restaurado:** Todas as competências carregadas com sucesso.`);
          showNotification("Backup total importado!", "success");
        } else {
          showNotification("Estrutura do arquivo JSON inválida.", "error");
        }
      } catch (err) {
        showNotification("Erro ao processar JSON. Arquivo corrompido.", "error");
      }
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
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
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  return (
    <div className="bg-[#1e293b] p-5 rounded-2xl border border-[#334155] shadow-md space-y-4">
      
      {/* Title Block */}
      <div className="flex items-center justify-between border-b border-[#334155] pb-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-sky-400" />
          <h3 className="font-bold text-sm text-[#f8fafc] uppercase tracking-wide flex items-center gap-1.5">
            <FileJson className="h-4 w-4 text-sky-400" />
            Backup Local Offline
          </h3>
        </div>
        <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
          Sem Internet
        </span>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        Garante a soberania e segurança total dos seus dados. Salve os backups diretamente na memória do seu dispositivo ou recupere um backup anterior.
      </p>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleExportMonth}
          className="bg-slate-900/60 hover:bg-sky-500/10 hover:text-sky-400 border border-[#334155] hover:border-sky-500 p-2.5 py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 transition-colors focus:outline-none"
          title="Fazer download apenas do mês ativo"
        >
          <Download className="h-4 w-4 text-sky-400" />
          <span className="text-[10px]">Baixar Mês Ativo</span>
        </button>

        <button
          onClick={handleExportFull}
          className="bg-slate-900/60 hover:bg-sky-500/10 hover:text-sky-400 border border-[#334155] hover:border-sky-500 p-2.5 py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 transition-colors focus:outline-none"
          title="Fazer download de todo histórico e regras"
        >
          <Download className="h-4 w-4 text-amber-400" />
          <span className="text-[10px]">Baixar Tudo (Geral)</span>
        </button>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          dragActive 
            ? "border-sky-400 bg-sky-500/5 text-sky-300" 
            : "border-[#334155] bg-slate-950/20 hover:bg-slate-950/40 text-slate-400 hover:border-slate-400"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
        <Upload className="h-5 w-5 mx-auto mb-1.5 text-sky-400 animate-pulse" />
        <p className="text-[11px] font-bold">Arraste o arquivo JSON ou clique aqui</p>
        <p className="text-[9px] text-slate-500 mt-0.5">Suporta backups mensais ou gerais</p>
      </div>

      {/* Notifications info */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="p-2 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 flex items-center gap-1.5 text-[10px]"
          >
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="p-2 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 flex items-center gap-1.5 text-[10px]"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
