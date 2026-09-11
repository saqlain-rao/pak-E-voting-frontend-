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
    if (onChainState === 1) return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-md text-xs font-bold uppercase">Active Voting</span>;
    if (onChainState === 2) return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-md text-xs font-bold uppercase">Completed</span>;
    if (onChainState === 3) return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md text-xs font-bold uppercase">Draw / Tied</span>;
    return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-md text-xs font-bold uppercase">Cancelled</span>;
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen flex flex-col">
      {/* Official Header Section */}
      <div className="w-full bg-[#004D28] text-white py-12 relative overflow-hidden border-b-8 border-[#d4af37]">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-md">
            Public Audit Ledger
          </h1>
          <p className="text-lg text-green-50/90 font-light">
            Cryptographically verified election results directly from the blockchain.
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 relative z-10 -mt-16 pb-20">
        {!selectedElection ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-3 gap-6">
            {elections.map((el) => (
              <div 
                key={el.electionId} 
                onClick={() => setSelectedElection(el)} 
                className="cursor-pointer bg-white rounded-xl border-t-4 border-[#004D28] p-6 shadow-lg hover:-translate-y-1 transition-all flex flex-col justify-between h-48"
              >
                <div>
                  <h3 className="text-xl font-bold text-[#004D28] mb-2 line-clamp-1">{el.title}</h3>
                  <p className="text-slate-600 font-medium text-sm line-clamp-2">{el.description}</p>
                </div>
                <div className="flex justify-between items-center mt-4 border-t border-gray-100 pt-4">
                  <span className="text-xs text-slate-400 font-mono">ID: {el.electionId}</span>
                  <span className="text-[#d4af37] text-sm font-bold">View Ledger →</span>
                </div>
              </div>
            ))}
            {elections.length === 0 && <div className="text-slate-500 col-span-3 text-center py-20 font-medium">No deployed elections found.</div>}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="grid lg:grid-cols-3 gap-8">
            
            {/* Main Dashboard Panel */}
            <div className="lg:col-span-2 space-y-6">
              <button onClick={() => setSelectedElection(null)} className="text-[#004D28] hover:text-[#00381d] text-sm font-bold flex items-center gap-2 mb-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 w-fit">
                ← Back to Ledgers
              </button>

              <div className="bg-white border-l-4 border-[#004D28] rounded-xl p-8 shadow-lg">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-3xl font-bold mb-2 text-[#004D28]">{selectedElection.title}</h2>
                    <p className="text-slate-500 font-medium text-sm break-all font-mono">Contract: {selectedElection.contractAddress}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStateBadge()}
                    {onChainState === 1 && (
                      <div className="text-2xl font-mono font-bold text-[#004D28] bg-green-50 px-4 py-2 rounded-lg border border-green-200 shadow-inner">
                        {timeLeft}
                      </div>
                    )}
                  </div>
                </div>

                {onChainState === 2 && onChainWinnerId !== undefined && (
                  <div className="mb-8 p-6 bg-[#004D28]/5 border border-[#004D28]/20 rounded-xl flex items-center gap-6">
                    <div className="text-5xl">🏆</div>
                    <div>
                      <h3 className="text-lg text-[#004D28] font-bold mb-1 uppercase tracking-wide">Official Winner Declared</h3>
                      <p className="text-2xl font-black text-slate-800">
                        {hydratedCandidates.find(c => c.candidateId === Number(onChainWinnerId))?.partyName || `Candidate #${Number(onChainWinnerId)}`}
                      </p>
                    </div>
                  </div>
                )}

                {onChainState === 3 && (
                  <div className="mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-6">
                    <div className="text-5xl">⚖️</div>
                    <div>
                      <h3 className="text-lg text-yellow-700 font-bold mb-1 uppercase tracking-wide">Election Ended in a Draw</h3>
                      <p className="text-sm font-medium text-slate-600">The smart contract determined a mathematical tie between the top candidates.</p>
                    </div>
                  </div>
                )}

                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                  <span className="text-[#d4af37]">❖</span> Live Mathematical Tally
                </h3>
                
                <div className="space-y-4">
                  <AnimatePresence>
                    {hydratedCandidates.map((c, idx) => (
                      <motion.div
                        key={c.candidateId}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between relative overflow-hidden shadow-sm"
                      >
                        {/* Progress Bar Background */}
                        <motion.div 
                          className="absolute left-0 top-0 bottom-0 bg-[#004D28]/10 z-0"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (c.liveVotes / (hydratedCandidates[0]?.liveVotes || 1)) * 100)}%` }}
                          transition={{ duration: 1 }}
                        />
                        
                        <div className="relative z-10 flex items-center gap-4">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${idx === 0 && c.liveVotes > 0 ? 'bg-[#d4af37] text-white shadow-md' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="font-bold text-lg text-slate-900">{c.partyName || 'Independent'}</h4>
                            <span className="text-xs text-slate-500 font-mono">ID: {c.candidateId}</span>
                          </div>
                        </div>
                        
                        <div className="relative z-10 text-right">
                          <motion.span 
                            key={c.liveVotes}
                            initial={{ scale: 1.5, color: '#d4af37' }}
                            animate={{ scale: 1, color: '#004D28' }}
                            className="text-3xl font-black tabular-nums"
                          >
                            {c.liveVotes}
                          </motion.span>
                          <span className="text-sm font-medium text-slate-500 ml-2">votes</span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {candidates.length === 0 && <div className="text-center py-6 text-slate-500 font-medium">No candidates registered.</div>}
                </div>
              </div>
            </div>

            {/* Audit Trail Sidebar */}
            <div className="bg-white border-t-4 border-[#d4af37] rounded-xl p-6 shadow-lg h-[800px] flex flex-col">
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="text-[#004D28]">❖</span> Cryptographic Audit Trail
              </h3>
              <p className="text-xs font-medium text-slate-500 mb-4 pb-4 border-b border-gray-100">
                Live event logs fetched directly from the blockchain. Proof of absolute transparency.
              </p>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300">
                {auditLogs.length > 0 ? auditLogs.map((log, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3 shadow-sm hover:border-[#004D28]/30 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold uppercase text-[#004D28] bg-[#004D28]/10 px-2 py-1 rounded">VoteCast</span>
                      <a 
                        href={`https://sepolia.etherscan.io/tx/${log.transactionHash}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-[#d4af37] hover:text-[#004D28] underline decoration-gray-300"
                      >
                        TxHash ↗
                      </a>
                    </div>
                    <p className="text-xs text-slate-600 font-mono break-all mb-1">
                      <span className="font-bold text-slate-400">Voter:</span> {log.args.voter}
                    </p>
                    <p className="text-xs text-slate-600 font-mono">
                      <span className="font-bold text-slate-400">Candidate ID:</span> {Number(log.args.candidateId)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 text-right">Block: {Number(log.blockNumber)}</p>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm font-medium">
                    <span className="text-4xl mb-2 opacity-30">⛓️</span>
                    No on-chain votes cast yet.
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
