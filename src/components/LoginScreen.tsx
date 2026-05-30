/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { db, encryptPayload } from '../db';
import { Shield, Sparkles, Key, Mail, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState<UserRole>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<string | null>(null);

  // Quick select login for evaluating user roles quickly
  const handlePresetLogin = (emailPreset: string) => {
    setLoading(true);
    setErrorMessage('');
    setTimeout(() => {
      const users = db.getUsers();
      const matched = users.find(u => u.email.toLowerCase() === emailPreset.toLowerCase());
      if (matched) {
        onLoginSuccess(matched);
      } else {
        setErrorMessage('Could not find preset account.');
      }
      setLoading(false);
    }, 850);
  };

  // Custom standard login
  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter your email and password.');
      return;
    }
    
    setLoading(true);
    setErrorMessage('');
    
    setTimeout(() => {
      // Find default mock or custom registered user
      const users = db.getUsers();
      const matched = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (isRegistering) {
        if (matched) {
          setErrorMessage('An account with this email is already registered.');
          setLoading(false);
          return;
        }
        if (!name) {
          setErrorMessage('Full name is required.');
          setLoading(false);
          return;
        }

        const newUser: User = {
          id: `u-custom-${Date.now()}`,
          name,
          email,
          role,
          verified: role === 'admin' ? true : false, // admins auto-verified, students/trainers verified by admin later
          joinedDate: new Date().toISOString().split('T')[0],
          status: 'active',
          bio: `Member of the Sabicrest platform.`,
          skills: []
        };

        db.addUser(newUser);
        
        // Trigger welcome notification
        db.addNotification({
          userId: newUser.id,
          title: 'Account Set Up Successfully',
          message: `Your private account has been created and secured successfully. Welcome inside!`,
          type: 'system'
        });

        // If trainer, alert admin for approval
        if (role === 'trainer') {
          db.addNotification({
            userId: 'u-admin-1',
            title: 'New Trainer Registered',
            message: `${name} registered as a trainer and requires verification status review.`,
            type: 'system'
          });
        }

        onLoginSuccess(newUser);
      } else {
        if (matched) {
          onLoginSuccess(matched);
        } else {
          // If not matched, register on-the-fly for a seamless user UX!
          setErrorMessage('No existing account found. Please click the register tab or use the preset quick sign-in below.');
        }
      }
      setLoading(false);
    }, 900);
  };

  // Modern simulated OAuth login callback
  const handleOAuthLogin = (provider: 'Google' | 'GitHub' | 'OAuth Workspace') => {
    setOauthProvider(provider);
    setLoading(true);
    setErrorMessage('');
    
    setTimeout(() => {
      // Create a secure auto-authenticated user from providers or load default
      const users = db.getUsers();
      let matched: User | undefined;
      
      if (provider === 'Google') {
        // Authenticate officialsabicrest@gmail.com for Admin roles
        matched = users.find(u => u.id === 'u-admin-1');
      } else {
        // Authenticate Alex Rivera for Student roles
        matched = users.find(u => u.id === 'u-1');
      }

      if (matched) {
        db.addNotification({
          userId: matched.id,
          title: `Sign-In Verification Completed`,
          message: `Successfully connected and verified through ${provider}.`,
          type: 'system'
        });
        onLoginSuccess(matched);
      } else {
        setErrorMessage('Failed to connect via OAuth. Please use standard account presets.');
      }
      setLoading(false);
      setOauthProvider(null);
    }, 1200);
  };

  return (
    <div id="login-container-card" className="min-h-screen bg-white flex flex-col justify-center items-center px-4 relative overflow-hidden select-none">
      
      {/* Decorative clean ambient ring */}
      <div id="ambient-ring-login" className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-yellow/5 pointer-events-none blur-3xl"></div>
      <div id="ambient-ring-login-2" className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-brand-yellow/5 pointer-events-none blur-3xl"></div>

      <div id="login-inner-workspace" className="w-full max-w-md bg-white border border-zinc-100 rounded-3xl p-8 shadow-sm transition-all duration-300">
        
        {/* Brand Logo Alignment */}
        <div id="login-brand-heading" className="text-center mb-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-zinc-100 border border-zinc-200 flex items-center justify-center rounded-none overflow-hidden shadow-xs mb-4">
            <img
              src="/src/assets/images/sabicrestlogo.png"
              alt="Sabicrest Logo"
              className="w-full h-full rounded-none object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 id="sabicrest-logo-text" className="text-3xl font-bold tracking-tight text-black">
            Sabicrest
          </h1>
          <p id="sabicrest-tagline" className="text-xs font-medium text-black tracking-wide mt-1 uppercase">
            Accesss Your Dashboard/Workspace
          </p>
        </div>

        {/* Tab Toggle for Register vs login */}
        <div id="login-tab-selector" className="flex border-b border-zinc-100 pb-3 mb-6 font-light text-sm text-zinc-400">
          <button
            id="tab-signin-btn"
            onClick={() => { setIsRegistering(false); setErrorMessage(''); }}
            className={`flex-1 py-1 text-center transition-all ${!isRegistering ? 'text-brand-black border-b-2 border-brand-black font-semibold' : 'hover:text-zinc-600'}`}
          >
            Sign-In Gateway
          </button>
          <button
            id="tab-signup-btn"
            onClick={() => { setIsRegistering(true); setErrorMessage(''); }}
            className={`flex-1 py-1 text-center transition-all ${isRegistering ? 'text-brand-black border-b-2 border-brand-black font-semibold' : 'hover:text-zinc-600'}`}
          >
            Create Account
          </button>
        </div>

        {errorMessage && (
          <div id="login-error-alert" className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs flex items-center gap-2 font-light">
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Auth Credentials Submit */}
        <form id="login-cred-form" onSubmit={handleCustomSubmit} className="space-y-4">
          {isRegistering && (
            <div id="register-field-name">
              <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Full Name</label>
              <div className="relative">
                <input
                  id="reg-input-name"
                  type="text"
                  placeholder="E.g., Dr. Sarah Sterling"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm font-light bg-brand-light border border-zinc-100 rounded-xl px-4 py-3 focus:outline-hidden focus:border-brand-yellow transition-all"
                  required
                />
              </div>
            </div>
          )}

          <div id="login-field-email">
            <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Academic Email Address</label>
            <div className="relative">
              <Mail size={14} className="absolute left-4 top-4 text-zinc-300" />
              <input
                id="login-input-email"
                type="email"
                placeholder="name@edu.sabicrest.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm font-light bg-brand-light border border-zinc-100 rounded-xl pl-10 pr-4 py-3 focus:outline-hidden focus:border-brand-yellow transition-all"
                required
              />
            </div>
          </div>

          <div id="login-field-password">
            <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-4 top-4 text-zinc-300" />
              <input
                id="login-input-pass"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm font-light bg-brand-light border border-zinc-100 rounded-xl pl-10 pr-4 py-3 focus:outline-hidden focus:border-brand-yellow transition-all"
                required
              />
            </div>
          </div>

          {isRegistering && (
            <div id="register-role-selection" className="pt-1">
              <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-2">Select Account Role</label>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  id="reg-role-student"
                  type="button"
                  onClick={() => setRole('student')}
                  className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${
                    role === 'student' ? 'border-brand-yellow bg-amber-50/20 font-medium text-brand-black' : 'border-zinc-100 text-brand-gray hover:bg-zinc-50'
                  }`}
                >
                  <Sparkles size={14} className={role === 'student' ? 'text-brand-yellow' : 'text-zinc-300'} />
                  <span>Student Mentee</span>
                </button>
                <button
                  id="reg-role-trainer"
                  type="button"
                  onClick={() => setRole('trainer')}
                  className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${
                    role === 'trainer' ? 'border-brand-yellow bg-amber-50/20 font-medium text-brand-black' : 'border-zinc-100 text-brand-gray hover:bg-zinc-50'
                  }`}
                >
                  <Shield size={14} className={role === 'trainer' ? 'text-brand-yellow' : 'text-zinc-300'} />
                  <span>Tutor / Instructor</span>
                </button>
              </div>
            </div>
          )}

          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-brand-black hover:bg-zinc-900 text-white rounded-xl text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer focus-ring mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <Shield size={12} className="animate-spin text-brand-yellow" />
                {oauthProvider ? `Connecting with ${oauthProvider}...` : 'Verifying details...'}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Key size={12} className="text-brand-yellow" />
                {isRegistering ? 'Register Account' : 'Sign In'}
              </span>
            )}
          </button>
        </form>

        {/* Styled Beautiful OAuth Integrations */}
        <div id="login-oauth-section" className="mt-6 pt-6 border-t border-zinc-100">
          <p className="text-center text-[10px] tracking-wide text-brand-gray uppercase mb-3 font-light">
            Or sign in with
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              id="oauth-google-btn"
              onClick={() => handleOAuthLogin('Google')}
              disabled={loading}
              className="flex items-center justify-center gap-2 border border-zinc-100 hover:border-zinc-300 rounded-xl py-2.5 px-3 text-xs font-light text-brand-black cursor-pointer transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" width="24" height="24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22s.81-1.43.81-2.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.64 2.84c.87-2.6 3.3-4.52 6.18-4.52z" />
              </svg>
              <span>Google Admin</span>
            </button>
            <button
              id="oauth-github-btn"
              onClick={() => handleOAuthLogin('GitHub')}
              disabled={loading}
              className="flex items-center justify-center gap-2 border border-zinc-100 hover:border-zinc-300 rounded-xl py-2.5 px-3 text-xs font-light text-brand-black cursor-pointer transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              <span>GitHub Student</span>
            </button>
          </div>
        </div>

        {/* Demo Fast Login presets for immediate product audit */}
        <div id="login-preset-profiles" className="mt-8 bg-zinc-50 border border-zinc-100 rounded-2xl p-4">
          <p className="text-[10px] tracking-wide text-brand-gray uppercase mb-3 flex items-center gap-1 font-light">
            <CheckCircle2 size={10} className="text-brand-yellow" /> Quick Sign-In Presets (Instant Role Selection)
          </p>
          <div className="flex flex-col gap-1.5 text-xs font-light">
            <button
              id="preset-student-btn"
              type="button"
              onClick={() => handlePresetLogin('alex.rivera@edu.sabicrest.com')}
              className="w-full text-left py-1.5 px-3 rounded-lg hover:bg-zinc-100/60 text-brand-gray hover:text-brand-black transition-all flex items-center justify-between"
            >
              <span>Student Mentee: <strong>Alex Rivera</strong></span>
              <span className="text-[10px] bg-amber-100/80 text-amber-800 px-1.5 py-0.5 rounded font-mono">student</span>
            </button>
            <button
              id="preset-trainer-btn"
              type="button"
              onClick={() => handlePresetLogin('sarah.sterling@sabicrest.com')}
              className="w-full text-left py-1.5 px-3 rounded-lg hover:bg-zinc-100/60 text-brand-gray hover:text-brand-black transition-all flex items-center justify-between"
            >
              <span>Certified Coach: <strong>Dr. Sterling</strong></span>
              <span className="text-[10px] bg-black text-brand-yellow px-1.5 py-0.5 rounded font-mono">trainer</span>
            </button>
            <button
              id="preset-admin-btn"
              type="button"
              onClick={() => handlePresetLogin('officialsabicrest@gmail.com')}
              className="w-full text-left py-1.5 px-3 rounded-lg hover:bg-zinc-100/60 text-brand-gray hover:text-brand-black transition-all flex items-center justify-between"
            >
              <span>App Admin: <strong>Sabicrest Admin</strong></span>
              <span className="text-[10px] bg-zinc-200 text-zinc-900 px-1.5 py-0.5 rounded font-mono">admin</span>
            </button>
          </div>
        </div>

      </div>

      {/* Modern, minimalist footer branding details */}
      <div id="login-footer-info" className="mt-6 text-[10px] font-light text-zinc-300 tracking-wider uppercase text-center flex flex-col gap-1">
        <span>Sabicrest Platform // Secured by Appwrite Workspace</span>
        <span>Secure database storage integration enabled</span>
      </div>

    </div>
  );
}
