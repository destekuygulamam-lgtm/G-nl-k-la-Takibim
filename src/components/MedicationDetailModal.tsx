import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Medication, MedicationLog } from '../types';
import { Settings } from '../hooks/useSettings';
import { PALETTES } from '../constants';
import { format, subDays, parseISO, isSameDay, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Pill, Activity, Box, Info, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ImageCropDialog } from './ImageCropDialog';

interface MedicationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  medication: Medication | null;
  logs: MedicationLog[];
  updateMedication?: (id: string, updates: Partial<Medication>) => void;
  settings?: Settings;
}

export default function MedicationDetailModal({ isOpen, onClose, medication, logs, updateMedication, settings }: MedicationDetailModalProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notesInput, setNotesInput] = useState('');
  const [isCropping, setIsCropping] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  
  // Update effect to reset notes when medication changes
  useEffect(() => {
    if (medication) {
      setNotesInput(medication.notes || '');
      setIsEditingNotes(false);
    }
  }, [medication]);

  if (!medication) return null;

  const medLogs = logs.filter(l => l.medicationId === medication.id);

  const handleSaveNotes = () => {
    if (updateMedication && medication) {
      updateMedication(medication.id, { notes: notesInput });
      setIsEditingNotes(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !medication || !updateMedication) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Görsel çok büyük (Maks. 10MB)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setTempImage(reader.result as string);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
    
    if (e.target) e.target.value = '';
  };

  const generateAIImage = () => {
    if (!medication || !updateMedication) return;
    const PRESET_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];
    const hash = medication.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const color = PRESET_COLORS[hash % PRESET_COLORS.length];
    const placeholderUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(medication.name)}&background=${color.replace('#', '')}&color=fff&size=256&bold=true`;
    updateMedication(medication.id, { imageUrl: placeholderUrl });
    toast.success('Yapay zeka görseli oluşturuldu');
  };

  // Calculate stats for the last 7 days
  const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));
  
  const chartData = last7Days.map(date => {
    const dayLogs = medLogs.filter(l => {
      if (!l.timestamp) return false;
      const d = parseISO(l.timestamp);
      return isValid(d) && isSameDay(d, date);
    });
    return {
      date: format(date, 'EE', { locale: tr }),
      alinan: dayLogs.filter(l => l.status === 'taken').length,
      atlanan: dayLogs.filter(l => l.status === 'skipped').length,
      fullDate: format(date, 'd MMM yyyy', { locale: tr })
    };
  });

  const totalTaken = medLogs.filter(l => l.status === 'taken').length;
  const totalSkipped = medLogs.filter(l => l.status === 'skipped').length;
  
  const selectedPalette = (settings?.chartPalette as keyof typeof PALETTES) || 'modern';
  const paletteColors = PALETTES[selectedPalette];
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-6 border-slate-100 shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative pb-0">
          <div className="flex flex-col items-center gap-4 mb-2">
            <div 
              className="relative group w-32 h-32 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-full h-full rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl bg-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                {medication.imageUrl ? (
                  <img src={medication.imageUrl} alt={medication.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Pill size={48} className="text-blue-200" />
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem]">
                <span className="text-[10px] text-white font-black uppercase tracking-widest">DEĞİŞTİR</span>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>

            {!medication.imageUrl && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); generateAIImage(); }}
                className="h-8 rounded-full border-blue-100 text-blue-600 font-bold text-[10px] uppercase tracking-widest gap-2"
              >
                <Sparkles size={14} /> AI Görsel Oluştur
              </Button>
            )}

            <div className="text-center">
              <DialogTitle className="text-3xl font-black text-slate-800 tracking-tight">
                {medication.name}
              </DialogTitle>
              <div className="flex justify-center gap-2 mt-2 flex-wrap">
                <Badge variant="secondary" className="bg-blue-50 text-blue-600 text-[10px] uppercase font-black px-3 rounded-full">{medication.dosage} {medication.unit}</Badge>
                <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-[10px] uppercase font-black px-3 rounded-full">
                  {medication.frequency === 'daily' ? 'Her Gün' : medication.frequency === 'weekly' ? 'Haftalık' : 'İhtiyaç Halinde'}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-6 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-blue-600 p-4 text-white shadow-lg shadow-blue-200/50 flex flex-col justify-between">
              <div className="flex items-center gap-2 opacity-80 mb-2">
                <Box size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Stok</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">{medication.stock}</span>
                <span className="text-xs font-bold opacity-80 uppercase">{medication.unit}</span>
              </div>
              <p className="text-[9px] uppercase font-bold mt-2 opacity-80">Toplam: {medication.totalStock || medication.stock}</p>
            </div>
            
            <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Activity size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Oran</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-800">
                  {totalTaken + totalSkipped > 0 ? Math.round((totalTaken / (totalTaken + totalSkipped)) * 100) : 0}%
                </span>
              </div>
              <p className="text-[9px] uppercase font-bold mt-2 text-slate-400">
                {totalTaken} Alındı / {totalSkipped} Atlandı
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Son 7 Gün Grafiği</h4>
            </div>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} 
                    allowDecimals={false}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ fontWeight: 700, color: '#1e293b', fontSize: '12px' }}
                    itemStyle={{ fontWeight: 700, fontSize: '12px' }}
                  />
                  <Bar dataKey="alinan" name="Alınan" fill={paletteColors[0]} radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="atlanan" name="Atlanan" fill={paletteColors[1] || '#cbd5e1'} radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-blue-500" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">İlaç Notları</h4>
              </div>
              {!isEditingNotes && updateMedication && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)} className="h-6 text-[10px] uppercase font-bold text-blue-600">
                  Düzenle
                </Button>
              )}
            </div>
            
            {isEditingNotes ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium focus-visible:outline-none focus:ring-2 focus:ring-blue-600/20"
                  placeholder="İlaçla ilgili hatırlatmalar, yan etkiler vb."
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setIsEditingNotes(false); setNotesInput(medication.notes || ''); }} className="h-7 text-[10px] px-3 font-bold uppercase text-slate-500">İptal</Button>
                  <Button size="sm" onClick={handleSaveNotes} className="h-7 text-[10px] px-3 font-bold uppercase bg-blue-600 text-white rounded-lg">Kaydet</Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {medication.notes ? medication.notes : <span className="text-slate-400 italic">Bu ilaç için eklenmiş bir not bulunmuyor.</span>}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Son Kayıtlar</h4>
            <div className="flex flex-col gap-2">
              {medLogs.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-sm font-medium text-slate-400">Henüz kayıt yok</span>
                </div>
              ) : (
                medLogs.slice().reverse().slice(0, 5).map(log => (
                  <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-slate-800">
                        {log.timestamp && isValid(parseISO(log.timestamp)) ? format(parseISO(log.timestamp), 'd MMM yyyy', { locale: tr }) : 'Bilinmeyen Tarih'}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        Saat: {log.timestamp && isValid(parseISO(log.timestamp)) ? format(parseISO(log.timestamp), 'HH:mm') : '--:--'}
                      </span>
                    </div>
                    <div>
                      <Badge variant="secondary" className={`text-[10px] font-black tracking-widest uppercase ${
                        log.status === 'taken' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {log.status === 'taken' ? 'Alındı' : 'Atlandı'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>
      </DialogContent>

      <ImageCropDialog
        image={tempImage}
        isOpen={isCropping}
        onClose={() => setIsCropping(false)}
        onSave={(cropped) => {
          if (medication && updateMedication) {
            updateMedication(medication.id, { imageUrl: cropped });
            toast.success('Görsel güncellendi');
          }
        }}
      />
    </Dialog>
  );
}
