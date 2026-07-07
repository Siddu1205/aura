import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MessageCircle, ArrowDown } from 'lucide-react';

export default function AskAura({ onAsk }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello, I am AURA's neural agent. Ask me anything about stock, dues, or sales patterns. For example: 'Which items are low in stock?'" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const answer = await onAsk(userMessage);
      
      // Simulate typing speed for wow factor
      let currentText = '';
      const responseIndex = messages.length + 1; // index in future state
      
      setMessages(prev => [...prev, { role: 'assistant', text: '', isTyping: true }]);
      
      const words = answer.split(' ');
      let i = 0;
      const interval = setInterval(() => {
        if (i < words.length) {
          currentText += (i === 0 ? '' : ' ') + words[i];
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', text: currentText, isTyping: true };
            return updated;
          });
          i++;
        } else {
          clearInterval(interval);
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', text: currentText, isTyping: false };
            return updated;
          });
        }
      }, 50);

    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Failed to query the analyzer engine. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-5 py-3.5 rounded-full bg-indigo-600 text-slate-100 shadow-2xl hover:bg-indigo-500 hover:scale-105 transition-all duration-300 border border-indigo-400/40 font-semibold tracking-wide"
        >
          <MessageCircle className="w-5 h-5 animate-pulse-slow" />
          <span>Ask AURA</span>
        </button>
      )}

      {/* Floating Console Window */}
      {isOpen && (
        <div className="w-[380px] h-[480px] bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-in">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm tracking-wide">Ask AURA System</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 p-1 rounded-lg transition-all"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-slate-100 rounded-tr-none'
                      : 'bg-slate-900 text-slate-300 rounded-tl-none border border-slate-800'
                  } leading-relaxed`}
                >
                  <p>{msg.text}</p>
                  {msg.isTyping && <span className="inline-block w-1.5 h-3.5 ml-1 bg-indigo-400 animate-pulse"></span>}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-900 text-slate-400 border border-slate-800 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </span>
                  <span>AURA is analyzing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Form */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about inventory, sales, dues..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 font-medium"
            />
            <button 
              type="submit"
              disabled={loading}
              className="p-2 rounded-xl bg-indigo-600 text-slate-200 hover:bg-indigo-500 hover:scale-105 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
