import React, { useState } from 'react';
import { DailySale, AppSettings } from '../types/sales';
import { exportSalesToCSV } from '../utils/storage';
import { syncLocalSalesToCloud } from '../lib/firestoreService';
import { useAuth } from '../context/AuthContext';
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
} from 'lucide-react';

interface SettingsTabProps {
  settings: AppSettings;
  sales: DailySale[];
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  onClearAll: () => void;
  onResetSample: () => void;
  onImportData: (imported: DailySale[]) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  sales,
  onUpdateSettings,
  onClearAll,
  onResetSample,
  onImportData,
}) => {
  const { user, signInWithGoogle, signOutUser } = useAuth();
  const [businessName, setBusinessName] = useState(settings.businessName || '');
  const [defaultMargin, setDefaultMargin] = useState(String(settings.defaultProfitMargin || 50));
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      businessName: businessName.trim() || 'Meu Negócio',
      defaultProfitMargin: parseFloat(defaultMargin) || 50,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
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

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Suas vendas e metas estão sendo salvas e sincronizadas automaticamente no banco de dados em nuvem.
            </p>

            <button
              onClick={handleManualCloudSync}
              disabled={syncingCloud}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 py-2 text-xs font-bold text-emerald-300 transition cursor-pointer"
            >
              <CloudCheck className="w-4 h-4" />
              <span>{syncingCloud ? 'Sincronizando...' : syncMessage || 'Forçar Sincronização Agora'}</span>
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-950/70 p-3.5 border border-slate-800 space-y-2.5">
            <p className="text-xs text-slate-300 leading-relaxed">
              Conecte sua conta do Google para sincronizar suas vendas automaticamente na nuvem. Seus dados nunca serão perdidos caso troque de aparelho!
            </p>
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-4 text-xs shadow-md transition cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Conectar com Google</span>
            </button>
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
          <p className="text-[11px] text-slate-400 mt-1">
            Usada quando você preferir calcular o lucro por porcentagem estimada.
          </p>
        </div>

        <button
          type="submit"
          className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-emerald-600 py-2.5 px-4 text-xs font-bold text-white hover:bg-emerald-500 transition cursor-pointer shadow"
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>Ajustes Salvos!</span>
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
          Gerenciar Dados de Demonstração
        </h3>
        <p className="text-xs text-slate-400">
          Quer começar do zero com seus dados reais ou restaurar os exemplos de teste?
        </p>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => {
              if (confirm('Deseja recarregar os dados de exemplo para testar as médias?')) {
                onResetSample();
              }
            }}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 py-2 px-3 text-xs font-semibold text-slate-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            <span>Dados de Exemplo</span>
          </button>

          <button
            onClick={() => {
              if (confirm('Tem certeza que deseja apagar todas as vendas registradas e começar zerado?')) {
                onClearAll();
              }
            }}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 py-2 px-3 text-xs font-semibold text-rose-300 transition"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Limpar Tudo</span>
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
    </div>
  );
};
