/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { db } from '../db';
import ChannelsExplore from './ChannelsExplore';
import WorkspaceDirectory from './WorkspaceDirectory';
import { 
  Send, 
  MessageSquare, 
  Users, 
  UserCheck, 
  Unlock, 
  Paperclip, 
  Image, 
  Smile, 
  Reply, 
  X, 
  CornerDownRight, 
  ZoomIn,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';

const ALL_CHANNELS = [
  { id: 'team-general', label: 'cohort-general', desc: 'General chatter, major announcements, and introductions.' },
  { id: 'team-collaboration', label: 'team-active-horizon', desc: 'All team collaboration updates, cohort project syncs, and tasks.' },
  { id: 'design-showcase', label: 'design-showcase', desc: 'Present and critique high-fidelity Figma links, design prototypes, and mockups.' },
  { id: 'technical-support', label: 'technical-support', desc: 'Discuss application environments, system settings, APIs, and Appwrite databases.' }
];

interface MessagingProps {
  currentUser: User;
}

export default function Messaging({ currentUser }: MessagingProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('team-general');
  const [activeDmUser, setActiveDmUser] = useState<User | null>(null);
  const [typedMsg, setTypedMsg] = useState('');
  
  // Advanced Messaging states
  const [replyTo, setReplyTo] = useState<{ id: string; senderName: string; content: string } | null>(null);
  const [activeEmojiPickerId, setActiveEmojiPickerId] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{ url: string; name: string; type: 'image' | 'file' } | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  // Real-time typing indicators
  const chatStatusId = activeDmUser ? `dm-${activeDmUser.id}` : `channel-${activeChannelId}`;
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Drag to reply states
  const [draggedMessageId, setDraggedMessageId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [longPressTimeout, setLongPressTimeout] = useState<any>(null);

  // New responsive design & full-page view toggles states
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [mobileActiveView, setMobileActiveView] = useState<'sidebar' | 'chat'>('sidebar');
  const [channelsCollapsed, setChannelsCollapsed] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);
  const [messagingSubView, setMessagingSubView] = useState<'chat' | 'channels' | 'directory'>('chat');

  // Real-time notification/unread counts for channels and DMs
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({
    'team-general': 0,
    'team-collaboration': 2,
    'design-showcase': 1,
    'technical-support': 0,
    'u-admin-1': 1,
  });

  const prevMessagesCountRef = useRef<number>(0);

  useEffect(() => {
    const key = activeDmUser ? activeDmUser.id : activeChannelId;
    if (key) {
      setUnreadCounts(prev => ({
        ...prev,
        [key]: 0
      }));
    }
  }, [activeChannelId, activeDmUser]);

  useEffect(() => {
    if (messages.length > prevMessagesCountRef.current) {
      const newMessages = messages.slice(prevMessagesCountRef.current);
      if (prevMessagesCountRef.current > 0) {
        setUnreadCounts(prev => {
          const updated = { ...prev };
          newMessages.forEach(m => {
            if (m.senderId !== currentUser.id) {
              const msgKey = m.channelId || m.senderId;
              const activeKey = activeDmUser ? activeDmUser.id : activeChannelId;
              if (msgKey && msgKey !== activeKey) {
                updated[msgKey] = (updated[msgKey] || 0) + 1;
              }
            }
          });
          return updated;
        });
      }
      prevMessagesCountRef.current = messages.length;
    }
  }, [messages, activeChannelId, activeDmUser, currentUser.id]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatStreamRef = useRef<HTMLDivElement>(null);

  const loadMessages = () => {
    setMessages(db.getMessages());
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    loadMessages();
    const interval = setInterval(loadMessages, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll typing statuses
  useEffect(() => {
    const checkTyping = () => {
      // Filter out the current user
      const users = db.getTypingUsers(chatStatusId).filter(name => name !== currentUser.name);
      setTypingUsers(users);
    };
    checkTyping();
    const typingInterval = setInterval(checkTyping, 1000);
    return () => clearInterval(typingInterval);
  }, [chatStatusId, currentUser.name]);

  // Set local typing status based on input keypress
  useEffect(() => {
    if (typedMsg.trim()) {
      db.setTypingStatus(chatStatusId, currentUser.id, currentUser.name, true);
      const timer = setTimeout(() => {
        db.setTypingStatus(chatStatusId, currentUser.id, currentUser.name, false);
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      db.setTypingStatus(chatStatusId, currentUser.id, currentUser.name, false);
    }
  }, [typedMsg, chatStatusId, currentUser.id, currentUser.name]);

  useEffect(() => {
    if (chatStreamRef.current) {
      chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
    }
  }, [messages, activeChannelId, activeDmUser, typingUsers]);

  // Touch & Mouse Drag to swipe-to-reply handling
  const handleTouchStart = (msgId: string, clientX: number) => {
    setDraggedMessageId(msgId);
    setDragStartX(clientX);
    setDragOffset(0);
  };

  const handleTouchMove = (clientX: number) => {
    if (!draggedMessageId) return;
    const deltaX = clientX - dragStartX;
    // Allow slide right on left messages, slide left on right messages
    setDragOffset(Math.max(-80, Math.min(80, deltaX)));
  };

  const handleTouchEnd = (msg: Message) => {
    if (!draggedMessageId) return;
    if (Math.abs(dragOffset) > 55) {
      setReplyTo({
        id: msg.id,
        senderName: msg.senderName,
        content: msg.content
      });
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
    }, 700); // 700ms threshold for tap & hold / long-press
    setLongPressTimeout(timeout);
  };

  const handlePressEnd = (msg: Message) => {
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

    const messagePayload: Omit<Message, 'id' | 'encryptedContent' | 'isEncrypted' | 'algorithm'> = {
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      content: typedMsg || `Sent an attachment: ${attachment?.name}`,
      timestamp: new Date().toISOString()
    };

    if (activeDmUser) {
      messagePayload.receiverId = activeDmUser.id;
    } else {
      messagePayload.channelId = activeChannelId;
    }

    if (attachment) {
      messagePayload.attachmentUrl = attachment.url;
      messagePayload.attachmentName = attachment.name;
      messagePayload.attachmentType = attachment.type;
    }

    if (replyTo) {
      messagePayload.replyToId = replyTo.id;
      messagePayload.replyToSender = replyTo.senderName;
      messagePayload.replyToText = replyTo.content;
    }

    db.addMessage(messagePayload);
    setTypedMsg('');
    setAttachment(null);
    setReplyTo(null);
    db.setTypingStatus(chatStatusId, currentUser.id, currentUser.name, false);
    loadMessages();

    // Trigger instant notifications
    if (activeDmUser) {
      db.addNotification({
        userId: activeDmUser.id,
        title: 'New Secure DM Received',
        message: `${currentUser.name} shared a workspace message with you.`,
        type: 'message'
      });
    } else {
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

  const handleReaction = (msgId: string, emoji: string) => {
    db.addMessageReaction(msgId, emoji, currentUser.id);
    loadMessages();
    setActiveEmojiPickerId(null);
  };

  const usersList = db.getUsers().filter(u => u.id !== currentUser.id);
  const trainers = usersList.filter(u => u.role === 'trainer');
  const students = usersList.filter(u => u.role === 'student');
  const displayDms = usersList;

  // Filter messages based on active context
  const filteredMessages = messages.filter(m => {
    if (activeDmUser) {
      return (m.senderId === currentUser.id && m.receiverId === activeDmUser.id) ||
             (m.senderId === activeDmUser.id && m.receiverId === currentUser.id);
    } else {
      return m.channelId === activeChannelId;
    }
  });

  // Scroll to targeted replied message
  const handleScrollToMessage = (id: string) => {
    const el = document.getElementById(`dm-msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-zinc-100', 'ring-2', 'ring-amber-300', 'duration-300');
      setTimeout(() => {
        el.classList.remove('bg-zinc-100', 'ring-2', 'ring-amber-300');
      }, 1500);
    }
  };

  const isChannelsExpanded = !isMobile || !channelsCollapsed;
  const isDmsExpanded = !isMobile || !dmsCollapsed;

  if (messagingSubView === 'channels') {
    return (
      <ChannelsExplore
        activeChannelId={activeChannelId}
        activeDmUser={activeDmUser}
        onChannelSelect={(chanId) => {
          setActiveChannelId(chanId);
          setActiveDmUser(null);
          setReplyTo(null);
          setAttachment(null);
          setMessagingSubView('chat');
          if (isMobile) {
            setMobileActiveView('chat');
          }
        }}
        onBack={() => setMessagingSubView('chat')}
      />
    );
  }

  if (messagingSubView === 'directory') {
    return (
      <WorkspaceDirectory
        currentUser={currentUser}
        usersList={usersList}
        onSelectUser={(u) => {
          setActiveDmUser(u);
          setActiveChannelId('');
          setReplyTo(null);
          setAttachment(null);
          setMessagingSubView('chat');
          if (isMobile) {
            setMobileActiveView('chat');
          }
        }}
        onBack={() => setMessagingSubView('chat')}
      />
    );
  }

  return (
    <div id="messaging-root" className="max-w-7xl mx-auto px-4 py-6 select-none">
      <div className="rounded-3xl p-[1px] bg-gradient-to-tr from-zinc-300 via-brand-yellow/80 to-zinc-300 shadow-xs">
        <div id="messaging-layout-grid" className="grid grid-cols-1 md:grid-cols-4 rounded-[calc(1.5rem-1px)] overflow-hidden bg-white min-h-[500px]">
        
        {/* Left Sidebar Pane */}
        <div 
          id="messaging-sidebar" 
          className={`col-span-1 md:col-span-1 border-r border-zinc-150 flex-col justify-between bg-zinc-50/40 p-4 shrink-0 ${
            mobileActiveView !== 'sidebar' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="space-y-6">
            
            {/* Discussions Section */}
            <div>
              <button
                type="button"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setChannelsCollapsed(!channelsCollapsed);
                  }
                }}
                className="w-full text-left flex items-center justify-between transition-all select-none hover:bg-zinc-150/50 p-2 rounded-xl border border-zinc-200 bg-white cursor-pointer md:hover:bg-transparent md:p-0 md:rounded-none md:border-0 md:bg-transparent md:cursor-default"
              >
                <h3 className="text-[10px] uppercase font-semibold text-brand-black tracking-wider flex items-center gap-1.5 font-light">
                  <Users size={12} className="text-zinc-400" /> Shared Channels
                </h3>
                <span className="text-zinc-450 md:hidden">
                  {channelsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </span>
              </button>
 
               {isChannelsExpanded && (
                <div className="space-y-1 text-xs font-light mt-2 animate-in fade-in duration-150">
                  {ALL_CHANNELS.slice(0, 3).map(chan => {
                    const isSelected = !activeDmUser && activeChannelId === chan.id;
                    const count = unreadCounts[chan.id] || 0;
                    return (
                      <button
                        key={chan.id}
                        id={`channel-${chan.id}`}
                        onClick={() => {
                          setActiveChannelId(chan.id);
                          setActiveDmUser(null);
                          setReplyTo(null);
                          setAttachment(null);
                          if (window.innerWidth < 768) {
                            setMobileActiveView('chat');
                          }
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-brand-black text-white font-medium shadow-xs'
                            : 'text-zinc-600 hover:bg-zinc-100/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className={isSelected ? 'text-brand-yellow text-xs font-bold' : 'text-zinc-400 text-xs font-bold'}>#</span>
                          <span className="truncate">{chan.label}</span>
                        </div>
                        {count > 0 && (
                          <span className="bg-brand-yellow text-brand-black text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center shrink-0 shadow-3xs">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  
                  <button
                    type="button"
                    onClick={() => setMessagingSubView('channels')}
                    className="text-[10px] text-zinc-500 hover:text-brand-black font-semibold cursor-pointer underline hover:no-underline transition-all block mt-2 text-center w-full"
                  >
                    View More Channels
                  </button>
                </div>
              )}
            </div>
 
            {/* Direct Messages Section */}
            <div>
              <button
                type="button"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setDmsCollapsed(!dmsCollapsed);
                  }
                }}
                className="w-full text-left flex items-center justify-between transition-all select-none hover:bg-zinc-150/50 p-2 rounded-xl border border-zinc-200 bg-white cursor-pointer md:hover:bg-transparent md:p-0 md:rounded-none md:border-0 md:bg-transparent md:cursor-default"
              >
                <h3 className="text-[10px] uppercase font-semibold text-brand-black tracking-wider flex items-center gap-1.5 font-light">
                  <UserCheck size={12} className="text-zinc-400" /> Professional DMs
                </h3>
                <span className="text-zinc-450 md:hidden">
                  {dmsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </span>
              </button>
              
               {isDmsExpanded && (
                <div className="space-y-1 text-xs font-light mt-2 animate-in fade-in duration-150">
                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {displayDms.slice(0, 3).map(u => {
                      const isSelected = activeDmUser?.id === u.id;
                      const count = unreadCounts[u.id] || 0;
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            setActiveDmUser(u);
                            setReplyTo(null);
                            setAttachment(null);
                            if (window.innerWidth < 768) {
                              setMobileActiveView('chat');
                            }
                          }}
                          className={`w-full text-left p-2 rounded-xl transition-all flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-brand-black text-white font-medium shadow-xs'
                              : 'text-zinc-600 hover:bg-zinc-100/60'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-5 h-5 rounded-full bg-zinc-200 font-bold overflow-hidden shadow-2xs shrink-0 bg-white">
                              {u.avatar ? (
                                <img src={u.avatar} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full bg-brand-black text-white flex items-center justify-center text-[10px] font-bold uppercase">
                                  {u.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <span className="truncate">{u.name}</span>
                          </div>
                          {count > 0 && (
                            <span className="bg-brand-yellow text-brand-black text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center shrink-0 shadow-3xs">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {displayDms.length === 0 && (
                      <p className="text-[10px] text-zinc-400 italic p-2 text-center">No platform members available.</p>
                    )}
                  </div>
 
                   <button
                    type="button"
                    onClick={() => setMessagingSubView('directory')}
                    className="text-[10px] text-zinc-500 hover:text-brand-black font-semibold cursor-pointer underline hover:no-underline transition-all block mt-2 text-center w-full"
                  >
                    View More Directory
                  </button>
                </div>
              )}
            </div>
 
          </div>
        </div>
 
        {/* Dynamic Chat Main Pane */}
        <div 
          id="messaging-main-chat" 
          className={`col-span-1 md:col-span-3 flex-col justify-between ${
            mobileActiveView !== 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          
          {/* Active Banner Name */}
          <div id="chat-header-bar" className="border-b border-zinc-150 px-6 py-4 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileActiveView('sidebar')}
                className="md:hidden mr-2 p-1 text-zinc-500 hover:text-black transition-colors"
                title="Back to lists"
              >
                <ArrowLeft size={16} />
              </button>
              <MessageSquare size={16} className="text-brand-yellow" />
              <h3 className="text-sm font-light tracking-tight text-brand-black">
                Active Hub: <span className="font-semibold">{activeDmUser ? activeDmUser.name : `#${activeChannelId === 'team-general' ? 'cohort-general' : activeChannelId === 'team-collaboration' ? 'team-active-horizon' : activeChannelId}`}</span>
              </h3>
            </div>
            <span className="text-[10px] text-emerald-500 font-sans flex items-center gap-1 bg-emerald-50/60 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> secure connection
            </span>
          </div>

          {/* Messages list */}
          <div 
            ref={chatStreamRef} 
            id="chat-stream-panel" 
            className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[380px] bg-zinc-50/20"
            onMouseMove={(e) => handleTouchMove(e.clientX)}
            onMouseUp={() => { if (draggedMessageId) setDraggedMessageId(null); }}
          >
            {filteredMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 font-light text-xs gap-1 py-10">
                <Unlock size={20} className="text-zinc-300" />
                <p>No messages found in this chat.</p>
                <p className="text-[10px] text-zinc-300">Tap and hold to react with emoji, drop files, or drag to reply!</p>
              </div>
            ) : (
              filteredMessages.map((msg, idx) => {
                const isMine = msg.senderId === currentUser.id;
                const messageReactions = msg.reactions || {};
                const hasReactions = Object.keys(messageReactions).length > 0;
                const isThisMessageDragged = draggedMessageId === msg.id;

                return (
                  <div
                    key={msg.id || `msg-${idx}`}
                    id={`dm-msg-${msg.id}`}
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
                    className={`flex items-start gap-3 max-w-[80%] group/msg relative select-none transition-shadow ${
                      isMine ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    {/* Sliding reply helper icon visually sliding behind as drag grows */}
                    {isThisMessageDragged && Math.abs(dragOffset) > 25 && (
                      <div className={`absolute top-1/2 -translate-y-1/2 text-brand-yellow font-bold flex items-center ${
                        dragOffset > 0 ? '-left-10' : '-right-10'
                      }`}>
                        <Reply size={16} className="animate-pulse" />
                      </div>
                    )}

                    {/* User profile avatar inside chat bubbles - loads live configuration */}
                    {(() => {
                      const sender = db.getUserById(msg.senderId);
                      const liveAvatar = sender?.avatar || msg.senderAvatar;
                      const liveName = sender?.name || msg.senderName;
                      return (
                        <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-zinc-200 shadow-xs">
                          {liveAvatar ? (
                            <img src={liveAvatar} alt="sender avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full bg-brand-black text-white flex items-center justify-center text-[10px] font-bold font-mono uppercase">
                              {liveName.charAt(0)}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="space-y-1.5 w-full">
                      <div className={`flex items-center gap-2 text-[10px] ${isMine ? 'justify-end' : ''}`}>
                        <span className="font-medium text-brand-black">{db.getUserById(msg.senderId)?.name || msg.senderName}</span>
                        <span className="text-zinc-400">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Display bubble */}
                      <div
                        className={`p-3.5 rounded-2xl text-xs font-light leading-relaxed font-sans relative ${
                          isMine
                            ? 'bg-brand-black text-white rounded-tr-none'
                            : 'bg-white border border-zinc-100 text-brand-black rounded-tl-none'
                        }`}
                      >
                        {/* Nested direct reply quote block */}
                        {msg.replyToId && (
                          <div 
                            onClick={() => handleScrollToMessage(msg.replyToId!)}
                            className={`p-2 rounded-xl text-[10.5px] font-light mb-2.5 border-l-2 text-left cursor-pointer transition-colors ${
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

                        {/* Attachment displays */}
                        {msg.attachmentUrl && (
                          <div className="mt-2 text-left">
                            {msg.attachmentType === 'image' ? (
                              <div className="relative rounded-lg overflow-hidden border border-zinc-100/50 max-w-sm group/thumb cursor-zoom-in">
                                <img 
                                  src={msg.attachmentUrl} 
                                  alt="attachment thumbnail" 
                                  className="max-h-48 object-cover rounded-lg w-full"
                                  onClick={() => setZoomedImage(msg.attachmentUrl || null)}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                  <ZoomIn size={16} className="text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="p-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-150 flex items-center justify-between gap-3 text-left transition-colors max-w-sm">
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

                        {/* Emoji Reactions display under bubble */}
                        {hasReactions && (
                          <div className={`flex flex-wrap gap-1 mt-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(messageReactions).map(([emoji, voters]) => {
                              const voterList = voters as string[];
                              const alreadyVoted = voterList.includes(currentUser.id);
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(msg.id, emoji)}
                                  className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full transition-colors font-mono ${
                                    alreadyVoted
                                      ? 'bg-brand-yellow text-brand-black border border-brand-yellow/30'
                                      : isMine 
                                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800' 
                                        : 'bg-zinc-50 border border-zinc-100 text-zinc-500 hover:bg-zinc-100'
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  <span className="font-semibold text-[8px]">{voterList.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Message Action Options row placed UNDER the message bubble contents (never overflows) */}
                        <div className={`flex items-center gap-3 mt-2.5 pt-2 border-t text-[10px] select-none ${
                          isMine 
                            ? 'border-white/10 text-zinc-300 justify-end' 
                            : 'border-zinc-100 text-zinc-400 justify-start'
                        }`}>
                          <button
                            type="button"
                            onClick={() => setReplyTo({ id: msg.id, senderName: msg.senderName, content: msg.content })}
                            className={`flex items-center gap-1 hover:text-amber-400 transition-colors cursor-pointer ${
                              isMine ? 'hover:text-white' : 'hover:text-black'
                            }`}
                            title="Reply to message"
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
                              title="React with Emoji"
                            >
                              <Smile size={11} /> <span>React</span>
                            </button>

                            {/* Standard Emojis selector list (opens up or down inside context) */}
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
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Typing indicator bar displaying who is typing right above user text fields */}
          {typingUsers.length > 0 && (
            <div className="px-6 py-1 text-[10px] text-zinc-400 bg-zinc-50 border-t border-zinc-100 flex items-center gap-1 font-mono italic animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping mr-1"></span>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}

          {/* Reply Reference Preview Banner bar */}
          {replyTo && (
            <div className="bg-amber-50/20 border-t border-brand-yellow/30 px-6 py-2 text-xs flex items-center justify-between gap-6">
              <div className="flex items-center gap-1.5 overflow-hidden text-brand-black text-[11px]">
                <Reply size={12} className="text-brand-yellow shrink-0" />
                <span className="font-semibold shrink-0">Replying to {replyTo.senderName}:</span>
                <span className="text-zinc-500 truncate lowercase font-mono italic">"{replyTo.content}"</span>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="text-zinc-400 hover:text-black shrink-0 font-semibold"
                title="Dismiss Reply"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Attachment upload previews */}
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
          <form id="secure-input-form" onSubmit={handleSend} className="p-4 border-t border-zinc-100 bg-white flex gap-2 items-center">
            
            {/* hidden upload input */}
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              onChange={handleFileChange}
              accept="image/*,application/pdf,application/zip,text/*" 
            />

            {/* trigger buttons */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-zinc-50 hover:bg-zinc-150 border border-zinc-100/80 rounded-xl transition-all cursor-pointer text-zinc-500 hover:text-black"
              title="Add Image or File attachment"
            >
              <Paperclip size={13} />
            </button>
            
            <input
              id="chat-typed-msg"
              value={typedMsg}
              onChange={(e) => setTypedMsg(e.target.value)}
              placeholder={attachment ? "Add caption to your attachment..." : "Send a secure message..."}
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

      {/* Lightbox zoomed-in Image Preview modal */}
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
