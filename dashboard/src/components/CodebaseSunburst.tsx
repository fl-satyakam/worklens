import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { api, CodebaseNode } from '../lib/api';
import { getExtColor } from '../lib/colors';
import { ArrowLeft, FolderTree } from 'lucide-react';
import { motion } from 'framer-motion';

interface CodebaseSunburstProps {
  workspace?: string | null;
}

interface HierarchyDatum {
  name: string;
  path: string;
  eventCount: number;
  lastModified: string | null;
  children?: HierarchyDatum[];
}

function getFileExtension(path: string): string {
  const match = path.match(/(\.[^./]+)$/);
  return match ? match[1] : '';
}

function flattenFiles(node: CodebaseNode, list: { path: string; eventCount: number }[] = []): { path: string; eventCount: number }[] {
  if (!node.children || node.children.length === 0) {
    if (node.eventCount > 0) list.push({ path: node.path, eventCount: node.eventCount });
  } else {
    node.children.forEach(c => flattenFiles(c, list));
  }
  return list;
}

export default function CodebaseSunburst({ workspace }: CodebaseSunburstProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<CodebaseNode | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; path: string; count: number; lastModified: string | null } | null>(null);

  useEffect(() => {
    api.getCodebase(workspace || undefined).then(setData).catch(console.error);
  }, [workspace]);

  const topFiles = useMemo(() => {
    if (!data) return [];
    return flattenFiles(data)
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);
  }, [data]);

  const maxFileCount = useMemo(() => Math.max(...topFiles.map(f => f.eventCount), 1), [topFiles]);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 560;
    const height = 560;
    const radius = Math.min(width, height) / 2;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const hierarchy = d3.hierarchy<HierarchyDatum>(data as HierarchyDatum)
      .sum(d => (!d.children || d.children.length === 0) ? Math.max(d.eventCount, 1) : 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const partition = d3.partition<HierarchyDatum>()
      .size([2 * Math.PI, radius]);

    const root = partition(hierarchy);

    const arc = d3.arc<d3.HierarchyRectangularNode<HierarchyDatum>>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(0.005)
      .padRadius(radius / 2)
      .innerRadius(d => Math.max(0, d.y0))
      .outerRadius(d => Math.max(0, d.y1 - 1));

    // Current zoom target
    let currentRoot = root;

    function getArcColor(d: d3.HierarchyRectangularNode<HierarchyDatum>): string {
      if (d.children && d.children.length > 0) {
        // Directory
        const depth = d.depth;
        const shades = ['#3f3f46', '#52525b', '#71717a', '#a1a1aa'];
        return shades[Math.min(depth, shades.length - 1)];
      }
      const ext = getFileExtension(d.data.path);
      return getExtColor(ext);
    }

    const paths = g.selectAll<SVGPathElement, d3.HierarchyRectangularNode<HierarchyDatum>>('path')
      .data(root.descendants().filter(d => d.depth > 0))
      .join('path')
      .attr('d', arc)
      .attr('fill', d => getArcColor(d))
      .attr('fill-opacity', d => d.depth === 1 ? 0.9 : 0.7 + d.depth * 0.05)
      .attr('stroke', '#09090b')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .on('click', (_event, d) => {
        if (d.children && d.children.length > 0) {
          clicked(d);
        }
      })
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('fill-opacity', 1);
        const [x, y] = d3.pointer(event, svgRef.current);
        setTooltip({
          x,
          y: y - 10,
          path: d.data.path,
          count: d.data.eventCount,
          lastModified: d.data.lastModified,
        });
      })
      .on('mouseleave', function (_event, d) {
        d3.select(this).attr('fill-opacity', d.depth === 1 ? 0.9 : 0.7 + d.depth * 0.05);
        setTooltip(null);
      });

    // Center circle
    const centerGroup = g.append('g').attr('class', 'center');

    centerGroup.append('circle')
      .attr('r', root.y1 > 0 ? root.descendants()[0].y1 * 0 + (root.children ? root.children[0].y0 : 40) : 40)
      .attr('fill', '#18181b')
      .attr('stroke', '#27272a')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('click', () => {
        if (currentRoot.parent) {
          clicked(currentRoot.parent);
        }
      });

    const centerName = centerGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .attr('fill', '#fafafa')
      .attr('font-size', '13')
      .attr('font-weight', '700')
      .text(data.name || 'root');

    const centerCount = centerGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.2em')
      .attr('fill', '#71717a')
      .attr('font-size', '11')
      .text(`${data.eventCount} events`);

    function clicked(p: d3.HierarchyRectangularNode<HierarchyDatum>) {
      currentRoot = p;

      const breadcrumb: string[] = [];
      let node: d3.HierarchyRectangularNode<HierarchyDatum> | null = p;
      while (node && node.depth > 0) {
        breadcrumb.unshift(node.data.name);
        node = node.parent;
      }
      setCurrentPath(breadcrumb);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = svg.transition().duration(600) as any;

      root.each(d => {
        (d as d3.HierarchyRectangularNode<HierarchyDatum> & { target: { x0: number; x1: number; y0: number; y1: number } }).target = {
          x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          y0: Math.max(0, d.y0 - p.y0),
          y1: Math.max(0, d.y1 - p.y0),
        };
      });

      paths.transition(t)
        .tween('data', (d) => {
          const target = (d as d3.HierarchyRectangularNode<HierarchyDatum> & { target: { x0: number; x1: number; y0: number; y1: number } }).target;
          const i = d3.interpolate(
            { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 },
            target
          );
          return (t: number) => {
            const val = i(t);
            d.x0 = val.x0;
            d.x1 = val.x1;
            d.y0 = val.y0;
            d.y1 = val.y1;
          };
        })
        .attr('d', (d) => arc(d) || '')
        .attr('fill-opacity', (d) => {
          const target = (d as d3.HierarchyRectangularNode<HierarchyDatum> & { target: { x0: number; x1: number; y0: number; y1: number } }).target;
          return target.x1 > target.x0 ? (d.depth === 1 ? 0.9 : 0.7 + d.depth * 0.05) : 0;
        });

      centerName.text(p.data.name || 'root');
      centerCount.text(`${p.data.eventCount} events`);
    }
  }, [data]);

  if (!data) {
    return (
      <div className="glass-card animate-pulse">
        <div className="flex items-center gap-2 mb-5">
          <FolderTree className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Codebase Structure</h2>
        </div>
        <div className="h-[560px] bg-zinc-800/20 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Codebase Sunburst</h2>
          </div>
          {currentPath.length > 0 && (
            <button
              onClick={() => setCurrentPath([])}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-emerald-400 transition-colors px-3 py-1.5 bg-zinc-800/50 rounded-lg border border-zinc-700/50 hover:border-emerald-500/30"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to root
            </button>
          )}
        </div>

        {/* Breadcrumb */}
        {currentPath.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-zinc-500 mb-4 overflow-x-auto">
            <span className="text-zinc-400 font-medium">root</span>
            {currentPath.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-zinc-600">/</span>
                <span className={i === currentPath.length - 1 ? 'text-emerald-400 font-medium' : 'text-zinc-400'}>
                  {part}
                </span>
              </span>
            ))}
          </div>
        )}

        <div className="relative flex justify-center">
          <svg ref={svgRef} className="w-full max-w-[560px] h-auto" />
          {tooltip && (
            <div
              className="absolute z-50 px-3 py-2 bg-zinc-800/95 backdrop-blur-sm border border-zinc-700/50 rounded-lg text-xs shadow-xl pointer-events-none"
              style={{ left: tooltip.x, top: tooltip.y - 50 }}
            >
              <div className="text-zinc-100 font-mono truncate max-w-[200px]">{tooltip.path}</div>
              <div className="text-emerald-400 font-semibold mt-1">{tooltip.count} events</div>
              {tooltip.lastModified && (
                <div className="text-zinc-500 mt-0.5">{new Date(tooltip.lastModified).toLocaleDateString()}</div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Top Active Files */}
      {topFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass-card"
        >
          <h3 className="text-lg font-bold text-zinc-100 mb-4 tracking-tight">Top 10 Most Active Files</h3>
          <div className="space-y-3">
            {topFiles.map((file, i) => {
              const ext = getFileExtension(file.path);
              const color = getExtColor(ext);
              const width = (file.eventCount / maxFileCount) * 100;
              return (
                <div key={i} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-zinc-300 truncate max-w-[70%]" title={file.path}>
                      {file.path.split('/').pop() || file.path}
                    </span>
                    <span className="text-xs text-zinc-500 tabular-nums">{file.eventCount}</span>
                  </div>
                  <div className="h-2 bg-zinc-800/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ duration: 0.6, delay: i * 0.05 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
