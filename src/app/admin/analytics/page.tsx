import { getChatAnalytics } from "@/lib/analytics";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

const CLINIC_ID = process.env.CLINIC_ID || "default";

function BarChart({ data, maxVal }: { data: { label: string; value: number }[]; maxVal: number }) {
  return (
    <div className="flex items-end gap-1 h-40">
      {data.map((d, i) => {
        const height = maxVal > 0 ? (d.value / maxVal) * 100 : 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-500">{d.value}</span>
            <div
              className="w-full bg-gradient-to-t from-teal-500 to-emerald-400 rounded-t-md transition-all"
              style={{ height: `${Math.max(height, 2)}%` }}
            />
            <span className="text-[9px] text-gray-400 truncate w-full text-center">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({ data }: { data: { label: string; value: number }[] }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const width = 100;
  const height = 40;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (d.value / maxVal) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(20, 184, 166)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(20, 184, 166)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill="url(#lineGradient)"
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="rgb(20, 184, 166)"
        strokeWidth="0.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dots */}
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - (d.value / maxVal) * height;
        return d.value > 0 ? (
          <circle key={i} cx={x} cy={y} r="0.8" fill="rgb(20, 184, 166)" />
        ) : null;
      })}
    </svg>
  );
}

export default async function AnalyticsPage() {
  const analytics = await getChatAnalytics(CLINIC_ID, 14);

  const hourlyMax = Math.max(...analytics.hourlyDistribution.map((h) => h.count), 1);
  const dailyMax = Math.max(...analytics.dailyTrend.map((d) => d.messages), 1);

  const hourlyData = analytics.hourlyDistribution.map((h) => ({
    label: `${h.hour}h`,
    value: h.count,
  }));

  const dailyData = analytics.dailyTrend.map((d) => ({
    label: d.date.split("-").slice(1).reverse().join("/"),
    value: d.messages,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <PageHeader
        title="Analytics"
        description={`Metrics for the last 14 days`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Conversations Today"
          value={analytics.sessionsToday}
          variant="highlight"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
        />
        <StatCard
          label="Messages Today"
          value={analytics.messagesToday}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
        />
        <StatCard
          label="Total Conversations"
          value={analytics.totalSessions}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <StatCard
          label="Avg Msgs/Conversation"
          value={analytics.avgMessagesPerSession}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        />
        <StatCard
          label="Peak Hour"
          value={`${analytics.peakHour}h`}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Distribution by Hour (7 days)</h2>
            <p className="text-sm text-gray-500">Conversation volume by hour of day</p>
          </CardHeader>
          <CardContent>
            <BarChart data={hourlyData} maxVal={hourlyMax} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Daily Trend (14 days)</h2>
            <p className="text-sm text-gray-500">Messages per day</p>
          </CardHeader>
          <CardContent>
            <LineChart data={dailyData} />
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-gray-400">{dailyData[0]?.label}</span>
              <span className="text-[10px] text-gray-400">{dailyData[dailyData.length - 1]?.label}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Top Patients</h2>
        </CardHeader>
        <CardContent className="p-0">
          {analytics.topPatients.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No patients yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {analytics.topPatients.map((p, i) => (
                <div key={i} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-medium">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name || "Not provided"}</p>
                      <p className="text-xs text-gray-500">{p.phone || "—"}</p>
                    </div>
                  </div>
                  <Badge variant="info">{p.count} conversations</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
