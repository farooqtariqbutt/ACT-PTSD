import React, { useState, useEffect } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { THERAPY_SESSIONS, type User } from '../../../types';
import { useApp } from '../../context/AppContext';
import { therapistService } from '../../services/therapistService';

import { 
  getPDEQInterpretation, 
  getPCL5Interpretation, 
  getDERSInterpretation, 
  getAAQInterpretation 
} from '../../utils/assessmentUtils';

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/assessments`;

const EXERCISE_LIBRARY = [
  { id: 'ex1', title: '5-4-3-2-1 Grounding', icon: 'fa-spa', color: 'text-emerald-500' },
  { id: 'ex2', title: 'Values Compass Journal', icon: 'fa-location-dot', color: 'text-sky-500' },
  { id: 'ex3', title: 'Story Labeling (Defusion)', icon: 'fa-scissors', color: 'text-indigo-500' },
  { id: 'ex4', title: 'Weekly PCL-5 Assessment', icon: 'fa-clipboard-check', color: 'text-rose-500' },
  { id: 'ex5', title: 'Present Moment Scan', icon: 'fa-eye', color: 'text-amber-500' },
];

const ClientDetail: React.FC = () => {
  const { clientId } = useParams();
  const { themeClasses} = useApp();
  
  const [client, setClient] = useState<User | null>(null);
  const [feedback, setFeedback] = useState('');
  const [selectedSessions, setSelectedSessions] = useState<number[]>(THERAPY_SESSIONS.map(s => s.number));
  const [remindingIdx, setRemindingIdx] = useState<number | null>(null);
  const [sessionFrequency, setSessionFrequency] = useState<'once' | 'twice' | 'thrice'>('once');
  
  // ADDED MISSING STATE HERE
  const [isUpdatingFrequency, setIsUpdatingFrequency] = useState(false);
  
  // Dynamic Red Flag Template State
  const [redFlagTemplate, setRedFlagTemplate] = useState<any>(null);
  
  const [assignedTasks, setAssignedTasks] = useState([
    { date: 'Oct 20', event: 'Assessment Completed', detail: 'PCL-5 Score: 35', icon: 'fa-check', status: 'Completed' },
    { date: 'Oct 18', event: 'Virtual Session', detail: '45 mins duration', icon: 'fa-video', status: 'Completed' },
    { date: 'Oct 22', event: 'Daily Grounding', detail: 'Pending client action', icon: 'fa-clock', status: 'Pending' },
  ]);

  // 1. FETCH LOCAL CLIENT DATA
  useEffect(() => {
    if (clientId) {
      const fetchClient = async () => {
        try {
          const fetchedClient = await therapistService.getClientById(clientId);
          setClient(fetchedClient);
          setSessionFrequency(fetchedClient.sessionFrequency || 'once');
          
          if (fetchedClient.prescribedSessions) {
            setSelectedSessions(fetchedClient.prescribedSessions.map((idx: number) => idx + 1));
          }
        } catch (error) {
          console.error("Failed to load client data", error);
        }
      };
      fetchClient();
    }
  }, [clientId]);

  // 2. Fetch the Red Flag Template from the DB
  useEffect(() => {
    const fetchRedFlags = async () => {
      try {
        const res = await fetch(`${BASE_URL}/template/REDFLAG-V1`);
        if (res.ok) {
          const data = await res.json();
          setRedFlagTemplate(data);
        }
      } catch (err) {
        console.error("Failed to fetch Red Flag template", err);
      }
    };
    fetchRedFlags();
  }, []);

  // 3. UPDATE FREQUENCY
  const handleFrequencyChange = async (freq: 'once' | 'twice' | 'thrice') => {
    if (!client || isUpdatingFrequency || !clientId) return;
    
    setSessionFrequency(freq); // Optimistic UI update
    setIsUpdatingFrequency(true);

    try {
      const updatedClient = await therapistService.updateClientSettings(clientId, { sessionFrequency: freq });
      setClient(updatedClient); // Sync with DB truth
    } catch (err) {
      console.error(err);
      setSessionFrequency(client.sessionFrequency || 'once'); // Rollback on fail
      alert("Failed to save session frequency. Please try again.");
    } finally {
      setIsUpdatingFrequency(false);
    }
  };

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
          <NavLink to="/clients" className={`w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:${themeClasses.text} transition-colors`}>
            <i className="fa-solid fa-arrow-left"></i>
          </NavLink>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{client?.name || 'Alex Johnson'}</h2>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-widest text-[10px]">Patient Record #{clientId || 'C1042'}</p>
          </div>
        </div>
        <div className="flex gap-3">
           <button className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white transition-colors">
             <i className="fa-solid fa-print mr-2"></i> Export Report
           </button>
           <button className={`px-6 py-2.5 ${themeClasses.primary} text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg ${themeClasses.shadow} hover:opacity-90 transition-all`}>
             Start Virtual Session
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Intake Results Summary */}
          <section className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
             {[
               { label: 'PCL-5 (PTSD)', val: 45, max: 80, icon: 'fa-chart-simple', interpretation: getPCL5Interpretation(45).text },
               { label: 'DERS-18 (Dysreg)', val: 58, max: 90, icon: 'fa-bolt', interpretation: getDERSInterpretation(58) },
               { label: 'PDEQ (Dissociation)', val: 22, max: 40, icon: 'fa-face-frown', interpretation: getPDEQInterpretation(22) },
               { label: 'AAQ-II (Inflexibility)', val: 32, max: 49, icon: 'fa-bridge', interpretation: getAAQInterpretation(32) },
             ].map(s => (
               <div key={s.label} className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col gap-3 shadow-sm transition-all hover:border-slate-200">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 ${themeClasses.secondary} ${themeClasses.text} rounded-xl flex items-center justify-center`}>
                       <i className={`fa-solid ${s.icon}`}></i>
                     </div>
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                   </div>
                   <span className={`text-sm font-black ${themeClasses.text}`}>{s.val} / {s.max}</span>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                   <i className="fa-solid fa-circle-info text-slate-400 text-[10px]"></i>
                   <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{s.interpretation}</span>
                 </div>
               </div>
             ))}
          </section>
          
          {/* Dynamically Fetched Red Flags Section (Kept Rose for Safety Warnings) */}
          <section className="bg-rose-50 p-8 rounded-[2.5rem] border border-rose-100">
             <h3 className="text-xs font-black text-rose-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation"></i>
                Safety Red Flags
             </h3>
             <div className="space-y-3">
                {redFlagTemplate ? (
                  redFlagTemplate.questions.map((q: any, i: number) => {
                    const mockAnswers = [
                      { has: true, tf: ['Right Now', 'Past 1 Month'] },
                      { has: true, tf: ['Ever'] },
                      { has: false, tf: [] },
                      { has: false, tf: [] },
                      { has: true, tf: ['Past 1 Month'] },
                    ];
                    const rf = { text: q.text, ...(mockAnswers[i] || { has: false, tf: [] }) };

                    return (
                      <div key={q.id || i} className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${rf.has ? 'bg-white border-rose-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                        <div className="flex items-center gap-3">
                           <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${rf.has ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                              <i className={`fa-solid ${rf.has ? 'fa-check' : 'fa-minus'}`}></i>
                           </div>
                           <p className={`text-sm font-bold ${rf.has ? 'text-slate-800' : 'text-slate-400'}`}>{rf.text}</p>
                        </div>
                        {rf.has && (
                          <div className="flex gap-2">
                            {rf.tf.map(t => (
                              <span key={t} className="px-3 py-1 bg-rose-100 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center gap-3 text-sm text-slate-400 py-4 font-medium">
                    <i className="fa-solid fa-circle-notch fa-spin text-rose-400"></i> Loading Safety Profile...
                  </div>
                )}
             </div>
          </section>

          {/* Prescribed Course of Sessions */}
          <section className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center mb-8">
                <div>
                   <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Course of Sessions</h3>
                   <p className="text-xs text-slate-400 font-medium">Select sessions for the personalized 12-session path</p>
                </div>
                <div className="flex gap-2 items-center">
                   <button onClick={() => setSelectedSessions(THERAPY_SESSIONS.map(s => s.number))} className={`text-[10px] font-black ${themeClasses.text} uppercase hover:opacity-80 transition-opacity`}>Select All</button>
                   <span className="text-slate-200">|</span>
                   <button onClick={() => setSelectedSessions([])} className="text-[10px] font-black text-slate-400 uppercase hover:text-slate-600 transition-colors">Clear</button>
                </div>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {THERAPY_SESSIONS.map(s => (
                  <button
                    key={s.number}
                    onClick={() => toggleSession(s.number)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      selectedSessions.includes(s.number)
                      ? `${themeClasses.secondary} border-transparent shadow-sm ${themeClasses.text}`
                      : 'bg-white border-slate-100 text-slate-400 opacity-60 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-[8px] font-black uppercase tracking-widest mb-1">Session {s.number}</p>
                    <p className="text-xs font-bold leading-tight">{s.title}</p>
                  </button>
                ))}
             </div>
             <button className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-colors">
               Apply Session Path
             </button>
          </section>

          {/* Session Frequency Management - RESTORED & THEMED */}
          <section className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <div className="mb-8">
                <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Session Frequency</h3>
                <p className="text-xs text-slate-400 font-medium">Manage how many times per week the client should attend sessions</p>
             </div>
             <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'once', label: 'Once / week', icon: 'fa-1' },
                  { id: 'twice', label: 'Twice / week', icon: 'fa-2' },
                  { id: 'thrice', label: 'Thrice / week', icon: 'fa-3' },
                ].map((freq) => (
                  <button
                    key={freq.id}
                    disabled={isUpdatingFrequency}
                    onClick={() => handleFrequencyChange(freq.id as any)}
                    className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 group ${
                      sessionFrequency === freq.id
                        ? `${themeClasses.primary} border-transparent text-white shadow-xl ${themeClasses.shadow}`
                        : 'bg-slate-50 border-transparent hover:border-slate-200 hover:bg-white'
                    } ${isUpdatingFrequency ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${sessionFrequency === freq.id ? 'bg-white/20 text-white' : `bg-white ${themeClasses.text} shadow-sm`}`}>
                       {isUpdatingFrequency && sessionFrequency === freq.id ? (
                         <i className="fa-solid fa-circle-notch fa-spin text-white"></i>
                       ) : (
                         <i className={`fa-solid ${freq.icon}`}></i>
                       )}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${sessionFrequency === freq.id ? 'text-white' : 'text-slate-500'}`}>
                      {freq.label}
                    </span>
                  </button>
                ))}
             </div>
          </section>

          <section className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <h3 className="font-black text-slate-800 mb-6 uppercase text-sm tracking-tight">Clinical Directives</h3>
             <textarea 
               value={feedback}
               onChange={(e) => setFeedback(e.target.value)}
               placeholder="Write a supportive note or clinical feedback for Alex to see in-app..."
               className={`w-full h-40 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-2 outline-none resize-none transition-all text-sm font-medium leading-relaxed ${themeClasses.ring}`}
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
             <div className={`absolute top-0 right-0 w-32 h-32 ${themeClasses.primary} opacity-20 rounded-full -mr-16 -mt-16 blur-xl transition-colors duration-500`}></div>
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
                    <i className={`fa-solid fa-plus ml-auto text-[10px] text-slate-500 transition-colors group-hover:${themeClasses.text.replace('text-', 'text-')}`}></i>
                  </button>
                ))}
             </div>
           </section>

           <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h3 className="font-black text-slate-800 mb-8 uppercase text-xs tracking-widest">Clinical Timeline</h3>
              <div className="space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                 {assignedTasks.map((t, i) => (
                   <div key={i} className="flex gap-4 relative z-10 group">
                      <div className={`w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center text-[8px] transition-colors ${
                        t.status === 'Completed' 
                          ? 'border-emerald-200 text-emerald-500' 
                          : `border-slate-200 text-slate-400 group-hover:border-current group-hover:${themeClasses.text}`
                      }`}>
                         <i className={`fa-solid ${t.icon}`}></i>
                      </div>
                      <div className="flex-1">
                         <div className="flex justify-between items-start">
                            <div>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{t.date}</p>
                               <p className={`text-sm font-bold text-slate-800 transition-colors group-hover:${themeClasses.text}`}>{t.event}</p>
                               <p className="text-[10px] text-slate-500 font-medium">{t.detail}</p>
                            </div>
                            {t.status === 'Pending' && (
                               <button 
                                 onClick={() => triggerReminder(i)}
                                 disabled={remindingIdx === i}
                                 className={`px-2 py-1 ${themeClasses.secondary} ${themeClasses.text} rounded text-[8px] font-black uppercase tracking-tighter ${themeClasses.hover} hover:text-white transition-all`}
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