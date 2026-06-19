import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props { data: { date: string; count: number }[] }

export function SOSTrendsChart({ data }: Props) {
  return (
    <div className="bg-disaster-panel border border-disaster-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white mb-4">SOS Requests (Last 7 Days)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="sosGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#dc2626" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#fff' }} itemStyle={{ color: '#f87171' }} />
          <Area type="monotone" dataKey="count" stroke="#dc2626" strokeWidth={2} fill="url(#sosGrad)" name="SOS" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
