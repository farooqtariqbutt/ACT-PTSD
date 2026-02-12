
import React, { useState } from 'react';
import { useParams, NavLink } from 'react-router-dom';
// Fix: Import THERAPY_SESSIONS from types.ts instead of VirtualSession
import { THERAPY_SESSIONS } from '../../types';

const EXERCISE_LIBRARY = [
  { id: 'ex1', title: '5-4-3-2-1 Grounding', icon: 'fa-spa', color: 'text-emerald-500' },
  { id: 'ex2', title: 'Values Compass Journal', icon: 'fa-location-dot', color: 'text-sky-500' },
  { id: 'ex3', title: 'Story Labeling (Defusion)', icon: 'fa-scissors', color: 'text-indigo-500' },
  { id: 'ex4', title: 'Weekly PCL-5 Assessment', icon: 'fa-clipboard-check', color: 'text-rose-500' },
  { id: 'ex5', title: 'Present Moment Scan', icon: 'fa-eye', color: 'text-amber-500' },
];

const ClientDetail: React.FC = () => {
  const { clientId } = useParams();
  const [feedback, setFeedback] = useState('');
  const [selectedSessions, setSelectedSessions] = useState<number[]>(THERAPY_SESSIONS.map(s => s.number));
  const [remindingIdx, setRemindingIdx] = useState<number | null>(null);
  
  const [assignedTasks, setAssignedTasks] = useState([
    { date: 'Oct 20', event: 'Assessment Completed', detail: 'PCL-5 Score: 35', icon: 'fa-check', status: 'Completed' },
    { date: 'Oct 18', event: 'Virtual Session', detail: '45 mins duration', icon: 'fa-video', status: 'Completed' },
    { date: 'Oct 22', event: 'Daily Grounding', detail: 'Pending client action', icon: 'fa-clock', status: 'Pending' },
  ]);

  const toggleSession = (num: number) => {
    setSelectedSessions(prev => 
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num].sort((a,b) => a-b)
    );
  };

  const handleAssign = (ex: typeof EXERCISE_LIBRARY[0]) => {
    const newTask = {
      date: 'Today',
      event: `New Task: ${ex.title}`,
      detail: 'Awaiting client completion',
      icon: 'fa-plus',
      status: 'Pending'
    };
    setAssignedTasks([newTask, ...assignedTasks]);
  };

  const triggerReminder = (idx: number) => {
    setRemindingIdx(idx);
    setTimeout(() => {
      setRemindingIdx(null);
      alert("Notification sent successfully to client via Push and Email.");
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <NavLink to="/clients" className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors">
            <i className="fa-solid fa-arrow-left"></i>
          </NavLink>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Alex Johnson</h2>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-widest text-[10px]">Patient Record #{clientId || 'C1042'}</p>
          </div>
        </div>
        <div className="flex gap-3">
           <button className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white transition-colors">
             <i className="fa-solid fa-print mr-2"></i> Export Report
           </button>
           <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
             Start Virtual Session
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Intake Results Summary */}
          <section className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4">
             {[
               { label: 'Mood', val: 'Level 2', icon: 'fa-face-frown' },
               { label: 'PCL-5', val: '35 / 80', icon: 'fa-chart-simple' },
               { label: 'Dysreg', val: '12 / 16', icon: 'fa-bolt' },
               { label: 'AAQ', val: '8 / 16', icon: 'fa-bridge' },
             ].map(s => (
               <div key={s.label} className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col items-center">
                 <i className={`fa-solid ${s.icon} text-indigo-500 mb-2`}></i>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                 <span className="text-sm font-bold text-slate-800">{s.val}</span>
               </div>
             ))}
          </section>

          {/* Prescribed Course of Sessions */}
          <section className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center mb-8">
                <div>
                   <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Course of Sessions</h3>
                   <p className="text-xs text-slate-400 font-medium">Select sessions for the personalized 12-session path</p>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => setSelectedSessions(THERAPY_SESSIONS.map(s => s.number))} className="text-[10px] font-black text-indigo-600 uppercase">Select All</button>
                   <span className="text-slate-200">|</span>
                   <button onClick={() => setSelectedSessions([])} className="text-[10px] font-black text-slate-400 uppercase">Clear</button>
                </div>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {THERAPY_SESSIONS.map(s => (
                  <button
                    key={s.number}
                    onClick={() => toggleSession(s.number)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      selectedSessions.includes(s.number)
                      ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-sm'
                      : 'bg-white border-slate-100 text-slate-400 opacity-60'
                    }`}
                  >
                    <p className="text-[8px] font-black uppercase tracking-widest mb-1">Session {s.number}</p>
                    <p className="text-xs font-bold leading-tight">{s.title}</p>
                  </button>
                ))}
             </div>
             <button className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">
               Apply Session Path
             </button>
          </section>

          <section className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <h3 className="font-black text-slate-800 mb-6 uppercase text-sm tracking-tight">Clinical Directives</h3>
             <textarea 
               value={feedback}
               onChange={(e) => setFeedback(e.target.value)}
               placeholder="Write a supportive note or clinical feedback for Alex to see in-app..."
               className="w-full h-40 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all text-sm font-medium leading-relaxed"
             />
             <div className="mt-6 flex justify-end">
                <button className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                  <i className="fa-solid fa-paper-plane mr-2"></i> Push to Client App
                </button>
             </div>
          </section>
        </div>

        <div className="space-y-8">
           <section className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-xl"></div>
             <h3 className="font-black text-lg mb-8 uppercase tracking-tight">Clinical Exercise Library</h3>
             <div className="space-y-3">
                {EXERCISE_LIBRARY.map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => handleAssign(item)}
                    className="w-full text-left p-4 bg-white/5 border border-white/10 rounded-[1.5rem] hover:bg-white/10 transition-all flex items-center gap-4 group"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg ${item.color} group-hover:scale-110 transition-transform`}>
                       <i className={`fa-solid ${item.icon}`}></i>
                    </div>
                    <span className="text-xs font-bold text-slate-200 tracking-wide">{item.title}</span>
                    <i className="fa-solid fa-plus ml-auto text-slate-600 text-[10px] group-hover:text-indigo-400"></i>
                  </button>
                ))}
             </div>
           </section>

           <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h3 className="font-black text-slate-800 mb-8 uppercase text-xs tracking-widest">Clinical Timeline</h3>
              <div className="space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                 {assignedTasks.map((t, i) => (
                   <div key={i} className="flex gap-4 relative z-10 group">
                      <div className={`w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center text-[8px] transition-colors ${t.status === 'Completed' ? 'border-emerald-200 text-emerald-500' : 'border-slate-200 text-slate-400 group-hover:border-indigo-400 group-hover:text-indigo-600'}`}>
                         <i className={`fa-solid ${t.icon}`}></i>
                      </div>
                      <div className="flex-1">
                         <div className="flex justify-between items-start">
                            <div>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{t.date}</p>
                               <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{t.event}</p>
                               <p className="text-[10px] text-slate-500 font-medium">{t.detail}</p>
                            </div>
                            {t.status === 'Pending' && (
                               <button 
                                 onClick={() => triggerReminder(i)}
                                 disabled={remindingIdx === i}
                                 className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[8px] font-black uppercase tracking-tighter hover:bg-indigo-600 hover:text-white transition-all"
                               >
                                  {remindingIdx === i ? (
                                    <img src="https://i.ibb.co/FkV0M73k/brain.png" alt="loading" className="w-2.5 h-2.5 brain-loading-img" />
                                  ) : 'Remind'}
                               </button>
                            )}
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
           </section>
        </div>
      </div>
    </div>
  );
};

export default ClientDetail;
