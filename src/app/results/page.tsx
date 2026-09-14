'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReadContract, useReadContracts, usePublicClient } from 'wagmi';
import { parseAbi, parseAbiItem, formatUnits } from 'viem';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const ELECTION_ABI = parseAbi([
  'function state() view returns (uint8)',
  'function startTime() view returns (uint256)',
  'function winnerId() view returns (uint256)',
  'function candidates(uint256) view returns (uint256 id, string name, uint256 voteCount)',
  'event VoteCast(address indexed voter, uint256 indexed candidateId)'
]);

const VOTING_DURATION_SECONDS = 600; // 10 minutes

export default function ResultsDashboard() {
  const [elections, setElections] = useState<any[]>([]);
  const [selectedElection, setSelectedElection] = useState<any | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<string>('00:00');
  const publicClient = usePublicClient();

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (selectedElection) {
      fetchCandidates(selectedElection.electionId);
      fetchAuditLogs();
    }
  }, [selectedElection]);

  const fetchElections = async () => {
    try {
      const res = await api.get('/elections');
      setElections(res.data.filter((e: any) => e.contractAddress));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCandidates = async (id: number) => {
    try {
      const res = await api.get(`/candidates?electionId=${id}`);
      setCandidates(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    if (!publicClient || !selectedElection?.contractAddress) return;
    try {
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock > BigInt(999) ? currentBlock - BigInt(999) : BigInt(0);
      
      const logs = await publicClient.getLogs({
        address: selectedElection.contractAddress as `0x${string}`,
        event: parseAbiItem('event VoteCast(address indexed voter, uint256 indexed candidateId)'),
        fromBlock,
        toBlock: 'latest'
      });
      setAuditLogs(logs.reverse()); // Newest first
    } catch (e) {
      console.error("Error fetching logs", e);
    }
  };

  // On-Chain Reads for Election State
  const { data: electionStateData } = useReadContracts({
    contracts: [
      {
        address: selectedElection?.contractAddress as `0x${string}`,
        abi: ELECTION_ABI,
        functionName: 'state',
      },
      {
        address: selectedElection?.contractAddress as `0x${string}`,
        abi: ELECTION_ABI,
        functionName: 'startTime',
      },
      {
        address: selectedElection?.contractAddress as `0x${string}`,
        abi: ELECTION_ABI,
        functionName: 'winnerId',
      }
    ],
    query: {
      enabled: !!selectedElection?.contractAddress,
      refetchInterval: 5000 // Poll every 5s for live dashboard feel
    }
  });

  const onChainState = electionStateData?.[0]?.result as number | undefined;
  const onChainStartTime = electionStateData?.[1]?.result as bigint | undefined;
  const onChainWinnerId = electionStateData?.[2]?.result as bigint | undefined;

  // On-Chain Reads for Candidates (Cryptographic Proof)
  const { data: candidateVotesData } = useReadContracts({
    contracts: candidates.map((c) => ({
      address: selectedElection?.contractAddress as `0x${string}`,
      abi: ELECTION_ABI,
      functionName: 'candidates',
      args: [BigInt(c.candidateId)]
    })),
    query: {
      enabled: candidates.length > 0 && !!selectedElection?.contractAddress,
      refetchInterval: 5000
    }
  });

  // Hydrate candidate list with live on-chain votes & sort dynamically
  const hydratedCandidates = candidates.map((c, index) => {
    const chainData = candidateVotesData?.[index]?.result as any;
    const liveVotes = chainData ? Number(chainData[2]) : c.voteCount;
    return { ...c, liveVotes };
  }).sort((a, b) => b.liveVotes - a.liveVotes);

  // Timer Logic
  useEffect(() => {
    if (!onChainStartTime || onChainState !== 1) {
      setTimeLeft('00:00');
      return;
    }

    const interval = setInterval(() => {
      const startMs = Number(onChainStartTime) * 1000;
      const endMs = startMs + (VOTING_DURATION_SECONDS * 1000);
      const now = Date.now();
      const diff = endMs - now;

      if (diff <= 0) {
        setTimeLeft('00:00');
        clearInterval(interval);
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [onChainStartTime, onChainState]);

  const getStateBadge = () => {
    if (onChainState === 0) return <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-md text-xs font-bold uppercase">Draft</span>;
    if (onChainState === 1) return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-md text-xs font-bold uppercase">Active Voting</span>;
    if (onChainState === 2) return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-md text-xs font-bold uppercase">Completed</span>;
    if (onChainState === 3) return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md text-xs font-bold uppercase">Draw / Tied</span>;
    return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-md text-xs font-bold uppercase">Cancelled</span>;
  };

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen flex flex-col">
      {/* Official Header Section */}
      <div className="w-full bg-premium-blue text-white pt-32 pb-16 relative overflow-hidden border-b-[6px] border-[#d4af37] shadow-[0_20px_50px_rgba(0,38,20,0.5)]">
        
        <div className="absolute inset-0 bg-gradient-to-t from-[#002d5c] to-transparent opacity-80"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37] text-[10px] font-bold tracking-[0.25em] uppercase backdrop-blur-md">
            National E-Voting
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 drop-shadow-2xl !text-[#d4af37]">
            Live <span className="text-gradient-gold">Results</span> Ledger
          </h1>
          <p className="text-lg text-blue-50/80 font-light max-w-2xl mx-auto">
            Cryptographically verified election results directly from the blockchain. Transparent, immutable, and secure.
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 relative z-10 mt-10 pb-20">
        {!selectedElection ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-3 gap-8">
            {elections.map((el) => (
              <div 
                key={el.electionId} 
                onClick={() => setSelectedElection(el)} 
                className="cursor-pointer glass-panel bg-white/80 border-t-[6px] border-[#1d70b8] p-8 shadow-lg hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,77,40,0.3)] transition-all flex flex-col justify-between h-56 group"
              >
                <div>
                  <h3 className="text-2xl font-extrabold text-[#1d70b8] mb-3 line-clamp-1 group-hover:text-[#002d5c] transition-colors">{el.title}</h3>
                  <p className="text-slate-600 font-medium text-sm line-clamp-2 leading-relaxed">{el.description}</p>
                </div>
                <div className="flex justify-between items-center mt-6 border-t border-[#1d70b8]/10 pt-5">
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase bg-slate-100 px-3 py-1.5 rounded-md">ID: {el.electionId}</span>
                  <span className="text-[#d4af37] text-[11px] font-extrabold uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all">View Ledger <span className="text-lg leading-none">→</span></span>
                </div>
              </div>
            ))}
            {elections.length === 0 && <div className="text-slate-500 col-span-3 text-center py-20 font-medium glass-panel bg-white/50 border-dashed border-2">No deployed elections found.</div>}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="grid lg:grid-cols-3 gap-8">
            
            {/* Main Dashboard Panel */}
            <div className="lg:col-span-2 space-y-6">
              <button onClick={() => setSelectedElection(null)} className="text-[#1d70b8] hover:text-[#002d5c] text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-2 bg-white/50 backdrop-blur-sm px-5 py-2.5 rounded-full shadow-sm border border-[#1d70b8]/10 w-fit transition-all hover:bg-white hover:-translate-x-1">
                ← Back to Ledgers
              </button>

              <div className="glass-panel bg-white/90 border-l-[6px] border-l-[#d4af37] p-10 shadow-2xl backdrop-blur-xl">
                <div className="flex justify-between items-start mb-8 pb-6 border-b border-[#1d70b8]/10">
                  <div>
                    <h2 className="text-4xl font-extrabold mb-3 text-[#1d70b8] drop-shadow-sm">{selectedElection.title}</h2>
                    <div className="inline-block bg-slate-100 px-4 py-2 rounded-lg border border-slate-200 shadow-inner">
                        <p className="text-slate-500 font-medium text-[11px] break-all font-mono"><span className="font-bold text-slate-400 uppercase tracking-widest">Contract:</span> {selectedElection.contractAddress}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    {getStateBadge()}
                    {onChainState === 1 && (
                      <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-white px-5 py-3 rounded-xl border border-blue-200 shadow-sm relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 animate-pulse"></div>
                        <span className="text-[9px] font-bold text-blue-700 uppercase tracking-widest leading-none">Time Remaining</span>
                        <div className="text-3xl font-mono font-black text-[#1d70b8] drop-shadow-sm leading-none tabular-nums">
                          {timeLeft}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {onChainState === 2 && onChainWinnerId !== undefined && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-10 p-8 bg-gradient-to-r from-[#d4af37]/10 to-[#f5d76e]/5 border-2 border-[#d4af37]/30 rounded-2xl flex items-center gap-8 shadow-lg relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 text-9xl opacity-10 blur-sm">🏆</div>
                    <div className="text-6xl drop-shadow-md relative z-10">🏆</div>
                    <div className="relative z-10">
                      <h3 className="text-sm text-[#a68621] font-extrabold mb-2 uppercase tracking-[0.2em]">Official Verified Winner</h3>
                      <p className="text-4xl font-black text-[#002d5c] drop-shadow-sm">
                        {hydratedCandidates.find(c => c.candidateId === Number(onChainWinnerId))?.partyName || `Candidate #${Number(onChainWinnerId)}`}
                      </p>
                    </div>
                  </motion.div>
                )}

                {onChainState === 3 && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-10 p-8 bg-gradient-to-r from-yellow-50 to-white border-2 border-yellow-400/50 rounded-2xl flex items-center gap-8 shadow-lg relative overflow-hidden">
                    <div className="text-6xl drop-shadow-md relative z-10">⚖️</div>
                    <div className="relative z-10">
                      <h3 className="text-sm text-yellow-700 font-extrabold mb-2 uppercase tracking-[0.2em]">Election Ended in a Draw</h3>
                      <p className="text-lg font-bold text-slate-700">The smart contract determined a mathematical tie between the top candidates. Prepare for Round 2.</p>
                    </div>
                  </motion.div>
                )}

                <h3 className="text-lg font-extrabold text-[#1d70b8] mb-6 flex items-center gap-3 uppercase tracking-widest">
                  <span className="text-[#d4af37] text-2xl drop-shadow-sm">❖</span> Live Cryptographic Tally
                </h3>
                
                <div className="space-y-5">
                  <AnimatePresence>
                    {hydratedCandidates.map((c, idx) => (
                      <motion.div
                        key={c.candidateId}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between relative overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                      >
                        {/* Progress Bar Background */}
                        <motion.div 
                          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#1d70b8]/10 to-transparent z-0 border-r border-[#1d70b8]/20"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (c.liveVotes / (hydratedCandidates[0]?.liveVotes || 1)) * 100)}%` }}
                          transition={{ duration: 1, type: 'spring' }}
                        />
                        
                        <div className="relative z-10 flex items-center gap-5">
                          <span className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shadow-sm ${idx === 0 && c.liveVotes > 0 ? 'bg-gradient-to-br from-[#d4af37] to-[#f5d76e] text-[#002d5c] border border-[#d4af37]' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="font-extrabold text-xl text-slate-900">{c.partyName || 'Independent'}</h4>
                            <span className="text-[10px] text-slate-500 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-sm uppercase tracking-widest mt-1 inline-block">ID: {c.candidateId}</span>
                          </div>
                        </div>
                        
                        <div className="relative z-10 text-right flex flex-col items-end">
                          <motion.span 
                            key={c.liveVotes}
                            initial={{ scale: 1.5, color: '#d4af37' }}
                            animate={{ scale: 1, color: '#1d70b8' }}
                            className="text-4xl font-black tabular-nums drop-shadow-sm"
                          >
                            {c.liveVotes}
                          </motion.span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Verified Votes</span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {candidates.length === 0 && <div className="text-center py-10 text-slate-500 font-medium bg-slate-50 rounded-2xl border border-dashed border-gray-200">No candidates registered.</div>}
                </div>
              </div>
            </div>

            {/* Audit Trail Sidebar */}
            <div className="glass-panel bg-white/95 border-t-[6px] border-[#1d70b8] rounded-2xl p-6 shadow-2xl h-[800px] flex flex-col relative overflow-hidden backdrop-blur-xl">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>
              
              <div className="relative z-10 mb-6 pb-6 border-b border-[#1d70b8]/10">
                  <h3 className="text-lg font-extrabold text-[#1d70b8] mb-2 flex items-center gap-2 uppercase tracking-widest">
                    <span className="text-[#d4af37] text-xl drop-shadow-sm">❖</span> Audit Trail
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                    Live event logs fetched directly from the blockchain. Proof of absolute transparency.
                  </p>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar relative z-10">
                {auditLogs.length > 0 ? auditLogs.map((log, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={i} 
                    className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-[#d4af37]/50 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1d70b8] group-hover:bg-[#d4af37] transition-colors"></div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#1d70b8] bg-[#1d70b8]/10 px-2 py-1 rounded-sm border border-[#1d70b8]/20">VoteCast</span>
                      <a 
                        href={`https://sepolia.etherscan.io/tx/${log.transactionHash}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-[#d4af37] hover:text-[#1d70b8] underline decoration-[#d4af37]/30 underline-offset-2 flex items-center gap-1 transition-colors"
                      >
                        TxHash <span className="text-xs">↗</span>
                      </a>
                    </div>
                    <p className="text-[11px] text-slate-600 font-mono break-all mb-1.5 bg-slate-50 p-1.5 rounded border border-slate-100">
                      <span className="font-bold text-slate-400 uppercase tracking-widest mr-2">Voter:</span> 
                      <span className="text-slate-800">{log.args.voter}</span>
                    </p>
                    <p className="text-[11px] text-slate-600 font-mono bg-slate-50 p-1.5 rounded border border-slate-100">
                      <span className="font-bold text-slate-400 uppercase tracking-widest mr-2">Cand ID:</span> 
                      <span className="text-[#1d70b8] font-bold">{Number(log.args.candidateId)}</span>
                    </p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-3 text-right">Block: {Number(log.blockNumber)}</p>
                  </motion.div>
                )) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm font-medium">
                    <span className="text-5xl mb-4 opacity-20">⛓️</span>
                    <span className="uppercase tracking-widest text-[10px] font-bold">No on-chain votes cast yet.</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
