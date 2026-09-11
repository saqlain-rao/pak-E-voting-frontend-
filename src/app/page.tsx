'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col items-center">
      
      {/* Official Hero Section */}
      <div className="w-full bg-[#004D28] text-white py-24 relative overflow-hidden border-b-8 border-[#d4af37]">
        {/* Subtle geometric pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
          
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1 text-center md:text-left"
          >
            <div className="inline-block mb-4 px-5 py-2 rounded-full border border-[#d4af37]/50 bg-[#d4af37]/10 text-[#d4af37] text-xs font-bold tracking-[0.2em] uppercase shadow-sm">
              Government of Pakistan
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight drop-shadow-md">
              National Database & <br/> <span className="text-[#d4af37]">E-Voting</span> Authority
            </h1>
            <p className="text-lg md:text-xl text-green-50/90 mb-10 leading-relaxed font-light max-w-2xl mx-auto md:mx-0">
              A state-of-the-art secure electronic voting infrastructure. Verify your identity seamlessly and cast your vote on a transparent, immutable Web3 ledger.
            </p>
          </motion.div>
          
          {/* Emblem Graphic Placeholder */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden md:flex flex-col items-center justify-center relative w-64 h-64"
          >
            {/* Simulating an official glowing emblem */}
            <div className="absolute inset-0 bg-[#d4af37] rounded-full blur-[80px] opacity-20 animate-pulse"></div>
            <div className="w-48 h-48 rounded-full border-4 border-[#d4af37] bg-white/5 backdrop-blur-sm flex flex-col items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.3)]">
              <span className="text-6xl text-[#d4af37] mb-2">☪</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-white text-center px-4">
                State Security <br/> Verified
              </span>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Main Actions Cards */}
      <div className="relative z-20 -mt-12 max-w-6xl mx-auto px-6 w-full grid grid-cols-1 md:grid-cols-3 gap-8 pb-20">
        
        {/* Card 1: Voter KYC */}
        <motion.a 
          href="/kyc"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}
          className="bg-white rounded-xl shadow-lg border-t-4 border-[#004D28] p-8 flex flex-col items-center text-center transition-all group"
        >
          <div className="w-16 h-16 rounded-full bg-[#004D28]/10 text-[#004D28] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#004D28] mb-3">Citizen KYC</h2>
          <p className="text-gray-600 mb-6 font-medium leading-relaxed">
            Verify your national identity securely using AI-driven facial recognition to receive your voting credentials.
          </p>
          <div className="mt-auto inline-flex items-center text-[#d4af37] font-bold group-hover:text-[#004D28] transition-colors">
            Verify Now <span className="ml-2">→</span>
          </div>
        </motion.a>

        {/* Card 2: Candidate Registration */}
        <motion.a 
          href="/candidate"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}
          className="bg-white rounded-xl shadow-lg border-t-4 border-[#d4af37] p-8 flex flex-col items-center text-center transition-all group"
        >
          <div className="w-16 h-16 rounded-full bg-[#d4af37]/10 text-[#d4af37] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#004D28] mb-3">Candidate Portal</h2>
          <p className="text-gray-600 mb-6 font-medium leading-relaxed">
            Register your candidacy for upcoming national elections. Submit documentation and track your application status.
          </p>
          <div className="mt-auto inline-flex items-center text-[#d4af37] font-bold group-hover:text-[#d4af37] transition-colors">
            Register <span className="ml-2">→</span>
          </div>
        </motion.a>

        {/* Card 3: Live Elections */}
        <motion.a 
          href="/results"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}
          className="bg-white rounded-xl shadow-lg border-t-4 border-[#004D28] p-8 flex flex-col items-center text-center transition-all group"
        >
          <div className="w-16 h-16 rounded-full bg-[#004D28]/10 text-[#004D28] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#004D28] mb-3">Live Elections</h2>
          <p className="text-gray-600 mb-6 font-medium leading-relaxed">
            View active national elections, cast your vote securely on the blockchain, and monitor real-time transparent results.
          </p>
          <div className="mt-auto inline-flex items-center text-[#d4af37] font-bold group-hover:text-[#004D28] transition-colors">
            View Results <span className="ml-2">→</span>
          </div>
        </motion.a>

      </div>

      {/* Trust Badges / Footer Info */}
      <div className="w-full bg-white border-t border-gray-200 py-12 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-12 text-sm font-semibold text-gray-400">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            Secured by Web3 Cryptography
          </div>
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-[#d4af37]" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
            Biometric AI Verification
          </div>
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
            Immutable Public Ledger
          </div>
        </div>
      </div>
      
    </div>
  );
}
