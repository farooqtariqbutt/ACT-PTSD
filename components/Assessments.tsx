
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { UserRole } from '../types';

import { getPDEQInterpretation, getPCL5Interpretation, getDERSInterpretation, getAAQInterpretation } from '../services/assessmentUtils';

const PDEQ_QUESTIONS = [
  "I “blanked out” or “spaced out” or in some way felt that I was not part of what was going on.",
  "Things seemed to be happening in slow motion (very slowly).",
  "What was happening didn’t seem real, like I was in a dream or watching a movie.",
  "I felt like I was watching what was happening to me, like I was floating above the scene or watching it as an outsider (from the outside looking in).",
  "I felt separate or disconnected from my body or like my body was unusually large or small (not normal size—too large or too small).",
  "Things happened that I didn’t notice, even though I normally would have noticed them.",
  "I felt confused or couldn’t make sense of what was happening.",
  "There were moments when I wasn’t sure about where I was or what time it was."
];

const PCL5_QUESTIONS = [
  { text: "Repeated, disturbing, and unwanted memories of the stressful experience?", cluster: 'B' },
  { text: "Repeated, disturbing dreams of the stressful experience?", cluster: 'B' },
  { text: "Suddenly feeling or acting as if the stressful experience were actually happening again?", cluster: 'B' },
  { text: "Feeling very upset when something reminded you of the stressful experience?", cluster: 'B' },
  { text: "Having strong physical reactions when something reminded you of the stressful experience?", cluster: 'B' },
  { text: "Avoiding memories, thoughts, or feelings related to the stressful experience?", cluster: 'C' },
  { text: "Avoiding external reminders of the stressful experience?", cluster: 'C' },
  { text: "Trouble remembering important parts of the stressful experience?", cluster: 'D' },
  { text: "Having strong negative beliefs about yourself, other people, or the world?", cluster: 'D' },
  { text: "Blaming yourself or someone else for the stressful experience?", cluster: 'D' },
  { text: "Having strong negative feelings such as fear, horror, anger, guilt, or shame?", cluster: 'D' },
  { text: "Loss of interest in activities that you used to enjoy?", cluster: 'D' },
  { text: "Feeling distant or cut off from other people?", cluster: 'D' },
  { text: "Trouble experiencing positive feelings?", cluster: 'D' },
  { text: "Irritable behavior, angry outbursts, or acting aggressively?", cluster: 'E' },
  { text: "Taking too many risks or doing things that could cause you harm?", cluster: 'E' },
  { text: "Being “superalert” or watchful or on guard?", cluster: 'E' },
  { text: "Feeling jumpy or easily startled?", cluster: 'E' },
  { text: "Having difficulty concentrating?", cluster: 'E' },
  { text: "Trouble falling or staying asleep?", cluster: 'E' }
];

const DERS_QUESTIONS = [
  "I pay attention to how I feel",
  "I have no idea how I am feeling",
  "I have difficulty making sense out of my feelings",
  "I care about what I am feeling",
  "I am confused about how I feel",
  "When I’m upset, I acknowledge my emotions",
  "When I’m upset, I become embarrassed for feeling that way",
  "When I’m upset, I have difficulty getting work done",
  "When I’m upset, I become out of control",
  "When I’m upset, I believe that I will end up feeling very depressed",
  "When I’m upset, I have difficulty focusing on other things",
  "When I’m upset, I feel guilty for feeling that way",
  "When I’m upset, I have difficulty concentrating",
  "When I’m upset, I have difficulty controlling my behaviors",
  "When I’m upset, I believe there is nothing I can do to make myself feel better",
  "When I’m upset, I become irritated with myself for feeling that way",
  "When I’m upset, I lose control over my behavior",
  "When I’m upset, it takes me a long time to feel better"
];

const DERS_REVERSE_INDICES = [0, 3, 5]; // 1, 4, 6 in 1-based indexing

const AAQ_QUESTIONS = [
  "My painful experiences and memories make it difficult for me to live a life that I would value.",
  "I’m afraid of my feelings.",
  "I worry about not being able to control my worries and feelings.",
  "My painful memories prevent me from having a fulfilling life.",
  "Emotions cause problems in my life.",
  "It seems like most people are handling their lives better than I am.",
  "Worries get in the way of my success."
];

export const RED_FLAG_QUESTIONS = [
  "Have you had thoughts about hurting yourself?",
  "Have you had thoughts about ending your life?",
  "Have you ever tried to end your life?",
  "Have you had thoughts about hurting someone else?",
  "Have you ever hurt yourself on purpose?"
];

const LIKERT_0_4 = [
  { val: 0, label: 'Not at all' },
  { val: 1, label: 'A little bit' },
  { val: 2, label: 'Moderately' },
  { val: 3, label: 'Quite a bit' },
  { val: 4, label: 'Extremely' }
];

const LIKERT_1_5 = [
  { val: 1, label: 'Almost Never' },
  { val: 2, label: 'Sometimes' },
  { val: 3, label: 'Half the Time' },
  { val: 4, label: 'Most of Time' },
  { val: 5, label: 'Almost Always' }
];

