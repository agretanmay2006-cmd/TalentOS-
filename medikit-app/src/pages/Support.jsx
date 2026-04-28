import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Phone, Mail, MessageSquare, Book, Shield, 
  HelpCircle, ExternalLink, ArrowLeft, Heart,
  AlertTriangle, CheckCircle, Info
} from 'lucide-react';

export default function Support() {
  const navigate = useNavigate();

  const contacts = [
    { label: 'Emergency Dispatch', val: '102 / 108', icon: Phone, color: 'text-red-500' },
    { label: 'Technical Support', val: 'support@onclick.ai', icon: Mail, color: 'text-blue-500' },
    { label: 'Hospital Admin Line', val: '+91 8888 7777', icon: MessageSquare, color: 'text-green-500' },
  ];

  const faqs = [
    { q: 'How does GPS auto-capture work?', a: 'When an SOS is triggered, the browser requests high-accuracy location data which is then transmitted directly to the nearest hospital dashboard.' },
    { q: 'What if I have no internet?', a: 'ONCLICK is designed to work over low-bandwidth networks and can even queue alerts to be sent once connectivity is restored.' },
    { q: 'How are ambulances dispatched?', a: 'Our AI triage system analyzes the incident type and severity to dispatch the closest specialized unit automatically.' },
  ];

  return (
    <div className="min-h-screen bg-[#06060E] text-[#E8EAF0] font-sans selection:bg-blue-500/30 pb-20">
      {/* Header */}
      <header className="h-14 bg-[#06060E]/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50 flex items-center px-6 gap-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white">
          <ArrowLeft size={18} />
        </button>
        <div className="text-sm font-black tracking-tighter flex items-center gap-2 uppercase">
          <span className="text-blue-500">ON</span>CLICK <span className="text-gray-600 font-normal">| Support</span>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto space-y-12">
        {/* Hero */}
        <div className="text-center space-y-4 pt-10">
          <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto text-blue-500 mb-6 border border-blue-500/20">
            <Heart size={40} />
          </div>
          <h1 className="text-4xl font-black tracking-tighter">Help & Support</h1>
          <p className="text-gray-500 max-w-lg mx-auto text-sm leading-relaxed">
            Need assistance with the SOS system or hospital dashboard? Our team and resources are available 24/7.
          </p>
        </div>

        {/* Contact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {contacts.map((item, i) => (
            <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center hover:border-white/10 transition-all">
              <div className={`${item.color} mb-4 flex justify-center`}>
                <item.icon size={24} />
              </div>
              <div className="text-[8px] font-bold uppercase tracking-widest text-gray-500 mb-1">{item.label}</div>
              <div className="text-sm font-bold text-white">{item.val}</div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="space-y-6">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500 text-center">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-2">
                <div className="flex gap-3 items-start">
                  <HelpCircle className="text-blue-500 mt-0.5 shrink-0" size={16} />
                  <h3 className="text-sm font-bold text-white">{faq.q}</h3>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed pl-7">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Guides */}
        <div className="space-y-6">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500 text-center">First Aid & Guides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-2xl p-6 flex items-center gap-4 group cursor-pointer hover:border-red-500/40 transition-all">
              <div className="text-red-500 bg-red-500/10 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <AlertTriangle size={24} />
              </div>
              <div>
                <div className="text-sm font-bold text-white">CPR Guide</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest">Step-by-step procedure</div>
              </div>
              <ExternalLink size={14} className="ml-auto text-gray-700" />
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-2xl p-6 flex items-center gap-4 group cursor-pointer hover:border-green-500/40 transition-all">
              <div className="text-green-500 bg-green-500/10 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <CheckCircle size={24} />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Hospital Onboarding</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest">Setup your dashboard</div>
              </div>
              <ExternalLink size={14} className="ml-auto text-gray-700" />
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="pt-12 border-t border-white/5 text-center space-y-4">
          <div className="flex justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-gray-600">
            <a href="#" className="hover:text-blue-400">Terms of Service</a>
            <a href="#" className="hover:text-blue-400">Privacy Policy</a>
            <a href="#" className="hover:text-blue-400">Status</a>
          </div>
          <p className="text-[10px] text-gray-700 font-mono">
            V2.4.1-CORE · ENCRYPTED CONNECTION · PHOENIX-7 INCIDENT SYSTEM
          </p>
        </div>
      </main>
    </div>
  );
}
