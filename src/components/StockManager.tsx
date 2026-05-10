import React, { useState } from 'react';
import { Medication } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, ShoppingBag, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Settings } from '../hooks/useSettings';

interface StockManagerProps {
  medHook: {
    medications: Medication[];
    updateMedication: (id: string, updates: Partial<Medication>) => void;
  };
  settingsHook: {
    settings: Settings;
    updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  };
}

export default function StockManager({ medHook, settingsHook }: StockManagerProps) {
  const [refillMedId, setRefillMedId] = useState<string | null>(null);
  const [refillAmount, setRefillAmount] = useState<string>('30');
  const lowStockThreshold = settingsHook.settings.lowStockThreshold;
  const lowStockMeds = medHook.medications.filter(m => m.stock < lowStockThreshold);

  const handleRefill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refillMedId) return;

    const med = medHook.medications.find(m => m.id === refillMedId);
    if (med) {
      const amountToAdd = parseInt(refillAmount) || 0;
      if (amountToAdd > 0) {
        medHook.updateMedication(med.id, {
          stock: med.stock + amountToAdd,
          totalStock: Math.max(med.totalStock || 0, med.stock + amountToAdd)
        });
        toast.success(`${med.name} stoku güncellendi`);
      }
    }
    setRefillMedId(null);
    setRefillAmount('30');
  };

  const selectedMed = medHook.medications.find(m => m.id === refillMedId);

  return (
    <div className="flex flex-col gap-8 pb-8">
      <section className="flex flex-col gap-1 px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">İLERLEME</p>
        <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight">Stok Yönetimi</h2>
      </section>

      {lowStockMeds.length > 0 && (
        <div className="px-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-[2rem] bg-orange-50 border border-orange-100 p-6 shadow-sm shadow-orange-100/50"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center text-white shrink-0">
                 <AlertCircle size={24} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-orange-800 uppercase tracking-tight">Kritik Stok</span>
                <p className="text-xs font-medium text-orange-700 leading-relaxed">
                  {lowStockMeds.length} adet ilacınız tükenmek üzere. Hemen yeni reçete planlamanızı öneririz.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="flex flex-col gap-5 px-4">
        {medHook.medications.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center rounded-[3rem] border border-dashed border-slate-200 bg-white py-20 text-center shadow-sm"
          >
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-linear-to-br from-blue-50 to-indigo-50 text-blue-600 shadow-inner">
              <ShoppingBag size={36} strokeWidth={1.5} />
            </div>
            <h3 className="font-display mb-2 text-lg font-bold text-slate-800">Envanter Boş</h3>
            <p className="max-w-[200px] text-xs font-medium leading-relaxed text-slate-400 uppercase tracking-wide">
              Stok takibi yapabilmek için önce ilaç listenize ekleme yapmalısınız.
            </p>
          </motion.div>
        ) : (
          medHook.medications.map((med) => {
            const stockPercent = Math.min((med.stock / (med.totalStock || 30)) * 100, 100);
            return (
              <Card key={med.id} className="overflow-hidden border-slate-100 rounded-[2rem] shadow-sm bg-white">
                <CardContent className="flex flex-col gap-6 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-lg font-bold text-slate-800">{med.name}</span>
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">{med.dosage} {med.unit}</span>
                    </div>
                    <Badge className={`rounded-full px-3 py-1 font-black text-[10px] tracking-widest border-none ${
                        med.stock < lowStockThreshold ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'
                      }`}>
                      {med.stock} KALAN
                    </Badge>
                  </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        <span>STOK SEVİYESİ</span>
                        <span className={med.stock < lowStockThreshold ? 'text-orange-500' : 'text-blue-600'}>{Math.round(stockPercent)}%</span>
                      </div>
                      <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${stockPercent}%` }}
                          transition={{ type: 'spring', stiffness: 50, damping: 10 }}
                          className={`h-full rounded-full ${
                            med.stock < lowStockThreshold ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-blue-600'
                          }`}
                        />
                      </div>
                    </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      onClick={() => setRefillMedId(med.id)}
                      className="flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-slate-200 transition-transform active:scale-95"
                    >
                      <ShoppingBag size={14} /> REÇETE EKLE
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={!!refillMedId} onOpenChange={(open) => !open && setRefillMedId(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-6 border-slate-100 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <ShoppingBag className="text-blue-600" />
              Reçete / Stok Ekle
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              {selectedMed?.name} ilacı için envantere eklenecek miktarı girin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRefill} className="flex flex-col gap-6 mt-4">
            <div className="flex flex-col gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Eklenecek Miktar</Label>
              <Input
                type="number"
                min="1"
                value={refillAmount}
                onChange={(e) => setRefillAmount(e.target.value)}
                className="h-14 rounded-2xl border-slate-100 bg-slate-50 text-lg font-bold shadow-inner focus-visible:ring-blue-600 px-4"
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-200">
                STOĞA EKLE
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
