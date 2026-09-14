'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAccount, useReadContract, useWriteContract, useConnect, useSignMessage, useWatchContractEvent } from 'wagmi';
import { injected } from 'wagmi/connectors';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { parseAbi } from 'viem';
import { useRouter } from 'next/navigation';

const ELECTION_ABI = parseAbi([
  'function castVote(uint256 _candidateId) external',
  'function hasToken(address) view returns (bool)',
  'function hasVoted(address) view returns (bool)',
  'event VoteCast(address indexed voter, uint256 candidateId, uint256 weight)',
  'function electionState() view returns (uint8)'
]);

export default function VotePortal() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const { writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();

  const [elections, setElections] = useState<any[]>([]);
  const [selectedElection, setSelectedElection] = useState<any | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [txPending, setTxPending] = useState(false);
  const [liveFeed, setLiveFeed] = useState<any[]>([]);
  const [electionState, setElectionState] = useState<number | null>(null);

  // Wagmi Reads
  const { data: userHasToken, refetch: refetchHasToken } = useReadContract({
    address: selectedElection?.contractAddress as `0x${string}`,
    abi: ELECTION_ABI,
    functionName: 'hasToken',
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!selectedElection?.contractAddress && !!address }
  });

  const { data: userHasVoted, refetch: refetchHasVoted } = useReadContract({
    address: selectedElection?.contractAddress as `0x${string}`,
    abi: ELECTION_ABI,
    functionName: 'hasVoted',
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!selectedElection?.contractAddress && !!address }
  });

  const { data: contractState } = useReadContract({
    address: selectedElection?.contractAddress as `0x${string}`,
    abi: ELECTION_ABI,
    functionName: 'electionState',
    query: { enabled: !!selectedElection?.contractAddress }
  });

  useEffect(() => {
      if (contractState !== undefined) {
          setElectionState(contractState as number);
      }
  }, [contractState]);

  // Live Event Listener
  useWatchContractEvent({
    address: selectedElection?.contractAddress as `0x${string}`,
    abi: ELECTION_ABI,
    eventName: 'VoteCast',
    onLogs(logs) {
      logs.forEach((log) => {
        const voter = log.args.voter;
        const cId = Number(log.args.candidateId);
        const partyName = candidates.find(c => c.candidateId === cId)?.partyName || 'Unknown Party';
        
        setLiveFeed(prev => {
            const newFeed = [{ voter, partyName, time: new Date().toLocaleTimeString() }, ...prev];
            return newFeed.slice(0, 5); // keep last 5
        });
        
        // Refresh candidate counts
        fetchCandidates(selectedElection.electionId);
      });
    },
  });

  useEffect(() => {
    fetchElections();
    if (localStorage.getItem('auth_token')) setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    if (selectedElection) {
        fetchCandidates(selectedElection.electionId);
        refetchHasToken();
        refetchHasVoted();
    }
  }, [selectedElection, address]);

  const fetchElections = async () => {
    try {
      const res = await api.get('/elections');
      // Voters can see Active or Completed (to view results)
      setElections(res.data.filter((e: any) => (e.status === 'Active' || e.status === 'Completed') && e.contractAddress));
    } catch (e: any) { console.error(e); }
  };

  const fetchCandidates = async (id: any) => {
    try {
      const res = await api.get('/candidates?electionId=' + id);
      setCandidates(res.data);
    } catch (e: any) { console.error(e); }
  };

  const authenticateWallet = async () => {
    try {
        let targetAddress = address;
        if (!isConnected || !targetAddress) {
            const result = await connectAsync({ connector: injected() });
            targetAddress = result.accounts[0];
        }

        if (!isAuthenticated) {
            toast.loading('Authenticating...', { id: 'auth' });
            const nonceRes = await api.get('/auth/nonce?walletAddress=' + targetAddress);
            const signature = await signMessageAsync({
                message: 'Sign this message to authenticate with the Voting System.\nNonce: ' + nonceRes.data.nonce,
            });
            const verifyRes = await api.post('/auth/verify', { walletAddress: targetAddress, signature });
            localStorage.setItem('auth_token', verifyRes.data.access_token);
            setIsAuthenticated(true);
            toast.dismiss('auth');
            toast.success('Wallet Authenticated!');
        }
    } catch (e: any) {
        toast.dismiss('auth');
        toast.error('Authentication failed.');
    }
  };

  const castVote = async (candidateId: number) => {
    setTxPending(true);
    toast.loading('Casting vote on-chain...', { id: 'vote' });
    try {
      const tx = await writeContractAsync({
        address: selectedElection.contractAddress as `0x${string}`,
        abi: ELECTION_ABI,
        functionName: 'castVote',
        args: [BigInt(candidateId)],
        gas: BigInt(200000),
      });
      toast.dismiss('vote');
      toast.success('Vote cast successfully!');
      
      // Update local state temporarily until blockchain updates
      refetchHasVoted();
      refetchHasToken();
    } catch (e: any) {
      toast.dismiss('vote');
      toast.error(e?.shortMessage || e?.message || 'Vote failed');
    } finally {
      setTxPending(false);
    }
  };

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen flex flex-col">
      {/* Official Header Section */}
      <div className="w-full bg-premium-blue text-white pt-32 pb-16 relative overflow-hidden border-b-[6px] border-[#d4af37] shadow-[0_20px_50px_rgba(0,38,20,0.5)]">
        
        <div className="absolute inset-0 bg-gradient-to-t from-[#002d5c] to-transparent opacity-80"></div>
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37] text-[10px] font-bold tracking-[0.25em] uppercase backdrop-blur-md">
            National E-Voting
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 drop-shadow-2xl !text-[#d4af37]">
            Voter <span className="text-gradient-gold">Portal</span>
          </h1>
          <p className="text-lg text-blue-50/80 font-light max-w-2xl mx-auto">
            Select an active election to securely cast your vote on-chain.
          </p>
        </div>
      </div>

      <div className="max-w-5xl w-full mx-auto p-6 relative z-10 -mt-10 pb-20">
        {!selectedElection ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-2 gap-8">
            
            {elections.map((el) => (
              <div key={el.electionId} className="glass-panel bg-white/80 border-t-4 border-t-[#1d70b8] p-8 transition-all hover:-translate-y-2 group hover:shadow-[0_20px_40px_-15px_rgba(0,77,40,0.3)]">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-extrabold text-[#1d70b8] leading-tight group-hover:text-[#002d5c] transition-colors">{el.title}</h3>
                  <span className={el.status === 'Active' ? 'px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-[10px] font-bold uppercase tracking-widest border border-blue-200' : 'px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-[10px] font-bold uppercase tracking-widest border border-blue-200'}>
                    {el.status}
                  </span>
                </div>
                <p className="text-slate-600 mb-6 text-sm line-clamp-2 h-10 font-medium">{el.description}</p>
                <div className="flex flex-col gap-1 text-[11px] text-slate-500 font-mono mb-8 bg-slate-50 p-3 rounded-lg border border-slate-100 shadow-inner">
                  <div className="flex justify-between"><span className="font-bold text-slate-400">ID:</span> <span>{el.electionId}</span></div>
                  <div className="flex justify-between"><span className="font-bold text-slate-400">CONTRACT:</span> <span>{el.contractAddress?.slice(0, 12)}...</span></div>
                </div>
                <button 
                    onClick={() => setSelectedElection(el)}
                    className="w-full py-3.5 btn-premium font-bold rounded-xl text-sm tracking-widest uppercase"
                >
                  Enter Portal
                </button>
              </div>
            ))}
            {elections.length === 0 && (
              <div className="col-span-2 glass-panel bg-white/60 border-t-4 border-t-[#1d70b8] p-16 text-center border-dashed">
                <div className="text-6xl mb-6 opacity-30 animate-pulse">🗳️</div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">No Active Elections</h3>
                <p className="text-slate-500 font-medium">There are currently no active or recent elections. Check back later.</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{type: 'spring', stiffness: 300, damping: 25}} className="space-y-8">
            <button onClick={() => setSelectedElection(null)}
              className="text-[#1d70b8] hover:text-[#002d5c] text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-2 bg-white/50 backdrop-blur-sm px-5 py-2.5 rounded-full shadow-sm border border-[#1d70b8]/10 w-fit transition-all hover:bg-white hover:-translate-x-1">
              ← Back to Elections
            </button>

            <div className="glass-panel bg-white/80 border-l-[6px] border-l-[#d4af37] p-8 shadow-lg">
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-3xl font-extrabold text-[#1d70b8] drop-shadow-sm">{selectedElection.title}</h2>
                <span className={selectedElection.status === 'Active' ? 'px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-[10px] font-bold uppercase tracking-widest border border-blue-200' : 'px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-[10px] font-bold uppercase tracking-widest border border-blue-200'}>
                    {selectedElection.status}
                </span>
              </div>
              <p className="text-slate-600 mb-6 font-medium leading-relaxed max-w-3xl">{selectedElection.description}</p>
              <div className="text-[11px] text-slate-500 font-mono bg-slate-100 inline-block px-4 py-2 rounded-lg border border-slate-200 shadow-inner"><span className="font-bold text-slate-400">CONTRACT:</span> {selectedElection.contractAddress}</div>
            </div>

            {/* Tie / Results Logic */}
            {selectedElection.status === 'Completed' && electionState === 3 && (
                <div className="glass-panel bg-yellow-50/90 border-t-4 border-yellow-500 p-10 text-center shadow-lg">
                    <div className="text-6xl mb-6">⚖️</div>
                    <h3 className="text-3xl font-extrabold text-yellow-700 mb-4 drop-shadow-sm">Match Tie - 2nd Round Required</h3>
                    <p className="text-yellow-800/80 font-medium max-w-lg mx-auto">The election resulted in a draw. Please await official instructions for the second round.</p>
                </div>
            )}

            {selectedElection.status === 'Completed' && electionState !== 3 && (
                <div className="glass-panel bg-white/90 border-t-4 border-[#1d70b8] p-10 text-center shadow-lg">
                    <div className="text-6xl mb-6">📊</div>
                    <h3 className="text-3xl font-extrabold text-[#1d70b8] mb-4 drop-shadow-sm">Election Completed</h3>
                    <p className="text-slate-600 font-medium max-w-lg mx-auto mb-8">Voting is closed. Check the public ledger or admin dashboard for the final verified results.</p>
                    <button onClick={() => router.push('/results')} className="btn-premium px-8 py-3.5 rounded-xl font-bold uppercase tracking-widest text-sm">
                      View Results
                    </button>
                </div>
            )}

            {/* Voting Interface */}
            {selectedElection.status === 'Active' && (
                <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}}>
                {userHasVoted ? (
                  <div className="glass-panel bg-blue-50/90 border-t-4 border-blue-600 p-12 text-center shadow-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="text-7xl mb-6 relative z-10 drop-shadow-md">✅</div>
                    <h3 className="text-3xl font-extrabold text-blue-800 mb-4 relative z-10 drop-shadow-sm">Vote Recorded on Blockchain!</h3>
                    <p className="text-blue-700/80 font-medium max-w-xl mx-auto relative z-10 text-lg">Your vote has been permanently recorded on the distributed ledger. Thank you for fulfilling your national duty.</p>
                  </div>
                ) : userHasToken ? (
                  <div className="glass-panel bg-white/90 border-t-4 border-t-[#d4af37] p-8 shadow-lg">
                    <div className="flex items-center justify-between mb-8 border-b border-[#1d70b8]/10 pb-5">
                      <h3 className="text-2xl font-extrabold text-[#1d70b8] drop-shadow-sm">Select a Candidate</h3>
                      <span className="text-[10px] bg-gradient-to-r from-[#d4af37] to-[#f5d76e] text-[#002d5c] font-bold px-4 py-2 rounded-full shadow-md uppercase tracking-widest border border-[#d4af37]/50 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                        1 Token Available
                      </span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-5">
                      {candidates.map(c => (
                        <div key={c.candidateId} className="bg-white hover:bg-slate-50 p-6 rounded-2xl border border-gray-200 flex justify-between items-center transition-all shadow-sm hover:shadow-md hover:border-[#d4af37]/50 group">
                          <div>
                            <h4 className="font-extrabold text-xl text-slate-900 group-hover:text-[#1d70b8] transition-colors">{c.name}</h4>
                            <p className="text-[#d4af37] font-bold text-[11px] uppercase tracking-widest mt-1 bg-[#d4af37]/10 inline-block px-2 py-0.5 rounded-sm">{c.partyName || 'Independent'}</p>
                          </div>
                          <button onClick={() => castVote(c.candidateId)} disabled={txPending}
                            className="px-8 py-3.5 btn-premium disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition-all text-sm uppercase tracking-widest hover:scale-105 active:scale-95">
                            {txPending ? 'Processing...' : 'Vote'}
                          </button>
                        </div>
                      ))}
                      {candidates.length === 0 && (
                        <div className="col-span-2 p-12 text-center text-slate-500 font-medium bg-slate-50 rounded-2xl border border-dashed border-gray-200">No candidates registered yet.</div>
                      )}
                    </div>
                  </div>
                ) : !isAuthenticated ? (
                  <div className="glass-panel bg-white/90 border-t-4 border-[#1d70b8] p-12 text-center shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#1d70b8] opacity-5 rounded-bl-full"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#d4af37] opacity-10 rounded-tr-full"></div>
                    <div className="text-6xl mb-6 relative z-10 drop-shadow-sm">🔐</div>
                    <h3 className="text-3xl font-extrabold text-[#1d70b8] mb-4 relative z-10 drop-shadow-sm">Connect to Vote</h3>
                    <p className="text-slate-600 mb-8 font-medium max-w-md mx-auto relative z-10">Connect your verified wallet to check your eligibility and receive your voting token.</p>
                    <button onClick={authenticateWallet}
                      className="px-10 py-4 btn-premium text-white rounded-xl font-bold shadow-lg transition-all uppercase tracking-widest text-sm relative z-10 hover:-translate-y-1">
                      Connect & Authenticate
                    </button>
                  </div>
                ) : (
                  <div className="glass-panel bg-orange-50/90 border-t-4 border-orange-500 p-12 text-center shadow-lg">
                    <div className="text-6xl mb-6">⏳</div>
                    <h3 className="text-3xl font-extrabold text-orange-800 mb-4 drop-shadow-sm">Not Eligible / Pending Approval</h3>
                    <p className="text-orange-900/80 mb-8 font-medium max-w-xl mx-auto leading-relaxed">
                      You do not have a voting token for this election. If you haven't completed KYC, please do so. If you have, please wait for Admin Approval.
                    </p>
                    <button onClick={() => router.push('/kyc')}
                      className="px-10 py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-xl font-bold shadow-lg transition-all uppercase tracking-widest text-sm hover:-translate-y-1">
                      Go to KYC Portal
                    </button>
                  </div>
                )}
                </motion.div>
            )}

            {/* Live Feed */}
            {selectedElection.status === 'Active' && liveFeed.length > 0 && (
                <div className="glass-panel bg-white/80 border-l-[4px] border-l-blue-600 p-6 shadow-md mt-8">
                    <h3 className="text-sm font-extrabold text-blue-900 mb-5 flex items-center gap-3 uppercase tracking-widest">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.8)]"></span>
                        </span>
                        Live Voting Feed
                    </h3>
                    <div className="space-y-3">
                        {liveFeed.map((event, i) => (
                            <motion.div 
                                initial={{ opacity: 0, x: -20, height: 0 }} 
                                animate={{ opacity: 1, x: 0, height: 'auto' }}
                                key={i} 
                                className="bg-gradient-to-r from-blue-50 to-white border border-blue-100/50 rounded-xl p-4 text-sm flex justify-between items-center shadow-sm"
                            >
                                <span className="text-slate-600 font-medium">
                                    <span className="font-mono text-blue-700 font-bold bg-blue-100/50 px-2 py-0.5 rounded">{event.voter.slice(0,6)}...{event.voter.slice(-4)}</span> just voted for <span className="font-extrabold text-[#1d70b8] underline decoration-[#d4af37] underline-offset-4">{event.partyName}</span>
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-md">{event.time}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

          </motion.div>
        )}
      </div>
    </div>
  );
}
