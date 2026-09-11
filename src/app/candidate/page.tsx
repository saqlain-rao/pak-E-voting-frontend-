'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAccount, useWriteContract, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { parseAbi } from 'viem';

const ELECTION_ABI = parseAbi([
  'function registerCandidate(string memory _name, bytes calldata signature) external'
]);

export default function CandidatePortal() {
  const { address, isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const { writeContractAsync } = useWriteContract();

  const [elections, setElections] = useState<any[]>([]);
  const [selectedElection, setSelectedElection] = useState<any | null>(null);

  const [form, setForm] = useState({ name: '', partyName: '', proposal: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchElections();
  }, []);

  const fetchElections = async () => {
    try {
      const res = await api.get('/elections');
      setElections(res.data.filter((e: any) => e.status === 'Draft' || e.status === 'Active'));
    } catch (error) {
      console.error('Failed to fetch elections', error);
    }
  };

  const handleRegister = async () => {
    if (!selectedElection) return toast.error('Please select an election.');
    if (!form.name || !form.partyName || !form.proposal) return toast.error('Please fill all fields.');

    setIsProcessing(true);
    try {
      let targetAddress = address;
      if (!isConnected || !targetAddress) {
        const result = await connectAsync({ connector: injected() });
        targetAddress = result.accounts[0];
      }

      const res = await api.post('/candidates/register', {
        walletAddress: targetAddress,
        name: form.name,
        partyName: form.partyName,
        proposal: form.proposal,
        electionId: selectedElection.electionId
      });

      if (!res.data.signature) throw new Error('Failed to obtain backend signature.');

      const tx = await writeContractAsync({
        address: selectedElection.contractAddress as `0x${string}`,
        abi: ELECTION_ABI,
        functionName: 'registerCandidate',
        args: [form.name, res.data.signature as `0x${string}`],
        gas: BigInt(400000),
      });

      toast.success('Successfully registered on-chain!');
      setForm({ name: '', partyName: '', proposal: '' });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Registration failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen">
      
      {/* Official Header Section */}
      <div className="w-full bg-[#004D28] text-white py-12 relative overflow-hidden border-b-8 border-[#d4af37]">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-md">
            Candidate Portal
          </h1>
          <p className="text-lg text-green-50/90 font-light">
            Register yourself as a candidate for upcoming national elections.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 py-12 relative z-10 -mt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg border-t-4 border-[#004D28] overflow-hidden p-8"
        >
          <div className="space-y-6 max-w-xl mx-auto">
            
            <div>
              <label className="block text-sm font-semibold text-[#004D28] mb-2 uppercase tracking-wide">Select Active Election</label>
              <div className="grid md:grid-cols-2 gap-4">
                {elections.map((el) => (
                  <div 
                    key={el.electionId} 
                    onClick={() => setSelectedElection(el)} 
                    className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${selectedElection?.electionId === el.electionId ? 'bg-green-50 border-[#004D28]' : 'bg-gray-50 border-gray-200 hover:border-[#004D28]'}`}
                  >
                    <h3 className="text-lg font-bold text-slate-800 mb-1">{el.title}</h3>
                    <p className="text-slate-500 text-xs line-clamp-2 mb-2">{el.description}</p>
                    <span className="text-[10px] px-2 py-1 bg-[#d4af37] font-bold uppercase tracking-wider rounded text-white">{el.status}</span>
                  </div>
                ))}
                {elections.length === 0 && (
                   <div className="col-span-2 p-4 text-center text-slate-500 italic">No elections open for registration.</div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-[#004D28] outline-none"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Party Name</label>
              <input
                type="text"
                placeholder="e.g. Independent, Green Party"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-[#004D28] outline-none"
                value={form.partyName}
                onChange={e => setForm({...form, partyName: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Campaign Proposal</label>
              <textarea
                placeholder="Outline your vision and promises..."
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-[#004D28] outline-none resize-none"
                value={form.proposal}
                onChange={e => setForm({...form, proposal: e.target.value})}
              />
            </div>

            <div className="pt-4">
              <button
                onClick={handleRegister}
                disabled={isProcessing}
                className="w-full py-4 text-white font-bold text-lg bg-[#004D28] hover:bg-[#00381d] rounded-xl shadow-lg shadow-[#004d28]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? 'Processing Transaction...' : 'Connect Wallet & Register'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
