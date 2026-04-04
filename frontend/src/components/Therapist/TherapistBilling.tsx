
import React from 'react';
import Invoices from '../Billing/Invoices';

const TherapistBilling: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Practice Management</h2>
        <p className="text-sm text-slate-500">Manage your solo practitioner license and data isolation settings.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
             <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">Active Plan</span>
             <h3 className="text-2xl font-black text-slate-800 mt-4">Professional Solo</h3>
             <p className="text-slate-500 text-sm mt-2">Billed monthly at <span className="font-bold">$89.00</span></p>
             <ul className="mt-6 space-y-3">
                {['Unlimited Clients', 'Full HIPAA Compliance', 'Video Sessions Included', 'AI Defusion Lab'].map(feature => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <i className="fa-solid fa-circle-check text-emerald-500"></i>
                    {feature}
                  </li>
                ))}
             </ul>
          </div>
          <button className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors">
            Manage Subscription
          </button>
        </div>

        <div className="space-y-6">
           <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
              <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-125 transition-transform duration-700">
                <i className="fa-solid fa-shield-halved text-9xl"></i>
              </div>
              <h4 className="font-bold text-lg mb-2">Clinical Isolation</h4>
              <p className="text-indigo-100 text-sm leading-relaxed mb-6">Your practice data is hosted in a dedicated multi-tenant vault. Patient records are encrypted at rest and in transit.</p>
              <div className="flex items-center gap-2 text-xs font-bold bg-white/10 px-3 py-2 rounded-lg border border-white/10 w-fit">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                HIPAA & SOC2 Compliant
              </div>
           </div>

           <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h4 className="font-bold text-slate-800 mb-4">Upcoming Invoice</h4>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Renewal Date</p>
                    <p className="text-sm font-bold text-slate-800">Nov 12, 2023</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Amount Due</p>
                    <p className="text-sm font-bold text-indigo-600">$89.00</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
      
      <Invoices />
    </div>
  );
};

export default TherapistBilling;
