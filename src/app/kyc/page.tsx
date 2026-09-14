'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useConnect, useSignMessage } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '../../lib/api';

type Step = 1 | 2 | 3;

function CameraCapture({ onCapture, onCancel }: { onCapture: (url: string) => void, onCancel: () => void }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [stream, setStream] = React.useState<MediaStream | null>(null);

  React.useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(s => {
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(err => {
        console.error("Camera access denied", err);
        alert("Camera access denied or not available on this device.");
        onCancel();
      });
    return () => {
      // Cleanup stream on unmount
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []); // Run only on mount

  // Watch stream state for cleanup if needed
  React.useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    }
  }, [stream]);

  const capture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        onCapture(canvas.toDataURL('image/jpeg', 0.8));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
       <div className="bg-white p-6 rounded-3xl w-full max-w-md flex flex-col items-center shadow-2xl">
          <h3 className="text-xl font-bold mb-4 text-slate-900">Live Selfie Capture</h3>
          <div className="w-full bg-black rounded-2xl overflow-hidden mb-6 aspect-video max-h-[50vh] flex items-center justify-center relative">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 border-4 border-[#1d70b8]/30 rounded-2xl pointer-events-none" />
          </div>
          <div className="flex gap-4 w-full">
            <button onClick={onCancel} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-slate-800 font-bold rounded-xl transition-all">Cancel</button>
            <button onClick={capture} className="flex-1 py-3 bg-[#1d70b8] hover:bg-[#0D402F] text-white font-bold rounded-xl shadow-lg shadow-[#1d70b8]/30 transition-all">Take Photo</button>
          </div>
       </div>

    </div>
  );
}


