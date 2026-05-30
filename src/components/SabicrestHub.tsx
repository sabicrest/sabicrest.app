/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, HubMessage } from '../types';
import { db } from '../db';
import { 
  Compass, 
  Send, 
  MessageCircle, 
  HelpCircle, 
  Users, 
  Lightbulb, 
  CheckCircle2, 
  CornerDownRight, 
  Reply, 
  Smile, 
  X, 
  HelpCircle as QuestionIcon,
  MessageSquare,
  Search,
  BookOpen
} from 'lucide-react';

interface SabicrestHubProps {
  currentUser: User;
}

export default function SabicrestHub({ currentUser }: SabicrestHubProps) {
  const [messages, setMessages] = useState<HubMessage[]>([]);
  const [activeTag, setActiveTag] = useState<'all' | 'general' | 'question' | 'collab' | 'idea'>('all');
  const [typedMsg, setTypedMsg] = useState('');
  const [selectedTag, setSelectedTag] = useState<'general' | 'question' | 'collab' | 'idea'>('general');
  const [searchQuery, setSearchQuery] = useState('');
  
  // WhatsApp-style reply quote state
  const [replyTo, setReplyTo] = useState<HubMessage | null>(null);
  
  // Hover reaction overlay state (messageId of the message showing emoji picker)
  const [activeEmojiPickerId, setActiveEmojiPickerId] = useState<string | null>(null);

  // Mobile drawer toggle state for the sidebar ("Community Spaces") - closed on load
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const hubStreamRef = useRef<HTMLDivElement>(null);

  const loadHubMessages = () => {
    setMessages(db.getHubMessages());
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    loadHubMessages();
    const interval = setInterval(loadHubMessages, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (hubStreamRef.current) {
      hubStreamRef.current.scrollTop = hubStreamRef.current.scrollHeight;
    }
  }, [messages, activeTag]);

  // Inherit selected tag from active sidebar tab automatically
  useEffect(() => {
    if (activeTag !== 'all') {
      setSelectedTag(activeTag);
    }
  }, [activeTag]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMsg.trim()) return;

    const payload: Omit<HubMessage, 'id' | 'timestamp' | 'reactions'> = {
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      content: typedMsg,
      tag: selectedTag,
    };

    if (selectedTag === 'question') {
      payload.isSolved = false;
    }

    if (replyTo) {
      payload.replyToId = replyTo.id;
      payload.replyToSender = replyTo.senderName;
      payload.replyToText = replyTo.content;
    }

    db.addHubMessage(payload);
    setTypedMsg('');
    setReplyTo(null);
    loadHubMessages();

    // Notify others in the system
    db.getUsers()
      .filter(u => u.id !== currentUser.id)
      .forEach(u => {
        db.addNotification({
          userId: u.id,
          title: `Sabicrest Hub: ${currentUser.name}`,
          message: `New community post shared under #${selectedTag}.`,
          type: 'message'
        });
      });
  };

  const handleReaction = (msgId: string, emoji: string) => {
    db.addHubReaction(msgId, emoji, currentUser.id);
    loadHubMessages();
    setActiveEmojiPickerId(null);
  };

  const handleToggleSolvedStatus = (msgId: string) => {
    db.toggleHubSolved(msgId);
    loadHubMessages();
  };

  // Scroll to a referenced message and briefly blink it
  const handleScrollToMessage = (id: string) => {
    const el = document.getElementById(`hub-msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-brand-yellow/10', 'scale-[1.01]', 'duration-300');
      setTimeout(() => {
        el.classList.remove('bg-brand-yellow/10', 'scale-[1.01]');
      }, 1500);
    }
  };

  // Filter logic based on tab select & search query
  const filteredMessages = messages.filter(m => {
    const matchesTag = activeTag === 'all' || m.tag === activeTag;
    const matchesSearch = searchQuery.trim() === '' || 
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.senderName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTag && matchesSearch;
  });

  // Sidebar helpers
  const countTag = (tag: 'general' | 'question' | 'collab' | 'idea') => {
    return messages.filter(m => m.tag === tag).length;
  };

  const unsolvedQuestionsCount = messages.filter(m => m.tag === 'question' && !m.isSolved).length;

  return (
    <div id="sabicrest-hub-viewport" className="max-w-7xl mx-auto px-4 py-6 select-none animate-in fade-in duration-300">
      
      {/* Sabicrest Hub Chat Section: Now positioned first at the top */}
      <div id="hub-main-grid" className="grid grid-cols-1 lg:grid-cols-4 border border-zinc-100 rounded-3xl overflow-hidden bg-white min-h-[580px] shadow-xs mb-8">
        
        {/* Left Community Hub sidebar */}
        <div id="hub-spaces-sidebar" className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-zinc-100 bg-zinc-50/40 p-4 flex flex-col justify-between">
          <div className="space-y-6">
            
            <div>
              {/* Collapsed on load toggle header on mobile, standard label on desktop */}
              <div 
                id="mobile-spaces-toggle-btn"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="flex items-center justify-between cursor-pointer lg:cursor-default pb-2 lg:pb-0 border-b lg:border-none border-zinc-100/60"
              >
                <h3 className="text-[10px] uppercase font-semibold text-brand-black tracking-wider flex items-center gap-1.5 font-light">
                  <Compass size={12} className="text-zinc-400" /> Community Spaces
                </h3>
                <span className="lg:hidden text-[9px] uppercase font-mono bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded font-semibold">
                  {isSidebarOpen ? 'Close Spaces ▲' : 'Open Spaces ▼'}
                </span>
              </div>
              
              <div className={`space-y-6 mt-4 lg:mt-3 ${isSidebarOpen ? 'block' : 'hidden lg:block'}`}>
                <div className="space-y-1 text-xs">
                  {/* All discussions tab */}
                  <button
                    id="tab-all-discussions"
                    onClick={() => { setActiveTag('all'); setIsSidebarOpen(false); }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between ${
                      activeTag === 'all'
                        ? 'bg-brand-black text-white font-medium shadow-xs'
                        : 'text-zinc-600 hover:bg-zinc-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold leading-none">#</span>
                      <span>All Discussions</span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
                      activeTag === 'all' ? 'bg-amber-400 text-brand-black font-semibold' : 'bg-zinc-200/60 text-zinc-600'
                    }`}>{messages.length}</span>
                  </button>

                  {/* General category tab */}
                  <button
                    id="tab-general"
                    onClick={() => { setActiveTag('general'); setIsSidebarOpen(false); }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between ${
                      activeTag === 'general'
                        ? 'bg-brand-black text-white font-medium shadow-xs'
                        : 'text-zinc-600 hover:bg-zinc-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare size={13} className={activeTag === 'general' ? 'text-brand-yellow' : 'text-zinc-400'} />
                      <span>General Chat</span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
                      activeTag === 'general' ? 'bg-amber-400 text-brand-black font-semibold' : 'bg-zinc-200/60 text-zinc-600'
                    }`}>{countTag('general')}</span>
                  </button>

                  {/* Q&A / Ask Questions tab */}
                  <button
                    id="tab-question"
                    onClick={() => { setActiveTag('question'); setIsSidebarOpen(false); }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between ${
                      activeTag === 'question'
                        ? 'bg-brand-black text-white font-medium shadow-xs'
                        : 'text-zinc-600 hover:bg-zinc-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <HelpCircle size={13} className={activeTag === 'question' ? 'text-brand-yellow' : 'text-zinc-400'} />
                      <span>Ask Questions</span>
                    </div>
                    {unsolvedQuestionsCount > 0 && (
                      <span className="text-[9px] bg-red-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                        {unsolvedQuestionsCount}
                      </span>
                    )}
                  </button>

                  {/* Collaborations space tab */}
                  <button
                    id="tab-collab"
                    onClick={() => { setActiveTag('collab'); setIsSidebarOpen(false); }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between ${
                      activeTag === 'collab'
                        ? 'bg-brand-black text-white font-medium shadow-xs'
                        : 'text-zinc-600 hover:bg-zinc-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users size={13} className={activeTag === 'collab' ? 'text-brand-yellow' : 'text-zinc-400'} />
                      <span>Study Groups & Collab</span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
                      activeTag === 'collab' ? 'bg-amber-400 text-brand-black font-semibold' : 'bg-zinc-200/60 text-zinc-600'
                    }`}>{countTag('collab')}</span>
                  </button>

                  {/* Aesthetic Ideas tab */}
                  <button
                    id="tab-idea"
                    onClick={() => { setActiveTag('idea'); setIsSidebarOpen(false); }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between ${
                      activeTag === 'idea'
                        ? 'bg-brand-black text-white font-medium shadow-xs'
                        : 'text-zinc-600 hover:bg-zinc-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Lightbulb size={13} className={activeTag === 'idea' ? 'text-brand-yellow' : 'text-zinc-400'} />
                      <span>Design Showcase</span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
                      activeTag === 'idea' ? 'bg-amber-400 text-brand-black font-semibold' : 'bg-zinc-200/60 text-zinc-600'
                    }`}>{countTag('idea')}</span>
                  </button>
                </div>

                {/* Hub Search Box */}
                <div className="relative">
                  <span className="absolute left-3 top-3 text-zinc-400">
                    <Search size={14} />
                  </span>
                  <input
                    id="search-hub-messages"
                    type="text"
                    placeholder="Search hub keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-zinc-100 text-xs font-light rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-hidden focus:border-brand-yellow transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-zinc-400 hover:text-black">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Guidelines info card bottom */}
          <div className={`${isSidebarOpen ? 'block' : 'hidden lg:block'} bg-white border border-zinc-100 p-3.5 rounded-2xl mt-8`}>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-brand-black uppercase mb-1">
              <BookOpen size={11} className="text-brand-yellow" /> Community Rules
            </div>
            <p className="text-[10px] text-zinc-400 font-light leading-relaxed">
              Sabicrest Hub acts as an open guild hallway. Feel free to answer peers, exchange links, offer design reviews, and establish healthy collaborations!
            </p>
          </div>

        </div>

        {/* Dynamic community chat stream */}
        <div id="hub-messages-pane" className="lg:col-span-3 flex flex-col justify-between">
          
          {/* Active section navigation info */}
          <div id="hub-stream-header" className="border-b border-zinc-100 px-6 py-4 bg-white flex items-center justify-between">
            <h3 className="text-sm font-light tracking-tight text-brand-black">
              Guild Hallway // <span className="font-semibold capitalize">{activeTag === 'all' ? 'All Spaces Shared' : `${activeTag} category`}</span>
            </h3>

            <div className="flex items-center gap-3">
              <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-100/50 px-2 py-0.5 rounded font-mono font-light uppercase">
                {filteredMessages.length} results
              </span>
            </div>
          </div>

          {/* Messages loop stream container */}
          <div ref={hubStreamRef} id="hub-chat-stream" className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[440px] bg-zinc-50/20">
            {filteredMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 font-light text-xs gap-1.5 py-12">
                <Compass size={28} className="text-zinc-300" />
                <p>No community topics listed inside this space segment.</p>
                <p className="text-[10px] text-zinc-300">Be the pioneer and spark the conversation draft below.</p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isMine = msg.senderId === currentUser.id;
                const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;
                
                // Color mapping for Tag indicators
                const tagColors = {
                  general: 'bg-zinc-100 text-zinc-600 border-zinc-200/50',
                  question: msg.isSolved ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100',
                  collab: 'bg-cyan-50 text-cyan-700 border-cyan-100',
                  idea: 'bg-indigo-50 text-indigo-700 border-indigo-100'
                };

                return (
                  <div
                    key={msg.id}
                    id={`hub-msg-${msg.id}`}
                    className={`flex items-start gap-3.5 max-w-[85%] group/msg relative transition-all p-2 rounded-2xl ${
                      isMine ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    
                    {/* User profile avatar inside bubbles */}
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-zinc-200">
                      <img src={msg.senderAvatar} alt="sender avatar" className="w-full h-full object-cover referrerPolicy='no-referrer'" />
                    </div>

                    <div className="space-y-1.5 w-full">
                      {/* Name, time and category flag labels */}
                      <div className={`flex items-center gap-2 text-[10px] ${isMine ? 'justify-end' : ''}`}>
                        <span className="font-semibold text-brand-black">{msg.senderName}</span>
                        <span className="text-zinc-400 font-light">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        
                        {/* Interactive Tag indicators */}
                        <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border font-sans ${tagColors[msg.tag]}`}>
                          {msg.tag} {msg.tag === 'question' && (msg.isSolved ? '✓ Solved' : '● Open')}
                        </span>
                      </div>

                      {/* Decrypted or encrypted display bubble */}
                      <div
                        className={`p-4 rounded-2xl text-xs font-light leading-relaxed relative ${
                          isMine
                            ? 'bg-brand-black text-white rounded-tr-none'
                            : 'bg-white border border-zinc-100 text-brand-black rounded-tl-none'
                        }`}
                      >
                        {/* Nested direct reply quote block */}
                        {msg.replyToId && (
                          <div 
                            onClick={() => handleScrollToMessage(msg.replyToId!)}
                            className={`p-2.5 rounded-xl text-[11px] font-light mb-3 border-l-3 text-left cursor-pointer transition-colors ${
                              isMine 
                                ? 'bg-zinc-900 border-brand-yellow text-zinc-300 hover:bg-zinc-800' 
                                : 'bg-zinc-50 border-brand-yellow text-zinc-500 hover:bg-zinc-100'
                            }`}
                          >
                            <div className="flex items-center gap-1 font-semibold mb-0.5">
                              <CornerDownRight size={10} className="text-brand-yellow" />
                              <span>{msg.replyToSender}</span>
                            </div>
                            <p className="truncate lowercase font-mono">{msg.replyToText}</p>
                          </div>
                        )}

                        <p className="whitespace-pre-wrap">{msg.content}</p>

                        {/* Hover elements: Direct Replies & Emoji reaction bar */}
                        <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150 ${
                          isMine ? 'left-0 -translate-x-[110%]' : 'right-0 translate-x-[110%]'
                        }`}>
                          {/* Quote reply trigger icon */}
                          <button
                            onClick={() => setReplyTo(msg)}
                            className="p-1.5 bg-white border border-zinc-100 hover:border-zinc-300 text-zinc-400 hover:text-black rounded-lg shadow-sm cursor-pointer transition-all"
                            title="Quoted Reply like WhatsApp"
                          >
                            <Reply size={12} />
                          </button>

                          {/* Smiley Emoji pick overlays */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveEmojiPickerId(activeEmojiPickerId === msg.id ? null : msg.id)}
                              className="p-1.5 bg-white border border-zinc-100 hover:border-zinc-300 text-zinc-400 hover:text-black rounded-lg shadow-sm cursor-pointer transition-all"
                              title="Reaction Emojis"
                            >
                              <Smile size={12} />
                            </button>

                            {/* Standard Emojis selector list */}
                            {activeEmojiPickerId === msg.id && (
                              <div className="absolute top-1/2 -translate-y-[120%] left-0 bg-white border border-zinc-200 rounded-full shadow-lg p-1.5 flex gap-1 z-50 animate-in zoom-in-50 duration-150">
                                {['👍', '❤️', '😂', '😮', '🤔', '🙏'].map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReaction(msg.id, emoji)}
                                    className="hover:scale-125 px-1 py-0.5 text-xs transition-transform cursor-pointer"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Solved/Unsolved status triggers for authors + trainer/admin */}
                          {msg.tag === 'question' && (currentUser.role !== 'student' || currentUser.id === msg.senderId) && (
                            <button
                              onClick={() => handleToggleSolvedStatus(msg.id)}
                              className={`p-1.5 rounded-lg border shadow-sm transition-all text-[10px] uppercase tracking-wider font-semibold cursor-pointer ${
                                msg.isSolved
                                  ? 'bg-rose-50 border-rose-100 text-rose-500 hover:bg-rose-100'
                                  : 'bg-emerald-50 border-emerald-100 text-emerald-500 hover:bg-emerald-100'
                              }`}
                              title={msg.isSolved ? 'Reopen Question' : 'Mark as Solved'}
                            >
                              <CheckCircle2 size={12} />
                            </button>
                          )}
                        </div>

                        {/* Reactions render layout bottom of the bubble */}
                        {hasReactions && (
                          <div className={`flex flex-wrap gap-1 mt-2.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(msg.reactions || {}).map(([emoji, voters]) => {
                              const voterList = voters as string[];
                              const alreadyVoted = voterList.includes(currentUser.id);
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(msg.id, emoji)}
                                  className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors font-mono ${
                                    alreadyVoted
                                      ? 'bg-amber-400 text-brand-black border border-amber-500/30'
                                      : isMine 
                                        ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400' 
                                        : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-500 border border-zinc-100'
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  <span className="font-semibold text-[9px]">{voterList.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* Reply referencing Quote Preview Banner banner (WhatsApp reply state) */}
          {replyTo && (
            <div className="bg-amber-50/20 border-t border-brand-yellow/30 px-6 py-2.5 text-xs flex items-center justify-between gap-6">
              <div className="flex items-center gap-1.5 overflow-hidden text-brand-black text-[11px]">
                <Reply size={12} className="text-brand-yellow shrink-0" />
                <span className="font-semibold shrink-0">Replying to {replyTo.senderName}:</span>
                <span className="text-zinc-500 truncate lowercase font-mono italic">"{replyTo.content}"</span>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="text-zinc-400 hover:text-black shrink-0 font-semibold"
                title="Dismiss Reply Reference"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Secure text submission box */}
          <form id="hub-input-form" onSubmit={handleSend} className="p-4 border-t border-zinc-100 bg-white flex flex-col md:flex-row gap-3">
            
            {/* Tag pick select list */}
            <div className="flex items-center gap-1 bg-zinc-50 rounded-xl px-2.5 py-1 text-xs shrink-0 max-w-max border border-zinc-100">
              <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest mr-1">Post in:</span>
              <select
                id="select-post-tag"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value as any)}
                className="bg-transparent border-none text-[10px] uppercase font-semibold text-brand-black focus:outline-hidden cursor-pointer h-8"
              >
                <option value="general">#general</option>
                <option value="question">#question</option>
                <option value="collab">#collab</option>
                <option value="idea">#idea</option>
              </select>
            </div>

            <div className="flex-1 flex gap-2">
              <input
                id="hub-typed-msg"
                value={typedMsg}
                onChange={(e) => setTypedMsg(e.target.value)}
                placeholder={
                  selectedTag === 'question' 
                    ? "Ask a question for others to help solve..." 
                    : selectedTag === 'collab' 
                    ? "Explain what you want to collaborate on..." 
                    : "Post to the general guild hallway..."
                }
                className="flex-1 bg-brand-light border border-zinc-100 rounded-xl px-4 py-3 text-xs font-light focus:outline-hidden focus:border-brand-yellow transition-all"
                required
              />
              
              <button
                id="hub-submit-btn"
                type="submit"
                className="bg-brand-black hover:bg-zinc-900 text-white p-3 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 focus-ring"
              >
                <Send size={14} className="text-brand-yellow" />
              </button>
            </div>

          </form>

        </div>
      </div>

      {/* Community Dashboard Stats Grid: Moved to bottom of the viewport */}
      <div id="hub-stats-panel" className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <div className="bg-white border border-zinc-100 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-semibold text-brand-gray tracking-wider block">Hub Activity</span>
            <span className="text-2xl font-light text-brand-black tracking-tight">{messages.length} Posts</span>
          </div>
          <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-200">
            <Compass size={18} className="text-brand-yellow" />
          </div>
        </div>

        <div className="bg-white border border-zinc-100 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-semibold text-brand-gray tracking-wider block">Active Questions</span>
            <span className="text-2xl font-light text-zinc-900 tracking-tight">{unsolvedQuestionsCount} Open</span>
          </div>
          <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-200">
            <HelpCircle size={18} className="text-amber-500" />
          </div>
        </div>

        <div className="bg-white border border-zinc-100 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-semibold text-brand-gray tracking-wider block">Collaborations</span>
            <span className="text-2xl font-light text-zinc-900 tracking-tight">{countTag('collab')} Threads</span>
          </div>
          <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-200">
            <Users size={18} className="text-emerald-500" />
          </div>
        </div>

        <div className="bg-white border border-zinc-100 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-semibold text-brand-gray tracking-wider block">Aesthetic Ideas</span>
            <span className="text-2xl font-light text-zinc-900 tracking-tight">{countTag('idea')} Shared</span>
          </div>
          <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-200">
            <Lightbulb size={18} className="text-indigo-400" />
          </div>
        </div>
      </div>

    </div>
  );
}
