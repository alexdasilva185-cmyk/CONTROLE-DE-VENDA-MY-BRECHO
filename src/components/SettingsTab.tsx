import React, { useState, useEffect } from 'react';
import { DailySale, AppSettings } from '../types/sales';
import { exportSalesToCSV } from '../utils/storage';
import { syncLocalSalesToCloud } from '../lib/firestoreService';
import { useAuth } from '../context/AuthContext';
import { FirebaseAuthHelperModal } from './FirebaseAuthHelperModal';
import {
  SlidersHorizontal,
  Store,
  Percent,
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  RefreshCw,
  Check,
  ShieldCheck,
  Smartphone,
  Cloud,
  CloudCheck,
  LogIn,
  LogOut,
  Database,
  ShieldAlert,
  Globe,
  ExternalLink,
  Copy,
} from 'lucide-react';

interface SettingsTabProps {
  settings: AppSettings;
  sales: DailySale[];
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  onClearAll: () => Promise<void> | void;
  onPurgeMock?: () => Promise<number | void> | void;
  onResetSample: () => Promise<void> | void;
  onImportData: (imported: DailySale[]) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  sales,
  onUpdateSettings,
  onClearAll,
  onPurgeMock,
  onResetSample,
  onImportData,
}) => {
  const {
    user,
    isLoggingIn,
    authError,
    isUnauthorizedDomain,
    currentDomain,
    signInWithGoogle,
    signOutUser,
  } = useAuth();
  const [businessName, setBusinessName] = useState(settings.businessName || '');
  const [defaultMargin, setDefaultMargin] = useState(String(settings.defaultProfitMargin || 50));
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);
  const [showAuthHelper, setShowAuthHelper] = useState(false);
  const [confirmZerarStep, setConfirmZerarStep] = useState(false);

  // Sync state whenever settings change (e.g. from cloud or initial load)
  useEffect(() => {
    if (settings.businessName) setBusinessName(settings.businessName);
    if (settings.defaultProfitMargin !== undefined) {
      setDefaultMargin(String(settings.defaultProfitMargin));
    }
  }, [settings.businessName, settings.defaultProfitMargin]);

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    const marginNum = Math.min(100, Math.max(1, parseFloat(defaultMargin) || 80));
    onUpdateSettings({
      businessName: businessName.trim() || 'MY Brechó',
      defaultProfitMargin: marginNum,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleManualCloudSync = async () => {
    if (!user) return;
    setSyncingCloud(true);
    try {
      const count = await syncLocalSalesToCloud(user.uid, sales);
      setSyncMessage(`${count} vendas sincronizadas com a nuvem!`);
      setTimeout(() => setSyncMessage(null), 3500);
    } catch {
      setSyncMessage('Erro na sincronização.');
      setTimeout(() => setSyncMessage(null), 3000);
    } finally {
      setSyncingCloud(false);
    }
  };

  const handlePurgeMockData = async () => {
    if (onPurgeMock) {
      const count = await onPurgeMock();
      setPurgeMessage(typeof count === 'number' && count > 0 ? `${count} vendas aleatórias apagadas da nuvem!` : 'Nenhum dado aleatório pendente na nuvem!');
      setTimeout(() => setPurgeMessage(null), 4000);
    }
  };

  const copyFirestorePath = () => {
    if (!user) return;
    const path = `users/${user.uid}/sales`;
    navigator.clipboard.writeText(path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleExportBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sales, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `backup_vendas_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportData(parsed);
          alert('Backup restaurado com sucesso! Suas vendas foram carregadas.');
        } else {
          alert('Arquivo de backup inválido.');
        }
      } catch {
        alert('Erro ao ler o arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="px-1">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-emerald-400" />
          <span>Ajustes & Banco de Dados</span>
        </h2>
        <p className="text-xs text-slate-400">
          Personalize seu aplicativo e sincronize seus lançamentos na nuvem
        </p>
      </div>

      {/* Cloud Database (Firestore) Integration Card */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/60 border border-emerald-500/40 p-4 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Banco de Dados em Nuvem</h3>
              <p className="text-[11px] text-emerald-300">
                {user ? 'Conectado e salvando em tempo real' : 'Armazenamento local ativo'}
              </p>
            </div>
          </div>
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>

        {user ? (
          <div className="rounded-2xl bg-slate-950/70 p-3 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full border border-emerald-500" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-white leading-tight truncate max-w-[190px]">
                    {user.displayName || user.email}
                  </p>
                  <p className="text-[10px] text-slate-400">{user.email}</p>
                </div>
              </div>
              <button
                onClick={signOutUser}
                className="text-xs font-semibold text-slate-400 hover:text-rose-400 p-1.5 rounded-lg transition"
                title="Desconectar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-emerald-500/30 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Caminho no Firebase:</span>
                <button
                  type="button"
                  onClick={copyFirestorePath}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-mono text-[10px] bg-slate-800 px-2 py-0.5 rounded cursor-pointer"
                  title="Copiar caminho da coleção"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedPath ? 'Copiado!' : `users/${user.uid.slice(0, 8)}.../sales`}</span>
                </button>
              </div>
              <p className="text-[11px] text-emerald-300 leading-tight">
                ⚡ <strong>Tempo Real Ativo:</strong> Qualquer dado novo colocado no Firebase ou no app atualiza instantaneamente no seu celular e no site.
              </p>
            </div>

            <button
              onClick={handleManualCloudSync}
              disabled={syncingCloud}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 py-2 text-xs font-bold text-emerald-300 transition cursor-pointer"
            >
              <CloudCheck className="w-4 h-4" />
              <span>{syncingCloud ? 'Sincronizando...' : syncMessage || 'Sincronizar Agora'}</span>
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-950/70 p-3.5 border border-slate-800 space-y-3">
            <p className="text-xs text-slate-300 leading-relaxed">
              Conecte sua conta do Google para sincronizar suas vendas automaticamente na nuvem. Seus dados nunca serão perdidos caso troque de aparelho!
            </p>

            {authError && (
              <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-2.5 text-xs text-rose-200 space-y-2">
                <div className="flex items-start gap-1.5 font-bold text-rose-300">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Erro ao conectar com Google</span>
                </div>
                <p className="text-[11px] leading-tight text-rose-200">
                  {authError}
                </p>
                <button
                  type="button"
                  onClick={() => setShowAuthHelper(true)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-2 px-3 text-xs transition cursor-pointer shadow"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Como Liberar Domínio da Vercel</span>
                </button>
              </div>
            )}

            <button
              onClick={signInWithGoogle}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-4 text-xs shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Conectando ao Google...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Conectar com Google</span>
                </>
              )}
            </button>

            {/* Vercel helper tip */}
            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80">
              <span>Hospedado na Vercel?</span>
              <button
                type="button"
                onClick={() => setShowAuthHelper(true)}
                className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 flex items-center gap-1 cursor-pointer"
              >
                <span>Configurar Domínio</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* General Settings Card */}
      <form
        onSubmit={handleSaveGeneral}
        className="rounded-3xl bg-slate-900 border border-slate-800 p-4 space-y-3.5 shadow-xl"
      >
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Store className="w-4 h-4 text-emerald-400" />
          Dados do seu Negócio
        </h3>

        <div>
          <label className="block text-xs text-slate-300 font-medium mb-1">
            Nome do seu Negócio / Loja:
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Ex: Minha Loja, Pastelaria do Alex..."
            className="w-full rounded-xl bg-slate-950 border border-slate-700 py-2.5 px-3 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-300 font-medium mb-1 flex items-center gap-1">
            <Percent className="w-3.5 h-3.5 text-emerald-400" />
            Margem de Lucro Padrão (%):
          </label>
          <div className="relative">
            <input
              type="number"
              value={defaultMargin}
              onChange={(e) => setDefaultMargin(e.target.value)}
              min="1"
              max="100"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 py-2.5 px-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
            />
            <span className="absolute right-3 top-2.5 text-sm font-bold text-slate-400">%</span>
          </div>

          {/* Quick preset chips */}
          <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Atalhos:</span>
            {[50, 70, 80, 85, 90].map((val) => (
              <button
                type="button"
                key={val}
                onClick={() => setDefaultMargin(String(val))}
                className={`px-2 py-0.5 rounded-lg border text-xs font-mono transition cursor-pointer ${
                  defaultMargin === String(val)
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border-slate-700'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>

          <p className="text-[11px] text-emerald-400/90 mt-1.5 leading-tight">
            ⚡ Ao salvar, o lucro diário e a média de margem do mês são <strong>atualizados automaticamente</strong> com a porcentagem escolhida.
          </p>
        </div>

        <button
          type="submit"
          className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-emerald-600 py-2.5 px-4 text-xs font-bold text-white hover:bg-emerald-500 transition cursor-pointer shadow"
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>Margem salva em {defaultMargin}%! Médias recalculadas.</span>
            </>
          ) : (
            <span>Salvar Ajustes</span>
          )}
        </button>
      </form>

      {/* Backup and Data Export */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 space-y-3 shadow-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          Segurança & Planilhas
        </h3>
        <p className="text-xs text-slate-400">
          Você tem autonomia total para exportar planilhas e backups a qualquer momento.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => exportSalesToCSV(sales)}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 py-2.5 px-3 text-xs font-bold text-teal-300 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Baixar Planilha (CSV)</span>
          </button>

          <button
            onClick={handleExportBackup}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 py-2.5 px-3 text-xs font-bold text-emerald-300 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Fazer Backup (JSON)</span>
          </button>
        </div>

        {/* Restore Backup file input */}
        <div className="pt-1">
          <label className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700/80 py-2.5 px-3 text-xs font-semibold text-slate-300 transition cursor-pointer">
            <Upload className="w-4 h-4 text-slate-400" />
            <span>Restaurar Backup do Arquivo</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Reset & Samples Management */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 space-y-2.5 shadow-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Gerenciamento do Banco de Dados
        </h3>
        <p className="text-xs text-slate-400">
          Apague os dados aleatórios criados antes ou zere o banco para colocar suas vendas reais.
        </p>

        {purgeMessage && (
          <div className="rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-2.5 text-xs text-emerald-300 font-semibold flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{purgeMessage}</span>
          </div>
        )}

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handlePurgeMockData}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 py-2.5 px-3 text-xs font-bold text-amber-300 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-amber-400" />
            <span>Apagar Dados Aleatórios da Nuvem (Firebase)</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              if (!confirmZerarStep) {
                setConfirmZerarStep(true);
                setTimeout(() => setConfirmZerarStep(false), 4500);
                return;
              }
              setConfirmZerarStep(false);
              await onClearAll();
              setPurgeMessage('Banco de dados completamente zerado e limpo!');
              setTimeout(() => setPurgeMessage(null), 3500);
            }}
            className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-bold transition cursor-pointer ${
              confirmZerarStep
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse border border-rose-400'
                : 'bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>
              {confirmZerarStep
                ? '⚠️ Confirmar: Toque aqui para APAGAR TUDO'
                : 'Zerar Todas as Vendas (Começar do Zero)'}
            </span>
          </button>
        </div>
      </div>

      {/* App Info Footer */}
      <div className="text-center text-xs text-slate-500 pt-2 pb-4">
        <div className="flex items-center justify-center gap-1 text-slate-400 font-semibold mb-1">
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>Controle de Vendas & Lucro PWA</span>
        </div>
        <p>100% responsivo para celular • Nuvem Firestore ativa • Funciona offline</p>
      </div>

      {/* Firebase Vercel Domain Authorization Helper Modal */}
      <FirebaseAuthHelperModal
        isOpen={showAuthHelper || isUnauthorizedDomain}
        onClose={() => setShowAuthHelper(false)}
      />
    </div>
  );
};
