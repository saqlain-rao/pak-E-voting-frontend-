'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAccount, useWriteContract, useConnect, useSignMessage } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useRouter } from 'next/navigation';

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`;
const BACKEND_VERIFIER = process.env.NEXT_PUBLIC_BACKEND_VERIFIER as `0x${string}`;

const FACTORY_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: '_electionId', type: 'uint256' },
      { internalType: 'address', name: '_backendVerifier', type: 'address' }
    ],
    name: 'createElection',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

const ELECTION_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "voter", "type": "address"}],
        "name": "issueToken",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "resolveElection",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "startElection",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const getLocalISOString = () => {
  const tzoffset = (new Date()).getTimezoneOffset() * 60000;
  return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
};

export default function AdminDashboard() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [electionForm, setElectionForm] = useState({ title: '', description: '', startTime: getLocalISOString(), durationMinutes: 10 });
  const [elections, setElections] = useState<any[]>([]);

  // New states for pending kyc and nadra auth
  const [pendingVoters, setPendingVoters] = useState<any[]>([]);
  const [pendingCandidates, setPendingCandidates] = useState<any[]>([]);
  const [nadraWallet, setNadraWallet] = useState('');

  const { writeContractAsync, isPending } = useWriteContract();
  const { connectAsync } = useConnect();
  const { signMessageAsync } = useSignMessage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isProcessingLogin, setIsProcessingLogin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        if (decoded.role === 'Admin' || (address && address.toLowerCase() === '0x449F48A20CF8c3E9B738D9c88942a3E6bCe1aA95'.toLowerCase())) {
          setIsAdmin(true);
          setIsAuthenticated(true);
          fetchElections();
          fetchPendingKyc();
        }
      } catch (e) {
        localStorage.removeItem('auth_token');
      }
    }
    setLoading(false);
  }, [address]);

  const fetchPendingKyc = async () => {
    try {
        const res = await api.get('/admin/pending-kyc');
        setPendingVoters(res.data.voters);
        setPendingCandidates(res.data.candidates);
    } catch (e) {
        console.error(e);
    }
  }

  const handleContextualLogin = async () => {
    setIsProcessingLogin(true);
    try {
      let targetAddress = address;
      if (!isConnected || !targetAddress) {
        const result = await connectAsync({ connector: injected() });
        targetAddress = result.accounts[0];
      }
      
      if (!isAuthenticated && targetAddress) {
        const nonceRes = await api.get('/auth/nonce?walletAddress=' + targetAddress);
        const signature = await signMessageAsync({ message: 'Sign this message to authenticate with the Voting System.\nNonce: ' + nonceRes.data.nonce });
        const verifyRes = await api.post('/auth/verify', { walletAddress: targetAddress, signature });
        localStorage.setItem('auth_token', verifyRes.data.access_token);
        
        const decoded: any = jwtDecode(verifyRes.data.access_token);
        if (decoded.role === 'Admin' || targetAddress.toLowerCase() === '0x449F48A20CF8c3E9B738D9c88942a3E6bCe1aA95'.toLowerCase()) {
          setIsAdmin(true);
          setIsAuthenticated(true);
          fetchElections();
          fetchPendingKyc();
          toast.success('Admin wallet connected successfully!');
        } else {
          toast.error('Wallet connected, but it lacks Admin privileges.');
        }
      }
    } catch (e) {
      toast.error('Connection failed or rejected.');
    } finally {
      setIsProcessingLogin(false);
    }
  };

  const fetchElections = async () => {
    try {
      const res = await api.get('/elections');
      setElections(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const electionId = Math.floor(Math.random() * 1000000);
      const start = new Date(electionForm.startTime);
      if (isNaN(start.getTime())) {
        toast.error('Invalid start time');
        return;
      }
      const end = new Date(start.getTime() + electionForm.durationMinutes * 60000);
      await api.post('/elections', { 
        ...electionForm, 
        endTime: end.toISOString(), 
        electionId 
      });
      toast.success('Election drafted successfully!');
      setElectionForm({ title: '', description: '', startTime: getLocalISOString(), durationMinutes: 10 });
      fetchElections();
    } catch (error: any) {
      toast.error('Failed: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleResolveElection = async (contractAddress: string, electionId: number) => {
    try {
      if (!isConnected || !address) {
        toast.error('Wallet not connected. Please connect your admin wallet first.');
        const result = await connectAsync({ connector: injected() });
        if (!result.accounts[0]) return;
      }

      toast.loading('Resolving election on-chain...', { id: 'resolve' });
      await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: ELECTION_ABI,
        functionName: 'resolveElection',
        gas: BigInt(300000),
      });
      toast.dismiss('resolve');
      toast.success('Election resolved! Syncing result...');
      await api.patch('/elections/' + electionId + '/status', { status: 'Completed' });
      setTimeout(() => fetchElections(), 5000);
    } catch (e: any) {
      toast.dismiss('resolve');
      toast.error(e.shortMessage || e.message || 'Failed to resolve election');
    }
  };

  const handleStartElection = async (contractAddress: string, electionId: number) => {
    try {
      if (!isConnected || !address) {
        toast.error('Wallet not connected. Please connect your admin wallet first.');
        const result = await connectAsync({ connector: injected() });
        if (!result.accounts[0]) return;
      }

      toast.loading('Starting election on-chain...', { id: 'start' });
      const txHash = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: ELECTION_ABI,
        functionName: 'startElection',
        gas: BigInt(300000),
      });
      toast.dismiss('start');
      toast.success('Election started! Wait for confirmation.');
      await api.patch('/elections/' + electionId + '/status', { status: 'Active' });
      fetchElections();
    } catch (e: any) {
      toast.dismiss('start');
      toast.error(e.shortMessage || e.message || 'Failed to start election');
    }
  };

  const deployToBlockchain = async (electionId: number) => {
    try {
      if (!isConnected || !address) {
        toast.error('Wallet not connected. Please connect your admin wallet first.');
        const result = await connectAsync({ connector: injected() });
        if (!result.accounts[0]) return;
      }
      
      const txHash = await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'createElection',
        args: [BigInt(electionId), BACKEND_VERIFIER],
        gas: BigInt(3000000),
      });
      toast.success('Transaction submitted! Waiting for confirmation...', { duration: 5000 });
      setTimeout(() => fetchElections(), 8000);
    } catch (e: any) {
      toast.error(e.shortMessage || e.message || 'Failed to deploy');
    }
  };

  const issueTokenAndApprove = async (walletAddress: string, role: string, isNadra = false) => {
    try {
        if (!isConnected || !address) {
            toast.error('Admin Wallet not connected. Reconnecting...');
            const result = await connectAsync({ connector: injected() });
            if (!result.accounts[0]) return;
        }

        // Must find the active or latest election to issue token on
        // A robust system would ask which election to issue it for. We will use the first active/draft one.
        const activeElection = elections.find(e => e.contractAddress);
        if (!activeElection) {
            toast.error('No deployed election contract found. Please deploy an election first before issuing tokens.');
            return;
        }

        toast.loading('Issuing EVT Token to Voter...', { id: 'issue' });
        
        await writeContractAsync({
            address: activeElection.contractAddress as `0x${string}`,
            abi: ELECTION_ABI,
            functionName: 'issueToken',
            args: [walletAddress as `0x${string}`],
            gas: BigInt(300000),
        });

        toast.success('Token Issued on-chain!');

        if (isNadra) {
            await api.post('/admin/nadra-add', { walletAddress });
            setNadraWallet('');
        } else {
            await api.post('/admin/approve-kyc', { walletAddress, role });
            fetchPendingKyc();
        }
        
        toast.dismiss('issue');
        toast.success('User Approved and Token Transferred!');

    } catch (e: any) {
        toast.dismiss('issue');
        toast.error(e.shortMessage || e.message || 'Failed to issue token');
    }
  }

  if (loading) return null;

  if (!isAdmin) {
    return (
      <div className="w-full bg-[#f8fafc] min-h-screen flex items-center justify-center p-6 flex-col">
        {/* Official Header Section */}
        <div className="w-full bg-premium-blue text-white py-12 relative overflow-hidden border-b-[6px] border-[#d4af37] absolute top-0 left-0 shadow-[0_10px_30px_rgba(0,38,20,0.5)]">
          
          <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-2xl">
              Admin Access <span className="text-gradient-gold">Required</span>
            </h1>
            <p className="text-lg text-blue-50/90 font-light tracking-wide uppercase text-sm">
              Secure Government Portal Area
            </p>
          </div>
        </div>
        <div className="glass-panel p-10 max-w-md w-full text-center mt-32 z-10 bg-white/80 border-t-4 border-t-red-700 animate-float">
          <div className="text-5xl mb-6 bg-red-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-inner border border-red-200">
            <span className="drop-shadow-sm">🔐</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#1d70b8] mb-3">Restricted Area</h1>
          <p className="text-slate-600 mb-8 font-medium leading-relaxed">
            Please authenticate with your official administrator credentials to proceed into the Central Command.
          </p>
          <button 
            onClick={handleContextualLogin}
            disabled={isProcessingLogin}
            className="w-full py-4 btn-premium text-white font-bold rounded-xl transition-all disabled:opacity-50 text-lg uppercase tracking-widest"
          >
            {isProcessingLogin ? 'Authenticating...' : 'Connect Admin Wallet'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen flex flex-col">
      {/* Official Header Section */}
      <div className="w-full bg-premium-blue text-white pt-32 pb-16 relative overflow-hidden border-b-[6px] border-[#d4af37] shadow-[0_20px_50px_rgba(0,38,20,0.5)]">
        
        <div className="absolute inset-0 bg-gradient-to-t from-[#002d5c] to-transparent opacity-80"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37] text-[10px] font-bold tracking-[0.25em] uppercase backdrop-blur-md">
            Secured Admin Zone
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-2xl !text-[#d4af37]">
            Federal Admin <span className="text-gradient-gold">Dashboard</span>
          </h1>
          <p className="text-lg text-blue-50/80 font-light max-w-2xl">
            Manage Elections, Verify Identities, and Monitor Blockchain Operations securely.
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 relative z-10 -mt-8 pb-20">
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Left Col: Forms */}
          <div className="md:col-span-1 space-y-8 animate-float" style={{animationDuration: '8s'}}>
            <div className="glass-panel p-6 bg-white/80">
              <h2 className="text-xl font-extrabold text-[#1d70b8] mb-4 flex items-center gap-2 border-b border-[#1d70b8]/10 pb-3">
                <span className="text-2xl">📝</span> Draft New Election
              </h2>
              <form onSubmit={handleCreateElection} className="flex flex-col gap-4 mt-4">
                <input 
                  required
                  type="text" 
                  placeholder="Election Title" 
                  className="w-full bg-white/50 border border-gray-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#1d70b8] focus:ring-1 focus:ring-[#1d70b8] backdrop-blur-sm transition-all shadow-inner"
                  value={electionForm.title} onChange={e => setElectionForm({...electionForm, title: e.target.value})}
                />
                <textarea 
                  placeholder="Description" 
                  className="w-full bg-white/50 border border-gray-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#1d70b8] focus:ring-1 focus:ring-[#1d70b8] h-24 resize-none backdrop-blur-sm transition-all shadow-inner"
                  value={electionForm.description} onChange={e => setElectionForm({...electionForm, description: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase tracking-wider">Start Time</label>
                    <input 
                      required type="datetime-local" 
                      className="w-full bg-white/50 border border-gray-200 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:border-[#1d70b8] focus:ring-1 focus:ring-[#1d70b8] shadow-inner"
                      value={electionForm.startTime} onChange={e => setElectionForm({...electionForm, startTime: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase tracking-wider">Duration (Min)</label>
                    <input 
                      required type="number" min="1"
                      className="w-full bg-white/50 border border-gray-200 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:border-[#1d70b8] focus:ring-1 focus:ring-[#1d70b8] shadow-inner"
                      value={electionForm.durationMinutes} onChange={e => setElectionForm({...electionForm, durationMinutes: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <button type="submit" className="mt-4 w-full py-3.5 btn-premium font-bold rounded-xl text-sm tracking-wide">
                  Save Draft Off-Chain
                </button>
              </form>
            </div>

            <div className="glass-panel p-6 bg-white/80 border-t-4 border-t-blue-600">
              <h2 className="text-xl font-extrabold text-blue-900 mb-2 flex items-center gap-2 border-b border-blue-100 pb-3">
                <span className="text-2xl">🏛️</span> NADRA Direct Auth
              </h2>
              <p className="text-xs font-medium text-slate-500 mb-5 mt-2">Add a voter manually to bypass KYC and auto-issue EVT token.</p>
              <div className="flex flex-col gap-4">
                <input 
                  type="text" 
                  placeholder="Wallet Address (0x...)" 
                  className="w-full bg-white/50 border border-gray-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-inner text-sm font-mono"
                  value={nadraWallet} onChange={e => setNadraWallet(e.target.value)}
                />
                <button 
                  onClick={() => issueTokenAndApprove(nadraWallet, 'Voter', true)}
                  disabled={!nadraWallet || isPending}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-[0_4px_15px_rgba(37,99,235,0.3)] hover:shadow-[0_8px_20px_rgba(37,99,235,0.4)] transition-all text-sm tracking-wide hover:-translate-y-0.5"
                >
                  Approve & Issue Token
                </button>
              </div>
            </div>
          </div>

          {/* Right Col: Lists */}
          <div className="md:col-span-2 space-y-8">
              
            {/* Pending KYC Table */}
            <div className="glass-panel p-6 bg-white/80 border-t-4 border-t-[#d4af37]">
              <div className="flex justify-between items-center mb-6 border-b border-[#1d70b8]/10 pb-4">
                <h2 className="text-xl font-extrabold text-[#1d70b8] flex items-center gap-2">
                  <span className="text-2xl drop-shadow-sm">🛡️</span> Pending KYC Requests
                </h2>
                <button onClick={fetchPendingKyc} className="px-4 py-1.5 bg-[#d4af37]/10 hover:bg-[#d4af37]/20 rounded-lg text-[#a68621] text-xs font-bold transition-all shadow-sm border border-[#d4af37]/20 flex items-center gap-1" title="Refresh">
                  <span>↻</span> Refresh
                </button>
              </div>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {[...pendingVoters, ...pendingCandidates].map(user => (
                      <div key={user.walletAddress} className="bg-white/50 border border-[#d4af37]/30 rounded-xl p-4 flex justify-between items-center hover:bg-white/80 transition-all shadow-sm hover:shadow-md">
                          <div>
                              <div className="flex gap-2 items-center mb-1">
                                  <h3 className="font-extrabold text-[#1d70b8] text-base">{user.name}</h3>
                                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-[#d4af37]/20 text-[#a68621] uppercase tracking-wider border border-[#d4af37]/30">{user.role}</span>
                              </div>
                              <p className="text-[11px] font-mono text-slate-500 mb-1">{user.walletAddress}</p>
                              <div className="flex items-center gap-3">
                                <p className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">CNIC: <span className="font-mono">{user.cnic}</span></p>
                                <p className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">Age: {user.age}</p>
                              </div>
                          </div>
                          <button 
                              onClick={() => issueTokenAndApprove(user.walletAddress, user.role, false)}
                              disabled={isPending}
                              className="px-5 py-2 btn-premium text-xs font-bold rounded-lg shadow-sm transition-all"
                          >
                              Approve
                          </button>
                      </div>
                  ))}
                  {pendingVoters.length === 0 && pendingCandidates.length === 0 && (
                      <div className="text-center p-8 text-slate-400 font-medium border-2 border-dashed border-gray-200 rounded-xl bg-white/30 backdrop-blur-sm">
                          No pending KYC requests.
                      </div>
                  )}
              </div>
            </div>

            <div className="glass-panel p-6 bg-white/80 border-t-4 border-t-[#1d70b8]">
              <div className="flex justify-between items-center mb-6 border-b border-[#1d70b8]/10 pb-4">
                <h2 className="text-xl font-extrabold text-[#1d70b8] flex items-center gap-2">
                  <span className="text-2xl drop-shadow-sm">⚙️</span> Manage Elections
                </h2>
                <button onClick={fetchElections} className="px-4 py-1.5 bg-[#1d70b8]/10 hover:bg-[#1d70b8]/20 rounded-lg text-[#1d70b8] text-xs font-bold transition-all shadow-sm border border-[#1d70b8]/20 flex items-center gap-1" title="Refresh">
                  <span>↻</span> Refresh
                </button>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-5">
                {elections.map((el) => (
                  <div key={el.electionId} className="bg-white/60 border border-[#1d70b8]/20 hover:border-[#1d70b8]/50 hover:shadow-[0_8px_20px_rgba(0,77,40,0.1)] rounded-xl p-5 flex flex-col justify-between transition-all backdrop-blur-sm group">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-extrabold text-[#1d70b8]">{el.title}</h3>
                        <span className={el.status === 'Active' ? 'text-[9px] px-2 py-1 rounded-md font-bold uppercase tracking-widest bg-blue-100 text-blue-700 border border-blue-200 shadow-inner' : 'text-[9px] px-2 py-1 rounded-md font-bold uppercase tracking-widest bg-yellow-100 text-yellow-700 border border-yellow-200 shadow-inner'}>{el.status}</span>
                      </div>
                      {el.description && <p className="text-slate-500 font-medium text-xs mb-3 line-clamp-2 h-8">{el.description}</p>}
                      
                      <div className="space-y-1.5 bg-white/50 p-3 rounded-lg border border-gray-100 shadow-inner">
                        <p className="text-[10px] font-medium text-slate-600 flex justify-between"><span className="font-bold text-slate-400 uppercase tracking-wider">Start:</span> <span>{new Date(el.startTime).toLocaleString()}</span></p>
                        <p className="text-[10px] font-medium text-slate-600 flex justify-between"><span className="font-bold text-slate-400 uppercase tracking-wider">End:</span> <span>{new Date(el.endTime).toLocaleString()}</span></p>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      {el.contractAddress ? (
                        <div className="flex flex-col gap-3">
                          <div className="bg-slate-100 rounded p-2 text-center border border-slate-200">
                            <p className="text-[9px] text-slate-500 font-mono break-all font-bold tracking-wider"><span className="text-slate-400 block mb-0.5">CONTRACT ADDRESS:</span> {el.contractAddress}</p>
                          </div>
                          {el.status === 'Draft' && (
                            <button 
                              onClick={() => handleStartElection(el.contractAddress, el.electionId)}
                              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all uppercase tracking-widest"
                            >
                              Start Election
                            </button>
                          )}
                          {el.status === 'Active' && (
                            <div className="flex flex-col gap-2">
                              <span className="text-[9px] font-bold text-blue-700 bg-blue-100/80 px-2 py-1.5 rounded-md text-center uppercase tracking-widest border border-blue-200 animate-pulse">● LIVE: VOTING OPEN</span>
                              <button 
                                onClick={() => handleResolveElection(el.contractAddress, el.electionId)}
                                disabled={isPending}
                                className="w-full py-2.5 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-[0_4px_10px_rgba(220,38,38,0.3)] transition-all uppercase tracking-widest"
                              >
                                Resolve Election
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button 
                          onClick={() => deployToBlockchain(el.electionId)}
                          disabled={isPending}
                          className="mt-1 w-full py-2.5 btn-premium disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all uppercase tracking-widest"
                        >
                          {isPending ? 'Deploying...' : 'Deploy to Blockchain'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {elections.length === 0 && (
                  <div className="col-span-2 text-center p-8 text-slate-400 font-medium border-2 border-dashed border-[#1d70b8]/20 rounded-xl bg-white/30 backdrop-blur-sm">
                    No elections found. Draft one to get started.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
