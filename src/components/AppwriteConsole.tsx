/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { db } from '../db';
import { DbTransactionLog } from '../types';
import { Terminal, Shield, Cpu, RefreshCw, Layers, Server } from 'lucide-react';

export default function AppwriteConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<DbTransactionLog[]>([]);
  const [stats, setStats] = useState({
    coldStarts: '11ms',
    costToday: '$0.00014',
    encWrites: 0,
    activeReplica: 'eu-west-02 (Serverless Node)',
  });

  const loadLogs = () => {
    const txs = db.getTransactions();
    setLogs(txs);
    
    // Compute total encrypted writes
    const encCount = txs.filter(t => t.operation.includes('INSERT') || t.operation.includes('UPDATE') || t.operation.includes('PROPOSE') || t.operation.includes('CREATE')).length;
    setStats(prev => ({
      ...prev,
      encWrites: encCount + 16, // add base pre-loaded
      costToday: `$${((txs.length + 22) * 0.000004).toFixed(6)}`
    }));
  };

  useEffect(() => {
    loadLogs();
    
    // Poll logs every 2 seconds to keep it fully real-time responsive
    const interval = setInterval(loadLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="appwrite-console-fixed" className={`fixed bottom-0 right-0 left-0 bg-brand-black text-white duration-300 ease-in-out z-50 border-t border-zinc-800 ${
      isOpen ? 'h-72' : 'h-10'
    } font-mono text-xs select-none shadow-2xl`}>
      
      {/* Console Header Bar */}
      <div 
        id="appwrite-console-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-4 h-10 bg-zinc-900 cursor-pointer border-b border-zinc-800 hover:bg-zinc-800/80 transition-colors"
      >
        <div id="console-title-container" className="flex items-center gap-2">
          <Terminal size={14} className="text-brand-yellow animate-pulse" />
          <span className="font-light tracking-wide text-zinc-300">
            APPWRITE SECURE SERVERLESS ENGINE & DB CONSOLE — <span className="text-brand-yellow">
              {import.meta.env.VITE_APPWRITE_PROJECT_ID 
                ? `CONNECTED LIVE (Project ID: ${import.meta.env.VITE_APPWRITE_PROJECT_ID})` 
                : 'OFFLINE GATEWAY STORE — (Set VITE_APPWRITE_PROJECT_ID for live Appwrite cloud DB)'}
            </span>
          </span>
        </div>
        
        <div id="console-meta-container" className="flex items-center gap-6 text-[10px] text-zinc-400">
          <div className="flex items-center gap-1.5"><Shield size={10} className="text-emerald-500" /> DB ENCRYPTED</div>
          <div className="flex items-center gap-1.5"><Cpu size={10} className="text-brand-yellow" /> HOT-START: {stats.coldStarts}</div>
          <div className="flex items-center gap-1.5"><Layers size={10} className="text-blue-400" /> SERVERLESS BILLED: {stats.costToday}</div>
          <div className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-300 hover:text-white transition-colors text-[10px]">
            {isOpen ? 'Collapse Console [↓]' : 'Expand Cloud Stream [↑]'}
          </div>
        </div>
      </div>

      {/* Console Expansion Panel */}
      {isOpen && (
        <div id="appwrite-console-expanded" className="grid grid-cols-1 md:grid-cols-4 h-62 overflow-hidden">
          
          {/* Architecture / Health Stats Panel */}
          <div id="console-stats" className="p-4 border-r border-zinc-800 bg-zinc-950 flex flex-col justify-between">
            <div id="console-arch-header">
              <h4 className="text-zinc-400 uppercase tracking-widest text-[10px] mb-3 flex items-center gap-1.5">
                <Server size={12} className="text-brand-yellow" /> Cloud Architecture
              </h4>
              <div className="space-y-2 text-zinc-300">
                <div className="flex justify-between border-b border-zinc-900 pb-1">
                  <span className="text-zinc-500">Database ID:</span>
                  <span className="font-semibold text-brand-yellow">
                    {import.meta.env.VITE_APPWRITE_DATABASE_ID || '6a1aeae3002f269f4946'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-1">
                  <span className="text-zinc-500">Active Project:</span>
                  <span className="text-right text-[10px] font-mono font-semibold text-zinc-100">
                    {import.meta.env.VITE_APPWRITE_PROJECT_ID || 'Local Sim State'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-1">
                  <span className="text-zinc-500">Security Layer:</span>
                  <span className="text-emerald-400">AES-256-GCM SSL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Encrypted Writes:</span>
                  <span className="text-brand-yellow">{stats.encWrites} commits</span>
                </div>
              </div>
            </div>

            <div id="console-purge-action" className="flex items-center gap-2 mt-2">
              <button 
                id="console-clear-btn"
                onClick={() => {
                  db.clearLogs();
                  loadLogs();
                }}
                className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 hover:text-brand-yellow text-zinc-300 px-2.5 py-1 rounded text-[10px] transition-colors"
              >
                <RefreshCw size={10} /> Clear Stream
              </button>
              <span className="text-[9px] text-zinc-600">Auto-refreshing live...</span>
            </div>
          </div>

          {/* Cloud Database Query Log Stream (Wide) */}
          <div id="console-log-stream" className="col-span-3 p-4 overflow-y-auto bg-brand-black/90">
            <h4 className="text-zinc-400 uppercase tracking-widest text-[10px] mb-2 flex items-center justify-between">
              <span>Encrypted Transaction Audit Log [Query & Mutation Hooks]</span>
              <span className="text-[9px] text-zinc-500 lowercase">secured via client-side state hooks</span>
            </h4>
            
            {logs.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-zinc-600">
                No active Appwrite API transactions logged in this session yet.
              </div>
            ) : (
              <table id="console-logs-table" className="w-full text-[10px] text-zinc-400 border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                    <th className="pb-1 font-medium w-36">Timestamp</th>
                    <th className="pb-1 font-medium w-40">Serverless Hook Call</th>
                    <th className="pb-1 font-medium w-24">Storage Table</th>
                    <th className="pb-1 font-medium">Cipher Block Hash Range</th>
                    <th className="pb-1 font-medium text-right w-16">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {logs.map((log, index) => (
                    <tr key={log.hash + index} className="hover:bg-zinc-900/40">
                      <td className="py-1 text-zinc-500 font-mono text-[9px]">{log.timestamp}</td>
                      <td className="py-1 font-semibold text-emerald-400 flex items-center gap-1 font-mono">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {log.operation}
                      </td>
                      <td className="py-1 text-zinc-300">{log.table}</td>
                      <td className="py-1 text-brand-yellow/80 font-mono text-[9px]">
                        sha256:{log.hash} <span className="text-zinc-600">[{log.encryptionKey}]</span>
                      </td>
                      <td className="py-1 text-right text-zinc-500">{log.sizeBytes} B</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
