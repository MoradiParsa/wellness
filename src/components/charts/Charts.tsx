import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

export interface Point {
  label: string
  value: number
}

const axisStyle = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }

function ChartTooltip({ active, payload, label, suffix }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">
        {Math.round(payload[0].value * 10) / 10}
        {suffix ? ` ${suffix}` : ''}
      </p>
    </div>
  )
}

export function LineTrend({
  data,
  height = 200,
  color = 'hsl(var(--foreground))',
  suffix,
  showGrid = true,
}: {
  data: Point[]
  height?: number
  color?: string
  suffix?: string
  showGrid?: boolean
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
        {showGrid && <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />}
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={52} domain={['auto', 'auto']} />
        <Tooltip content={<ChartTooltip suffix={suffix} />} cursor={{ stroke: 'hsl(var(--border))' }} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function BarSeries({
  data,
  height = 200,
  color = 'hsl(var(--foreground))',
  suffix,
}: {
  data: Point[]
  height?: number
  color?: string
  suffix?: string
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} minTickGap={8} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={52} allowDecimals={false} />
        <Tooltip content={<ChartTooltip suffix={suffix} />} cursor={{ fill: 'hsl(var(--secondary))' }} />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
