import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../../lib/constants';
import { Search, X, Check, ChevronDown, Loader2 } from 'lucide-react';

export default function TxContextInput({ value, onChange, placeholder = "Attach Transaction ID" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef(null);

  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/api/copilot/transactions/search`, {
          params: { q: searchTerm, limit: 8 }
        });
        setResults(res.data?.results || []);
      } catch (err) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchTerm, isOpen]);

  const handleSelect = (txId) => {
    onChange(txId);
    setSearchTerm(txId);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleSelect(results[selectedIndex].transaction_id);
      } else if (searchTerm.trim()) {
        handleSelect(searchTerm.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  };

  const getRiskBadge = (category) => {
    if (category === 'HIGH_RISK') {
      return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">HIGH</span>;
    } else if (category === 'MEDIUM_RISK') {
      return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">MEDIUM</span>;
    } else {
      return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">LOW</span>;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={searchTerm}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="bg-background border border-border rounded-lg pl-3 pr-7 py-1 text-[11px] font-mono focus:outline-none focus:border-primary w-52 text-foreground placeholder:text-muted-foreground/60 transition-colors shadow-sm"
        />
        {searchTerm ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Clear transaction context"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <ChevronDown
            onClick={() => setIsOpen(!isOpen)}
            className={`absolute right-2 w-3 h-3 text-zinc-500 transition-transform cursor-pointer ${isOpen ? 'rotate-180 text-primary' : ''}`}
          />
        )}
      </div>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1.5 w-72 bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1.5 duration-150">
          <div className="px-3 py-1.5 border-b border-zinc-800/80 bg-zinc-900/50 flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
            <span>{searchTerm.trim() ? 'Matching Transactions' : 'Recent Transactions'}</span>
            {loading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
          </div>

          <ul className="max-h-60 overflow-y-auto py-1">
            {results.length > 0 ? (
              results.map((tx, idx) => {
                const isSelected = value === tx.transaction_id;
                const isHighlighted = selectedIndex === idx;

                return (
                  <li key={tx.transaction_id || idx}>
                    <button
                      type="button"
                      onClick={() => handleSelect(tx.transaction_id)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                        isHighlighted
                          ? 'bg-zinc-800/90 text-foreground'
                          : isSelected
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-zinc-300 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-mono text-[11px] font-bold text-foreground truncate">
                          {tx.transaction_id}
                        </span>
                        <span className="text-[10px] text-zinc-400 truncate">
                          User: {tx.user_id}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-semibold text-zinc-300 font-mono">
                          ₹{Number(tx.order_amount || 0).toLocaleString()}
                        </span>
                        {getRiskBadge(tx.risk_category)}
                      </div>
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-3 text-center text-xs text-zinc-500">
                {loading ? 'Searching...' : 'No transactions found'}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
