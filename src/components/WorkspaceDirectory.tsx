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
    <div id="messaging-directory-view" className="max-w-5xl mx-auto px-4 py-8 select-none">
      <button 
        onClick={onBack} 
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-black transition-colors font-semibold uppercase tracking-wider mb-6 cursor-pointer"
      >
        <ArrowLeft size={14} /> Back to Secure Chat Hub
      </button>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light tracking-tight text-brand-black">
            Who-is-Who <span className="font-semibold text-brand-yellow">on Sabicrest</span>
          </h2>
          <p className="text-xs text-zinc-500 font-light mt-1">
            Coordinate and start secure private direct messaging sessions with other members.
          </p>
        </div>
      </div>

      {/* Cordial Cooperation Advisory */}
      <div className="bg-amber-50/60 border border-brand-yellow/30 p-4 rounded-2xl mb-6 flex items-start gap-3 shadow-2xs">
        <Sparkles className="text-brand-yellow shrink-0 mt-0.5 animate-pulse" size={16} />
        <div>
          <h4 className="text-xs font-semibold text-brand-black mb-1">Sabicrest Cordial Communication Advisory</h4>
          <p className="text-[11px] text-zinc-600 leading-relaxed font-light">
            At Sabicrest, collaboration and design thrive on mutual respect. We kindly invite you to stay cordial, nice, and polite in your language while chatting with any of our members—whether they are a student, trainer, or administrator. Let's make our workspace exceptionally positive, empowering, and respectful!
          </p>
        </div>
      </div>

      {/* Filter Button & Search Bar Area */}
      <div className="bg-zinc-50 border border-zinc-150 rounded-2xl p-4 mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input
              type="text"
              placeholder="Search by name, email, skills, biography..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-zinc-200 rounded-xl pl-9 pr-4 py-2 text-xs text-brand-black placeholder-zinc-400 focus:outline-hidden focus:border-brand-yellow font-light shadow-2xs"
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
              className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 hover:text-black rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Categories Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-zinc-200/50">
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mr-1">Role:</span>
            {['all', 'admin', 'trainer', 'student'].map((role) => (
              <button
                key={role}
                onClick={() => {
                  setSelectedRole(role);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                  selectedRole === role
                    ? 'bg-brand-black text-white'
                    : 'bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200'
                }`}
              >
                {role === 'all' ? 'All Roles' : role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Joined:</span>
              <select
                value={joinedFilter}
                onChange={(e) => {
                  setJoinedFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white border border-zinc-200 text-[10px] font-semibold rounded-lg px-2 py-1 focus:outline-hidden focus:ring-1 focus:ring-brand-yellow text-zinc-600"
              >
                <option value="all">All Time</option>
                <option value="recent">Joined Recently</option>
                <option value="90days">Last 90 Days</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider font-light">Sort:</span>
              <select
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value as 'newest' | 'oldest');
                  setCurrentPage(1);
                }}
                className="bg-white border border-zinc-200 text-[10px] font-semibold rounded-lg px-2 py-1 focus:outline-hidden focus:ring-1 focus:ring-brand-yellow text-zinc-600"
              >
                <option value="newest">Newest Joined</option>
                <option value="oldest">Oldest Joined</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: 3 columns on desktop, 1 on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedUsers.map(u => {
          const isExpanded = expandedUserId === u.id;
          return (
            <motion.div 
              key={`${u.id}-${searchQuery}-${selectedRole}-${joinedFilter}-${sortOrder}-${currentPage}`} 
              onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`border rounded-3xl p-5 bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col cursor-pointer border-zinc-150 hover:border-zinc-350 ${
                isExpanded ? 'ring-2 ring-brand-yellow/30 border-zinc-250' : ''
              }`}
            >
              {/* Header block details: Avatar, Name, Role badge, Indicator chevron */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-zinc-200 bg-zinc-50 shrink-0 shadow-2xs bg-white">
                    {u.avatar ? (
                      <img src={u.avatar} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-brand-black text-white flex items-center justify-center font-bold text-sm uppercase">
                        {u.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    <h4 className="font-semibold text-brand-black text-sm truncate flex items-center gap-1.5">
                      <span>{u.name}</span>
                      {u.verified && <VerifiedBadge />}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 font-light">
                      <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        u.role === 'admin' 
                          ? 'bg-red-50 text-red-650' 
                          : u.role === 'trainer' 
                            ? 'bg-amber-50 text-amber-700' 
                            : 'bg-zinc-100 text-zinc-650'
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
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full text-[8.5px] font-semibold flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                        >
                          <MessageCircle size={9.5} className="fill-emerald-500/20 text-emerald-650" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      {u.slackHandle && (u.slackHandle.startsWith('http') || u.slackHandle.includes('.')) && (
                        <a
                          href={u.slackHandle.startsWith('http') ? u.slackHandle : `https://${u.slackHandle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="View Portfolio"
                          className="bg-brand-black hover:bg-zinc-800 text-brand-yellow font-bold border border-zinc-200 px-2 py-0.5 rounded-full text-[8.5px] flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                        >
                          <ExternalLink size={9.5} className="text-brand-yellow" />
                          <span>Portfolio</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-zinc-400 p-1">
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
              </div>

              {/* Collapsed view drops its other detail properties here */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-zinc-150 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="space-y-0.5">
                    <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-wider">Email Address</span>
                    <p className="text-xs text-brand-black font-mono truncate">
                      {obfuscateEmail(u.email, currentUser.role === 'trainer' || currentUser.role === 'admin')}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-wider">Status</span>
                      <p className="text-[11px] text-zinc-600 capitalize font-medium">{u.status || 'Active'}</p>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-wider">Joined Date</span>
                      <p className="text-[11px] text-zinc-600 font-mono font-medium">{u.joinedDate || '2026-01-01'}</p>
                    </div>
                  </div>

                  {(u.phone || u.slackHandle || u.location) && (
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-zinc-100/50">
                      {u.phone && (
                        <div>
                          <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-wider">WhatsApp</span>
                          <p className="text-[11px] text-zinc-600 font-mono truncate mt-0.5">
                            <a
                              href={`https://wa.me/${u.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-emerald-600 hover:underline inline-flex items-center gap-1 font-semibold"
                            >
                              <MessageCircle size={11} className="fill-emerald-500/20 text-emerald-600 shrink-0" />
                              <span>{u.phone}</span>
                            </a>
                          </p>
                        </div>
                      )}
                      {u.slackHandle && (
                        <div>
                          <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-wider">Portfolio / Business Link</span>
                          <p className="text-[11px] text-zinc-605 font-mono truncate mt-0.5">
                            {u.slackHandle.startsWith('http') || u.slackHandle.includes('.') ? (
                              <a
                                href={u.slackHandle.startsWith('http') ? u.slackHandle : `https://${u.slackHandle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-brand-yellow hover:underline inline-flex items-center gap-1 font-semibold break-all"
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
                    <div className="pt-2 border-t border-zinc-100/50">
                      <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-wider block mb-1">Key Competencies</span>
                      <div className="flex flex-wrap gap-1">
                        {u.skills.map((skill, index) => (
                          <span key={index} className="text-[9px] font-medium px-2 py-0.5 bg-zinc-50 border border-zinc-150 text-zinc-500 rounded-md">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {u.bio && (
                    <div className="pt-2 border-t border-zinc-100/50">
                      <span className="text-zinc-400 text-[9px] uppercase font-bold tracking-wider block mb-0.5 animate-pulse">Biography</span>
                      <p className="text-[10.5px] text-zinc-500 font-light leading-relaxed">
                        {u.bio.split('||pwd:')[0]}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectUser(u);
                        }}
                        className="flex-1 py-2 bg-brand-black hover:bg-zinc-900 text-white rounded-xl text-xs font-semibold tracking-wide transition-all uppercase cursor-pointer text-center flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare size={13} className="text-brand-yellow" />
                        <span>In-App Chat</span>
                      </button>
                      {u.phone ? (
                        <a
                          href={`https://wa.me/${u.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold tracking-wide transition-all uppercase text-center flex items-center justify-center gap-1.5 cursor-pointer no-underline"
                          title="Chat on WhatsApp"
                        >
                          <MessageCircle size={13} className="fill-white/10 text-white" />
                          <span>WhatsApp</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="flex-1 py-2 bg-zinc-100 text-zinc-400 rounded-xl text-xs font-medium uppercase tracking-wide cursor-not-allowed text-center flex items-center justify-center gap-1.5"
                          title="No WhatsApp number provided"
                        >
                          <MessageCircle size={13} className="text-zinc-300" />
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
                        className="w-full py-2 bg-zinc-50 hover:bg-zinc-100 text-brand-black border border-zinc-200 rounded-xl text-xs font-semibold tracking-wide transition-all uppercase text-center flex items-center justify-center gap-1.5 cursor-pointer no-underline"
                        title="View Portfolio"
                      >
                        <ExternalLink size={13} className="text-brand-yellow font-bold" />
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
          <p className="col-span-full py-16 text-center text-xs text-zinc-400 font-light italic bg-white border border-dashed border-zinc-200 rounded-2xl">No members found with matching filtration options.</p>
        )}
      </div>

      {/* Pagination Controls Block */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8 pt-4 border-t border-zinc-150">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="px-3.5 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-3xs"
          >
            Previous
          </button>
          <span className="text-xs text-zinc-500 font-mono">
            Page <span className="font-bold text-black">{currentPage}</span> of {totalPages}
            <span className="text-[10px] text-zinc-400 ml-1.5">({sortedUsers.length} matches)</span>
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="px-3.5 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-3xs"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
