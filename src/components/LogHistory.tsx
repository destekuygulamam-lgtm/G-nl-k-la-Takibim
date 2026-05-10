import { useState, useMemo } from 'react';
import { Medication, MedicationLog } from '../types';
import { Settings } from '../hooks/useSettings';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO, isToday, isYesterday, subDays, isAfter, startOfToday, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, CalendarDays, Filter, BarChart3, Edit, PlusCircle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, AreaChart, Area, LineChart, Line, PieChart, Pie } from 'recharts';

import { PALETTES } from '../constants';

interface LogHistoryProps {
  medHook: {
    medications: Medication[];
    logs: MedicationLog[];
    actionLogs: any[];
  };
  settingsHook: {
    settings: Settings;
    updateSetting: (key: keyof Settings, value: any) => void;
  };
}

export default function LogHistory({ medHook, settingsHook }: LogHistoryProps) {
  const [historyTab, setHistoryTab] = useState<'doses' | 'actions'>('doses');
  const [selectedMedId, setSelectedMedId] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  
  const selectedPalette = (settingsHook.settings.chartPalette as keyof typeof PALETTES) || 'modern';
  const setSelectedPalette = (v: keyof typeof PALETTES) => settingsHook.updateSetting('chartPalette', v);

  const filteredLogs = medHook.logs.filter(log => {
    const matchesMed = selectedMedId === 'all' || log.medicationId === selectedMedId;
    
    let matchesTime = true;
    if (!log.timestamp) return false;
    const logDate = parseISO(log.timestamp);
    if (!isValid(logDate)) return false;

    if (selectedDateStr) {
      const d = format(logDate, 'd MMM', { locale: tr });
      if (d !== selectedDateStr) matchesTime = false;
    }

    if (matchesTime && !selectedDateStr) {
      if (timeFilter === 'today') {
        matchesTime = isToday(logDate);
      } else if (timeFilter === '7days') {
        matchesTime = isAfter(logDate, subDays(new Date(), 7));
      } else if (timeFilter === '30days') {
        matchesTime = isAfter(logDate, subDays(new Date(), 30));
      }
    }

    return matchesMed && matchesTime;
  });

  const filteredActionLogs = (medHook.actionLogs || []).filter(log => {
      const matchesMed = selectedMedId === 'all' || log.medicationId === selectedMedId;
      
      let matchesTime = true;
      if (!log.timestamp) return false;
      const logDate = parseISO(log.timestamp);
      if (!isValid(logDate)) return false;

      if (selectedDateStr) {
        const d = format(logDate, 'd MMM', { locale: tr });
        if (d !== selectedDateStr) matchesTime = false;
      }

      if (matchesTime && !selectedDateStr) {
        if (timeFilter === 'today') {
          matchesTime = isToday(logDate);
        } else if (timeFilter === '7days') {
          matchesTime = isAfter(logDate, subDays(new Date(), 7));
        } else if (timeFilter === '30days') {
          matchesTime = isAfter(logDate, subDays(new Date(), 30));
        }
      }

      return matchesMed && matchesTime;
  }).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLogs.filter(l => l.status === 'taken').forEach(log => {
      const medName = medHook.medications.find(m => m.id === log.medicationId)?.name || 'Bilinmeyen';
      counts[medName] = (counts[medName] || 0) + 1;
    });
    
    return Object.entries(counts).map(([name, Kullanım]) => ({
      name,
      Kullanım
    })).sort((a, b) => b.Kullanım - a.Kullanım);
  }, [filteredLogs, medHook.medications]);


  const timeSeriesData = useMemo(() => {
    const days: Record<string, number> = {};
    const range = timeFilter === 'all' ? 30 : (timeFilter === '7days' ? 7 : 30);
    
    for (let i = range - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'd MMM', { locale: tr });
      days[d] = 0;
    }

    filteredLogs.filter(l => l.status === 'taken').forEach(log => {
      const date = parseISO(log.timestamp);
      if (isValid(date)) {
        const d = format(date, 'd MMM', { locale: tr });
        if (days[d] !== undefined) {
          days[d]++;
        }
      }
    });

    return Object.entries(days).map(([name, Alınan]) => ({ name, Alınan }));
  }, [filteredLogs, timeFilter]);


  const sortedLogs = [...filteredLogs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const formatLogDate = (dateStr: string) => {
    if (!dateStr) return 'Bilinmiyor';
    const date = parseISO(dateStr);
    if (!isValid(date)) return 'Geçersiz Tarih';
    if (isToday(date)) return 'Bugün';
    if (isYesterday(date)) return 'Dün';
    return format(date, 'd MMMM', { locale: tr });
  };

  const totalDoses = filteredLogs.length;
  const takenDoses = filteredLogs.filter(l => l.status === 'taken').length;
  const successRate = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

  const getMostTakenMedication = () => {
    const counts: Record<string, number> = {};
    filteredLogs.filter(l => l.status === 'taken').forEach(l => {
      counts[l.medicationId] = (counts[l.medicationId] || 0) + 1;
    });
    const topId = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, '');
    if (!topId) return null;
    return medHook.medications.find(m => m.id === topId);
  };
  const topMedication = getMostTakenMedication();

  const getStatusData = () => {
    const taken = filteredLogs.filter(l => l.status === 'taken').length;
    const skipped = filteredLogs.filter(l => l.status === 'skipped').length;
    
    const colors = PALETTES[selectedPalette];
    return [
      { name: 'Alındı', value: taken, color: colors[0] },
      { name: 'Atlandı', value: skipped, color: colors[2] || '#f43f5e' }
    ].filter(d => d.value > 0);
  };

  const statusData = getStatusData();

  return (
    <div className="flex flex-col gap-8 pb-8">
      <section className="flex flex-col gap-1 px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">GEÇMİŞ & RAPORLAR</p>
        <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight">Analiz</h2>
      </section>

      <div className="flex bg-slate-100 p-1 rounded-2xl mx-4">
        <button 
          onClick={() => setHistoryTab('doses')}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${historyTab === 'doses' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Doz Kayıtları
        </button>
        <button 
          onClick={() => setHistoryTab('actions')}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${historyTab === 'actions' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Aktivite Geçmişi
        </button>
      </div>

      {historyTab === 'doses' && (
      <div className="flex flex-col gap-8 px-4">
      {/* Rapor Özeti */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-3xl bg-blue-600 p-5 shadow-lg shadow-blue-200/50 text-white flex flex-col justify-between overflow-hidden relative">
          <div className="absolute -right-4 -top-4 opacity-10">
            <CheckCircle2 size={100} />
          </div>
          <div className="relative z-10">
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest opacity-80">BAŞARI ORANI</p>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-4xl font-bold">%{successRate}</span>
            </div>
          </div>
          <p className="text-[10px] uppercase font-bold mt-4 opacity-80 z-10">
            {takenDoses} / {totalDoses} DOZ ALINDI
          </p>
        </div>
        
        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">EN ÇOK KULLANILAN</p>
            <div className="mt-2">
              {topMedication ? (
                <span className="text-xl font-bold text-slate-800 leading-tight block">{topMedication.name}</span>
              ) : (
                <span className="text-sm font-medium text-slate-400">Veri yok</span>
              )}
            </div>
          </div>
          {topMedication && (
            <p className="text-[10px] font-bold text-blue-600 uppercase mt-4">
              {filteredLogs.filter(l => l.medicationId === topMedication.id && l.status === 'taken').length} DOZ
            </p>
          )}
        </div>
      </div>

      <section className="flex flex-col gap-3 rounded-[2rem] bg-white p-6 border border-slate-100 shadow-sm relative overflow-hidden">
        {selectedDateStr && (
          <div className="absolute top-4 right-6 z-10 flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-50 text-blue-600 font-bold text-[10px] uppercase py-1 pl-3 pr-1 rounded-full border border-blue-100 flex items-center gap-1">
              {selectedDateStr} Filtresi Aktif
              <button 
                onClick={() => setSelectedDateStr(null)}
                className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 hover:bg-blue-200 transition-colors"
                title="Filtreyi Temizle"
              >
                <XCircle size={12} />
              </button>
            </Badge>
          </div>
        )}
        <div className="flex items-center gap-2 mb-2">
          <Filter size={16} className="text-blue-600" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filtrele & Görünüm</span>
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">İlaç Seçimi</label>
            <Select value={selectedMedId} onValueChange={setSelectedMedId}>
              <SelectTrigger className="h-11 rounded-2xl border-slate-100 bg-slate-50/50 text-xs font-bold focus:ring-blue-600/20">
                <SelectValue placeholder="İlaç Seçin" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100">
                <SelectItem value="all">Tüm İlaçlar</SelectItem>
                {medHook.medications.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Zaman Aralığı</label>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="h-11 rounded-2xl border-slate-100 bg-slate-50/50 text-xs font-bold focus:ring-blue-600/20">
                <SelectValue placeholder="Zaman Seçin" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100">
                <SelectItem value="all">Tüm Zamanlar</SelectItem>
                <SelectItem value="today">Sadece Bugün</SelectItem>
                <SelectItem value="7days">Son 7 Gün</SelectItem>
                <SelectItem value="30days">Son 30 Gün</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Grafik Rengi</label>
            <Select value={selectedPalette} onValueChange={(v) => setSelectedPalette(v as keyof typeof PALETTES)}>
              <SelectTrigger className="h-11 rounded-2xl border-slate-100 bg-slate-50/50 text-xs font-bold focus:ring-blue-600/20">
                <SelectValue placeholder="Tema Seçin" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100">
                {Object.entries(PALETTES).map(([key, colors]) => (
                  <SelectItem key={key} value={key} className="focus:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1">
                        {colors.slice(0, 3).map((c, i) => (
                          <div key={i} className="w-2.5 h-2.5 rounded-full border border-white" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <span className="capitalize">{
                        key === 'modern' ? 'Modern Seçim' :
                        key === 'pastel' ? 'Pastel Rüyası' :
                        key === 'forest' ? 'Doğa Yeşili' :
                        key === 'ocean' ? 'Okyanus Mavisi' :
                        key === 'sunset' ? 'Gün Batımı' :
                        key === 'vibrant' ? 'Canlı Renkler' :
                        key === 'minimal' ? 'Minimal Gri' :
                        key === 'elegant' ? 'Zarif Mor' :
                        key === 'berry' ? 'Yabani Meyve' :
                        key === 'neon' ? 'Neon Limon' : 
                        key === 'earth' ? 'Toprak Tonları' :
                        key === 'cyberpunk' ? 'Siber Gece' :
                        key === 'rose' ? 'Gül Kurusu' :
                        key === 'indigo' ? 'Gece Mavisi' :
                        key === 'candy' ? 'Şeker Pembe' :
                        key === 'luxury' ? 'Premium Altın' :
                        key === 'spring' ? 'Bahar Dalı' :
                        key === 'midnight' ? 'Derin Gece' :
                        key === 'vintage' ? 'Retro Stil' :
                        key === 'dawn' ? 'Şafak Vakti' :
                        key === 'lava' ? 'Lav Akışı' :
                        key === 'glacier' ? 'Buzul Esintisi' : key
                      }</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {chartData.length > 0 && selectedMedId === 'all' && (
        <section className="flex flex-col gap-4 rounded-[2rem] bg-white p-6 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={16} className="text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">İlaç Kullanım Dağılımı</span>
          </div>
          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData} 
                margin={{ top: 0, left: -25, right: 0, bottom: 0 }}
                onClick={(data: any) => {
                  if (data && data.activePayload) {
                    const medName = data.activePayload[0].payload.name;
                    const med = medHook.medications.find(m => m.name === medName);
                    if (med) {
                      setSelectedMedId(prev => prev === med.id ? 'all' : med.id);
                      toast.success(`${medName} filtresi uygulandı`);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                  tickMargin={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '1.25rem', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                    fontWeight: '800', 
                    fontSize: '12px',
                    padding: '12px 16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(4px)'
                  }}
                  itemStyle={{ color: PALETTES[selectedPalette][0] }}
                />
                <Bar 
                  dataKey="Kullanım" 
                  radius={[6, 6, 0, 0]} 
                  barSize={30}
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                  style={{ cursor: 'pointer' }}
                >
                  {chartData.map((entry, index) => {
                    const med = medHook.medications.find(m => m.name === entry.name);
                    const isSelected = med?.id === selectedMedId;
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={PALETTES[selectedPalette][index % PALETTES[selectedPalette].length]} 
                        fillOpacity={selectedMedId === 'all' || isSelected ? 1 : 0.3}
                        stroke={isSelected ? PALETTES[selectedPalette][index % PALETTES[selectedPalette].length] : 'none'}
                        strokeWidth={2}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {statusData.length > 0 && (
        <section className="flex flex-col gap-4 rounded-[2rem] bg-white p-6 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={16} className="text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Doz Durumu Dağılımı</span>
          </div>
          <div className="h-64 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                  isAnimationActive={true}
                >
                  {statusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '1.25rem', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                    fontWeight: '800', 
                    fontSize: '12px',
                    padding: '12px 16px',
                    backgroundColor: 'white'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              {statusData.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{d.name} (%{Math.round(d.value / (statusData.reduce((a, b) => a + b.value, 0) || 1) * 100)})</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {timeSeriesData.length > 0 && (
        <section className="flex flex-col gap-4 rounded-[2rem] bg-white p-6 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays size={16} className="text-purple-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kullanım Trendi (Zaman Serisi)</span>
          </div>
          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={timeSeriesData} 
                margin={{ top: 10, left: -25, right: 10, bottom: 0 }}
                onClick={(data: any) => {
                  if (data && data.activeLabel) {
                    setSelectedDateStr((prev: any) => prev === data.activeLabel ? null : data.activeLabel);
                    if (data.activeLabel !== selectedDateStr) {
                      toast.success(`${data.activeLabel} için kayıtlar gösteriliyor`);
                    }
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PALETTES[selectedPalette][0]} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={PALETTES[selectedPalette][0]} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }}
                  tickMargin={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '1.25rem', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                    fontWeight: '800', 
                    fontSize: '12px',
                    padding: '12px 16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(4px)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Alınan" 
                  stroke={PALETTES[selectedPalette][0]} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorUsage)"
                  activeDot={{ r: 8, fill: PALETTES[selectedPalette][0], stroke: '#fff', strokeWidth: 3 }}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (payload.name === selectedDateStr) {
                      return <circle cx={cx} cy={cy} r={6} fill={PALETTES[selectedPalette][0]} stroke="#fff" strokeWidth={2} />;
                    }
                    return null;
                  }}
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-4">
        {sortedLogs.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center rounded-[2.5rem] border border-slate-100 bg-white py-20 text-center shadow-sm"
          >
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-50 text-slate-200">
               <CalendarDays size={36} strokeWidth={1.5} />
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-800">Kayıt Bulunamadı</h3>
            <p className="max-w-[220px] text-sm font-medium leading-relaxed text-slate-400">
              {timeFilter !== 'all' || selectedMedId !== 'all' 
                ? "Seçtiğiniz filtrelere uygun kullanım geçmişi bulunmuyor." 
                : "Henüz bir kullanım kaydı oluşturulmamış."}
            </p>
          </motion.div>
        ) : (
          sortedLogs.map((log) => {
            const med = medHook.medications.find(m => m.id === log.medicationId);
            const isTaken = log.status === 'taken';

            return (
              <Card key={log.id} className="overflow-hidden border-slate-100 rounded-[2rem] shadow-sm bg-white">
                <CardContent className="flex items-center gap-5 p-5">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    isTaken ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                  }`}>
                    {isTaken ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-base font-bold text-slate-800">{med?.name || 'Bilinmeyen İlaç'}</span>
                    <p className="text-[11px] font-medium text-slate-400">
                      <span className={isTaken ? 'text-emerald-600 font-bold uppercase' : 'text-red-500 font-bold uppercase'}>
                        {isTaken ? 'ALINDI' : 'ATLANDI'}
                      </span>
                      <span className="mx-2">•</span>
                      {log.timestamp && isValid(parseISO(log.timestamp)) ? format(parseISO(log.timestamp), 'HH:mm') : '--:--'}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="border-slate-100 font-bold text-[9px] uppercase tracking-widest text-slate-400 rounded-full px-3">
                      {formatLogDate(log.timestamp)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      </div>
      )}

      {historyTab === 'actions' && (
        <div className="flex flex-col gap-4 px-4">
          {filteredActionLogs.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center rounded-[2.5rem] border border-slate-100 bg-white py-20 text-center shadow-sm"
            >
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-50 text-slate-200">
                 <CalendarDays size={36} strokeWidth={1.5} />
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-800">Geçmiş Bulunamadı</h3>
            </motion.div>
          ) : (
            filteredActionLogs.map((log) => {
              const Icon = log.type === 'added' ? PlusCircle : 
                           log.type === 'deleted' ? Trash2 : 
                           log.type === 'updated' ? Edit : 
                           log.type === 'taken' ? CheckCircle2 : XCircle;

              const bgColor = log.type === 'added' ? 'bg-blue-50 text-blue-500' :
                              log.type === 'deleted' ? 'bg-red-50 text-red-500' :
                              log.type === 'updated' ? 'bg-amber-50 text-amber-500' :
                              log.type === 'taken' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500';

              return (
                <Card key={log.id} className="overflow-hidden border-slate-100 rounded-[2rem] shadow-sm bg-white">
                  <CardContent className="flex items-center gap-5 p-5">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${bgColor}`}>
                      <Icon size={24} />
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span className="text-base font-bold text-slate-800">{log.medicationName || 'Bilinmeyen İlaç'}</span>
                      <p className="text-[11px] font-medium text-slate-400">
                        <span className="font-bold uppercase">
                          {log.details || log.type}
                        </span>
                        <span className="mx-2">•</span>
                        {log.timestamp && isValid(parseISO(log.timestamp)) ? format(parseISO(log.timestamp), 'HH:mm') : '--:--'}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="border-slate-100 font-bold text-[9px] uppercase tracking-widest text-slate-400 rounded-full px-3">
                        {formatLogDate(log.timestamp)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

    </div>
  );
}
