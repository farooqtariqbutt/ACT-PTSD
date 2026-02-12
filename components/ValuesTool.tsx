
import React, { useState } from 'react';
import { LifeDomain } from '../types';

const INITIAL_DOMAINS: LifeDomain[] = [
  { id: '1', name: 'Health', icon: 'fa-heart-pulse', value: 'I value physical vitality.', action: '10 min walk' },
  { id: '2', name: 'Work', icon: 'fa-briefcase', value: 'I value meaningful contribution.', action: 'Send 1 email' },
  { id: '3', name: 'Relationships', icon: 'fa-people-group', value: 'I value presence with family.', action: 'Eat dinner away from phone' },
  { id: '4', name: 'Growth', icon: 'fa-seedling', value: 'I value continuous learning.', action: 'Read 5 pages' }
];

const ValuesTool: React.FC = () => {
  const [domains, setDomains] = useState<LifeDomain[]>(INITIAL_DOMAINS);
  const [editingId, setEditingId] = useState<string | null>(null);

  const updateDomain = (id: string, field: 'value' | 'action', text: string) => {
    setDomains(prev => prev.map(d => d.id === id ? { ...d, [field]: text } : d));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="bg-indigo-600 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">My Values & Compass</h2>
        <p className="text-indigo-100">"Values are like a lighthouse; they guide our direction but we never actually arrive at them."</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {domains.map(domain => (
          <div key={domain.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:border-indigo-200 transition-all group">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
                <i className={`fa-solid ${domain.icon}`}></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">{domain.name}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Life Domain</p>
              </div>
              <button 
                onClick={() => setEditingId(editingId === domain.id ? null : domain.id)}
                className="ml-auto p-2 text-slate-300 hover:text-indigo-600 transition-colors"
              >
                <i className={`fa-solid ${editingId === domain.id ? 'fa-check' : 'fa-pen-to-square'}`}></i>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">My Value</label>
                {editingId === domain.id ? (
                  <input 
                    className="w-full p-3 bg-slate-50 rounded-xl text-sm border border-indigo-100 outline-none"
                    value={domain.value}
                    onChange={(e) => updateDomain(domain.id, 'value', e.target.value)}
                  />
                ) : (
                  <p className="text-slate-700 font-medium italic">"{domain.value}"</p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-50">
                <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-2">Committed Action</label>
                {editingId === domain.id ? (
                  <input 
                    className="w-full p-3 bg-emerald-50 rounded-xl text-sm border border-emerald-100 outline-none"
                    value={domain.action}
                    onChange={(e) => updateDomain(domain.id, 'action', e.target.value)}
                  />
                ) : (
                  <div className="flex items-center gap-3 text-emerald-600 font-bold bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    <i className="fa-regular fa-square-check"></i>
                    <p className="text-sm">{domain.action}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ValuesTool;
