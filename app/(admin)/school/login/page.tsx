'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    setError('');
    
    const result = await signIn('demo', {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      setError('Invalid email or password');
    } else {
      router.push('/school/admin'); // Default redirect
    }
  };

  const demoAccount = async (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('1234');
    
    const result = await signIn('demo', {
      redirect: false,
      email: roleEmail,
      password: '1234',
    });

    if (result?.error) {
      setError('Invalid demo account');
    } else {
      router.push('/school/admin'); // Default redirect
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side: Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop" 
          alt="School campus" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-16 text-white">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-2xl mb-6 shadow-lg shadow-blue-500/30">C</div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">CitySchool</h1>
          <p className="text-lg text-slate-300 max-w-lg leading-relaxed">The all-in-one command center for modern education. Manage students, staff, academics, and your public website from one secure place.</p>
        </div>
      </div>

      {/* Right side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8 sm:p-12">
        <div className="max-w-md w-full">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Welcome back</h2>
            <p className="text-slate-500 font-medium">Sign in to your school management portal</p>
          </div>
        
        <form className="mt-8 space-y-5" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email-address" className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow text-slate-900"
              placeholder="principal@yourschool.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow text-slate-900"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg">{error}</p>}

          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
          >
            Sign in to Portal
          </button>
        </form>

        <div className="mt-10">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-slate-400 font-medium tracking-wide text-xs uppercase">
                Demo Accounts
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button onClick={() => demoAccount('principal@cityconnect.local')} className="w-full py-2.5 px-4 border border-slate-200 rounded-lg shadow-sm bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all">
              Admin
            </button>
            <button onClick={() => demoAccount('demo@cityconnect.local')} className="w-full py-2.5 px-4 border border-slate-200 rounded-lg shadow-sm bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all">
              Teacher
            </button>
            <button onClick={() => demoAccount('counselor@cityconnect.local')} className="w-full py-2.5 px-4 border border-slate-200 rounded-lg shadow-sm bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all">
              Counselor
            </button>
            <button onClick={() => demoAccount('registrar@cityconnect.local')} className="w-full py-2.5 px-4 border border-slate-200 rounded-lg shadow-sm bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all">
              Registrar
            </button>
            <button onClick={() => demoAccount('bursar@cityconnect.local')} className="w-full col-span-2 py-2.5 px-4 border border-slate-200 rounded-lg shadow-sm bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all">
              Finance
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
