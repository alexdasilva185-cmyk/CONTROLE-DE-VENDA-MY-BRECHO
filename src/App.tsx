import React, { useState } from 'react';
import { useSalesData } from './hooks/useSalesData';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { TodayTab } from './components/TodayTab';
import { MonthTab } from './components/MonthTab';
import { GoalsTab } from './components/GoalsTab';
import { SettingsTab } from './components/SettingsTab';
import { SaleFormModal } from './components/SaleFormModal';
import { CalculatorModal } from './components/CalculatorModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { FirebaseAuthHelperModal } from './components/FirebaseAuthHelperModal';
import { useAuth } from './context/AuthContext';
import { DailySale } from './types/sales';

export default function App() {
  const {
    sales,
    currentMonthSales,
    settings,
    selectedYear,
    selectedMonth,
    setSelectedYear,
    setSelectedMonth,
    monthSummary,
    todaySale,
    allRecentTransactions,
    isLoaded,
    addOrUpdateSale,
    deleteSale,
    deleteSaleEntry,
    updateSettings,
    clearAllData,
    purgeMockData,
    resetToSampleData,
    importData,
  } = useSalesData();

  const { isUnauthorizedDomain, clearAuthError } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('today');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState<DailySale | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleOpenNewSale = (sale?: DailySale) => {
    setSaleToEdit(sale || null);
    setIsModalOpen(true);
  };

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-emerald-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-slate-300">Carregando Controle de Vendas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Mobile container centered on desktop screens */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col relative bg-slate-950 shadow-2xl min-h-screen border-x border-slate-800/40">
        {/* Top Header */}
        <Header
          businessName={settings.businessName}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onOpenNewSale={() => handleOpenNewSale()}
          onOpenCalculator={() => setIsCalculatorOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 space-y-4">
          {/* PWA Install Banner */}
          <PWAInstallBanner />

          {/* Active Tab View */}
          {currentTab === 'today' && (
            <TodayTab
              todaySale={todaySale}
              allSales={sales}
              allRecentTransactions={allRecentTransactions}
              monthSummary={monthSummary}
              onOpenNewSale={handleOpenNewSale}
              onDeleteSale={deleteSale}
              onDeleteSaleEntry={deleteSaleEntry}
            />
          )}

          {currentTab === 'month' && (
            <MonthTab
              summary={monthSummary}
              monthSales={currentMonthSales}
              settings={settings}
              onOpenNewSale={handleOpenNewSale}
            />
          )}

          {currentTab === 'goals' && (
            <GoalsTab
              summary={monthSummary}
              settings={settings}
              onUpdateSettings={updateSettings}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsTab
              settings={settings}
              sales={sales}
              onUpdateSettings={updateSettings}
              onClearAll={clearAllData}
              onPurgeMock={purgeMockData}
              onResetSample={resetToSampleData}
              onImportData={importData}
            />
          )}
        </main>

        {/* Bottom Ergonomic Mobile Navigation */}
        <BottomNav
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          onOpenNewSale={() => handleOpenNewSale()}
        />

        {/* Modal for adding/editing sales results */}
        <SaleFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSaleToEdit(null);
          }}
          onSave={addOrUpdateSale}
          initialSale={saleToEdit}
          settings={settings}
          existingSales={sales}
        />

        {/* Global In-App Quick Calculator */}
        <CalculatorModal
          isOpen={isCalculatorOpen}
          onClose={() => setIsCalculatorOpen(false)}
          onLaunchAsSale={(calculatedVal) => {
            handleOpenNewSale({
              id: '',
              date: '',
              totalSales: calculatedVal,
              cost: 0,
              profit: 0,
              profitMargin: 0,
              salesCount: 1,
              averageTicket: calculatedVal,
              createdAt: '',
              updatedAt: '',
            });
          }}
        />

        {/* Global Firebase Vercel Domain Helper Modal */}
        <FirebaseAuthHelperModal
          isOpen={isUnauthorizedDomain}
          onClose={clearAuthError}
        />
      </div>
    </div>
  );
}
