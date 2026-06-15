/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, Team, TeamTask } from '../types';
import { db, getAdminEmails } from '../db';
import { CheckSquare, Square, Users, BookOpen, Layers, Plus, Save, Award } from 'lucide-react';

interface TeamCollaborationProps {
  currentUser: User;
}

export default function TeamCollaboration({ currentUser }: TeamCollaborationProps) {
  // Ensure we get the team the user belongs to
  const allTeams = db.getTeams() || [];
  const userTeam = allTeams.find(t => t?.members?.includes(currentUser.id)) || null;
  
  const [team, setTeam] = useState<Team | null>(userTeam);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [notepadContent, setNotepadContent] = useState(team?.sharedNotes || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!team) {
    return (
      <div id="team-collab-root" className="py-6 max-w-7xl mx-auto px-4 select-none">
        
        {/* Header Panel */}
        <div id="collab-header" className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-zinc-150 dark:border-zinc-800 pb-5">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold tracking-tight text-brand-black dark:text-white leading-tight font-sans">
              Collaboration
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light mt-1 max-w-2xl leading-relaxed">
              Synchronize on joint project tasks, divide task responsibilities, and edit research canvas boards.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl p-12 text-center text-zinc-400 font-light flex flex-col items-center gap-2 shadow-2xs">
          <Users size={40} className="text-zinc-300 dark:text-zinc-700 mb-2" />
          <h3 className="text-sm font-semibold tracking-tight text-brand-black dark:text-zinc-200 uppercase">No Active Team Found</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light max-w-md mx-auto leading-relaxed">
            You are not currently assigned to any joint collaboration teams in the database. Please contact an Administrator or Trainer to allocate you to a team.
          </p>
        </div>
      </div>
    );
  }

  const teamMembersDetails = db.getUsers().filter(u => team.members.includes(u.id)) || [];

  const handleToggleTask = (taskId: string) => {
    const updatedTasks = team.tasks.map(task => {
      if (task.id === taskId) {
        const nextStatus: TeamTask['status'] = task.status === 'done' ? 'todo' : 'done';
        return { ...task, status: nextStatus };
      }
      return task;
    });

    const updatedTeam = { ...team, tasks: updatedTasks };
    setTeam(updatedTeam);
    db.updateTeam(updatedTeam);

    // Write log & add notification
    db.addNotification({
      userId: 'all',
      title: 'Collaboration Task Updated',
      message: `A task in "${team.name}" was modified by ${currentUser.name}.`,
      type: 'message'
    });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const assignedName = taskAssignee || currentUser.name;
    const newTask: TeamTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle,
      assignedTo: assignedName,
      status: 'todo'
    };

    const updatedTeam = {
      ...team,
      tasks: [...team.tasks, newTask]
    };

    setTeam(updatedTeam);
    db.updateTeam(updatedTeam);
    setNewTaskTitle('');
    setTaskAssignee('');

    db.addNotification({
      userId: 'all',
      title: 'New Team Task Created',
      message: `${currentUser.name} added a collaborative task: "${newTaskTitle}".`,
      type: 'message'
    });

    // Targeted assignee notification
    const assigneeUser = db.getUsers().find(u => u.name === assignedName);
    if (assigneeUser && assigneeUser.id !== currentUser.id) {
      db.addNotification({
        userId: assigneeUser.id,
        title: 'New Task Assigned to You',
        message: `${currentUser.name} assigned the task "${newTaskTitle}" to you in team "${team.name}".`,
        type: 'schedule'
      });
    }

    // Support text-based mentions tagging e.g. @Chief Admin in titles
    db.getUsers().forEach(u => {
      const tagStr = `@${u.name}`;
      if (newTaskTitle.toLowerCase().includes(tagStr.toLowerCase()) && u.id !== currentUser.id && u.id !== assigneeUser?.id) {
        db.addNotification({
          userId: u.id,
          title: 'Tagged in a Workspace Task',
          message: `${currentUser.name} tagged you in a team task: "${newTaskTitle}"`,
          type: 'schedule'
        });
      }
    });
  };

  const handleSaveNotepad = () => {
    const updatedTeam = {
      ...team,
      sharedNotes: notepadContent
    };
    db.updateTeam(updatedTeam);
    setTeam(updatedTeam);
    
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);

    db.addNotification({
      userId: 'all',
      title: 'Collab Notebook Updated',
      message: `${currentUser.name} saved updates to the shared project canvas.`,
      type: 'message'
    });
  };

  return (
    <div id="team-collab-root" className="py-6 max-w-7xl mx-auto px-4 select-none">
      
      {/* Header Panel */}
      <div id="collab-header" className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-zinc-150 dark:border-zinc-800 pb-5">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold tracking-tight text-brand-black dark:text-white leading-tight font-sans">
            Collaboration
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light mt-1 max-w-2xl leading-relaxed">
            Synchronize on joint project tasks, divide task responsibilities, and edit research canvas boards.
          </p>
        </div>
      </div>

      <div id="collab-board-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Team Profile & Member Nodes */}
        <div id="collab-side-panel" className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs">
            <h3 className="text-xs font-semibold tracking-wider text-brand-black uppercase mb-4 flex items-center gap-1.5 font-light">
              <Layers size={12} className="text-brand-yellow" /> Active Crew Block
            </h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-[10px] uppercase font-semibold text-brand-gray block tracking-wide">Team Reference</span>
                <span className="text-lg font-light tracking-tight text-brand-black">{team.name}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-brand-gray block tracking-wide">Enterprise Project Focus</span>
                <p className="text-xs font-light text-brand-black leading-relaxed mt-0.5">{team.projectTitle}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-brand-gray block tracking-wide">Description</span>
                <p className="text-xs font-light text-zinc-500 leading-relaxed mt-0.5">{team.description}</p>
              </div>
            </div>

            {/* Members listings */}
            <div className="mt-6 pt-6 border-t border-zinc-50">
              <h4 className="text-[10px] uppercase font-semibold text-brand-black tracking-wider mb-3">Verified Participants ({teamMembersDetails.length})</h4>
              <div className="space-y-3">
                {teamMembersDetails.map(member => {
                  const adminEmails = getAdminEmails();
                  const isAdminEmail = adminEmails.includes(member.email?.trim().toLowerCase());
                  let displayedEmail = member.email;
                  if (isAdminEmail && member.email) {
                    const [local, domain] = member.email.split('@');
                    if (domain) {
                      displayedEmail = local.length <= 2 
                        ? `${local[0]}***@${domain}` 
                        : `${local[0]}***${local[local.length - 1]}@${domain}`;
                    }
                  }
                  return (
                    <div key={member.id} className="flex items-center gap-2.5">
                      <img src={member.avatar} alt="member avatar" className="w-7 h-7 rounded-full object-cover border border-zinc-100 referrerPolicy='no-referrer'" />
                      <div>
                        <div className="text-xs font-medium text-brand-black">{member.name}</div>
                        <div className="text-[9px] text-zinc-400 font-mono font-light uppercase tracking-wider">{displayedEmail}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-6">
            <h4 className="text-[10px] uppercase font-semibold text-brand-black tracking-wider mb-2 flex items-center gap-1">
              <Award size={10} className="text-brand-yellow" /> Joint Certification Option
            </h4>
            <p className="text-xs text-brand-gray font-light leading-relaxed">
              Once task completions hit 100%, tutors review workspace portfolios for fast-tracked team micro-degrees.
            </p>
          </div>
        </div>

        {/* Right Columns: Project Tasks & Live Notes Canvas */}
        <div id="collab-main-blocks" className="lg:col-span-2 space-y-8">
          
          {/* Project Tasks list */}
          <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-xs">
            <h3 className="text-xs font-semibold tracking-wider text-brand-black uppercase mb-4 flex items-center justify-between font-light">
              <span className="flex items-center gap-1.5"><CheckSquare size={13} className="text-brand-yellow" /> Task Roadmapping Grid</span>
              <span className="text-[10px] text-zinc-400 italic">Toggle checks when finalized</span>
            </h3>

            {/* New Task Add form */}
            <form onSubmit={handleAddTask} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 bg-zinc-50/50 p-4 rounded-xl border border-zinc-50">
              <div className="md:col-span-2">
                <input
                  id="task-input-title"
                  type="text"
                  placeholder="Draft new project task..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full text-xs font-light bg-white border border-zinc-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:border-brand-yellow"
                  required
                />
              </div>

              <div className="flex gap-2">
                <select
                  id="task-select-assignee"
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="flex-1 text-xs font-light bg-white border border-zinc-200 rounded-xl px-2 py-2"
                >
                  <option value="">Assignee...</option>
                  {teamMembersDetails.map(m => (
                    <option key={m.id} value={m.name}>{m.name.split(' ')[0]}</option>
                  ))}
                </select>

                <button
                  id="add-team-task-btn"
                  type="submit"
                  className="bg-brand-black hover:bg-zinc-900 text-white px-3.5 py-2 rounded-xl text-xs font-light cursor-pointer focus-ring"
                >
                  Launch
                </button>
              </div>
            </form>

            {/* Active task mapping */}
            <div className="space-y-1.5">
              {team.tasks.length === 0 ? (
                <div className="text-center text-zinc-400 font-light text-xs py-4">
                  No tasks defined. Add notes and assignments above.
                </div>
              ) : (
                team.tasks.map(task => {
                  const isDone = task.status === 'done';
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isDone
                          ? 'border-zinc-100 bg-zinc-50/50 text-zinc-400'
                          : 'border-zinc-100 hover:border-zinc-200 bg-white text-brand-black'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isDone ? (
                          <CheckSquare size={16} className="text-brand-yellow font-bold shrink-0" />
                        ) : (
                          <Square size={16} className="text-zinc-300 shrink-0" />
                        )}
                        <span className={`text-xs font-light tracking-wide ${isDone ? 'line-through' : ''}`}>
                          {task.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 font-mono text-[9px] uppercase">
                        <span className="bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">
                          @{task.assignedTo}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Shared design notebook canvas */}
          <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-semibold tracking-wider text-brand-black uppercase flex items-center gap-1.5 font-light">
                <BookOpen size={13} className="text-brand-yellow" /> Shared Research Canvas Notepad
              </h3>
              
              <button
                id="save-notepad-btn"
                onClick={handleSaveNotepad}
                className="flex items-center gap-1.5 bg-brand-black hover:bg-zinc-900 text-white rounded-xl text-[10px] tracking-wide uppercase px-3.5 py-2 font-light cursor-pointer shadow-xs focus-ring transition-all"
              >
                <Save size={11} className="text-brand-yellow" />
                {saveSuccess ? 'Saved Securely' : 'Commit Notes'}
              </button>
            </div>

            <textarea
              id="team-notes-textbox"
              value={notepadContent}
              onChange={(e) => setNotepadContent(e.target.value)}
              placeholder="Store research URLs, document templates, meeting checklists, and spatial grid configurations..."
              className="w-full min-h-60 text-xs font-mono font-light text-zinc-700 leading-relaxed bg-brand-light border border-zinc-100 rounded-2xl p-4 focus:outline-hidden focus:border-brand-yellow"
            ></textarea>
            
            <span className="text-[9px] text-zinc-400 italic font-mono block mt-2 text-right">
              Stored securely in cloud workspace storage.
            </span>
          </div>

        </div>
      </div>

    </div>
  );
}
