// /home/user/projects/studioxlam/src/components/finetune/GpuStats.tsx
import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import type { GpuStat } from '../../types';
import { GPU_DOT_COLORS, listGpus } from '../../utils/gpuUtils';

interface GpuStatsProps {
  isMobile?: boolean;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'] as const;

function getUsageColor(percentage: number) {
  if (percentage < 50) return 'bg-emerald-500';
  if (percentage < 80) return 'bg-amber-500';
  return 'bg-red-500';
}

function drawMiniChart(canvas: HTMLCanvasElement | null, history: number[], color: string) {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  if (history.every(v => v === 0)) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.fillStyle = `${color}20`;
  ctx.beginPath();

  const step = width / (history.length - 1);
  const maxValue = 100;
  const firstValue = history[0] ?? 0;

  ctx.moveTo(0, height - (firstValue / maxValue) * height);

  for (let i = 1; i < history.length; i++) {
    const x = i * step;
    const value = history[i] ?? 0;
    const y = height - (value / maxValue) * height;
    ctx.lineTo(x, y);
  }

  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

interface GpuCardProps {
  gpuKey: string;
  index: number;
  stat: Partial<GpuStat>;
  isMobile?: boolean;
  chartColor: string;
}

function GpuCard({ gpuKey, index, stat, isMobile, chartColor }: GpuCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<number[]>(Array(20).fill(0));
  const gpu = stat as GpuStat;

  useEffect(() => {
    if (gpu.percentage !== undefined) {
      historyRef.current = [
        ...historyRef.current.slice(1),
        Math.min(gpu.percentage, 100),
      ];
    }
    drawMiniChart(canvasRef.current, historyRef.current, chartColor);
  }, [gpu.percentage, chartColor]);

  useEffect(() => {
    drawMiniChart(canvasRef.current, historyRef.current, chartColor);
  }, [chartColor]);

  return (
    <div key={gpuKey} className="flex flex-col gap-2 p-3 bg-background/50 dark:bg-muted/50 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground/80 flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${GPU_DOT_COLORS[index % GPU_DOT_COLORS.length]}`} />
          <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          GPU {index}
          {gpu.name && gpu.name !== 'Detecting...' && (
            <span className="text-[10px] text-muted-foreground font-normal truncate max-w-[100px]">
              {gpu.name.split(' ').slice(0, 2).join(' ')}
            </span>
          )}
        </span>
        <span className="text-xs font-mono text-muted-foreground">
          {gpu.temperature || 0}°C
        </span>
      </div>

      <div className="w-full h-12 mt-1" style={{ minWidth: 0, minHeight: 0 }}>
        <canvas
          ref={canvasRef}
          width={isMobile ? 200 : 250}
          height={40}
          className="w-full h-full"
          style={{ display: 'block' }}
        />
      </div>

      <div className="space-y-2 mt-1">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Память</span>
            <span className="font-mono">
              {gpu.used?.toFixed(1) || '0'} / {gpu.total?.toFixed(0) || '24'} GB
            </span>
          </div>
          <div className="h-1.5 w-full bg-border dark:bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getUsageColor(gpu.percentage || 0)}`}
              style={{ width: `${Math.min(gpu.percentage || 0, 100)}%` }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Утилизация</span>
            <span className="font-mono">{gpu.utilization || 0}%</span>
          </div>
          <div className="h-1.5 w-full bg-border dark:bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getUsageColor(gpu.utilization || 0)}`}
              style={{ width: `${Math.min(gpu.utilization || 0, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between text-[10px] text-muted-foreground pt-1 border-t border-border">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {gpu.powerDraw || 0}W
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {gpu.memoryClock || 0} MHz
          </span>
        </div>
      </div>
    </div>
  );
}

const GpuStats: React.FC<GpuStatsProps> = ({ isMobile }) => {
  const gpuStats = useSelector((state: RootState) => state.finetune.gpuStats);
  const gpus = listGpus(gpuStats);

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          GPU Ресурсы
        </h4>
        {gpus.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {gpus.length} GPU
          </span>
        )}
      </div>

      <div className="flex-1 space-y-3">
        {gpus.length > 0 ? (
          gpus.map(({ key, index, stat }, i) => (
            <GpuCard
              key={key}
              gpuKey={key}
              index={index}
              stat={stat}
              isMobile={isMobile}
              chartColor={CHART_COLORS[i % CHART_COLORS.length] ?? '#3b82f6'}
            />
          ))
        ) : (
          <div className="text-xs text-muted-foreground text-center py-4">
            Ожидание данных GPU...
          </div>
        )}
      </div>

      {gpus.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            {gpus.map(({ key, index, stat }, i) => (
              <span key={key} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                GPU {index} - {stat.percentage || 0}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GpuStats;
