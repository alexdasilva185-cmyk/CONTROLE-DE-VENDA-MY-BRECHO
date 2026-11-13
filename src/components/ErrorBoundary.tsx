import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export async function clearServiceWorkerCachesAndReload(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister().catch(() => false)));
    }
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name).catch(() => false)));
    }
  } catch (err) {
    console.warn('Erro ao limpar cache do Service Worker:', err);
  }
  const url = new URL(window.location.href);
  url.searchParams.set('v', String(Date.now()));
  window.location.replace(url.toString());
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : 'Erro inesperado ao carregar os dados.';
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    console.error('Erro capturado pelo ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-5">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xl font-black">
              !
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-extrabold text-white">
                Não foi possível abrir esta tela
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                O aplicativo encontrou um dado inconsistente ou uma atualização em andamento. Seus dados salvos estão protegidos.
              </p>
            </div>

            {this.state.errorMessage && (
              <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-2.5 text-[11px] font-mono text-rose-300 break-words text-left max-h-24 overflow-y-auto">
                {this.state.errorMessage}
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, errorMessage: '' })}
                className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-3 px-4 transition cursor-pointer"
              >
                Tentar Novamente
              </button>
              <button
                type="button"
                onClick={() => {
                  void clearServiceWorkerCachesAndReload();
                }}
                className="w-full rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold text-xs py-2.5 px-4 transition cursor-pointer"
              >
                Limpar Cache e Recarregar App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
