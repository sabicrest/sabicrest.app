/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { db, decryptPayload } from '../db';
import { Send, Shield, MessageSquare, Users, UserCheck, Lock, Unlock, Eye, EyeOff } from 'lucide-react';

interface MessagingProps {
  currentUser: User;
}

export default function Messaging({ currentUser }: MessagingProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('team-general');
  const [activeDmUser, setActiveDmUser] = useState<User | null>(null);
  const [typedMsg, setTypedMsg] = useState('');
  
  // Custom interactive cipher inspector
  const [revealEncryptedVersion, setRevealEncryptedVersion] = useState(false);
  
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = () => {
    setMessages(db.getMessages());
  };

  useEffect(() => {
    loadMessages();
    // Poll to simulate real-time chat updates seamlessly
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannelId, activeDmUser]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMsg.trim()) return;

    const messagePayload: Omit<Message, 'id' | 'encryptedContent' | 'isEncrypted' | 'algorithm'> = {
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      content: typedMsg,
      timestamp: new Date().toISOString()
    };

    if (activeDmUser) {
      messagePayload.receiverId = activeDmUser.id;
    } else {
      messagePayload.channelId = activeChannelId;
    }

    db.addMessage(messagePayload);
    setTypedMsg('');
    loadMessages();

    // Trigger target notifications
    if (activeDmUser) {
      db.addNotification({
        userId: activeDmUser.id,
        title: 'New Secure DM Received',
        message: `${currentUser.name} sent you an encrypted direct message.`,
        type: 'message'
      });
    } else {
      // General alert to other active participants
      db.getUsers()
        .filter(u => u.id !== currentUser.id)
        .forEach(u => {
          db.addNotification({
            userId: u.id,
            title: `Channel Update: #${activeChannelId}`,
            message: `${currentUser.name} posted in secure discussion channel.`,
            type: 'message'
          });
        });
    }
  };

  const usersList = db.getUsers().filter(u => u.id !== currentUser.id);
  const trainers = usersList.filter(u => u.role === 'trainer');
  const students = usersList.filter(u => u.role === 'student');

  // Filter messages based on active context
  const filteredMessages = messages.filter(m => {
    if (activeDmUser) {
      // DM context: sender is user & receiver is target OR sender is target & receiver is user
      return (m.senderId === currentUser.id && m.receiverId === activeDmUser.id) ||
             (m.senderId === activeDmUser.id && m.receiverId === currentUser.id);
    } else {
      // Channel context
      return m.channelId === activeChannelId;
    }
  });

  return (
    <div id="messaging-root" className="max-w-7xl mx-auto px-4 py-6 select-none">
      
      {/* Encryption Banner Header */}
      <div id="messaging-secure-banner" className="bg-amber-50/10 border border-brand-yellow/30 p-4 rounded-2xl mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Shield className="text-brand-yellow shrink-0" size={18} />
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-black">End-to-End Appwrite DB Storage Decryption</h4>
            <p className="text-[11px] font-thin text-zinc-500 leading-normal">
              Every message below is salted and encrypted transit-bound via custom algorithm profiles before reaching Cloud storage.
            </p>
          </div>
        </div>

        <button
          id="toggle-cipher-view-btn"
          onClick={() => setRevealEncryptedVersion(!revealEncryptedVersion)}
          className="flex items-center gap-1.5 border border-zinc-200 hover:border-zinc-400 bg-white text-brand-black text-[10px] tracking-wide uppercase px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs font-light"
        >
          {revealEncryptedVersion ? (
            <>
              <EyeOff size={12} className="text-zinc-500" />
              <span>Hide Cipher Logs</span>
            </>
          ) : (
            <>
              <Eye size={12} className="text-brand-yellow" />
              <span>Expose Ciphertext (AES-256)</span>
            </>
          )}
        </button>
      </div>

      <div id="messaging-layout-grid" className="grid grid-cols-1 md:grid-cols-4 border border-zinc-100 rounded-3xl overflow-hidden bg-white min-h-[500px]">
        
        {/* Left Sidebar Pane */}
        <div id="messaging-sidebar" className="md:col-span-1 border-r border-zinc-100 flex flex-col justify-between bg-zinc-50/40 p-4 shrink-0">
          <div className="space-y-6">
            
            {/* Discussions Section */}
            <div>
              <h3 className="text-[10px] uppercase font-semibold text-brand-black tracking-wider mb-2 flex items-center gap-1.5 font-light">
                <Users size={12} className="text-zinc-400" /> Shared Channels
              </h3>
              <div className="space-y-1 text-xs font-light">
                {[
                  { id: 'team-general', label: 'cohort-general' },
                  { id: 'team-collaboration', label: 'team-active-horizon' }
                ].map(chan => (
                  <button
                    key={chan.id}
                    id={`channel-${chan.id}`}
                    onClick={() => {
                      setActiveChannelId(chan.id);
                      setActiveDmUser(null);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
                      !activeDmUser && activeChannelId === chan.id
                        ? 'bg-brand-black text-white font-medium shadow-xs'
                        : 'text-zinc-600 hover:bg-zinc-100/60'
                    }`}
                  >
                    <span className={(!activeDmUser && activeChannelId === chan.id) ? 'text-brand-yellow text-xs font-bold' : 'text-zinc-400 text-xs font-bold'}>#</span>
                    <span>{chan.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Messages Section */}
            <div>
              <h3 className="text-[10px] uppercase font-semibold text-brand-black tracking-wider mb-2 flex items-center gap-1.5 font-light">
                <UserCheck size={12} className="text-zinc-400" /> Professional DMs
              </h3>
              
              <div className="space-y-1 text-xs font-light max-h-56 overflow-y-auto">
                {currentUser.role !== 'trainer' ? (
                  <>
                    <p className="text-[9px] text-zinc-400 mb-1 tracking-wide">Trainers / Coaches</p>
                    {trainers.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setActiveDmUser(t)}
                        className={`w-full text-left p-2 rounded-xl transition-all flex items-center gap-2 ${
                          activeDmUser?.id === t.id
                            ? 'bg-brand-black text-white font-medium shadow-xs'
                            : 'text-zinc-600 hover:bg-zinc-100/60'
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full bg-zinc-200 font-bold overflow-hidden">
                          <img src={t.avatar} alt="avatar" className="w-full h-full object-cover referrerPolicy='no-referrer'" />
                        </div>
                        <span className="truncate">{t.name}</span>
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <p className="text-[9px] text-zinc-400 mb-1 tracking-wide">Student Roster</p>
                    {students.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setActiveDmUser(s)}
                        className={`w-full text-left p-2 rounded-xl transition-all flex items-center gap-2 ${
                          activeDmUser?.id === s.id
                            ? 'bg-brand-black text-white font-medium shadow-xs'
                            : 'text-zinc-600 hover:bg-zinc-100/60'
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full bg-zinc-200 font-bold overflow-hidden">
                          <img src={s.avatar} alt="avatar" className="w-full h-full object-cover referrerPolicy='no-referrer'" />
                        </div>
                        <span className="truncate">{s.name}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

          </div>

          <div className="bg-white border border-zinc-100 rounded-2xl p-3 mt-4">
            <div className="flex items-center gap-1.5 text-zinc-800 text-[10px] font-semibold mb-1 uppercase">
              <Lock size={10} className="text-emerald-500" /> AES Key Active
            </div>
            <p className="text-[9px] text-zinc-400 font-mono leading-tight">
              SABICREST_APPETITE_AES_256_GCM
            </p>
          </div>
        </div>

        {/* Dynamic Chat Main Pane */}
        <div id="messaging-main-chat" className="md:col-span-3 flex flex-col justify-between">
          
          {/* Active Banner Name */}
          <div id="chat-header-bar" className="border-b border-zinc-100 px-6 py-4 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-brand-yellow" />
              <h3 className="text-sm font-light tracking-tight text-brand-black">
                Active Hub: <span className="font-semibold">{activeDmUser ? activeDmUser.name : `#${activeChannelId === 'team-general' ? 'cohort-general' : 'team-active-horizon'}`}</span>
              </h3>
            </div>
            <span className="text-[10px] text-emerald-500 font-mono flex items-center gap-1 bg-emerald-50/60 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> secure edge tunnel
            </span>
          </div>

          {/* Messages stream view */}
          <div id="chat-stream-panel" className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[380px] bg-zinc-50/20">
            {filteredMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 font-light text-xs gap-1 py-10">
                <Unlock size={20} className="text-zinc-300" />
                <p>No transactions found in this communication block.</p>
                <p className="text-[10px] text-zinc-300">Start the conversation by typing a secure packet below.</p>
              </div>
            ) : (
              filteredMessages.map((msg, idx) => {
                const isMine = msg.senderId === currentUser.id;
                return (
                  <div
                    key={msg.id || idx}
                    className={`flex items-start gap-3 max-w-[80%] ${
                      isMine ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    {/* User profile avatar inside chat bubbles */}
                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-zinc-200">
                      <img src={msg.senderAvatar} alt="sender avatar" className="w-full h-full object-cover referrerPolicy='no-referrer'" />
                    </div>

                    <div className="space-y-1">
                      <div className={`flex items-center gap-2 text-[10px] ${isMine ? 'justify-end' : ''}`}>
                        <span className="font-medium text-brand-black">{msg.senderName}</span>
                        <span className="text-zinc-300">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Decrypted or encrypted display bubble based on master decrypt state */}
                      <div
                        className={`p-3.5 rounded-2xl text-xs font-light leading-relaxed font-sans ${
                          isMine
                            ? 'bg-brand-black text-white rounded-tr-none'
                            : 'bg-white border border-zinc-100 text-brand-black rounded-tl-none'
                        }`}
                      >
                        {revealEncryptedVersion ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-[9px] text-brand-yellow font-mono uppercase tracking-wide">
                              <Lock size={8} /> Decryption Suspended Log
                            </div>
                            <p className="font-mono text-[9px] tracking-tight text-zinc-400 break-all bg-zinc-950 p-2 rounded text-left leading-normal">
                              {msg.encryptedContent || '[NO_CI_BLOCK]'}
                            </p>
                            <p className="text-[8px] text-emerald-400 font-mono text-left">
                              ALGORITHM: {msg.algorithm}
                            </p>
                          </div>
                        ) : (
                          <p>{msg.content}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomScrollRef} />
          </div>

          {/* Secure text submission box */}
          <form id="secure-input-form" onSubmit={handleSend} className="p-4 border-t border-zinc-100 bg-white flex gap-2">
            <input
              id="chat-typed-msg"
              value={typedMsg}
              onChange={(e) => setTypedMsg(e.target.value)}
              placeholder={revealEncryptedVersion ? "Encryption preview on: type text to encrypt..." : "Transmit data packets privately..."}
              className="flex-1 bg-brand-light border border-zinc-100 rounded-xl px-4 py-3 text-xs font-light focus:outline-hidden focus:border-brand-yellow transition-all"
            />
            
            <button
              id="chat-submit-btn"
              type="submit"
              className="bg-brand-black hover:bg-zinc-900 text-white p-3 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 focus-ring"
            >
              <Send size={14} className="text-brand-yellow" />
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
