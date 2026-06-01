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
  HelpCircle, 
  Users, 
  Lightbulb, 
  CheckCircle2, 
  CornerDownRight, 
  Reply, 
  Smile, 
  X, 
  MessageSquare, 
  Search, 
  BookOpen,
  Paperclip,
  Image,
  ZoomIn
} from 'lucide-react';

interface SabicrestHubProps {
  currentUser: User;
}

export default function SabicrestHub({ currentUser }: SabicrestHubProps) {
  const [messages, setMessages] = useState<HubMessage[]>([]);
  const [activeTag, setActiveTag] = useState<'all' | 'general' | 'question' | 'collab' | 'idea'>('all');
  const [typedMsg, setTypedMsg] = useState('');
  const [selectedTag, setSelectedTag] = useState<'general' | 'question' | 'collab' | 'idea'>('general');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // WhatsApp-style reply quote state
  const [replyTo, setReplyTo] = useState<HubMessage | null>(null);
  const [activeEmojiPickerId, setActiveEmojiPickerId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  // File uploads
  const [attachment, setAttachment] = useState<{ url: string; name: string; type: 'image' | 'file' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag replies
  const [draggedMessageId, setDraggedMessageId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [longPressTimeout, setLongPressTimeout] = useState<any>(null);

  // Real-time typing Indicators
  const hubChatId = `hub-${activeTag}`;
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const hubStreamRef = useRef<HTMLDivElement>(null);

  const loadHubMessages = () => {
    setMessages(db.getHubMessages());
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    loadHubMessages();
    const interval = setInterval(loadHubMessages, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll typing statuses
  useEffect(() => {
    const checkTyping = () => {
      const activeTyping = db.getTypingUsers(hubChatId).filter(name => name !== currentUser.name);
      setTypingUsers(activeTyping);
    };
    checkTyping();
    const interval = setInterval(checkTyping, 1000);
    return () => clearInterval(interval);
  }, [hubChatId, currentUser.name]);

  // Set typing status during user input
  useEffect(() => {
    if (typedMsg.trim()) {
      db.setTypingStatus(hubChatId, currentUser.id, currentUser.name, true);
      const timer = setTimeout(() => {
        db.setTypingStatus(hubChatId, currentUser.id, currentUser.name, false);
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      db.setTypingStatus(hubChatId, currentUser.id, currentUser.name, false);
    }
  }, [typedMsg, hubChatId, currentUser.id, currentUser.name]);

  useEffect(() => {
    if (hubStreamRef.current) {
      hubStreamRef.current.scrollTop = hubStreamRef.current.scrollHeight;
    }
  }, [messages, activeTag, typingUsers]);

  useEffect(() => {
    if (activeTag !== 'all') {
      setSelectedTag(activeTag);
    }
  }, [activeTag]);

  // Touch & Mouse Drag swiping setup
  const handleTouchStart = (msgId: string, clientX: number) => {
    setDraggedMessageId(msgId);
    setDragStartX(clientX);
    setDragOffset(0);
  };

  const handleTouchMove = (clientX: number) => {
    if (!draggedMessageId) return;
    const deltaX = clientX - dragStartX;
    setDragOffset(Math.max(-80, Math.min(80, deltaX)));
  };

  const handleTouchEnd = (msg: HubMessage) => {
    if (!draggedMessageId) return;
    if (Math.abs(dragOffset) > 55) {
      setReplyTo(msg);
      if ('vibrate' in navigator) {
        try { navigator.vibrate(15); } catch {}
      }
    }
    setDraggedMessageId(null);
    setDragOffset(0);
  };

  const handlePressStart = (msgId: string, e: any) => {
    const isTouch = e.type.startsWith('touch');
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    handleTouchStart(msgId, clientX);

    const timeout = setTimeout(() => {
      setActiveEmojiPickerId(msgId);
      if ('vibrate' in navigator) {
        try { navigator.vibrate([25]); } catch {}
      }
    }, 700);
    setLongPressTimeout(timeout);
  };

  const handlePressEnd = (msg: HubMessage) => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
    }
    handleTouchEnd(msg);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const isImg = file.type.startsWith('image/');
      setAttachment({
        url: reader.result as string,
        name: file.name,
        type: isImg ? 'image' : 'file'
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMsg.trim() && !attachment) return;

    const payload: Omit<HubMessage, 'id' | 'timestamp' | 'reactions'> = {
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      content: typedMsg || `Posted an attachment: ${attachment?.name}`,
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

    if (attachment) {
      payload.attachmentUrl = attachment.url;
      payload.attachmentName = attachment.name;
      payload.attachmentType = attachment.type;
    }

    db.addHubMessage(payload);
    setTypedMsg('');
    setReplyTo(null);
    setAttachment(null);
    db.setTypingStatus(hubChatId, currentUser.id, currentUser.name, false);
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
      el.classList.add('bg-brand-yellow/10', 'ring-2', 'ring-amber-300', 'duration-300');
      setTimeout(() => {
        el.classList.remove('bg-brand-yellow/10', 'ring-2', 'ring-amber-300');
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

  const countTag = (tag: 'general' | 'question' | 'collab' | 'idea') => {
    return messages.filter(m => m.tag === tag).length;
  };

  const unsolvedQuestionsCount = messages.filter(m => m.tag === 'question' && !m.isSolved).length;

  return (
    <div id="sabicrest-hub-viewport" className="max-w-7xl mx-auto px-4 py-6 select-none animate-in fade-in duration-300">
      
      {/* Sabicrest Hub Chat Section */}
      <div id="hub-main-grid" className="grid grid-cols-1 lg:grid-cols-4 border border-zinc-100 rounded-3xl overflow-hidden bg-white min-h-[580px] shadow-xs mb-8">
        
        {/* Left Community Hub sidebar */}
        <div id="hub-spaces-sidebar" className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-zinc-100 bg-zinc-50/40 p-4 flex flex-col justify-between">
          <div className="space-y-6">
            
            <div>
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
                    onClick={() => { setActiveTag('all'); setIsSidebarOpen(false); setReplyTo(null); setAttachment(null); }}
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
                    onClick={() => { setActiveTag('general'); setIsSidebarOpen(false); setReplyTo(null); setAttachment(null); }}
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
                    onClick={() => { setActiveTag('question'); setIsSidebarOpen(false); setReplyTo(null); setAttachment(null); }}
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
                    onClick={() => { setActiveTag('collab'); setIsSidebarOpen(false); setReplyTo(null); setAttachment(null); }}
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
                    onClick={() => { setActiveTag('idea'); setIsSidebarOpen(false); setReplyTo(null); setAttachment(null); }}
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
          <div 
            ref={hubStreamRef} 
            id="hub-chat-stream" 
            className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[440px] bg-zinc-50/20"
            onMouseMove={(e) => handleTouchMove(e.clientX)}
            onMouseUp={() => { if (draggedMessageId) setDraggedMessageId(null); }}
          >
            {filteredMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 font-light text-xs gap-1.5 py-12">
                <Compass size={28} className="text-zinc-300" />
                <p>No community topics listed inside this space segment.</p>
                <p className="text-[10px] text-zinc-300">Drag items to reply, tap & hold for emojis, or upload sketches!</p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isMine = msg.senderId === currentUser.id;
                const messageReactions = msg.reactions || {};
                const hasReactions = Object.keys(messageReactions).length > 0;
                const isThisMessageDragged = draggedMessageId === msg.id;
                
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
                    onMouseDown={(e) => handlePressStart(msg.id, e)}
                    onMouseUp={() => handlePressEnd(msg)}
                    onMouseLeave={() => { if (longPressTimeout) clearTimeout(longPressTimeout); }}
                    onTouchStart={(e) => handlePressStart(msg.id, e)}
                    onTouchEnd={() => handlePressEnd(msg)}
                    onTouchMove={(e) => handleTouchMove(e.touches[0].clientX)}
                    style={{
                      transform: isThisMessageDragged ? `translateX(${dragOffset}px)` : 'none',
                      transition: isThisMessageDragged ? 'none' : 'transform 0.15s ease-out'
                    }}
                    className={`flex items-start gap-3.5 max-w-[85%] group/msg relative transition-all p-2 rounded-2xl ${
                      isMine ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    {isThisMessageDragged && Math.abs(dragOffset) > 25 && (
                      <div className={`absolute top-1/2 -translate-y-1/2 text-brand-yellow font-bold flex items-center ${
                        dragOffset > 0 ? '-left-10' : '-right-10'
                      }`}>
                        <Reply size={16} className="animate-pulse" />
                      </div>
                    )}
                    
                    {/* Live configuration lookups */}
                    {(() => {
                      const sender = db.getUserById(msg.senderId);
                      const liveAvatar = sender?.avatar || msg.senderAvatar;
                      const liveName = sender?.name || msg.senderName;
                      return (
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-zinc-200 shadow-2xs">
                          {liveAvatar ? (
                            <img src={liveAvatar} alt="sender avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full bg-brand-black text-white flex items-center justify-center text-xs font-semibold font-mono uppercase">
                              {liveName.charAt(0)}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="space-y-1.5 w-full">
                      <div className={`flex items-center gap-2 text-[10px] ${isMine ? 'justify-end' : ''}`}>
                        <span className="font-semibold text-brand-black">{db.getUserById(msg.senderId)?.name || msg.senderName}</span>
                        <span className="text-zinc-400 font-light">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        
                        <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border font-sans ${tagColors[msg.tag]}`}>
                          {msg.tag} {msg.tag === 'question' && (msg.isSolved ? '✓ Solved' : '● Open')}
                        </span>
                      </div>

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

                        {/* Attachments rendering */}
                        {msg.attachmentUrl && (
                          <div className="mt-2 text-left">
                            {msg.attachmentType === 'image' ? (
                              <div className="relative rounded-lg overflow-hidden border border-zinc-150 max-w-sm group/thumb cursor-zoom-in">
                                <img 
                                  src={msg.attachmentUrl} 
                                  alt="attachment thumbnail" 
                                  className="max-h-52 object-cover rounded-lg w-full"
                                  onClick={() => setZoomedImage(msg.attachmentUrl || null)}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                  <ZoomIn size={16} className="text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="p-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-150 flex items-center justify-between gap-3 text-left transition-colors max-w-sm">
                                <div className="flex items-center gap-2 truncate">
                                  <Paperclip size={14} className="text-zinc-400 shrink-0" />
                                  <span className="text-[10.5px] text-zinc-700 font-medium truncate font-mono">{msg.attachmentName}</span>
                                </div>
                                <a href={msg.attachmentUrl} download={msg.attachmentName} className="text-[9.5px] text-brand-yellow font-semibold shrink-0 hover:underline">
                                  Download
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Message Options row underneath content (never overflows) */}
                        <div className={`flex items-center flex-wrap gap-3 mt-3 pt-2.5 border-t text-[10px] select-none ${
                          isMine 
                            ? 'border-white/10 text-zinc-300 justify-end' 
                            : 'border-zinc-100 text-zinc-400 justify-start'
                        }`}>
                          <button
                            type="button"
                            onClick={() => setReplyTo(msg)}
                            className={`flex items-center gap-1 hover:text-amber-400 transition-colors cursor-pointer ${
                              isMine ? 'hover:text-white' : 'hover:text-black'
                            }`}
                            title="Quoted Reply like WhatsApp"
                          >
                            <Reply size={11} /> <span>Reply</span>
                          </button>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveEmojiPickerId(activeEmojiPickerId === msg.id ? null : msg.id)}
                              className={`flex items-center gap-1 hover:text-amber-400 transition-colors cursor-pointer ${
                                isMine ? 'hover:text-white' : 'hover:text-black'
                              }`}
                              title="Reaction Emojis"
                            >
                              <Smile size={11} /> <span>React</span>
                            </button>

                            {/* Standard Emojis selector list */}
                            {activeEmojiPickerId === msg.id && (
                              <div className={`absolute bottom-6 bg-white border border-zinc-205 rounded-full shadow-lg p-1.5 flex gap-1 z-30 animate-in zoom-in-50 duration-150 ${
                                isMine ? 'right-0' : 'left-0'
                              }`}>
                                {['👍', '❤️', '😂', '😮', '🤔', '🙏'].map(emoji => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => handleReaction(msg.id, emoji)}
                                    className="hover:scale-125 px-1 py-0.5 text-xs text-black transition-transform cursor-pointer"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {msg.tag === 'question' && (currentUser.role !== 'student' || currentUser.id === msg.senderId) && (
                            <button
                              type="button"
                              onClick={() => handleToggleSolvedStatus(msg.id)}
                              className={`px-1.5 py-0.5 rounded border text-[9px] uppercase tracking-wider font-semibold cursor-pointer ${
                                msg.isSolved
                                  ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-250'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-150'
                              }`}
                              title={msg.isSolved ? 'Reopen Question' : 'Mark as Solved'}
                            >
                              {msg.isSolved ? '✓ Reopen' : '● Solve'}
                            </button>
                          )}
                        </div>

                        {/* Reactions render layout */}
                        {hasReactions && (
                          <div className={`flex flex-wrap gap-1 mt-2.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(messageReactions).map(([emoji, voters]) => {
                              const voterList = voters as string[];
                              const alreadyVoted = voterList.includes(currentUser.id);
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(msg.id, emoji)}
                                  className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors font-mono ${
                                    alreadyVoted
                                      ? 'bg-brand-yellow text-brand-black border border-brand-yellow/30'
                                      : isMine 
                                        ? 'bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-450' 
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

          {/* Typing users logs */}
          {typingUsers.length > 0 && (
            <div className="px-6 py-1.5 text-[10px] text-zinc-405 bg-zinc-50 border-t border-zinc-100 flex items-center gap-1.5 font-mono italic animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping mr-1"></span>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}

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

          {/* Attachment upload preview */}
          {attachment && (
            <div className="bg-zinc-50 border-t border-zinc-100 px-6 py-2 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-zinc-700 truncate">
                {attachment.type === 'image' ? <Image size={14} className="text-brand-yellow animate-bounce" /> : <Paperclip size={14} className="text-cyan-600 animate-bounce" />}
                <span className="truncate font-mono text-[10.5px] font-medium">{attachment.name}</span>
              </div>
              <button onClick={() => setAttachment(null)} className="text-zinc-400 hover:text-black">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Secure text submission box */}
          <form id="hub-input-form" onSubmit={handleSend} className="p-4 border-t border-zinc-100 bg-white flex flex-col md:flex-row gap-3">
            
            {/* Category Selector */}
            <div className="relative flex items-center shrink-0">
              <button
                type="button"
                id="select-post-tag-btn"
                onClick={(e) => {
                  e.preventDefault();
                  setIsTagDropdownOpen(!isTagDropdownOpen);
                }}
                className="flex items-center gap-1.5 bg-zinc-50 hover:bg-zinc-100 transition-all rounded-xl px-3 py-2 text-xs border border-zinc-100 font-semibold text-brand-black cursor-pointer h-11"
              >
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Post in:</span>
                <span className="text-brand-yellow">#</span>
                <span>{selectedTag}</span>
                <span className="text-[8px] text-zinc-400 ml-1">▼</span>
              </button>

              {isTagDropdownOpen && (
                <div 
                  id="tag-dropdown-list" 
                  className="absolute left-0 bottom-full mb-2 bg-white border border-zinc-150 rounded-xl shadow-lg py-1.5 z-50 w-36 animate-in fade-in slide-in-from-bottom-2 duration-150"
                >
                  {(['general', 'question', 'collab', 'idea'] as const).map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setSelectedTag(tag);
                        setIsTagDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs hover:bg-zinc-50 transition-colors flex items-center gap-1.5 ${
                        selectedTag === tag ? 'text-brand-black font-semibold bg-zinc-50' : 'text-zinc-650 font-light'
                      }`}
                    >
                      <span className="text-brand-yellow">#</span>
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 flex gap-2 items-center">
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                onChange={handleFileChange}
                accept="image/*,application/pdf,application/zip,text/*" 
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-zinc-50 hover:bg-zinc-150 border border-zinc-100/80 rounded-xl h-11 transition-all cursor-pointer text-zinc-550 mr-1"
                title="Upload Photo or Document"
              >
                <Paperclip size={13} />
              </button>

              <input
                id="hub-typed-msg"
                value={typedMsg}
                onChange={(e) => setTypedMsg(e.target.value)}
                placeholder={
                  attachment 
                    ? "Add caption to your attachment..."
                    : selectedTag === 'question' 
                    ? "Ask a question for others to help solve..." 
                    : selectedTag === 'collab' 
                    ? "Explain what you want to collaborate on..." 
                    : "Post to the general guild hallway..."
                }
                className="flex-1 bg-brand-light border border-zinc-100 rounded-xl px-4 py-3 text-xs font-light h-11 focus:outline-hidden focus:border-brand-yellow transition-all"
              />
              
              <button
                id="hub-submit-btn"
                type="submit"
                className="bg-brand-black hover:bg-zinc-900 text-white p-3 rounded-xl transition-all h-11 w-11 cursor-pointer flex items-center justify-center shrink-0 focus-ring"
              >
                <Send size={14} className="text-brand-yellow" />
              </button>
            </div>

          </form>

        </div>
      </div>

      {/* Community Dashboard Stats Grid */}
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

      {/* Lightbox zooms */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 cursor-zoom-out animate-in fade-in duration-200"
        >
          <button 
            onClick={() => setZoomedImage(null)}
            className="absolute top-6 right-6 text-white hover:text-zinc-300 p-2 rounded-full bg-zinc-900/60 transition-transform hover:scale-110"
          >
            <X size={20} />
          </button>
          <img 
            src={zoomedImage} 
            alt="zoomed attachment" 
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200" 
          />
        </div>
      )}

    </div>
  );
}