export default function KycPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const { signMessageAsync } = useSignMessage();

  const [step, setStep] = useState<Step>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState({ fullName: '', dob: '', electionId: '' });
  const [cnicFront, setCnicFront] = useState<string | null>(null);
  const [cnicBack, setCnicBack] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [elections, setElections] = useState<any[]>([]);

  useEffect(() => {
    fetchElections();
  }, []);

  const fetchElections = async () => {
    try {
      const res = await api.get('/elections');
      setElections(res.data.filter((e: any) => e.status === 'Active' || e.status === 'Draft'));
    } catch (e) { console.error(e); }
  };

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  const toBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => res(reader.result as string);
      reader.onerror = rej;
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const file = e.target.files?.[0];
    if (file) setter(await toBase64(file));
  };

  const handleStep1Submit = async () => {
    if (!form.fullName || !form.dob || !form.electionId) return toast.error('Please fill all required fields.');
    if (!cnicFront || !cnicBack || !selfie) return toast.error('Please upload CNIC Front, Back, and Selfie.');
    setIsProcessing(true);
    try {
      let targetAddress = address;
      if (!isConnected || !targetAddress) {
        const result = await connectAsync({ connector: injected() });
        targetAddress = result.accounts[0];
      }
      setWalletAddress(targetAddress!);
      toast.loading('AI is verifying your identity...', { id: 'kyc' });
      const res = await api.post('/kyc/verify', {
        walletAddress: targetAddress,
        role: 'VOTER',
        electionId: Number(form.electionId),
        cnicFrontBase64: cnicFront,
        cnicBackBase64: cnicBack,
        selfieBase64: selfie,
        expectedName: form.fullName,
        expectedDob: form.dob
      });
      toast.dismiss('kyc');
      if (res.data?.status === 'Pending') {
        toast.success(res.data.message || 'KYC submitted! Awaiting Admin Approval.');
        setTimeout(() => router.push('/'), 2000);
      } else {
        toast.error('Unexpected response from AI Verification.');
      }
    } catch (e: any) {
      toast.dismiss('kyc');
      toast.error(e?.response?.data?.message || e?.message || 'KYC verification failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStep2Sign = async () => {
    setIsProcessing(true);
    try {
      let targetAddress = walletAddress || address;
      if (!isConnected || !targetAddress) {
        const result = await connectAsync({ connector: injected() });
        targetAddress = result.accounts[0];
        setWalletAddress(targetAddress);
      }
      const nonceRes = await api.get('/auth/nonce?walletAddress=' + targetAddress);
      const signature = await signMessageAsync({
        message: 'Sign this message to authenticate with the Voting System.\nNonce: ' + nonceRes.data.nonce,
      });
      const verifyRes = await api.post('/auth/verify', { walletAddress: targetAddress, signature });
      localStorage.setItem('auth_token', verifyRes.data.access_token);
      toast.success('Wallet authenticated! Redirecting...');
      setStep(3);
      setTimeout(() => router.push('/vote'), 1500);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Authentication failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const stepMeta = [
    { num: 1, label: 'Identity Verification' },
    { num: 2, label: 'Wallet Auth' },
    { num: 3, label: 'Access Granted' },
  ];

  interface UploadBoxProps {
    label: string;
    value: string | null;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    capture?: any;
    onClickOverride?: () => void;
  }
  const UploadBox = ({ label, value, inputRef, onChange, capture, onClickOverride }: UploadBoxProps) => (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
      <div
        onClick={() => onClickOverride ? onClickOverride() : inputRef.current?.click()}
        className={`cursor-pointer w-full h-28 flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${value ? 'border-[#1d70b8] bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-[#1d70b8]'}`}
      >
        {value
          ? <span className="text-blue-700 font-bold text-sm">✓ Uploaded</span>
          : <span className="text-slate-400 text-sm">Click to upload</span>
        }
        {capture ? (
          <input ref={inputRef} type="file" accept="image/*" capture={capture} className="hidden" onChange={onChange} />
        ) : (
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen flex flex-col">
      {/* Official Header Section */}
      <div className="w-full bg-premium-blue text-white pt-32 pb-16 relative overflow-hidden border-b-[6px] border-[#d4af37] shadow-[0_20px_50px_rgba(0,38,20,0.5)]">
        
        <div className="absolute inset-0 bg-gradient-to-t from-[#002d5c] to-transparent opacity-80"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37] text-[10px] font-bold tracking-[0.25em] uppercase backdrop-blur-md">
            National E-Voting
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 drop-shadow-2xl !text-[#d4af37]">
            Citizen <span className="text-gradient-gold">KYC</span> Verification
          </h1>
          <p className="text-lg text-blue-50/80 font-light max-w-2xl mx-auto">
            Securely verify your national identity using AI-driven facial recognition to receive your voting credentials.
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-2xl w-full mx-auto p-6 relative z-10 -mt-10 pb-20">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-10 relative px-4">
          <div className="absolute left-10 right-10 top-5 h-[2px] bg-gray-200/50 -z-10" />
          <div className="absolute left-10 right-10 top-5 h-[2px] bg-gradient-to-r from-[#d4af37] to-[#1d70b8] -z-10 transition-all duration-500" style={{ width: `${((step - 1) / (stepMeta.length - 1)) * 100}%` }} />
          
          {stepMeta.map((s) => (
            <div key={s.num} className="flex flex-col items-center gap-3 z-10">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border-2 shadow-sm transition-all duration-500 ${step > s.num ? 'bg-[#1d70b8] border-[#1d70b8] text-white shadow-[0_0_15px_rgba(0,77,40,0.4)]' : step === s.num ? 'bg-gradient-to-br from-[#d4af37] to-[#f5d76e] border-[#d4af37] text-[#002d5c] shadow-[0_0_20px_rgba(212,175,55,0.5)] scale-110' : 'bg-white/80 backdrop-blur-sm border-gray-200 text-slate-400'}`}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span className={`text-[10px] font-extrabold text-center max-w-[90px] uppercase tracking-widest transition-colors ${step >= s.num ? 'text-[#1d70b8]' : 'text-slate-400'}`}>{s.label}</span>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 40, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -40, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="glass-panel bg-white/80 border-t-[6px] border-t-[#d4af37] p-8 shadow-2xl backdrop-blur-xl">
              <h1 className="text-3xl font-extrabold text-[#1d70b8] mb-2 drop-shadow-sm">Upload Documents</h1>
              <p className="text-slate-600 text-sm mb-8 font-medium leading-relaxed">Please provide clear, well-lit photos of your original CNIC and a live selfie for AI verification.</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Full Legal Name</label>
                  <input type="text" placeholder="As written exactly on your CNIC" className="w-full px-5 py-4 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1d70b8] focus:border-transparent outline-none text-slate-900 font-medium shadow-inner transition-all" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Date of Birth</label>
                      <input type="date" className="w-full px-5 py-4 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1d70b8] focus:border-transparent outline-none text-slate-900 font-medium shadow-inner transition-all" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Election ID</label>
                      <input type="number" placeholder="e.g. 1" className="w-full px-5 py-4 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1d70b8] focus:border-transparent outline-none text-slate-900 font-medium shadow-inner transition-all" value={form.electionId} onChange={e => setForm({ ...form, electionId: e.target.value })} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
                  <UploadBox label="CNIC Front" value={cnicFront} inputRef={frontRef} onChange={e => handleFileChange(e, setCnicFront)} />
                  <UploadBox label="CNIC Back" value={cnicBack} inputRef={backRef} onChange={e => handleFileChange(e, setCnicBack)} />
                  <UploadBox label="Live Selfie" value={selfie} inputRef={selfieRef} onChange={e => handleFileChange(e, setSelfie)} onClickOverride={() => setShowCamera(true)} />
                </div>
                
                <div className="pt-6 mt-4 border-t border-gray-100">
                    <button onClick={handleStep1Submit} disabled={isProcessing} className="w-full py-4.5 btn-premium text-white font-bold rounded-xl shadow-[0_10px_25px_rgba(0,77,40,0.3)] hover:shadow-[0_15px_30px_rgba(0,77,40,0.4)] transition-all disabled:opacity-50 text-sm uppercase tracking-widest hover:-translate-y-1 active:translate-y-0">
                    {isProcessing ? 'AI Verifying...' : 'Verify My Identity →'}
                    </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 40, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -40, scale: 0.95 }} className="glass-panel bg-white/90 border-t-[6px] border-t-[#1d70b8] p-10 text-center shadow-2xl backdrop-blur-xl">
              <div className="w-20 h-20 bg-gradient-to-br from-[#1d70b8] to-[#002d5c] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-[#1d70b8]/30">
                <svg className="w-10 h-10 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-3xl font-extrabold text-[#1d70b8] mb-4 drop-shadow-sm">Identity Confirmed!</h2>
              <p className="text-slate-600 mb-8 font-medium leading-relaxed max-w-md mx-auto">Now prove wallet ownership by signing a secure cryptographic message. This does not cost any gas.</p>
              
              {walletAddress && (
                  <div className="flex flex-col items-center justify-center mb-10 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Connected Wallet</span>
                      <div className="text-[#1d70b8] font-mono text-sm font-bold bg-[#1d70b8]/10 px-4 py-2 rounded-lg border border-[#1d70b8]/20">{walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}</div>
                  </div>
              )}
              
              <button onClick={handleStep2Sign} disabled={isProcessing} className="w-full py-4.5 btn-premium text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 uppercase tracking-widest text-sm hover:-translate-y-1">
                {isProcessing ? 'Awaiting Signature...' : 'Sign & Authenticate Wallet'}
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel bg-white/90 border-t-[6px] border-t-blue-600 p-12 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2, stiffness: 200, damping: 20 }} className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(34,197,94,0.5)] border-4 border-blue-100 relative z-10">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              
              <h2 className="text-4xl font-extrabold text-blue-800 mb-4 drop-shadow-sm relative z-10">All Set!</h2>
              <p className="text-blue-700/80 font-medium text-lg max-w-md mx-auto relative z-10">You are verified and authenticated. Redirecting you to the Voter Portal...</p>
            </motion.div>
          )}
        </AnimatePresence>
        {showCamera && <CameraCapture onCapture={(img) => { setSelfie(img); setShowCamera(false); }} onCancel={() => setShowCamera(false)} />}
      </div>
    </div>
  );
}
