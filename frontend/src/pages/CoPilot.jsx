import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, User, Bot, HelpCircle, ShieldAlert, Trash2 } from 'lucide-react';
import { useCopilot } from '../context/CopilotContext';

import TxContextInput from '../components/copilot/TxContextInput';

export default function CoPilot() {
  const {
    selectedTransactionId,
    setSelectedTransactionId,
    transactionData,
    chatHistory,
    isLoading,
    sendMessage,
    clearSession
  } = useCopilot();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const quickStarters = [
    "What features are most important to the XGBoost model?",
    "How does the Behavioral Anomaly detection work?",
    "Why would a transaction have high anomaly but low XGBoost score?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isLoading]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const handleQuickStarter = (starterText) => {
    sendMessage(starterText);
  };

  const renderMessageContent = (text) => {
    return text.split('\n').map((line, i) => {
    if (line.startsWith('### ')) {
      return <h5 key={i} className="text-primary font-bold mt-3 mb-1 text-xs uppercase tracking-wider">{line.replace('### ', '')}</h5>;
    }
    if (line.startsWith('## ')) {
      return <h4 key={i} className="text-foreground font-bold mt-4 mb-2 text-sm">{line.replace('## ', '')}</h4>;
    }
    if (line.startsWith('# ')) {
      return <h3 key={i} className="text-foreground font-extrabold mt-4 mb-2 text-base">{line.replace('# ', '')}</h3>;
    }
    if (line.startsWith('- ') || line.startsWith('  - ')) {
      return (
        <div key={i} className="flex items-start gap-1.5 ml-2 text-xs py-0.5">
          <span className="text-primary mt-1 shrink-0">&#8226;</span>
          <span className="text-foreground/90">{line.replace(/^[-*]\s+/, '').replace(/\*\*/g, '')}</span>
        </div>
      );
    }
    if (line.trim() === '') return <div key={i} className="h-2" />;

    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <p key={i} className="text-xs text-foreground/90 leading-relaxed">
        {parts.map((part, index) => index % 2 === 1 ? <strong key={index} className="text-primary font-semibold">{part}</strong> : part)}
      </p>
    );
    });
  };

  return (
    <div className="flex-grow flex gap-6 h-[calc(100vh-8rem)]">
      <div className="flex-1 bg-card border border-border rounded-2xl flex flex-col overflow-hidden h-full shadow-sm">
        <div className="px-6 py-4 border-b border-border/60 bg-secondary/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Risk Co-Pilot</h3>
              <p className="text-[10px] text-muted-foreground font-medium">AI Agentic Analyst</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Tx Context:
              </label>
              <TxContextInput
                value={selectedTransactionId}
                onChange={setSelectedTransactionId}
                placeholder="Search Transaction ID..."
              />
            </div>
            <button
              onClick={clearSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-rose-400 hover:border-zinc-700/80 active:scale-[0.98] transition-all"
              title="Reset Chat Session"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Session
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chatHistory.map((msg, index) => {
            const isBot = msg.sender === 'assistant';
            return (
              <div
                key={index}
                className={`flex gap-3 max-w-[85%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center border ${
                  isBot ? 'bg-secondary/40 border-border text-primary' : 'bg-primary text-primary-foreground border-transparent'
                }`}>
                  {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div className={`p-4 rounded-2xl text-xs space-y-2 border ${
                  isBot 
                    ? msg.isError 
                      ? 'bg-red-500/5 border-red-500/20 text-red-400'
                      : 'bg-secondary/15 border-border/80 text-foreground'
                    : 'bg-primary/5 border-primary/20 text-foreground'
                }`}>
                  {isBot ? renderMessageContent(msg.text) : <p className="leading-relaxed">{msg.text}</p>}
                  
                  {msg.context && (
                    <div className="mt-3 pt-2.5 border-t border-border/40 text-[10px] text-muted-foreground flex justify-between items-center">
                      <span>Evaluated Context: <span className="font-mono font-bold text-foreground">{msg.context.transaction_id}</span></span>
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        msg.context.risk_category === 'HIGH_RISK' ? 'bg-red-500/10 text-red-400' :
                        msg.context.risk_category === 'MEDIUM_RISK' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-emerald-500/10 text-emerald-400'
                      }`}>{msg.context.risk_category}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex gap-3 mr-auto max-w-[85%] animate-pulse">
              <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center border bg-secondary/40 border-border text-primary">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="p-4 rounded-2xl text-xs bg-secondary/15 border border-border/80 text-muted-foreground flex items-center gap-2">
                Co-Pilot is researching transaction signals...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-border/60 bg-secondary/10 space-y-3">
          {chatHistory.length === 1 && !input && (
            <div className="flex flex-wrap gap-2 pb-1">
              {quickStarters.map((starter, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickStarter(starter)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-background hover:bg-secondary/40 border border-border/80 text-muted-foreground hover:text-foreground transition-all"
                >
                  <HelpCircle className="w-3 h-3 text-primary" />
                  {starter}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the co-pilot about risk factors..."
              className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary transition-colors text-foreground"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold p-2.5 rounded-xl shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      <div className="w-[300px] shrink-0 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5 h-full overflow-y-auto">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <ShieldAlert className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-xs uppercase tracking-wider">AI Copilot Core</h4>
        </div>
        <div className="space-y-4 text-xs leading-relaxed text-muted-foreground">
          <p>
            The Risk Co-Pilot utilizes **Retrieval-Augmented Generation (RAG)** to provide deep threat intelligence.
          </p>
          <div>
            <h5 className="font-bold text-foreground mb-1.5 text-[11px]">How to Query:</h5>
            <ul className="list-disc pl-4 space-y-1.5 text-[11px]">
              <li>Type general questions about models (e.g. "What is SHAP?").</li>
              <li>Attach a **Transaction ID** at the top right, and ask specific inquiries like "Why was this transaction blocked?" or "Explain the distance anomaly."</li>
            </ul>
          </div>
          
          <div className="space-y-2 mt-4">
            <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
              Active Context
            </div>
            {transactionData ? (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3.5">
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TX ID:</span>
                    <span className="font-mono font-bold text-foreground">{transactionData.transaction_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">User:</span>
                    <span className="font-semibold text-zinc-300">{transactionData.user_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-semibold text-zinc-300">₹{Number(transactionData.order_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Risk Level:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      transactionData.risk_category === 'HIGH_RISK' ? 'bg-red-500/15 text-red-400' :
                      transactionData.risk_category === 'MEDIUM_RISK' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-emerald-500/15 text-emerald-400'
                    }`}>
                      {transactionData.risk_category.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl text-[10px] text-zinc-500 text-center leading-normal">
                No active transaction context loaded. Enter a valid ID above.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
