import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Map, Users, AlertTriangle, Bell, BarChart2,
  Settings, LogOut, Radio, Shield
} from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';

const NAV = [
  { to: '/', icon: Map, label: 'Live Map' },
  { to: '/sos', icon: AlertTriangle, label: 'SOS Queue' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const navigate = useNavigate();
  const { activeEvent, sosQueue } = useAdminStore();
  const criticalSOS = sosQueue.filter((s) => s.status === 'sent' && s.priority === 'critical').length;

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-disaster-dark overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 flex flex-col items-center py-4 bg-disaster-panel border-r border-disaster-border gap-1">
        {/* Logo */}
        <div className="mb-4 p-2">
          <Shield className="w-8 h-8 text-red-500" />
        </div>

        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={label}
            className={({ isActive }) =>
              `relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                isActive
                  ? 'bg-red-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label === 'SOS Queue' && criticalSOS > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                {criticalSOS}
              </span>
            )}
          </NavLink>
        ))}

        <div className="mt-auto">
          <button
            onClick={logout}
            title="Logout"
            className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 flex items-center justify-between px-4 bg-disaster-panel border-b border-disaster-border">
          <div className="flex items-center gap-3">
            <Radio className="w-4 h-4 text-green-400 animate-pulse" />
            <span className="text-sm font-semibold text-slate-200">DisasterMesh Admin</span>
            {activeEvent && (
              <span className="badge-active text-xs px-2 py-0.5 rounded-full">
                ⚠️ {activeEvent.type.toUpperCase()} ACTIVE — {activeEvent.city}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400">
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
