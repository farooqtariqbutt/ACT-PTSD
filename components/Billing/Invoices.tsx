
import React from 'react';

const Invoices: React.FC = () => {
  const mockInvoices = [
    { id: 'INV-2023-010', date: 'Oct 1, 2023', amount: '$249.00', status: 'Paid' },
    { id: 'INV-2023-009', date: 'Sep 1, 2023', amount: '$249.00', status: 'Paid' },
    { id: 'INV-2023-008', date: 'Aug 1, 2023', amount: '$249.00', status: 'Paid' },
  ];

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-slate-800">Billing History</h3>
        <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Download All</button>
      </div>
      <div className="space-y-4">
        {mockInvoices.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-100 transition-all">
            <div>
              <p className="text-sm font-bold text-slate-800">{inv.id}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{inv.date}</p>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-sm font-bold text-slate-700">{inv.amount}</span>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase">{inv.status}</span>
              <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                <i className="fa-solid fa-download"></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Invoices;
