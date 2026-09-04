'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, CheckCircle2, Lightbulb, Target } from 'lucide-react';
import GlassCard from './GlassCard';
import { GlassButton } from './GlassButton';
import ProgressBar from './ProgressBar';
import {
  buildFinanceSummaryText,
  type FinanceInsights,
  type MonthPoint,
} from '@/lib/finance';
import { analyzeFinances, type FinanceAdvice } from '@/lib/openai';
import { toErrorMessage } from '@/lib/errors';
import { formatCurrency } from '@/lib/format';

function scoreColor(score: number): string {
  if (score >= 70) return '#4ade80';
  if (score >= 40) return '#fbbf24';
  return '#f87171';
}

export default function FinanceAdvisor({
  insights,
  trend,
  balance,
}: {
  insights: FinanceInsights;
  trend: MonthPoint[];
  balance: number;
}) {
  const [advice, setAdvice] = useState<FinanceAdvice | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const metrics = useMemo(
    () => [
      {
        label: 'Tasa de ahorro',
        value: `${(insights.savingsRate * 100).toFixed(0)}%`,
        hint: `Neto ${formatCurrency(insights.net)}`,
      },
      {
        label: 'Gasto diario',
        value: formatCurrency(insights.dailyBurn),
        hint: `Día ${insights.dayOfMonth}/${insights.daysInMonth}`,
      },
      {
        label: 'Proyección fin de mes',
        value: formatCurrency(insights.projectedNet),
        hint: `Gasto proj. ${formatCurrency(insights.projectedExpense)}`,
      },
      {
        label: 'Vs mes anterior',
        value:
          insights.expenseDeltaPct === null
            ? '—'
            : `${insights.expenseDeltaPct >= 0 ? '+' : ''}${(insights.expenseDeltaPct * 100).toFixed(0)}%`,
        hint: `Gastabas ${formatCurrency(insights.prevExpense)}`,
      },
    ],
    [insights],
  );

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const summaryText = buildFinanceSummaryText(insights, trend, balance);
      const result = await analyzeFinances(summaryText);
      setAdvice(result);
    } catch (err) {
      setError(toErrorMessage(err, 'La IA no está disponible por ahora. Revisa tus métricas locales.'));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <GlassCard className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold text-textPrimary">
          <BrainCircuit size={17} strokeWidth={2} className="text-accent" />
          Gestor financiero IA
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="flex flex-col gap-0.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <span className="text-[11px] text-textSecondary">{m.label}</span>
            <span className="text-[18px] font-bold tabular-nums text-textPrimary">{m.value}</span>
            <span className="truncate text-[11px] text-textTertiary">{m.hint}</span>
          </div>
        ))}
      </div>

      {!advice ? (
        <GlassButton
          title={analyzing ? 'Analizando...' : 'Analizar mis finanzas con IA'}
          variant="primary"
          icon={BrainCircuit}
          loading={analyzing}
          onClick={() => void handleAnalyze()}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 rounded-2xl border border-accent/30 bg-accent/[0.06] p-4"
        >
          <div className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[16px] font-bold"
              style={{
                backgroundColor: `${scoreColor(advice.healthScore)}24`,
                color: scoreColor(advice.healthScore),
                border: `1px solid ${scoreColor(advice.healthScore)}66`,
              }}
            >
              {advice.healthScore}
            </span>
            <p className="text-[13px] leading-5 text-textPrimary">{advice.verdict}</p>
          </div>
          {advice.insights.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-accent">
                <Lightbulb size={13} strokeWidth={2} /> Hallazgos
              </span>
              <ul className="flex flex-col gap-1.5">
                {advice.insights.map((item, i) => (
                  <li key={i} className="text-[13px] leading-5 text-textPrimary">• {item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {advice.actions.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-success">
                <CheckCircle2 size={13} strokeWidth={2} /> Acciones recomendadas
              </span>
              <ul className="flex flex-col gap-1.5">
                {advice.actions.map((item, i) => (
                  <li key={i} className="text-[13px] leading-5 text-textPrimary">• {item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {advice.suggestedBudgets.length > 0 ? (
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-info">
                <Target size={13} strokeWidth={2} /> Presupuestos sugeridos
              </span>
              {advice.suggestedBudgets.map((b) => (
                <div key={b.category} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-textPrimary">{b.category}</span>
                    <span className="font-semibold tabular-nums text-textSecondary">{formatCurrency(b.amount)}</span>
                  </div>
                  <ProgressBar value={100} color="#60a5fa" />
                </div>
              ))}
            </div>
          ) : null}
          <GlassButton
            title={analyzing ? 'Analizando...' : 'Reanalizar'}
            variant="secondary"
            size="sm"
            icon={BrainCircuit}
            loading={analyzing}
            onClick={() => void handleAnalyze()}
          />
        </motion.div>
      )}
      {error ? <p className="text-[13px] text-danger">{error}</p> : null}
    </GlassCard>
  );
}
