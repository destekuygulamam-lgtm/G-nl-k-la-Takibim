import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Upload, Settings as SettingsIcon, AlertCircle, User, Droplets, Bell, Cloud, CloudOff, Loader2, Music } from 'lucide-react';
import { toast } from 'sonner';
import { Medication, MedicationLog } from '../types';
import React, { useRef, useState, useEffect } from 'react';
import { Settings } from '../hooks/useSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Badge } from '@/components/ui/badge';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  medHook: {
    medications: Medication[];
    logs: MedicationLog[];
    actionLogs: any[];
    restoreData: (meds: Medication[], logs: MedicationLog[], alogs?: any[]) => void;
    bulkUpdateMedications: (ids: string[], updates: Partial<Medication>) => Promise<void>;
    user?: any;
    isSyncing?: boolean;
    loginWithGoogle?: () => Promise<void>;
    logout?: () => Promise<void>;
  };
  settingsHook: {
    settings: Settings;
    updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  };
}

export default function SettingsModal({ isOpen, onClose, medHook, settingsHook }: SettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [thresholdInput, setThresholdInput] = useState<string>(settingsHook.settings.lowStockThreshold.toString());
  const [reminderSound, setReminderSound] = useState<string>(settingsHook.settings.reminderSound || 'default');
  
  // Profile state
  const [userName, setUserName] = useState<string>(settingsHook.settings.userName || '');
  const [birthDate, setBirthDate] = useState<string>(settingsHook.settings.birthDate || '');
  const [gender, setGender] = useState<string>(settingsHook.settings.gender || '');
  const [bloodType, setBloodType] = useState<string>(settingsHook.settings.bloodType || '');
  const [isUpdatingMeds, setIsUpdatingMeds] = useState(false);

  const SOUND_OPTIONS = [
    { value: 'default', label: 'Varsayılan Zil Sesi' },
    { value: 'gentle', label: 'Hafif Çan' },
    { value: 'alert', label: 'Akıllı Telefon' },
    { value: 'retro', label: 'Retro' },
    { value: 'none', label: 'Sessiz' },
  ];

  const playSoundPreview = (val: string) => {
    if (val === 'none') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (freq: number, type: OscillatorType, duration: number, startTime: number) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime + startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + startTime + duration);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + startTime);
        osc.stop(audioCtx.currentTime + startTime + duration);
      };

      if (val === 'gentle') {
        playTone(440, 'sine', 0.5, 0);
        playTone(554.37, 'sine', 0.5, 0.2);
      } else if (val === 'alert') {
        playTone(880, 'square', 0.1, 0);
        playTone(880, 'square', 0.1, 0.2);
        playTone(880, 'square', 0.1, 0.4);
      } else if (val === 'retro') {
        playTone(300, 'sawtooth', 0.1, 0);
        playTone(400, 'sawtooth', 0.1, 0.1);
        playTone(500, 'sawtooth', 0.1, 0.2);
      } else {
        // default
        playTone(600, 'sine', 0.3, 0);
        playTone(800, 'sine', 0.3, 0.2);
      }
    } catch (e) {
      console.error('Audio playback failed', e);
    }
  };

  useEffect(() => {
    setThresholdInput(settingsHook.settings.lowStockThreshold.toString());
    setReminderSound(settingsHook.settings.reminderSound || 'default');
    setUserName(settingsHook.settings.userName || '');
    setBirthDate(settingsHook.settings.birthDate || '');
    setGender(settingsHook.settings.gender || '');
    setBloodType(settingsHook.settings.bloodType || '');
  }, [settingsHook.settings]);

  const handleSaveSettings = () => {
    const val = parseInt(thresholdInput);
    if (!isNaN(val) && val >= 0) {
      settingsHook.updateSetting('lowStockThreshold', val);
      settingsHook.updateSetting('reminderSound', reminderSound);
      settingsHook.updateSetting('userName', userName);
      settingsHook.updateSetting('birthDate', birthDate);
      settingsHook.updateSetting('gender', gender);
      settingsHook.updateSetting('bloodType', bloodType);
      
      toast.success('Ayarlar kaydedildi.');
    } else {
      toast.error('Geçerli bir değer girin.');
    }
  };

  const handleExport = () => {
    try {
      const data = {
        medications: medHook.medications,
        logs: medHook.logs,
        actionLogs: medHook.actionLogs,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gunlukhaptakibi-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Yedekleme dosyası indirildi.');
    } catch (error) {
      toast.error('Dışa aktarırken bir hata oluştu.');
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && Array.isArray(json.medications) && Array.isArray(json.logs)) {
          medHook.restoreData(json.medications, json.logs, json.actionLogs || []);
          toast.success('Veriler başarıyla geri yüklendi.');
          onClose();
        } else {
          toast.error('Geçersiz yedek dosyası formatı.');
        }
      } catch (error) {
        toast.error('Dosya okunamadı. Geçerli bir JSON olduğundan emin olun.');
      }
      
      // Reset input value so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-6 border-slate-100 shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <SettingsIcon className="text-slate-600" />
            Ayarlar
          </DialogTitle>
          <DialogDescription className="text-slate-500 font-medium pt-2">
            Verilerinizi yedekleyin, geri yükleyin ve uygulama içi sınırlarınızı yönetin.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-6">
          <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-5 border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
               <div className="bg-white p-2 rounded-xl shadow-sm">
                <Cloud size={20} className={medHook.user ? "text-blue-600" : "text-slate-400"} />
               </div>
               <div className="flex flex-col">
                 <h4 className="text-sm font-bold text-slate-800">Bulut Senkronizasyonu</h4>
                 <p className="text-xs text-slate-500 font-medium">Verilerinizi Google Hesabınızla senkronize edin</p>
               </div>
            </div>
            
            {!medHook.user ? (
              <Button
                onClick={async () => {
                  if (medHook.loginWithGoogle) {
                    await medHook.loginWithGoogle();
                    toast.success('Giriş başarılı, verileriniz senkronize ediliyor.');
                  }
                }}
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
              >
                Google ile Giriş Yap
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-slate-500" />
                    <span className="text-xs font-medium text-slate-700">{medHook.user.email}</span>
                  </div>
                  {medHook.isSyncing ? (
                    <Loader2 size={16} className="text-blue-500 animate-spin" />
                  ) : (
                    <Cloud size={16} className="text-emerald-500" />
                  )}
                </div>
                <Button
                  onClick={async () => {
                    if (medHook.logout) {
                      await medHook.logout();
                      toast.info('Çıkış yapıldı. Verileriniz yalnızca bu cihazda tutulacak.');
                    }
                  }}
                  variant="outline"
                  className="w-full h-10 rounded-xl text-slate-500 hover:text-slate-700 font-bold"
                >
                  <CloudOff size={16} className="mr-2" />
                  Bağlantıyı Kes
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                 <div className="bg-blue-50 p-2.5 rounded-2xl">
                  <User size={20} className="text-blue-600" />
                 </div>
                 <div className="flex flex-col">
                   <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Profil Kartı</h4>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kişisel Bilgileriniz</p>
                 </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5 group">
                <Label htmlFor="userName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 group-focus-within:text-blue-600 transition-colors">Ad Soyad</Label>
                <div className="relative">
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-400 transition-colors" />
                  <Input
                    id="userName"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="örn. Ayşe Yılmaz"
                    className="h-12 bg-slate-50/50 rounded-xl border-slate-100 pl-10 focus:bg-white transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 group">
                  <Label htmlFor="birthDate" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 group-focus-within:text-blue-600 transition-colors">Doğum Tarihi</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="h-12 bg-slate-50/50 rounded-xl border-slate-100 focus:bg-white transition-all text-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5 group">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 group-focus-within:text-blue-600 transition-colors">Kan Grubu</Label>
                  <Select value={bloodType} onValueChange={setBloodType}>
                    <SelectTrigger className="h-12 bg-slate-50/50 rounded-xl border-slate-100 focus:bg-white transition-all text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Droplets size={14} className="text-red-400" />
                        <SelectValue placeholder="Seçiniz" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100">
                      <SelectItem value="0-">0 Rh-</SelectItem>
                      <SelectItem value="0+">0 Rh+</SelectItem>
                      <SelectItem value="A-">A Rh-</SelectItem>
                      <SelectItem value="A+">A Rh+</SelectItem>
                      <SelectItem value="B-">B Rh-</SelectItem>
                      <SelectItem value="B+">B Rh+</SelectItem>
                      <SelectItem value="AB-">AB Rh-</SelectItem>
                      <SelectItem value="AB+">AB Rh+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cinsiyet</Label>
                <div className="flex gap-2 p-1 bg-slate-50 rounded-xl border border-slate-100">
                  {['Kadin', 'Erkek', 'Diger'].map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                        gender === g 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {g === 'Kadin' ? 'Kadın' : g === 'Erkek' ? 'Erkek' : 'Diğer'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-5 border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <AlertCircle size={20} className="text-orange-500" />
              </div>
              <div className="flex flex-col">
                <h4 className="text-sm font-bold text-slate-800">Uygulama Ayarları</h4>
                <p className="text-xs text-slate-500 font-medium">Stok ve bildirim tercihlerinizi yönetin</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="threshold" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Alt Stok Limiti</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  className="h-12 bg-white rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Bildirim Sesi</Label>
                <Select value={reminderSound} onValueChange={(val) => {
                  setReminderSound(val);
                  playSoundPreview(val);
                }}>
                  <SelectTrigger className="h-12 bg-white rounded-xl border-slate-200">
                    <div className="flex items-center gap-2">
                      <Bell size={14} className="text-slate-500" />
                      <SelectValue placeholder="Bildirim Sesi" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {SOUND_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={handleSaveSettings} className="h-12 bg-slate-900 text-white rounded-xl font-bold mt-2">Kaydet</Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-5 border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <Music size={20} className="text-purple-600" />
              </div>
              <div className="flex flex-col">
                <h4 className="text-sm font-bold text-slate-800">İlaç Bazlı Sesler</h4>
                <p className="text-xs text-slate-500 font-medium">Belli ilaçlar için özel sesler seçin</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
              {medHook.medications.filter(m => m.active).map(med => (
                <div key={med.id} className="flex flex-col gap-1.5 p-3 bg-white rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 truncate mr-2">{med.name}</span>
                    <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-400 border-slate-100">{med.dosage}</Badge>
                  </div>
                  <Select 
                    value={med.reminderSound || 'settings_default'} 
                    onValueChange={async (val) => {
                      setIsUpdatingMeds(true);
                      const finalSound = val === 'settings_default' ? undefined : val;
                      await medHook.bulkUpdateMedications([med.id], { reminderSound: finalSound });
                      if (val !== 'settings_default') playSoundPreview(val);
                      setIsUpdatingMeds(false);
                      toast.success(`${med.name} için ses güncellendi.`);
                    }}
                  >
                    <SelectTrigger className="h-9 bg-slate-50 border-transparent text-xs">
                      <SelectValue placeholder="Ses seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="settings_default">Genel Ayarı Kullan</SelectItem>
                      {SOUND_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              {medHook.medications.filter(m => m.active).length === 0 && (
                <p className="text-center py-4 text-xs text-slate-400 italic">Ses atanacak aktif ilaç bulunamadı.</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-5 border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <Bell size={20} className="text-blue-600" />
              </div>
              <div className="flex flex-col">
                <h4 className="text-sm font-bold text-slate-800">Toplu Hatırlatıcı Yönetimi</h4>
                <p className="text-xs text-slate-500 font-medium">Tüm aktif ilaçlar için ayarları tek seferde değiştirin</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Button 
                onClick={async () => {
                  const activeMeds = medHook.medications.filter(m => m.active);
                  if (activeMeds.length === 0) {
                    toast.error('Aktif ilaç bulunamadı.');
                    return;
                  }
                  await medHook.bulkUpdateMedications(activeMeds.map(m => m.id), { reminderEnabled: true });
                  toast.success('Tüm hatırlatıcılar açıldı.');
                }}
                variant="outline"
                className="h-12 rounded-xl border-blue-100 text-blue-600 font-bold bg-white hover:bg-blue-50"
              >
                Tümünü Aç
              </Button>
              <Button 
                onClick={async () => {
                  const activeMeds = medHook.medications.filter(m => m.active);
                  if (activeMeds.length === 0) {
                    toast.error('Aktif ilaç bulunamadı.');
                    return;
                  }
                  await medHook.bulkUpdateMedications(activeMeds.map(m => m.id), { reminderEnabled: false });
                  toast.success('Tüm hatırlatıcılar kapatıldı.');
                }}
                variant="outline"
                className="h-12 rounded-xl border-red-100 text-red-500 font-bold bg-white hover:bg-red-50"
              >
                Tümünü Kapat
              </Button>
            </div>
            <div className="space-y-1.5 mt-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Varsayılan Saat Atama</Label>
              <div className="flex gap-2">
                <Input
                  type="time"
                  id="bulk-time"
                  className="h-12 bg-white rounded-xl border-slate-200"
                />
                <Button 
                  onClick={async () => {
                    const timeEl = document.getElementById('bulk-time') as HTMLInputElement;
                    const time = timeEl?.value;
                    if (!time) {
                      toast.error('Lütfen bir saat seçin.');
                      return;
                    }
                    const activeMeds = medHook.medications.filter(m => m.active);
                    if (activeMeds.length === 0) {
                      toast.error('Aktif ilaç bulunamadı.');
                      return;
                    }
                    await medHook.bulkUpdateMedications(activeMeds.map(m => m.id), { times: [time] });
                    toast.success(`Tüm ilaçların saati ${time} olarak güncellendi.`);
                  }}
                  className="h-12 px-6 bg-slate-800 text-white rounded-xl font-bold"
                >
                  Uygula
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 font-medium px-1">Seçilen saati tüm aktif ilaçların tekil saati olarak ayarlar.</p>
            </div>
          </div>

          <div className="w-full h-px bg-slate-100 my-1" />

          <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-5 border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <Download size={20} className="text-blue-600" />
              </div>
              <div className="flex flex-col">
                <h4 className="text-sm font-bold text-slate-800">Yedekle</h4>
                <p className="text-xs text-slate-500 font-medium">İlaçlarınızı ve geçmişinizi indirin</p>
              </div>
            </div>
            <Button
              onClick={handleExport}
              className="w-full h-12 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold shadow-sm border border-slate-200"
            >
              Yedeği İndir
            </Button>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-5 border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <Upload size={20} className="text-emerald-600" />
              </div>
              <div className="flex flex-col">
                <h4 className="text-sm font-bold text-slate-800">Geri Yükle</h4>
                <p className="text-xs text-slate-500 font-medium">Mevcut bir yedek dosyasını yükleyin</p>
              </div>
            </div>
            <input
              type="file"
              accept=".json"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImport}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-12 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold shadow-sm border border-slate-200"
            >
              Yedeği Geri Yükle
            </Button>
            <p className="text-center text-[10px] text-orange-500 font-bold px-4 leading-tight uppercase mt-1">
              DİKKAT: Geri yükleme işlemi mevcut verilerinizi kalıcı olarak üzerine yazar.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
