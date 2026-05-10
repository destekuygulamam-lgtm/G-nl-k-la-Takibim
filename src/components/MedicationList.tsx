import { useState, useMemo } from 'react';
import { Medication } from '../types';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Pill, Bell, BellOff, Info, CheckCircle2, ChevronRight, X, Play, Pause, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import MedicationDetailModal from './MedicationDetailModal';
import EditMedicationModal from './EditMedicationModal';
import { Settings } from '../hooks/useSettings';

interface MedicationListProps {
  medHook: {
    medications: Medication[];
    logs: any[];
    deleteMedication: (id: string) => void;
    updateMedication: (id: string, updates: Partial<Medication>) => void;
  };
  settingsHook: {
    settings: Settings;
    updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  };
}

export default function MedicationList({ medHook, settingsHook }: MedicationListProps) {
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('Tümü');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const lowStockThreshold = settingsHook.settings.lowStockThreshold;

  const categories = useMemo(() => ['Tümü', ...Array.from(new Set(medHook.medications.map(m => m.category || 'Diğer')))], [medHook.medications]);

  const filteredMeds = useMemo(() => medHook.medications.filter(m => 
    categoryFilter === 'Tümü' || (m.category === categoryFilter) || (categoryFilter === 'Diğer' && !m.category)
  ), [medHook.medications, categoryFilter]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'reminders_on' | 'reminders_off' | 'delete') => {
    if (selectedIds.length === 0) return;

    try {
      for (const id of selectedIds) {
        if (action === 'activate') await medHook.updateMedication(id, { active: true });
        if (action === 'deactivate') await medHook.updateMedication(id, { active: false });
        if (action === 'reminders_on') await medHook.updateMedication(id, { reminderEnabled: true });
        if (action === 'reminders_off') await medHook.updateMedication(id, { reminderEnabled: false });
        if (action === 'delete') await medHook.deleteMedication(id);
      }
      
      const actionLabels = {
        activate: 'aktif edildi',
        deactivate: 'duraklatıldı',
        reminders_on: 'hatırlatıcıları açıldı',
        reminders_off: 'hatırlatıcıları kapatıldı',
        delete: 'silindi'
      };
      
      toast.success(`${selectedIds.length} ilaç ${actionLabels[action]}.`);
      setSelectedIds([]);
    } catch (error) {
      toast.error('İşlem sırasında bir hata oluştu.');
    }
  };

  const toggleActive = (id: string, currentState: boolean) => {
    medHook.updateMedication(id, { active: !currentState });
    toast.info(!currentState ? 'İlaç takibi aktif edildi.' : 'İlaç takibi duraklatıldı.');
  };

  return (
    <div className="flex flex-col gap-8 pb-8">
      <section className="flex items-end justify-between px-6">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ENVANTER</p>
          <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight">İlaçlarım</h2>
        </div>
        {medHook.medications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (selectedIds.length === filteredMeds.length) {
                setSelectedIds([]);
              } else {
                setSelectedIds(filteredMeds.map(m => m.id));
              }
            }}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600"
          >
            {selectedIds.length === filteredMeds.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
          </Button>
        )}
      </section>

      {medHook.medications.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-6 pb-2 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                categoryFilter === cat 
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                  : 'bg-white border border-slate-100 text-slate-400 hover:text-slate-600 shadow-sm'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4 px-4">
        {medHook.medications.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center rounded-[3rem] border border-dashed border-slate-200 bg-white py-20 text-center shadow-sm"
          >
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-linear-to-br from-blue-50 to-indigo-50 text-blue-600 shadow-inner">
              <FolderPlus size={36} strokeWidth={1.5} />
            </div>
            <h3 className="font-display mb-2 text-lg font-bold text-slate-800">Henüz ilaç eklenmedi</h3>
            <p className="max-w-[200px] text-xs font-medium leading-relaxed text-slate-400 uppercase tracking-wide">
              Takibi başlatmak için yukarıdaki "+" butonuna basarak ilk ilacınızı ekleyin.
            </p>
          </motion.div>
        ) : (
          filteredMeds.map((med, index) => (
            <motion.div
              key={med.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ duration: 0.4, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
            >
              <Card className={`overflow-hidden border-slate-100 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow bg-white ${!med.active ? 'opacity-60 grayscale-[0.5]' : ''} ${selectedIds.includes(med.id) ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
                <CardContent className="p-0">
                <div className="flex items-center gap-4 p-5">
                  <button 
                    onClick={() => toggleSelection(med.id)}
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all shrink-0 ${
                      selectedIds.includes(med.id) 
                        ? 'bg-blue-600 border-blue-600 text-white scale-110' 
                        : 'border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    {selectedIds.includes(med.id) && <CheckCircle2 size={14} strokeWidth={3} />}
                  </button>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl overflow-hidden shrink-0 ${
                    !med.active ? 'bg-slate-100 text-slate-300' : (med.stock < lowStockThreshold ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-600')
                  }`}>
                    {med.imageUrl ? (
                      <img src={med.imageUrl} alt={med.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Pill size={24} />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                       <span className="text-base font-bold text-slate-800">{med.name}</span>
                       {med.reminderEnabled && <Bell size={14} className="text-blue-500 opacity-80" />}
                       {!med.active && <Badge variant="secondary" className="bg-slate-200 text-slate-500 text-[8px] font-black uppercase">DURAKLATILDI</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-blue-50/50 text-[8px] font-black uppercase tracking-widest text-blue-600 rounded-full px-2 py-0 border-none">
                        {med.category || 'DİĞER'}
                      </Badge>
                       <Badge variant="secondary" className="bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-500 rounded-full px-2 py-0 border-none">
                        {med.frequency === 'daily' ? 'GÜNLÜK' : 'HAFTALIK'}
                      </Badge>
                      <Badge variant="secondary" className="bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-500 rounded-full px-2 py-0 border-none">
                        {med.times.length} DOZ/GÜN
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 border-r border-slate-100 pr-4">
                      <span className="text-[10px] font-bold text-slate-400 select-none uppercase tracking-widest">{med.active ? "Aktif" : "Pasif"}</span>
                      <Switch 
                        checked={med.active} 
                        onCheckedChange={() => toggleActive(med.id, med.active)} 
                        className="data-[state=checked]:bg-emerald-500 shadow-sm" 
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => medHook.deleteMedication(med.id)}
                      className="h-10 w-10 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-xl"
                    >
                      <Trash2 size={20} />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 bg-slate-50/50 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">STOK DURUMU:</span>
                    <span className={`text-[10px] font-black ${med.stock < lowStockThreshold ? 'text-orange-500' : 'text-slate-600'}`}>
                      {med.stock} {med.unit.toUpperCase()} KALDI
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setSelectedMed(med)}
                      className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-blue-600 transition-colors"
                    >
                      <Info size={12} />
                      DETAY
                    </button>
                    <button 
                      onClick={() => setEditingMed(med)}
                      className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline disabled:opacity-30" 
                      disabled={!med.active}
                    >
                      DÜZENLE
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          ))
        )}
      </div>

      <MedicationDetailModal
        isOpen={!!selectedMed}
        onClose={() => setSelectedMed(null)}
        medication={selectedMed}
        logs={medHook.logs}
        updateMedication={medHook.updateMedication}
        settings={settingsHook.settings}
      />

      <EditMedicationModal
        isOpen={!!editingMed}
        onClose={() => setEditingMed(null)}
        medication={editingMed}
        updateMedication={medHook.updateMedication}
      />

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-50"
          >
            <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3 pl-2">
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center font-black text-xs">
                  {selectedIds.length}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">İlaç Seçildi</span>
                  <button 
                    onClick={() => setSelectedIds([])}
                    className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 hover:text-white transition-colors"
                  >
                    <X size={10} /> Seçimi Kaldır
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-10 w-10 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
                  title="Hatırlatıcıları Aç"
                  onClick={() => handleBulkAction('reminders_on')}
                >
                  <Bell size={18} />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-10 w-10 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
                  title="Hatırlatıcıları Kapat"
                  onClick={() => handleBulkAction('reminders_off')}
                >
                  <BellOff size={18} />
                </Button>
                <div className="w-px h-6 bg-slate-800 mx-1" />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-10 w-10 text-emerald-500 hover:text-emerald-400 hover:bg-slate-800 rounded-xl"
                  title="Aktifleştir"
                  onClick={() => handleBulkAction('activate')}
                >
                  <Play size={18} fill="currentColor" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-10 w-10 text-amber-500 hover:text-amber-400 hover:bg-slate-800 rounded-xl"
                  title="Duraklat"
                  onClick={() => handleBulkAction('deactivate')}
                >
                  <Pause size={18} fill="currentColor" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-10 w-10 text-red-500 hover:text-red-400 hover:bg-slate-800 rounded-xl"
                  title="Hepsini Sil"
                  onClick={() => handleBulkAction('delete')}
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
