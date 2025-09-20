import React, { useState } from 'react';
import { Role, AooTeam } from '../types';
import type { User } from '../types';

interface LoginProps {
  onLogin: (governorId: string, password: string) => Promise<boolean>;
  onRegister: (user: Omit<User, 'passwordHash'>, password: string) => Promise<boolean>;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onRegister }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [governorId, setGovernorId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.FIELD);
  const [aooTeam, setAooTeam] = useState<AooTeam>(AooTeam.NONE);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthAction = async () => {
    setError('');
    setIsLoading(true);

    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        if (!governorId || !password) {
          throw new Error('Governor ID and password cannot be empty.');
        }
        await onRegister({ governorId, role, aooTeam }, password);
      } else {
        await onLogin(governorId, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const inputClasses = "w-full bg-gray-700 border border-gray-600 p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-highlight focus:border-highlight";
  const labelClasses = "block text-gray-400 text-sm font-bold mb-2";

  const renderRegisterFields = () => (
    <>
      <div className="mb-4">
        <label className={labelClasses}>Confirm Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClasses}
          disabled={isLoading}
        />
      </div>
      <div className="mb-4">
        <label className={labelClasses}>Primary Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputClasses} disabled={isLoading}>
          {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="mb-6">
        <label className={labelClasses}>AOO Team</label>
        <select value={aooTeam} onChange={(e) => setAooTeam(e.target.value as AooTeam)} className={inputClasses} disabled={isLoading}>
          {Object.values(AooTeam).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary">
      <div className="w-full max-w-md bg-text-primary p-8 rounded-2xl shadow-2xl">
        <h1 className="text-3xl font-bold text-center text-highlight mb-2">{isRegister ? 'Create Account' : 'Welcome Back'}</h1>
        <p className="text-center text-accent mb-8">{isRegister ? 'Join your team' : 'Sign in to continue'}</p>
        
        {error && <p className="bg-red-500/20 text-red-300 p-3 rounded-lg mb-4 text-center">{error}</p>}
        
        <form onSubmit={(e) => { e.preventDefault(); handleAuthAction(); }}>
          <div className="mb-4">
            <label className={labelClasses}>Governor ID</label>
            <input
              type="text"
              value={governorId}
              onChange={(e) => setGovernorId(e.target.value)}
              className={inputClasses}
              disabled={isLoading}
            />
          </div>
          <div className="mb-4">
            <label className={labelClasses}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClasses}
              disabled={isLoading}
            />
          </div>
          {isRegister && renderRegisterFields()}
          <button type="submit" className="w-full bg-highlight text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-80 transition-all duration-300 disabled:opacity-50 disabled:cursor-wait" disabled={isLoading}>
            {isLoading ? 'Processing...' : (isRegister ? 'Register' : 'Login')}
          </button>
        </form>
        
        <p className="text-center text-gray-400 mt-6">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}
          <button onClick={() => { setIsRegister(!isRegister); setError(''); }} className="text-highlight font-bold ml-2 hover:underline" disabled={isLoading}>
            {isRegister ? 'Login' : 'Register'}
          </button>
        </p>
      </div>
    </div>
  );
};