
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import DistressMeter from './DistressMeter';
import { THERAPY_SESSIONS } from '../types';
import { useApp } from '../contexts/AppContext';

const ClientDashboard: React.FC = () => {
  const { currentUser: user, themeClasses } = useApp();
  const currentSessionNumber = user.currentSession || 1; 
  const currentSession = THERAPY_SESSIONS[currentSessionNumber - 1] || THERAPY_SESSIONS[0];
  
  if (!currentSession) return null;

  const valueStepsCount = (user.sessionData || []).filter(d => d.stepId === 'value-action-step').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* 12 Session Program Tracker */}
      <section className={`${themeClasses.secondary} rounded-[2.5rem] p-10 text-slate-800 shadow-2xl relative overflow-hidden transition-colors duration-500`}>
        <div className={`absolute top-0 right-0 w-96 h-96 ${themeClasses.primary} opacity-10 rounded-full -mr-48 -mt-48 blur-3xl`}></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                 🏆
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Your 12-Session Journey</h2>
                <p className={`${themeClasses.text} text-sm font-medium`}>
                  {currentSessionNumber > 12 
                    ? "Program Completed! Time for Post-Assessments." 
                    : `Session ${currentSession.number} of 12: ${currentSession.title}`}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className={`flex justify-between text-[10px] font-black uppercase tracking-widest ${themeClasses.text} opacity-60`}>
                <span>Program Progress</span>
                <span>{currentSessionNumber > 12 ? 100 : Math.round(((currentSessionNumber-1)/12)*100)}% Complete</span>
              </div>
              <div className={`w-full h-3 ${themeClasses.secondary} rounded-full overflow-hidden shadow-inner`}>
                <div 
                  className={`h-full ${themeClasses.primary} rounded-full transition-all duration-1000 shadow-lg`} 
                  style={{ width: `${currentSessionNumber > 12 ? 100 : ((currentSessionNumber-1)/12)*100}%` }}
                ></div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto">
            {currentSessionNumber > 12 ? (
              <NavLink to="/assessments?type=post" className={`px-8 py-4 ${themeClasses.primary} text-white rounded-2xl font-black text-sm hover:opacity-90 transition-all text-center shadow-xl`}>
                Launch Post-Assessments
              </NavLink>
            ) : (
              <NavLink to="/session" className={`px-8 py-4 ${themeClasses.primary} text-white rounded-2xl font-black text-sm hover:opacity-90 transition-all text-center shadow-xl`}>
                Launch Session {currentSessionNumber}
              </NavLink>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <DistressMeter />

        <section className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <i className={`fa-solid fa-list-check ${themeClasses.text}`}></i>
              Committed Actions
            </h3>
            <NavLink to="/values-log" className={`text-xs font-bold ${themeClasses.text} hover:underline uppercase tracking-widest`}>
              View Log
            </NavLink>
          </div>
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
            <div className={`w-32 h-32 rounded-full border-8 ${themeClasses.secondary} flex flex-col items-center justify-center bg-white shadow-inner`}>
                <span className={`text-3xl font-black ${themeClasses.text}`}>{valueStepsCount}</span>
                <span className="text-[8px] font-black text-slate-400 uppercase">Steps Taken</span>
            </div>
            <div className="flex-1 space-y-4">
                <h4 className="text-xl font-bold text-slate-800 tracking-tight">Values Persistence</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                   You've taken {valueStepsCount} committed actions toward your values. Every small step strengthens your psychological flexibility.
                </p>
                <NavLink to="/values-log" className={`inline-block px-6 py-2.5 ${themeClasses.primary} text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg ${themeClasses.shadow}`}>Record Today's Step</NavLink>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <i className={`fa-solid fa-message ${themeClasses.text}`}></i>
              Daily Insight
            </h3>
            <div className={`text-sm text-slate-600 italic leading-relaxed ${themeClasses.secondary} p-4 rounded-2xl border ${themeClasses.border}`}>
               "When the 'I'm not good enough' story shows up, notice it as a story. You don't have to fight it, just make room for it like a passenger on a bus."
            </div>
        </section>

        <section className={`${themeClasses.secondary} rounded-3xl p-8 text-slate-800 relative overflow-hidden flex flex-col justify-between transition-colors duration-500 shadow-sm border border-slate-100`}>
          <div className={`absolute top-0 right-0 w-64 h-64 ${themeClasses.primary} opacity-10 rounded-full -mr-24 -mt-24 blur-3xl`}></div>
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-1">My Compass</h3>
            <p className="text-slate-500 text-sm">Review your core directions.</p>
          </div>
          <NavLink to="/values" className={`mt-6 w-full py-2.5 ${themeClasses.primary} hover:opacity-90 transition-all rounded-xl text-xs font-bold shadow-xl text-center relative z-10 text-white`}>
                Explore Values
          </NavLink>
        </section>

        <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center text-2xl mb-4">
             <i className="fa-solid fa-sun"></i>
           </div>
           <h3 className="font-bold text-slate-800 mb-2">Morning Mindset</h3>
           <p className="text-xs text-slate-500 leading-relaxed font-medium italic">
             "I am willing to experience this moment exactly as it is, without needing to change it or run away from it."
           </p>
        </section>
      </div>
    </div>
  );
};

export default ClientDashboard;
