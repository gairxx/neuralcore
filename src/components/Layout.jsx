import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Network, PlusCircle, Boxes, ArrowLeftRight, Brain, Code, LogIn, LogOut, Shield, Trophy, Swords, BookOpen, Radar, History } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { label: 'Scanner', path: '/', icon: Radar },
  { label: 'Scan History', path: '/scans', icon: History },
  { label: 'Graph Explorer', path: '/graph', icon: Network },
  { label: 'All Nodes', path: '/nodes', icon: Boxes },
  { label: 'API', path: '/api', icon: Code },
  { label: 'Challenges', path: '/challenges', icon: Swords },
  { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground font-heading">Synapse</h1>
              <p className="text-xs text-muted-foreground">Graph Memory</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          {isAuthenticated && isAdmin ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{user?.full_name || user?.email}</p>
                  <p className="text-xs text-muted-foreground">Admin</p>
                </div>
              </div>
              <button
                onClick={() => { logout(true); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              Admin
            </button>
          )}
          <div className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
            <p className="font-mono">Synapse v1.0</p>
            <p className="mt-1">Open Graph Memory for LLMs</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}