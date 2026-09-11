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
    <nav className="flex items-center justify-between px-6 py-4 bg-[#004D28] shadow-lg border-b-4 border-[#d4af37] relative z-50">
      <div className="flex items-center gap-8">
        <a href="/" className="flex flex-col cursor-pointer">
          <span className="text-2xl font-extrabold tracking-widest text-white uppercase flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
              <span className="w-4 h-4 text-[#004D28]">☪</span>
            </span>
            NADRA
          </span>
          <span className="text-[0.65rem] font-medium tracking-widest text-[#d4af37] uppercase mt-0.5">
            National E-Voting Authority
          </span>
        </a>
        <div className="hidden md:flex gap-8 text-sm font-semibold tracking-wide ml-4">
          <a href="/vote" className="text-gray-200 hover:text-white hover:underline decoration-[#d4af37] underline-offset-8 transition-all">Voter Portal</a>
          <a href="/kyc" className="text-gray-200 hover:text-white hover:underline decoration-[#d4af37] underline-offset-8 transition-all">KYC Verify</a>
          <a href="/candidate" className="text-gray-200 hover:text-white hover:underline decoration-[#d4af37] underline-offset-8 transition-all">Candidate Portal</a>
          <a href="/results" className="text-gray-200 hover:text-white hover:underline decoration-[#d4af37] underline-offset-8 transition-all">Public Ledger</a>
          {mounted && isAuthenticated && isAdmin && (
            <a href="/admin" className="text-gray-200 hover:text-[#d4af37] transition-all">Admin Dashboard</a>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {mounted && isConnected && isAuthenticated && (
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 text-xs font-bold text-[#004D28] bg-white rounded-md shadow-inner border border-gray-200 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              {address ? `${address.slice(0,6)}...${address.slice(-4)}` : 'Verified Citizen'}
            </span>
            <button 
              onClick={handleSignOut}
              className="px-4 py-1.5 text-sm font-bold text-white bg-red-700 hover:bg-red-800 rounded-md transition-colors shadow-sm cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
