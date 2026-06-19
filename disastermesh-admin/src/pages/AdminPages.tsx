// ── SOS Page ─────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { AlertTriangle, User, MapPin, Clock, CheckCircle2, RefreshCw } from 'lucide-react';

export function SOSPage() {
  const [sos, setSos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchSOS = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/sos');
      setSos(res.data.sos || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchSOS(); }, []);

  const filtered = filter === 'all' ? sos : sos.filter((s) => s.status === filter);

  const updateStatus = async (id: string, action: 'claim' | 'resolve') => {
    try {
      await api.put(`/sos/${id}/${action}`);
      fetchSOS();
    } catch {}
  };

  return (
    <div className="p-4 h-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" /> SOS Command Centre
        </h1>
        <div className="flex gap-2 items-center">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-disaster-panel border border-disaster-border text-white text-sm rounded px-2 py-1"
          >
            {['all','sent','seen','assigned','on_scene','resolved','cancelled'].map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All' : s.replace('_', ' ')}</option>
            ))}
          </select>
          <button onClick={fetchSOS} className="text-slate-400 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Loading SOS requests…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-slate-500 py-12">No SOS requests found</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((item) => (
            <div key={item._id} className={`bg-disaster-panel border rounded-xl p-4 border-l-4 ${
              item.priority === 'critical' ? 'border-l-red-500' :
              item.priority === 'urgent' ? 'border-l-orange-500' : 'border-l-blue-500'
            } border-disaster-border`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white capitalize">{item.type}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      item.priority === 'critical' ? 'badge-critical' :
                      item.priority === 'urgent' ? 'badge-urgent' : 'badge-standard'
                    }`}>{item.priority}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 capitalize">
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-sm text-slate-300 mb-2">{item.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {item.userId?.name || 'Unknown'} · {item.userId?.disasterId}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                    {item.peopleCount > 1 && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {item.peopleCount} people
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {item.status === 'sent' && (
                    <button onClick={() => updateStatus(item._id, 'claim')}
                      className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded transition-colors">
                      Assign to Self
                    </button>
                  )}
                  {['assigned','on_scene'].includes(item.status) && (
                    <button onClick={() => updateStatus(item._id, 'resolve')}
                      className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded transition-colors flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Users Page ────────────────────────────────────────────────────────────────
export function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/users').then((r) => { setUsers(r.data.users); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const assignRole = async (userId: string, role: string) => {
    try {
      await api.put('/admin/user/role', { userId, role });
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, role } : u));
    } catch {}
  };

  const filtered = users.filter(
    (u) => u.name?.toLowerCase().includes(search.toLowerCase()) ||
           u.phone?.includes(search) ||
           u.disasterId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 h-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Users ({users.length})</h1>
        <input
          type="text" placeholder="Search name, phone, ID…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="bg-disaster-panel border border-disaster-border text-white text-sm rounded-lg px-3 py-1.5 w-56 placeholder-slate-500"
        />
      </div>
      {loading ? <div className="text-slate-400 text-center py-12">Loading…</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-disaster-border">
                {['Name','Phone','Disaster ID','Role','City','Actions'].map((h) => (
                  <th key={h} className="pb-2 pr-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-disaster-border/50">
              {filtered.map((u) => (
                <tr key={u._id} className="hover:bg-slate-800/50">
                  <td className="py-2 pr-4 text-white">{u.name}</td>
                  <td className="py-2 pr-4 text-slate-400">{u.phone}</td>
                  <td className="py-2 pr-4 text-slate-400 font-mono text-xs">{u.disasterId}</td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      u.role === 'admin' || u.role === 'superadmin' ? 'badge-critical' :
                      u.role === 'responder' ? 'badge-urgent' : 'badge-standard'
                    }`}>{u.role}</span>
                  </td>
                  <td className="py-2 pr-4 text-slate-400">{u.city}</td>
                  <td className="py-2">
                    <select
                      value={u.role}
                      onChange={(e) => assignRole(u._id, e.target.value)}
                      className="bg-slate-800 border border-disaster-border text-white text-xs rounded px-1.5 py-0.5"
                    >
                      {['user','volunteer','responder','admin'].map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Alerts Page ───────────────────────────────────────────────────────────────
export function AlertsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [severity, setSeverity] = useState('warning');
  const [type, setType] = useState('general');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    api.get('/alerts').then((r) => setAlerts(r.data.alerts || [])).catch(() => {});
  }, []);

  const sendAlert = async () => {
    if (!title || !message) return;
    setSending(true);
    try {
      await api.post('/admin/alert', { type, severity, title, message, instructions });
      setSent(true);
      setTitle(''); setMessage(''); setInstructions('');
      const res = await api.get('/alerts');
      setAlerts(res.data.alerts || []);
      setTimeout(() => setSent(false), 3000);
    } catch {} finally { setSending(false); }
  };

  return (
    <div className="p-4 h-full overflow-auto">
      <h1 className="text-xl font-bold text-white mb-4">Send Alert</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose */}
        <div className="bg-disaster-panel border border-disaster-border rounded-xl p-4">
          <h2 className="font-semibold text-white mb-4">Compose Alert</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)}
                  className="w-full bg-slate-800 border border-disaster-border text-white text-sm rounded-lg px-3 py-2">
                  {['general','evacuation','shelter','water','medical','seismic','all_clear'].map((t) => (
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Severity</label>
                <select value={severity} onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-slate-800 border border-disaster-border text-white text-sm rounded-lg px-3 py-2">
                  {['info','warning','critical'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Alert title…"
                className="w-full bg-slate-800 border border-disaster-border text-white text-sm rounded-lg px-3 py-2 placeholder-slate-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Message *</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Alert message…" rows={3}
                className="w-full bg-slate-800 border border-disaster-border text-white text-sm rounded-lg px-3 py-2 placeholder-slate-500 resize-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Instructions (optional)</label>
              <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)}
                placeholder="Safety instructions…" rows={2}
                className="w-full bg-slate-800 border border-disaster-border text-white text-sm rounded-lg px-3 py-2 placeholder-slate-500 resize-none" />
            </div>
            <button onClick={sendAlert} disabled={sending || !title || !message}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors">
              {sending ? 'Sending…' : sent ? '✓ Sent!' : 'Send to All City Users'}
            </button>
          </div>
        </div>

        {/* Alert History */}
        <div className="bg-disaster-panel border border-disaster-border rounded-xl p-4">
          <h2 className="font-semibold text-white mb-3">Recent Alerts</h2>
          <div className="space-y-2 overflow-y-auto max-h-96">
            {alerts.length === 0 ? <p className="text-slate-500 text-sm">No alerts sent yet</p> : alerts.map((a) => (
              <div key={a._id} className={`border rounded-lg p-3 ${
                a.severity === 'critical' ? 'border-red-700 bg-red-900/20' :
                a.severity === 'warning' ? 'border-orange-700 bg-orange-900/20' : 'border-blue-700 bg-blue-900/20'
              }`}>
                <div className="flex justify-between items-start">
                  <p className="text-sm font-semibold text-white">{a.title}</p>
                  <span className="text-xs text-slate-500">{new Date(a.sentAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{a.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Analytics Page ────────────────────────────────────────────────────────────
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/analytics').then((r) => { setStats(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-400 text-center py-16">Loading analytics…</div>;
  if (!stats) return <div className="text-slate-500 text-center py-16">No data available</div>;

  const sosData = [
    { name: 'Total', value: stats.totalSOS },
    { name: 'Resolved', value: stats.resolvedSOS },
    { name: 'Pending', value: stats.totalSOS - stats.resolvedSOS },
  ];

  const pieData = [
    { name: 'Active Users', value: stats.activeUsers },
    { name: 'Inactive', value: stats.totalUsers - stats.activeUsers },
  ];

  const COLORS = ['#22c55e', '#64748b'];

  return (
    <div className="p-4 h-full overflow-auto">
      <h1 className="text-xl font-bold text-white mb-6">Analytics</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SOS Bar Chart */}
        <div className="bg-disaster-panel border border-disaster-border rounded-xl p-4">
          <h2 className="font-semibold text-white mb-4">SOS Summary</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sosData}>
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9' }} />
              <Bar dataKey="value" fill="#dc2626" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* User Activity Pie */}
        <div className="bg-disaster-panel border border-disaster-border rounded-xl p-4">
          <h2 className="font-semibold text-white mb-4">User Activity (30 min)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} label>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend formatter={(v) => <span className="text-slate-300 text-xs">{v}</span>} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stat cards */}
        {[
          { label: 'Total Registered Users', value: stats.totalUsers, color: 'text-blue-400' },
          { label: 'Active in Last 30 min', value: stats.activeUsers, color: 'text-green-400' },
          { label: 'Missing Persons', value: stats.missing, color: 'text-yellow-400' },
          { label: 'Active Volunteers', value: stats.volunteers, color: 'text-purple-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-disaster-panel border border-disaster-border rounded-xl p-4 flex items-center gap-4">
            <div className={`text-4xl font-bold ${color}`}>{value}</div>
            <div className="text-sm text-slate-400">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Settings Page ─────────────────────────────────────────────────────────────
export function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    seismicMinDevices: 10,
    seismicRatioThreshold: 3.5,
    sosAutoEscalateMinutes: 15,
    locationUpdateIntervalSeconds: 30,
    chatRateLimit: 5,
  });

  const save = async () => {
    try {
      await api.put('/admin/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  return (
    <div className="p-4 max-w-xl">
      <h1 className="text-xl font-bold text-white mb-6">Admin Settings</h1>
      <div className="bg-disaster-panel border border-disaster-border rounded-xl p-6 space-y-5">
        {[
          { key: 'seismicMinDevices', label: 'Min Devices for Seismic Confirmation', min: 3, max: 50 },
          { key: 'seismicRatioThreshold', label: 'STA/LTA Ratio Threshold', min: 1.0, max: 10.0, step: 0.1 },
          { key: 'sosAutoEscalateMinutes', label: 'SOS Auto-Escalate (minutes)', min: 5, max: 60 },
          { key: 'locationUpdateIntervalSeconds', label: 'Location Update Interval (seconds)', min: 10, max: 120 },
          { key: 'chatRateLimit', label: 'Chat Rate Limit (messages/minute)', min: 1, max: 20 },
        ].map(({ key, label, min, max, step }) => (
          <div key={key}>
            <label className="text-xs text-slate-400 mb-1 block">{label}</label>
            <input
              type="number" min={min} max={max} step={step || 1}
              value={(settings as any)[key]}
              onChange={(e) => setSettings((s) => ({ ...s, [key]: parseFloat(e.target.value) }))}
              className="w-full bg-slate-800 border border-disaster-border text-white text-sm rounded-lg px-3 py-2"
            />
          </div>
        ))}
        <button onClick={save}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg transition-colors">
          {saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
