/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Pill, Box, History as HistoryIcon, Plus, Palette, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { useMedications } from '@/hooks/useMedications';
import { useReminders } from '@/hooks/useReminders';
import { useTheme, ThemeColor } from '@/hooks/useTheme';
import { useSettings } from '@/hooks/useSettings';
import Dashboard from '@/components/Dashboard';
import MedicationList from '@/components/MedicationList';
import StockManager from '@/components/StockManager';
import LogHistory from '@/components/LogHistory';
import AIAssistant from '@/components/AIAssistant';
import AddMedicationModal from '@/components/AddMedicationModal';
import SettingsModal from '@/components/SettingsModal';

const THEMES: { id: ThemeColor; colorClass: string; label: string }[] = [
  { id: 'blue', colorClass: 'bg-blue-600', label: 'Mavi' },
  { id: 'emerald', colorClass: 'bg-emerald-500', label: 'Zümrüt' },
  { id: 'violet', colorClass: 'bg-violet-500', label: 'Mor' },
  { id: 'rose', colorClass: 'bg-rose-500', label: 'Gül' },
  { id: 'amber', colorClass: 'bg-amber-500', label: 'Kehribar' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const medHook = useMedications();
  const { theme, setTheme } = useTheme();
  const settingsHook = useSettings();

  useReminders(medHook.medications, settingsHook.settings);

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <Dashboard medHook={medHook} settingsHook={settingsHook} />;
      case 'meds': return <MedicationList medHook={medHook} settingsHook={settingsHook} />;
      case 'stock': return <StockManager medHook={medHook} settingsHook={settingsHook} />;
      case 'history': return <LogHistory medHook={medHook} settingsHook={settingsHook} />;
      case 'ai': return <AIAssistant medHook={medHook} />;
      default: return <Dashboard medHook={medHook} settingsHook={settingsHook} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-800">
      <header className="sticky top-0 z-50 border-b border-white/40 bg-white/70 py-4 backdrop-blur-xl transition-all">
        <div className="mx-auto flex max-w-md items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[1.25rem] bg-linear-to-br from-blue-600 to-indigo-600 text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.4)]">
              <Pill size={24} strokeWidth={2.2} />
            </div>
            <div className="flex flex-col">
              <h1 className="font-display text-lg font-bold tracking-tight text-slate-900 leading-none">
                Günlük İlaç Takibim
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Sağlık Asistanınız</p>
            </div>
          </div>
          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-500 transition-all hover:bg-slate-50 hover:border-slate-200 shadow-sm"
            >
              <SettingsIcon size={19} strokeWidth={2.2} />
            </button>
            <button
              onClick={() => setIsThemeOpen(!isThemeOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-500 transition-all hover:bg-slate-50 hover:border-slate-200 shadow-sm"
            >
              <Palette size={19} strokeWidth={2.2} />
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              id="add-med-btn"
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-black/10 transition-all hover:scale-105 active:scale-95 hover:bg-black"
            >
              <Plus size={20} strokeWidth={2.5} />
            </button>

            {isThemeOpen && (
              <div className="absolute right-0 top-14 w-48 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl shadow-slate-200/50">
                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Tema Seçimi</p>
                <div className="flex flex-col gap-1">
                  {THEMES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTheme(t.id);
                        setIsThemeOpen(false);
                      }}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                        theme === t.id ? 'bg-slate-50 text-slate-900' : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-4 w-4 rounded-full ${t.colorClass}`} />
                        <span>{t.label}</span>
                      </div>
                      {theme === t.id && <div className="h-2 w-2 rounded-full bg-slate-900" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md pt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-lg h-16 glass-card rounded-[2rem] px-4 flex items-center justify-between">
        <NavButton
          active={activeTab === 'home'}
          onClick={() => setActiveTab('home')}
          icon={<Home size={22} strokeWidth={activeTab === 'home' ? 2.5 : 2} />}
          label="Takvim"
        />
        <NavButton
          active={activeTab === 'meds'}
          onClick={() => setActiveTab('meds')}
          icon={<Pill size={22} strokeWidth={activeTab === 'meds' ? 2.5 : 2} />}
          label="İlaçlar"
        />
        <NavButton
          active={activeTab === 'ai'}
          onClick={() => setActiveTab('ai')}
          icon={<Sparkles size={22} strokeWidth={activeTab === 'ai' ? 2.5 : 2} />}
          label="Asistan"
        />
        <NavButton
          active={activeTab === 'stock'}
          onClick={() => setActiveTab('stock')}
          icon={<Box size={22} strokeWidth={activeTab === 'stock' ? 2.5 : 2} />}
          label="Stok"
        />
        <NavButton
          active={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
          icon={<HistoryIcon size={22} strokeWidth={activeTab === 'history' ? 2.5 : 2} />}
          label="Analiz"
        />
      </nav>

      <AddMedicationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        addMedication={medHook.addMedication}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        medHook={medHook}
        settingsHook={settingsHook}
      />

      <Toaster position="top-center" richColors />
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center h-full px-4 transition-all duration-300 ${
        active ? 'text-blue-600' : 'text-slate-400 group'
      }`}
    >
      {active && (
        <motion.div 
          layoutId="nav-glow"
          className="absolute inset-x-0 -top-2 flex justify-center"
        >
          <div className="h-1 shadow-[0_-8px_16px_rgba(37,99,235,0.4)] w-1 bg-blue-600 rounded-full" />
        </motion.div>
      )}
      <div className={`transition-transform duration-300 ${active ? '-translate-y-0.5 scale-110' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
      <span className={`text-[9px] font-bold mt-0.5 transition-all duration-300 ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
        {label}
      </span>
    </button>
  );
}

