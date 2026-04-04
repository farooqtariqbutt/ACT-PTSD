import React, { useState, useEffect } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { THERAPY_SESSIONS, type User } from '../../../types';
import { useApp } from '../../context/AppContext';
import { therapistService } from '../../services/therapistService';
import { getAAQInterpretation, getDERSInterpretation, getPCL5Interpretation, getPDEQInterpretation } from '../../utils/assessmentUtils';

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
  const { themeClasses } = useApp();
  
  const [client, setClient] = useState<User | null>(null);
  const [feedback, setFeedback] = useState('');
  const [selectedSessions, setSelectedSessions] = useState<number[]>(THERAPY_SESSIONS.map(s => s.number));
  const [remindingIdx, setRemindingIdx] = useState<number | null>(null);
  const [sessionFrequency, setSessionFrequency] = useState<'once' | 'twice' | 'thrice'>('once');
  const [activeAssessmentView, setActiveAssessmentView] = useState<'pre' | 'post'>('pre');
  const [isUpdatingFrequency, setIsUpdatingFrequency] = useState(false);
  const [isUpdatingPath, setIsUpdatingPath] = useState(false);

  const [selectedAssessment, setSelectedAssessment] = useState<{
    name: string;
    rows: { questionText: string; selectedLabel: string }[];
  } | null>(null);
  const [isLoadingModal, setIsLoadingModal] = useState(false);
  const [templateCache, setTemplateCache] = useState<Record<string, any>>({});

  const openAssessmentModal = async (name: string, testType: string, storedItems: any[]) => {
    setIsLoadingModal(true);
    setSelectedAssessment(null);

    try {
      let cache = templateCache;

      if (!Object.keys(cache).length) {
        const res = await fetch(`${BASE_URL}/templates`);
        if (!res.ok) throw new Error('Failed to fetch templates');
        const data: any[] = await res.json();
        cache = data.reduce((acc, t) => ({ ...acc, [t.code]: t }), {});
        setTemplateCache(cache);
      }

      // Match template by code — e.g. testType 'PCL5-PRE' matches code 'PCL5-V1'
      const keyword = testType.split('-')[0];
      const template = Object.values(cache).find((t: any) =>
        t.code?.toUpperCase().includes(keyword.toUpperCase())
      ) as any;

      // ✅ Template stores questions in `questions`, each with `text` and `options: [{label, value}]`
      const templateQuestions: any[] = template?.questions || [];

      const rows = storedItems.map((storedItem: any, idx: number) => {
        // Match by index or by question id saved in the stored item
        const tQuestion =
          templateQuestions.find((q: any) => q.id === storedItem.questionId) ??
          templateQuestions[idx];

        const questionText = tQuestion?.text ?? `Question ${idx + 1}`;

        // The stored answer is a numeric value — find the matching option label
        const storedValue = storedItem.answer ?? storedItem.value;
        const matchedOption = tQuestion?.options?.find(
          (opt: any) => opt.value === storedValue
        );

        const selectedLabel = matchedOption
          ? matchedOption.label
          : storedValue !== undefined && storedValue !== null
          ? String(storedValue)
          : 'N/A';

        return { questionText, selectedLabel };
      });

      setSelectedAssessment({ name, rows });
    } catch (err) {
      console.error('Failed to load template for modal', err);
      setSelectedAssessment({
        name,
        rows: storedItems.map((item: any, idx: number) => ({
          questionText: item.question || item.text || `Question ${idx + 1}`,
          selectedLabel: String(item.answer ?? item.value ?? 'N/A'),
        })),
      });
    } finally {
      setIsLoadingModal(false);
    }
  };
  
  // Dynamic Red Flag Template State
  const [redFlagTemplate, setRedFlagTemplate] = useState<any>(null);
 
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);

  const exportReport = () => {
    if (!client) return;
    
    // Dynamically import jsPDF and autoTable if you haven't at the top of the file
    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then(({ default: autoTable }) => {
        const doc = new jsPDF();
        doc.text(`Clinical Assessment Report: ${client.name}`, 14, 15);
        doc.text(`Patient Record: #${clientId || 'C1042'}`, 14, 25);
        
        const scores = (client.currentClinicalSnapshot as any) || {};
        
        // 1. Main Assessment Overview
        autoTable(doc, {
          head: [['Assessment', 'Score', 'Interpretation']],
          body: [
            ['PCL-5 (PTSD)', (scores.pcl5Total || 0).toString(), getPCL5Interpretation(scores.pcl5Total || 0).text || 'N/A'],
            ['DERS-18 (Dysregulation)', (scores.dersTotal || 0).toString(), getDERSInterpretation(scores.dersTotal || 0).text || 'N/A'],
            ['PDEQ (Dissociation)', (scores.pdeqTotal || 0).toString(), getPDEQInterpretation(scores.pdeqTotal || 0).text || 'N/A'],
            ['AAQ-II (Inflexibility)', (scores.aaqTotal || 0).toString(), getAAQInterpretation(scores.aaqTotal || 0).text || 'N/A'],
          ],
          startY: 35,
          theme: 'grid',
          styles: { fontSize: 10 },
          headStyles: { fillColor: [79, 70, 229] } // Indigo-600
        });

        let currentY = (doc as any).lastAutoTable.finalY + 15;

        // 2. PCL-5 Subscales
        if (scores.pcl5Subscales) {
          doc.text('PCL-5 Subscale Breakdown', 14, currentY);
          autoTable(doc, {
            head: [['Cluster', 'Score', 'Max']],
            body: [
              ['Re-experiencing (B)', scores.pcl5Subscales.B || 0, '20'],
              ['Avoidance (C)', scores.pcl5Subscales.C || 0, '8'],
              ['Cognition/Mood (D)', scores.pcl5Subscales.D || 0, '28'],
              ['Hyper-arousal (E)', scores.pcl5Subscales.E || 0, '24'],
            ],
            startY: currentY + 5,
            theme: 'grid',
            headStyles: { fillColor: [225, 29, 72] } // Rose-600
          });
          currentY = (doc as any).lastAutoTable.finalY + 15;
        }

        // 3. DERS-18 Subscales
        if (scores.dersSubscales) {
          doc.text('DERS-18 Emotion Profile Breakdown', 14, currentY);
          autoTable(doc, {
            head: [['Category', 'Score', 'Max']],
            body: [
              ['Awareness', scores.dersSubscales.awareness || 0, '15'],
              ['Clarity', scores.dersSubscales.clarity || 0, '15'],
              ['Goals', scores.dersSubscales.goals || 0, '15'],
              ['Impulse', scores.dersSubscales.impulse || 0, '15'],
              ['Non-acceptance', scores.dersSubscales.nonAcceptance || 0, '15'],
              ['Strategies', scores.dersSubscales.strategies || 0, '15'],
            ],
            startY: currentY + 5,
            theme: 'grid',
            headStyles: { fillColor: [5, 150, 105] } // Emerald-600
          });
        }

        doc.save(`${client.name.replace(/\s+/g, '_')}_Clinical_Report.pdf`);
      });
    });
  };

  // 1. FETCH CLIENT DATA & BUILD TIMELINE
  useEffect(() => {
    if (clientId) {
      const fetchClient = async () => {
        try {
          const fetchedClient = await therapistService.getClientById(clientId);
          setClient(fetchedClient);
          setFeedback(fetchedClient.clinicalDirectives || '');
          setSessionFrequency(fetchedClient.sessionFrequency || 'once');
          
          if (fetchedClient.prescribedSessions) {
            setSelectedSessions(fetchedClient.prescribedSessions);
          }

          // --- BUILD DYNAMIC TIMELINE ---
          const events: any[] = [];

          // A. Onboarding Event
          if (fetchedClient.createdAt) {
            events.push({
              dateObj: new Date(fetchedClient.createdAt),
              date: new Date(fetchedClient.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              event: 'Client Onboarded',
              detail: 'Account created & linked',
              icon: 'fa-user-plus',
              status: 'Completed'
            });
          }

          // B. Assessment Events
          if (fetchedClient.assessmentHistory) {
            fetchedClient.assessmentHistory.forEach((a: any) => {
              if (!a.testType.includes('REDFLAG')) { // Hide red flags from general timeline
                events.push({
                  dateObj: new Date(a.completedAt),
                  date: new Date(a.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  event: `${a.phase} Assessment: ${a.testType.split('-')[0]}`,
                  detail: `Score: ${a.totalScore}`,
                  icon: 'fa-clipboard-check',
                  status: 'Completed'
                });
              }
            });
          }

          // C. Session Events
          // C. Session Events (Started or Completed)
          const startedSessions = new Set();
          
          if (fetchedClient.sessionHistory) {
            fetchedClient.sessionHistory.forEach((s: any) => {
              startedSessions.add(s.sessionNumber);
              events.push({
                dateObj: new Date(s.timestamp),
                date: new Date(s.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                event: `Session ${s.sessionNumber}`,
                detail: s.status === 'COMPLETED' ? `${s.totalDurationMinutes || 0} mins` : `Started, not finished`,
                icon: s.status === 'COMPLETED' ? 'fa-video' : 'fa-spinner',
                status: s.status === 'COMPLETED' ? 'Completed' : 'Pending'
              });
            });
          }

         // D. The NEXT Unstarted Session (The strictly PENDING one)
          if (fetchedClient.prescribedSessions) {
            // 1. Sort the prescribed sessions to ensure they are in order (1, 2, 3...)
            const sortedPrescribed = [...fetchedClient.prescribedSessions].sort((a, b) => a - b);
            
            // 2. Find ONLY the very first session that hasn't been started yet
            const nextSession = sortedPrescribed.find((sessionNum) => !startedSessions.has(sessionNum));

            // 3. Push only this single unlocked session to the timeline
            if (nextSession) {
              events.push({
                dateObj: new Date(), // Uses today's date so it stays at the top
                date: 'Next Up',
                event: `Session ${nextSession}`,
                detail: 'Currently unlocked & awaiting client',
                icon: 'fa-hourglass-start',
                status: 'Pending'
              });
            }
          }
          // Sort chronologically (newest first)
          events.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
          setAssignedTasks(events);

        } catch (error) {
          console.error("Failed to load client data", error);
        }
      };
      fetchClient();
    }
  }, [clientId]);

  const handleApplyPath = async () => {
    if (!clientId || isUpdatingPath) return;
  
    setIsUpdatingPath(true);
    try {
      // We send selectedSessions. 
      // Note: If your backend expects 0-indexed values, you might need:
      // selectedSessions.map(n => n - 1)
      await therapistService.updateClientSettings(clientId, { 
        prescribedSessions: selectedSessions 
      });
      
      alert("Session path updated successfully!");
    } catch (err) {
      console.error("Failed to update session path", err);
      alert("Failed to save session path. Please try again.");
    } finally {
      setIsUpdatingPath(false);
    }
  };

  // 2. FETCH RED FLAG TEMPLATE
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
      setClient(updatedClient);
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
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num].sort((a, b) => a - b)
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
    if (!clientId) return;
    
    setRemindingIdx(idx);
    const task = assignedTasks[idx]; // Grab the specific task they are being reminded about

    try {
      const token = localStorage.getItem('token');
      
      // Use your existing environment variable for the base URL
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications/remind`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId: clientId,
          taskName: task.event,
          taskDetail: task.detail
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Reminder for "${task.event}" sent successfully to the client!`);
      } else {
        alert(result.message || "Failed to send notification.");
      }
    } catch (error) {
      console.error("Reminder Error:", error);
      alert("A network error occurred while sending the reminder.");
    } finally {
      setRemindingIdx(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
     {(isLoadingModal || selectedAssessment) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300 max-h-[80vh] overflow-y-auto">
            {isLoadingModal ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <i className="fa-solid fa-circle-notch fa-spin text-3xl text-indigo-400"></i>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Assessment…</p>
              </div>
            ) : selectedAssessment && (
              <>
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assessment Responses</p>
                    <h3 className="text-2xl font-black text-slate-800">{selectedAssessment.name}</h3>
                    <p className="text-xs text-slate-400 font-medium mt-1">{selectedAssessment.rows.length} questions answered</p>
                  </div>
                  <button onClick={() => setSelectedAssessment(null)} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                    <i className="fa-solid fa-xmark text-sm"></i>
                  </button>
                </div>
                <div className="space-y-3">
                  {selectedAssessment.rows.map((row, i) => (
                    <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Q{i + 1}</p>
                      <p className="text-sm font-semibold text-slate-800 leading-snug mb-3">{row.questionText}</p>
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ${themeClasses.secondary}`}>
                        <i className={`fa-solid fa-circle-check text-[10px] ${themeClasses.text}`}></i>
                        <span className={`text-[11px] font-black ${themeClasses.text} uppercase tracking-wide`}>{row.selectedLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setSelectedAssessment(null)} className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md">Close</button>
              </>
            )}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <NavLink to="/clients" className={`w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:${themeClasses.text} transition-colors`}>
            <i className="fa-solid fa-arrow-left"></i>
          </NavLink>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{client?.name || 'Alex Johnson'}</h2>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-widest text-[10px]">Export Record #{clientId || 'C1042'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={exportReport} className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white transition-colors">
            <i className="fa-solid fa-print mr-2"></i> Export Report
          </button>
          <button className={`px-6 py-2.5 ${themeClasses.primary} text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg ${themeClasses.shadow} hover:opacity-90 transition-all`}>
            Start Virtual Session
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Clinical Assessments — Pre/Post Toggle */}
          <section className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Clinical Assessments</h3>
              <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setActiveAssessmentView('pre')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeAssessmentView === 'pre'
                      ? `${themeClasses.primary} text-white shadow-md`
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Pre-Program
                </button>
                <button
                  onClick={() => setActiveAssessmentView('post')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeAssessmentView === 'post'
                      ? `${themeClasses.primary} text-white shadow-md`
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Post-Program
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(() => {
                const targetPhase = activeAssessmentView.toUpperCase();
                
                // Helper to find a specific test in the history array
                const getTest = (code: string) => {
                  return client?.assessmentHistory?.find(
                    (a) => a.testType.includes(code) && a.phase === targetPhase
                  );
                };

                const pcl5 = getTest('PCL5');
                const ders = getTest('DERS18');
                const pdeq = getTest('PDEQ');
                const aaq = getTest('AAQ');

                // If none of the 4 assessments exist for this phase
                if (!pcl5 && !ders && !pdeq && !aaq) {
                  return (
                    <div className="col-span-2 py-12 text-center bg-white rounded-3xl border border-slate-100 border-dashed">
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                        No {activeAssessmentView} assessment data available
                      </p>
                    </div>
                  );
                }

                // Get scores and cast as any locally to avoid touching types.ts
                const scores = activeAssessmentView === 'pre' ? client?.currentClinicalSnapshot : client?.postClinicalSnapshot;
                // Map the available data to your UI cards, injecting subscales if they exist
                // Map the available data to your UI cards, injecting subscales and onClick handlers
                // Map the available data to your UI cards
                const stats = [
                  { 
                    label: 'PCL-5 (PTSD)', test: pcl5, max: 80, icon: 'fa-chart-simple',
                    onClick: () => openAssessmentModal('PCL-5', pcl5?.testType || 'PCL5', pcl5?.items || []),
                    subscales: (scores as any)?.pcl5Subscales ? [
                      { label: 'Re-experiencing (B)', val: (scores as any).pcl5Subscales.B, max: 20 },
                      { label: 'Avoidance (C)', val: (scores as any).pcl5Subscales.C, max: 8 },
                      { label: 'Cognition/Mood (D)', val: (scores as any).pcl5Subscales.D, max: 28 },
                      { label: 'Hyper-arousal (E)', val: (scores as any).pcl5Subscales.E, max: 24 },
                    ] : null
                  },
                  { 
                    label: 'DERS-18 (Dysreg)', test: ders, max: 90, icon: 'fa-bolt',
                    onClick: () => openAssessmentModal('DERS-18', ders?.testType || 'DERS18', ders?.items || []),
                    subscales: (scores as any)?.dersSubscales ? [
                      { label: 'Awareness', val: (scores as any).dersSubscales.awareness, max: 15 },
                      { label: 'Clarity', val: (scores as any).dersSubscales.clarity, max: 15 },
                      { label: 'Goals', val: (scores as any).dersSubscales.goals, max: 15 },
                      { label: 'Impulse', val: (scores as any).dersSubscales.impulse, max: 15 },
                      { label: 'Non-acceptance', val: (scores as any).dersSubscales.nonAcceptance, max: 15 },
                      { label: 'Strategies', val: (scores as any).dersSubscales.strategies, max: 15 },
                    ] : null
                  },
                  { 
                    label: 'PDEQ (Dissociation)', test: pdeq, max: 40, icon: 'fa-face-frown',
                    onClick: () => openAssessmentModal('PDEQ', pdeq?.testType || 'PDEQ', pdeq?.items || []),
                  },
                  { 
                    label: 'AAQ-II (Inflexibility)', test: aaq, max: 49, icon: 'fa-bridge',
                    onClick: () => openAssessmentModal('AAQ-II', aaq?.testType || 'AAQ', aaq?.items || []),
                  },
                ];

                return stats.map((s) => {
                  if (!s.test) return null; // Hide the card if the client hasn't taken this specific test
                  
                  return (
                    
                    <div key={s.label} onClick={s.onClick} className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col gap-3 shadow-sm transition-all hover:border-slate-200 cursor-pointer hover:shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${themeClasses.secondary} ${themeClasses.text} rounded-xl flex items-center justify-center`}>
                            <i className={`fa-solid ${s.icon}`}></i>
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                        </div>
                        <span className={`text-sm font-black ${themeClasses.text}`}>
                          {s.test.totalScore} / {s.max}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                        <i className="fa-solid fa-circle-info text-slate-400 text-[10px]"></i>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                          {s.test.interpretation || 'Completed'}
                        </span>
                      </div>

                      {/* Subscales Display */}
                      {s.subscales && (
                        <div className="mt-3 space-y-2 pt-3 border-t border-slate-50">
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
                  );
                });
              })()}
            </div>
          </section>
          
          
         {/* Dynamically Fetched Red Flags Section */}
         <section className="bg-rose-50 p-8 rounded-[2.5rem] border border-rose-100">
            <h3 className="text-xs font-black text-rose-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation"></i>
              Safety Red Flags ({activeAssessmentView})
            </h3>
            <div className="space-y-3">
              {(() => {
                if (!redFlagTemplate) {
                  return (
                    <div className="flex items-center gap-3 text-sm text-slate-400 py-4 font-medium">
                      <i className="fa-solid fa-circle-notch fa-spin text-rose-400"></i> Loading Safety Profile...
                    </div>
                  );
                }

                // 1. Target the correct phase and find it in the assessmentHistory array
                const targetPhase = activeAssessmentView.toUpperCase(); // 'PRE' or 'POST'
                const redFlagAssessment = client?.assessmentHistory?.find(
                  (a) => a.testType === 'REDFLAG-V1' && a.phase === targetPhase
                );

                // If no assessment exists in the array for this phase
                if (!redFlagAssessment || !redFlagAssessment.items) {
                  return (
                    <div className="py-8 text-center bg-white rounded-3xl border border-rose-100 border-dashed">
                      <p className="text-rose-400 font-bold text-xs uppercase tracking-widest">
                        No {activeAssessmentView} safety assessment available
                      </p>
                    </div>
                  );
                }

                // 2. Map the template questions to the client's actual answers
                return redFlagTemplate.questions.map((q: any, i: number) => {
                  const clientAnswer = redFlagAssessment.items.find(
                    (item: any) => item.questionId === q.id
                  );

                  let has = false;
                  let tf: string[] = [];

                  // 3. Parse the label string (e.g., "Yes (Right Now, Past 1 Month)")
                  if (clientAnswer && clientAnswer.value === 1) {
                    has = true;
                    // Extract the timeframes between the parentheses
                    const match = clientAnswer.label?.match(/\(([^)]+)\)/);
                    if (match && match[1]) {
                      tf = match[1].split(', ').map((s: string) => s.trim());
                    }
                  }

                  const rf = { text: q.text, has, tf };

                  return (
                    <div
                      key={q.id || i}
                      className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                        rf.has
                          ? 'bg-white border-rose-200 shadow-sm'
                          : 'bg-slate-50 border-slate-100 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                            rf.has ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-400'
                          }`}
                        >
                          <i className={`fa-solid ${rf.has ? 'fa-check' : 'fa-minus'}`}></i>
                        </div>
                        <p
                          className={`text-sm font-bold ${
                            rf.has ? 'text-slate-800' : 'text-slate-400'
                          }`}
                        >
                          {rf.text}
                        </p>
                      </div>
                      {rf.has && rf.tf.length > 0 && (
                        <div className="flex gap-2">
                          {rf.tf.map((t: string) => (
                            <span
                              key={t}
                              className="px-3 py-1 bg-rose-100 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
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
            <button 
  onClick={handleApplyPath}
  disabled={isUpdatingPath}
  className={`w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-colors ${
    isUpdatingPath ? 'opacity-50 cursor-wait' : ''
  }`}
>
  {isUpdatingPath ? (
    <><i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Applying...</>
  ) : (
    "Apply Session Path"
  )}
</button>
          </section>

          {/* Session Progress & Answers */}
<section className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
  <div className="mb-8">
    <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Session Progress & Answers</h3>
    <p className="text-xs text-slate-400 font-medium">Review client's progress and all responses from their 12-session journey</p>
  </div>
  
  <div className="space-y-6">
    {THERAPY_SESSIONS.map(s => {
      const historyRecord = client?.sessionHistory?.find((h: any) => h.sessionNumber === s.number);
      const isCompleted = historyRecord?.status === 'COMPLETED' || historyRecord?.completed === true;
      const isCurrent = (client?.currentSession || 1) === s.number && !isCompleted;

      // Extract all completed answers
      const reflections = historyRecord?.reflections || {};
      const reflectionEntries = Object.entries(reflections).filter(([_, val]) => val !== "" && val !== null);

      // In-progress data fallback
      const activeSessionData = client?.sessionData?.filter(d => d.sessionNumber === s.number) || [];

      return (
        <div key={s.number} className={`p-6 rounded-3xl border-2 transition-all ${isCompleted ? 'bg-emerald-50 border-emerald-100' : isCurrent ? `${themeClasses.secondary} ${themeClasses.border}` : 'bg-slate-50 border-transparent opacity-60'}`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isCompleted ? 'bg-emerald-600 text-white' : isCurrent ? `${themeClasses.primary} text-white` : 'bg-slate-200 text-slate-400'}`}>
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

          {/* Render ALL Completed Answers */}
          {reflectionEntries.length > 0 ? (
            <div className="mt-4 space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Session Reflections:</p>
              {reflectionEntries.map(([key, value], idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <p className={`text-[10px] font-bold ${themeClasses.text} uppercase mb-1`}>
                    {key ? key.replace(/_/g, ' ').replace(/-/g, ' ') : 'Response'}
                  </p>
                  <p className="text-sm text-slate-700 font-medium italic leading-relaxed">
                    "{Array.isArray(value) ? value.join(', ') : (typeof value === 'object' ? JSON.stringify(value) : String(value))}"
                  </p>
                </div>
              ))}
            </div>
          ) : activeSessionData.length > 0 ? (
            /* Render ALL In-Progress Answers */
            <div className="mt-4 space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Current Inputs:</p>
              {activeSessionData.map((data, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <p className={`text-[10px] font-bold ${themeClasses.text} uppercase mb-1`}>
                    {data.stepTitle || data.stepId.replace(/-/g, ' ')}
                  </p>
                  <p className="text-sm text-slate-700 font-medium italic leading-relaxed">
                    "{Array.isArray(data.inputValue) ? data.inputValue.join(', ') : (typeof data.inputValue === 'object' ? JSON.stringify(data.inputValue) : String(data.inputValue))}"
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      );
    })}
  </div>
</section>

          {/* Session Frequency Management */}
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

          {/* Clinical Directives */}
          <section className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-800 mb-6 uppercase text-sm tracking-tight">Clinical Directives</h3>
            <textarea 
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Write a supportive note or clinical feedback for Alex to see in-app..."
              className={`w-full h-40 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-2 outline-none resize-none transition-all text-sm font-medium leading-relaxed ${themeClasses.ring}`}
            />
            <div className="mt-6 flex justify-end">
              <button onClick={async () => { if (clientId) await therapistService.updateClientSettings(clientId, { clinicalDirectives: feedback } as any); }} className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                <i className="fa-solid fa-paper-plane mr-2"></i> Push to Client App
              </button>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          {/* Clinical Exercise Library */}
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
                  <i className={`fa-solid fa-plus ml-auto text-[10px] text-slate-500 transition-colors group-hover:${themeClasses.text}`}></i>
                </button>
              ))}
            </div>
          </section>

          {/* Clinical Timeline */}
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