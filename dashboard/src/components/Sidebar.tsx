import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Eye, Plus, Layers, Search, X } from 'lucide-react';
import { Workspace } from '../lib/api';

interface SidebarProps {
  workspaces: Workspace[];
  selectedWorkspace: string | null;
  onSelectWorkspace: (name: string | null) => void;
}

export default function Sidebar({ workspaces, selectedWorkspace, onSelectWorkspace }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredWorkspaces = workspaces.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-72 bg-zinc-950 border-r border-zinc-800/50 flex flex-col backdrop-blur-sm">
      {/* Logo Header */}
      <div className="p-6 border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg border border-emerald-500/30">
            <Eye className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold gradient-text-emerald tracking-tight">WorkLens</h1>
        </div>
      </div>

      {/* Search Bar */}
      {workspaces.length > 3 && (
        <div className="p-4 border-b border-zinc-800/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-zinc-900/50 border border-zinc-800/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Workspace List */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* All Workspaces Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectWorkspace(null)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mb-4 ${
            selectedWorkspace === null
              ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
              : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 border border-transparent'
          }`}
        >
          <Layers className="w-5 h-5" />
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold">All Workspaces</div>
            <div className="text-xs opacity-70">{workspaces.length} total</div>
          </div>
        </motion.button>

        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 px-2">
          Workspaces
        </div>

        <AnimatePresence mode="popLayout">
          {filteredWorkspaces.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-zinc-500 px-4 py-8 text-center"
            >
              {searchQuery ? 'No workspaces match your search' : 'No workspaces yet'}
            </motion.div>
          ) : (
            <div className="space-y-2">
              {filteredWorkspaces.map((workspace, index) => (
                <motion.button
                  key={workspace.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectWorkspace(workspace.name)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    selectedWorkspace === workspace.name
                      ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                      : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 border border-transparent hover:border-zinc-800'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    selectedWorkspace === workspace.name
                      ? 'bg-emerald-500/20 border border-emerald-500/30'
                      : 'bg-zinc-800/50'
                  }`}>
                    <Folder className="w-4 h-4 flex-shrink-0" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-semibold truncate">{workspace.name}</div>
                    <div className="text-xs opacity-70 truncate">{workspace.path}</div>
                  </div>
                  {workspace.enabled && (
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [1, 0.7, 1]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 shadow-lg shadow-emerald-500/50"
                    />
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Workspace Button */}
      <div className="p-4 border-t border-zinc-800/50">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all duration-200 text-sm font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
          title="Add workspace via CLI: worklens workspace add"
        >
          <Plus className="w-4 h-4" />
          Add Workspace
        </motion.button>
        <div className="mt-3 text-xs text-zinc-500 text-center leading-relaxed">
          Use <code className="px-1.5 py-0.5 bg-zinc-900/50 rounded text-emerald-400 font-mono">worklens workspace add</code>
        </div>
      </div>
    </aside>
  );
}
