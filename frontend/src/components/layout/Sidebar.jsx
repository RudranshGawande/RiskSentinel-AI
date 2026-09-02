import { NavLink } from 'react-router-dom';
import { Activity, ShieldAlert, Zap, MessageSquare, Terminal } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { to: '/', label: 'Command Center', icon: Activity },
    { to: '/evaluate', label: 'Evaluator', icon: Zap },
    { to: '/copilot', label: 'Risk Co-Pilot', icon: MessageSquare },
  ];

  return (
    <aside className="w-64 bg-card/35 backdrop-blur-lg border-r border-border flex flex-col justify-between shrink-0 h-screen sticky top-0 p-5">
      <div className="space-y-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-md font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 leading-tight">
              RiskSentinel
            </h1>
            <p className="text-[9px] text-muted-foreground leading-none tracking-widest uppercase mt-0.5">
              AI Risk Engine
            </p>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group border border-transparent ${
                    isActive
                      ? 'bg-primary/10 text-primary border-primary/20 shadow-sm shadow-primary/5'
                      : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    }`} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-3 bg-secondary/20 rounded-xl border border-border/40 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" />
            Backend
          </span>
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Connected
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground/60 leading-none">
          Version: 2.0 (Active)
        </div>
      </div>
    </aside>
  );
}
