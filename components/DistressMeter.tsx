
import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const DistressMeter: React.FC = () => {
  const { themeClasses, currentUser: user } = useApp();

  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const sessionNum = i + 1;
      const history = user.sessionHistory?.find(h => h.sessionNumber === sessionNum);
      return {
        name: `S${sessionNum}`,
        before: history?.distressBefore || 0,
        after: history?.distressAfter || 0,
        completed: !!history
      };
    });
  }, [user.sessionHistory]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl text-xs">
          <p className="font-black text-slate-800 mb-1">Session {label.replace('S', '')}</p>
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-rose-500 font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Before: {payload[0].value}
            </p>
            <p className="flex items-center gap-2 text-emerald-500 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              After: {payload[1].value}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm animate-in fade-in duration-500 flex flex-col h-full">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center text-xl shadow-inner">
          <i className="fa-solid fa-bolt-lightning"></i>
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Distress History</h3>
          <p className="text-sm text-slate-500 font-medium">
            Your progress across 12 sessions
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-[300px]">
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              barGap={2}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                dy={10}
              />
              <YAxis 
                domain={[0, 10]} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                ticks={[0, 2, 4, 6, 8, 10]}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle"
                wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '20px' }}
              />
              <Bar 
                name="Before" 
                dataKey="before" 
                fill="#f43f5e" 
                radius={[4, 4, 0, 0]} 
                barSize={8}
              />
              <Bar 
                name="After" 
                dataKey="after" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]} 
                barSize={8}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">
            <i className="fa-solid fa-circle-info mr-2 text-rose-400"></i>
            Tracking helps you see patterns in your recovery
          </p>
        </div>
      </div>
    </div>
  );
};

export default DistressMeter;
