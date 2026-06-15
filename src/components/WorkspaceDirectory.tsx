/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, Sparkles, Search, ChevronDown, ChevronUp, MessageCircle, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { User } from '../types';
import VerifiedBadge from './VerifiedBadge';

const obfuscateEmail = (email: string, revealsRealEmail = false) => {
  if (!email) return '';
  if (revealsRealEmail) {
    return email;
  }
  const [local, domain] = email.split('@');
  if (!domain) return local;
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
};

interface WorkspaceDirectoryProps {
  currentUser: User;
  usersList: User[];
  onSelectUser: (user: User) => void;
  onBack: () => void;
}

export default function WorkspaceDirectory({
  currentUser,
  usersList,
  onSelectUser,
  onBack
}: WorkspaceDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [joinedFilter, setJoinedFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const itemsPerPage = 12;

  // We want to list all students, trainers or general members (including current user so they can view their own card details)
  const displayUsers = usersList;

  // Filter & Search application
  const filteredUsers = displayUsers.filter(u => {
    // 1. Role Filter
    if (selectedRole !== 'all' && u.role !== selectedRole) {
      return false;
    }

    // 2. Search Query (name, email, skills, bio)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const nameMatch = u.name.toLowerCase().includes(query);
      const emailMatch = u.email.toLowerCase().includes(query);
      const skillsMatch = u.skills?.some(s => s.toLowerCase().includes(query)) || false;
      const bioMatch = u.bio?.toLowerCase().includes(query) || false;
      if (!nameMatch && !emailMatch && !skillsMatch && !bioMatch) {
        return false;
      }
    }

    // 3. Joined Date filter
    if (joinedFilter !== 'all') {
      const joined = u.joinedDate ? new Date(u.joinedDate) : new Date(2026, 0, 1);
      const now = new Date('2026-06-01'); // Anchor to current year/month
      const diffMs = now.getTime() - joined.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (joinedFilter === 'recent') {
        return diffDays <= 45; // within 45 days
      }
      if (joinedFilter === '90days') {
        return diffDays <= 90; // within 90 days
      }
    }

    return true;
  });

  // Sorting
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const dateA = new Date(a.joinedDate || '2026-01-01').getTime();
    const dateB = new Date(b.joinedDate || '2026-01-01').getTime();
    if (sortOrder === 'newest') {
      return dateB - dateA;
    } else {
      return dateA - dateB;
    }
  });

  // Calculate pages
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const paginatedUsers = sortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div id="messaging-directory-view" className="max-w-5xl mx-auto px-4 py-10 select-none text-zinc-900 bg-transparent">
      <button 
        onClick={onBack} 
        className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-zinc-800 transition-colors font-mono uppercase tracking-widest mb-8 cursor-pointer"
      >
        <ArrowLeft size={13} strokeWidth={1.5} /> Back to Secure Chat Hub
      </button>

      <div className="mb-10 select-none">
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950">
          Who-is-Who <span className="text-[#FFCC00]">on Sabicrest</span>
        </h2>
        <p className="text-xs text-zinc-400 font-medium mt-1 leading-relaxed">
          Coordinate and start secure private direct messaging sessions with other members.
        </p>
      </div>

      {/* Cordial Cooperation Advisory */}
      <div className="bg-[#FAF6EE]/50 border border-[#FAF6EE]/80 p-5 rounded-[20px] mb-8 flex items-start gap-4 shadow-3xs animate-in fade-in duration-300">
        <Sparkles className="text-[#FFCC00] shrink-0 mt-0.5 animate-pulse" size={16} strokeWidth={1.5} />
        <div>
          <h4 className="text-xs font-semibold text-zinc-800 mb-1">Sabicrest Cordial Communication Advisory</h4>
          <p className="text-[11px] text-zinc-500 leading-relaxed font-light">
            At Sabicrest, collaboration and design thrive on mutual respect. We kindly invite you to stay cordial, nice, and polite in your language while chatting with any of our members—whether they are a student, trainer, or administrator. Let's make our workspace exceptionally positive, empowering, and respectful!
          </p>
        </div>
      </div>

      {/* Filter Button & Search Bar Area - Redesigned to isolated, floating card with a generous 28px border-radius and soft drop shadow */}
      <div className="bg-white rounded-[28px] p-6 mb-8 space-y-5 shadow-[0_15px_40px_rgba(0,0,0,0.015)]">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14} strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search by name, email, skills, biography..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-zinc-50/50 border border-zinc-150/80 rounded-full pl-11 pr-4 py-3 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-[#FFCC00]/50 focus:border-[#FFCC00] font-light transition-all"
            />
          </div>

          {/* Quick Clear Controls */}
          {(searchQuery || selectedRole !== 'all' || joinedFilter !== 'all' || sortOrder !== 'newest') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedRole('all');
                setJoinedFilter('all');
                setSortOrder('newest');
                setCurrentPage(1);
              }}
              className="px-5 py-3 bg-zinc-900 hover:bg-zinc-850 text-white rounded-full text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Categories Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pt-4 border-t border-zinc-100">
          {/* Role Filter Pills */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mr-1 select-none font-mono">Role:</span>
            {['all', 'admin', 'trainer', 'student'].map((role) => (
              <button
                key={role}
                onClick={() => {
                  setSelectedRole(role);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  selectedRole === role
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'bg-white text-zinc-500 border border-zinc-200/50 hover:bg-zinc-50 hover:text-zinc-850'
                }`}
              >
                {role === 'all' ? 'All Roles' : role}
              </button>
            ))}
          </div>

          {/* Joined Filter Pills */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mr-1 select-none font-mono">Joined:</span>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'recent', label: 'Recent' },
              { id: '90days', label: '90 Days' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setJoinedFilter(item.id);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  joinedFilter === item.id
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'bg-white text-zinc-500 border border-zinc-200/50 hover:bg-zinc-50 hover:text-zinc-850'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Sort Filter Pills */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mr-1 select-none font-mono">Sort:</span>
            {[
              { id: 'newest', label: 'Newest' },
              { id: 'oldest', label: 'Oldest' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSortOrder(item.id as 'newest' | 'oldest');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  sortOrder === item.id
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'bg-white text-zinc-500 border border-zinc-200/50 hover:bg-zinc-50 hover:text-zinc-850'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: 3 columns on desktop, 1 on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {paginatedUsers.map(u => {
          const isExpanded = expandedUserId === u.id;
          return (
            <motion.div 
              key={`${u.id}-${searchQuery}-${selectedRole}-${joinedFilter}-${sortOrder}-${currentPage}`} 
              onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.012)] hover:shadow-[0_15px_45px_rgba(0,0,0,0.035)] transition-all duration-300 flex flex-col cursor-pointer border-none select-none relative ${
                isExpanded ? 'ring-2 ring-[#FFCC00]/30 shadow-[0_15px_45px_rgba(0,0,0,0.045)]' : ''
              }`}
            >
              {/* Header block details: Avatar, Name, Role badge, Indicator chevron */}
              <div className="flex items-center justify-between gap-2 select-none">
                <div className="flex items-center gap-3.5 overflow-hidden">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-100 flex items-center justify-center shrink-0 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
                    {u.avatar ? (
                      <img src={u.avatar} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-zinc-100 text-zinc-400 font-semibold text-sm flex items-center justify-center uppercase select-none font-sans">
                        {u.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    <h4 className="font-extrabold text-zinc-950 text-sm truncate flex items-center gap-1.5 font-sans">
                      <span>{u.name}</span>
                      {u.verified && <VerifiedBadge />}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 font-light">
                      <span className={`font-semibold text-[8.5px] tracking-wider uppercase px-2.5 py-1 rounded-[8px] select-none ${
                        u.role === 'admin' 
                          ? 'bg-[#FDF2F2] text-[#A64B4B]' 
                          : u.role === 'trainer' 
                            ? 'bg-[#FAF6EE] text-[#8C6D2B]' 
                            : 'bg-zinc-100/80 text-zinc-500'
                      }`}>
                        {u.role}
                      </span>
                      {u.phone && (
                        <a
                          href={`https://wa.me/${u.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Chat on WhatsApp"
                          className="bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-600 border border-emerald-100/50 px-2 py-0.5 rounded-[6px] text-[8.5px] font-semibold flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                        >
                          <MessageCircle size={9.5} className="fill-emerald-500/10 text-emerald-600" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-zinc-400 p-1">
                  {isExpanded ? <ChevronUp size={15} strokeWidth={1.5} /> : <ChevronDown size={15} strokeWidth={1.5} />}
                </div>
              </div>

              {/* Collapsed view drops its other detail properties here */}
              {isExpanded && (
                <div className="mt-5 space-y-5 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="space-y-0.5">
                    <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-wider font-mono">Email Address</span>
                    <p className="text-xs text-zinc-705 font-mono truncate">
                      {obfuscateEmail(u.email, currentUser.role === 'trainer' || currentUser.role === 'admin')}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-wider font-mono">Status</span>
                      <p className="text-[11px] text-zinc-600 capitalize font-semibold mt-0.5">{u.status || 'Active'}</p>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-wider font-mono">Joined Date</span>
                      <p className="text-[11px] text-zinc-600 font-mono font-semibold mt-0.5">{u.joinedDate || '2026-01-01'}</p>
                    </div>
                  </div>

                  {(u.phone || u.slackHandle || u.location) && (
                    <div className="grid grid-cols-2 gap-3 text-xs pt-1.5">
                      {u.phone && (
                        <div>
                          <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-wider font-mono">WhatsApp</span>
                          <p className="text-[11px] text-zinc-650 font-mono truncate mt-0.5">
                            <a
                              href={`https://wa.me/${u.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-emerald-600 hover:underline inline-flex items-center gap-1 font-semibold"
                            >
                              <MessageCircle size={11} className="fill-emerald-500/10 text-emerald-600 shrink-0" />
                              <span>{u.phone}</span>
                            </a>
                          </p>
                        </div>
                      )}
                      {u.slackHandle && (
                        <div>
                          <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-wider font-mono">Portfolio / Business Link</span>
                          <p className="text-[11px] text-zinc-600 font-mono truncate mt-0.5">
                            {u.slackHandle.startsWith('http') || u.slackHandle.includes('.') ? (
                              <a
                                href={u.slackHandle.startsWith('http') ? u.slackHandle : `https://${u.slackHandle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-zinc-850 underline hover:text-[#8C6D2B] inline-flex items-center gap-1 font-semibold break-all"
                              >
                                {u.slackHandle.replace(/https?:\/\/(www\.)?/, '')}
                              </a>
                            ) : (
                              u.slackHandle
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {u.skills && u.skills.length > 0 && (
                    <div className="space-y-1 mt-1">
                      <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-wider block font-mono">Key Competencies</span>
                      <div className="flex flex-wrap gap-1">
                        {u.skills.map((skill, index) => (
                          <span key={index} className="text-[9px] font-semibold px-2.5 py-1 bg-zinc-50 border border-zinc-150/50 text-zinc-600 rounded-lg">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {u.bio && (
                    <div className="space-y-1 mt-1">
                      <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-wider block font-mono">Biography</span>
                      <p className="text-[10.5px] text-zinc-500 font-normal leading-relaxed">
                        {u.bio.split('||pwd:')[0]}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 w-full pt-1.5">
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectUser(u);
                        }}
                        className="flex-1 py-3 h-11 bg-zinc-950 hover:bg-zinc-900 text-white rounded-full text-xs font-semibold tracking-wider uppercase cursor-pointer text-center flex items-center justify-center gap-1.5 transition-all outline-none"
                      >
                        <MessageSquare size={13} className="text-[#FFCC00]" strokeWidth={1.8} />
                        <span>In-App Chat</span>
                      </button>
                      {u.phone ? (
                        <a
                          href={`https://wa.me/${u.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 py-3 h-11 bg-transparent hover:bg-zinc-50 text-zinc-700 rounded-full text-xs font-semibold tracking-wider uppercase border border-zinc-200/60 text-center flex items-center justify-center gap-1.5 cursor-pointer no-underline transition-all"
                          title="Chat on WhatsApp"
                        >
                          <MessageCircle size={13} strokeWidth={1.5} className="text-zinc-505" />
                          <span>WhatsApp</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="flex-1 py-3 h-11 bg-transparent text-zinc-400 rounded-full text-xs font-semibold tracking-wider uppercase border border-zinc-100/40 cursor-not-allowed text-center flex items-center justify-center gap-1.5 select-none"
                          title="No WhatsApp number provided"
                        >
                          <MessageCircle size={13} strokeWidth={1.5} className="text-zinc-300" />
                          <span>No WhatsApp</span>
                        </button>
                      )}
                    </div>
                    {u.slackHandle && (u.slackHandle.startsWith('http') || u.slackHandle.includes('.')) && (
                      <a
                        href={u.slackHandle.startsWith('http') ? u.slackHandle : `https://${u.slackHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full py-2.5 bg-transparent hover:bg-zinc-50 text-zinc-650 border border-zinc-200/40 rounded-full text-xs font-semibold tracking-wider uppercase text-center flex items-center justify-center gap-1.5 cursor-pointer no-underline transition-all"
                        title="View Portfolio"
                      >
                        <ExternalLink size={13} strokeWidth={1.5} className="text-zinc-400" />
                        <span>View Portfolio</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
        {paginatedUsers.length === 0 && (
          <p className="col-span-full py-16 text-center text-xs text-zinc-400 font-light italic bg-white rounded-[24px] shadow-3xs border-none">No members found with matching filtration options.</p>
        )}
      </div>

      {/* Pagination Controls Block */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-10 pt-6">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="px-4 py-2 rounded-full border border-zinc-200/50 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-3xs"
          >
            Previous
          </button>
          <span className="text-xs text-zinc-400 font-mono">
            Page <span className="font-bold text-zinc-800">{currentPage}</span> of {totalPages}
            <span className="text-[10px] text-zinc-400 ml-1.5">({sortedUsers.length} matches)</span>
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="px-4 py-2 rounded-full border border-zinc-200/50 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-3xs"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
