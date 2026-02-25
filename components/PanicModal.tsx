
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

const PanicModal: React.FC = () => {
  const { isPanicOpen: isOpen, setIsPanicOpen } = useApp();
  const onClose = () => setIsPanicOpen(false);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden relative">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>

        <div className="p-10 text-center">
          <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center text-3xl mx-auto mb-6 shadow-inner animate-bounce">
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Need Support Now?</h2>
          <p className="text-slate-500 mt-2 mb-10 leading-relaxed font-medium">
            Take a deep breath. You are not alone. Choose the support you need right now.
          </p>

          <div className="space-y-4">
            {/* National Crisis Line */}
            <a 
              href="tel:988"
              className="w-full p-6 bg-rose-600 text-white rounded-3xl flex items-center justify-between group hover:bg-rose-700 transition-all shadow-xl shadow-rose-200"
            >
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-100">National Lifeline</p>
                <p className="text-xl font-black">Call 988</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-phone-flip text-xl"></i>
              </div>
            </a>

            {/* Therapist Direct Connect */}
            <button 
              className="w-full p-6 bg-indigo-600 text-white rounded-3xl flex items-center justify-between group hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
            >
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Contact Provider</p>
                <p className="text-xl font-black">Dr. Sarah Smith</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-comment-dots text-xl"></i>
              </div>
            </button>

            {/* Immediate Grounding */}
            <NavLink 
              to="/mindfulness"
              onClick={onClose}
              className="w-full p-6 bg-emerald-50 border-2 border-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-between group hover:border-emerald-300 transition-all"
            >
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Anxiety Tool</p>
                <p className="text-xl font-black">Start Grounding</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-wind text-xl"></i>
              </div>
            </NavLink>
          </div>

          <p className="mt-10 text-xs text-slate-400 font-bold uppercase tracking-widest">
            Always call emergency services if you are in immediate danger.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PanicModal;
