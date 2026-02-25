
import React, { useState } from 'react';
import { SessionData } from '../types';
import { storageService } from '../services/storageService';
import { useApp } from '../contexts/AppContext';

const ValuesActionLog: React.FC = () => {
  const { currentUser: user } = useApp();
  const [newAction, setNewAction] = useState({
    value: '',
    action: '',
    size: 'Small',
    alignment: 5,
    feelings: '',
    obstacles: ''
  });

  const logs = (user.sessionData || [])
    .filter(d => d.stepId === 'value-action-step')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleAddLog = () => {
    if (!newAction.value || !newAction.action) return;
    
    const data: SessionData = {
      sessionNumber: 6,
      stepId: 'value-action-step',
      stepTitle: 'Daily Values Step',
      inputValue: newAction,
      timestamp: new Date().toISOString()
    };
    
    storageService.addSessionData(user.id, data);
    setNewAction({ value: '', action: '', size: 'Small', alignment: 5, feelings: '', obstacles: '' });
    window.location.reload(); // Refresh to show new data in this static-simulated env
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10"><i className="fa-solid fa-list-check text-[10rem]"></i></div>
        <h2 className="text-3xl font-black mb-2 tracking-tight">Values Action Log</h2>
        <p className="text-indigo-100 font-medium italic">"Action is the antidote to despair." — Track your small steps toward what matters.</p>
      </div>

      <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm space-y-6">
        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
          <i className="fa-solid fa-plus text-indigo-500"></i>
          Record New Daily Step
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Selected Value</label>
            <input 
              type="text" 
              placeholder="e.g. Authenticity"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              value={newAction.value}
              onChange={e => setNewAction({...newAction, value: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Action Taken</label>
            <input 
              type="text" 
              placeholder="e.g. Spoke honestly to my boss"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              value={newAction.action}
              onChange={e => setNewAction({...newAction, action: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Alignment (1-5)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(num => (
                <button 
                  key={num}
                  onClick={() => setNewAction({...newAction, alignment: num})}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${newAction.alignment === num ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Step Size</label>
            <select 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              value={newAction.size}
              onChange={e => setNewAction({...newAction, size: e.target.value})}
            >
              <option>Small</option>
              <option>Medium</option>
              <option>Big</option>
            </select>
          </div>
        </div>
        <button 
          onClick={handleAddLog}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all"
        >
          Add to My Journey
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Action History</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase">{logs.length} Steps Logged</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Value</th>
                <th className="px-8 py-5">Action</th>
                <th className="px-8 py-5">Alignment</th>
                <th className="px-8 py-5">Obstacles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.map((log, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5 text-xs font-bold text-slate-500">{new Date(log.timestamp).toLocaleDateString()}</td>
                  <td className="px-8 py-5"><span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase">{log.inputValue.value}</span></td>
                  <td className="px-8 py-5 text-sm font-medium text-slate-700">{log.inputValue.action}</td>
                  <td className="px-8 py-5">
                    <div className="flex gap-1">
                      {Array.from({length: 5}).map((_, star) => (
                        <i key={star} className={`fa-solid fa-star text-[8px] ${star < log.inputValue.alignment ? 'text-amber-400' : 'text-slate-200'}`}></i>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-xs italic text-slate-400">{log.inputValue.obstacles || 'None'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic">No value-based steps logged yet. Start today!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ValuesActionLog;
