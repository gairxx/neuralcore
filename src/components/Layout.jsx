import { Outlet, Link, useLocation } from 'react-router-dom';
import { Network, PlusCircle, Boxes, ArrowLeftRight, Brain, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Graph Explorer', path: '/', icon: Network },
  { label: 'All Nodes', path: '/nodes', icon: Boxes },
  { label: 'All Edges', path: '/edges', icon: ArrowLeftRight },
  { label: 'New Node', path: '/nodes/new', icon: PlusCircle },
];

export default function Layout() {
  const location = useLocation();

  const handleLogout = () => {
    base44.auth.logout('/login');
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground font-heading">NeuralCore</h1>
              <p className="text-xs text-muted-foreground">Memory Vault</p>
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

        <div className="p-4 border-t border-border space-y-3">
          <div className="text-xs text-muted-foreground">
            <p className="font-mono">NeuralCore v1.0</p>
            <p className="mt-1">Persistent Memory Vault</p>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}