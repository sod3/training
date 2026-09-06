import { DateTime } from "luxon";
export type Role = "CUSTOMER" | "TRAINER" | "ADMIN";
export function allowedRole(actual: string, roles: readonly string[]) {
  return roles.includes(actual);
}
export function ownsBooking(
  user: { id: string; role: string },
  order: { customerId: unknown; trainerId: unknown },
  trainerId?: string,
) {
  return (
    user.role === "ADMIN" ||
    (user.role === "CUSTOMER" && String(order.customerId) === user.id) ||
    (user.role === "TRAINER" && String(order.trainerId) === trainerId)
  );
}
export function calculateBookingPrice(price: number, commissionBps: number) {
  if (
    !Number.isSafeInteger(price) ||
    price < 0 ||
    !Number.isInteger(commissionBps) ||
    commissionBps < 0 ||
    commissionBps > 5000
  )
    throw new Error("Invalid price");
  const commission = Math.round((price * commissionBps) / 10000);
  return { total: price, commission, trainerEarning: price - commission };
}
export function canCancelBooking(start: Date, hours: number, now = new Date()) {
  return start.getTime() - now.getTime() >= hours * 3600000;
}
export function canReviewTrainer(
  customerId: string,
  owner: string,
  completed: number,
) {
  return customerId === owner && completed > 0;
}
export function overlaps(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date },
) {
  return a.start < b.end && a.end > b.start;
}
export type AvailabilityRule = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  trainingTypes: string[];
};
// Recurring wall-clock minutes, including overnight and Saturday/Sunday wrap.
// Adjacent windows are valid. Combine training types into one window when times overlap.
export function availabilityConflict(rules: AvailabilityRule[]) {
  const minutes = (time: string) =>
    Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const ranges = rules.map((rule) => {
    const start = rule.dayOfWeek * 1440 + minutes(rule.startTime);
    let end = rule.dayOfWeek * 1440 + minutes(rule.endTime);
    if (end <= start) end += 1440;
    return { start, end };
  });
  for (let i = 0; i < ranges.length; i++)
    for (let j = i + 1; j < ranges.length; j++)
      for (const shift of [-10080, 0, 10080])
        if (
          ranges[i].start < ranges[j].end + shift &&
          ranges[i].end > ranges[j].start + shift
        )
          return [i + 1, j + 1];
  return null;
}
export function generateSlots(
  date: string,
  zone: string,
  duration: number,
  type: string,
  rules: AvailabilityRule[],
  exceptions: {
    start: Date;
    end: Date;
    kind: string;
    trainingTypes: string[];
  }[],
  busy: { start: Date; end: Date }[],
  notice: number,
  advance: number,
  now = new Date(),
) {
  const day = DateTime.fromISO(date, { zone }).startOf("day");
  if (
    !day.isValid ||
    !Number.isInteger(duration) ||
    duration < 15 ||
    duration > 180
  )
    return [];
  const ranges: { start: DateTime; end: DateTime }[] = [];
  for (const d of [day.minus({ days: 1 }), day])
    for (const r of rules) {
      if (d.weekday % 7 !== r.dayOfWeek || !r.trainingTypes.includes(type))
        continue;
      const start = DateTime.fromISO(`${d.toISODate()}T${r.startTime}`, {
        zone,
      });
      let end = DateTime.fromISO(`${d.toISODate()}T${r.endTime}`, { zone });
      if (end <= start) end = end.plus({ days: 1 });
      ranges.push({ start, end });
    }
  exceptions
    .filter((e) => e.kind === "AVAILABLE" && e.trainingTypes.includes(type))
    .forEach((e) =>
      ranges.push({
        start: DateTime.fromJSDate(e.start, { zone }),
        end: DateTime.fromJSDate(e.end, { zone }),
      }),
    );
  const blocks = [...busy, ...exceptions.filter((e) => e.kind === "BLOCK")];
  const found = new Map<
    string,
    { start: string; end: string; label: string }
  >();
  for (const range of ranges) {
    const first = range.start < day ? day : range.start;
    for (
      let start = first;
      start.plus({ minutes: duration }) <= range.end &&
      start < day.plus({ days: 1 });
      start = start.plus({ minutes: 15 })
    ) {
      const end = start.plus({ minutes: duration });
      if (
        start.toMillis() < now.getTime() + notice * 3600000 ||
        start.toMillis() > now.getTime() + advance * 86400000
      )
        continue;
      if (
        blocks.some((b) =>
          overlaps({ start: start.toJSDate(), end: end.toJSDate() }, b),
        )
      )
        continue;
      const iso = start.toUTC().toISO()!;
      found.set(iso, {
        start: iso,
        end: end.toUTC().toISO()!,
        label: start.toFormat("h:mm a ZZZZ"),
      });
    }
  }
  return [...found.values()].sort((a, b) => a.start.localeCompare(b.start));
}
