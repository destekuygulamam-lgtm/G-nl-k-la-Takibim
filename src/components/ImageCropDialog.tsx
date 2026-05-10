import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Check, Crop, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getCroppedImg, resizeImage } from '../lib/imageUtils';
import { toast } from 'sonner';

interface ImageCropDialogProps {
  image: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (croppedImage: string) => void;
  aspect?: number;
}

export function ImageCropDialog({ image, isOpen, onClose, onSave, aspect = 1 }: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!image || !croppedAreaPixels) return;

    try {
      setIsProcessing(true);
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      const resizedImage = await resizeImage(croppedImage, 400, 400);
      
      if (resizedImage.length > 900000) {
        toast.error('Görsel hâlâ çok büyük, lütfen farklı bir fotoğraf deneyin.');
      } else {
        onSave(resizedImage);
        onClose();
      }
    } catch (e) {
      console.error(e);
      toast.error('Görsel işlenirken bir hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && onClose()}>
      <DialogContent className="sm:max-w-md bg-white p-0 overflow-hidden rounded-3xl border-none">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Crop size={24} className="text-blue-600" />
            Görseli Düzenle
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative w-full h-[350px] bg-slate-900">
          {image && (
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          )}
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest">
              <span>Yakınlaştır</span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <DialogFooter className="flex-row gap-3 sm:justify-end">
            <Button 
              type="button" 
              variant="ghost" 
              className="flex-1 sm:flex-none h-12 rounded-2xl font-bold text-slate-500"
              onClick={onClose}
              disabled={isProcessing}
            >
              İptal
            </Button>
            <Button 
              type="button" 
              className="flex-1 sm:flex-none h-12 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white px-8"
              onClick={handleSave}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <Check size={20} className="mr-2" />
                  Kaydet
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
