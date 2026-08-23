import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Sparkles, TrendingUp, Calendar, CheckCircle2, Flame, Target } from 'lucide-react';
import { XpDayRecord } from '../types';

interface WeeklyXpD3ChartProps {
  data?: XpDayRecord[];
  dailyXp: number;
  maxDailyXp: number;
  streakDays: number;
}

export const WeeklyXpD3Chart: React.FC<WeeklyXpD3ChartProps> = ({
  data,
  dailyXp,
  maxDailyXp,
  streakDays,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredDay, setHoveredDay] = useState<XpDayRecord | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Synchronize dynamic 7-day data with live dailyXp and goal
  const chartData: XpDayRecord[] = React.useMemo(() => {
    if (data && data.length > 0) {
      // Ensure the last item (Today) reflects live state
      const cloned = data.map((item, idx) => {
        if (idx === data.length - 1 || item.shortDate === 'Today') {
          return {
            ...item,
            xp: dailyXp,
            goalXp: maxDailyXp,
          };
        }
        return item;
      });
      return cloned;
    }

    // Default fallback 7 days
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const pastXps = [16, 22, 25, 18, 30, 24, dailyXp];
    return pastXps.map((xp, i) => ({
      day: dayNames[i],
      shortDate: i === 6 ? 'Today' : `Day ${i + 1}`,
      xp,
      goalXp: maxDailyXp,
    }));
  }, [data, dailyXp, maxDailyXp]);

  const totalWeeklyXp = chartData.reduce((sum, d) => sum + d.xp, 0);
  const avgDailyXp = Math.round(totalWeeklyXp / chartData.length);
  const daysMetGoal = chartData.filter((d) => d.xp >= d.goalXp).length;
  const consistencyRate = Math.round((daysMetGoal / chartData.length) * 100);

  // Render D3 Chart
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // clear prior elements

    const containerWidth = containerRef.current.clientWidth || 500;
    const height = 230;
    const margin = { top: 28, right: 24, bottom: 38, left: 34 };
    const width = containerWidth;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    // Defs for gradients and glow filters
    const defs = svg.append('defs');

    // 1. Area Fill Gradient
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'xp-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#C5A059')
      .attr('stop-opacity', 0.45);

    areaGradient
      .append('stop')
      .attr('offset', '65%')
      .attr('stop-color', '#C5A059')
      .attr('stop-opacity', 0.12);

    areaGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#C5A059')
      .attr('stop-opacity', 0.0);

    // 2. Bar Gradient
    const barGradient = defs
      .append('linearGradient')
      .attr('id', 'xp-bar-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    barGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#DFC386')
      .attr('stop-opacity', 0.55);

    barGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#8C6B28')
      .attr('stop-opacity', 0.15);

    // 3. Line Glow Filter
    const filter = defs.append('filter').attr('id', 'gold-glow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'blur');
    filter.append('feMerge').selectAll('feMergeNode').data(['blur', 'SourceGraphic']).enter().append('feMergeNode').attr('in', (d) => d);

    // Main Chart Group
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleBand<string>()
      .domain(chartData.map((d) => d.day))
      .range([0, innerWidth])
      .padding(0.38);

    const maxDataXp = d3.max(chartData, (d) => Math.max(d.xp, d.goalXp)) || 30;
    const yMax = Math.ceil((maxDataXp * 1.25) / 5) * 5;

    const yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]).nice();

    // Background Grid lines
    const yTicks = yScale.ticks(4);
    const gridGroup = g.append('g').attr('class', 'grid-lines');

    yTicks.forEach((tick) => {
      const yPos = yScale(tick);
      gridGroup
        .append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yPos)
        .attr('y2', yPos)
        .attr('stroke', 'rgba(255, 255, 255, 0.07)')
        .attr('stroke-dasharray', '3,3');

      // Left axis tick label
      gridGroup
        .append('text')
        .attr('x', -8)
        .attr('y', yPos + 3.5)
        .attr('text-anchor', 'end')
        .attr('fill', 'rgba(255, 255, 255, 0.35)')
        .attr('font-size', '10px')
        .attr('font-family', 'sans-serif')
        .text(tick);
    });

    // Target Goal Dashed Guide Line
    const targetY = yScale(maxDailyXp);
    if (targetY >= 0 && targetY <= innerHeight) {
      const goalLine = g.append('g').attr('class', 'goal-reference');

      goalLine
        .append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', targetY)
        .attr('y2', targetY)
        .attr('stroke', '#C5A059')
        .attr('stroke-width', 1.2)
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0.85);

      goalLine
        .append('rect')
        .attr('x', innerWidth - 58)
        .attr('y', targetY - 9)
        .attr('width', 58)
        .attr('height', 16)
        .attr('rx', 4)
        .attr('fill', '#1E1B14')
        .attr('stroke', '#C5A059')
        .attr('stroke-width', 0.8);

      goalLine
        .append('text')
        .attr('x', innerWidth - 29)
        .attr('y', targetY + 3)
        .attr('text-anchor', 'middle')
        .attr('fill', '#DFC386')
        .attr('font-size', '9px')
        .attr('font-weight', '600')
        .text(`Goal ${maxDailyXp} XP`);
    }

    // Daily Bars
    const barWidth = Math.min(xScale.bandwidth(), 28);
    const barsGroup = g.append('g').attr('class', 'xp-bars');

    chartData.forEach((d) => {
      const x = (xScale(d.day) || 0) + (xScale.bandwidth() - barWidth) / 2;
      const y = yScale(d.xp);
      const barHeight = innerHeight - y;
      const isGoalMet = d.xp >= d.goalXp;

      // Bar rect
      barsGroup
        .append('rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', barWidth)
        .attr('height', barHeight)
        .attr('rx', 4)
        .attr('fill', isGoalMet ? 'url(#xp-bar-gradient)' : 'rgba(255,255,255,0.08)')
        .attr('stroke', isGoalMet ? '#C5A059' : 'rgba(255,255,255,0.15)')
        .attr('stroke-width', 0.75)
        .attr('opacity', 0.85)
        .style('cursor', 'pointer')
        .on('mouseenter', function (event) {
          d3.select(this).attr('opacity', 1).attr('stroke-width', 1.5);
          setHoveredDay(d);
          const [mx, my] = d3.pointer(event, containerRef.current);
          setHoverPos({ x: mx, y: my });
        })
        .on('mousemove', function (event) {
          const [mx, my] = d3.pointer(event, containerRef.current);
          setHoverPos({ x: mx, y: my });
        })
        .on('mouseleave', function () {
          d3.select(this).attr('opacity', 0.85).attr('stroke-width', 0.75);
          setHoveredDay(null);
          setHoverPos(null);
        });
    });

    // D3 Area Generator
    const areaGenerator = d3
      .area<XpDayRecord>()
      .x((d) => (xScale(d.day) || 0) + xScale.bandwidth() / 2)
      .y0(innerHeight)
      .y1((d) => yScale(d.xp))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(chartData)
      .attr('fill', 'url(#xp-area-gradient)')
      .attr('d', areaGenerator)
      .attr('pointer-events', 'none');

    // D3 Line Generator
    const lineGenerator = d3
      .line<XpDayRecord>()
      .x((d) => (xScale(d.day) || 0) + xScale.bandwidth() / 2)
      .y((d) => yScale(d.xp))
      .curve(d3.curveMonotoneX);

    // Glowing line path
    g.append('path')
      .datum(chartData)
      .attr('fill', 'none')
      .attr('stroke', '#C5A059')
      .attr('stroke-width', 2.2)
      .attr('filter', 'url(#gold-glow)')
      .attr('d', lineGenerator)
      .attr('pointer-events', 'none');

    // Interactive Data Nodes & Today Pulse
    const nodesGroup = g.append('g').attr('class', 'xp-nodes');

    chartData.forEach((d, idx) => {
      const cx = (xScale(d.day) || 0) + xScale.bandwidth() / 2;
      const cy = yScale(d.xp);
      const isToday = idx === chartData.length - 1;
      const isGoalMet = d.xp >= d.goalXp;

      if (isToday) {
        // Outer halo pulse circle for Today
        nodesGroup
          .append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 9)
          .attr('fill', '#C5A059')
          .attr('opacity', 0.25)
          .attr('class', 'animate-ping');
      }

      // Outer gold circle
      nodesGroup
        .append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', isToday ? 5.5 : 4)
        .attr('fill', '#121212')
        .attr('stroke', isGoalMet ? '#DFC386' : '#C5A059')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseenter', (event) => {
          setHoveredDay(d);
          const [mx, my] = d3.pointer(event, containerRef.current);
          setHoverPos({ x: mx, y: my });
        })
        .on('mousemove', (event) => {
          const [mx, my] = d3.pointer(event, containerRef.current);
          setHoverPos({ x: mx, y: my });
        })
        .on('mouseleave', () => {
          setHoveredDay(null);
          setHoverPos(null);
        });

      // Inner center dot
      nodesGroup
        .append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', isToday ? 2.5 : 1.8)
        .attr('fill', isGoalMet ? '#DFC386' : '#C5A059')
        .attr('pointer-events', 'none');

      // Bottom X-Axis day label
      g.append('text')
        .attr('x', cx)
        .attr('y', innerHeight + 18)
        .attr('text-anchor', 'middle')
        .attr('fill', isToday ? '#DFC386' : 'rgba(255,255,255,0.7)')
        .attr('font-size', '11px')
        .attr('font-weight', isToday ? '700' : '500')
        .attr('font-family', 'sans-serif')
        .text(d.day);

      // Sub-label for Today or Short Date
      g.append('text')
        .attr('x', cx)
        .attr('y', innerHeight + 30)
        .attr('text-anchor', 'middle')
        .attr('fill', isToday ? '#C5A059' : 'rgba(255,255,255,0.3)')
        .attr('font-size', '8.5px')
        .attr('font-family', 'sans-serif')
        .text(isToday ? '● Now' : d.shortDate.split(' ')[1] || d.shortDate);
    });
  }, [chartData, maxDailyXp]);

  // Handle ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      // Force trigger state rerender on container width shift
      if (svgRef.current && containerRef.current) {
        const svg = d3.select(svgRef.current);
        const containerWidth = containerRef.current.clientWidth || 500;
        svg.attr('viewBox', `0 0 ${containerWidth} 230`);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <section
      id="weekly-xp-consistency-chart"
      className="bg-[#121212] rounded-2xl p-5 sm:p-6 border border-white/10 shadow-xl space-y-5"
    >
      {/* Header & Metric Highlights */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-[#C5A059]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A059]">
              Consistency Radar • अभ्यास सातत्य
            </span>
          </div>
          <h3 className="font-serif text-xl font-normal text-white">
            7-Day Learning Consistency
          </h3>
        </div>

        {/* Consistency Score Badge */}
        <div className="flex items-center gap-2 bg-[#C5A059]/10 border border-[#C5A059]/30 rounded-xl px-3 py-1.5 self-start sm:self-auto">
          <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-white leading-tight">
              {consistencyRate}% Goal Consistency
            </span>
            <span className="text-[9px] text-[#C5A059] font-medium tracking-wide">
              {daysMetGoal} of 7 days target met
            </span>
          </div>
        </div>
      </div>

      {/* KPI Overview Pills */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-[#181818] rounded-xl p-3 border border-white/5 flex flex-col">
          <span className="text-[10px] uppercase font-semibold text-white/50 tracking-wider">
            7-Day XP Total
          </span>
          <span className="font-serif text-lg sm:text-xl font-bold text-white mt-0.5">
            {totalWeeklyXp}{' '}
            <span className="text-xs font-sans text-[#C5A059] font-medium">XP</span>
          </span>
        </div>

        <div className="bg-[#181818] rounded-xl p-3 border border-white/5 flex flex-col">
          <span className="text-[10px] uppercase font-semibold text-white/50 tracking-wider">
            Daily Average
          </span>
          <span className="font-serif text-lg sm:text-xl font-bold text-white mt-0.5">
            {avgDailyXp}{' '}
            <span className="text-xs font-sans text-[#C5A059] font-medium">XP/day</span>
          </span>
        </div>

        <div className="bg-[#181818] rounded-xl p-3 border border-white/5 flex flex-col">
          <span className="text-[10px] uppercase font-semibold text-white/50 tracking-wider">
            Current Target
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            <Target className="w-3.5 h-3.5 text-[#C5A059]" />
            <span className="font-serif text-lg sm:text-xl font-bold text-white">
              {maxDailyXp}{' '}
              <span className="text-xs font-sans text-[#C5A059] font-medium">XP</span>
            </span>
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div ref={containerRef} className="relative w-full overflow-hidden select-none">
        <svg ref={svgRef} className="w-full overflow-visible" />

        {/* Interactive Floating Hover Tooltip */}
        {hoveredDay && hoverPos && (
          <div
            className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 bg-[#1A1A1A]/95 backdrop-blur-md border border-[#C5A059]/50 rounded-xl p-2.5 shadow-2xl shadow-black/80 text-left min-w-[130px] animate-in fade-in zoom-in-95 duration-150"
            style={{
              left: `${Math.max(70, Math.min(hoverPos.x, (containerRef.current?.clientWidth || 300) - 70))}px`,
              top: `${Math.max(10, hoverPos.y - 12)}px`,
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1 mb-1.5">
              <span className="text-[11px] font-bold text-white">
                {hoveredDay.day} ({hoveredDay.shortDate})
              </span>
              {hoveredDay.xp >= hoveredDay.goalXp ? (
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Met
                </span>
              ) : (
                <span className="text-[9px] bg-amber-500/20 text-amber-300 font-semibold px-1.5 py-0.5 rounded-full">
                  {hoveredDay.goalXp - hoveredDay.xp} XP to goal
                </span>
              )}
            </div>

            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[10px] text-white/60">Gained:</span>
              <span className="text-sm font-serif font-bold text-[#DFC386]">
                {hoveredDay.xp} <span className="text-[10px] font-sans text-white/50">XP</span>
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-3 text-[9.5px] text-white/50 mt-0.5">
              <span>Goal:</span>
              <span>{hoveredDay.goalXp} XP</span>
            </div>
          </div>
        )}
      </div>

      {/* Chart Legend & Classical Wisdom Note */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10.5px] text-white/50 pt-1 border-t border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-xs bg-[#DFC386]/60 border border-[#C5A059]" />
            <span>Daily Volume</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-[2px] bg-[#C5A059]" />
            <span>Progress Trend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-[1px] border-b border-dashed border-[#C5A059]" />
            <span>Goal Benchmark</span>
          </div>
        </div>

        <div className="italic text-white/40 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#C5A059]" />
          <span>"Satatam abhyāsena" — Continuous daily dedication</span>
        </div>
      </div>
    </section>
  );
};
