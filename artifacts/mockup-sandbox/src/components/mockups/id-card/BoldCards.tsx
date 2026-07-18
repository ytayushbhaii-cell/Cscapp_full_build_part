import React from 'react';
import { ArrowLeft, WifiOff, Printer, Share2, Shield, ChevronRight } from 'lucide-react';

export function BoldCards() {
  const cards = [
    {
      id: "student",
      title: "Student ID",
      desc: "Perfect for schools & colleges",
      emoji: "🎓",
      gradient: "from-emerald-400 to-emerald-600",
      shadow: "shadow-emerald-500/30",
    },
    {
      id: "employee",
      title: "Employee ID",
      desc: "For corporate & office staff",
      emoji: "💼",
      gradient: "from-blue-500 to-blue-700",
      shadow: "shadow-blue-500/30",
    },
    {
      id: "visitor",
      title: "Visitor Pass",
      desc: "Temporary access for guests",
      emoji: "🎫",
      gradient: "from-teal-400 to-teal-600",
      shadow: "shadow-teal-500/30",
    },
    {
      id: "custom",
      title: "Custom ID",
      desc: "Fully customizable layout",
      emoji: "✨",
      gradient: "from-violet-500 to-violet-700",
      shadow: "shadow-violet-500/30",
    },
  ];

  return (
    <div className="w-full max-w-[390px] mx-auto min-h-[100dvh] bg-slate-50 flex flex-col font-sans relative overflow-hidden sm:shadow-2xl sm:border sm:border-slate-200 text-slate-900">
      {/* Header */}
      <div className="bg-indigo-950 text-white px-5 pt-14 pb-6 rounded-b-3xl z-10 relative">
        <div className="flex items-center gap-4">
          <button className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold tracking-wide">ID Card Generator</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {/* Features Chips */}
        <div className="px-5 pt-8 pb-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Features at a glance</h2>
          <div className="flex flex-wrap gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
              <WifiOff className="w-3.5 h-3.5" />
              <span>100% Offline</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
              <Printer className="w-3.5 h-3.5" />
              <span>Print Ready</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
              <Share2 className="w-3.5 h-3.5" />
              <span>Easy Share</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-xs font-bold">
              <Shield className="w-3.5 h-3.5" />
              <span>Secure</span>
            </div>
          </div>
        </div>

        {/* Cards Stack */}
        <div className="px-5 pt-2 flex flex-col gap-5">
          {cards.map((card) => (
            <button 
              key={card.id}
              className={`w-full relative overflow-hidden rounded-3xl p-6 text-left transition-transform active:scale-95 bg-gradient-to-br ${card.gradient} shadow-lg ${card.shadow} group`}
            >
              {/* Decor element */}
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-1 pr-4">
                  <div className="text-4xl mb-4 drop-shadow-sm">{card.emoji}</div>
                  <h3 className="text-2xl font-black text-white tracking-tight">{card.title}</h3>
                  <p className="text-white/90 text-sm font-medium leading-snug">{card.desc}</p>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end relative z-10">
                <div className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-bold shadow-sm">
                  <span>Create</span>
                  <ChevronRight className="w-4 h-4" strokeWidth={3} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
