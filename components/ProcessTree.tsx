import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ProcessData, RiskLevel } from '../types';

interface ProcessTreeProps {
  processes: ProcessData[];
  onSelectProcess: (pid: number) => void;
  selectedPid: number | null;
}

export const ProcessTree: React.FC<ProcessTreeProps> = ({ processes, onSelectProcess, selectedPid }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || processes.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = 300;

    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", "translate(40,0)");

    // 1. Prepare Data: Handle Orphans and define Root
    const validPids = new Set(processes.map(p => p.pid));

    // Remap processes: If parent is missing from the current set, attach it to the virtual Kernel Root (0).
    const safeProcesses = processes.map(p => ({
        ...p,
        parentPid: validPids.has(p.parentPid) ? p.parentPid : 0
    }));

    // Define Virtual Root (PID 0)
    const rootData = {
        pid: 0,
        name: "Kernel Root",
        parentPid: null, 
        riskLevel: RiskLevel.SAFE,
        user: "SYSTEM",
    };

    const hierarchyData = [rootData, ...safeProcesses];

    // 2. Stratify
    // We use <any> here because rootData doesn't strictly match ProcessData, 
    // but D3 only needs the structure required by accessors.
    const stratify = d3.stratify<any>()
      .id(d => d.pid.toString())
      .parentId(d => {
          if (d.pid === 0) return null; // Root
          return d.parentPid.toString();
      });

    let root;
    try {
        root = stratify(hierarchyData);
    } catch (e) {
        console.error("D3 Stratify Error:", e);
        return;
    }

    const treeLayout = d3.tree<any>().size([height, width - 150]);
    treeLayout(root);

    // 3. Render Links
    svg.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#475569")
      .attr("stroke-width", 1.5)
      .attr("d", d3.linkHorizontal().x(d => d.y).y(d => d.x) as any);

    // 4. Render Nodes
    const nodes = svg.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", d => `node cursor-pointer ${d.data.pid === selectedPid ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`)
      .attr("transform", d => `translate(${d.y},${d.x})`)
      .on("click", (event, d) => {
        // Prevent selecting the dummy root
        if (d.data.pid !== 0) onSelectProcess(d.data.pid);
      });

    // Circles
    nodes.append("circle")
      .attr("r", 6)
      .attr("fill", d => {
        if (d.data.pid === 0) return "#475569"; // Grey for Root
        if (d.data.riskLevel === RiskLevel.MALICIOUS) return "#ef4444";
        if (d.data.riskLevel === RiskLevel.SUSPICIOUS) return "#eab308";
        return "#10b981";
      })
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 2);

    // Labels
    nodes.append("text")
      .attr("dy", 3)
      .attr("x", d => d.children ? -10 : 10)
      .style("text-anchor", d => d.children ? "end" : "start")
      .text(d => d.data.name)
      .attr("class", "text-[10px] font-mono fill-slate-300 pointer-events-none");

  }, [processes, selectedPid, onSelectProcess]);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden relative">
      <div className="absolute top-2 left-2 text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded z-10">
        PROCESS_HIERARCHY_VISUALIZER
      </div>
      <svg ref={svgRef} className="w-full h-[300px]"></svg>
    </div>
  );
};