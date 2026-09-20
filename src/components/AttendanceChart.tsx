import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { CheckCircle2, XCircle, Users, PieChart as PieChartIcon } from 'lucide-react';

interface AttendanceChartProps {
  presentCount: number;
  absentCount: number;
  total: number;
  eventName?: string;
}

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: ChartDataItem;
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white px-3 py-2 rounded-xl shadow-lg border border-slate-700 text-xs space-y-1">
        <div className="flex items-center gap-1.5 font-semibold">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: data.color }}
          />
          <span>{data.name}</span>
        </div>
        <div className="text-slate-300 font-mono">
          <span className="font-bold text-white">{data.value}</span> participante{data.value !== 1 ? 's' : ''} ({data.percentage}%)
        </div>
      </div>
    );
  }
  return null;
};

export const AttendanceChart: React.FC<AttendanceChartProps> = ({
  presentCount,
  absentCount,
  total,
  eventName,
}) => {
  const attendanceRate = total > 0 ? Math.round((presentCount / total) * 100) : 0;
  const absenceRate = total > 0 ? Math.round((absentCount / total) * 100) : 0;

  const data: ChartDataItem[] = [
    {
      name: 'Presentes',
      value: presentCount,
      color: '#10b981', // emerald-500
      percentage: attendanceRate,
    },
    {
      name: 'Ausentes',
      value: absentCount,
      color: '#f59e0b', // amber-500
      percentage: absenceRate,
    },
  ];

  // Caso não haja participantes, exibe anel cinza neutro
  const emptyData = [
    {
      name: 'Nenhum participante',
      value: 1,
      color: '#e2e8f0', // slate-200
      percentage: 0,
    },
  ];

  const hasData = total > 0;

  return (
    <div
      id="attendance-doughnut-chart-card"
      className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs"
    >
      {/* Cabeçalho do Gráfico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
            <PieChartIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Proporção de Presença
            </h3>
            <p className="text-xs text-slate-500">
              {eventName ? `Filtrado por: ${eventName}` : 'Visão geral de todos os participantes'}
            </p>
          </div>
        </div>

        {/* Badge de Taxa Global */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-slate-500 font-medium">Taxa de Adesão:</span>
          <span
            id="badge-attendance-rate"
            className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200/70"
          >
            {attendanceRate}%
          </span>
        </div>
      </div>

      {/* Conteúdo: Gráfico de Rosca + Legenda Detalhada */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-2">
        {/* Container do Gráfico de Rosca com Valor Centralizado */}
        <div className="md:col-span-6 flex items-center justify-center relative min-h-[190px] h-[190px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={hasData ? data : emptyData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={hasData && presentCount > 0 && absentCount > 0 ? 4 : 0}
                dataKey="value"
                stroke="none"
                isAnimationActive={true}
              >
                {(hasData ? data : emptyData).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Rótulo Centralizado dentro da Rosca */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-black tracking-tight text-slate-900 font-mono">
              {hasData ? `${attendanceRate}%` : '0'}
            </span>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              {hasData ? 'Presença' : 'Sem dados'}
            </span>
          </div>
        </div>

        {/* Legenda Informativa e Métricas com Barras Proporcionais */}
        <div className="md:col-span-6 space-y-3">
          {/* Card Presentes */}
          <div
            id="chart-legend-present"
            className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 transition-colors"
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-emerald-950">Presentes</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono font-bold text-sm text-emerald-700">
                  {presentCount}
                </span>
                <span className="text-[11px] text-emerald-600 font-medium">
                  ({attendanceRate}%)
                </span>
              </div>
            </div>
            {/* Barra de progresso */}
            <div className="w-full bg-emerald-200/60 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${hasData ? attendanceRate : 0}%` }}
              />
            </div>
          </div>

          {/* Card Ausentes */}
          <div
            id="chart-legend-absent"
            className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 transition-colors"
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="font-semibold text-amber-950">Ausentes</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono font-bold text-sm text-amber-700">
                  {absentCount}
                </span>
                <span className="text-[11px] text-amber-600 font-medium">
                  ({absenceRate}%)
                </span>
              </div>
            </div>
            {/* Barra de progresso */}
            <div className="w-full bg-amber-200/60 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${hasData ? absenceRate : 0}%` }}
              />
            </div>
          </div>

          {/* Rodapé da Legenda: Total Geral */}
          <div className="flex items-center justify-between px-2 pt-1 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              <span>Total de Participantes:</span>
            </div>
            <span className="font-mono font-bold text-slate-800">
              {total}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
