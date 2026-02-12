
import React, { useState } from 'react';
import { getACTEducation } from '../services/geminiService';
import { GoogleGenAI, Type } from "@google/genai";

const ACT_TOPICS = [
  "Cognitive Defusion",
  "Acceptance",
  "Contact with the Present Moment",
  "The Observing Self",
  "Values",
  "Committed Action"
];

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

const Education: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);

  const fetchContent = async (topic: string) => {
    setLoading(true);
    setContent(null);
    setQuiz(null);
    setQuizScore(null);
    setSelectedTopic(topic);
    try {
      const result = await getACTEducation(topic);
      setContent(result);
    } catch (err) {
      setContent("Failed to load information. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateQuiz = async () => {
    if (!selectedTopic) return;
    setQuizLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a 3-question multiple-choice quiz about the ACT core process: "${selectedTopic}". Each question should have 4 options and 1 correct answer. Focus on clinical application for PTSD.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.INTEGER, description: "Index of the correct option (0-3)" }
              },
              required: ["question", "options", "correctAnswer"]
            }
          }
        }
      });
      setQuiz(JSON.parse(response.text || "[]"));
      setUserAnswers(new Array(3).fill(-1));
    } catch (err) {
      console.error(err);
    } finally {
      setQuizLoading(false);
    }
  };

  const submitQuiz = () => {
    if (!quiz) return;
    let score = 0;
    quiz.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) score++;
    });
    setQuizScore(score);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <h2 className="text-3xl font-black mb-2 tracking-tight">ACT Education Center</h2>
        <p className="text-indigo-100 max-w-xl font-medium">Deepen your understanding of psychological flexibility to navigate PTSD with clarity and purpose.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1 space-y-2">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Core Processes</h3>
          {ACT_TOPICS.map(topic => (
            <button
              key={topic}
              onClick={() => fetchContent(topic)}
              className={`w-full text-left px-5 py-4 rounded-2xl border transition-all text-sm ${
                selectedTopic === topic 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg font-bold' 
                : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:shadow-sm'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>

        <div className="md:col-span-3">
          {loading ? (
            <div className="bg-white rounded-[2rem] p-12 border border-slate-200 flex flex-col items-center justify-center text-slate-400">
              <img src="https://i.ibb.co/FkV0M73k/brain.png" alt="loading" className="w-12 h-12 brain-loading-img mb-4" />
              <p className="font-bold">Synthesizing therapeutic insights...</p>
            </div>
          ) : content ? (
            <div className="space-y-8">
              <div className="bg-white rounded-[2rem] p-10 border border-slate-200 shadow-sm prose prose-indigo max-w-none">
                <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
                  <i className="fa-solid fa-lightbulb text-amber-500"></i>
                  {selectedTopic}
                </h3>
                <div className="text-slate-600 leading-relaxed space-y-6">
                  {content.split('\n').map((line, i) => (
                    <p key={i} className="text-lg">{line}</p>
                  ))}
                </div>
                <div className="mt-12 pt-8 border-t border-slate-50 flex flex-wrap gap-4">
                  <button onClick={generateQuiz} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2">
                    <i className="fa-solid fa-clipboard-question"></i> Take Knowledge Check
                  </button>
                  <button className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">Discuss with Therapist</button>
                </div>
              </div>

              {quizLoading && (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-12 flex flex-col items-center justify-center text-slate-400">
                  <img src="https://i.ibb.co/FkV0M73k/brain.png" alt="loading" className="w-8 h-8 brain-loading-img mb-2" />
                  <p className="text-xs font-bold uppercase tracking-widest">Generating Quiz...</p>
                </div>
              )}

              {quiz && (
                <div className="bg-white rounded-[2rem] p-10 border border-slate-200 shadow-sm animate-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-center mb-8">
                    <h4 className="text-xl font-black text-slate-800">Knowledge Check: {selectedTopic}</h4>
                    {quizScore !== null && (
                      <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full font-black text-xs uppercase">
                        Score: {quizScore} / 3
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-10">
                    {quiz.map((q, qIdx) => (
                      <div key={qIdx} className="space-y-4">
                        <p className="font-bold text-slate-700 text-lg leading-snug">{qIdx + 1}. {q.question}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {q.options.map((opt, oIdx) => (
                            <button
                              key={oIdx}
                              disabled={quizScore !== null}
                              onClick={() => {
                                const newAnswers = [...userAnswers];
                                newAnswers[qIdx] = oIdx;
                                setUserAnswers(newAnswers);
                              }}
                              className={`p-4 rounded-xl border text-left text-sm transition-all ${
                                userAnswers[qIdx] === oIdx 
                                  ? quizScore === null 
                                    ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-sm font-bold'
                                    : oIdx === q.correctAnswer 
                                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                                      : 'bg-rose-50 border-rose-500 text-rose-900 font-bold'
                                  : quizScore !== null && oIdx === q.correctAnswer
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                                    : 'bg-slate-50 border-transparent text-slate-500 grayscale opacity-50'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {quizScore === null ? (
                    <button 
                      onClick={submitQuiz}
                      disabled={userAnswers.includes(-1)}
                      className="mt-10 w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50"
                    >
                      Submit Answers
                    </button>
                  ) : (
                    <button 
                      onClick={generateQuiz}
                      className="mt-10 w-full py-4 border-2 border-slate-100 text-slate-400 rounded-2xl font-black hover:bg-slate-50 transition-all"
                    >
                      Try Another Quiz
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-100/50 rounded-[2.5rem] p-12 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-center min-h-[400px]">
              <i className="fa-solid fa-book-open text-4xl mb-4"></i>
              <h3 className="font-black text-slate-600 mb-2 uppercase tracking-tight">Select a process to start</h3>
              <p className="text-sm max-w-xs font-medium">Learn the psychological skills needed to unhook from difficult thoughts and move toward your values.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Education;