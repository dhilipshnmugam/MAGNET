import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#ef4444', '#22c55e', '#ec4899', '#8b5cf6', '#14b8a6'];

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, children, className = '' }: ChartCardProps) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

interface BarChartComponentProps {
  data: any[];
  xKey: string;
  yKey: string;
  color?: string;
  title?: string;
  height?: number;
}

export function SimpleBarChart({ data, xKey, yKey, color = '#6366f1', height = 300 }: BarChartComponentProps) {
  const { isDark } = useTheme();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke={isDark ? '#9ca3af' : '#6b7280'} />
        <YAxis tick={{ fontSize: 12 }} stroke={isDark ? '#9ca3af' : '#6b7280'} />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? '#1f2937' : '#fff',
            border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface MultiBarChartProps {
  data: any[];
  xKey: string;
  bars: { key: string; color: string; name: string }[];
  height?: number;
}

export function MultiBarChart({ data, xKey, bars, height = 300 }: MultiBarChartProps) {
  const { isDark } = useTheme();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke={isDark ? '#9ca3af' : '#6b7280'} />
        <YAxis tick={{ fontSize: 12 }} stroke={isDark ? '#9ca3af' : '#6b7280'} />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? '#1f2937' : '#fff',
            border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Legend />
        {bars.map((bar) => (
          <Bar key={bar.key} dataKey={bar.key} name={bar.name} fill={bar.color} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

interface LineChartComponentProps {
  data: any[];
  xKey: string;
  lines: { key: string; color: string; name: string }[];
  height?: number;
}

export function SimpleLineChart({ data, xKey, lines, height = 300 }: LineChartComponentProps) {
  const { isDark } = useTheme();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke={isDark ? '#9ca3af' : '#6b7280'} />
        <YAxis tick={{ fontSize: 12 }} stroke={isDark ? '#9ca3af' : '#6b7280'} />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? '#1f2937' : '#fff',
            border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Legend />
        {lines.map((line) => (
          <Line key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={line.color} strokeWidth={2} dot={{ r: 3 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

interface AreaChartComponentProps {
  data: any[];
  xKey: string;
  areas: { key: string; color: string; name: string }[];
  height?: number;
}

export function SimpleAreaChart({ data, xKey, areas, height = 300 }: AreaChartComponentProps) {
  const { isDark } = useTheme();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke={isDark ? '#9ca3af' : '#6b7280'} />
        <YAxis tick={{ fontSize: 12 }} stroke={isDark ? '#9ca3af' : '#6b7280'} />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? '#1f2937' : '#fff',
            border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Legend />
        {areas.map((area) => (
          <Area key={area.key} type="monotone" dataKey={area.key} name={area.name} stroke={area.color} fill={area.color} fillOpacity={0.15} strokeWidth={2} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface PieChartComponentProps {
  data: any[];
  dataKey: string;
  nameKey: string;
  height?: number;
  innerRadius?: number;
}

export function SimplePieChart({ data, dataKey, nameKey, height = 300, innerRadius = 60 }: PieChartComponentProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={Math.min(innerRadius + 60, 120)}
          paddingAngle={2}
          dataKey={dataKey}
          nameKey={nameKey}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={{ strokeWidth: 1 }}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [value.toLocaleString(), '']}
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  change?: number;
  icon: React.ReactNode;
  color: string;
}

export function StatCard({ label, value, change, icon, color }: StatCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color} text-white`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
        {change !== undefined && (
          <span className={`text-xs font-semibold ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
    </div>
  );
}
