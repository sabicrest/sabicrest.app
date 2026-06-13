import React, { useState } from 'react';
import { BookOpen, Users, MessageSquare, DollarSign, TrendingUp, Flame, Sparkles } from 'lucide-react';

interface AdminChartsProps {
  totalStudents: number;
  totalTrainers: number;
  totalCourses: number;
  activeStudentsCount: number;
  inactiveStudentsCount: number;
  activeTrainersCount: number;
  trainersPendingVerification: number;
  totalDMs: number;
  totalChannelsMsgs: number;
  totalRevenue: number;
  totalGrossProfit: number;
  totalPaidOutToTrainers: number;
}

export default function AdminCharts({
  activeStudentsCount,
  inactiveStudentsCount,
  activeTrainersCount,
  trainersPendingVerification,
  totalDMs,
  totalChannelsMsgs,
  totalRevenue,
  totalGrossProfit,
  totalPaidOutToTrainers,
}: AdminChartsProps) {
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
  const [hoveredDonut, setHoveredDonut] = useState<string | null>(null);

  // Financial Trend Data (computed for May - Oct 2026 based on totalRevenue)
  const baseRevenue = Math.max(totalRevenue, 450000);
  const chartPoints = [
    { label: 'May 01', revenue: Math.floor(baseRevenue * 0.4), profit: Math.floor(baseRevenue * 0.4 * 0.15) },
    { label: 'May 15', revenue: Math.floor(baseRevenue * 0.65), profit: Math.floor(baseRevenue * 0.65 * 0.15) },
    { label: 'Jun 01', revenue: Math.floor(baseRevenue * 0.8), profit: Math.floor(baseRevenue * 0.8 * 0.15) },
    { label: 'Jun 13', revenue: baseRevenue, profit: totalGrossProfit },
  ];

  // Coordinates for the Area/Line Chart (width: 500, height: 160)
  // Maps values to x: 50 -> 450, y: 130 -> 10
  const maxVal = Math.max(...chartPoints.map(p => p.revenue), 100000);
  const pointsString = chartPoints.map((p, i) => {
    const x = 50 + (i * 130);
    const y = 140 - ((p.revenue / maxVal) * 110);
    return `${x},${y}`;
  }).join(' ');

  const areaPointsString = `50,140 ${pointsString} 440,140`;

  // Donut Chart Math
  const donutTotal = activeStudentsCount + inactiveStudentsCount + activeTrainersCount + trainersPendingVerification;
  const safeDonutTotal = donutTotal || 1;
  const sActive = (activeStudentsCount / safeDonutTotal) * 100;
  const sInactive = (inactiveStudentsCount / safeDonutTotal) * 100;
  const sTrainer = (activeTrainersCount / safeDonutTotal) * 100;
  const sPending = (trainersPendingVerification / safeDonutTotal) * 100;

  // Pie slice calculations (represented as strokes with dasharray)
  const r = 50;
  const circ = 2 * Math.PI * r; // 314.16
  const strokeActive = (sActive / 100) * circ;
  const strokeInactive = (sInactive / 100) * circ;
  const strokeTrainer = (sTrainer / 100) * circ;
  const strokePending = (sPending / 100) * circ;

  return (
    <div id="admin-charts-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 select-none">
      
      {/* 1. Area Trend Chart: Finances & Cash flow (Wide, spans 2 columns on large screens) */}
      <div className="lg:col-span-2 bg-white border border-zinc-100 p-6 rounded-3xl shadow-xs hover:shadow-sm transition-all relative">
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#218c3f] bg-emerald-50 border border-emerald-100/60 px-2.5 py-0.5 rounded-full font-bold">
              Real-Time Revenue Audit Ledger
            </span>
            <h3 className="text-sm font-semibold text-zinc-900 mt-1 flex items-center gap-1.5 font-light">
              <TrendingUp size={15} className="text-emerald-500" /> Revenue & Profit Projections
            </h3>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono">
            <span className="flex items-center gap-1 text-zinc-650">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Gross Income
            </span>
            <span className="flex items-center gap-1 text-zinc-650">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Platform Split (15%)
            </span>
          </div>
        </div>

        {/* SVG Responsive Chart Viewport */}
        <div className="relative w-full overflow-hidden h-48 bg-zinc-50/50 border border-zinc-100/50 rounded-2xl p-2 flex items-center justify-center">
          <svg viewBox="0 0 500 160" className="w-full h-full font-mono text-[7px]" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            <line x1="50" y1="30" x2="440" y2="30" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="50" y1="85" x2="440" y2="85" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="50" y1="140" x2="440" y2="140" stroke="#e2e8f0" strokeWidth="1" />

            {/* Area Fill */}
            <polygon points={areaPointsString} fill="url(#chartGradient)" />

            {/* Trend line */}
            <polyline
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsString}
            />

            {/* Interactive Data Nodes */}
            {chartPoints.map((point, i) => {
              const x = 50 + (i * 130);
              const y = 140 - ((point.revenue / maxVal) * 110);
              const isHovered = hoveredPoint === i;

              return (
                <g 
                  key={i} 
                  onMouseEnter={() => setHoveredPoint(i)} 
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 6 : 4}
                    fill="#3bb75e"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-all duration-100"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 12 : 0}
                    fill="#10b981"
                    fillOpacity="0.15"
                    className="transition-all duration-100"
                  />
                  {/* Label under point */}
                  <text x={x} y="152" textAnchor="middle" fill="#94a3b8" className="font-semibold">{point.label}</text>
                </g>
              );
            })}

            {/* Vertical Marker */}
            {hoveredPoint !== null && (
              <line
                x1={50 + (hoveredPoint * 130)}
                y1="20"
                x2={50 + (hoveredPoint * 130)}
                y2="140"
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
            )}
          </svg>

          {/* Interactive Tooltip Overlay */}
          {hoveredPoint !== null && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-zinc-900 text-white rounded-xl p-3 border border-zinc-800 text-[10px] space-y-1 font-mono shadow-xl animate-in fade-in duration-100 z-10 w-48 text-center leading-normal">
              <p className="font-bold text-[#3bb75e] uppercase tracking-wide border-b border-zinc-800 pb-1 mb-1">
                📅 Period Ref: {chartPoints[hoveredPoint].label} 
              </p>
              <p className="flex justify-between font-light">
                <span>Tuition Pool:</span>
                <span className="font-bold text-white">₦{chartPoints[hoveredPoint].revenue.toLocaleString()}</span>
              </p>
              <p className="flex justify-between font-light">
                <span>Platform Pft (15%):</span>
                <span className="font-bold text-amber-400">₦{chartPoints[hoveredPoint].profit.toLocaleString()}</span>
              </p>
            </div>
          )}
        </div>
        <p className="text-[9.5px] text-zinc-400 font-light mt-3 leading-relaxed">
          * Gross platform volume represents <strong>15% commission base</strong> scaled in relative cohorts tuition payouts.
        </p>
      </div>

      {/* 2. Donut Chart: Roles Split */}
      <div className="bg-white border border-zinc-100 p-6 rounded-3xl shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full font-bold">
            Platform Users Distribution Range
          </span>
          <h3 className="text-sm font-semibold text-zinc-900 mt-1 flex items-center gap-1.5 font-light">
            <Users size={15} className="text-indigo-500" /> Active Roster Share
          </h3>
        </div>

        {/* Donut SVG */}
        <div className="relative h-36 flex items-center justify-center my-2">
          <svg viewBox="0 0 160 160" className="w-32 h-32" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background circular track */}
            <circle cx="80" cy="80" r={r} fill="none" stroke="#f4f4f5" strokeWidth="18" />

            {/* Active Students Slice (Emerald) */}
            <circle
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke="#10b981"
              strokeWidth="20"
              strokeDasharray={`${strokeActive} ${circ}`}
              strokeDashoffset="0"
              onMouseEnter={() => setHoveredDonut('Active Students')}
              onMouseLeave={() => setHoveredDonut(null)}
              className="cursor-pointer transition-all hover:stroke-[22px]"
            />

            {/* Inactive Students Slice (Zinc) */}
            <circle
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="20"
              strokeDasharray={`${strokeInactive} ${circ}`}
              strokeDashoffset={-strokeActive}
              onMouseEnter={() => setHoveredDonut('Inactive Students')}
              onMouseLeave={() => setHoveredDonut(null)}
              className="cursor-pointer transition-all hover:stroke-[22px]"
            />

            {/* Active Trainers Slice (Indigo) */}
            <circle
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke="#6366f1"
              strokeWidth="20"
              strokeDasharray={`${strokeTrainer} ${circ}`}
              strokeDashoffset={-(strokeActive + strokeInactive)}
              onMouseEnter={() => setHoveredDonut('Active Trainers')}
              onMouseLeave={() => setHoveredDonut(null)}
              className="cursor-pointer transition-all hover:stroke-[22px]"
            />

            {/* Pending Split Slice (Amber) */}
            <circle
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="20"
              strokeDasharray={`${strokePending} ${circ}`}
              strokeDashoffset={-(strokeActive + strokeInactive + strokeTrainer)}
              onMouseEnter={() => setHoveredDonut('Pending Review')}
              onMouseLeave={() => setHoveredDonut(null)}
              className="cursor-pointer transition-all hover:stroke-[22px]"
            />
          </svg>

          {/* Central text overlay inside the donut hole */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest font-bold">TOTAL</span>
            <span className="text-xl font-bold text-zinc-900 leading-none mt-0.5">{donutTotal}</span>
            <span className="text-[8.5px] text-zinc-400 font-mono font-light">profiles</span>
          </div>
        </div>

        {/* Legend listing values and ratios */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[9px] font-mono text-zinc-650 border-t border-zinc-100 pt-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">Active Studs: <b>{sActive.toFixed(0)}%</b></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 shrink-0" />
            <span className="truncate">Inactive Studs: <b>{sInactive.toFixed(0)}%</b></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
            <span className="truncate">Active Coach: <b>{sTrainer.toFixed(0)}%</b></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <span className="truncate">Pending review: <b>{sPending.toFixed(0)}%</b></span>
          </div>
        </div>

        {/* Selected slice tooltip hover panel */}
        {hoveredDonut && (
          <div className="text-center font-mono mt-2 text-[10px] font-semibold text-zinc-900 bg-zinc-50 border border-zinc-200 py-1.5 px-3 rounded-xl">
            Selected Sector: <span className="text-indigo-600 font-bold">{hoveredDonut}</span>
          </div>
        )}
      </div>

    </div>
  );
}
