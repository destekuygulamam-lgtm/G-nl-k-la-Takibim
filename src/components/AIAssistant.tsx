import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Sparkles, MessageSquare, Trash2 } from 'lucide-react';
import { askAI } from '../services/aiService';
import { Medication } from '../types';
import { Button } from './ui/button';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantProps {
  medHook: {
    medications: Medication[];
    addMedication: (med: Omit<Medication, 'id' | 'active'>) => Promise<void>;
  };
}

export default function AIAssistant({ medHook }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Merhaba! Ben sağlık asistanınız. Yeni bir ilaç için hatırlatıcı kurmamı ister misiniz? Bana ilacın adını, dozunu ve saatlerini söylemeniz yeterli.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
    // Use setTimeout to ensure state is updated before handleSend reads it
    // Or better, pass the suggestion directly to a modified handleSend
    sendChatMessage(suggestion);
  };

  const sendChatMessage = async (msg: string) => {
    if (!msg.trim() || isLoading) return;

    const userMsg = msg.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await askAI(userMsg, medHook.medications);
      
      let aiText = response.text || '';
      
      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const call of response.functionCalls) {
          if (call.name === 'addMedicationReminder') {
            const args = call.args as any;
            await medHook.addMedication({
              name: args.name,
              dosage: args.dosage,
              unit: args.unit || 'Adet',
              times: args.times || ['09:00'],
              frequency: 'daily',
              stock: 0,
              totalStock: 0,
              startDate: new Date().toISOString().split('T')[0],
              reminderEnabled: true,
            });
            
            const confirmationText = `Harika! ${args.name} (${args.dosage} ${args.unit || 'Adet'}) için şu saatlerde hatırlatıcı kurdum: ${(args.times || ['09:00']).join(', ')}.`;
            aiText = aiText ? `${aiText}\n\n${confirmationText}` : confirmationText;
          }
        }
      }

      if (aiText) {
        setMessages(prev => [...prev, { role: 'assistant', content: aiText }]);
      } else if (!response.functionCalls || response.functionCalls.length === 0) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Üzgünüm, bu konuda yardımcı olamıyorum.' }]);
      }
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Asistanla olan bağlantıda bir sorun oluştu.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => sendChatMessage(input);

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: 'Merhaba! Ben sağlık asistanınız. İlaçlarınızla ilgili ne bilmek istersiniz?' }]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] max-h-[600px] gap-4 px-6 pb-8">
      <section className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400">YAPAY ZEKA</p>
          <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight">Akıllı Asistan</h2>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={clearChat}
          className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
        >
          <Trash2 size={18} />
        </Button>
      </section>

      <div className="flex-1 overflow-hidden flex flex-col glass-card rounded-[2.5rem] border-slate-100/50">
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
        >
          {messages.map((msg, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                  msg.role === 'user' ? 'bg-slate-100 text-slate-500' : 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                }`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`rounded-2xl px-4 py-3 text-base leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-slate-100 text-slate-800 rounded-tr-none' 
                    : 'bg-white border border-slate-100 text-slate-700 shadow-sm rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="flex justify-start"
            >
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                  <Bot size={16} />
                </div>
                <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm italic text-slate-400 text-sm">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce delay-100">.</span>
                  <span className="animate-bounce delay-200">.</span>
                  Düşünüyorum
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="p-4 bg-slate-50/50 border-t border-slate-100">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Sorunuzu buraya yazın..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 pr-12 text-base focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-400"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['İlaç dozum ne zaman?', 'Yan etkiler neler?', 'Stok durumum nasıl?'].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => handleSuggestion(suggestion)}
            className="rounded-full bg-white border border-slate-100 px-4 py-2 text-[13px] font-bold text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all cursor-pointer shadow-sm"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
