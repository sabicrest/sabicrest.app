/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, ScheduleEvent } from '../types';
import { db } from '../db';
import { Calendar, Clock, Video, UserCheck, Plus, AlertCircle, Sparkles, Filter, CheckCircle2 } from 'lucide-react';

interface SchedulingProps {
  currentUser: User;
}

export default function Scheduling({ currentUser }: SchedulingProps) {
  const [events, setEvents] = useState<ScheduleEvent[]>(db.getEvents());
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  
  // New Booking State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('2026-05-30');
  const [newTime, setNewTime] = useState('14:00');
  const [newDuration, setNewDuration] = useState(30);
  const [newAttendeeId, setNewAttendeeId] = useState('team-general');
  const [newRoleType, setNewRoleType] = useState<'1-on-1' | 'office-hours' | 'team-review'>('1-on-1');

  const usersList = db.getUsers();
  // Get trainers for student booking, or students for trainer booking
  const trainers = usersList.filter(u => u.role === 'trainer');
  const students = usersList.filter(u => u.role === 'student');

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc) return;

    const hostUser = currentUser;
    // For student booking, target is the trainer; for trainer, target could be general or specific student
    const defaultMeet = `https://meet.google.com/sc-session-${Date.now().toString().slice(-4)}`;

    const eventPayload: Omit<ScheduleEvent, 'id'> = {
      title: newTitle,
      description: newDesc,
      date: newDate,
      time: newTime,
      durationMinutes: Number(newDuration),
      hostId: hostUser.id,
      hostName: hostUser.name,
      attendeeId: newAttendeeId,
      status: currentUser.role === 'student' ? 'pending' : 'confirmed', // student bookings pending tutor approval
      meetLink: defaultMeet,
      roleType: newRoleType
    };

    const newEvent = db.addEvent(eventPayload);
    setEvents(db.getEvents());
    
    // Trigger notification
    const recipientId = newAttendeeId === 'team-general' ? 'u-admin-1' : newAttendeeId;
    db.addNotification({
      userId: recipientId,
      title: 'New Session Scheduled',
      message: `${currentUser.name} has scheduled a session: "${newTitle}" for ${newDate} at ${newTime}.`,
      type: 'schedule'
    });

    // Reset values
    setNewTitle('');
    setNewDesc('');
    setShowAddModal(false);
  };

  const handleUpdateStatus = (eventId: string, status: 'confirmed' | 'cancelled') => {
    const target = events.find(e => e.id === eventId);
    if (target) {
      const updated = { ...target, status };
      db.updateEvent(updated);
      setEvents(db.getEvents());

      // Notify attendee
      db.addNotification({
        userId: target.hostId === currentUser.id ? target.attendeeId : target.hostId,
        title: `Session ${status === 'confirmed' ? 'Confirmed' : 'Cancelled'}`,
        message: `Your booking for "${target.title}" was marked ${status} by ${currentUser.name}.`,
        type: 'schedule'
      });
    }
  };

  // Determine user-specific appointments
  const filteredEvents = events.filter(e => {
    // Show event if user is host, or explicit attendee, or it is a general event (office-hours / general)
    const isParticipant = e.hostId === currentUser.id || e.attendeeId === currentUser.id || e.attendeeId === 'team-general' || currentUser.role === 'admin';
    if (!isParticipant) return false;

    if (filterType === 'all') return true;
    if (filterType === 'pending') return e.status === 'pending';
    if (filterType === 'confirmed') return e.status === 'confirmed';
    return e.roleType === filterType;
  });

  return (
    <div id="scheduling-root-container" className="py-6 max-w-7xl mx-auto px-4 select-none">
      
      {/* Header layout */}
      <div id="scheduler-header" className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-100 pb-6 mb-8 gap-4">
        <div id="scheduler-headline">
          <h2 className="text-2xl font-light tracking-tight text-brand-black flex items-center gap-2">
            <Calendar className="text-brand-yellow font-normal" size={22} />
            Built-In <span className="font-semibold">Scheduling Hub</span>
          </h2>
          <p className="text-xs font-light tracking-wide text-brand-gray uppercase mt-1">
            Secure video conferencing slots, office hours, and collaborative task reviews
          </p>
        </div>

        <button
          id="trigger-add-event-btn"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-brand-black hover:bg-zinc-900 text-white rounded-xl py-2.5 px-4 text-xs font-light tracking-wide uppercase transition-all cursor-pointer shadow-xs focus-ring"
        >
          <Plus size={14} className="text-brand-yellow" /> Launch Booking
        </button>
      </div>

      <div id="scheduler-layout-grid" className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left column filters sidebar */}
        <div id="scheduler-filters-box" className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-xs">
            <h3 className="text-xs font-semibold tracking-wider text-brand-black uppercase mb-4 flex items-center gap-1.5 font-light">
              <Filter size={12} className="text-brand-yellow" /> Filter Appointments
            </h3>
            
            <div className="flex flex-col gap-1.5 text-xs font-light text-zinc-600">
              {[
                { id: 'all', label: 'All Registered Events' },
                { id: 'pending', label: 'Pending Approvals' },
                { id: 'confirmed', label: 'Confirmed Sessions' },
                { id: '1-on-1', label: '1-on-1 Mentorship' },
                { id: 'office-hours', label: 'Trainers Open Hours' },
                { id: 'team-review', label: 'Collaborative Review' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFilterType(opt.id)}
                  className={`text-left px-3 py-2 rounded-lg transition-all ${
                    filterType === opt.id
                      ? 'bg-amber-5030 border-l-2 border-brand-yellow font-medium text-brand-black pl-4'
                      : 'hover:bg-zinc-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5">
            <h4 className="text-[10px] uppercase font-semibold text-brand-black tracking-wider mb-2 flex items-center gap-1">
              <UserCheck size={10} className="text-brand-yellow" /> Serverless Live Sync
            </h4>
            <p className="text-xs text-brand-gray font-light leading-relaxed">
              Appointments write directly to your encrypted table profile. Once approved, specialized serverless triggers automate calendar hooks.
            </p>
          </div>
        </div>

        {/* Right column content list */}
        <div id="scheduler-main-stream" className="lg:col-span-3 space-y-4">
          
          {filteredEvents.length === 0 ? (
            <div className="bg-white border border-zinc-100 rounded-2xl p-12 text-center text-zinc-400 font-light flex flex-col items-center gap-2">
              <AlertCircle size={28} className="text-zinc-300" />
              <p className="text-sm">No scheduled event slots found matching this filter criteria.</p>
              <p className="text-xs">Schedule a custom slot using the booking prompt button above.</p>
            </div>
          ) : (
            filteredEvents.map(event => (
              <div
                key={event.id}
                id={`event-item-${event.id}`}
                className="bg-white border border-zinc-100 rounded-2xl p-5 hover:border-zinc-200 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded font-medium ${
                      event.roleType === '1-on-1' ? 'bg-indigo-50 text-indigo-700' :
                      event.roleType === 'office-hours' ? 'bg-amber-100 text-amber-900' : 'bg-green-50 text-green-700'
                    }`}>
                      {event.roleType}
                    </span>

                    <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded font-semibold ${
                      event.status === 'confirmed' ? 'bg-emerald-50 text-emerald-800' :
                      event.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700 animate-pulse'
                    }`}>
                      {event.status}
                    </span>
                  </div>

                  <h3 className="text-base font-light tracking-tight text-brand-black leading-tight">
                    {event.title}
                  </h3>
                  
                  <p className="text-xs text-brand-gray font-light leading-relaxed">
                    {event.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500 font-light">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-zinc-400" /> {event.date}
                    </span>
                    <span className="flex items-center gap-1.5 font-mono">
                      <Clock size={12} className="text-zinc-400" /> {event.time} ({event.durationMinutes} min)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <UserCheck size={12} className="text-zinc-400" /> Host: {event.hostName}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col md:items-end gap-2 shrink-0 md:border-l md:border-zinc-50 md:pl-6">
                  {event.meetLink && event.status === 'confirmed' && (
                    <a
                      id={`meet-link-btn-${event.id}`}
                      href={event.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 bg-brand-black hover:bg-zinc-900 text-white rounded-xl text-xs font-light px-3 py-2 transition-all w-full md:w-auto uppercase tracking-wide cursor-pointer focus-ring"
                    >
                      <Video size={12} className="text-brand-yellow" /> Link Signature
                    </a>
                  )}

                  {/* Trainer Approval workflow keys */}
                  {currentUser.role === 'trainer' && event.status === 'pending' && (
                    <div className="flex gap-1.5 w-full">
                      <button
                        id={`confirm-slot-${event.id}`}
                        onClick={() => handleUpdateStatus(event.id, 'confirmed')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-light cursor-pointer flex-1"
                      >
                        Accept Slot
                      </button>
                      <button
                        id={`cancel-slot-${event.id}`}
                        onClick={() => handleUpdateStatus(event.id, 'cancelled')}
                        className="bg-zinc-100 hover:bg-red-50 hover:text-red-600 text-zinc-600 px-3 py-1.5 rounded-xl text-xs font-light cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {currentUser.role === 'student' && event.status === 'pending' && (
                    <span className="text-[10px] text-amber-700 font-light italic flex items-center gap-1 bg-amber-50/50 px-2 py-1 rounded">
                      <Sparkles size={8} /> Pending trainer review
                    </span>
                  )}
                </div>
              </div>
            ))
          )}

        </div>
      </div>

      {/* Booking Form Overlay Modal with thin styling */}
      {showAddModal && (
        <div id="add-booking-modal" className="fixed inset-0 bg-brand-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-zinc-100 rounded-3xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-50 pb-4 mb-4">
              <h3 className="text-base font-light tracking-tight text-brand-black">
                Launch Space <span className="font-semibold">Booking</span>
              </h3>
              <button
                id="close-booking-modal-btn"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-brand-black font-semibold text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Appointment Title</label>
                <input
                  id="book-input-title"
                  type="text"
                  placeholder="e.g. Design Layout Optimization"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-brand-yellow"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Session Scope</label>
                <textarea
                  id="book-input-desc"
                  placeholder="What should be completed or reviewed in this timeline?"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full min-h-20 text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-brand-yellow resize-none"
                  required
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Booking Date</label>
                  <input
                    id="book-input-date"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3 py-2 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Start Time</label>
                  <input
                    id="book-input-time"
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3 py-2 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Length (minutes)</label>
                  <select
                    id="book-input-duration"
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3 py-2"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Channel Focus</label>
                  <select
                    id="book-input-type"
                    value={newRoleType}
                    onChange={(e) => setNewRoleType(e.target.value as any)}
                    className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3 py-2"
                  >
                    <option value="1-on-1">1-on-1 Mentorship</option>
                    <option value="office-hours">Trainers Open Hours</option>
                    <option value="team-review">Team Workspace Review</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-light text-brand-gray mb-1">Target Invitee</label>
                <select
                  id="book-input-attendee"
                  value={newAttendeeId}
                  onChange={(e) => setNewAttendeeId(e.target.value)}
                  className="w-full text-xs font-light bg-brand-light border border-zinc-100 rounded-xl px-3 py-2"
                >
                  <option value="team-general">General Cohort (All members)</option>
                  {currentUser.role === 'student' ? (
                    trainers.map(t => (
                      <option key={t.id} value={t.id}>{t.name} (Tutor)</option>
                    ))
                  ) : (
                    students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (Student)</option>
                    ))
                  )}
                </select>
              </div>

              <div className="pt-2 border-t border-zinc-50 flex gap-2">
                <button
                  id="submit-booking-btn"
                  type="submit"
                  className="bg-brand-black hover:bg-zinc-900 text-white px-4 py-2.5 rounded-xl text-xs font-light uppercase tracking-wide cursor-pointer flex-1 text-center"
                >
                  Submit Booking
                </button>
                <button
                  id="cancel-booking-btn"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-zinc-100 text-zinc-600 px-4 py-2.5 rounded-xl text-xs font-light uppercase cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
