
import React, { useState } from 'react';

interface Plan {
  id: string;
  name: string;
  price: string;
  billingCycle: string;
  features: string[];
  activeTenants: number;
  status: 'Active' | 'Deprecated';
}

const INITIAL_PLANS: Plan[] = [
  { 
    id: 'p1', 
    name: 'Basic', 
    price: '$49', 
    billingCycle: 'per month', 
    features: ['Up to 10 clients', 'Basic ACT tools', 'Email support'],
    activeTenants: 45,
    status: 'Active'
  },
  { 
    id: 'p2', 
    name: 'Professional', 
    price: '$199', 
    billingCycle: 'per month', 
    features: ['Up to 100 clients', 'Full ACT toolset', 'Priority support', 'Basic analytics'],
    activeTenants: 128,
    status: 'Active'
  },
  { 
    id: 'p3', 
    name: 'Enterprise', 
    price: 'Custom', 
    billingCycle: 'annual', 
    features: ['Unlimited clients', 'Custom integrations', 'Dedicated account manager', 'Advanced analytics', 'SSO'],
    activeTenants: 12,
    status: 'Active'
  }
];

const SubscriptionManagement: React.FC = () => {
  const [plans] = useState<Plan[]>(INITIAL_PLANS);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Subscription Plans</h2>
          <p className="text-sm text-slate-500">Manage platform-wide pricing tiers and feature availability.</p>
        </div>
        <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
          <i className="fa-solid fa-plus mr-2"></i> Create New Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => (
          <div key={plan.id} className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
                plan.name === 'Enterprise' ? 'bg-purple-100 text-purple-600' : 
                plan.name === 'Professional' ? 'bg-indigo-100 text-indigo-600' : 
                'bg-slate-100 text-slate-600'
              }`}>
                <i className={`fa-solid ${
                  plan.name === 'Enterprise' ? 'fa-building-shield' : 
                  plan.name === 'Professional' ? 'fa-rocket' : 
                  'fa-seedling'
                }`}></i>
              </div>
              <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-emerald-100">
                {plan.status}
              </span>
            </div>
            
            <h3 className="text-xl font-black text-slate-800 mb-1">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-3xl font-black text-slate-900">{plan.price}</span>
              <span className="text-slate-400 text-xs font-medium">{plan.billingCycle}</span>
            </div>

            <div className="space-y-3 mb-8">
              {plan.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                  <i className="fa-solid fa-check text-emerald-500 text-xs"></i>
                  {feature}
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-slate-50 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Tenants</p>
                <p className="text-lg font-bold text-slate-700">{plan.activeTenants}</p>
              </div>
              <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                <i className="fa-solid fa-ellipsis-vertical"></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800">Recent Subscription Activity</h3>
        </div>
        <div className="p-8">
          <div className="space-y-6">
            {[
              { clinic: 'Mayo Clinic', action: 'Upgraded to Enterprise', date: '2 hours ago', amount: '+$12,000/yr' },
              { clinic: 'City Mental Health', action: 'Renewed Professional', date: '5 hours ago', amount: '+$199/mo' },
              { clinic: 'Local Outreach', action: 'New Subscription (Basic)', date: '1 day ago', amount: '+$49/mo' },
            ].map((activity, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                    <i className="fa-solid fa-receipt"></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{activity.clinic}</p>
                    <p className="text-xs text-slate-500">{activity.action} • {activity.date}</p>
                  </div>
                </div>
                <span className="text-sm font-black text-emerald-600">{activity.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SubscriptionManagement;