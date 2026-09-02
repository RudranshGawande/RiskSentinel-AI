import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import CommandCenter from './pages/CommandCenter';
import TransactionEval from './pages/TransactionEval';
import CoPilot from './pages/CoPilot';
import { CopilotProvider } from './context/CopilotContext';
import './App.css';

export default function App() {
  return (
    <CopilotProvider>
      <Router>
        <div className="min-h-screen bg-background text-foreground flex font-sans selection:bg-primary selection:text-primary-foreground">
          <Sidebar />

          <div className="flex-1 flex flex-col h-screen overflow-hidden">
            <header className="border-b border-border bg-card/25 backdrop-blur-md shrink-0 h-16 flex items-center justify-between px-8">
              <div className="flex items-center gap-4">
                <span className="text-xs px-3 py-1 rounded-full bg-secondary border border-border text-muted-foreground">
                  Risk Engine: <strong className="text-foreground">Dual ML v2.0</strong>
                </span>
              </div>
              <div className="flex items-center gap-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Live Feed Active
                </span>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto p-8 bg-zinc-950/20">
              <Routes>
                <Route path="/" element={<CommandCenter />} />
                <Route path="/evaluate" element={<TransactionEval />} />
                <Route path="/copilot" element={<CoPilot />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </CopilotProvider>
  );
}
