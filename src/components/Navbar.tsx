'use client';

import React, { useEffect, useState } from 'react';
import { useAccount, useSignMessage, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import api from '../lib/api';
import toast from 'react-hot-toast';

export function Navbar() {
  const { address, isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handle1ClickLogin = async () => {
    setIsProcessing(true);
    try {
      let targetAddress = address;

      // 1. Connect Wallet if not connected
      if (!isConnected || !targetAddress) {
        const result = await connectAsync({ connector: injected() });
        targetAddress = result.accounts[0];
      }

      // 2. Sign-In via Backend
      if (!isAuthenticated && targetAddress) {
        const nonceRes = await api.get(`/auth/nonce?walletAddress=${targetAddress}`);
        const nonce = nonceRes.data.nonce;

        const message = `Sign this message to authenticate with the Voting System.\nNonce: ${nonce}`;
        const signature = await signMessageAsync({ message });

        const verifyRes = await api.post('/auth/verify', {
          walletAddress: targetAddress,
          signature,
        });
        
        const { access_token } = verifyRes.data;
        localStorage.setItem('auth_token', access_token);
        setIsAuthenticated(true);
        toast.success('Successfully connected and authenticated!');
      }
    } catch (error: any) {
      console.error('1-Click Login failed:', error);
      toast.error(error?.message || 'Authentication failed or rejected.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
    disconnect();
    toast.success('Signed out successfully');
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdmin = address?.toLowerCase() === '0x449F48A20CF8c3E9B738D9c88942a3E6bCe1aA95'.toLowerCase();

  return (
    <nav className="absolute top-4 left-4 right-4 md:left-8 md:right-8 lg:left-12 lg:right-12 glass-panel-dark flex items-center justify-between px-6 py-4 shadow-2xl z-50 transition-all duration-300">
      <div className="flex items-center gap-8">
        <a href="/" className="flex flex-col cursor-pointer group">
          <span className="text-2xl font-extrabold tracking-widest text-white uppercase flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d4af37] to-[#f5d76e] flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.4)] group-hover:scale-110 transition-transform duration-300">
              <span className="w-4 h-4 text-[#002614] flex items-center justify-center -ml-0.5 mt-0.5">☪</span>
            </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300 group-hover:to-white transition-all">NADRA</span>
          </span>
          <span className="text-[0.65rem] font-medium tracking-widest text-[#d4af37] uppercase mt-0.5 opacity-90 group-hover:opacity-100 transition-opacity">
            National E-Voting Authority
          </span>
        </a>
        <div className="hidden md:flex gap-6 text-sm font-semibold tracking-wide ml-6">
          <a href="/vote" className="text-gray-300 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all duration-300">Voter Portal</a>
          <a href="/kyc" className="text-gray-300 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all duration-300">KYC Verify</a>
          <a href="/candidate" className="text-gray-300 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all duration-300">Candidate Portal</a>
          <a href="/results" className="text-gray-300 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all duration-300">Public Ledger</a>
          {mounted && isAuthenticated && isAdmin && (
            <a href="/admin" className="text-[#d4af37] hover:text-[#f5d76e] hover:bg-[#d4af37]/10 px-3 py-1.5 rounded-lg transition-all duration-300">Admin Dashboard</a>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {mounted && isConnected && isAuthenticated && (
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 text-xs font-bold text-white bg-black/20 rounded-full shadow-inner border border-white/10 flex items-center gap-2 backdrop-blur-md">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#d4af37]"></span>
              </div>
              <span className="opacity-90">{address ? `${address.slice(0,6)}...${address.slice(-4)}` : 'Verified Citizen'}</span>
            </div>
            <button 
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-bold text-white bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 rounded-full transition-all duration-300 shadow-sm cursor-pointer hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
