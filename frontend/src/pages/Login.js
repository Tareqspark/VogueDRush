import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { EyeIcon, EyeSlashIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const DEMO_ACCOUNTS = [
  { label: 'Admin',   role: 'admin',   username: 'admin',   password: 'admin123',   color: 'from-sky-500 to-sky-600' },
  { label: 'Waiter',  role: 'waiter',  username: 'waiter',  password: 'waiter123',  color: 'from-amber-500 to-amber-600' },
  { label: 'Kitchen', role: 'kitchen', username: 'kitchen', password: 'kitchen123', color: 'from-emerald-500 to-emerald-600' },
];

const Login = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors }, setError } = useForm();

  useEffect(() => {
    if (localStorage.getItem('accessToken')) navigate('/');
  }, [navigate]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const result = await login(data);
      if (result.success) navigate('/');
      else setError('root', { message: result.error });
    } catch {
      setError('root', { message: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (acc) => {
    setValue('username', acc.username, { shouldValidate: true });
    setValue('password', acc.password, { shouldValidate: true });
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 40%, #FEF9C3 100%)' }}>

      {/* ── Left panel: decorative ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-16 relative overflow-hidden">
        {/* Background circles */}
        <div className="absolute top-20 left-20 h-64 w-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #0EA5E9, transparent)' }} />
        <div className="absolute bottom-32 right-12 h-48 w-48 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #EAB308, transparent)' }} />
        <div className="absolute top-1/2 left-1/3 h-32 w-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #0284C7, transparent)' }} />

        <div className="relative z-10 text-center max-w-sm">
          {/* Logo */}
          <div className="h-24 w-24 rounded-3xl flex items-center justify-center text-white font-black text-3xl mx-auto mb-8 shadow-glow-sky"
            style={{ background: 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 50%, #EAB308 100%)' }}>
            VD
          </div>
          <h1 className="text-4xl font-black text-slate-800 leading-tight">
            Vogue<br />
            <span style={{ background: 'linear-gradient(135deg, #0284C7, #EAB308)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              D Rush
            </span>
          </h1>
          <p className="mt-4 text-lg text-slate-500 font-medium">Restaurant Management System</p>

          {/* Feature pills */}
          <div className="mt-10 flex flex-wrap gap-2 justify-center">
            {['Live Orders', 'Kitchen Display', 'Table Management', 'Analytics', 'Reservations'].map(f => (
              <span key={f} className="px-3 py-1.5 bg-white/70 backdrop-blur-sm border border-sky-200 rounded-full text-xs font-semibold text-sky-700">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel: login form ── */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-in">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-white font-black text-xl mx-auto mb-3"
              style={{ background: 'linear-gradient(135deg, #0284C7, #EAB308)' }}>
              VD
            </div>
            <h1 className="text-2xl font-black text-slate-800">Vogue D Rush</h1>
          </div>

          {/* Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-white/60"
            style={{ boxShadow: '0 20px 60px rgb(2 132 199 / 0.12)' }}>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Welcome back 👋</h2>
              <p className="text-slate-500 text-sm mt-1">Sign in to your account to continue</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              {/* Username */}
              <div>
                <label className="label">Username or Email</label>
                <input
                  type="text"
                  autoComplete="username"
                  className={`input ${errors.username ? 'border-rose-400 ring-2 ring-rose-200' : ''}`}
                  placeholder="Enter your username"
                  {...register('username', {
                    required: 'Username is required',
                    minLength: { value: 3, message: 'Min 3 characters' },
                  })}
                />
                {errors.username && <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.username.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={`input pr-11 ${errors.password ? 'border-rose-400 ring-2 ring-rose-200' : ''}`}
                    placeholder="Enter your password"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 6, message: 'Min 6 characters' },
                    })}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-sky-500 transition-colors">
                    {showPassword ? <EyeSlashIcon className="h-4.5 w-4.5" style={{height:'1.1rem',width:'1.1rem'}} /> : <EyeIcon className="h-4.5 w-4.5" style={{height:'1.1rem',width:'1.1rem'}} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.password.message}</p>}
              </div>

              {/* Root error */}
              {errors.root && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3">
                  <span className="text-rose-500 text-lg">⚠️</span>
                  <p className="text-sm text-rose-600 font-medium">{errors.root.message}</p>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={isLoading || loading}
                className="btn btn-primary w-full btn-lg mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
                {isLoading || loading ? (
                  <><LoadingSpinner size="sm" /><span>Signing in...</span></>
                ) : (
                  <><SparklesIcon className="h-4 w-4" /><span>Sign In</span></>
                )}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-7 pt-6 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-3">
                Quick Demo Access
              </p>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map(acc => (
                  <button key={acc.role} onClick={() => fillDemo(acc)}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border border-slate-200 bg-slate-50 hover:border-sky-200 hover:bg-sky-50 transition-all group">
                    <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${acc.color} text-white text-xs font-bold flex items-center justify-center`}>
                      {acc.label[0]}
                    </div>
                    <span className="text-xs font-semibold text-slate-600 group-hover:text-sky-700">{acc.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-center text-xs text-slate-400 mt-3">
                Click a role above to auto-fill credentials
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            © 2025 Tarequl Islam Mukul · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

