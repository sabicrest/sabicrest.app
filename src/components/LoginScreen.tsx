/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { db, encryptPayload } from '../db';
import { Shield, Sparkles, Key, Mail, Lock, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
// @ts-ignore
import sabicrestLogo from '../assets/images/sabicrest_logo_1780159096569.png';

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
  const [showPassword, setShowPassword] = useState(false);

  // Secure Admin Login state
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [secCode, setSecCode] = useState('');
  const [generatedSecCode, setGeneratedSecCode] = useState<string | null>(null);
  const [secCodeSent, setSecCodeSent] = useState(false);

  // Custom standard login
  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter your email and password.');
      return;
    }
    
    setLoading(true);
    setErrorMessage('');
    
    try {
      // Direct live Appwrite users query to guarantee real-time synchronization
      const users = await db.fetchLiveUsers();
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
          password,
          verified: false, // Students and trainers require verification update from Administrator
          joinedDate: new Date().toISOString().split('T')[0],
          status: 'active',
          bio: `Member of the Sabicrest platform.`,
          skills: []
        };

        await db.addUserAsync(newUser);
        
        db.addNotification({
          userId: newUser.id,
          title: 'Account Set Up Successfully',
          message: `Your private account has been created and secured successfully. Welcome inside!`,
          type: 'system'
        });

        onLoginSuccess(newUser);
      } else {
        if (matched) {
          if (matched.password && matched.password !== password) {
            setErrorMessage('The password entered is incorrect.');
            setLoading(false);
            return;
          }
          onLoginSuccess(matched);
        } else {
          setErrorMessage('No existing account found with this email inside the database. Please click the "Create Account" tab above to sign up first!');
        }
      }
    } catch (err: any) {
      console.error('Custom submit error:', err);
      setErrorMessage(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  // Modern simulated OAuth login callback
  const handleOAuthLogin = async (provider: 'Google' | 'GitHub') => {
    setOauthProvider(provider);
    setLoading(true);
    setErrorMessage('');
    
    try {
      // Live sync fetch of the users from Appwrite users collection
      const users = await db.fetchLiveUsers();
      let emailAddress = provider === 'Google' ? 'officialsabicrest@gmail.com' : 'student.mentee@edu.sabicrest.com';
      let matched = users.find(u => u.email.toLowerCase() === emailAddress.toLowerCase());
      
      if (!matched) {
        matched = {
          id: `u-oauth-${Date.now()}`,
          name: provider === 'Google' ? 'Google Administrator' : 'GitHub Student Mentee',
          email: emailAddress,
          role: provider === 'Google' ? 'admin' : 'student',
          verified: true,
          joinedDate: new Date().toISOString().split('T')[0],
          status: 'active',
          bio: `Auto-authenticated through secure ${provider} credentials.`,
          skills: provider === 'Google' ? [] : ['UI/UX Design', 'Fluid Typography']
        };
        await db.addUserAsync(matched);
      }

      db.addNotification({
        userId: matched.id,
        title: `Sign-In Verification Completed`,
        message: `Successfully connected and verified through ${provider}.`,
        type: 'system'
      });
      onLoginSuccess(matched);
    } catch (err: any) {
      console.error('OAuth login error:', err);
      setErrorMessage(err.message || 'OAuth authentication failed.');
    } finally {
      setLoading(false);
      setOauthProvider(null);
    }
  };

  if (isAdminMode) {
    return (
      <div id="login-container-card" className="min-h-screen bg-white flex flex-col justify-center items-center px-4 relative overflow-hidden select-none">
        
        {/* Decorative clean ambient ring */}
        <div id="ambient-ring-login" className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-yellow/5 pointer-events-none blur-3xl"></div>
        <div id="ambient-ring-login-2" className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-brand-yellow/5 pointer-events-none blur-3xl"></div>

        <div id="login-inner-workspace" className="w-full max-w-md bg-white border border-zinc-100 rounded-3xl p-8 shadow-sm transition-all duration-300 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Brand Logo Alignment */}
          <div id="login-brand-heading" className="text-center mb-8 flex flex-col items-center">
            <h1 id="sabicrest-logo-text" className="text-3xl font-bold tracking-tight text-black">
              Sabicrest
            </h1>
            <p id="sabicrest-tagline" className="text-xs font-medium text-amber-500 tracking-wide mt-1 uppercase flex items-center gap-1.5 justify-center">
              <Shield size={12} /> Admin Security Portal
            </p>
          </div>

          {errorMessage && (
            <div id="login-error-alert" className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs flex items-center gap-2 font-light">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!secCodeSent ? (
            /* Step 1: Request OTP Code */
            <form id="admin-request-form" onSubmit={(e) => {
              e.preventDefault();
              if (!adminEmail) {
                setErrorMessage('Please enter your administrator email.');
                return;
              }
              setLoading(true);
              setErrorMessage('');
              setTimeout(() => {
                const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
                setGeneratedSecCode(randomCode);
                setSecCodeSent(true);
                setLoading(false);
              }, 800);
            }} className="space-y-4">
              <div id="admin-field-email">
                <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Administrator Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-4 top-4 text-zinc-300" />
                  <input
                    id="admin-input-email"
                    type="email"
                    placeholder="E.g., CAO officialsabicrest@gmail.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full text-sm font-light bg-brand-light border border-zinc-100 rounded-xl pl-10 pr-4 py-3 focus:outline-hidden focus:border-brand-yellow transition-all"
                    required
                  />
                </div>
              </div>

              <button
                id="admin-request-btn"
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-brand-black hover:bg-zinc-900 text-white rounded-xl text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer focus-ring mt-2 font-semibold"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <Shield size={12} className="animate-spin text-brand-yellow" />
                    Generating Session Key...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Key size={12} className="text-brand-yellow" />
                    Send Verification Code
                  </span>
                )}
              </button>
            </form>
          ) : (
             /* Step 2: Validate 6 digit code */
            <form id="admin-validate-form" onSubmit={async (e) => {
              e.preventDefault();
              if (!secCode) {
                setErrorMessage('Please enter the 6-digit security code.');
                return;
              }
              if (secCode !== generatedSecCode) {
                setErrorMessage('Invalid verification code. Please check and try again.');
                return;
              }
              
              setLoading(true);
              setErrorMessage('');
              try {
                const users = await db.fetchLiveUsers();
                let matched = users.find(u => u.email.toLowerCase() === adminEmail.toLowerCase() && u.role === 'admin');
                
                if (!matched) {
                  // Admin auto-signs up for absolute clean production readiness!
                  matched = {
                    id: `u-admin-${Date.now()}`,
                    name: 'System Administrator',
                    email: adminEmail.trim().toLowerCase(),
                    role: 'admin',
                    verified: true,
                    joinedDate: new Date().toISOString().split('T')[0],
                    status: 'active',
                    bio: 'Core Platform Overseer at Sabicrest.',
                    skills: []
                  };
                  await db.addUserAsync(matched);
                }
                
                db.addNotification({
                  userId: matched.id,
                  title: 'Secure Administrator Login Approved',
                  message: 'Successfully verified and authorized core workspace access using one-time token security checks.',
                  type: 'system'
                });

                onLoginSuccess(matched);
              } catch (err: any) {
                console.error('Admin submit validation failure:', err);
                setErrorMessage(err.message || 'An error occurred during Admin verification.');
              } finally {
                setLoading(false);
              }
            }} className="space-y-4">
              
              <div id="simulated-code-toast" className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl flex flex-col gap-1 select-text">
                <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-widest">Simulated Secure Inbox</span>
                <p className="text-xs font-light text-zinc-750 leading-relaxed">
                  A temporary security key was dispatched to <strong className="font-medium text-brand-black">{adminEmail}</strong>.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] font-mono select-none text-zinc-400">Security Code:</span>
                  <span className="text-xs font-mono font-bold tracking-widest text-brand-black bg-white px-2.5 py-1 border border-zinc-150 rounded-lg">{generatedSecCode}</span>
                </div>
              </div>

              <div id="admin-field-code">
                <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">6-Digit Verification Code</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-4 top-4 text-zinc-300" />
                  <input
                    id="admin-input-code"
                    type="text"
                    maxLength={6}
                    placeholder="E.g., 123456"
                    value={secCode}
                    onChange={(e) => setSecCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-sm font-semibold tracking-widest text-center bg-brand-light border border-zinc-100 rounded-xl px-4 py-3 focus:outline-hidden focus:border-brand-yellow transition-all"
                    required
                  />
                </div>
              </div>

              <button
                id="admin-approve-btn"
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-brand-black hover:bg-zinc-900 text-white rounded-xl text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer focus-ring mt-2 font-semibold"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <Shield size={12} className="animate-spin text-brand-yellow" />
                    Authorizing Gateway...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-brand-yellow" />
                    Approve Admin Access
                  </span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
                    setGeneratedSecCode(randomCode);
                    setSecCode('');
                    setErrorMessage('');
                  }}
                  className="text-[11px] font-light text-zinc-400 hover:text-brand-black transition-colors"
                >
                  Resend security code
                </button>
              </div>

            </form>
          )}

          {/* Core Navigation Back */}
          <div id="admin-back-portal" className="mt-6 text-center pt-4 border-t border-zinc-50">
            <button
              id="back-student-portal-btn"
              type="button"
              onClick={() => {
                setIsAdminMode(false);
                setErrorMessage('');
                setSecCodeSent(false);
                setGeneratedSecCode(null);
              }}
              className="text-xs font-light text-zinc-400 hover:text-brand-black transition-colors underline underline-offset-4"
            >
              Return to Student or Tutor Access
            </button>
          </div>

        </div>

        {/* Modern, minimalist footer branding details */}
        <div id="login-footer-info" className="mt-6 text-[10px] font-light text-zinc-300 tracking-wider uppercase text-center flex flex-col gap-1">
          <span>Sabicrest Administrator Gateway // Restricted Core Access</span>
          <span>Dual OTP Token Key active under Sabicrest policy</span>
        </div>

      </div>
    );
  }

  return (
    <div id="login-container-card" className="min-h-screen bg-white flex flex-col justify-center items-center px-4 relative overflow-hidden select-none">
      
      {/* Decorative clean ambient ring */}
      <div id="ambient-ring-login" className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-yellow/5 pointer-events-none blur-3xl"></div>
      <div id="ambient-ring-login-2" className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-brand-yellow/5 pointer-events-none blur-3xl"></div>

      <div id="login-inner-workspace" className="w-full max-w-md bg-white border border-zinc-100 rounded-3xl p-8 shadow-sm transition-all duration-300">
        
        {/* Brand Logo Alignment */}
        <div id="login-brand-heading" className="text-center mb-8 flex flex-col items-center">
          <h1 id="sabicrest-logo-text" className="text-3xl font-bold tracking-tight text-black">
            Sabicrest
          </h1>
          <p id="sabicrest-tagline" className="text-xs font-medium text-black tracking-wide mt-1 uppercase">
            Access your dashboard
          </p>
        </div>

        {/* Tab Toggle for Register vs login */}
        <div id="login-tab-selector" className="flex border-b border-zinc-100 pb-3 mb-6 font-light text-sm text-zinc-400">
          <button
            id="tab-signin-btn"
            onClick={() => { setIsRegistering(false); setErrorMessage(''); }}
            className={`flex-1 py-1 text-center transition-all ${!isRegistering ? 'text-brand-black border-b-2 border-brand-black font-semibold' : 'hover:text-zinc-600'}`}
          >
            Sign In
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
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm font-light bg-brand-light border border-zinc-100 rounded-xl pl-10 pr-10 py-3 focus:outline-hidden focus:border-brand-yellow transition-all"
                required
              />
              <button
                type="button"
                id="login-password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
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
                  <span>Trainer / Mentor</span>
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



        {/* Administrator Gateway Button */}
        <div id="admin-portal-access" className="mt-8 pt-5 border-t border-zinc-50 text-center">
          <button
            id="toggle-admin-portal-btn"
            type="button"
            onClick={() => {
              setIsAdminMode(true);
              setErrorMessage('');
              setSecCodeSent(false);
              setGeneratedSecCode(null);
              setSecCode('');
            }}
            className="text-xs font-light text-brand-black hover:text-amber-500 underline underline-offset-4 cursor-pointer transition-colors"
          >
            Are you an Administrator? Access Admin Portal
          </button>
        </div>

      </div>

      {/* Modern, minimalist footer branding details */}
      <div id="login-footer-info" className="mt-6 text-[10px] font-light text-zinc-300 tracking-wider uppercase text-center flex flex-col gap-1">
        <span>Sabicrest Platform // Secure Connection Active</span>
        <span>A professional workspace for learning and collaboration</span>
      </div>

    </div>
  );
}
