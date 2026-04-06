import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";

// ── Mirrors VirtualSession VALUES_LIST ────────────────────────────────────────
const VALUES_LIST = [
  { id: "v1",  name: "Acceptance & Mindfulness",     desc: "Being open to yourself, others, and the present moment." },
  { id: "v2",  name: "Adventure & Curiosity",         desc: "Seeking new experiences, exploring, and staying open-minded." },
  { id: "v3",  name: "Assertiveness & Courage",       desc: "Standing up for yourself respectfully and facing challenges bravely." },
  { id: "v4",  name: "Authenticity & Honesty",        desc: "Being true, genuine, and sincere in thoughts, words, and actions." },
  { id: "v5",  name: "Respect",                       desc: "Treating yourself and others with consideration and positive regard." },
  { id: "v6",  name: "Beauty & Creativity",           desc: "Appreciating, creating, and nurturing beauty in life and self-expression." },
  { id: "v7",  name: "Caring & Kindness",             desc: "Acting with compassion and consideration toward yourself and others." },
  { id: "v8",  name: "Connection & Intimacy",         desc: "Building meaningful relationships and being fully present with others." },
  { id: "v9",  name: "Contribution & Supportiveness", desc: "Helping, giving, and making a positive difference." },
  { id: "v10", name: "Fairness & Justice",            desc: "Treating self and others with equality, fairness, and integrity." },
  { id: "v11", name: "Fitness & Self-care",           desc: "Maintaining physical and mental health and wellbeing." },
  { id: "v12", name: "Flexibility & Adaptability",    desc: "Adjusting and responding well to change." },
  { id: "v13", name: "Freedom & Independence",        desc: "Living freely, making choices, and being self-directed." },
  { id: "v14", name: "Fun & Excitement",              desc: "Seeking enjoyment, thrill, and joy in life." },
  { id: "v15", name: "Gratitude & Humility",          desc: "Appreciating life, others, and staying humble." },
  { id: "v16", name: "Patience & Persistence",        desc: "Staying steady, waiting calmly, and continuing despite obstacles." },
  { id: "v17", name: "Power & Responsibility",        desc: "Taking charge, influencing, and being accountable for your actions." },
  { id: "v18", name: "Romance & Love",                desc: "Expressing love, affection, and emotional closeness." },
  { id: "v19", name: "Self-Development",              desc: "Growing, learning, and improving your skills, knowledge, and character." },
  { id: "v20", name: "Spirituality & Meaning",        desc: "Connecting to something larger than yourself, purpose, or deeper values." },
];

const DOMAIN_META: Record<string, { name: string; icon: string }> = {
  family:   { name: "Family",   icon: "fa-house-user" },
  work:     { name: "Work",     icon: "fa-briefcase"  },
  hobbies:  { name: "Hobbies",  icon: "fa-palette"    },
  yourself: { name: "Yourself", icon: "fa-user"       },
};

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ─────────────────────────────────────────────────────────────────────────────

