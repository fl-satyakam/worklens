import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { api, CoChange } from '../lib/api';
import { getExtColor } from '../lib/colors';
import { GitBranch } from 'lucide-react';
import { motion } from 'framer-motion';

interface CoChangeGraphProps {
  workspace?: string | null;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  weight: number;
  ext: string;
}

interface GraphLink {
  source: string;
  target: string;
  weight: number;
}

function getFileExtension(path: string): string {
  const match = path.match(/(\.[^./]+)$/);
  return match ? match[1] : '';
}

export default function CoChangeGraph({ workspace }: CoChangeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<CoChange[]>([]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    api.getCoChanges(workspace || undefined, 50).then(setData).catch(console.error);
  }, [workspace]);

  const { nodes, links } = useMemo(() => {
    const nodeMap = new Map<string, number>();
    data.forEach(({ source, target, weight }) => {
      nodeMap.set(source, (nodeMap.get(source) || 0) + weight);
      nodeMap.set(target, (nodeMap.get(target) || 0) + weight);
    });

    // Cap at 50 nodes
    const sortedNodes = Array.from(nodeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);
    const nodeSet = new Set(sortedNodes.map(([id]) => id));

    const graphNodes: GraphNode[] = sortedNodes.map(([id, weight]) => ({
      id,
      weight,
      ext: getFileExtension(id),
    }));

    const graphLinks: GraphLink[] = data
      .filter(({ source, target }) => nodeSet.has(source) && nodeSet.has(target))
      .map(({ source, target, weight }) => ({ source, target, weight }));

    return { nodes: graphNodes, links: graphLinks };
  }, [data]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = containerRef.current?.clientWidth || 600;
    const height = 400;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const maxWeight = Math.max(...nodes.map(n => n.weight), 1);
    const radiusScale = d3.scaleSqrt().domain([0, maxWeight]).range([4, 20]);
    const linkMaxWeight = Math.max(...links.map(l => l.weight), 1);
    const linkWidthScale = d3.scaleLinear().domain([0, linkMaxWeight]).range([0.5, 4]);

    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, d3.SimulationLinkDatum<GraphNode>>(
        links.map(l => ({ ...l })) as d3.SimulationLinkDatum<GraphNode>[]
      ).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphNode>().radius(d => radiusScale(d.weight) + 4));

    const linkElements = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#3f3f46')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', d => linkWidthScale(d.weight));

    const nodeElements = svg.append('g')
      .selectAll<SVGCircleElement, GraphNode>('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => radiusScale(d.weight))
      .attr('fill', d => getExtColor(d.ext))
      .attr('fill-opacity', 0.8)
      .attr('stroke', d => getExtColor(d.ext))
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.3)
      .style('cursor', 'grab')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('fill-opacity', 1).attr('stroke-opacity', 0.8);
        const [x, y] = d3.pointer(event, svgRef.current);
        setTooltip({
          x,
          y: y - 10,
          text: `${d.id.split('/').pop()} (${d.weight} co-changes)`,
        });
      })
      .on('mouseleave', function () {
        d3.select(this).attr('fill-opacity', 0.8).attr('stroke-opacity', 0.3);
        setTooltip(null);
      })
      .call(d3.drag<SVGCircleElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    simulation.on('tick', () => {
      linkElements
        .attr('x1', (d) => ((d as unknown as { source: GraphNode }).source.x || 0))
        .attr('y1', (d) => ((d as unknown as { source: GraphNode }).source.y || 0))
        .attr('x2', (d) => ((d as unknown as { target: GraphNode }).target.x || 0))
        .attr('y2', (d) => ((d as unknown as { target: GraphNode }).target.y || 0));

      nodeElements
        .attr('cx', d => d.x || 0)
        .attr('cy', d => d.y || 0);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="glass-card"
    >
      <div className="flex items-center gap-2 mb-5">
        <GitBranch className="w-5 h-5 text-emerald-400" />
        <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Co-Change Graph</h2>
        <span className="text-xs text-zinc-500 font-medium px-2 py-1 bg-zinc-800/50 rounded">Files that change together</span>
      </div>

      {nodes.length === 0 ? (
        <div className="text-center text-zinc-500 py-16">
          <GitBranch className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
          <p className="text-sm">No co-change data yet</p>
        </div>
      ) : (
        <div ref={containerRef} className="relative">
          <svg ref={svgRef} className="w-full" style={{ height: 400 }} />
          {tooltip && (
            <div
              className="absolute z-50 px-3 py-2 bg-zinc-800/95 backdrop-blur-sm border border-zinc-700/50 rounded-lg text-xs shadow-xl pointer-events-none"
              style={{ left: tooltip.x, top: tooltip.y - 40 }}
            >
              <span className="text-zinc-100">{tooltip.text}</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
