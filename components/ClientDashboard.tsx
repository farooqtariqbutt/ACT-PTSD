
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import DistressMeter from './DistressMeter';
import { THERAPY_SESSIONS } from '../types';
import { useApp } from '../contexts/AppContext';

const ClientDashboard: React.FC = () => {
  const { currentUser: user } = useApp();
  const currentSessionNumber = user.currentSession || 1; 
  const currentSession = THERAPY_SESSIONS[currentSessionNumber - 1];
  
  const valueStepsCount = (user.sessionData || []).filter(d => d.stepId === 'value-action-step').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* 12 Session Program Tracker */}
      <section className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">
                 🏆
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Your 12-Session Journey</h2>
                <p className="text-indigo-300 text-sm font-medium">Session {currentSession.number} of 12: {currentSession.title}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-indigo-300">
                <span>Program Progress</span>
                <span>{Math.round(((currentSessionNumber-1)/12)*100)}% Complete</span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(99,102,241,0.5)]" 
                  style={{ width: `${((currentSessionNumber-1)/12)*100}%` }}
                ></div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <NavLink to="/session" className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all text-center shadow-xl">
              Launch Session {currentSessionNumber}
            </NavLink>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <DistressMeter />

        <section className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-list-check text-indigo-500"></i>
              Committed Actions
            </h3>
            <NavLink to="/values-log" className="text-xs font-bold text-indigo-600 hover:underline uppercase tracking-widest">
              View Log
            </NavLink>
          </div>
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 rounded-full border-8 border-indigo-50 flex flex-col items-center justify-center bg-indigo-50/20 shadow-inner">
                <span className="text-3xl font-black text-indigo-600">{valueStepsCount}</span>
                <span className="text-[8px] font-black text-slate-400 uppercase">Steps Taken</span>
            </div>
            <div className="flex-1 space-y-4">
                <h4 className="text-xl font-bold text-slate-800 tracking-tight">Values Persistence</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                   You've taken {valueStepsCount} committed actions toward your values. Every small step strengthens your psychological flexibility.
                </p>
                <NavLink to="/values-log" className="inline-block px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-100">Record Today's Step</NavLink>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-message text-indigo-500"></i>
              Daily Insight
            </h3>
            <div className="text-sm text-slate-600 italic leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
               "When the 'I'm not good enough' story shows up, notice it as a story. You don't have to fight it, just make room for it like a passenger on a bus."
            </div>
        </section>

        <section className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-1">My Compass</h3>
            <p className="text-slate-400 text-sm">Review your core directions.</p>
          </div>
          <NavLink to="/values" className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 transition-colors rounded-xl text-xs font-bold shadow-xl text-center relative z-10">
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
