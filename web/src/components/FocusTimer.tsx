'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Timer, X } from 'lucide-react';
import { GlassButton } from './GlassButton';
import ProgressBar from './ProgressBar';

const PRESETS = [15, 25, 50];

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function FocusTimer({
  open,
  onClose,
  taskTitle,
  onLogMinutes,
}: {
  open: boolean;
  onClose: () => void;
  taskTitle: string;
  onLogMinutes: (minutes: number) => void;
}) {
  const [preset, setPreset] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setRemaining(preset * 60);
      setRunning(false);
      setFinished(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setRunning(false);
          setFinished(true);
          try {
            navigator.vibrate?.(300);
          } catch {
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  if (!open) return null;

  const total = preset * 60;
  const elapsed = total - remaining;
  const progress = total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 0;

  const selectPreset = (minutes: number) => {
    setPreset(minutes);
    setRemaining(minutes * 60);
    setRunning(false);
    setFinished(false);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={onClose}>
      <div
        className="glass-strong w-full max-w-sm rounded-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[17px] font-semibold text-textPrimary">
            <Timer size={17} strokeWidth={2} className="text-accent" />
            Modo enfoque
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/5 text-textSecondary hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>
        <p className="mb-4 line-clamp-2 text-[13px] text-textSecondary">{taskTitle}</p>

        <div className="mb-2 flex justify-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => selectPreset(p)}
              className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors ${
                preset === p
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-border bg-white/5 text-textSecondary hover:bg-white/10'
              }`}
            >
              {p} min
            </button>
          ))}
        </div>

        <p className="my-4 text-center text-[52px] font-bold tabular-nums tracking-wide text-textPrimary">
          {formatClock(remaining)}
        </p>
        <ProgressBar value={progress} color={finished ? '#4ade80' : '#8b7cf7'} />

        {finished ? (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-center text-[13px] font-semibold text-success">
              ¡Sesión completada! Buen enfoque.
            </p>
            <GlassButton
              title={`Sumar ${preset} min a la tarea`}
              variant="primary"
              size="sm"
              icon={Timer}
              onClick={() => {
                onLogMinutes(preset);
                onClose();
              }}
            />
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <GlassButton
              title={running ? 'Pausar' : elapsed > 0 ? 'Continuar' : 'Iniciar'}
              variant="primary"
              icon={running ? Pause : Play}
              onClick={() => setRunning((v) => !v)}
              className="flex-1"
            />
            <GlassButton
              title=""
              variant="secondary"
              icon={RotateCcw}
              onClick={() => {
                setRemaining(preset * 60);
                setRunning(false);
                setFinished(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
