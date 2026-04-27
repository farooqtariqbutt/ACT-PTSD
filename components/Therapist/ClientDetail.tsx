
import React, { useState, useEffect } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { THERAPY_SESSIONS, User } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { storageService } from '../../services/storageService';
import { PDEQ_QUESTIONS, PCL5_QUESTIONS, DERS_QUESTIONS, AAQ_QUESTIONS } from '../Assessments';

import { notificationService } from '../../services/notificationService';
import { getPDEQInterpretation, getPCL5Interpretation, getDERSInterpretation, getAAQInterpretation, hasRedFlags } from '../../services/assessmentUtils';
import { RED_FLAG_QUESTIONS } from '../Assessments';

const EXERCISE_LIBRARY = [
  { id: 'ex1', title: '5-4-3-2-1 Grounding', icon: 'fa-spa', color: 'text-emerald-500' },
  { id: 'ex2', title: 'Values Compass Journal', icon: 'fa-location-dot', color: 'text-sky-500' },
  { id: 'ex3', title: 'Story Labeling (Defusion)', icon: 'fa-scissors', color: 'text-indigo-500' },
  { id: 'ex4', title: 'Weekly PCL-5 Assessment', icon: 'fa-clipboard-check', color: 'text-rose-500' },
  { id: 'ex5', title: 'Present Moment Scan', icon: 'fa-eye', color: 'text-amber-500' },
];