const ValuesActionLog: React.FC = () => {
  const { currentUser: user, themeClasses } = useApp();

  // ── Lock check ────────────────────────────────────────────────────────────
  const isUnlocked =
    (user?.currentSession && user.currentSession > 6) ||
    user?.sessionHistory?.some(
      (s: any) => s.sessionNumber === 6 && (s.status === "COMPLETED" || s.completed === true)
    );

  // ── Extract session 6 reflections directly from user context ──────────────
  const session6 = user?.sessionHistory
    ?.filter((s: any) => s.sessionNumber === 6 && s.status === "COMPLETED")
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  const reflections = (session6 as any)?.reflections || {};

  // Resolve sorted value IDs → full objects (in priority order)
  const sortedValues = ((reflections.s6SortedValues as string[]) || [])
    .map((id) => VALUES_LIST.find((v) => v.id === id))
    .filter(Boolean) as typeof VALUES_LIST;

  // Resolve selected domains
  const selectedDomains = ((reflections.s6SelectedDomains as string[]) || []).map((id) => ({
    id,
    ...DOMAIN_META[id],
  }));

  // All "Very Important" values — used for the new-entry value dropdown
  const ratings: Record<string, string> = reflections.s6Ratings || {};
  const veryImportantValues = VALUES_LIST.filter((v) => ratings[v.id] === "V");

  // ── Action log state (starts from what's in sessionHistory) ───────────────
  const [actionLog, setActionLog] = useState<any[]>(reflections.s6ActionLog || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);

  // Sync if user prop updates (e.g. after re-auth)
  useEffect(() => {
    setActionLog(reflections.s6ActionLog || []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session6?.timestamp]);

  // ── New entry form ────────────────────────────────────────────────────────
  const [newEntry, setNewEntry] = useState({
    date:   new Date().toLocaleDateString("en-GB"),
    value:  "",
    action: "",
    size:   "Small",
    rating: "3",
  });

  const handleAdd = useCallback(async () => {
    if (!newEntry.value || !newEntry.action) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/value/values-action-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json","Authorization": `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify(newEntry),
      });
      const data = await res.json();
      if (data.success) {
        setActionLog(data.actionLog);
        setNewEntry({ date: new Date().toLocaleDateString("en-GB"), value: "", action: "", size: "Small", rating: "3" });
      }
    } catch (err) {
      console.error("Failed to add entry", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [newEntry]);

  const handleDelete = useCallback(async (idx: number) => {
    setDeleteIdx(idx);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/value/values-action-log/${idx}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}` // Add Authorization header
        },
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) setActionLog(data.actionLog);
    } catch (err) {
      console.error("Failed to delete entry", err);
    } finally {
      setDeleteIdx(null);
    }
  }, []);

  // ── Locked state ──────────────────────────────────────────────────────────
  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-slate-50 text-slate-400 rounded-[2rem] flex items-center justify-center text-4xl shadow-sm border border-slate-200">
          <i className="fa-solid fa-lock" />
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-3">Feature Locked</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            The <strong className={themeClasses.text}>Values Action Log</strong> unlocks after you complete <strong className={themeClasses.text}>Session 6</strong>. Keep Progressing through your Clinical 
            <strong className={themeClasses.text}> Recovery Path!</strong>.
          </p>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-16">

      {/* ── Hero ── */}
      <div className={`${themeClasses.primary} rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden`}>
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <i className="fa-solid fa-compass text-[10rem]" />
        </div>
        <div className="relative z-10">
          <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-2">Module 6 · Values Compass</p>
          <h2 className="text-3xl font-black mb-2 tracking-tight">Values Action Log</h2>
          <p className="text-white/70 font-medium italic text-sm">
            "Action is the antidote to despair." — Track your steps toward what matters most.
          </p>
        </div>
      </div>

      {/* ── Life Domains + Top Values side by side ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Selected Life Domains */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm space-y-5">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <i className={`fa-solid fa-map-pin ${themeClasses.text}`} />
            Your Life Domains
          </h3>
          {selectedDomains.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No domains recorded from session.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {selectedDomains.map((d) => (
                <div key={d.id} className={`${themeClasses.secondary} ${themeClasses.text} rounded-2xl p-4 flex items-center gap-3`}>
                  <i className={`fa-solid ${d.icon} text-lg`} />
                  <span className="font-black text-xs uppercase tracking-widest">{d.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Values (priority order) */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm space-y-5">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <i className={`fa-solid fa-ranking-star ${themeClasses.text}`} />
            Your Top Values · Priority Order
          </h3>
          {sortedValues.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No sorted values recorded from session.</p>
          ) : (
            <div className="space-y-2">
              {sortedValues.map((v, idx) => (
                <div key={v.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className={`w-7 h-7 ${themeClasses.primary} text-white rounded-full flex items-center justify-center font-black text-[10px] flex-shrink-0`}>
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-800 text-xs truncate">{v.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── All Rated Values Summary ── */}
      {Object.keys(ratings).length > 0 && (
        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm space-y-5">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <i className={`fa-solid fa-list-check ${themeClasses.text}`} />
            Full Values Assessment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* V — Very Important */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-[10px] font-black">V</span>
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Very Important</span>
              </div>
              {veryImportantValues.length === 0
                ? <p className="text-xs text-slate-400 italic">None</p>
                : veryImportantValues.map((v) => (
                    <div key={v.id} className="px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl">
                      <p className="text-xs font-bold text-emerald-800">{v.name}</p>
                    </div>
                  ))}
            </div>
            {/* Q — Quite Important */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 bg-amber-500 text-white rounded-lg flex items-center justify-center text-[10px] font-black">Q</span>
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Quite Important</span>
              </div>
              {VALUES_LIST.filter((v) => ratings[v.id] === "Q").length === 0
                ? <p className="text-xs text-slate-400 italic">None</p>
                : VALUES_LIST.filter((v) => ratings[v.id] === "Q").map((v) => (
                    <div key={v.id} className="px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                      <p className="text-xs font-bold text-amber-800">{v.name}</p>
                    </div>
                  ))}
            </div>
            {/* N — Not Important */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 bg-slate-400 text-white rounded-lg flex items-center justify-center text-[10px] font-black">N</span>
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Not Important</span>
              </div>
              {VALUES_LIST.filter((v) => ratings[v.id] === "N").length === 0
                ? <p className="text-xs text-slate-400 italic">None</p>
                : VALUES_LIST.filter((v) => ratings[v.id] === "N").map((v) => (
                    <div key={v.id} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                      <p className="text-xs font-bold text-slate-500">{v.name}</p>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Add New Entry Form ── */}
      <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <i className={`fa-solid fa-plus ${themeClasses.text}`} />
          Record a New Daily Step
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date</label>
            <input
              type="text"
              placeholder="DD/MM/YYYY"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              value={newEntry.date}
              onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Value</label>
            {veryImportantValues.length > 0 ? (
              <select
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                value={newEntry.value}
                onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
              >
                <option value="">— Select a value —</option>
                {veryImportantValues.map((v) => (
                  <option key={v.id} value={v.name}>{v.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="e.g. Authenticity"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={newEntry.value}
                onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
              />
            )}
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Action Taken</label>
            <input
              type="text"
              placeholder="e.g. Spoke honestly to my manager about my workload"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              value={newEntry.action}
              onChange={(e) => setNewEntry({ ...newEntry, action: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Step Size</label>
            <select
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
              value={newEntry.size}
              onChange={(e) => setNewEntry({ ...newEntry, size: e.target.value })}
            >
              <option>Small</option>
              <option>Medium</option>
              <option>Big</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Alignment Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setNewEntry({ ...newEntry, rating: String(n) })}
                  className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${
                    newEntry.rating === String(n) ? `${themeClasses.primary} text-white shadow-md` : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={!newEntry.value || !newEntry.action || isSubmitting}
          className={`w-full py-4 ${themeClasses.button} rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <i className="fa-solid fa-circle-notch animate-spin" /> Saving...
            </span>
          ) : (
            "Add to My Journey"
          )}
        </button>
      </div>

      {/* ── Action Log Table ── */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Action History</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase">{actionLog.length} Steps Logged</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Value</th>
                <th className="px-8 py-5">Action</th>
                <th className="px-8 py-5">Size</th>
                <th className="px-8 py-5">Alignment</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {actionLog.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400 italic text-sm">
                    No steps logged yet — start your journey above!
                  </td>
                </tr>
              )}
              {actionLog.map((log: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5 text-xs font-bold text-slate-500 whitespace-nowrap">{log.date || "—"}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 ${themeClasses.secondary} ${themeClasses.text} rounded-full text-[10px] font-black uppercase whitespace-nowrap`}>
                      {log.value}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-sm font-medium text-slate-700 max-w-[200px]">{log.action}</td>
                  <td className="px-8 py-5">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                      log.size === "Big"    ? "bg-rose-50 text-rose-600" :
                      log.size === "Medium" ? "bg-amber-50 text-amber-600" :
                                              "bg-slate-100 text-slate-500"
                    }`}>
                      {log.size || "—"}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, star) => (
                        <i key={star} className={`fa-solid fa-star text-[10px] ${star < Number(log.rating) ? "text-amber-400" : "text-slate-200"}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <button
                      onClick={() => handleDelete(i)}
                      disabled={deleteIdx === i}
                      className="text-slate-300 hover:text-rose-400 transition-colors disabled:opacity-50"
                      title="Remove entry"
                    >
                      <i className={`fa-solid ${deleteIdx === i ? "fa-circle-notch animate-spin" : "fa-xmark"}`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ValuesActionLog;