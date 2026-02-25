
import { GoogleGenAI, Modality, Chat, Type } from "@google/genai";
import { ImageSize, DefusionTechnique } from "../types";

// Helper for handling 429 Rate Limits with exponential backoff
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 3000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorString = JSON.stringify(error).toLowerCase();
    const errorMessage = (error.message || "").toLowerCase();
    
    const isRateLimit = 
      error.status === 429 || 
      errorMessage.includes("429") || 
      errorMessage.includes("quota") || 
      errorMessage.includes("limit") ||
      errorString.includes("429") ||
      errorString.includes("exhausted");

    if (retries > 0 && isRateLimit) {
      console.warn(`Gemini API rate limited (429/Quota). Retrying in ${delay}ms... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      // Increase delay for next retry (exponential backoff)
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function ensureApiKey(): Promise<boolean> {
  if (typeof window.aistudio === 'undefined') return true; 
  const hasKey = await window.aistudio.hasSelectedApiKey();
  if (!hasKey) {
    await window.aistudio.openSelectKey();
    return true;
  }
  return true;
}

export async function forceSelectKey(): Promise<void> {
  if (typeof window.aistudio !== 'undefined') {
    await window.aistudio.openSelectKey();
  }
}

export function startACTChat(): Chat {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: "You are an empathetic ACT companion for PTSD recovery. Focus on cognitive defusion, acceptance, and values. Provide short, grounding responses. Your goal is to help users unhook from difficult thoughts."
    }
  });
}

export async function generateDefusionTechniques(thought: string): Promise<DefusionTechnique[]> {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ 
        parts: [{ text: `The user is "hooked" by the following thought: "${thought}". Generate 3 cognitive defusion techniques to help them observe this thought without being consumed by it. Return valid JSON.` }] 
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "The name of the technique." },
              description: { type: Type.STRING, description: "Psychological context." },
              exercise: { type: Type.STRING, description: "Instructions." }
            },
            required: ["name", "description", "exercise"],
            propertyOrdering: ["name", "description", "exercise"]
          }
        }
      }
    });
    
    if (!response.text) return [];
    try {
      return JSON.parse(response.text.trim());
    } catch (e) {
      console.error("Failed to parse defusion JSON", e);
      return [];
    }
  });
}

export async function generateTherapyImage(prompt: string, size: ImageSize = '1K'): Promise<string | null> {
  return withRetry(async () => {
    await ensureApiKey();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: [{
          parts: [{ text: `Therapeutic visualization for PTSD grounding: ${prompt}. Art style: Minimalist, soothing, high-quality, tranquil colors.` }]
        }],
        config: { 
          imageConfig: { 
            aspectRatio: "1:1", 
            imageSize: size 
          } 
        }
      });
      
      const candidate = response.candidates?.[0];
      if (!candidate) return null;
      
      const part = candidate.content.parts.find(p => p.inlineData);
      return part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : null;
    } catch (error: any) {
      if (error.message?.includes(" Requested entity was not found.") || error.message?.includes("403") || error.message?.includes("PERMISSION_DENIED")) {
        await forceSelectKey();
      }
      throw error;
    }
  });
}

export async function getACTEducation(topic: string): Promise<string> {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ 
        parts: [{ text: `Explain the ACT core process of "${topic}" in the context of PTSD recovery. Focus on how it helps with symptoms like avoidance or intrusive thoughts. Keep the tone compassionate and clinical.` }] 
      }],
    });
    return response.text || "Information unavailable.";
  });
}

export async function generateGuidedMeditation(focus: string): Promise<{ audioBase64: string, script: string }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Step 1: Generate Script
  const script = await withRetry(async () => {
    const scriptResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ 
        parts: [{ text: `Write a short, 1-minute guided mindfulness script for ${focus}. Focus on slow breathing and present-moment awareness.` }] 
      }],
    });
    return scriptResponse.text || "Take a deep breath. Focus on the present moment.";
  });

  // Brief pause to separate requests and avoid RPM (Requests Per Minute) limits
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Step 2: Generate Audio
  const audioBase64 = await withRetry(async () => {
    const ttsResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: script }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { 
          voiceConfig: { 
            prebuiltVoiceConfig: { voiceName: 'Kore' } 
          } 
        },
      },
    });
    const data = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!data) throw new Error("Audio generation returned empty data");
    return data;
  });
  
  return { audioBase64, script };
}

export function decodeBase64(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  
  for (let c = 0; c < numChannels; c++) {
    const channelData = buffer.getChannelData(c);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + c] / 32768.0;
    }
  }
  return buffer;
}
