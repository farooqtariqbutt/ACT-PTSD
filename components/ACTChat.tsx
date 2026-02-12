
import React, { useState, useEffect, useRef } from 'react';
import { startACTChat } from '../services/geminiService';
import { GenerateContentResponse, Chat } from '@google/genai';

const ACTChat: React.FC = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: "Hello. I'm your ACT companion. I'm here to help you notice your thoughts and feelings without judgment. How are you feeling right now?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatInstance = useRef<Chat | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const getChat = () => {
    if (!chatInstance.current) {
      chatInstance.current = startACTChat();
    }
    return chatInstance.current;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const activeChat = getChat();
      const stream = await activeChat.sendMessageStream({ message: userMsg });
      let fullText = '';
      setMessages(prev => [...prev, { role: 'ai', text: '' }]);

      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        fullText += (c.text || '');
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].text = fullText;
          return newMsgs;
        });
      }
    } catch (err: any) {
      console.error("Chat Error:", err);
      let errorText = "I'm sorry, I'm having trouble connecting. Let's take a deep breath together.";
      
      if (err.message?.includes("500") || err.message?.includes("Internal error")) {
        errorText = "The system encountered a temporary error (500). This can happen if the conversation becomes too complex. Let's try starting a fresh dialogue.";
        chatInstance.current = null; // Force re-init on next msg
      }
      
      setMessages(prev => [...prev, { role: 'ai', text: errorText }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-12rem)] flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      <div className="p-4 bg-indigo-600 text-white flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <i className="fa-solid fa-robot"></i>
        </div>
        <div>
          <h3 className="font-bold">ACT Companion</h3>
          <p className="text-xs text-indigo-100">AI Support Assistant</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text || (loading && i === messages.length - 1 ? "Thinking..." : "")}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Describe a thought or feeling..."
            className="flex-1 p-3 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 text-center">
          This is an AI companion, not a substitute for crisis services or clinical therapy.
        </p>
      </div>
    </div>
  );
};

export default ACTChat;
