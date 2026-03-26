import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Clock, FolderTree, BarChart3 } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/sessions', label: 'Sessions', icon: Clock },
  { to: '/codebase', label: 'Codebase', icon: FolderTree },
  { to: '/activity', label: 'Activity', icon: BarChart3 },
];

export default function Navigation() {
  return (
    <nav className="mb-6">
      <div className="flex items-center gap-1 p-1 bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 rounded-xl">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
