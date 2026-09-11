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
    <div className="w-full bg-slate-50 min-h-screen flex flex-col">
      {/* Official Header Section */}
      <div className="w-full bg-[#004D28] text-white py-12 relative overflow-hidden border-b-8 border-[#d4af37]">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-md text-center md:text-left">
            Voter Portal
          </h1>
          <p className="text-lg text-green-50/90 font-light text-center md:text-left">
            Select an active election to securely cast your vote on-chain.
          </p>
        </div>
      </div>

      <div className="max-w-5xl w-full mx-auto p-6 relative z-10 -mt-16 pb-20">
        {!selectedElection ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-2 gap-6">
            
            {elections.map((el) => (
              <div key={el.electionId} className="bg-white rounded-xl shadow-lg border-t-4 border-[#004D28] p-6 transition-all hover:-translate-y-1">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-bold text-[#004D28] leading-tight">{el.title}</h3>
                  <span className={el.status === 'Active' ? 'px-3 py-1 bg-green-100 text-green-800 rounded-md text-xs font-bold uppercase tracking-wider' : 'px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-bold uppercase tracking-wider'}>
                    {el.status}
                  </span>
                </div>
                <p className="text-slate-600 mb-6 text-sm line-clamp-2 h-10 font-medium">{el.description}</p>
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>ID: {el.electionId}</span>
                  <span>Contract: {el.contractAddress?.slice(0, 10)}...</span>
                </div>
                <button 
                    onClick={() => setSelectedElection(el)}
                    className="mt-6 w-full py-3 bg-[#004D28] hover:bg-[#00381d] text-white font-bold rounded-xl shadow-md transition-all"
                >
                  Enter Portal
                </button>
              </div>
            ))}
            {elections.length === 0 && (
              <div className="col-span-2 bg-white rounded-xl shadow-lg border-t-4 border-[#004D28] p-12 text-center">
                <div className="text-5xl mb-4 opacity-50">🗳️</div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No Active Elections</h3>
                <p className="text-slate-500">No active elections right now. Check back later.</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            <button onClick={() => setSelectedElection(null)}
              className="text-[#004D28] hover:text-[#00381d] text-sm font-bold flex items-center gap-2 mb-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 w-fit">
              ← Back to Elections
            </button>

            <div className="bg-white rounded-xl shadow-lg border-l-4 border-[#004D28] p-8">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-3xl font-bold text-[#004D28]">{selectedElection.title}</h2>
                <span className={selectedElection.status === 'Active' ? 'px-3 py-1 bg-green-100 text-green-800 rounded-md text-xs font-bold uppercase' : 'px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-bold uppercase'}>
                    {selectedElection.status}
                </span>
              </div>
              <p className="text-slate-600 mb-4 font-medium">{selectedElection.description}</p>
              <div className="text-xs text-slate-400 font-mono">Contract: {selectedElection.contractAddress}</div>
            </div>

            {/* Tie / Results Logic */}
            {selectedElection.status === 'Completed' && electionState === 3 && (
                <div className="bg-white rounded-xl shadow-lg border-t-4 border-yellow-500 p-8 text-center">
                    <div className="text-5xl mb-4">⚖️</div>
                    <h3 className="text-3xl font-bold text-yellow-600 mb-2">Match Tie - 2nd Round Required</h3>
                    <p className="text-slate-600 font-medium">The election resulted in a draw. Please await instructions for the second round.</p>
                </div>
            )}

            {selectedElection.status === 'Completed' && electionState !== 3 && (
                <div className="bg-white rounded-xl shadow-lg border-t-4 border-[#004D28] p-8 text-center">
                    <div className="text-5xl mb-4">📊</div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Election Completed</h3>
                    <p className="text-slate-600 font-medium">Voting is closed. Check the admin dashboard or blockchain for final results.</p>
                </div>
            )}

            {/* Voting Interface */}
            {selectedElection.status === 'Active' && (
                <>
                {userHasVoted ? (
                  <div className="bg-white rounded-xl shadow-lg border-t-4 border-[#004D28] p-8 text-center">
                    <div className="text-5xl mb-4">✅</div>
                    <h3 className="text-2xl font-bold text-[#004D28] mb-2">Vote Recorded on Blockchain!</h3>
                    <p className="text-slate-600 font-medium">Your vote has been permanently recorded. Thank you for participating.</p>
                  </div>
                ) : userHasToken ? (
                  <div className="bg-white rounded-xl shadow-lg border-t-4 border-[#004D28] p-8">
                    <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                      <h3 className="text-2xl font-bold text-slate-800">Select a Candidate</h3>
                      <span className="text-sm bg-green-100 text-green-800 font-bold px-4 py-1.5 rounded-full border border-green-200 shadow-sm">
                        1 Token Available
                      </span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      {candidates.map(c => (
                        <div key={c.candidateId} className="bg-gray-50 hover:bg-gray-100 p-5 rounded-xl border border-gray-200 flex justify-between items-center transition-colors">
                          <div>
                            <h4 className="font-bold text-lg text-slate-900">{c.name}</h4>
                            <p className="text-[#004D28] font-bold text-sm uppercase tracking-wide mt-1">{c.partyName || 'Independent'}</p>
                          </div>
                          <button onClick={() => castVote(c.candidateId)} disabled={txPending}
                            className="px-6 py-3 bg-[#004D28] hover:bg-[#00381d] disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition-all">
                            {txPending ? '...' : 'Vote'}
                          </button>
                        </div>
                      ))}
                      {candidates.length === 0 && (
                        <div className="col-span-2 p-8 text-center text-slate-500 font-medium">No candidates registered yet.</div>
                      )}
                    </div>
                  </div>
                ) : !isAuthenticated ? (
                  <div className="bg-white rounded-xl shadow-lg border-t-4 border-[#004D28] p-8 text-center">
                    <div className="text-4xl mb-4">🔐</div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Connect to Vote</h3>
                    <p className="text-slate-600 mb-6 font-medium">Connect your wallet to check your eligibility.</p>
                    <button onClick={authenticateWallet}
                      className="px-8 py-4 bg-[#004D28] hover:bg-[#00381d] text-white rounded-xl font-bold shadow-lg transition-all">
                      Connect & Authenticate
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-lg border-t-4 border-orange-500 p-8 text-center">
                    <div className="text-4xl mb-4">⏳</div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Not Eligible / Pending Approval</h3>
                    <p className="text-slate-600 mb-6 font-medium max-w-lg mx-auto">You do not have a voting token for this election. If you haven't completed KYC, please do so. If you have, please wait for Admin Approval.</p>
                    <button onClick={() => router.push('/kyc')}
                      className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-md transition-all">
                      Go to KYC Portal
                    </button>
                  </div>
                )}
                </>
            )}

            {/* Live Feed */}
            {selectedElection.status === 'Active' && liveFeed.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border-t-4 border-blue-600 p-6">
                    <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                        </span>
                        Live Voting Feed
                    </h3>
                    <div className="space-y-3">
                        {liveFeed.map((event, i) => (
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }} 
                                animate={{ opacity: 1, x: 0 }}
                                key={i} 
                                className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm flex justify-between items-center"
                            >
                                <span className="text-slate-700">
                                    <span className="font-mono text-blue-700 font-bold">{event.voter.slice(0,6)}...{event.voter.slice(-4)}</span> just voted for <span className="font-bold text-[#004D28]">{event.partyName}</span>!
                                </span>
                                <span className="text-xs text-slate-400 font-bold">{event.time}</span>
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
