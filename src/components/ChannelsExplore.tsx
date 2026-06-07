/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { User } from '../types';

interface ChannelsExploreProps {
  activeChannelId: string;
  activeDmUser: User | null;
  onChannelSelect: (chanId: string) => void;
  onBack: () => void;
}

export const ALL_CHANNELS = [
  { id: 'team-general', label: 'cohort-general', desc: 'General chatter, major announcements, guidelines, and introductions.' },
  { id: 'team-collaboration', label: 'team-active-horizon', desc: 'Secure workspace for collaborative projects, group milestones, and team tasks.' },
  { id: 'design-showcase', label: 'design-showcase', desc: 'Present and critique high-fidelity Figma links, design prototypes, and concept sketches.' },
  { id: 'technical-support', label: 'technical-support', desc: 'Troubleshoot developer environments, Appwrite sandbox credentials, and database settings.' }
];

export default function ChannelsExplore({
  activeChannelId,
  activeDmUser,
  onChannelSelect,
  onBack
}: ChannelsExploreProps) {
  return (
    <div id="messaging-channels-view" className="max-w-4xl mx-auto px-4 py-8 select-none text-brand-black dark:text-white">
      <button 
        onClick={onBack} 
        className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors font-semibold uppercase tracking-wider mb-6 cursor-pointer"
      >
        <ArrowLeft size={14} /> Back to Secure Chat Hub
      </button>

      <div className="mb-8">
        <h2 className="text-2xl font-light tracking-tight text-brand-black dark:text-white">
          Sabicrest <span className="font-semibold text-brand-yellow">Explore Channels</span>
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-300 font-light mt-1">
          Join dynamic, highly secure group chats representing tailored collaborative groupings.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ALL_CHANNELS.map(chan => {
          const isActive = !activeDmUser && activeChannelId === chan.id;
          return (
            <div 
              key={chan.id} 
              className={`border rounded-3xl p-6 bg-white/90 dark:bg-black/75 dark:backdrop-blur-md shadow-xs transition-all flex flex-col justify-between ${
                isActive ? 'border-brand-yellow ring-4 ring-brand-yellow/10' : 'border-zinc-150 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-1.5">
                  <span className="text-brand-yellow font-bold text-lg">#</span>
                  <h4 className="font-bold text-brand-black dark:text-white text-sm">{chan.label}</h4>
                </div>
                <p className="text-zinc-500 dark:text-zinc-200 text-[11px] font-light leading-relaxed min-h-[44px] line-clamp-3">
                  {chan.desc}
                </p>
              </div>

              <button
                onClick={() => onChannelSelect(chan.id)}
                className="w-full py-2.5 bg-brand-black dark:bg-zinc-800 hover:bg-zinc-900 dark:hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold tracking-wide transition-all uppercase cursor-pointer text-center"
              >
                Enter Channel
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
