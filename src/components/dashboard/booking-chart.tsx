"use client";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Booking } from "@/components/marketplace/store";
import { money } from "@/lib/marketplace";
export function BookingChart({ bookings }: { bookings: Booking[] }) {
  const grouped = new Map<string, number>();
  bookings
    .filter((b) => b.status !== "Cancelled")
    .forEach((b) => grouped.set(b.date, (grouped.get(b.date) || 0) + b.price));
  const data = Array.from(grouped, ([date, value]) => ({
    date: date.slice(5),
    value,
  })).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <section className="panel mt-6">
      <div className="panel-title">
        <div>
          <p className="eyebrow">YOUR BUSINESS, AT A GLANCE</p>
          <h2>Booked value over time.</h2>
        </div>
        <span className="status">Simulated amounts</span>
      </div>
      {data.length ? (
        <div style={{ width: "100%", height: 240, marginTop: 25 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              accessibilityLayer
              data={data}
              margin={{ top: 15, right: 15, left: 0, bottom: 5 }}
            >
              <CartesianGrid stroke="#e4e9dc" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#6c775f" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6c775f" }}
                axisLine={false}
                tickLine={false}
                width={55}
              />
              <Tooltip
                formatter={(v) => money(Number(v))}
                contentStyle={{
                  borderRadius: 12,
                  borderColor: "#dfe4d9",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                name="Booked value"
                stroke="#517a3e"
                strokeWidth={2}
                fill="#e4edcd"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="chart-empty">
          <div className="chart-grid-lines" />
          <p>
            Your first booking starts the picture.
            <br />
            <span>Booked value will appear here as sessions are added.</span>
          </p>
        </div>
      )}
    </section>
  );
}
