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
    <div className="w-full bg-[#f8fafc] min-h-screen">
      
      {/* Official Header Section */}
      <div className="w-full bg-premium-green text-white pt-32 pb-16 relative overflow-hidden border-b-[6px] border-[#d4af37] shadow-[0_20px_50px_rgba(0,38,20,0.5)]">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#002614] to-transparent opacity-80"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37] text-[10px] font-bold tracking-[0.25em] uppercase backdrop-blur-md">
            Electoral Registration
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 drop-shadow-2xl">
            Candidate <span className="text-gradient-gold">Portal</span>
          </h1>
          <p className="text-lg text-green-50/80 font-light max-w-2xl mx-auto">
            Register yourself as a candidate for upcoming national elections on the secure ledger.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 py-12 relative z-10 -mt-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="glass-panel bg-white/80 border-t-[6px] border-t-[#d4af37] overflow-hidden p-8 shadow-2xl backdrop-blur-xl"
        >
          <div className="space-y-8 max-w-xl mx-auto">
            
            <div>
              <label className="block text-xs font-extrabold text-[#004D28] mb-3 uppercase tracking-widest border-b border-[#004D28]/10 pb-2">Select Active Election</label>
              <div className="grid md:grid-cols-2 gap-4">
                {elections.map((el) => (
                  <div 
                    key={el.electionId} 
                    onClick={() => setSelectedElection(el)} 
                    className={`cursor-pointer rounded-xl p-5 transition-all shadow-sm border-2 group ${selectedElection?.electionId === el.electionId ? 'bg-gradient-to-br from-[#004D28]/10 to-transparent border-[#004D28] shadow-[0_8px_20px_rgba(0,77,40,0.15)] -translate-y-1' : 'bg-white/50 border-gray-200 hover:border-[#d4af37] hover:bg-white/80 hover:shadow-md'}`}
                  >
                    <h3 className={`text-lg font-extrabold mb-2 transition-colors ${selectedElection?.electionId === el.electionId ? 'text-[#004D28]' : 'text-slate-800 group-hover:text-[#004D28]'}`}>{el.title}</h3>
                    <p className="text-slate-500 text-xs line-clamp-2 mb-4 font-medium leading-relaxed">{el.description}</p>
                    <span className="text-[9px] px-3 py-1 bg-gradient-to-r from-[#d4af37] to-[#f5d76e] font-bold uppercase tracking-widest rounded-md text-[#002614] shadow-sm">{el.status}</span>
                  </div>
                ))}
                {elections.length === 0 && (
                   <div className="col-span-2 p-8 text-center text-slate-500 font-medium bg-slate-50/50 rounded-xl border border-dashed border-gray-200">No elections open for registration.</div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Full Legal Name</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                className="w-full px-5 py-4 bg-white/50 border border-gray-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-[#004D28] focus:border-transparent outline-none transition-all shadow-inner font-medium"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Political Party Affiliation</label>
              <input
                type="text"
                placeholder="e.g. Independent, Green Party"
                className="w-full px-5 py-4 bg-white/50 border border-gray-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-[#004D28] focus:border-transparent outline-none transition-all shadow-inner font-medium"
                value={form.partyName}
                onChange={e => setForm({...form, partyName: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Campaign Proposal & Vision</label>
              <textarea
                placeholder="Outline your vision and promises for the country..."
                rows={4}
                className="w-full px-5 py-4 bg-white/50 border border-gray-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-[#004D28] focus:border-transparent outline-none resize-none transition-all shadow-inner font-medium leading-relaxed"
                value={form.proposal}
                onChange={e => setForm({...form, proposal: e.target.value})}
              />
            </div>

            <div className="pt-6 border-t border-gray-100">
              <button
                onClick={handleRegister}
                disabled={isProcessing}
                className="w-full py-4.5 text-white font-bold text-sm uppercase tracking-widest btn-premium rounded-xl shadow-[0_10px_25px_rgba(0,77,40,0.3)] hover:shadow-[0_15px_30px_rgba(0,77,40,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:-translate-y-1 active:translate-y-0"
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
