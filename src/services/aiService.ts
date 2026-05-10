import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Medication } from "../types";

const addMedicationReminder: FunctionDeclaration = {
  name: "addMedicationReminder",
  description: "Kullanıcı için yeni bir ilaç hatırlatıcısı/kaydı oluşturur.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description: "İlacın adı (örn: Aspirin)",
      },
      dosage: {
        type: Type.STRING,
        description: "Doz miktarı (örn: 500)",
      },
      unit: {
        type: Type.STRING,
        description: "Doz birimi (mg, ml, adet, puff vb.)",
      },
      times: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Kullanım saatleri listesi (SS:dd formatında, örn: ['08:00', '20:00'])",
      },
    },
    required: ["name", "dosage", "unit", "times"],
  },
};

export async function askAI(question: string, medications: Medication[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      text: "API Anahtarı bulunamadı. Lütfen sistem yöneticisinden anahtar almasını isteyin.",
      functionCalls: null
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const medInfo = medications.map(m => `${m.name} (${m.dosage} ${m.unit}) - ${m.times.join(', ')} - Stok: ${m.stock}`).join('\n');
  
  const systemInstruction = `
    Sen "Günlük İlaç Takibim" uygulamasının akıllı sağlık asistanısın. 
    Kullanıcının mevcut ilaç listesi aşağıdadır:
    ${medInfo}
    
    Görevlerin:
    1. İlaçlarla ilgili soruları cevapla.
    2. Hatırlatmalar ve dozlar konusunda yardımcı ol.
    3. Kullanıcı yeni bir ilaçtan bahsederse, ona bu ilaç için bir hatırlatıcı kurmak isteyip istemediğini sor.
    4. Hatırlatıcı kurmak için şu bilgileri eksiksiz almalısın: İlaç adı, doz miktarı, doz birimi (mg, adet vb.) ve kullanım saatleri.
    5. Tüm bilgiler tamamsa 'addMedicationReminder' fonksiyonunu çağır.
    6. Genel sağlık ve esenlik tavsiyeleri ver (asla tıbbi teşhis koyma, her zaman doktora danışmalarını hatırlat).
    7. Samimi, destekleyici ve profesyonel bir dil kullan. Cevaplarını makul uzunlukta tut.
    
    Kritik: Eğer kullanıcı ciddi bir yan etki veya acil durumdan bahsederse, derhal en yakın sağlık kuruluşuna gitmesini veya acil servisi aramasını söyle.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [{ role: 'user', parts: [{ text: question }] }],
      config: {
        systemInstruction: systemInstruction,
        tools: [{ functionDeclarations: [addMedicationReminder] }],
      },
    });
    
    return {
      text: response.text || "",
      functionCalls: response.functionCalls || null
    };
  } catch (error) {
    console.error("askAI error details:", error);
    // If it fails with gemini-flash-latest, maybe tools+systemInstruction in config is not supported for this model in this way?
    // Let's try one more time without tools if it was a basic question, 
    // but here we just return an error to let the user know.
    return {
      text: "Asistan şu an bir bağlantı sorunu yaşıyor. Lütfen biraz sonra tekrar deneyin.",
      functionCalls: null
    };
  }
}
