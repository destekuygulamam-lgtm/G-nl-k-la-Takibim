import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ImageCropDialog } from './ImageCropDialog';

interface MedicationImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  medicationName?: string;
  onGenerate?: () => void;
  isGenerating?: boolean;
}

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'
];

export function MedicationImageUpload({ value, onChange, medicationName, onGenerate, isGenerating }: MedicationImageUploadProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Görsel boyutu çok büyük (Maksimum 10MB).');
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

  const generateAIPlaceholder = () => {
    if (!medicationName) {
      toast.error('Önce ilaç adını girmelisiniz.');
      return;
    }
    
    const hash = medicationName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const color = PRESET_COLORS[hash % PRESET_COLORS.length];
    const placeholderUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(medicationName)}&background=${color.replace('#', '')}&color=fff&size=256&bold=true`;
    onChange(placeholderUrl);
    toast.success('Yapay zeka görseli oluşturuldu.');
  };

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 self-start">
        İLAÇ GÖRSELİ
      </Label>
      
      <div className="flex flex-col items-center gap-2">
        <div 
          className="relative group w-40 h-40"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <div className={`w-full h-full rounded-[2.5rem] bg-slate-50 flex items-center justify-center overflow-hidden border-2 border-dashed transition-all duration-300 ${
            value ? 'border-transparent shadow-md' : 'border-slate-200 group-hover:border-blue-400 group-hover:bg-blue-50'
          }`}>
            {value ? (
              <img 
                src={value} 
                alt="Medication" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-300">
                <ImageIcon size={40} strokeWidth={1.5} />
                <span className="text-[10px] font-bold tracking-wider">GÖRSEL EKLE</span>
              </div>
            )}
          </div>

          <div className={`absolute inset-0 flex items-center justify-center gap-3 transition-opacity duration-300 bg-black/30 backdrop-blur-sm rounded-[2.5rem] ${
            isHovering ? 'opacity-100' : 'opacity-0'
          }`}>
            <Button 
              type="button" 
              size="icon" 
              variant="secondary" 
              className="w-10 h-10 rounded-2xl shadow-lg hover:scale-110 active:scale-95 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={18} />
            </Button>

            <Button 
              type="button" 
              size="icon" 
              variant="secondary"
              disabled={isGenerating || !medicationName}
              className="w-10 h-10 rounded-2xl shadow-lg hover:scale-110 active:scale-95 transition-all text-blue-600"
              onClick={onGenerate || generateAIPlaceholder}
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            </Button>

            {value && (
              <Button 
                type="button" 
                size="icon" 
                variant="destructive" 
                className="w-10 h-10 rounded-2xl shadow-lg hover:scale-110 active:scale-95 transition-all"
                onClick={() => onChange('')}
              >
                <X size={18} />
              </Button>
            )}
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/jpeg,image/png,image/webp" 
            onChange={handleFileChange} 
          />
        </div>
        
        {!value && (
          <div className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Dosya Sınırı: 10MB</span>
            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">JPG, PNG veya WEBP</span>
          </div>
        )}
      </div>
      
      {!medicationName && !value && (
        <p className="text-[10px] text-slate-400 font-medium italic animate-pulse">
          Zekice görsel seçenekleri için önce bir isim girin
        </p>
      )}

      <ImageCropDialog
        image={tempImage}
        isOpen={isCropping}
        onClose={() => setIsCropping(false)}
        onSave={(cropped) => {
          onChange(cropped);
        }}
      />
    </div>
  );
}
