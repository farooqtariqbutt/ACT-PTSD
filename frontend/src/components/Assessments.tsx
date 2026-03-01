import React, { useState, useEffect } from "react";
import {  useNavigate } from "react-router-dom";
import { saveAssessment } from "../services/assessmentService";
import { userService } from "../services/userService";



const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/assessments`;

type AssessmentStep =
  | "intro"
  | "mood"
  | "demographics"
  | "traumaHistory"
  | "pdeq"
  | "pcl5"
  | "ders"
  | "aaq"
  | "summary"
  | "education";

interface Option {
  label: string;
  value: number;
}

interface Question {
  id: string; // From your seed map
  text: string;
  type: string;
  options: Option[]; // This is the key change
  cluster?: string;
}

interface AssessmentTemplate {
  code: string;
  title: string;
  description: string;
  questions: Question[];
  reverseScoreIndices?: number[];
}

const Assessments: React.FC = () => {
  const [step, setStep] = useState<AssessmentStep>("intro");
  const [mood, setMood] = useState<number | null>(null);
  // Near your other useState hooks
  const [userProfile, setUserProfile] = useState<{ name: string } | null>(null);
  const navigate = useNavigate();

  const [nextSessionTemplate, setNextSessionTemplate] = useState<{
    sessionNumber: number;
    title: string;
  } | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetched assessment templates
  const [pdeqTemplate, setPdeqTemplate] = useState<AssessmentTemplate | null>(
    null
  );
  const [pcl5Template, setPcl5Template] = useState<AssessmentTemplate | null>(
    null
  );
  const [dersTemplate, setDersTemplate] = useState<AssessmentTemplate | null>(
    null
  );
  const [aaqTemplate, setAaqTemplate] = useState<AssessmentTemplate | null>(
    null
  );

  const [demoData, setDemoData] = useState({
    name: "",
    age: "",
    gender: "",
    maritalStatus: "",
    education: "",
    city: "",
    occupation: "",
    siblings: "",
    birthOrder: "",
    familySystem: "Nuclear",
    medicalDiseases: "",
    psychIllness: "",
    medication: "",
    incomeRange: "",
    earningMembers: "",
    familyMedical: "",
    familyPsych: "",
    parentsRelation: "Living Together",
  });

  const [traumaData, setTraumaData] = useState({
    deathOfLovedOne: { experienced: false, age: "" },
    nearDeath: { experienced: false, age: "" },
    seriousInjury: { experienced: false, age: "" },
    witnessedTrauma: { experienced: false, age: "" },
    abuseEmotional: { experienced: false, age: "" },
    abusePhysical: { experienced: false, age: "" },
    abuseSexual: { experienced: false, age: "" },
  });

  const [pdeqScores, setPdeqScores] = useState<number[]>([]);
  const [pcl5Scores, setPcl5Scores] = useState<number[]>([]);
  const [dersScores, setDersScores] = useState<number[]>([]);
  const [aaqScores, setAaqScores] = useState<number[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // Fetch assessment templates on mount
  useEffect(() => {
    const checkStatusAndFetchTemplates = async () => {
      setLoading(true);
      setError(null);

      try {
        const profile = await userService.getProfile();
        setUserProfile(profile);

        // 2. Weekly Logic: Check if user already did 2 sessions this week
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);

        const completedThisWeek = (profile.sessionHistory || []).filter(
          (s: any) => {
            const completionDate = new Date(s.timestamp);
            return s.status === "COMPLETED" && completionDate >= startOfWeek;
          }
        ).length;

        if (completedThisWeek >= 2) {
          setIsLocked(true);
        }

        const currentNum = profile.currentSession || 1;

        try {
          const sessionData = await userService.getSessionTemplate(currentNum);
          setNextSessionTemplate(sessionData);
        } catch (err) {
          console.error("Could not fetch session details:", err);
          // Fallback title if API fails
          setNextSessionTemplate({
            sessionNumber: currentNum,
            title: "Next ACT Module",
          });
        }

        if (profile.currentClinicalSnapshot?.pcl5Total > 0) {
          setStep("education"); // Skip directly to the "Start Session" screen
          setLoading(false);
          return;
        }

        const [pdeqRes, pcl5Res, dersRes, aaqRes] = await Promise.all([
          fetch(`${BASE_URL}/template/PDEQ-V1`),
          fetch(`${BASE_URL}/template/PCL5-V1`),
          fetch(`${BASE_URL}/template/DERS18-V1`),
          fetch(`${BASE_URL}/template/AAQ-V1`),
        ]);

        if (!pdeqRes.ok || !pcl5Res.ok || !dersRes.ok || !aaqRes.ok) {
          throw new Error("Failed to fetch assessment templates");
        }

        const pdeq = await pdeqRes.json();
        const pcl5 = await pcl5Res.json();
        const ders = await dersRes.json();
        const aaq = await aaqRes.json();

        setPdeqTemplate(pdeq);
        setPcl5Template(pcl5);
        setDersTemplate(ders);
        setAaqTemplate(aaq);

        // Initialize score arrays based on question counts
        setPdeqScores(new Array(pdeq.questions.length).fill(-1));
        setPcl5Scores(new Array(pcl5.questions.length).fill(-1));
        setDersScores(new Array(ders.questions.length).fill(-1));
        setAaqScores(new Array(aaq.questions.length).fill(-1));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load assessments"
        );
        console.error("Error fetching templates:", err);
      } finally {
        setLoading(false);
      }
    };

    checkStatusAndFetchTemplates();
  }, []);

  // Effect to scroll the main container to the top when the step changes
  useEffect(() => {
    const mainElement = document.querySelector("main");
    if (mainElement) {
      mainElement.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  // ... inside the component
  const handleFinalSubmit = async () => {
    setIsAssigning(true);

    try {
      // We define the three clinical sets we need to save
      const assessmentsToSave = [
        {
          template: pcl5Template,
          scores: pcl5Scores,
          code: "PCL5-V1",
          total: calculateTotal(pcl5Scores),
        },
        {
          template: dersTemplate,
          scores: dersScores,
          code: "DERS18-V1",
          total: getDERSGrandTotal(),
        },
        {
          template: aaqTemplate,
          scores: aaqScores,
          code: "AAQ-V1",
          total: calculateTotal(aaqScores),
        },
      ];

      // Use the Service File for each assessment
      await Promise.all(
        assessmentsToSave.map(async (item) => {
          if (!item.template) return;

          // Clean mapping of state to the DB schema
          const payload = {
            templateId: (item.template as any)._id,
            testType: item.code,
            totalScore: item.total,
            items: item.template.questions.map((q, i) => ({
              questionId: q.id,
              questionText: q.text,
              value: item.scores[i],
              // Pulling label dynamically from the question options
              label:
                q.options.find((opt) => opt.value === item.scores[i])?.label ||
                "",
            })),
          };

          // USING THE SERVICE FILE HERE
          return saveAssessment(payload);
        })
      );

      setStep("education");
    } catch (err) {
      console.error("Critical submission failure:", err);
      alert("Could not link with clinic. Please check your connection.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleScore = (
    setter: React.Dispatch<React.SetStateAction<number[]>>,
    scores: number[],
    idx: number,
    val: number
  ) => {
    const next = [...scores];
    next[idx] = val;
    setter(next);
  };

  const calculateTotal = (scores: number[]) =>
    scores.reduce((a, b) => a + (b === -1 ? 0 : b), 0);

  const calculatePCL5Cluster = (cluster: "B" | "C" | "D" | "E") => {
    if (!pcl5Template) return 0;
    return pcl5Template.questions.reduce((total, q, idx) => {
      if (q.cluster === cluster && pcl5Scores[idx] !== -1)
        return total + pcl5Scores[idx];
      return total;
    }, 0);
  };

  const calculateDERSSubscale = (indices: number[]) => {
    if (!dersTemplate) return 0;
    return indices.reduce((total, i) => {
      const score = dersScores[i - 1];
      if (score === -1) return total;
      const reverseIndices = dersTemplate.reverseScoreIndices || [];
      const effectiveScore = reverseIndices.includes(i - 1) ? 6 - score : score;
      return total + effectiveScore;
    }, 0);
  };

  const getDERSGrandTotal = () => {
    if (!dersTemplate) return 0;
    const reverseIndices = dersTemplate.reverseScoreIndices || [];
    return dersScores.reduce((total, score, idx) => {
      if (score === -1) return total;
      const effectiveScore = reverseIndices.includes(idx) ? 6 - score : score;
      return total + effectiveScore;
    }, 0);
  };

  const renderLikert = (
    template: AssessmentTemplate,
    currentScores: number[],
    setter: React.Dispatch<React.SetStateAction<number[]>>,
    phaseLabel: string
  ) => (
    <div className="space-y-12">
      <div className="text-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
          {phaseLabel}
        </span>
        <h3 className="text-3xl font-black text-slate-800 mt-4 leading-tight">
          {template.title}
        </h3>
      </div>
      <div className="space-y-10">
        {template.questions.map((q, qIdx) => (
          <div key={q.id || qIdx} className="space-y-4">
            <p className="text-slate-800 font-bold text-lg leading-snug">
              {qIdx + 1}. {q.text}
            </p>
            <div className="flex flex-wrap md:flex-nowrap justify-between gap-2">
              {/* Map over the options stored in the DB for this specific question */}
              {q.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    handleScore(setter, currentScores, qIdx, opt.value)
                  }
                  className={`flex-1 py-4 px-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                    currentScores[qIdx] === opt.value
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100"
                      : "bg-white border-slate-100 text-slate-400 hover:border-indigo-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-xl mb-1">{opt.value}</span>
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
    const order: AssessmentStep[] = [
      "intro",
      "mood",
      "demographics",
      "traumaHistory",
      "pdeq",
      "pcl5",
      "ders",
      "aaq",
      "summary",
    ];
    const currentIdx = order.indexOf(step);
    if (currentIdx < order.length - 1) setStep(order[currentIdx + 1]);
  };

  const getDynamicButtonLabel = () => {
    switch (step) {
      case "pdeq":
        return "Next: Section 4 : PTSD Symptoms (PCL-5)";
      case "pcl5":
        return "Next: Section 5 : Emotion Regulation (DERS-18)";
      case "ders":
        return "Next: Section 6 : Psychological Inflexibility (AAQ-II)";
      case "aaq":
        return "Next: Clinical Summary";
      default:
        return "Continue to Next Section";
    }
  };

  const stepOrder: AssessmentStep[] = [
    "intro",
    "mood",
    "demographics",
    "traumaHistory",
    "pdeq",
    "pcl5",
    "ders",
    "aaq",
    "summary",
  ];

  // Show loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pb-24 animate-in fade-in duration-500">
        <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-slate-200 shadow-2xl">
          <div className="text-center space-y-6 py-20">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-500 font-medium">Loading assessments...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto pb-24 animate-in fade-in duration-500">
        <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-slate-200 shadow-2xl">
          <div className="text-center space-y-6 py-20">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center text-3xl mx-auto">
              <i className="fa-solid fa-exclamation-triangle"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-800">
              Failed to Load Assessments
            </h3>
            <p className="text-slate-500">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 animate-in fade-in duration-500">
      <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-slate-200 shadow-2xl relative overflow-hidden">
        {step !== "education" && (
          <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
            <div
              className="h-full bg-indigo-600 transition-all duration-700"
              style={{
                width: `${
                  (stepOrder.indexOf(step) / (stepOrder.length - 1)) * 100
                }%`,
              }}
            ></div>
          </div>
        )}

        {step === "intro" && (
          <div className="text-center space-y-8 py-10">
            <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center text-4xl mx-auto shadow-inner">
              <i className="fa-solid fa-file-medical"></i>
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-slate-800 tracking-tight">
                Clinical Intake
              </h2>
              <p className="text-slate-500 max-w-lg mx-auto leading-relaxed">
                Complete all 7 assessment phases to receive a clinical
                evaluation and matching with a specialized therapist.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
              {[
                {
                  label: "Personal Context",
                  desc: "Detailed socio-economic history.",
                },
                {
                  label: "PTSD Impact",
                  desc: "PCL-5 clinical severity mapping.",
                },
                { label: "Emotion Regulation", desc: "DERS-18 skill profile." },
                {
                  label: "Action & Readiness",
                  desc: "AAQ-II psychological flexibility.",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-4 bg-slate-50 rounded-2xl flex items-start gap-3"
                >
                  <i className="fa-solid fa-check-double text-indigo-500 mt-1"></i>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {item.label}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={nextStep}
              className="w-full max-w-sm py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 transition-all"
            >
              Begin Clinical Intake
            </button>
          </div>
        )}

        {step === "mood" && (
          <div className="space-y-12">
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                Phase 1 of 8
              </span>
              <h3 className="text-3xl font-black text-slate-800 mt-4">
                Current Mood
              </h3>
            </div>
            <div className="grid grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => setMood(v)}
                  className={`p-8 rounded-3xl border-2 transition-all text-4xl flex flex-col items-center gap-4 ${
                    mood === v
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200"
                      : "bg-slate-50 border-transparent hover:border-indigo-200 shadow-sm"
                  }`}
                >
                  {v === 1
                    ? "😞"
                    : v === 2
                    ? "😕"
                    : v === 3
                    ? "😐"
                    : v === 4
                    ? "🙂"
                    : "✨"}
                  <span className="text-[10px] font-black uppercase opacity-60">
                    Level {v}
                  </span>
                </button>
              ))}
            </div>
            <button
              disabled={mood === null}
              onClick={nextStep}
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl disabled:opacity-50 transition-all"
            >
              Next: Section 1 : Demographic Sheet
            </button>
          </div>
        )}

        {step === "demographics" && (
          <div className="space-y-10">
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                Phase 2 of 8
              </span>
              <h3 className="text-3xl font-black text-slate-800 mt-4">
                Section 1: Demographic Sheet
              </h3>
              <p className="text-slate-500 mt-2 font-medium">
                Personal Profile & Family Structure
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: "Name", key: "name", type: "text" },
                { label: "Age", key: "age", type: "number" },
                { label: "Gender", key: "gender", type: "text" },
                { label: "Marital Status", key: "maritalStatus", type: "text" },
                { label: "Education", key: "education", type: "text" },
                { label: "City", key: "city", type: "text" },
                { label: "Occupation", key: "occupation", type: "text" },
                { label: "No of Siblings", key: "siblings", type: "number" },
                { label: "Birth Order", key: "birthOrder", type: "text" },
                {
                  label: "Monthly Income Range",
                  key: "incomeRange",
                  type: "text",
                },
                {
                  label: "Earning Members",
                  key: "earningMembers",
                  type: "text",
                },
              ].map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={(demoData as any)[field.key]}
                    onChange={(e) =>
                      setDemoData({ ...demoData, [field.key]: e.target.value })
                    }
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              ))}

              <div className="md:col-span-2 space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Family System
                </label>
                <div className="flex gap-4">
                  {["Nuclear", "Joint Family"].map((sys) => (
                    <button
                      key={sys}
                      onClick={() =>
                        setDemoData({ ...demoData, familySystem: sys })
                      }
                      className={`flex-1 py-4 px-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                        demoData.familySystem === sys
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                          : "bg-white border-slate-100 text-slate-400"
                      }`}
                    >
                      {sys}
                    </button>
                  ))}
                </div>
              </div>

              {[
                { label: "Medical Diseases", key: "medicalDiseases" },
                { label: "Psychological Illness", key: "psychIllness" },
                { label: "Medication in use", key: "medication" },
              ].map((field) => (
                <div key={field.key} className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={(demoData as any)[field.key]}
                    onChange={(e) =>
                      setDemoData({ ...demoData, [field.key]: e.target.value })
                    }
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              ))}
            </div>

            <div className="pt-10 border-t border-slate-100 space-y-8">
              <h4 className="text-xl font-black text-slate-800">
                Family Medical and Psychological History
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Medical Diseases (Family)
                  </label>
                  <input
                    type="text"
                    value={demoData.familyMedical}
                    onChange={(e) =>
                      setDemoData({
                        ...demoData,
                        familyMedical: e.target.value,
                      })
                    }
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Psychological Illness (Family)
                  </label>
                  <input
                    type="text"
                    value={demoData.familyPsych}
                    onChange={(e) =>
                      setDemoData({ ...demoData, familyPsych: e.target.value })
                    }
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                  />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Parent's Relation Status
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {["Living Together", "Separated", "Divorced", "Died"].map(
                      (status) => (
                        <button
                          key={status}
                          onClick={() =>
                            setDemoData({
                              ...demoData,
                              parentsRelation: status,
                            })
                          }
                          className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                            demoData.parentsRelation === status
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                              : "bg-white border-slate-100 text-slate-400"
                          }`}
                        >
                          {status}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={nextStep}
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl transition-all"
            >
              Next: Section 2 : Trauma History
            </button>
          </div>
        )}

        {step === "traumaHistory" && (
          <div className="space-y-10">
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                Phase 3 of 8
              </span>
              <h3 className="text-3xl font-black text-slate-800 mt-4 leading-tight">
                Section 2: Trauma History
              </h3>
              <p className="text-slate-500 mt-2 font-medium">
                Please mark traumatic events you have personally experienced.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  label: "Threatening Death of Loved One",
                  key: "deathOfLovedOne",
                },
                { label: "Near Death Experience", key: "nearDeath" },
                { label: "Serious Injury", key: "seriousInjury" },
                {
                  label: "Witness of the Traumatic Incident Occurred to others",
                  key: "witnessedTrauma",
                },
                { label: "Abuse (Emotional)", key: "abuseEmotional" },
                { label: "Abuse (Physical)", key: "abusePhysical" },
                { label: "Abuse (Sexual)", key: "abuseSexual" },
              ].map((item) => (
                <div
                  key={item.key}
                  className={`p-6 rounded-3xl border-2 transition-all ${
                    (traumaData as any)[item.key].experienced
                      ? "bg-indigo-50 border-indigo-200 shadow-sm"
                      : "bg-white border-slate-100"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <button
                        onClick={() =>
                          setTraumaData({
                            ...traumaData,
                            [item.key]: {
                              ...(traumaData as any)[item.key],
                              experienced: !(traumaData as any)[item.key]
                                .experienced,
                            },
                          })
                        }
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                          (traumaData as any)[item.key].experienced
                            ? "bg-indigo-600 text-white shadow-lg"
                            : "bg-slate-100 text-slate-300 hover:bg-slate-200"
                        }`}
                      >
                        <i
                          className={`fa-solid ${
                            (traumaData as any)[item.key].experienced
                              ? "fa-check"
                              : "fa-plus"
                          }`}
                        ></i>
                      </button>
                      <span
                        className={`font-bold text-sm ${
                          (traumaData as any)[item.key].experienced
                            ? "text-indigo-900"
                            : "text-slate-600"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>

                    {(traumaData as any)[item.key].experienced && (
                      <div className="w-full md:w-64 animate-in zoom-in-95">
                        <label className="text-[8px] font-black text-indigo-400 uppercase tracking-widest ml-1">
                          Age at time of experience
                        </label>
                        <input
                          type="text"
                          placeholder="Age..."
                          value={(traumaData as any)[item.key].age}
                          onChange={(e) =>
                            setTraumaData({
                              ...traumaData,
                              [item.key]: {
                                ...(traumaData as any)[item.key],
                                age: e.target.value,
                              },
                            })
                          }
                          className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={nextStep}
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl"
            >
              Next: Section 3 : Peritraumatic Dissociation (PDEQ)
            </button>
          </div>
        )}

        {step === "pdeq" &&
          pdeqTemplate &&
          renderLikert(pdeqTemplate, pdeqScores, setPdeqScores, "Phase 4 of 8")}

        {step === "pcl5" &&
          pcl5Template &&
          renderLikert(pcl5Template, pcl5Scores, setPcl5Scores, "Phase 5 of 8")}

        {step === "ders" &&
          dersTemplate &&
          renderLikert(dersTemplate, dersScores, setDersScores, "Phase 6 of 8")}

        {step === "aaq" &&
          aaqTemplate &&
          renderLikert(aaqTemplate, aaqScores, setAaqScores, "Phase 7 of 8")}

        {["pdeq", "pcl5", "ders", "aaq"].includes(step) ? (
          <button
            disabled={
              (step === "pdeq" && pdeqScores.includes(-1)) ||
              (step === "pcl5" && pcl5Scores.includes(-1)) ||
              (step === "ders" && dersScores.includes(-1)) ||
              (step === "aaq" && aaqScores.includes(-1))
            }
            onClick={nextStep}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl disabled:opacity-50 mt-10 transition-all"
          >
            {getDynamicButtonLabel()}
          </button>
        ) : null}

        {step === "summary" && (
          <div className="text-center space-y-10 py-10">
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-slate-800 tracking-tight">
                Clinical Profile Generated
              </h2>
              <p className="text-slate-500">
                Intake Evaluation for {demoData.name || "Alex"}.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
              <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex justify-between">
                  <span>PCL-5 (PTSD Severity)</span>
                  <span className="text-indigo-600 font-black">
                    {calculateTotal(pcl5Scores)} / 80
                  </span>
                </h4>
                <div className="space-y-4">
                  {[
                    {
                      label: "Re-experiencing (B)",
                      val: calculatePCL5Cluster("B"),
                      max: 20,
                    },
                    {
                      label: "Avoidance (C)",
                      val: calculatePCL5Cluster("C"),
                      max: 8,
                    },
                    {
                      label: "Cognition/Mood (D)",
                      val: calculatePCL5Cluster("D"),
                      max: 28,
                    },
                    {
                      label: "Hyper-arousal (E)",
                      val: calculatePCL5Cluster("E"),
                      max: 24,
                    },
                  ].map((c) => (
                    <div key={c.label} className="space-y-1">
                      <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                        <span>{c.label}</span>
                        <span>
                          {c.val} / {c.max}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500"
                          style={{ width: `${(c.val / c.max) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex justify-between">
                  <span>DERS-18 (Emotion Profile)</span>
                  <span className="text-indigo-600 font-black">
                    {getDERSGrandTotal()} / 90
                  </span>
                </h4>
                <div className="space-y-4">
                  {[
                    {
                      label: "Awareness",
                      val: calculateDERSSubscale([1, 4, 6]),
                      max: 15,
                    },
                    {
                      label: "Clarity",
                      val: calculateDERSSubscale([2, 3, 5]),
                      max: 15,
                    },
                    {
                      label: "Strategies",
                      val: calculateDERSSubscale([10, 11, 17]),
                      max: 15,
                    },
                  ].map((c) => (
                    <div key={c.label} className="space-y-1">
                      <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                        <span>{c.label}</span>
                        <span>
                          {c.val} / {c.max}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${(c.val / c.max) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-purple-50 rounded-[2rem] border border-purple-100 col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-4">
                    Dissociation Index (PDEQ)
                  </h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-purple-700">
                      {pdeqTemplate && pdeqTemplate.questions.length > 0
                        ? (
                            calculateTotal(pdeqScores) /
                            pdeqTemplate.questions.length
                          ).toFixed(2)
                        : "0.00"}
                    </span>
                    <span className="text-[9px] text-purple-400 font-bold uppercase tracking-widest">
                      Mean Item Score
                    </span>
                  </div>
                  <p className="text-[10px] text-purple-500 mt-2 font-medium">
                    Potential Range: 1.0 (Low) to 5.0 (Severe)
                  </p>
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-4">
                    Psychological Inflexibility (AAQ-II)
                  </h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-sky-700">
                      {calculateTotal(aaqScores)}
                    </span>
                    <span className="text-[9px] text-sky-400 font-bold uppercase tracking-widest">
                      Total Score
                    </span>
                  </div>
                  {calculateTotal(aaqScores) >= 25 ? (
                    <p className="text-[10px] text-rose-500 mt-2 font-black uppercase">
                      Above Normative Threshold (Impact on wellbeing)
                    </p>
                  ) : (
                    <p className="text-[10px] text-emerald-600 mt-2 font-black uppercase">
                      Within Average Normative Range
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="max-w-xl mx-auto p-8 bg-indigo-600 rounded-[2.5rem] text-white text-left shadow-xl shadow-indigo-100">
              <h4 className="font-bold text-xl mb-2">Specialist Match Found</h4>
              <p className="text-sm text-indigo-100 leading-relaxed">
                Based on your{" "}
                {calculateTotal(aaqScores) >= 25
                  ? "High Inflexibility"
                  : "Profile"}
                , we have matched you with **Dr. Sarah Smith**, a
                trauma-informed ACT specialist focused on values-based recovery.
              </p>
            </div>

            <button
              onClick={handleFinalSubmit}
              disabled={isAssigning}
              className="w-full max-w-sm py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
            >
              {isAssigning ? (
                <>
                  <img
                    src="https://i.ibb.co/FkV0M73k/brain.png"
                    alt="loading"
                    className="w-5 h-5 brain-loading-img"
                  />{" "}
                  Finalizing Clinical Link...
                </>
              ) : (
                <>Connect with Dr. Sarah Smith</>
              )}
            </button>
          </div>
        )}

        {step === "education" && (
          <div className="space-y-12 animate-in slide-in-from-bottom-8">
            <div className="bg-slate-900 rounded-[2.5rem] p-12 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <i className="fa-solid fa-graduation-cap text-[10rem]"></i>
              </div>
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">
                    🤝
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">
                      Practice Link Established
                    </h3>
                    <p className="text-indigo-300 font-medium">
                      Your clinician has reviewed your diagnostic data.
                    </p>
                  </div>
                </div>
                <div className="p-6 bg-white/10 rounded-3xl border border-white/10 backdrop-blur-md">
                  <p className="text-sm italic leading-relaxed">
                    "Hello {userProfile?.name.split(" ")[0] || "Alex"}. I've
                    received your data. Based on your profile, we are starting
                    the specialized 12-session ACT program. We'll meet twice per
                    week."
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                Your Therapy Path
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  disabled={isLocked}
                  onClick={() =>
                    !isLocked &&
                    navigate(
                      `/session/${nextSessionTemplate?.sessionNumber || 1}/details`
                    )
                  }
                  className={`p-8 border-none rounded-[2.5rem] transition-all group text-left relative overflow-hidden ${
                    isLocked
                      ? "bg-slate-100 cursor-not-allowed border-slate-200"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-2xl"
                  }`}
                >
                  {/* Lock Icon for visual feedback */}
                  {isLocked && (
                    <div className="absolute top-6 right-6 text-slate-300">
                      <i className="fa-solid fa-lock text-2xl"></i>
                    </div>
                  )}
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-6 transition-transform ${
                      isLocked
                        ? "bg-slate-200 text-slate-400"
                        : "bg-white/20 text-white group-hover:scale-110"
                    }`}
                  >
                    <i
                      className={`fa-solid ${
                        isLocked ? "fa-calendar-day" : "fa-play"
                      }`}
                    ></i>
                  </div>
                  <h4
                    className={`font-black text-xl mb-2 uppercase tracking-tight ${
                      isLocked ? "text-slate-400" : "text-white"
                    }`}
                  >
                    {isLocked
                      ? "Weekly Limit Reached"
                      : `Start Session ${
                          nextSessionTemplate?.sessionNumber || 1
                        }`}
                  </h4>
                  <p
                    className={`text-xs leading-relaxed font-medium uppercase tracking-widest ${
                      isLocked ? "text-slate-400" : "text-indigo-100"
                    }`}
                  >
                    {isLocked
                      ? "Next session available next week"
                      : nextSessionTemplate?.title ||
                        "Loading session details..."}
                  </p>
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="p-8 bg-white border border-slate-200 rounded-[2.5rem] hover:border-indigo-500 hover:shadow-xl transition-all group text-left"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl mb-6 text-emerald-500 group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-chart-line"></i>
                  </div>
                  <h4 className="font-bold text-slate-800 mb-2">
                    View My Dashboard
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Track your progress and assignments.
                  </p>
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
