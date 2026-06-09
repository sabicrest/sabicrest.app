/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { db } from '../db';
import VerifiedBadge from './VerifiedBadge';
import ChannelsExplore from './ChannelsExplore';
import WorkspaceDirectory from './WorkspaceDirectory';
import { audio } from '../utils/audio';
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
  Sparkles,
  Edit3,
  Copy,
  Trash2,
  Share2,
  Search
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

  // States to hide precise DMs and handle DM pagination list size
  const [hiddenDmUserIds, setHiddenDmUserIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sabicrest_hidden_dms');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [dmLimit, setDmLimit] = useState(10);
  const [dmSearchQuery, setDmSearchQuery] = useState('');

  // Auto-unhide conversation when activeDmUser is programmatically selected (e.g. from directory)
  useEffect(() => {
    if (activeDmUser && hiddenDmUserIds.includes(activeDmUser.id)) {
      setHiddenDmUserIds(prev => {
        const next = prev.filter(id => id !== activeDmUser.id);
        localStorage.setItem('sabicrest_hidden_dms', JSON.stringify(next));
        return next;
      });
    }
  }, [activeDmUser]);

  const handleHideDm = (userId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm("Are you sure you want to hide this professional DM conversation? You can bring it back by messaging them from the users directory.")) {
      setHiddenDmUserIds(prev => {
        const next = prev.includes(userId) ? prev : [...prev, userId];
        localStorage.setItem('sabicrest_hidden_dms', JSON.stringify(next));
        return next;
      });
      if (activeDmUser?.id === userId) {
        setActiveDmUser(null);
      }
    }
  };
  
  // Advanced Messaging states
  const [replyTo, setReplyTo] = useState<{ id: string; senderName: string; content: string } | null>(null);
  const [activeEmojiPickerId, setActiveEmojiPickerId] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{ url: string; name: string; type: 'image' | 'file' } | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Active states for editing, copy notifications, forwarding, scrolling & read-view position
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [forwardingMsg, setForwardingMsg] = useState<Message | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasScrolledForSession, setHasScrolledForSession] = useState<string | null>(null);

  const chatKey = activeDmUser ? `dm-${activeDmUser.id}` : `channel-${activeChannelId}`;

  const [lastReadMessageMap, setLastReadMessageMap] = useState<{ [key: string]: string }>(() => {
    try {
      const saved = localStorage.getItem('sabicrest_last_read_map');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
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

  const prevMessagesCountRef = useRef<number>(0);
  const lastScrollStateRef = useRef<{
    chatKey: string | null;
    messageCount: number;
    lastMessageId: string | null;
  }>({
    chatKey: null,
    messageCount: 0,
    lastMessageId: null,
  });

  // Close emoji reaction picker when tapping/clicking outside
  useEffect(() => {
    function handleDocumentClick(event: Event) {
      if (activeEmojiPickerId) {
        const target = event.target as HTMLElement;
        const clickedTrigger = target.closest('[id^="react-trigger-"]');
        const clickedPicker = target.closest('[id^="emoji-picker-"]');
        if (!clickedTrigger && !clickedPicker) {
          setActiveEmojiPickerId(null);
        }
      }
    }
    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('touchstart', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('touchstart', handleDocumentClick);
    };
  }, [activeEmojiPickerId]);

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

  const lastMsgCountRef = useRef<number>(0);
  const isFirstMessagesLoad = useRef<boolean>(true);

  useEffect(() => {
    if (messages.length > 0) {
      if (isFirstMessagesLoad.current) {
        lastMsgCountRef.current = messages.length;
        isFirstMessagesLoad.current = false;
        return;
      }

      if (messages.length > lastMsgCountRef.current) {
        // Find newly appended messages
        const newMsgs = messages.slice(lastMsgCountRef.current);
        const hasIncomingMsg = newMsgs.some(m => m.senderId !== currentUser.id);
        if (hasIncomingMsg) {
          audio.playCurrentMessageSound();
        }
        lastMsgCountRef.current = messages.length;
      }
    }
  }, [messages, currentUser.id]);

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
    const sentMsgText = typedMsg; // Preserve for notifications
    setTypedMsg('');
    setAttachment(null);
    setReplyTo(null);
    db.setTypingStatus(chatStatusId, currentUser.id, currentUser.name, false);
    loadMessages();

    // Support text-based mentions tagging e.g. @Chief Admin inside chat messages
    db.getUsers().forEach(u => {
      const tagStr = `@${u.name}`;
      if (sentMsgText.toLowerCase().includes(tagStr.toLowerCase()) && u.id !== currentUser.id) {
        db.addNotification({
          userId: u.id,
          title: 'Tagged in Discussion',
          message: `${currentUser.name} tagged you in #${activeChannelId || 'chat'}: "${sentMsgText}"`,
          type: 'message'
        });
      }
    });

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
  
  // Professional DMs filter: only list conversations where messages actually exist with current user,
  // or if u is activeDmUser (so they can initiate a new conversation upon select from directory/search).
  // Also omit conversations hidden by the user, unless active.
  const displayDms = usersList.filter(u => {
    const hasMessages = messages.some(m => 
      (m.senderId === currentUser.id && m.receiverId === u.id) ||
      (m.senderId === u.id && m.receiverId === currentUser.id)
    );
    const isActive = activeDmUser?.id === u.id;
    const isHidden = hiddenDmUserIds.includes(u.id);
    return (hasMessages && !isHidden) || isActive;
  });

  const filteredDisplayDms = displayDms.filter(u => {
    const q = dmSearchQuery.trim().toLowerCase();
    if (!q) return true;

    // Filter by contact name
    const matchesName = u.name.toLowerCase().includes(q);
    if (matchesName) return true;

    // Filter by message content in the conversation with this user
    const hasMatchingMessage = messages.some(m => {
      const isExchanged = (m.senderId === currentUser.id && m.receiverId === u.id) ||
                          (m.senderId === u.id && m.receiverId === currentUser.id);
      return isExchanged && m.content && m.content.toLowerCase().includes(q);
    });
    return hasMatchingMessage;
  });

  // Filter messages based on active context
  const filteredMessages = messages.filter(m => {
    if (activeDmUser) {
      return (m.senderId === currentUser.id && m.receiverId === activeDmUser.id) ||
             (m.senderId === activeDmUser.id && m.receiverId === currentUser.id);
    } else {
      return m.channelId === activeChannelId;
    }
  });

  // Real-time notification/unread counts for channels and DMs
  const unreadCounts = React.useMemo(() => {
    const counts: { [key: string]: number } = {};
    
    // 1. Calculate for Channels
    const channels = ['team-general', 'team-collaboration', 'design-showcase', 'technical-support'];
    channels.forEach(chanId => {
      const channelMsgs = messages.filter(m => m.channelId === chanId && m.senderId !== currentUser.id);
      const lastReadId = lastReadMessageMap[`channel-${chanId}`];
      if (!lastReadId) {
        counts[chanId] = channelMsgs.length;
      } else {
        const idx = channelMsgs.findIndex(m => m.id === lastReadId);
        if (idx !== -1) {
          counts[chanId] = channelMsgs.slice(idx + 1).length;
        } else {
          const lastReadMsg = messages.find(m => m.id === lastReadId);
          if (lastReadMsg) {
            const lastReadTime = new Date(lastReadMsg.timestamp).getTime();
            counts[chanId] = channelMsgs.filter(m => new Date(m.timestamp).getTime() > lastReadTime).length;
          } else {
            counts[chanId] = channelMsgs.length;
          }
        }
      }
    });

    // 2. Calculate for DMs
    const users = db.getUsers();
    users.forEach(u => {
      const unreadDmMessages = messages.filter(m => m.senderId === u.id && m.receiverId === currentUser.id && m.read !== true);
      counts[u.id] = unreadDmMessages.length;
    });

    return counts;
  }, [messages, lastReadMessageMap, currentUser.id]);

  // Mark current chat as read instantly when active context or incoming messages update
  useEffect(() => {
    if (filteredMessages.length > 0) {
      const latestMsg = filteredMessages[filteredMessages.length - 1];
      setLastReadMessageMap(prev => {
        const next = { ...prev, [chatKey]: latestMsg.id };
        localStorage.setItem('sabicrest_last_read_map', JSON.stringify(next));
        return next;
      });
      if (activeDmUser) {
        db.markMessagesRead(activeDmUser.id, currentUser.id);
      }
    }
  }, [chatKey, filteredMessages.length, activeDmUser]);

  // Check if a message can be modified (sent by current user, under 10 minutes old)
  const canModifyMessage = (msg: Message) => {
    if (msg.senderId !== currentUser.id) return false;
    const msgTime = new Date(msg.timestamp).getTime();
    const tenMinutes = 10 * 60 * 1000;
    return (Date.now() - msgTime) < tenMinutes;
  };

  const handleSaveEdit = (msgId: string) => {
    if (!editingText.trim()) return;
    db.updateMessage(msgId, editingText);
    setEditingMsgId(null);
    loadMessages();
  };

  const handleCopyMessage = (msg: Message) => {
    navigator.clipboard.writeText(msg.content);
    setCopiedMsgId(msg.id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleDeleteMessage = (msgId: string) => {
    if (window.confirm("Are you sure you want to delete this secure message? This operation is irreversible and audited.")) {
      db.deleteMessage(msgId);
      loadMessages();
    }
  };

  // Mark all as read helper
  const markAllAsRead = () => {
    if (filteredMessages.length > 0) {
      const latestMsg = filteredMessages[filteredMessages.length - 1];
      setLastReadMessageMap(prev => {
        const next = { ...prev, [chatKey]: latestMsg.id };
        localStorage.setItem('sabicrest_last_read_map', JSON.stringify(next));
        return next;
      });
    }
  };

  // Scroll detection handler
  const handleScroll = () => {
    if (!chatStreamRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatStreamRef.current;
    const closeToBottom = scrollHeight - scrollTop - clientHeight <= 60;
    setIsNearBottom(closeToBottom);
    if (closeToBottom) {
      markAllAsRead();
    }
  };

  // Calculate position of last read to compute "next chats down" count
  const lastReadId = lastReadMessageMap[chatKey];
  const lastReadMsgIndex = lastReadId ? filteredMessages.findIndex(m => m.id === lastReadId) : -1;
  const nextChatsCount = lastReadMsgIndex !== -1 
    ? filteredMessages.slice(lastReadMsgIndex + 1).length 
    : 0;

  // Track chat selection changes to reset scroll session
  useEffect(() => {
    setHasScrolledForSession(null);
  }, [activeChannelId, activeDmUser]);

  // Initial and reactive scrolling with smart change protection to allow scrolling up at will
  useEffect(() => {
    if (filteredMessages.length === 0 || !chatStreamRef.current) {
      lastScrollStateRef.current = {
        chatKey,
        messageCount: 0,
        lastMessageId: null
      };
      return;
    }

    const currentCount = filteredMessages.length;
    const currentLastMsg = filteredMessages[currentCount - 1];
    const currentLastMsgId = currentLastMsg?.id || null;
    const prevState = lastScrollStateRef.current;

    // Case 1: Switching to a different chat context
    if (prevState.chatKey !== chatKey) {
      const lastId = lastReadMessageMap[chatKey];
      if (lastId) {
        const idx = filteredMessages.findIndex(m => m.id === lastId);
        if (idx !== -1) {
          const el = document.getElementById(`dm-msg-${lastId}`);
          if (el) {
            el.scrollIntoView({ block: 'center' });
          } else {
            chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
          }
        } else {
          chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
        }
      } else {
        chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
        markAllAsRead();
      }
      
      lastScrollStateRef.current = {
        chatKey,
        messageCount: currentCount,
        lastMessageId: currentLastMsgId
      };
      setHasScrolledForSession(chatKey);
      return;
    }

    // Case 2: New message arrivals (same chat content length/ID changed)
    if (prevState.messageCount !== currentCount || prevState.lastMessageId !== currentLastMsgId) {
      const isMyMessage = currentLastMsg?.senderId === currentUser.id;
      if (isMyMessage) {
        chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
      } else if (isNearBottom) {
        chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
      }

      lastScrollStateRef.current = {
        chatKey,
        messageCount: currentCount,
        lastMessageId: currentLastMsgId
      };
    }
    // We do NOT scroll on periodic polling/refresh, fulfilling the requirement of free scroll up at will!
  }, [filteredMessages, chatKey, currentUser.id, isNearBottom, lastReadMessageMap]);

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
    <div id="messaging-root" className="max-w-7xl mx-auto px-4 py-6 select-none text-brand-black dark:text-white">
      <div className="rounded-3xl p-[1px] bg-gradient-to-tr from-zinc-300 via-brand-yellow/80 to-zinc-300 dark:from-zinc-800 dark:via-brand-yellow/40 dark:to-zinc-800 shadow-xs">
        <div id="messaging-layout-grid" className="grid grid-cols-1 md:grid-cols-4 rounded-[calc(1.5rem-1px)] overflow-hidden bg-white/95 dark:bg-black min-h-[500px]">
        
        {/* Left Sidebar Pane */}
        <div 
          id="messaging-sidebar" 
          className={`col-span-1 md:col-span-1 border-b md:border-b-0 md:border-r border-brand-yellow/30 md:border-zinc-150 dark:border-zinc-850 flex-col justify-between bg-zinc-50/40 dark:bg-black p-4 shrink-0 ${
            mobileActiveView !== 'sidebar' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="space-y-5">
            
            {/* Modern Search bar for filtering active conversations */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-zinc-400" />
              <input
                id="conversation-search-input"
                type="text"
                placeholder="Search contact or message..."
                value={dmSearchQuery}
                onChange={(e) => setDmSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-brand-black dark:focus:border-brand-yellow/60 text-[11px] rounded-2xl pl-9 pr-8 py-2 focus:outline-hidden transition-all placeholder:text-zinc-400 font-light shadow-2xs text-brand-black dark:text-white"
              />
              {dmSearchQuery && (
                <button
                  type="button"
                  onClick={() => setDmSearchQuery('')}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-300 cursor-pointer"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Discussions Section */}
            <div>
              <button
                type="button"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setChannelsCollapsed(!channelsCollapsed);
                  }
                }}
                className="w-full text-left flex items-center justify-between transition-all select-none hover:bg-zinc-150/50 dark:hover:bg-zinc-800/40 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer md:hover:bg-transparent md:p-0 md:rounded-none md:border-0 md:bg-transparent md:cursor-default"
              >
                <h3 className="text-[10px] uppercase font-semibold text-brand-black dark:text-white tracking-wider flex items-center gap-1.5 font-light">
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
                            ? 'bg-brand-yellow text-brand-black font-semibold shadow-xs'
                            : 'text-zinc-600 dark:text-white hover:bg-zinc-150/40 dark:hover:bg-zinc-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className={isSelected ? 'text-brand-black text-xs font-bold' : 'text-zinc-400 dark:text-zinc-500 text-xs font-bold'}>#</span>
                          <span className="truncate">{chan.label}</span>
                        </div>
                        {count > 0 && (
                          <span className="bg-brand-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center shrink-0 shadow-3xs">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  
                  <button
                    type="button"
                    onClick={() => setMessagingSubView('channels')}
                    className="text-[10px] text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white font-semibold cursor-pointer underline hover:no-underline transition-all block mt-2 text-center w-full"
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
                 className="w-full text-left flex items-center justify-between transition-all select-none hover:bg-zinc-150/50 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer md:hover:bg-transparent md:p-0 md:rounded-none md:border-0 md:bg-transparent md:cursor-default"
              >
                <h3 className="text-[10px] uppercase font-semibold text-brand-black dark:text-white tracking-wider flex items-center gap-1.5 font-light font-sans">
                  <UserCheck size={12} className="text-zinc-400" /> Professional DMs
                </h3>
                <span className="text-zinc-450 md:hidden">
                  {dmsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </span>
              </button>
              
               {isDmsExpanded && (
                <div className="space-y-1 text-xs font-light mt-2 animate-in fade-in duration-150">

                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {filteredDisplayDms.slice(0, dmLimit).map(u => {
                      const isSelected = activeDmUser?.id === u.id;
                      const count = unreadCounts[u.id] || 0;
                      return (
                        <div
                          key={u.id}
                          className={`group w-full p-2 rounded-xl transition-all flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-brand-yellow text-brand-black font-semibold shadow-xs'
                              : 'text-zinc-650 dark:text-white hover:bg-zinc-150/40 dark:hover:bg-zinc-800/40'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDmUser(u);
                              setReplyTo(null);
                              setAttachment(null);
                              if (window.innerWidth < 768) {
                                setMobileActiveView('chat');
                              }
                            }}
                            className="flex-1 flex items-center gap-2 overflow-hidden text-left cursor-pointer"
                          >
                            <div className="w-5 h-5 rounded-full font-bold overflow-hidden shadow-2xs shrink-0 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
                              {u.avatar ? (
                                <img src={u.avatar} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full bg-brand-black text-white flex items-center justify-center text-[10px] font-bold uppercase">
                                  {u.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <span className="truncate text-xs font-light flex items-center gap-1">{u.name}{u.role === 'trainer' && u.verified && <VerifiedBadge />}</span>
                          </button>
                          
                          <div className="flex items-center gap-1.5 shrink-0">
                            {count > 0 && (
                              <span className="bg-brand-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center shrink-0 shadow-3xs">
                                {count}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleHideDm(u.id, e)}
                              className={`opacity-0 group-hover:opacity-100 p-0.5 rounded-md transition-all hover:scale-110 cursor-pointer ${
                                isSelected ? 'text-brand-black/60 hover:text-brand-black' : 'text-zinc-400 hover:text-red-500'
                              }`}
                              title="Hide conversation"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {filteredDisplayDms.length === 0 && (
                      <p className="text-[10px] text-zinc-400 italic p-2 text-center">No matching conversations found.</p>
                    )}
                  </div>

                  {filteredDisplayDms.length > dmLimit && (
                    <button
                      type="button"
                      onClick={() => setDmLimit(prev => prev + 10)}
                      className="text-[10px] text-brand-yellow hover:text-brand-black font-semibold cursor-pointer underline hover:no-underline transition-all block py-1.5 text-center w-full bg-brand-black/5 dark:bg-zinc-800/40 hover:bg-brand-yellow/15 rounded-lg mt-1"
                    >
                      Show More DMs (+10)
                    </button>
                  )}
 
                   <button
                    type="button"
                    onClick={() => setMessagingSubView('directory')}
                    className="text-[10px] text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white font-semibold cursor-pointer underline hover:no-underline transition-all block mt-2 text-center w-full"
                  >
                    View Sabicrest Users
                  </button>
                </div>
              )}
            </div>
 
          </div>
        </div>
 
        {/* Dynamic Chat Main Pane */}
        <div 
          id="messaging-main-chat" 
          className={`col-span-1 md:col-span-3 flex flex-col justify-between relative bg-white/90 dark:bg-black md:dark:bg-transparent ${
            mobileActiveView !== 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          
          {/* Active Banner Name */}
          <div id="chat-header-bar" className="border-b border-brand-yellow/30 md:border-zinc-150 dark:border-zinc-800/80 px-6 py-4 bg-white/30 dark:bg-black flex items-center justify-between text-brand-black dark:text-white">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileActiveView('sidebar')}
                className="md:hidden mr-2 p-1 text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
                title="Back to lists"
              >
                <ArrowLeft size={16} />
              </button>
              <h3 className="text-sm font-light tracking-tight text-brand-black dark:text-white">
                <span className="hidden md:inline">Active Hub: </span><span className="font-semibold inline-flex items-center gap-1">{activeDmUser ? activeDmUser.name : `#${activeChannelId === 'team-general' ? 'cohort-general' : activeChannelId === 'team-collaboration' ? 'team-active-horizon' : activeChannelId}`}{activeDmUser?.role === 'trainer' && activeDmUser?.verified && <VerifiedBadge />}</span>
              </h3>
            </div>
            <span className="text-[10px] text-emerald-550 dark:text-emerald-400 font-sans flex items-center gap-1 bg-emerald-50/60 dark:bg-emerald-950/25 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> online
            </span>
          </div>

          {/* Messages list */}
          <div 
            ref={chatStreamRef} 
            id="chat-stream-panel" 
            onScroll={handleScroll}
            className="flex-1 p-6 space-y-4 overflow-y-auto h-[440px] max-h-[50vh] bg-zinc-50/20 dark:bg-black/30"
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
                        <span className="font-medium text-brand-black dark:text-white flex items-center gap-1">{db.getUserById(msg.senderId)?.name || msg.senderName}{(() => {
                          const senderUser = db.getUserById(msg.senderId);
                          return senderUser?.role === 'trainer' && senderUser?.verified ? <VerifiedBadge /> : null;
                        })()}</span>
                        <span className="text-zinc-400 flex items-center gap-1 select-none">
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMine && !msg.channelId && (
                            <span className="flex items-center leading-none">
                              {msg.read ? (
                                <span className="text-sky-400 font-bold text-[13px] tracking-[-3px] mr-1" title="Read/Seen">✓✓</span>
                              ) : msg.delivered ? (
                                <span className="text-zinc-400 font-bold text-[13px] tracking-[-3px] mr-1" title="Delivered">✓✓</span>
                              ) : (
                                <span className="text-zinc-500 font-bold text-[11px]" title="Sent">✓</span>
                              )}
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Display bubble */}
                      <div
                        className={`p-3.5 rounded-2xl text-xs font-light leading-relaxed font-sans relative ${
                          isMine
                            ? 'bg-brand-black dark:bg-zinc-900 text-white rounded-tr-none border dark:border-zinc-800'
                            : 'bg-white dark:bg-black border border-zinc-150 dark:border-zinc-850 text-brand-black dark:text-white rounded-tl-none shadow-3xs'
                        }`}
                      >
                        {/* Nested direct reply quote block */}
                        {msg.replyToId && (
                          <div 
                            onClick={() => handleScrollToMessage(msg.replyToId!)}
                            className={`p-2 rounded-xl text-[10.5px] font-light mb-2.5 border-l-2 text-left cursor-pointer transition-colors ${
                              isMine 
                                ? 'bg-zinc-900 dark:bg-black border-brand-yellow text-zinc-300 dark:text-white hover:bg-zinc-800' 
                                : 'bg-zinc-50 dark:bg-black border-brand-yellow text-zinc-550 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                            }`}
                          >
                            <div className="flex items-center gap-1 font-semibold mb-0.5">
                              <CornerDownRight size={10} className="text-brand-yellow" />
                              <span>{msg.replyToSender}</span>
                            </div>
                            <p className="truncate lowercase font-mono">{msg.replyToText}</p>
                          </div>
                        )}

                        {editingMsgId === msg.id ? (
                          <div className="space-y-2 py-1">
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className={`w-full text-xs p-2 rounded-xl border font-light focus:outline-hidden ${
                                isMine 
                                  ? 'bg-zinc-900 border-zinc-700 text-white focus:border-brand-yellow' 
                                  : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-250 dark:border-zinc-800 text-black dark:text-white focus:border-brand-yellow'
                              }`}
                              rows={2}
                              autoFocus
                            />
                            <div className="flex gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => setEditingMsgId(null)}
                                className="px-2.5 py-1 text-[10px] bg-zinc-300/40 text-zinc-500 rounded-lg hover:bg-zinc-300 hover:text-black transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(msg.id)}
                                className="px-2.5 py-1 text-[10px] bg-brand-yellow text-brand-black rounded-lg hover:scale-105 transition-transform font-semibold font-sans cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}

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
                                        ? 'bg-zinc-900 dark:bg-zinc-950 border border-zinc-800 text-zinc-400 hover:bg-zinc-800' 
                                        : 'bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/60 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
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
                        <div className={`flex flex-wrap items-center gap-3 mt-2.5 pt-2 border-t text-[10px] select-none ${
                          isMine 
                            ? 'border-white/10 dark:border-zinc-700/40 text-zinc-300 justify-end' 
                            : 'border-zinc-100 dark:border-zinc-800 text-zinc-400 justify-start'
                        }`}>
                          <button
                            type="button"
                            onClick={() => setReplyTo({ id: msg.id, senderName: msg.senderName, content: msg.content })}
                            className={`flex items-center gap-1 hover:text-amber-400 transition-colors cursor-pointer ${
                              isMine ? 'hover:text-white' : 'hover:text-black dark:hover:text-zinc-200'
                            }`}
                            title="Reply to message"
                          >
                            <Reply size={11} /> <span>Reply</span>
                          </button>

                           <div className="relative">
                            <button
                              id={`react-trigger-${msg.id}`}
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
                              <div 
                                id={`emoji-picker-${msg.id}`}
                                className={`absolute bottom-6 bg-white dark:bg-zinc-800 border border-zinc-205 dark:border-zinc-700 rounded-full shadow-lg p-1.5 flex gap-1 z-30 animate-in zoom-in-50 duration-150 ${
                                  isMine ? 'right-0' : 'left-0'
                                }`}
                              >
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

                          {/* Quick Message Actions: Copy & Forward */}
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg)}
                            className={`flex items-center gap-1 hover:text-amber-400 transition-colors cursor-pointer ${
                              isMine ? 'hover:text-white' : 'hover:text-black'
                            }`}
                            title="Copy to Clipboard"
                          >
                            <Copy size={11} /> <span>{copiedMsgId === msg.id ? 'Copied' : 'Copy'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setForwardingMsg(msg)}
                            className={`flex items-center gap-1 hover:text-amber-400 transition-colors cursor-pointer ${
                              isMine ? 'hover:text-white' : 'hover:text-black'
                            }`}
                            title="Forward Message"
                          >
                            <Share2 size={11} /> <span>Forward</span>
                          </button>

                          {/* Conditional inline edit and delete based on authorship and 10min threshold */}
                          {canModifyMessage(msg) && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMsgId(msg.id);
                                  setEditingText(msg.content);
                                }}
                                className={`flex items-center gap-1 hover:text-amber-400 transition-colors cursor-pointer ${
                                  isMine ? 'hover:text-white' : 'hover:text-black'
                                }`}
                                title="Edit message"
                              >
                                <Edit3 size={11} /> <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="flex items-center gap-1 hover:text-red-500 text-red-400/80 transition-colors cursor-pointer"
                                title="Delete message"
                              >
                                <Trash2 size={11} /> <span>Delete</span>
                              </button>
                            </>
                          )}
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
            <div className="px-6 py-1 text-[10px] text-zinc-400 bg-zinc-50 dark:bg-zinc-950/20 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-1 font-mono italic animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping mr-1"></span>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}

          {/* Reply Reference Preview Banner bar */}
          {replyTo && (
            <div className="bg-amber-50/20 dark:bg-zinc-950/40 border-t border-brand-yellow/30 px-6 py-2 text-xs flex items-center justify-between gap-6">
              <div className="flex items-center gap-1.5 overflow-hidden text-brand-black dark:text-zinc-100 text-[11px]">
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

          {/* Floating next chats down unread countdown badge */}
          {nextChatsCount > 0 && !isNearBottom && (
            <div className="absolute right-6 bottom-20 z-20">
              <button
                type="button"
                onClick={() => {
                  if (chatStreamRef.current) {
                    chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
                    markAllAsRead();
                    setIsNearBottom(true);
                  }
                }}
                className="bg-brand-yellow hover:bg-brand-black text-brand-black hover:text-white px-4 py-2.5 rounded-full text-[11px] font-bold shadow-xl hover:shadow-2xl flex items-center gap-1.5 cursor-pointer transition-all border border-brand-yellow hover:border-black animate-bounce shrink-0"
              >
                <span>{nextChatsCount} unread chats below</span>
                <ChevronDown size={14} className="animate-pulse" />
              </button>
            </div>
          )}

          {/* Secure text submission box */}
          <form id="secure-input-form" onSubmit={handleSend} className="p-4 border-t border-brand-yellow/30 md:border-zinc-100 dark:border-zinc-800 bg-white/30 dark:bg-black flex gap-2 items-center">
            
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
              className="p-3 bg-zinc-50 dark:bg-black hover:bg-zinc-150 dark:hover:bg-zinc-900 border border-zinc-100/80 dark:border-zinc-800 rounded-xl transition-all cursor-pointer text-zinc-500 dark:text-zinc-300 hover:text-black dark:hover:text-white"
              title="Add Image or File attachment"
            >
              <Paperclip size={13} />
            </button>
            
            <input
              id="chat-typed-msg"
              value={typedMsg}
              onChange={(e) => setTypedMsg(e.target.value)}
              placeholder={attachment ? "Add caption to your attachment..." : "Send a secure message..."}
              className="flex-1 bg-brand-light dark:bg-black border border-zinc-105 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-805 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-hidden focus:border-brand-yellow dark:focus:border-brand-yellow transition-all"
            />
            
            <button
              id="chat-submit-btn"
              type="submit"
              className="bg-brand-black dark:bg-zinc-800 hover:bg-zinc-900 dark:hover:bg-zinc-700 text-white p-3 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 focus-ring"
            >
              <Send size={14} className="text-brand-yellow" />
            </button>
          </form>

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

      {/* Forward Message modal Dialog */}
      {forwardingMsg && (
        <div id="forward-modal" className="fixed inset-0 bg-brand-black/65 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-black rounded-3xl border border-zinc-150 dark:border-zinc-800 p-6 max-w-sm w-full mx-4 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-brand-black dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
                <Share2 size={13} className="text-brand-yellow" /> Forward Message
              </h3>
              <button 
                onClick={() => setForwardingMsg(null)}
                className="text-zinc-400 hover:text-black dark:hover:text-white p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-805 p-3 rounded-2xl text-[10.5px] text-zinc-500 dark:text-zinc-400 font-mono line-clamp-3 italic">
              "{forwardingMsg.content}"
            </div>

            <div className="space-y-3">
              <span className="text-[9.5px] uppercase font-bold tracking-wider text-zinc-400 block">Choose Destination:</span>
              
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest px-2 py-1">Channels</div>
                {ALL_CHANNELS.map(chan => (
                  <button
                    key={chan.id}
                    onClick={() => {
                      const payload = {
                        senderId: currentUser.id,
                        senderName: currentUser.name,
                        senderAvatar: currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
                        content: `[Forwarded]: ${forwardingMsg.content}`,
                        timestamp: new Date().toISOString(),
                        channelId: chan.id
                      };
                      db.addMessage(payload as any);
                      setForwardingMsg(null);
                      setActiveChannelId(chan.id);
                      setActiveDmUser(null);
                      loadMessages();
                    }}
                    className="w-full text-left px-2.5 py-2 hover:bg-brand-yellow/10 rounded-xl text-xs transition-colors flex items-center gap-1.5"
                  >
                    <span className="text-brand-yellow font-bold text-xs">#</span>
                    <span>{chan.label}</span>
                  </button>
                ))}

                <div className="text-[10px] font-semibold text-zinc-450 uppercase tracking-widest px-2 py-1 mt-2">Workspace DMs</div>
                {usersList.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      const payload = {
                        senderId: currentUser.id,
                        senderName: currentUser.name,
                        senderAvatar: currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
                        content: `[Forwarded]: ${forwardingMsg.content}`,
                        timestamp: new Date().toISOString(),
                        receiverId: u.id
                      };
                      db.addMessage(payload as any);
                      setForwardingMsg(null);
                      setActiveDmUser(u);
                      setActiveChannelId('');
                      loadMessages();
                    }}
                    className="w-full text-left px-2.5 py-2 hover:bg-brand-yellow/10 rounded-xl text-xs transition-colors flex items-center gap-2"
                  >
                    <div className="w-4 h-4 rounded-full overflow-hidden bg-zinc-150 border shrink-0">
                      {u.avatar ? (
                        <img src={u.avatar} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-[8px] bg-brand-black text-white flex items-center justify-center h-full w-full font-bold">{u.name.charAt(0)}</div>
                      )}
                    </div>
                    <span>{u.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
