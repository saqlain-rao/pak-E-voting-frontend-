'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <div className="w-full min-h-screen bg-[#f8fafc] flex flex-col items-center">
      
      {/* Official Hero Section */}
      <div className="w-full bg-premium-green text-white pt-32 pb-24 relative overflow-hidden border-b-[6px] border-[#d4af37] shadow-[0_20px_50px_rgba(0,38,20,0.5)]">
        {/* Subtle geometric pattern overlay */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#002614] to-transparent opacity-80"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1 text-center md:text-left"
          >
            <div className="inline-block mb-6 px-6 py-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37] text-xs font-bold tracking-[0.25em] uppercase shadow-[0_0_20px_rgba(212,175,55,0.15)] backdrop-blur-md">
              Government of Pakistan
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1] drop-shadow-2xl">
              National Database & <br/> <span className="text-gradient-gold">E-Voting</span> Authority
            </h1>
            <p className="text-lg md:text-xl text-green-50/80 mb-10 leading-relaxed font-light max-w-2xl mx-auto md:mx-0">
              A state-of-the-art secure electronic voting infrastructure. Verify your identity seamlessly and cast your vote on a transparent, immutable Web3 ledger.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
              <a href="/kyc" className="px-8 py-4 bg-[#d4af37] text-[#002614] font-extrabold rounded-full hover:bg-[#f5d76e] transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] hover:-translate-y-1">
                Verify Identity
              </a>
              <a href="/vote" className="px-8 py-4 bg-white/10 text-white border border-white/20 font-bold rounded-full hover:bg-white/20 transition-all backdrop-blur-md hover:-translate-y-1">
                Cast Your Vote
              </a>
            </div>
          </motion.div>
          
          {/* Emblem Graphic Placeholder */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, delay: 0.2, type: 'spring' }}
            className="hidden md:flex flex-col items-center justify-center relative w-72 h-72 animate-float"
          >
            {/* Simulating an official glowing emblem */}
            <div className="absolute inset-0 bg-[#d4af37] rounded-full blur-[100px] opacity-30 animate-pulse"></div>
            <div className="w-56 h-56 rounded-full border-[6px] border-[#d4af37]/80 bg-[#003B1E]/60 backdrop-blur-xl flex flex-col items-center justify-center shadow-[0_0_50px_rgba(212,175,55,0.4)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <span className="text-7xl text-[#d4af37] mb-3 relative z-10 drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]">☪</span>
              <span className="text-[11px] uppercase font-bold tracking-[0.3em] text-white/90 text-center px-4 relative z-10">
                State Security <br/> Verified
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Actions Cards */}
      <div className="relative z-20 mt-12 max-w-6xl mx-auto px-6 w-full grid grid-cols-1 md:grid-cols-3 gap-8 pb-24">
        
        {/* Card 1: Voter KYC */}
        <motion.a 
          href="/kyc"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          whileHover={{ y: -10, scale: 1.02 }}
          className="relative overflow-hidden p-8 flex flex-col items-center text-center group bg-white/70 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-[0_20px_50px_-15px_rgba(0,77,40,0.15)] hover:shadow-[0_40px_80px_-15px_rgba(0,77,40,0.3)] hover:border-[#004D28]/40 transition-all duration-500"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#004D28]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-[#004D28]/20 to-[#004D28]/5 rounded-3xl transform rotate-6 group-hover:rotate-12 transition-transform duration-500"></div>
            <div className="absolute inset-0 bg-white/80 backdrop-blur-md rounded-3xl border border-white/60 shadow-lg flex items-center justify-center group-hover:-rotate-3 transition-transform duration-500">
              <svg className="w-10 h-10 text-[#004D28]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-[#004D28] mb-4 tracking-tight relative z-10">Citizen KYC</h2>
          <p className="text-slate-600 mb-8 font-medium leading-relaxed text-sm relative z-10">
            Verify your national identity securely using military-grade AI facial recognition to receive immutable voting credentials.
          </p>
          
          <div className="mt-auto px-8 py-3.5 bg-white border-2 border-[#004D28]/10 text-[#004D28] rounded-xl font-bold group-hover:bg-[#004D28] group-hover:text-white group-hover:border-[#004D28] transition-all duration-300 shadow-sm group-hover:shadow-[0_10px_20px_rgba(0,77,40,0.2)] text-sm w-full relative z-10 uppercase tracking-wider">
            Verify Now
          </div>
        </motion.a>

        {/* Card 2: Candidate Registration */}
        <motion.a 
          href="/candidate"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          whileHover={{ y: -10, scale: 1.02 }}
          className="relative overflow-hidden p-8 flex flex-col items-center text-center group bg-gradient-to-b from-[#fefbf0] to-white/90 backdrop-blur-2xl border border-[#d4af37]/30 rounded-3xl shadow-[0_20px_50px_-15px_rgba(212,175,55,0.2)] hover:shadow-[0_40px_80px_-15px_rgba(212,175,55,0.4)] hover:border-[#d4af37]/60 transition-all duration-500"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#d4af37] via-[#f5d76e] to-[#d4af37] bg-[length:200%_100%] animate-shine"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#d4af37]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-[#d4af37]/30 to-[#d4af37]/10 rounded-3xl transform rotate-6 group-hover:rotate-12 transition-transform duration-500"></div>
            <div className="absolute inset-0 bg-white/90 backdrop-blur-md rounded-3xl border border-white shadow-lg flex items-center justify-center group-hover:-rotate-3 transition-transform duration-500">
              <svg className="w-10 h-10 text-[#a68621]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-[#a68621] mb-4 tracking-tight relative z-10">Candidate Portal</h2>
          <p className="text-slate-600 mb-8 font-medium leading-relaxed text-sm relative z-10">
            Submit your official candidacy documentation. Track your verified status and campaign profile on the immutable blockchain.
          </p>
          
          <div className="mt-auto px-8 py-3.5 bg-white border-2 border-[#d4af37]/20 text-[#a68621] rounded-xl font-bold group-hover:bg-gradient-to-r group-hover:from-[#d4af37] group-hover:to-[#f5d76e] group-hover:text-[#002614] group-hover:border-transparent transition-all duration-300 shadow-sm group-hover:shadow-[0_10px_20px_rgba(212,175,55,0.3)] text-sm w-full relative z-10 uppercase tracking-wider">
            Register Candidate
          </div>
        </motion.a>

        {/* Card 3: Live Elections */}
        <motion.a 
          href="/results"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          whileHover={{ y: -10, scale: 1.02 }}
          className="relative overflow-hidden p-8 flex flex-col items-center text-center group bg-white/70 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-[0_20px_50px_-15px_rgba(0,77,40,0.15)] hover:shadow-[0_40px_80px_-15px_rgba(0,77,40,0.3)] hover:border-[#004D28]/40 transition-all duration-500"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#004D28]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-[#004D28]/20 to-[#004D28]/5 rounded-3xl transform rotate-6 group-hover:rotate-12 transition-transform duration-500"></div>
            <div className="absolute inset-0 bg-white/80 backdrop-blur-md rounded-3xl border border-white/60 shadow-lg flex items-center justify-center group-hover:-rotate-3 transition-transform duration-500">
              <svg className="w-10 h-10 text-[#004D28]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-[#004D28] mb-4 tracking-tight relative z-10">Live Elections</h2>
          <p className="text-slate-600 mb-8 font-medium leading-relaxed text-sm relative z-10">
            View active national elections, cast your vote securely on the blockchain, and monitor real-time cryptographic results.
          </p>
          
          <div className="mt-auto px-8 py-3.5 bg-white border-2 border-[#004D28]/10 text-[#004D28] rounded-xl font-bold group-hover:bg-[#004D28] group-hover:text-white group-hover:border-[#004D28] transition-all duration-300 shadow-sm group-hover:shadow-[0_10px_20px_rgba(0,77,40,0.2)] text-sm w-full relative z-10 uppercase tracking-wider">
            Public Ledger
          </div>
        </motion.a>

      </div>

      {/* Trust Badges / Footer Info */}
      <div className="w-full bg-white/50 backdrop-blur-lg border-t border-gray-200/50 py-12 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-12 text-sm font-bold text-slate-500 uppercase tracking-widest">
          <div className="flex items-center gap-3 hover:text-[#004D28] transition-colors cursor-default">
            <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            </span>
            Web3 Cryptography
          </div>
          <div className="flex items-center gap-3 hover:text-[#d4af37] transition-colors cursor-default">
            <span className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-[#d4af37]">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
            </span>
            AI Verification
          </div>
          <div className="flex items-center gap-3 hover:text-slate-800 transition-colors cursor-default">
            <span className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
            </span>
            Public Ledger
          </div>
        </div>
      </div>
      
    </div>
  );
}
