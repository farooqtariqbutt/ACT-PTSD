
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import DistressMeter from './DistressMeter';
// Fix: Import THERAPY_SESSIONS and User from types.ts
import { THERAPY_SESSIONS, User } from '../types';

interface ClientDashboardProps {
  user: User;
}

const ClientDashboard: React.FC<ClientDashboardProps> = ({ user }) => {
  // Use the currentSession from the user object, defaulting to 1
  const currentSessionNumber = user.currentSession || 1; 
  const currentSession = THERAPY_SESSIONS[currentSessionNumber - 1];
  
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
              <div className="grid grid-cols-12 gap-1.5">
                 {Array.from({ length: 12 }).map((_, i) => (
                   <div key={i} className={`h-1.5 rounded-full ${i + 1 < currentSessionNumber ? 'bg-indigo-400' : i + 1 === currentSessionNumber ? 'bg-indigo-600 animate-pulse' : 'bg-white/5'}`}></div>
                 ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <NavLink to="/session" className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all text-center shadow-xl">
              Launch Session {currentSessionNumber}
            </NavLink>
            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">Target: 2 sessions per week</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Distress Meter */}
        <DistressMeter />

        {/* Assignments Quick View */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-list-check text-indigo-500"></i>
              Today's Tasks
            </h3>
            <NavLink to="/assignments" className="text-xs font-bold text-indigo-600 hover:underline uppercase tracking-widest">
              View All
            </NavLink>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4 hover:border-indigo-100 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg group-hover:bg-emerald-500 group-hover:text-white transition-all">
                <i className="fa-solid fa-spa"></i>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-800 text-sm">Morning Grounding</h4>
                <p className="text-xs text-slate-500 mt-1">5-4-3-2-1 exercise (10 mins)</p>
              </div>
              <i className="fa-solid fa-chevron-right text-slate-200 text-xs mt-2"></i>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4 hover:border-indigo-100 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg group-hover:bg-indigo-500 group-hover:text-white transition-all">
                <i className="fa-solid fa-graduation-cap"></i>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-800 text-sm">Session {currentSessionNumber} Recap</h4>
                <p className="text-xs text-slate-500 mt-1">{currentSession.title}</p>
              </div>
              <i className="fa-solid fa-chevron-right text-slate-200 text-xs mt-2"></i>
            </div>
          </div>

           {/* Skills Snapshot */}
           <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6 flex justify-between items-center">
              Skill Growth
              <NavLink to="/reports" className="text-[10px] font-bold text-indigo-600 uppercase hover:underline">Full Report</NavLink>
            </h3>
            <div className="space-y-6">
              {[
                { label: 'Defusion', value: 12, color: 'bg-indigo-500' },
                { label: 'Values Alignment', value: 8, color: 'bg-emerald-500' },
                { label: 'Present Moment', value: 15, color: 'bg-sky-500' },
              ].map(skill => (
                <div key={skill.label}>
                  <div className="flex justify-between text-[10px] mb-1.5">
                    <span className="text-slate-500 font-bold uppercase tracking-widest">{skill.label}</span>
                    <span className="text-slate-800 font-bold">{skill.value}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full">
                    <div className={`h-full ${skill.color} rounded-full transition-all duration-1000`} style={{ width: `${skill.value}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Recovery Insight */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-message text-indigo-500"></i>
              Daily Insight
            </h3>
            <div className="text-sm text-slate-600 italic leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
               "When the 'I'm not good enough' story shows up, notice it as a story. You don't have to fight it, just make room for it like a passenger on a bus."
            </div>
            <div className="mt-4">
              <NavLink to="/chat" className="text-xs font-bold text-indigo-600 flex items-center gap-2 hover:underline uppercase tracking-widest">
                Discuss with Companion <i className="fa-solid fa-arrow-right"></i>
              </NavLink>
            </div>
        </section>

         {/* Values Quick View */}
        <section className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-1">My Compass</h3>
            <p className="text-slate-400 text-sm">Life domains in focus.</p>
          </div>
          <div className="flex flex-wrap gap-3 mt-6 relative z-10">
             <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2">
                <i className="fa-solid fa-heart-pulse text-rose-400 text-[10px]"></i>
                <span className="text-[10px] font-bold uppercase tracking-wider">Health</span>
             </div>
             <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2">
                <i className="fa-solid fa-people-group text-sky-400 text-[10px]"></i>
                <span className="text-[10px] font-bold uppercase tracking-wider">Family</span>
             </div>
          </div>
          <NavLink to="/values" className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 transition-colors rounded-xl text-xs font-bold shadow-xl shadow-indigo-900/40 text-center relative z-10">
                Explore All Values
          </NavLink>
        </section>

        {/* Personalized Affirmation (Simulated) */}
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
