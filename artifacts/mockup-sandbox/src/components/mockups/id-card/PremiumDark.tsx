import React from "react";
import { 
  ArrowLeft, 
  GraduationCap, 
  Briefcase, 
  UserPlus, 
  Settings2, 
  WifiOff,
  ShieldCheck,
  Zap,
  Printer
} from "lucide-react";

export function PremiumDark() {
  return (
    <div className="w-full min-h-screen bg-slate-950 text-white font-sans selection:bg-amber-500/30 overflow-x-hidden flex justify-center">
      <div className="w-full max-w-[390px] bg-slate-950 min-h-screen relative shadow-2xl flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <h1 className="text-base font-semibold text-slate-200">ID Card Generator</h1>
          <div className="w-10 h-10" /> {/* Spacer for centering */}
        </header>

        <main className="flex-1 flex flex-col pb-10">
          {/* Banner Section */}
          <section className="px-6 pt-10 pb-8 text-center relative overflow-hidden">
            {/* Background glowing effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
            
            <h2 className="text-[32px] leading-[1.1] font-extrabold tracking-tight mb-5">
              <span className="bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent">
                Create Professional IDs
              </span>
            </h2>

            <div className="flex items-center justify-center gap-4 text-xs font-medium text-slate-400 bg-white/5 border border-white/10 py-2.5 px-4 rounded-full w-max mx-auto shadow-inner">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span>Offline</span>
              </div>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                <span>Free</span>
              </div>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                <span>Instant</span>
              </div>
            </div>
          </section>

          {/* Features horizontal scroll */}
          <section className="pl-6 mb-8">
            <div className="flex gap-3 overflow-x-auto pr-6 pb-2 scrollbar-hide [&::-webkit-scrollbar]:hidden">
              <div className="flex-shrink-0 flex items-center gap-2 bg-slate-900 border border-white/5 px-4 py-3 rounded-2xl">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <WifiOff className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-200">100% Offline</span>
                  <span className="text-[10px] text-slate-500">No internet required</span>
                </div>
              </div>

              <div className="flex-shrink-0 flex items-center gap-2 bg-slate-900 border border-white/5 px-4 py-3 rounded-2xl">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-200">Secure</span>
                  <span className="text-[10px] text-slate-500">Data stays on device</span>
                </div>
              </div>

              <div className="flex-shrink-0 flex items-center gap-2 bg-slate-900 border border-white/5 px-4 py-3 rounded-2xl">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Printer className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-200">Print-Ready</span>
                  <span className="text-[10px] text-slate-500">High quality export</span>
                </div>
              </div>
            </div>
          </section>

          {/* Card Selection Grid */}
          <section className="px-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-100">Select Template</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Student ID */}
              <button className="group relative flex flex-col p-5 bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 rounded-3xl overflow-hidden hover:border-green-500/30 transition-all text-left">
                <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mb-4 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.15)] group-hover:shadow-[0_0_20px_rgba(34,197,94,0.25)] transition-shadow">
                  <GraduationCap className="w-6 h-6 text-green-400" />
                </div>
                <h4 className="font-bold text-slate-100 mb-1">Student ID</h4>
                <p className="text-xs text-slate-400 leading-relaxed">Schools & Colleges</p>
              </button>

              {/* Employee ID */}
              <button className="group relative flex flex-col p-5 bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 rounded-3xl overflow-hidden hover:border-blue-500/30 transition-all text-left">
                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-shadow">
                  <Briefcase className="w-6 h-6 text-blue-400" />
                </div>
                <h4 className="font-bold text-slate-100 mb-1">Employee</h4>
                <p className="text-xs text-slate-400 leading-relaxed">Office & Corporate</p>
              </button>

              {/* Visitor Pass */}
              <button className="group relative flex flex-col p-5 bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 rounded-3xl overflow-hidden hover:border-teal-500/30 transition-all text-left">
                <div className="absolute inset-0 bg-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-4 border border-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.15)] group-hover:shadow-[0_0_20px_rgba(20,184,166,0.25)] transition-shadow">
                  <UserPlus className="w-6 h-6 text-teal-400" />
                </div>
                <h4 className="font-bold text-slate-100 mb-1">Visitor</h4>
                <p className="text-xs text-slate-400 leading-relaxed">Guests & Events</p>
              </button>

              {/* Custom ID */}
              <button className="group relative flex flex-col p-5 bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 rounded-3xl overflow-hidden hover:border-purple-500/30 transition-all text-left">
                <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)] group-hover:shadow-[0_0_20px_rgba(168,85,247,0.25)] transition-shadow">
                  <Settings2 className="w-6 h-6 text-purple-400" />
                </div>
                <h4 className="font-bold text-slate-100 mb-1">Custom</h4>
                <p className="text-xs text-slate-400 leading-relaxed">Fully flexible</p>
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
