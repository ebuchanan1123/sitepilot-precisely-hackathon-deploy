import { useEffect, useMemo, useState } from 'react';

interface ScoreGaugeProps {
  score: number;
  animate: boolean;
}

const ANIMATION_MS = 1600;
const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function getColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 65) return '#84cc16';
  if (score >= 45) return '#f59e0b';
  return '#ef4444';
}

function getLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 45) return 'Fair';
  return 'Poor';
}

function easeOutExpo(value: number): number {
  if (value >= 1) return 1;
  return 1 - 2 ** (-10 * value);
}

export default function ScoreGauge({ score, animate }: ScoreGaugeProps) {
  const targetScore = clampScore(score);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (!animate) {
      setAnimatedScore(0);
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setAnimatedScore(targetScore);
      return;
    }

    setAnimatedScore(0);
    const start = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / ANIMATION_MS, 1);
      const eased = easeOutExpo(progress);
      setAnimatedScore(targetScore * eased);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [animate, targetScore]);

  const displayScore = Math.round(animatedScore);
  const color = getColor(animatedScore);
  const label = getLabel(targetScore);
  const dashOffset = useMemo(
    () => CIRCUMFERENCE - (animatedScore / 100) * CIRCUMFERENCE,
    [animatedScore],
  );

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[220px] w-[220px]">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={RADIUS}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="11"
          />
          <circle
            cx="70"
            cy="70"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: animate ? 'stroke 160ms linear' : undefined }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-7xl font-black tracking-tight" style={{ color }}>
            {displayScore}
          </span>
          <span className="mt-1 text-sm font-semibold uppercase tracking-[0.38em] text-gray-500">
            Score
          </span>
          <span className="mt-1 text-base font-semibold text-gray-500">
            {displayScore}% of 100
          </span>
        </div>
      </div>

      <span className="mt-3 text-base font-black uppercase tracking-[0.34em]" style={{ color }}>
        {label}
      </span>
    </div>
  );
}
