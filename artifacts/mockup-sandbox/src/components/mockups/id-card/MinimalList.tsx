import React from 'react';
import { ArrowLeft, ChevronRight, CheckCircle2, Shield, WifiOff, Zap } from 'lucide-react';

export function MinimalList() {
  return (
    <div className="w-[390px] h-[844px] bg-white overflow-y-auto overflow-x-hidden relative shadow-2xl mx-auto flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-md z-10 px-5 py-4 flex items-center gap-4 border-b border-gray-100">
        <button className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors active:scale-95">
          <ArrowLeft className="w-[22px] h-[22px] text-gray-800" strokeWidth={2.5} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">ID Card Generator</h1>
      </header>

      <main className="flex-1 pb-12">
        {/* Hero / Tagline */}
        <div className="pt-8 pb-6 px-6 text-center">
          <div className="flex justify-center gap-2 mb-6">
            <div className="px-3 py-1.5 rounded-full bg-green-50 flex items-center gap-1.5 border border-green-100/50">
              <span className="text-base">🎓</span>
              <span className="text-xs font-semibold text-green-700">Student</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-blue-50 flex items-center gap-1.5 border border-blue-100/50">
              <span className="text-base">💼</span>
              <span className="text-xs font-semibold text-blue-700">Staff</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-teal-50 flex items-center gap-1.5 border border-teal-100/50">
              <span className="text-base">🏷️</span>
              <span className="text-xs font-semibold text-teal-700">Guest</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-purple-50 flex items-center gap-1.5 border border-purple-100/50">
              <span className="text-base">✨</span>
              <span className="text-xs font-semibold text-purple-700">Custom</span>
            </div>
          </div>
          
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-3">
            Choose your format
          </h2>
          <p className="text-gray-500 text-[15px] max-w-[280px] mx-auto leading-relaxed">
            Select a template below to start generating high-quality ID cards instantly.
          </p>
        </div>

        {/* List of Card Types */}
        <div className="px-5 space-y-3.5 mb-10">
          <CardRow 
            title="Student ID"
            subtitle="School & College formats"
            emoji="🎓"
            color="green"
          />
          <CardRow 
            title="Employee ID"
            subtitle="Corporate & Office passes"
            emoji="💼"
            color="blue"
          />
          <CardRow 
            title="Visitor Pass"
            subtitle="Events & Guest badges"
            emoji="🏷️"
            color="teal"
          />
          <CardRow 
            title="Custom ID"
            subtitle="Fully customizable layout"
            emoji="✨"
            color="purple"
          />
        </div>

        {/* Features Section */}
        <div className="px-6 py-7 bg-gray-50 rounded-[28px] mx-5 mb-8 border border-gray-100/50 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400 mb-6 text-center">
            System Features
          </h3>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <FeatureItem icon={<Shield className="w-4 h-4 text-gray-700" />} text="Bank-grade Security" />
            <FeatureItem icon={<Zap className="w-4 h-4 text-gray-700" />} text="Instant Export" />
            <FeatureItem icon={<CheckCircle2 className="w-4 h-4 text-gray-700" />} text="Print Ready" />
            <FeatureItem icon={<WifiOff className="w-4 h-4 text-gray-700" />} text="100% Offline" />
          </div>
        </div>
      </main>
    </div>
  );
}

function CardRow({ 
  title, 
  subtitle, 
  emoji, 
  color 
}: { 
  title: string; 
  subtitle: string; 
  emoji: string; 
  color: 'green' | 'blue' | 'teal' | 'purple' 
}) {
  const colorStyles = {
    green: { strip: 'bg-green-500', bg: 'bg-green-50', border: 'border-green-100' },
    blue: { strip: 'bg-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
    teal: { strip: 'bg-teal-500', bg: 'bg-teal-50', border: 'border-teal-100' },
    purple: { strip: 'bg-purple-500', bg: 'bg-purple-50', border: 'border-purple-100' },
  }[color];

  return (
    <button className="w-full bg-white rounded-[20px] shadow-[0_4px_20px_-8px_rgba(0,0,0,0.06)] border border-gray-100 p-4 flex items-center gap-4 relative overflow-hidden group active:scale-[0.98] transition-all hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)] text-left">
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${colorStyles.strip}`} />
      
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-[28px] ${colorStyles.bg} border ${colorStyles.border} shadow-sm shrink-0 ml-1`}>
        {emoji}
      </div>
      
      <div className="flex-1 py-1">
        <h3 className="text-[17px] font-bold text-gray-900 mb-0.5 tracking-tight">{title}</h3>
        <p className="text-[13px] text-gray-500 font-medium">{subtitle}</p>
      </div>
      
      <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-gray-50 transition-colors shrink-0">
        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-600 transition-colors" />
      </div>
    </button>
  );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <span className="text-[13px] font-semibold text-gray-700 leading-tight">{text}</span>
    </div>
  );
}
