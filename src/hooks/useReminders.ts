import { useEffect } from 'react';
import { Medication } from '../types';
import { toast } from 'sonner';
import { Settings } from './useSettings';

export function useReminders(medications: Medication[], settings: Settings) {
  useEffect(() => {
    // Request permission on startup if not already decided
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    let lastCheckedMinute = -1;

    const playSound = (soundType: string) => {
      if (soundType === 'none') return;
      // Define basic audio frequencies for different sound types
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

        if (soundType === 'gentle') {
          playTone(440, 'sine', 0.5, 0);
          playTone(554.37, 'sine', 0.5, 0.2);
        } else if (soundType === 'alert') {
          playTone(880, 'square', 0.1, 0);
          playTone(880, 'square', 0.1, 0.2);
          playTone(880, 'square', 0.1, 0.4);
        } else if (soundType === 'retro') {
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

    const checkReminders = () => {
      const now = new Date();
      const currentMinute = now.getMinutes();

      // Only check once per minute
      if (currentMinute === lastCheckedMinute) return;
      lastCheckedMinute = currentMinute;

      const currentTimeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      medications.forEach(med => {
        if (med.active && med.reminderEnabled) {
          if (med.times.includes(currentTimeString)) {
            const message = `Sizin için ${med.name} (${med.dosage} ${med.unit}) saati geldi! Sağlığınız için almayı unutmayın. Asistanınız yanınızda.`;
            
            // Play reminder sound
            playSound(settings.reminderSound || 'default');

            // Trigger notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('İlaç Hatırlatıcısı', {
                body: message,
                icon: '/favicon.ico'
              });
            } else {
              // Fallback to toast
              toast.info(message, {
                duration: 10000,
                action: {
                  label: 'Tamam',
                  onClick: () => {}
                }
              });
            }
          }
        }
      });
    };

    const intervalId = setInterval(checkReminders, 10000); // Check every 10 seconds
    
    // Initial check
    checkReminders();

    return () => clearInterval(intervalId);
  }, [medications, settings.reminderSound]);
}
