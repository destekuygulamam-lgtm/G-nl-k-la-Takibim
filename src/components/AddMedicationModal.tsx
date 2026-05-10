import React, { useState } from 'react';
import { Medication } from '../types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, X } from 'lucide-react';
import { MedicationImageUpload } from './MedicationImageUpload';

interface AddMedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  addMedication: (med: Omit<Medication, 'id' | 'active'>) => void;
}

export default function AddMedicationModal({ isOpen, onClose, addMedication }: AddMedicationModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Diğer');
  const [dosage, setDosage] = useState(() => localStorage.getItem('lastDosage') || '');
  const [unit, setUnit] = useState(() => localStorage.getItem('lastUnit') || 'Tablet');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'as_needed'>('daily');
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [stock, setStock] = useState('30');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleAddTime = () => setTimes([...times, '08:00']);
  const handleRemoveTime = (index: number) => setTimes(times.filter((_, i) => i !== index));
  const handleTimeChange = (index: number, value: string) => {
    const newTimes = [...times];
    newTimes[index] = value;
    setTimes(newTimes);
  };

  const handleReminderToggle = (checked: boolean) => {
    setReminderEnabled(checked);
    if (checked && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      } else if (Notification.permission === 'denied') {
        toast.error('Bildirim izinleri kapalı. Hatırlatıcılar için tarayıcı ayarlarından bildirimlere izin vermelisiniz.');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dosage || times.length === 0) return;

    addMedication({
      name,
      dosage,
      unit,
      frequency,
      times,
      stock: parseInt(stock) || 0,
      totalStock: parseInt(stock) || 0,
      startDate: new Date().toISOString(),
      category,
      reminderEnabled,
      notes,
      ...(imageUrl ? { imageUrl } : {}),
    });

    // Save last used values
    localStorage.setItem('lastDosage', dosage);
    localStorage.setItem('lastUnit', unit);

    // Reset
    setName('');
    setCategory('Diğer');
    setDosage('');
    setTimes(['08:00']);
    setReminderEnabled(true);
    setNotes('');
    setImageUrl('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-slate-100 p-6 sm:p-8 shadow-2xl sm:max-w-md">
        <DialogHeader className="mb-4 sm:mb-6">
          <DialogTitle className="text-2xl font-bold tracking-tight text-slate-800">İlaç Ekle</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <MedicationImageUpload 
            value={imageUrl} 
            onChange={setImageUrl} 
            medicationName={name}
          />

          <div className="space-y-2">
            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              İlaç Adı
            </Label>
            <Input
              id="name"
              placeholder="Örn: Nexium 40mg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 px-5 text-base font-medium placeholder:text-slate-300 focus-visible:ring-blue-600/20"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Kategori
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 px-5 text-base font-medium focus:ring-blue-600/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100">
                <SelectItem value="Ağrı Kesici">Ağrı Kesici</SelectItem>
                <SelectItem value="Vitamin">Vitamin</SelectItem>
                <SelectItem value="Antibiyotik">Antibiyotik</SelectItem>
                <SelectItem value="Kronik">Kronik</SelectItem>
                <SelectItem value="Alerji">Alerji</SelectItem>
                <SelectItem value="Takviye">Takviye</SelectItem>
                <SelectItem value="Diğer">Diğer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dosage" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Miktar / Doz (Örn: 1, 500)
              </Label>
              <Input
                id="dosage"
                type="text"
                placeholder="Örn: 1 veya 500"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 px-5 text-base font-medium focus-visible:ring-blue-600/20"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Birim</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 px-5 text-base font-medium focus:ring-blue-600/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100">
                  <SelectItem value="mg">mg</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="Tablet">Tablet</SelectItem>
                  <SelectItem value="Kapsül">Kapsül</SelectItem>
                  <SelectItem value="Ölçek">Ölçek</SelectItem>
                  <SelectItem value="Damla">Damla</SelectItem>
                  <SelectItem value="Puff">Puff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  HATIRLATICI
                </Label>
                <span className="text-xs text-slate-500 font-medium">Bu ilaç için bildirim al</span>
              </div>
              <Switch checked={reminderEnabled} onCheckedChange={handleReminderToggle} className="data-[state=checked]:bg-blue-600" />
            </div>
            
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  KULLANIM SAATLERİ
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddTime}
                  className="h-8 gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50"
                >
                  <Plus size={14} /> Saat Ekle
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const newTimes = Array.from(new Set([...times, '08:00'])).sort();
                    setTimes(newTimes);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                >
                  Sabah ☀️
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newTimes = Array.from(new Set([...times, '13:00'])).sort();
                    setTimes(newTimes);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                >
                  Öğle 🌤️
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newTimes = Array.from(new Set([...times, '20:00'])).sort();
                    setTimes(newTimes);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                >
                  Akşam 🌙
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {times.map((time, idx) => (
                <div key={idx} className="relative group">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => handleTimeChange(idx, e.target.value)}
                    className="h-12 w-full rounded-2xl border-slate-100 bg-slate-50/50 px-3 text-sm font-bold font-mono focus-visible:ring-blue-600/20"
                  />
                  {times.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTime(idx)}
                      className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-500 hover:text-white"
                    >
                      <X size={10} strokeWidth={3} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              TOPLAM STOK
            </Label>
            <Input
              id="stock"
              type="number"
              placeholder="30"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 px-5 text-base font-medium focus-visible:ring-blue-600/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              NOTLAR (İSTEĞE BAĞLI)
            </Label>
            <textarea
              id="notes"
              placeholder="Aç karnına içilecek, bol su ile vs."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-sm font-medium placeholder:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20 resize-y"
            />
          </div>

          <Button type="submit" className="mt-4 h-16 rounded-3xl bg-slate-900 text-sm font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-slate-200 transition-all hover:bg-black hover:scale-[1.02] active:scale-[0.98]">
            KAYDET
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
