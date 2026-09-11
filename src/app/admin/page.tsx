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
        console.error(e);
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
      <div className="w-full bg-slate-50 min-h-screen flex items-center justify-center p-6 flex-col">
        {/* Official Header Section */}
        <div className="w-full bg-[#004D28] text-white py-12 relative overflow-hidden border-b-8 border-[#d4af37] absolute top-0 left-0">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-md">
              Admin Access Required
            </h1>
            <p className="text-lg text-green-50/90 font-light">
              Secure Government Portal Area
            </p>
          </div>
        </div>
        <div className="bg-white border-t-4 border-[#004D28] rounded-xl p-8 max-w-md w-full text-center shadow-lg mt-32 z-10">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Restricted Area</h1>
          <p className="text-slate-600 mb-6 font-medium">Please authenticate with your official administrator credentials to proceed.</p>
          <button 
            onClick={handleContextualLogin}
            disabled={isProcessingLogin}
            className="w-full py-4 bg-[#004D28] hover:bg-[#00381d] text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            {isProcessingLogin ? 'Authenticating...' : 'Connect Admin Wallet'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen flex flex-col">
      {/* Official Header Section */}
      <div className="w-full bg-[#004D28] text-white py-12 relative overflow-hidden border-b-8 border-[#d4af37]">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2 drop-shadow-md">
            Central Command Dashboard
          </h1>
          <p className="text-lg text-green-50/90 font-light">
            Manage Elections, Verify Identities, and Monitor Blockchain Operations.
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 relative z-10 -mt-8 pb-20">
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Left Col: Forms */}
          <div className="md:col-span-1 space-y-8">
            <div className="bg-white border-t-4 border-[#004D28] rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <span className="text-[#004D28]">📝</span> Draft New Election
              </h2>
              <form onSubmit={handleCreateElection} className="flex flex-col gap-4">
                <input 
                  required
                  type="text" 
                  placeholder="Election Title" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#004D28] focus:ring-1 focus:ring-[#004D28]"
                  value={electionForm.title} onChange={e => setElectionForm({...electionForm, title: e.target.value})}
                />
                <textarea 
                  placeholder="Description" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#004D28] focus:ring-1 focus:ring-[#004D28] h-24 resize-none"
                  value={electionForm.description} onChange={e => setElectionForm({...electionForm, description: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Start Time</label>
                    <input 
                      required type="datetime-local" 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#004D28] focus:ring-1 focus:ring-[#004D28]"
                      value={electionForm.startTime} onChange={e => setElectionForm({...electionForm, startTime: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Duration (Min)</label>
                    <input 
                      required type="number" min="1"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#004D28] focus:ring-1 focus:ring-[#004D28]"
                      value={electionForm.durationMinutes} onChange={e => setElectionForm({...electionForm, durationMinutes: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <button type="submit" className="mt-2 w-full py-3 bg-[#004D28] hover:bg-[#00381d] text-white font-bold rounded-xl shadow-md transition-colors">
                  Save Draft Off-Chain
                </button>
              </form>
            </div>

            <div className="bg-white border-t-4 border-blue-600 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2 border-b border-gray-100 pb-2">
                <span className="text-blue-600">🏛️</span> NADRA Direct Auth
              </h2>
              <p className="text-xs font-medium text-slate-500 mb-4">Add a voter manually to bypass KYC and auto-issue EVT token.</p>
              <div className="flex flex-col gap-4">
                <input 
                  type="text" 
                  placeholder="0x..." 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  value={nadraWallet} onChange={e => setNadraWallet(e.target.value)}
                />
                <button 
                  onClick={() => issueTokenAndApprove(nadraWallet, 'Voter', true)}
                  disabled={!nadraWallet || isPending}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-colors"
                >
                  Approve & Issue Token
                </button>
              </div>
            </div>
          </div>

          {/* Right Col: Lists */}
          <div className="md:col-span-2 space-y-8">
              
            {/* Pending KYC Table */}
            <div className="bg-white border-t-4 border-orange-500 rounded-xl p-6 shadow-lg">
              <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="text-orange-500">🛡️</span> Pending KYC Requests
                </h2>
                <button onClick={fetchPendingKyc} className="px-3 py-1 bg-orange-100 hover:bg-orange-200 rounded-lg text-orange-800 text-sm font-bold transition-colors" title="Refresh">
                  Refresh
                </button>
              </div>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {[...pendingVoters, ...pendingCandidates].map(user => (
                      <div key={user.walletAddress} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex justify-between items-center hover:bg-gray-100 transition-colors">
                          <div>
                              <div className="flex gap-2 items-center">
                                  <h3 className="font-bold text-slate-800">{user.name}</h3>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-orange-100 text-orange-800 uppercase tracking-wide">{user.role}</span>
                              </div>
                              <p className="text-xs font-mono text-slate-500 mt-1">{user.walletAddress}</p>
                              <p className="text-xs font-medium text-slate-500 mt-1">CNIC: {user.cnic} | Age: {user.age}</p>
                          </div>
                          <button 
                              onClick={() => issueTokenAndApprove(user.walletAddress, user.role, false)}
                              disabled={isPending}
                              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
                          >
                              Approve
                          </button>
                      </div>
                  ))}
                  {pendingVoters.length === 0 && pendingCandidates.length === 0 && (
                      <div className="text-center p-8 text-slate-400 font-medium border-2 border-dashed border-gray-200 rounded-xl">
                          No pending KYC requests.
                      </div>
                  )}
              </div>
            </div>

            <div className="bg-white border-t-4 border-[#004D28] rounded-xl p-6 shadow-lg">
              <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="text-[#004D28]">⚙️</span> Manage Elections
                </h2>
                <button onClick={fetchElections} className="px-3 py-1 bg-green-100 hover:bg-green-200 rounded-lg text-green-800 text-sm font-bold transition-colors" title="Refresh">
                  Refresh
                </button>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {elections.map((el) => (
                  <div key={el.electionId} className="bg-gray-50 border border-gray-200 hover:border-[#004D28]/30 rounded-xl p-5 flex flex-col justify-between transition-colors">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-slate-800">{el.title}</h3>
                        <span className={el.status === 'Active' ? 'text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wide bg-green-100 text-green-800' : 'text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wide bg-yellow-100 text-yellow-800'}>{el.status}</span>
                      </div>
                      {el.description && <p className="text-slate-500 font-medium text-xs mt-2 line-clamp-2 h-8">{el.description}</p>}
                      
                      <div className="mt-4 space-y-1 bg-white p-2 rounded-lg border border-gray-100">
                        <p className="text-xs font-medium text-slate-600"><span className="font-bold text-slate-400">Start:</span> {new Date(el.startTime).toLocaleString()}</p>
                        <p className="text-xs font-medium text-slate-600"><span className="font-bold text-slate-400">End:</span> {new Date(el.endTime).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      {el.contractAddress ? (
                        <div className="flex flex-col gap-3">
                          <p className="text-[10px] text-slate-500 font-mono break-all font-bold"><span className="text-slate-400">Deployed:</span> {el.contractAddress}</p>
                          {el.status === 'Draft' && (
                            <button 
                              onClick={() => handleStartElection(el.contractAddress, el.electionId)}
                              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
                            >
                              Start Election
                            </button>
                          )}
                          {el.status === 'Active' && (
                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded text-center uppercase tracking-wider">● STATUS: ACTIVE (Voting Open)</span>
                              <button 
                                onClick={() => handleResolveElection(el.contractAddress, el.electionId)}
                                disabled={isPending}
                                className="w-full py-2.5 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-sm font-bold rounded-lg shadow-sm transition-colors mt-1"
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
                          className="mt-2 w-full py-2.5 bg-[#004D28] hover:bg-[#00381d] disabled:opacity-50 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
                        >
                          {isPending ? 'Deploying...' : 'Deploy to Blockchain'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {elections.length === 0 && (
                  <div className="col-span-2 text-center p-8 text-slate-400 font-medium border-2 border-dashed border-gray-200 rounded-xl">
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