const LIKERT_1_7_AAQ = [
  { val: 1, label: 'Never true' },
  { val: 2, label: 'Very seldom true' },
  { val: 3, label: 'Seldom true' },
  { val: 4, label: 'Sometimes true' },
  { val: 5, label: 'Frequently true' },
  { val: 6, label: 'Almost always true' },
  { val: 7, label: 'Always true' }
];

type AssessmentStep = 
  | 'intro' | 'mood' | 'demographics' | 'traumaHistory' 
  | 'pdeq' | 'pcl5' | 'ders' | 'aaq' | 'redFlags' | 'summary1' | 'summary2' | 'education';

const Assessments: React.FC = () => {
  const { currentUser: user, updateUser, setIsAssessmentInProgress, showAssessmentQuitDialog, setShowAssessmentQuitDialog } = useApp();
  const [step, setStep] = useState<AssessmentStep>('intro');
  const [activeAssessment, setActiveAssessment] = useState<1 | 2>(1);
  const [mood, setMood] = useState<number | null>(null);
  const navigate = useNavigate();
  
  const [demoData, setDemoData] = useState({
    name: user.name || '', age: '', gender: '', maritalStatus: '', education: '', city: '', occupation: '',
    siblings: '', birthOrder: '', familySystem: 'Nuclear', medicalDiseases: '', psychIllness: '',
    medication: '', incomeRange: '', earningMembers: '', familyMedical: '', familyPsych: '',
    parentsRelation: 'Living Together'
  });

  const [traumaData, setTraumaData] = useState({
    deathOfLovedOne: { experienced: false, age: '' },
    nearDeath: { experienced: false, age: '' },
    seriousInjury: { experienced: false, age: '' },
    witnessedTrauma: { experienced: false, age: '' },
    abuseEmotional: { experienced: false, age: '' },
    abusePhysical: { experienced: false, age: '' },
    abuseSexual: { experienced: false, age: '' },
    naturalDisaster: { experienced: false, age: '' },
    warPoliticalViolence: { experienced: false, age: '' },
    domesticViolence: { experienced: false, age: '' },
    witnessedViolence: { experienced: false, age: '' },
    separationDivorce: { experienced: false, age: '' },
  });

  const [pdeqScores, setPdeqScores] = useState<number[]>(new Array(PDEQ_QUESTIONS.length).fill(-1));
  const [pcl5Scores, setPcl5Scores] = useState<number[]>(new Array(PCL5_QUESTIONS.length).fill(-1));
  const [dersScores, setDersScores] = useState<number[]>(new Array(DERS_QUESTIONS.length).fill(-1));
  const [aaqScores, setAaqScores] = useState<number[]>(new Array(AAQ_QUESTIONS.length).fill(-1));
  const [redFlagData, setRedFlagData] = useState<Record<number, { hasFlag: boolean | null, rightNow: boolean, pastMonth: boolean, ever: boolean }>>(
    RED_FLAG_QUESTIONS.reduce((acc, _, idx) => ({ ...acc, [idx]: { hasFlag: null, rightNow: false, pastMonth: false, ever: false } }), {})
  );
  const [isAssigning, setIsAssigning] = useState(false);

  const handleFinalizeIntake = () => {
    setIsAssigning(true);
    
    // Prepare assessment scores object
    const scores = {
      pdeq: calculateTotal(pdeqScores),
      pcl5: calculateTotal(pcl5Scores),
      ders: getDERSGrandTotal(),
      aaq: calculateTotal(aaqScores),
      redFlags: redFlagData,
      timestamp: new Date().toISOString()
    };

    // Update user with new data
    updateUser({
      ...user,
      name: demoData.name || user.name,
      assessmentScores: scores,
      traumaHistory: {
        abuseEmotional: traumaData.abuseEmotional.experienced,
        abusePhysical: traumaData.abusePhysical.experienced,
        abuseSexual: traumaData.abuseSexual.experienced,
        naturalDisaster: traumaData.naturalDisaster.experienced,
        warPoliticalViolence: traumaData.warPoliticalViolence.experienced,
        domesticViolence: traumaData.domesticViolence.experienced,
        witnessedViolence: traumaData.witnessedViolence.experienced,
        separationDivorce: traumaData.separationDivorce.experienced,
      },
      currentSession: 1 // Unlock first session
    });

    setTimeout(() => {
      setIsAssigning(false);
      if (calculateTotal(pcl5Scores) < 33) {
        navigate('/');
      } else {
        setStep('education');
      }
    }, 2000);
  };

  // Effect to scroll the main container to the top when the step changes
  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

  const handleScore = (setter: React.Dispatch<React.SetStateAction<number[]>>, scores: number[], idx: number, val: number) => {
    const next = [...scores];
    next[idx] = val;
    setter(next);
  };

  const calculateTotal = (scores: number[]) => scores.reduce((a, b) => a + (b === -1 ? 0 : b), 0);

  const calculatePCL5Cluster = (cluster: 'B' | 'C' | 'D' | 'E') => {
    return PCL5_QUESTIONS.reduce((total, q, idx) => {
      if (q.cluster === cluster) return total + (pcl5Scores[idx] === -1 ? 0 : pcl5Scores[idx]);
      return total;
    }, 0);
  };

  const calculateDERSSubscale = (indices: number[]) => {
    return indices.reduce((total, i) => {
      const score = dersScores[i - 1]; 
      if (score === -1) return total;
      const effectiveScore = DERS_REVERSE_INDICES.includes(i - 1) ? (6 - score) : score;
      return total + effectiveScore;
    }, 0);
  };

  const getDERSGrandTotal = () => {
    return dersScores.reduce((total, score, idx) => {
      if (score === -1) return total;
      const effectiveScore = DERS_REVERSE_INDICES.includes(idx) ? (6 - score) : score;
      return total + effectiveScore;
    }, 0);
  };

  const renderLikert = (questions: any[], currentScores: number[], setter: any, options: any[], phaseLabel: string, instructions?: string) => (
    <div className="space-y-12">
      <div className="text-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{phaseLabel.split(' - ').slice(0, 2).join(' - ')}</span>
        {instructions && (
          <p className="text-slate-600 mt-6 font-medium max-w-2xl mx-auto leading-relaxed text-lg">
            {instructions.split('*').map((part, i) => i % 2 === 1 ? <em key={i} className="font-bold text-indigo-900 not-italic">{part}</em> : part)}
          </p>
        )}
      </div>
      <div className="space-y-10">
        {questions.map((q, qIdx) => (
          <div key={qIdx} className="space-y-4">
            <p className="text-slate-800 font-bold text-lg leading-snug">
              {qIdx + 1}. {typeof q === 'string' ? q : q.text}
            </p>
            <div className="flex flex-wrap md:flex-nowrap justify-between gap-2">
              {options.map(opt => (
                <button
                  key={opt.val}
                  onClick={() => handleScore(setter, currentScores, qIdx, opt.val)}
                  className={`flex-1 py-4 px-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                    currentScores[qIdx] === opt.val 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' 
                    : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-xl mb-1">{opt.val}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const nextStep = () => {
    if (activeAssessment === 1) {
      const order: AssessmentStep[] = ['intro', 'mood', 'demographics', 'traumaHistory', 'pcl5', 'summary1'];
      const currentIdx = order.indexOf(step);
      if (currentIdx < order.length - 1) setStep(order[currentIdx + 1]);
    } else {
      const order: AssessmentStep[] = ['mood', 'traumaHistory', 'pdeq', 'ders', 'aaq', 'redFlags', 'summary2'];
      const currentIdx = order.indexOf(step);
      if (currentIdx < order.length - 1) setStep(order[currentIdx + 1]);
    }
  };

  const startAssessment2 = () => {
    setActiveAssessment(2);
    setMood(null); // Reset mood for assessment 2
    setStep('mood');
  };

  const getDynamicButtonLabel = () => {
    switch (step) {
      case 'pdeq': return "Continue to Next Section";
      case 'pcl5': return "Next: Assessment 1 Summary";
      case 'ders': return "Continue to Next Section";
      case 'aaq': return "Continue to Next Section";
      case 'redFlags': return "Next: Final Clinical Summary";
      default: return "Continue to Next Section";
    }
  };

  const stepOrder1: AssessmentStep[] = ['intro', 'mood', 'demographics', 'traumaHistory', 'pcl5', 'summary1'];
  const stepOrder2: AssessmentStep[] = ['mood', 'traumaHistory', 'pdeq', 'ders', 'aaq', 'redFlags', 'summary2'];
  const currentStepOrder = activeAssessment === 1 ? stepOrder1 : stepOrder2;

  const pcl5Score = calculateTotal(pcl5Scores);
  const isPcl5High = pcl5Score > 32;

  // Sync assessment progress state
  useEffect(() => {
    if (isPcl5High && activeAssessment === 1 && step === 'summary1') {
      setIsAssessmentInProgress(true);
    } else {
      setIsAssessmentInProgress(false);
    }
    
    // Cleanup on unmount
    return () => setIsAssessmentInProgress(false);
  }, [isPcl5High, activeAssessment, step, setIsAssessmentInProgress]);

  // Handle navigation attempt
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isPcl5High && activeAssessment === 1 && step === 'summary1') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isPcl5High, activeAssessment, step]);

  const handleQuit = () => {
    setShowAssessmentQuitDialog(false);
    setIsAssessmentInProgress(false);
    navigate('/');
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 animate-in fade-in duration-500">
      {showAssessmentQuitDialog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center text-2xl mb-6">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-4">Wait! Don't leave yet.</h3>
            <p className="text-slate-500 font-medium leading-relaxed mb-8">
              Are you sure you want to quit the Assessments this time? You cannot start your Recovery Path before completing your Assessment 2.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setShowAssessmentQuitDialog(false)}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all"
              >
                Continue Assessment
              </button>
              <button 
                onClick={handleQuit}
                className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all"
              >
                Quit Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-slate-200 shadow-2xl relative overflow-hidden">
        {step !== 'education' && (
          <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
            <div 
              className="h-full bg-indigo-600 transition-all duration-700"
              style={{ width: `${(currentStepOrder.indexOf(step) / (currentStepOrder.length - 1)) * 100}%` }}
            ></div>
          </div>
        )}

        {step === 'intro' && (
          <div className="text-center space-y-8 py-10">
            <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center text-4xl mx-auto shadow-inner">
              <i className="fa-solid fa-file-medical"></i>
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-slate-800 tracking-tight">Clinical Intake</h2>
              <p className="text-slate-500 max-w-lg mx-auto leading-relaxed">
                Complete the two-part assessment process to receive a clinical evaluation and matching with a specialized therapist.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
              {[
                { label: 'Assessment 1', desc: 'Demographics, Trauma History & PCL-5.' },
                { label: 'Assessment 2', desc: 'Dissociation, Emotion Regulation & Safety.' },
                { label: 'Clinical Profile', desc: 'Detailed diagnostic mapping.' },
                { label: 'Therapist Match', desc: 'Specialized clinical pairing.' },
              ].map(item => (
                <div key={item.label} className="p-4 bg-slate-50 rounded-2xl flex items-start gap-3">
                  <i className="fa-solid fa-check-double text-indigo-500 mt-1"></i>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.label}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={nextStep} className="w-full max-w-sm py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 transition-all">
              Begin Assessment 1
            </button>
          </div>
        )}

        {step === 'mood' && (
          <div className="space-y-12">
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Assessment {activeAssessment} - Phase 1 of {currentStepOrder.length - 1}</span>
              <h3 className="text-3xl font-black text-slate-800 mt-4">Current Mood</h3>
            </div>
            <div className="grid grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map(v => (
                <button
                  key={v}
                  onClick={() => setMood(v)}
                  className={`p-8 rounded-3xl border-2 transition-all text-4xl flex flex-col items-center gap-4 ${
                    mood === v ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-slate-50 border-transparent hover:border-indigo-200 shadow-sm'
                  }`}
                >
                  {v === 1 ? '😞' : v === 2 ? '😕' : v === 3 ? '😐' : v === 4 ? '🙂' : '✨'}
                  <span className="text-[10px] font-black uppercase opacity-60">Level {v}</span>
                </button>
              ))}
            </div>
            <button disabled={mood === null} onClick={nextStep} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl disabled:opacity-50 transition-all">
              {activeAssessment === 1 ? "Next: Section 1 : Demographic Sheet" : "Next: Section 2 : Trauma History"}
            </button>
          </div>
        )}

        {step === 'demographics' && (
          <div className="space-y-10">
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Assessment 1 - Phase 2 of 5</span>
              <h3 className="text-3xl font-black text-slate-800 mt-4">Section 1: Demographic Sheet</h3>
              <p className="text-slate-500 mt-2 font-medium">Personal Profile & Family Structure</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'Name', key: 'name', type: 'text' },
                { label: 'Age', key: 'age', type: 'number' },
                { label: 'Gender', key: 'gender', type: 'text' },
                { label: 'Marital Status', key: 'maritalStatus', type: 'text' },
                { label: 'Education', key: 'education', type: 'text' },
                { label: 'City', key: 'city', type: 'text' },
                { label: 'Occupation', key: 'occupation', type: 'text' },
                { label: 'No of Siblings', key: 'siblings', type: 'number' },
                { label: 'Birth Order', key: 'birthOrder', type: 'text' },
                { label: 'Monthly Income Range', key: 'incomeRange', type: 'text' },
                { label: 'Earning Members', key: 'earningMembers', type: 'text' },
              ].map(field => (
                <div key={field.key} className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                  <input 
                    type={field.type} 
                    value={(demoData as any)[field.key]}
                    onChange={(e) => setDemoData({ ...demoData, [field.key]: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              ))}

              <div className="md:col-span-2 space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Family System</label>
                <div className="flex gap-4">
                  {['Nuclear', 'Joint Family'].map(sys => (
                    <button
                      key={sys}
                      onClick={() => setDemoData({ ...demoData, familySystem: sys })}
                      className={`flex-1 py-4 px-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                        demoData.familySystem === sys ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'
                      }`}
                    >
                      {sys}
                    </button>
                  ))}
                </div>
              </div>

              {[
                { label: 'Medical Diseases', key: 'medicalDiseases' },
                { label: 'Psychological Illness', key: 'psychIllness' },
                { label: 'Medication in use', key: 'medication' },
              ].map(field => (
                <div key={field.key} className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                  <input 
                    type="text" 
                    value={(demoData as any)[field.key]}
                    onChange={(e) => setDemoData({ ...demoData, [field.key]: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              ))}
            </div>

            <div className="pt-10 border-t border-slate-100 space-y-8">
              <h4 className="text-xl font-black text-slate-800">Family Medical and Psychological History</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Medical Diseases (Family)</label>
                  <input type="text" value={demoData.familyMedical} onChange={(e) => setDemoData({...demoData, familyMedical: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Psychological Illness (Family)</label>
                  <input type="text" value={demoData.familyPsych} onChange={(e) => setDemoData({...demoData, familyPsych: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Parent's Relation Status</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['Living Together', 'Separated', 'Divorced', 'Died'].map(status => (
                      <button
                        key={status}
                        onClick={() => setDemoData({ ...demoData, parentsRelation: status })}
                        className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                          demoData.parentsRelation === status ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button onClick={nextStep} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl transition-all">
              Next: Section 2 : Trauma History
            </button>
          </div>
        )}

        {step === 'traumaHistory' && (
          <div className="space-y-10">
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Assessment {activeAssessment} - Phase {activeAssessment === 1 ? '3 of 5' : '2 of 6'}</span>
              <h3 className="text-3xl font-black text-slate-800 mt-4 leading-tight">Section 2: Trauma History</h3>
              <p className="text-slate-500 mt-2 font-medium">
                {activeAssessment === 2 ? "Review your reported traumatic events." : "Please mark traumatic events you have personally experienced."}
              </p>
            </div>

            <div className="space-y-6">
              {[
                { label: 'Threatening Death of Loved One', key: 'deathOfLovedOne' },
                { label: 'Near Death Experience', key: 'nearDeath' },
                { label: 'Serious Injury', key: 'seriousInjury' },
                { label: 'Witness of the Traumatic Incident Occurred to others', key: 'witnessedTrauma' },
                { label: 'Abuse (Emotional)', key: 'abuseEmotional' },
                { label: 'Abuse (Physical)', key: 'abusePhysical' },
                { label: 'Abuse (Sexual)', key: 'abuseSexual' },
                { label: 'Natural Disaster (Flood / Earthquake)', key: 'naturalDisaster' },
                { label: 'War / Political Violence', key: 'warPoliticalViolence' },
                { label: 'Domestic / Intimate Partner Violence', key: 'domesticViolence' },
                { label: 'Witnessing Violence at home / in the community', key: 'witnessedViolence' },
                { label: 'Separation / Divorce', key: 'separationDivorce' },
              ].map(item => (
                <div key={item.key} className={`p-6 rounded-3xl border-2 transition-all ${
                  (traumaData as any)[item.key].experienced ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100'
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <button 
                        disabled={activeAssessment === 2}
                        onClick={() => setTraumaData({
                          ...traumaData,
                          [item.key]: { ...(traumaData as any)[item.key], experienced: !(traumaData as any)[item.key].experienced }
                        })}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                          (traumaData as any)[item.key].experienced ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        <i className={`fa-solid ${(traumaData as any)[item.key].experienced ? 'fa-check' : 'fa-plus'}`}></i>
                      </button>
                      <span className={`font-bold text-sm ${ (traumaData as any)[item.key].experienced ? 'text-indigo-900' : 'text-slate-600'}`}>
                        {item.label}
                      </span>
                    </div>
                    
                    {(traumaData as any)[item.key].experienced && (
                      <div className="w-full md:w-64 animate-in zoom-in-95">
                        <label className="text-[8px] font-black text-indigo-400 uppercase tracking-widest ml-1">Age at time of experience</label>
                        <input 
                          type="text" 
                          placeholder="Age..."
                          disabled={activeAssessment === 2}
                          value={(traumaData as any)[item.key].age}
                          onChange={(e) => setTraumaData({
                            ...traumaData,
                            [item.key]: { ...(traumaData as any)[item.key], age: e.target.value }
                          })}
                          className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={nextStep} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl">
              {activeAssessment === 2 ? "Confirm & Continue" : "Continue to Next Section"}
            </button>
          </div>
        )}

        {step === 'pdeq' && renderLikert(PDEQ_QUESTIONS, pdeqScores, setPdeqScores, [
          { val: 1, label: 'Not at all true' },
          { val: 2, label: 'Slightly true' },
          { val: 3, label: 'Somewhat true' },
          { val: 4, label: 'Very true' },
          { val: 5, label: 'Extremely true' }
        ], "Assessment 2 - Phase 3 of 6 - Peritraumatic Dissociation (PDEQ)", "Some statements may describe how you felt *during the traumatic event* you just mentioned in the last Phase. And I’d like you to tell me how true each statement was for you.")}

        {step === 'pcl5' && renderLikert(PCL5_QUESTIONS, pcl5Scores, setPcl5Scores, LIKERT_0_4, "Assessment 1 - Phase 4 of 5 - PTSD Symptoms (PCL-5)", "Below is a list of problems that people sometimes have in response to a very stressful experience. Keeping your worst event in mind, please read each problem carefully and then select one of the numbers to the right to indicate how much you have been bothered by that problem in the past month.")}

        {step === 'ders' && renderLikert(DERS_QUESTIONS, dersScores, setDersScores, LIKERT_1_5, "Assessment 2 - Phase 4 of 6 - Emotion Regulation (DERS-18)", "Please indicate how often the following apply to you.")}

        {step === 'aaq' && renderLikert(AAQ_QUESTIONS, aaqScores, setAaqScores, LIKERT_1_7_AAQ, "Assessment 2 - Phase 5 of 6 - Psychological Inflexibility (AAQ-II)", "Below you will find a list of statements. Please rate how true each statement is for you by circling a number next to it. Use the scale below to make your choice. 1 = Never True - to - 7 = Always True.")}

        {step === 'redFlags' && (
          <div className="space-y-10">
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Assessment 2 - Phase 6 of 6</span>
              <h3 className="text-3xl font-black text-slate-800 mt-4 leading-tight">Safety Assessment</h3>
              <p className="text-slate-500 mt-4 font-medium max-w-2xl mx-auto leading-relaxed">
                Please read each question carefully. You may select more than one option for each question. Choose all options that apply to you.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-6 pr-4 text-xs font-black text-slate-400 uppercase tracking-widest">Question</th>
                    <th className="py-6 px-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Yes</th>
                    <th className="py-6 px-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">No</th>
                    <th className="py-6 px-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Right Now</th>
                    <th className="py-6 px-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Past 1 Month</th>
                    <th className="py-6 pl-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Ever in Your Life</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {RED_FLAG_QUESTIONS.map((q, qIdx) => (
                    <tr key={qIdx} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-6 pr-4">
                        <p className="text-sm font-bold text-slate-800 leading-snug">{qIdx + 1}. {q}</p>
                      </td>
                      <td className="py-6 px-2 text-center">
                        <button 
                          onClick={() => setRedFlagData(prev => ({
                            ...prev,
                            [qIdx]: { ...prev[qIdx], hasFlag: true }
                          }))}
                          className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center mx-auto ${
                            redFlagData[qIdx].hasFlag === true ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-200 text-transparent hover:border-rose-300'
                          }`}
                        >
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </button>
                      </td>
                      <td className="py-6 px-2 text-center">
                        <button 
                          onClick={() => setRedFlagData(prev => ({
                            ...prev,
                            [qIdx]: { ...prev[qIdx], hasFlag: false, rightNow: false, pastMonth: false, ever: false }
                          }))}
                          className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center mx-auto ${
                            redFlagData[qIdx].hasFlag === false ? 'bg-slate-400 border-slate-400 text-white' : 'bg-white border-slate-200 text-transparent hover:border-slate-300'
                          }`}
                        >
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </button>
                      </td>
                      <td className="py-6 px-2 text-center">
                        <button 
                          disabled={redFlagData[qIdx].hasFlag !== true}
                          onClick={() => setRedFlagData(prev => ({
                            ...prev,
                            [qIdx]: { ...prev[qIdx], rightNow: !prev[qIdx].rightNow }
                          }))}
                          className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center mx-auto disabled:opacity-20 ${
                            redFlagData[qIdx].rightNow ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-white border-slate-200 text-transparent hover:border-rose-300'
                          }`}
                        >
                          <i className="fa-solid fa-check text-xs"></i>
                        </button>
                      </td>
                      <td className="py-6 px-2 text-center">
                        <button 
                          disabled={redFlagData[qIdx].hasFlag !== true}
                          onClick={() => setRedFlagData(prev => ({
                            ...prev,
                            [qIdx]: { ...prev[qIdx], pastMonth: !prev[qIdx].pastMonth }
                          }))}
                          className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center mx-auto disabled:opacity-20 ${
                            redFlagData[qIdx].pastMonth ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-white border-slate-200 text-transparent hover:border-rose-300'
                          }`}
                        >
                          <i className="fa-solid fa-check text-xs"></i>
                        </button>
                      </td>
                      <td className="py-6 pl-2 text-center">
                        <button 
                          disabled={redFlagData[qIdx].hasFlag !== true}
                          onClick={() => setRedFlagData(prev => ({
                            ...prev,
                            [qIdx]: { ...prev[qIdx], ever: !prev[qIdx].ever }
                          }))}
                          className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center mx-auto disabled:opacity-20 ${
                            redFlagData[qIdx].ever ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-white border-slate-200 text-transparent hover:border-rose-300'
                          }`}
                        >
                          <i className="fa-solid fa-check text-xs"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100 flex gap-4 items-start">
              <i className="fa-solid fa-circle-info text-rose-500 mt-1"></i>
              <p className="text-xs text-rose-700 font-medium leading-relaxed">
                Your safety is our priority. If you select any of these flags, your clinician will be notified immediately for a follow-up discussion.
              </p>
            </div>
          </div>
        )}

        {['pdeq', 'pcl5', 'ders', 'aaq', 'redFlags'].includes(step) ? (
           <button 
             disabled={
               (step === 'pdeq' && pdeqScores.includes(-1)) ||
               (step === 'pcl5' && pcl5Scores.includes(-1)) ||
               (step === 'ders' && dersScores.includes(-1)) ||
               (step === 'aaq' && aaqScores.includes(-1)) ||
               (step === 'redFlags' && Object.values(redFlagData).some((d: any) => d.hasFlag === null))
             }
             onClick={nextStep} 
             className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl disabled:opacity-50 mt-10 transition-all"
           >
             {getDynamicButtonLabel()}
           </button>
        ) : null}

        {step === 'summary1' && (
          <div className="text-center space-y-10 py-10">
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-slate-800 tracking-tight">Assessment 1 Complete</h2>
              <p className="text-slate-500">Initial evaluation for {demoData.name || 'Alex'}.</p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 shadow-sm text-left">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex justify-between items-center">
                  <span>PCL-5 (PTSD Severity)</span>
                  {user.role !== UserRole.CLIENT && (
                    <span className="text-indigo-600 font-black">{pcl5Score} / 80</span>
                  )}
                </h4>
                
                <div className="mb-8">
                  <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl border-2 font-black text-sm uppercase tracking-widest ${getPCL5Interpretation(pcl5Score).bg} ${getPCL5Interpretation(pcl5Score).color} ${getPCL5Interpretation(pcl5Score).border}`}>
                    <i className="fa-solid fa-circle-info"></i>
                    {getPCL5Interpretation(pcl5Score).text}
                  </div>
                </div>

                {pcl5Score < 33 ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl">
                      <p className="text-emerald-800 font-medium leading-relaxed">
                        Thank you for completing Assessment 1! Based on your responses, your results are in a normal, healthy range. To continue taking great care of your mental well-being, we recommend:
                      </p>
                      <ul className="mt-4 space-y-3 text-emerald-700 font-bold">
                        <li className="flex items-center gap-3"><span>💤</span> Prioritising proper sleep</li>
                        <li className="flex items-center gap-3"><span>🚶‍♂️</span> Going for morning walks</li>
                        <li className="flex items-center gap-3"><span>😮‍💨</span> Practising deep breathing when you feel tense</li>
                      </ul>
                    </div>
                    <button onClick={handleFinalizeIntake} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl">
                      {isAssigning ? <><img src="https://i.ibb.co/FkV0M73k/brain.png" alt="loading" className="w-5 h-5 brain-loading-img" /> Saving Results...</> : "Return to Dashboard"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <p className="text-slate-600 font-medium leading-relaxed">
                      Your score indicates symptoms in the {pcl5Score > 51 ? 'Severe' : 'Mild'} range. To provide you with the best specialized care and match you with the right therapist, please complete Assessment 2.
                    </p>
                    <button onClick={startAssessment2} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3">
                      Begin Assessment 2 <i className="fa-solid fa-arrow-right"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'summary2' && (
          <div className="text-center space-y-10 py-10">
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-slate-800 tracking-tight">Clinical Profile Generated</h2>
              <p className="text-slate-500">Full Evaluation for {demoData.name || 'Alex'}.</p>
            </div>
            
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
          <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex justify-between items-center">
              <span>PCL-5 (PTSD Severity)</span>
              {user.role !== UserRole.CLIENT && (
                <span className="text-indigo-600 font-black">{pcl5Score} / 80</span>
              )}
            </h4>
            
            <div className="mb-8">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-black text-xs uppercase tracking-widest ${getPCL5Interpretation(pcl5Score).bg} ${getPCL5Interpretation(pcl5Score).color} ${getPCL5Interpretation(pcl5Score).border}`}>
                <i className="fa-solid fa-circle-info"></i>
                {getPCL5Interpretation(pcl5Score).text}
              </div>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Re-experiencing (B)', val: calculatePCL5Cluster('B'), max: 20 },
                { label: 'Avoidance (C)', val: calculatePCL5Cluster('C'), max: 8 },
                { label: 'Cognition/Mood (D)', val: calculatePCL5Cluster('D'), max: 28 },
                { label: 'Hyper-arousal (E)', val: calculatePCL5Cluster('E'), max: 24 },
              ].map(c => (
                <div key={c.label} className="space-y-1">
                  <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                    <span>{c.label}</span>
                    {user.role !== UserRole.CLIENT && <span>{c.val} / {c.max}</span>}
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500" style={{ width: `${(c.val / c.max) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex justify-between items-center">
              <span>DERS-18 (Emotion Profile)</span>
              {user.role !== UserRole.CLIENT && (
                <span className="text-indigo-600 font-black">{getDERSGrandTotal()} / 90</span>
              )}
            </h4>

            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-emerald-100 bg-emerald-50 text-emerald-600 font-black text-xs uppercase tracking-widest">
                <i className="fa-solid fa-circle-info"></i>
                {getDERSInterpretation(getDERSGrandTotal())}
              </div>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Awareness', val: calculateDERSSubscale([1, 4, 6]), max: 15 },
                { label: 'Clarity', val: calculateDERSSubscale([2, 3, 5]), max: 15 },
                { label: 'Strategies', val: calculateDERSSubscale([10, 11, 17]), max: 15 },
              ].map(c => (
                <div key={c.label} className="space-y-1">
                  <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                    <span>{c.label}</span>
                    {user.role !== UserRole.CLIENT && <span>{c.val} / {c.max}</span>}
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${(c.val / c.max) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 bg-purple-50 rounded-[2.5rem] border border-purple-100 col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
             <div>
                <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-4">Dissociation Index (PDEQ)</h4>
                <div className="flex flex-col gap-2">
                   {user.role !== UserRole.CLIENT && (
                     <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-purple-700">{(calculateTotal(pdeqScores) / pdeqScores.length).toFixed(2)}</span>
                        <span className="text-[9px] text-purple-400 font-bold uppercase tracking-widest">Mean Item Score</span>
                     </div>
                   )}
                   <p className="text-sm font-black text-purple-700 uppercase tracking-tight">
                     {getPDEQInterpretation(calculateTotal(pdeqScores))}
                   </p>
                </div>
             </div>
             
             <div>
                <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-4">Psychological Inflexibility (AAQ-II)</h4>
                <div className="flex flex-col gap-2">
                   {user.role !== UserRole.CLIENT && (
                     <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-sky-700">{calculateTotal(aaqScores)}</span>
                        <span className="text-[9px] text-sky-400 font-bold uppercase tracking-widest">Total Score</span>
                     </div>
                   )}
                   <p className="text-sm font-black text-sky-700 uppercase tracking-tight">
                     {getAAQInterpretation(calculateTotal(aaqScores))}
                   </p>
                </div>
             </div>
          </div>
        </div>

        {/* Red Flags Summary */}
        <div className="max-w-4xl mx-auto mt-8 bg-rose-50 rounded-[2.5rem] p-8 border border-rose-100 text-left">
          <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation"></i>
            Safety Assessment (Red Flags)
          </h4>
          <div className="space-y-4">
            {RED_FLAG_QUESTIONS.map((q, idx) => {
              const data = redFlagData[idx];
              if (data.hasFlag !== true) return null;
              
              const timeframes = [
                data.rightNow && 'Right Now',
                data.pastMonth && 'Past 1 Month',
                data.ever && 'Ever'
              ].filter(Boolean);

              // Interpretation logic
              let severity = { label: 'Mild', color: 'text-emerald-600 bg-emerald-100' };
              if (data.rightNow) {
                severity = { label: 'Severe', color: 'text-rose-600 bg-rose-100' };
              } else if (data.pastMonth) {
                severity = { label: 'Moderate', color: 'text-amber-600 bg-amber-100' };
              }

              return (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-rose-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">{q}</p>
                    <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${severity.color}`}>
                      {severity.label} Red Flag
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {timeframes.map(tf => (
                      <span key={tf as string} className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        {tf}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            {Object.values(redFlagData).every((d: any) => d.hasFlag !== true) && (
              <p className="text-sm font-medium text-slate-500 italic">No safety red flags reported.</p>
            )}
          </div>
        </div>

        <div className="max-w-xl mx-auto p-8 bg-indigo-600 rounded-[2.5rem] text-white text-left shadow-xl shadow-indigo-100">
              <h4 className="font-bold text-xl mb-2">Specialist Specialist Match Found</h4>
              <p className="text-sm text-indigo-100 leading-relaxed">
                Based on your {calculateTotal(aaqScores) >= 25 ? 'High Inflexibility' : 'Profile'}, we have matched you with **Dr. Sarah Smith**, a trauma-informed ACT specialist focused on values-based recovery.
              </p>
            </div>

            <button 
              onClick={handleFinalizeIntake}
              className="w-full max-w-sm py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
            >
              {isAssigning ? <><img src="https://i.ibb.co/FkV0M73k/brain.png" alt="loading" className="w-5 h-5 brain-loading-img" /> Finalizing Clinical Link...</> : <>Connect with Dr. Sarah Smith</>}
            </button>
          </div>
        )}

        {step === 'education' && (
          <div className="space-y-12 animate-in slide-in-from-bottom-8">
            <div className="bg-slate-900 rounded-[2.5rem] p-12 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <i className="fa-solid fa-graduation-cap text-[10rem]"></i>
              </div>
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">🤝</div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">Practice Link Established</h3>
                    <p className="text-indigo-300 font-medium">Your clinician has reviewed your diagnostic data.</p>
                  </div>
                </div>
                <div className="p-6 bg-white/10 rounded-3xl border border-white/10 backdrop-blur-md">
                   <p className="text-sm italic leading-relaxed">
                     "Hello {demoData.name.split(' ')[0] || 'Alex'}. I've received your data. Based on your profile, we are starting the specialized 12-session ACT program. We'll meet twice per week."
                   </p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Your Therapy Path</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button onClick={() => navigate('/session')} className="p-8 bg-indigo-600 text-white border-none rounded-[2.5rem] hover:bg-indigo-700 hover:shadow-2xl transition-all group text-left">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-xl mb-6 group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-play"></i>
                  </div>
                  <h4 className="font-black text-xl mb-2 uppercase tracking-tight">Start Session 1</h4>
                  <p className="text-xs text-indigo-100 leading-relaxed font-medium uppercase tracking-widest">Creative Hopelessness</p>
                </button>
                <button onClick={() => navigate('/')} className="p-8 bg-white border border-slate-200 rounded-[2.5rem] hover:border-indigo-500 hover:shadow-xl transition-all group text-left">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl mb-6 text-emerald-500 group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-chart-line"></i>
                  </div>
                  <h4 className="font-bold text-slate-800 mb-2">View My Dashboard</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">Track your progress and assignments.</p>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Assessments;