const ClientDetail: React.FC = () => {
  const { clientId } = useParams();
  const { updateUser } = useApp();
  const [client, setClient] = useState<User | null>(null);
  const [feedback, setFeedback] = useState('');
  const [selectedSessions, setSelectedSessions] = useState<number[]>(THERAPY_SESSIONS.map(s => s.number));
  const [remindingIdx, setRemindingIdx] = useState<number | null>(null);
  const [sessionFrequency, setSessionFrequency] = useState<'once' | 'twice' | 'thrice' | 'daily'>('once');
  const [activeAssessmentView, setActiveAssessmentView] = useState<'pre' | 'post'>('pre');
  const [selectedAssessment, setSelectedAssessment] = useState<{name: string, questions: any[], responses: number[]} | null>(null);

  const openAssessmentModal = (name: string, questions: any[], responses: number[]) => {
    setSelectedAssessment({ name, questions, responses });
  };

  useEffect(() => {
    if (clientId) {
      const users = storageService.getUsers();
      const foundClient = Object.values(users).find(u => u.id === clientId);
      if (foundClient) {
        setClient(foundClient);
        setSessionFrequency(foundClient.sessionFrequency || 'once');
        if (foundClient.prescribedSessions) {
          setSelectedSessions(foundClient.prescribedSessions.map(idx => idx + 1));
        }
      }
    }
  }, [clientId]);

  const handleFrequencyChange = (freq: 'once' | 'twice' | 'thrice' | 'daily') => {
    setSessionFrequency(freq);
    if (client) {
      const updatedClient = { ...client, sessionFrequency: freq };
      updateUser(updatedClient);
      setClient(updatedClient);
    }
  };
  
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

  const triggerReminder = async (idx: number) => {
    setRemindingIdx(idx);
    try {
      // Send push notification
      notificationService.showNotification(`Reminder: Upcoming Session`, {
        body: `Hi ${client?.name}, you have an upcoming session soon.`,
      });
      
      // Send email
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: client?.email,
          subject: 'Upcoming Session Reminder',
          text: `Hi ${client?.name}, you have an upcoming session soon.`,
        }),
      });
      
      alert("Notification sent successfully to client via Push and Email.");
    } catch (error) {
      console.error(error);
      alert("Failed to send notification.");
    } finally {
      setRemindingIdx(null);
    }
  };

  const exportReport = () => {
    if (!client) return;
    const doc = new jsPDF();
    doc.text(`Client Report: ${client.name}`, 14, 15);
    doc.text(`Patient Record: #${clientId || 'C1042'}`, 14, 25);
    
    const scores = client.assessmentScores || {};
    const responses = client.assessmentResponses || {};
    
    autoTable(doc, {
      head: [['Assessment', 'Score', 'Interpretation']],
      body: [
        ['PCL-5 (PTSD)', (scores.pcl5 || 0).toString(), getPCL5Interpretation(scores.pcl5 || 0).text],
        ['DERS-18 (Dysreg)', (scores.ders || 0).toString(), getDERSInterpretation(scores.ders || 0).text],
        ['PDEQ (Dissociation)', (scores.pdeq || 0).toString(), getPDEQInterpretation(scores.pdeq || 0).text],
        ['AAQ-II (Inflexibility)', (scores.aaq || 0).toString(), getAAQInterpretation(scores.aaq || 0).text],
      ],
      startY: 35,
    });

    // Add detailed responses
    let y = (doc as any).lastAutoTable.finalY + 15;
    const addResponses = (title: string, questions: any[], responses: number[]) => {
      doc.text(`${title} Responses:`, 14, y);
      autoTable(doc, {
        head: [['Question', 'Response']],
        body: questions.map((q, i) => [q, responses[i]]),
        startY: y + 5,
      });
      y = (doc as any).lastAutoTable.finalY + 15;
    };
    if (responses.pcl5) addResponses('PCL-5', PCL5_QUESTIONS.map(q => q.text), responses.pcl5);
    if (responses.ders) addResponses('DERS-18', DERS_QUESTIONS, responses.ders);
    if (responses.pdeq) addResponses('PDEQ', PDEQ_QUESTIONS, responses.pdeq);
    if (responses.aaq) addResponses('AAQ-II', AAQ_QUESTIONS, responses.aaq);
    
    doc.save(`${client.name.replace(' ', '_')}_Report.pdf`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {selectedAssessment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300 max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-black text-slate-800 mb-6">{selectedAssessment.name} Responses</h3>
            <div className="space-y-4">
              {selectedAssessment.questions.map((q, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-sm font-bold text-slate-800 mb-2">{i + 1}. {q}</p>
                  <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">Response: {selectedAssessment.responses[i] === undefined || selectedAssessment.responses[i] === -1 ? 'N/A' : selectedAssessment.responses[i]}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setSelectedAssessment(null)} className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">Close</button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <NavLink to="/clients" className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors">
            <i className="fa-solid fa-arrow-left"></i>
          </NavLink>
          <div>
            <h2 className={`text-2xl font-black tracking-tight ${client && hasRedFlags(client) ? 'text-rose-600' : 'text-slate-800'}`}>
              {client?.name || 'Loading...'}
              {client && hasRedFlags(client) && <i className="fa-solid fa-triangle-exclamation ml-2 text-sm" title="Red Flags Detected"></i>}
            </h2>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-widest text-[10px]">Patient Record #{clientId || 'C1042'}</p>
          </div>
        </div>
        <div className="flex gap-3">
           <button onClick={exportReport} className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white transition-colors">
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
          <section className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Clinical Assessments</h3>
                <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                   <button 
                     onClick={() => setActiveAssessmentView('pre')}
                     className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeAssessmentView === 'pre' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                     Pre-Program
                   </button>
                   <button 
                     onClick={() => setActiveAssessmentView('post')}
                     className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeAssessmentView === 'post' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                     Post-Program
                   </button>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(() => {
                  const scores = activeAssessmentView === 'pre' ? client?.assessmentScores : client?.postAssessmentScores;
                  
                  if (!scores) {
                    return (
                      <div className="col-span-2 py-12 text-center bg-white rounded-3xl border border-slate-100 border-dashed">
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No {activeAssessmentView} assessment data available</p>
                      </div>
                    );
                  }

                  return [
                    { 
                      label: 'PCL-5 (PTSD)', 
                      val: scores.pcl5 || 0, 
                      max: 80, 
                      icon: 'fa-chart-simple', 
                      interpretation: getPCL5Interpretation(scores.pcl5 || 0),
                      onClick: () => openAssessmentModal('PCL-5', PCL5_QUESTIONS.map(q => q.text), client?.assessmentResponses?.pcl5 || []),
                      subscales: scores.pcl5Subscales ? [
                        { label: 'Re-experiencing (B)', val: scores.pcl5Subscales.B, max: 20 },
                        { label: 'Avoidance (C)', val: scores.pcl5Subscales.C, max: 8 },
                        { label: 'Cognition/Mood (D)', val: scores.pcl5Subscales.D, max: 28 },
                        { label: 'Hyper-arousal (E)', val: scores.pcl5Subscales.E, max: 24 },
                      ] : null
                    },
                    { 
                      label: 'DERS-18 (Dysreg)', 
                      val: scores.ders || 0, 
                      max: 90, 
                      icon: 'fa-bolt', 
                      interpretation: getDERSInterpretation(scores.ders || 0),
                      onClick: () => openAssessmentModal('DERS-18', DERS_QUESTIONS, client?.assessmentResponses?.ders || []),
                      subscales: scores.dersSubscales ? [
                        { label: 'Awareness', val: scores.dersSubscales.awareness, max: 15 },
                        { label: 'Clarity', val: scores.dersSubscales.clarity, max: 15 },
                        { label: 'Goals', val: scores.dersSubscales.goals, max: 15 },
                        { label: 'Impulse', val: scores.dersSubscales.impulse, max: 15 },
                        { label: 'Non-acceptance', val: scores.dersSubscales.nonAcceptance, max: 15 },
                        { label: 'Strategies', val: scores.dersSubscales.strategies, max: 15 },
                      ] : null
                    },
                    { label: 'PDEQ (Dissociation)', val: scores.pdeq || 0, max: 40, icon: 'fa-face-frown', interpretation: getPDEQInterpretation(scores.pdeq || 0), onClick: () => openAssessmentModal('PDEQ', PDEQ_QUESTIONS, client?.assessmentResponses?.pdeq || []) },
                    { label: 'AAQ-II (Inflexibility)', val: scores.aaq || 0, max: 49, icon: 'fa-bridge', interpretation: getAAQInterpretation(scores.aaq || 0), onClick: () => openAssessmentModal('AAQ-II', AAQ_QUESTIONS, client?.assessmentResponses?.aaq || []) },
                  ].map(s => (
                    <div key={s.label} className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col gap-3 shadow-sm cursor-pointer hover:shadow-md transition-all" onClick={s.onClick}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
                            <i className={`fa-solid ${s.icon}`}></i>
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                        </div>
                        <span className="text-sm font-black text-indigo-600">{s.val} / {s.max}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-100" style={{ backgroundColor: s.interpretation.bg, borderColor: s.interpretation.border }}>
                        <i className={`fa-solid fa-circle-info ${s.interpretation.color} text-[10px]`}></i>
                        <span className={`text-[10px] font-bold ${s.interpretation.color} uppercase tracking-tight`}>{s.interpretation.text}</span>
                      </div>

                      {/* Subscales Display */}
                      {s.subscales && (
                        <div className="mt-2 space-y-2 pt-2 border-t border-slate-50">
                          {s.subscales.map(sub => (
                            <div key={sub.label} className="space-y-1">
                              <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                                <span>{sub.label}</span>
                                <span>{sub.val} / {sub.max}</span>
                              </div>
                              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${s.label.includes('PCL-5') ? 'bg-rose-400' : 'bg-emerald-400'}`} 
                                  style={{ width: `${(sub.val / sub.max) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ));
                })()}
             </div>
          </section>
          
          {/* Red Flags Section */}
          <section className="bg-rose-50 p-8 rounded-[2.5rem] border border-rose-100">
             <h3 className="text-xs font-black text-rose-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation"></i>
                Safety Red Flags
             </h3>
             <div className="space-y-3">
                {RED_FLAG_QUESTIONS.map((q, i) => {
                  const scores = activeAssessmentView === 'pre' ? client?.assessmentScores : client?.postAssessmentScores;
                  const rfData = scores?.redFlags?.[i] || { hasFlag: false, rightNow: false, pastMonth: false, ever: false };
                  const has = rfData.hasFlag === true;
                  const tf = [];
                  if (rfData.rightNow) tf.push('Right Now');
                  if (rfData.pastMonth) tf.push('Past 1 Month');
                  if (rfData.ever) tf.push('Ever');

                  return (
                    <div key={i} className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${has ? 'bg-white border-rose-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                      <div className="flex items-center gap-3">
                         <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${has ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                            <i className={`fa-solid ${has ? 'fa-check' : 'fa-minus'}`}></i>
                         </div>
                         <p className={`text-sm font-bold ${has ? 'text-slate-800' : 'text-slate-400'}`}>{q}</p>
                      </div>
                      {has && tf.length > 0 && (
                        <div className="flex gap-2">
                          {tf.map(t => (
                            <span key={t} className="px-3 py-1 bg-rose-100 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
             </div>
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

          {/* Session Progress & Answers */}
          <section className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <div className="mb-8">
                <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Session Progress & Answers</h3>
                <p className="text-xs text-slate-400 font-medium">Review client's progress and responses from their 12-session journey</p>
             </div>
             
             <div className="space-y-6">
                {THERAPY_SESSIONS.map(s => {
                  const sessionData = client?.sessionData?.filter(d => d.sessionNumber === s.number) || [];
                  const isCompleted = (client?.currentSession || 1) > s.number;
                  const isCurrent = (client?.currentSession || 1) === s.number;

                  return (
                    <div key={s.number} className={`p-6 rounded-3xl border-2 transition-all ${isCompleted ? 'bg-emerald-50 border-emerald-100' : isCurrent ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-transparent opacity-60'}`}>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isCompleted ? 'bg-emerald-600 text-white' : isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                            {isCompleted ? <i className="fa-solid fa-check"></i> : <span>{s.number}</span>}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800">{s.title}</h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Not Started'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {sessionData.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Session Answers:</p>
                          {sessionData.map((data, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                              <p className="text-[10px] font-bold text-indigo-600 uppercase mb-1">{data.stepId.replace(/-/g, ' ')}</p>
                              <p className="text-sm text-slate-700 font-medium italic">"{typeof data.answer === 'object' ? JSON.stringify(data.answer) : data.answer}"</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
             </div>
          </section>

          {/* Reminder Settings */}
          <section className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <div className="mb-8">
                <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Reminder Settings</h3>
                <p className="text-xs text-slate-400 font-medium">Configure automatic reminders for this client</p>
             </div>
             <div className="flex items-center gap-4">
                <label className="text-sm font-bold text-slate-700">Reminder Timing (Days before session):</label>
                <input 
                  type="number"
                  value={client?.reminderSettings?.reminderTimingDays || 1}
                  onChange={(e) => {
                    if (client) {
                      const updatedClient = { 
                        ...client, 
                        reminderSettings: { ...client.reminderSettings, reminderTimingDays: parseInt(e.target.value) } 
                      };
                      updateUser(updatedClient);
                      setClient(updatedClient);
                    }
                  }}
                  className="w-20 p-2 border border-slate-200 rounded-lg"
                />
             </div>
          </section>

          {/* Session Frequency Management */}
          <section className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <div className="mb-8">
                <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Session Frequency</h3>
                <p className="text-xs text-slate-400 font-medium">Manage how many times per week the client should attend sessions</p>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { id: 'once', label: 'Once / week', icon: 'fa-1' },
                  { id: 'twice', label: 'Twice / week', icon: 'fa-2' },
                  { id: 'thrice', label: 'Thrice / week', icon: 'fa-3' },
                  { id: 'daily', label: 'Daily', icon: 'fa-calendar-day' },
                ].map((freq) => (
                  <button
                    key={freq.id}
                    onClick={() => handleFrequencyChange(freq.id as any)}
                    className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 group ${
                      sessionFrequency === freq.id
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100'
                        : 'bg-slate-50 border-transparent hover:border-indigo-200 hover:bg-white'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${sessionFrequency === freq.id ? 'bg-white/20 text-white' : 'bg-white text-indigo-600 shadow-sm'}`}>
                       <i className={`fa-solid ${freq.icon}`}></i>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${sessionFrequency === freq.id ? 'text-indigo-100' : 'text-slate-500'}`}>
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
