import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, IdCard, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [disasterId, setDisasterId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!disasterId.trim()) { setError('Enter your Disaster ID'); return; }
    if (!password.trim()) { setError('Enter your password'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/login', {
        disasterId: disasterId.trim(),
        password: password.trim(),
      });
      const { accessToken, refreshToken, user } = res.data;
      if (!['admin', 'superadmin'].includes(user.role)) {
        setError('Admin access only. Your account does not have admin privileges.');
        return;
      }
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      navigate('/');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Login failed. Check your ID and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-disaster-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-red-900/50">
            <Shield className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">DisasterMesh</h1>
          <p className="text-sm text-slate-400 mt-1">Admin Control Centre</p>
        </div>

        {/* Card */}
        <div className="bg-disaster-panel border border-disaster-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Sign in</h2>
          <p className="text-sm text-slate-400 mb-5">Enter your Disaster ID and password</p>

          {/* Disaster ID */}
          <label className="block text-xs text-slate-400 mb-1">Disaster ID</label>
          <div className="flex items-center gap-2 bg-slate-800 border border-disaster-border rounded-lg px-3 py-2.5 mb-4">
            <IdCard className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="DM-MUM-2026-XXXX"
              value={disasterId}
              onChange={(e) => setDisasterId(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm tracking-wider"
            />
          </div>

          {/* Password */}
          <label className="block text-xs text-slate-400 mb-1">Password</label>
          <div className="flex items-center gap-2 bg-slate-800 border border-disaster-border rounded-lg px-3 py-2.5 mb-4">
            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm"
            />
            <button
              onClick={() => setShowPassword(v => !v)}
              className="text-slate-400 hover:text-white transition-colors"
              type="button"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          HACKHAZARDS '26 · DisasterMesh v1.0
        </p>
      </div>
    </div>
  );
}
