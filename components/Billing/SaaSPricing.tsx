
import React from 'react';
import { SubscriptionPlan } from '../../types';

interface PlanDetails {
  id: SubscriptionPlan;
  name: string;
  price: string;
  period: string;
  features: string[];
  recommended?: boolean;
  limit: string;
}

const PLANS: PlanDetails[] = [
  {
    id: 'Basic',
    name: 'Solo Practitioner',
    price: '$89',
    period: 'per month',
    limit: 'Individual Therapist',
    features: ['Up to 50 Clients', 'HIPAA Compliance', 'Standard ACT Tools', 'Email Support']
  },
  {
    id: 'Professional',
    name: 'Clinic Pro',
    price: '$249',
    period: 'per month',
    limit: 'Up to 5 Therapists',
    recommended: true,
    features: ['Unlimited Clients', 'Advanced Analytics', 'Branding Customization', 'EHR API Integration', 'Priority Support']
  },
  {
    id: 'Enterprise',
    name: 'Health System',
    price: 'Custom',
    period: 'annually',
    limit: 'Unlimited Staff',
    features: ['Multi-facility Management', 'SSO & Advanced Security', 'Custom Feature Rollouts', 'Dedicated Account Manager', 'On-site Training']
  }
];

const SaaSPricing: React.FC<{ currentPlan?: SubscriptionPlan }> = ({ currentPlan = 'Basic' }) => {
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Flexible Plans for Every Practice</h2>
        <p className="text-slate-500 max-w-2xl mx-auto italic">Scale your clinical impact with tools designed for Acceptance and Commitment Therapy.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {PLANS.map((plan) => (
          <div 
            key={plan.id} 
            className={`relative p-8 rounded-[2.5rem] border-2 transition-all flex flex-col ${
              plan.recommended ? 'bg-white border-indigo-600 shadow-2xl scale-105 z-10' : 'bg-slate-50 border-slate-100'
            }`}
          >
            {plan.recommended && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                Most Popular
              </div>
            )}
            
            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-800">{plan.name}</h3>
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-1">{plan.limit}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-800">{plan.price}</span>
                <span className="text-sm text-slate-400 font-medium">/{plan.period}</span>
              </div>
            </div>

            <ul className="space-y-4 mb-10 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-slate-600">
                  <i className="fa-solid fa-circle-check text-emerald-500 text-xs"></i>
                  {feature}
                </li>
              ))}
            </ul>

            <button className={`w-full py-4 rounded-2xl font-bold transition-all ${
              plan.id === currentPlan 
                ? 'bg-slate-100 text-slate-400 cursor-default' 
                : plan.recommended 
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700' 
                  : 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-50'
            }`}>
              {plan.id === currentPlan ? 'Current Plan' : plan.id === 'Enterprise' ? 'Contact Sales' : 'Upgrade Now'}
            </button>
          </div>
        ))}
      </div>
      
      <div className="bg-slate-900 rounded-3xl p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 max-w-6xl mx-auto">
        <div className="space-y-2 text-center md:text-left">
          <h3 className="text-xl font-bold">Annual Savings</h3>
          <p className="text-slate-400 text-sm">Switch to annual billing and save 20% across all clinical plans.</p>
        </div>
        <div className="flex bg-white/10 p-1.5 rounded-2xl">
          <button className="px-6 py-2 rounded-xl text-sm font-bold bg-white text-slate-900 shadow-sm">Monthly</button>
          <button className="px-6 py-2 rounded-xl text-sm font-bold text-slate-300">Annually</button>
        </div>
      </div>
    </div>
  );
};

export default SaaSPricing;
