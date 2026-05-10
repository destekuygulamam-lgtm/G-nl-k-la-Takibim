import React, { useState, useMemo, useEffect } from 'react';
import { Medication, MedicationLog } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock, AlertCircle, Pill, ChevronLeft, ChevronRight, Sunrise, Sun, Sunset, Moon, Sparkles, BrainCircuit } from 'lucide-react';
import { format, isSameDay, parseISO, addDays, startOfWeek, isToday, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Settings } from '../hooks/useSettings';
import { askAI } from '../services/aiService';

interface DashboardProps {
  medHook: {
    medications: Medication[];
    logs: MedicationLog[];
    logMedication: (id: string, status: 'taken' | 'skipped', timestamp?: string) => void;
    user?: any;
    isSyncing?: boolean;
    loginWithGoogle?: () => Promise<void>;
  };
  settingsHook?: {
    settings: Settings;
    updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  };
}

type DayPeriod = 'morning' | 'noon' | 'evening' | 'night';

interface ScheduleItem {
  time: string;
  medication: Medication;
  period: DayPeriod;
}

interface PeriodConfig {
  id: DayPeriod;
  label: string;
  icon: React.ReactNode;
  bgClass: string;
  accentClass: string;
  textClass: string;
  iconBg: string;
}

const PERIODS: PeriodConfig[] = [
  { 
    id: 'morning', 
    label: 'SABAH', 
    icon: <Sunrise size={18} />, 
    bgClass: 'bg-amber-50/50', 
    accentClass: 'bg-amber-100/50', 
    textClass: 'text-amber-600',
    iconBg: 'bg-amber-500'
  },
  { 
    id: 'noon', 
    label: 'ÖĞLE', 
    icon: <Sun size={18} />, 
    bgClass: 'bg-sky-50/50', 
    accentClass: 'bg-sky-100/50', 
    textClass: 'text-sky-600',
    iconBg: 'bg-sky-500'
  },
  { 
    id: 'evening', 
    label: 'AKŞAM', 
    icon: <Sunset size={18} />, 
    bgClass: 'bg-orange-50/50', 
    accentClass: 'bg-orange-100/50', 
    textClass: 'text-orange-600',
    iconBg: 'bg-orange-500'
  },
  { 
    id: 'night', 
    label: 'GECE', 
    icon: <Moon size={18} />, 
    bgClass: 'bg-indigo-50/50', 
    accentClass: 'bg-indigo-100/50', 
    textClass: 'text-indigo-600',
    iconBg: 'bg-indigo-500'
  },
];

export default function Dashboard({ medHook, settingsHook }: DashboardProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [aiTip, setAiTip] = useState<string | null>(null);

  useEffect(() => {
    const fetchTip = async () => {
      try {
        const response = await askAI("Kullanıcıya günlük kısa bir sağlık veya ilaç kullanım ipucu ver. Çok kısa olsun (maksimum 20 kelime).", medHook.medications);
        setAiTip(response.text || null);
      } catch (err) {
        console.error("Tip fetch failed:", err);
      }
    };
    fetchTip();
  }, []); // Only once on mount

  const currentWeekStart = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7);
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  const todayLogs = useMemo(() => 
    medHook.logs.filter(log => {
      if (!log.timestamp) return false;
      const d = parseISO(log.timestamp);
      return isValid(d) && isValid(selectedDate) && isSameDay(d, selectedDate);
    }),
    [medHook.logs, selectedDate]
  );

  const dailyScheduleByPeriod = useMemo(() => {
    const schedule: ScheduleItem[] = medHook.medications
      .filter(m => m.active)
      .flatMap(m => m.times.map(time => {
        const [hours] = time.split(':').map(Number);
        let period: DayPeriod = 'morning';
        if (hours >= 5 && hours < 11) period = 'morning';
        else if (hours >= 11 && hours < 16) period = 'noon';
        else if (hours >= 16 && hours < 21) period = 'evening';
        else period = 'night';
        
        return { time, medication: m, period };
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    const grouped: Record<DayPeriod, ScheduleItem[]> = {
      morning: [],
      noon: [],
      evening: [],
      night: []
    };

    schedule.forEach(item => {
      grouped[item.period].push(item);
    });

    return grouped;
  }, [medHook.medications]);

  const dailySummary = useMemo(() => {
    const all = Object.values(dailyScheduleByPeriod).flat() as ScheduleItem[];
    const takenCount = todayLogs.filter(l => l.status === 'taken').length;
    const totalDoses = all.length;
    
    const nextDose = all.find(item => {
      const isTodaySelected = isValid(selectedDate) && isToday(selectedDate);
      if (!isTodaySelected) return false;
      
      if (!item.time || !item.time.includes(':')) return false;
      const [h, m] = item.time.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return false;
      
      const now = new Date();
      const doseTime = new Date();
      doseTime.setHours(h, m, 0, 0);
      
      if (!isValid(doseTime)) return false;
      
      const isAlreadyLogged = todayLogs.some(l => {
        if (!l.timestamp) return false;
        const d = parseISO(l.timestamp);
        return l.medicationId === item.medication.id && 
          isValid(d) &&
          format(d, 'HH:mm') === item.time;
      });
      
      return doseTime > now && !isAlreadyLogged;
    });

    return { takenCount, totalDoses, nextDose };
  }, [dailyScheduleByPeriod, todayLogs, selectedDate]);

  const handleLog = (medId: string, status: 'taken' | 'skipped', time: string) => {
    if (!isValid(selectedDate)) {
      toast.error('Geçersiz tarih seçildi.');
      return;
    }
    
    let timestampToLog: string;
    const dateToLog = new Date(selectedDate);
    
    if (!time || !time.includes(':')) {
      timestampToLog = new Date().toISOString();
    } else {
      const [hours, minutes] = time.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        timestampToLog = new Date().toISOString();
      } else {
        dateToLog.setHours(hours, minutes, 0, 0);
        if (isValid(dateToLog)) {
          timestampToLog = dateToLog.toISOString();
        } else {
          timestampToLog = new Date().toISOString();
        }
      }
    }
    
    medHook.logMedication(medId, status, timestampToLog);
    toast.success(status === 'taken' ? 'İlaç alındı olarak işaretlendi' : 'İlaç atlandı');
  };

  const getLogForTime = (medId: string, time: string) => {
    return todayLogs.find(l => {
      if (!l.timestamp) return false;
      const d = parseISO(l.timestamp);
      return l.medicationId === medId && 
        isValid(d) &&
        format(d, 'HH:mm') === time;
    });
  };

  return (
    <div className="flex flex-col gap-8 pb-8">
      <section className="flex flex-col gap-1 px-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} className="text-blue-600 animate-pulse" />
              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400">GÜNLÜK ÖZET</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {medHook.user ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 rounded-full px-3 py-1 flex items-center gap-1.5 transition-all hover:bg-emerald-100 cursor-default shadow-sm border">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[11px] font-black uppercase tracking-wider">Bulut Senkronize</span>
              </Badge>
            ) : (
              <button 
                onClick={() => medHook.loginWithGoogle?.()}
                className="bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-3 py-1 flex items-center gap-1.5 transition-all hover:bg-blue-100 shadow-sm"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-[11px] font-black uppercase tracking-wider">Bulut Yedekleme Kapalı</span>
              </button>
            )}
          </div>
        </div>
        
        <h2 className="font-display text-3xl font-light text-slate-800 tracking-tight leading-tight">
          Sağlığınız <br/><span className="font-black text-blue-600">önceliğimiz.</span>
        </h2>
      </section>

      {aiTip && (
        <section className="px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl bg-linear-to-r from-blue-600/10 to-indigo-600/10 border border-blue-100 p-5 relative overflow-hidden"
          >
            <div className="absolute -right-2 -top-2 text-blue-600/5">
              <Sparkles size={80} />
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                <BrainCircuit size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-[12px] font-black uppercase tracking-widest text-blue-600">Asistan İpucu</p>
                <p className="text-sm font-semibold leading-relaxed text-slate-700 italic">"{aiTip}"</p>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      <div className="flex flex-col gap-4 px-4">
        <div className="flex items-center bg-white rounded-3xl p-2 shadow-sm border border-slate-100 mx-auto w-full">
          <button 
            onClick={() => setWeekOffset(o => o - 1)} 
            className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none flex justify-center px-1">
            <div className="flex items-center gap-1 sm:gap-2">
              {weekDays.map((day, i) => {
                if (!isValid(day)) return null;
                const isSelected = isValid(selectedDate) && isSameDay(day, selectedDate);
                const isCurToday = isToday(day);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={`flex flex-col items-center justify-center p-2 sm:p-3 w-10 sm:w-12 rounded-2xl transition-all shrink-0 ${
                      isSelected 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200/50 scale-105' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`text-[9px] sm:text-[10px] font-bold mb-1 uppercase ${isSelected ? 'opacity-70 text-white' : 'text-slate-400'}`}>
                      {format(day, 'EEEEEE', { locale: tr })}
                    </span>
                    <span className="text-sm sm:text-base font-black">
                      {format(day, 'd')}
                    </span>
                    {isCurToday && !isSelected && (
                      <motion.div 
                        layoutId="today-indicator"
                        className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600 shadow-sm" 
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          <button 
            onClick={() => setWeekOffset(o => o + 1)} 
            className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="rounded-[2.5rem] bg-white border-slate-100 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Check size={40} className="text-emerald-500" />
            </div>
            <CardContent className="p-6">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">TAMAMLANAN</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-800">{dailySummary.takenCount}</span>
                <span className="text-xs font-bold text-slate-400">/ {dailySummary.totalDoses} doz</span>
              </div>
              <div className="mt-3 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${dailySummary.totalDoses > 0 ? (dailySummary.takenCount/dailySummary.totalDoses)*100 : 0}%` }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </CardContent>
          </Card>
          
          <Card className="rounded-[2.5rem] bg-white border-slate-100 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Clock size={40} className="text-orange-500" />
            </div>
            <CardContent className="p-6">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">SIRADAKİ</p>
              {dailySummary.nextDose ? (
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-slate-800 tracking-tight">
                    {dailySummary.nextDose.time}
                  </span>
                  <span className="text-[10px] font-bold text-orange-500 uppercase flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                    Yakında
                  </span>
                </div>
              ) : (
                <span className="text-sm font-black text-emerald-600 uppercase mt-1 block">Tüm Dozlar Bitti</span>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="flex flex-col gap-10">
        <div className="flex items-center justify-between px-6">
          <h3 className="font-display text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">GÜNLÜK PROGRAM</h3>
          <Badge variant="outline" className="border-slate-100 bg-white/50 text-slate-400 font-bold text-[9px] rounded-full px-4 py-1 tracking-wider uppercase backdrop-blur-sm">
            {isValid(selectedDate) ? format(selectedDate, 'd MMMM', { locale: tr }) : '-- --'}
          </Badge>
        </div>

        <div className="flex flex-col gap-12 px-4">
          <AnimatePresence mode="popLayout">
          {PERIODS.map((period) => {
            const periodItems = dailyScheduleByPeriod[period.id];
            if (periodItems.length === 0) return null;

            return (
              <motion.div 
                key={period.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center gap-3 px-2">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${period.iconBg} text-white shadow-lg shadow-${period.id}-200/50`}>
                    {period.icon}
                  </div>
                  <div className="flex flex-col">
                    <h4 className={`text-xs font-black tracking-[0.1em] ${period.textClass}`}>{period.label}</h4>
                    <p className="text-[10px] font-bold text-slate-400">
                      {period.id === 'morning' ? '05:00 - 11:00' : 
                       period.id === 'noon' ? '11:00 - 16:00' :
                       period.id === 'evening' ? '16:00 - 21:00' : '21:00 - 05:00'}
                    </p>
                  </div>
                </div>

                <div className={`space-y-4 rounded-[2.5rem] ${period.bgClass} p-4 border border-dashed border-slate-200/50`}>
                  {periodItems.map((item, idx) => {
                    const logEntry = getLogForTime(item.medication.id, item.time);
                    const isLogged = !!logEntry;
                    const isSkipped = logEntry?.status === 'skipped';
                    const isTaken = logEntry?.status === 'taken';

                    return (
                      <motion.div
                        key={`${item.medication.id}-${item.time}`}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <Card className={`overflow-hidden border-slate-100 transition-all duration-300 rounded-[2rem] shadow-sm hover:shadow-md ${
                          isLogged ? 'bg-white/60 opacity-60' : 'bg-white'
                        }`}>
                          <CardContent className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-colors ${
                                isTaken ? 'bg-emerald-50 text-emerald-600' : 
                                isSkipped ? 'bg-red-50 text-red-500' : period.accentClass + ' ' + period.textClass
                              }`}>
                                {item.medication.imageUrl ? (
                                  <img src={item.medication.imageUrl} alt={item.medication.name} className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
                                ) : isTaken ? <Check size={20} strokeWidth={3} /> : 
                                 isSkipped ? <X size={20} strokeWidth={3} /> : (
                                  <span className="font-mono text-[10px] font-black">{item.time}</span>
                                )}
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className={`text-sm font-bold text-slate-800 ${isLogged ? 'line-through' : ''}`}>
                                  {item.medication.name}
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge variant="secondary" className="h-4 bg-blue-50/50 text-[8px] font-black uppercase tracking-tighter text-blue-600 rounded-full border-none">
                                    {item.medication.category || 'DİĞER'}
                                  </Badge>
                                  <span className="text-[10px] font-black text-slate-400 tracking-tight uppercase">
                                    {item.medication.dosage} {item.medication.unit}
                                  </span>
                                  {!isLogged && (
                                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 font-black tracking-tighter">
                                      {item.medication.notes || 'TOK'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {!isLogged ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleLog(item.medication.id, 'skipped', item.time)}
                                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                >
                                  <X size={18} strokeWidth={2.5} />
                                </button>
                                <button
                                  onClick={() => handleLog(item.medication.id, 'taken', item.time)}
                                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${period.iconBg} text-white shadow-lg shadow-${period.id}-200 transition-transform active:scale-90`}
                                >
                                  <Check size={20} strokeWidth={3} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-end pr-2">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isSkipped ? 'text-red-500' : 'text-emerald-600'}`}>
                                  {isSkipped ? 'ATLANDI' : 'ALINDI'}
                                </span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                  {logEntry!.timestamp && isValid(parseISO(logEntry!.timestamp)) ? format(parseISO(logEntry!.timestamp), 'HH:mm') : '--:--'}
                                </span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>

          {Object.values(dailyScheduleByPeriod).flat().length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-slate-100 bg-white py-20 text-center shadow-sm">
              <Pill className="mb-4 text-slate-100" size={56} strokeWidth={1} />
              <div className="flex flex-col gap-1 px-8">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Plan Yok</h4>
                <p className="text-xs font-medium text-slate-400">Henüz planlanmış bir ilacınız bulunmuyor. Yeni ilaç ekleyerek başlayabilirsiniz.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
