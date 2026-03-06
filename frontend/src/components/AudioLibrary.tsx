
import React from 'react';
import { THERAPY_SESSIONS } from '../../types';

const AudioLibrary: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <h2 className="text-3xl font-black mb-2 tracking-tight">Session Audio Library</h2>
        <p className="text-indigo-100 max-w-xl font-medium">Manage and verify local audio assets for all therapeutic modules.</p>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                <th className="px-8 py-5">Session</th>
                <th className="px-8 py-5">Module Title</th>
                <th className="px-8 py-5">Audio Status</th>
                <th className="px-8 py-5">File Path</th>
                <th className="px-8 py-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {THERAPY_SESSIONS.map((session) => (
                <tr key={session.number} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <span className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-black text-xs">
                      {session.number}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div>
                      <p className="font-bold text-slate-800">{session.title}</p>
                      <p className="text-xs text-slate-400 font-medium">{session.moduleKey}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {session.audioUrl ? (
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-tight">
                        <i className="fa-solid fa-circle-check"></i>
                        Local Asset Linked
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-tight">
                        <i className="fa-solid fa-wand-magic-sparkles"></i>
                        AI Fallback Only
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <code className="text-[10px] bg-slate-100 px-2 py-1 rounded font-mono text-slate-500">
                      {session.audioUrl || 'N/A'}
                    </code>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex gap-2">
                       <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                         <i className="fa-solid fa-play"></i>
                       </button>
                       <button className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                         <i className="fa-solid fa-trash-can"></i>
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 rounded-[2rem] p-8 text-white">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <i className="fa-solid fa-folder-plus text-indigo-400"></i>
            Bulk Upload Instructions
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            To add new audio files, place them in the <code className="text-indigo-300">/public/audio/</code> directory using the naming convention <code className="text-indigo-300">s[number]_intro.mp3</code>.
          </p>
          <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all">
            Open Asset Manager
          </button>
        </div>
        <div className="bg-indigo-50 rounded-[2rem] p-8 border border-indigo-100">
          <h3 className="font-bold text-indigo-900 text-lg mb-4 flex items-center gap-2">
            <i className="fa-solid fa-microchip text-indigo-600"></i>
            AI Fallback Status
          </h3>
          <p className="text-indigo-700 text-sm leading-relaxed mb-6">
            When a local asset is missing, the system automatically generates therapeutic scripts and audio using Gemini 2.5 Flash TTS.
          </p>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-black text-indigo-900 uppercase tracking-widest">Gemini TTS Online</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioLibrary;