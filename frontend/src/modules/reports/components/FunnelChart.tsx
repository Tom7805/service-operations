import React from 'react';
import type { PipelineStageRes } from '../types/pipelineReportTypes';

interface FunnelChartProps {
  stages: PipelineStageRes[];
  total: number;
}

const COLORS = ['#2563EB', '#4F46E5', '#06B6D4', '#10B981', '#F97316'];

export default function FunnelChart({ stages, total }: FunnelChartProps): JSX.Element {
  const maxWidth = 560; // px
  const minWidth = 80; // px for very small slices

  return (
    <svg width={maxWidth} height={stages.length * 72} viewBox={`0 0 ${maxWidth} ${stages.length * 72}`} role="img" aria-label="Funnel chart">
      {stages.map((s, i) => {
        const pct = total > 0 ? s.opportunityCount / total : 0;
        const width = Math.max(minWidth, Math.round(maxWidth * pct));
        const x = (maxWidth - width) / 2; // center
        const y = i * 72 + 12;
        const height = 48;
        const color = COLORS[i % COLORS.length];
        const isStalled = s.stalledCount > 0;

        return (
          <g key={s.stage} transform={`translate(0, ${i * 72})`}>
            <rect x={x} y={12} rx={8} ry={8} width={width} height={height} fill={color} opacity={0.92} />
            <text x={x + 16} y={36} fill="#fff" fontWeight={700} fontSize={14}>{s.stage}</text>
            <text x={x + 16} y={52} fill="#ffffffcc" fontSize={12}>{s.opportunityCount} opportunities • {s.totalExpectedValue.toLocaleString('vi-VN')} VND</text>
            {isStalled && (
              <g>
                <circle cx={x + width - 18} cy={36} r={10} fill="#FFB020" />
                <text x={x + width - 18} y={40} textAnchor="middle" fill="#1f2937" fontSize={12} fontWeight={700}>!</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
