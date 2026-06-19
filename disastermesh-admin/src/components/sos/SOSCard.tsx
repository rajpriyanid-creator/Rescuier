import { AlertTriangle, Clock, MapPin, Users, CheckCircle2 } from 'lucide-react';

interface SOSItem {
  _id: string; sosId: string; type: string; priority: string; status: string;
  latitude: number; longitude: number; description?: string; peopleCount?: number;
  userId?: { name: string; disasterId: string }; createdAt: string;
}

const PRIORITY_STYLE: Record<string, string> = {
  critical: 'border-red-500 bg-red-500/10',
  urgent: 'border-amber-500 bg-amber-500/10',
  standard: 'border-blue-500 bg-blue-500/10',
};
const PRIORITY_TEXT: Record<string, string> = { critical: 'text-red-400', urgent: 'text-amber-400', standard: 'text-blue-400' };

interface Props { sos: SOSItem; onClaim: () => void; onResolve: () => void; }

export function SOSCard({ sos, onClaim, onResolve }: Props) {
  const elapsed = Math.round((Date.now() - new Date(sos.createdAt).getTime()) / 60000);
  return (
    <div className={`border rounded-xl p-4 ${PRIORITY_STYLE[sos.priority] ?? 'border-slate-700 bg-slate-800/50'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${PRIORITY_TEXT[sos.priority] ?? 'text-slate-400'}`} />
          <span className="text-white font-bold text-sm">{sos.type.replace(/_/g, ' ').toUpperCase()}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_TEXT[sos.priority]} border-current`}>{sos.priority}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${sos.status === 'resolved' ? 'bg-green-900 text-green-400' : 'bg-slate-800 text-slate-400'}`}>{sos.status}</span>
      </div>
      {sos.description && <p className="text-slate-300 text-sm mb-3 line-clamp-2">{sos.description}</p>}
      <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-3">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{elapsed}m ago</span>
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{sos.latitude.toFixed(4)}, {sos.longitude.toFixed(4)}</span>
        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{sos.peopleCount ?? 1} person(s)</span>
        {sos.userId && <span>{sos.userId.name} · {sos.userId.disasterId}</span>}
      </div>
      {sos.status !== 'resolved' && (
        <div className="flex gap-2">
          {(sos.status === 'sent' || sos.status === 'seen') && (
            <button onClick={onClaim} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors">Claim</button>
          )}
          <button onClick={onResolve} className="flex-1 bg-green-700 hover:bg-green-800 text-white text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Resolve
          </button>
        </div>
      )}
    </div>
  );
}
