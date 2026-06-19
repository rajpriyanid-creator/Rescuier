import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = { safe: '#22c55e', need_help: '#dc2626', evacuating: '#f59e0b', shelter: '#3b82f6', unknown: '#64748b' };

interface Props { data: { status: string; count: number }[] }

export function UserStatusChart({ data }: Props) {
  const mapped = data.map((d) => ({ name: d.status.replace('_', ' '), value: d.count, color: COLORS[d.status as keyof typeof COLORS] ?? '#64748b' }));
  return (
    <div className="bg-disaster-panel border border-disaster-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white mb-4">User Status Distribution</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={mapped} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
            {mapped.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} itemStyle={{ color: '#fff' }} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
