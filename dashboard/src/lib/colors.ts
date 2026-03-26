export const EXT_COLORS: Record<string, string> = {
  '.ts': '#3b82f6',
  '.tsx': '#a855f7',
  '.js': '#eab308',
  '.jsx': '#facc15',
  '.css': '#ec4899',
  '.scss': '#f472b6',
  '.html': '#f97316',
  '.json': '#fbbf24',
  '.md': '#6b7280',
  '.py': '#3b82f6',
  '.go': '#06b6d4',
  '.rs': '#f97316',
  '.java': '#ef4444',
  '.yml': '#8b5cf6',
  '.yaml': '#8b5cf6',
  '.sql': '#14b8a6',
  '.sh': '#22c55e',
};

export const EXT_LABELS: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'React TSX',
  '.js': 'JavaScript',
  '.jsx': 'React JSX',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.html': 'HTML',
  '.json': 'JSON',
  '.md': 'Markdown',
  '.py': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.yml': 'YAML',
  '.yaml': 'YAML',
  '.sql': 'SQL',
  '.sh': 'Shell',
};

export function getExtColor(ext: string): string {
  return EXT_COLORS[ext] || EXT_COLORS['.' + ext] || '#6b7280';
}
