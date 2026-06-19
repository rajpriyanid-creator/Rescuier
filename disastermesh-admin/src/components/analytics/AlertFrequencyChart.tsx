import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props { data: { type: string; count: number }[] }

export function AlertFrequencyChart({ data }: Props) {
  return (
    <div className="bg-disaster-panel border border-disaster-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white mb-4">Alerts by Type</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
          <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
          <YAxis type="category" dataKey="type" tick={{ fill: '#94a3b8', fontSize: 11 }} width={80} />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} itemStyle={{ color: '#fbbf24' }} />
          <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Alerts" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
