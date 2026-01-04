import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartPoint } from '../types';

interface ResourceChartProps {
  data: ChartPoint[];
  color: string;
  dataKey: string;
  title: string;
}

export const ResourceChart: React.FC<ResourceChartProps> = ({ data, color, dataKey, title }) => {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex flex-col h-48 backdrop-blur-sm">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
        {title}
      </h3>
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis 
              dataKey="time" 
              hide={true} 
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={10} 
              tickFormatter={(val) => `${val}`}
              domain={[0, 'auto']}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
              itemStyle={{ color: color }}
              labelStyle={{ display: 'none' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fillOpacity={1}
              fill={`url(#gradient-${dataKey})`}
              isAnimationActive={false} // Performance optimization
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
