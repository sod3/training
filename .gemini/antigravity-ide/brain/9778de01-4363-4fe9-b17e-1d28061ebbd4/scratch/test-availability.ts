import {
  validateDailyAvailability,
  availabilityConflict,
  generateSlots,
  calculateDayMinutes,
  AvailabilityRule,
} from "../src/lib/server/rules";

function runTests() {
  console.log("=== RUNNING STAGE 19 & STAGE 20 TESTS ===");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`✅ PASS: ${description}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${description}`);
      failed++;
    }
  }

  // 1. 0 hours
  const rules0: AvailabilityRule[] = [];
  const res0 = validateDailyAvailability(rules0);
  assert(res0.valid === true, "0 hours is valid");

  // 2. 1 hour
  const rules1: AvailabilityRule[] = [
    { dayOfWeek: 1, startTime: "10:00", endTime: "11:00" },
  ];
  const res1 = validateDailyAvailability(rules1);
  assert(res1.valid === true && calculateDayMinutes(rules1, 1) === 60, "1 hour (60 min) is valid");

  // 3. 3h 30m
  const rules330: AvailabilityRule[] = [
    { dayOfWeek: 1, startTime: "10:00", endTime: "13:30" },
  ];
  const res330 = validateDailyAvailability(rules330);
  assert(res330.valid === true && calculateDayMinutes(rules330, 1) === 210, "3h 30m (210 min) is valid");

  // 4. Exactly 4 hours
  const rules4h: AvailabilityRule[] = [
    { dayOfWeek: 1, startTime: "10:00", endTime: "14:00" },
  ];
  const res4h = validateDailyAvailability(rules4h);
  assert(res4h.valid === true && calculateDayMinutes(rules4h, 1) === 240, "Exactly 4 hours (240 min) is valid");

  // 5. 4h 01m
  const rules4h01: AvailabilityRule[] = [
    { dayOfWeek: 1, startTime: "10:00", endTime: "14:01" },
  ];
  const res4h01 = validateDailyAvailability(rules4h01);
  assert(res4h01.valid === false, "4h 01m (241 min) is rejected by validator");

  // 6. Overlap
  const rulesOverlap: AvailabilityRule[] = [
    { dayOfWeek: 1, startTime: "10:00", endTime: "12:00" },
    { dayOfWeek: 1, startTime: "11:00", endTime: "13:00" },
  ];
  const conflict = availabilityConflict(rulesOverlap);
  assert(conflict !== null, "Overlapping windows detected by availabilityConflict");

  // 7. Split blocks (valid 4h total)
  const rulesSplit: AvailabilityRule[] = [
    { dayOfWeek: 1, startTime: "10:00", endTime: "12:00" },
    { dayOfWeek: 1, startTime: "17:00", endTime: "19:00" },
  ];
  const conflictSplit = availabilityConflict(rulesSplit);
  const resSplit = validateDailyAvailability(rulesSplit);
  assert(conflictSplit === null && resSplit.valid === true && calculateDayMinutes(rulesSplit, 1) === 240, "Split blocks (2h + 2h = 4h) valid with no conflict");

  // 8. Edit recalculates total allowance
  let editableRules: AvailabilityRule[] = [
    { dayOfWeek: 1, startTime: "10:00", endTime: "12:00" },
  ];
  assert(calculateDayMinutes(editableRules, 1) === 120, "Initial edit rules = 120 min");
  editableRules[0].endTime = "13:00"; // edit from 12:00 to 13:00
  assert(calculateDayMinutes(editableRules, 1) === 180, "Edited rules = 180 min");

  // 9. Delete recalculates total allowance
  editableRules = []; // delete rule
  assert(calculateDayMinutes(editableRules, 1) === 0, "Deleted rule = 0 min");

  // 10. STAGE 20: 30-minute slot start granularity
  const dateStr = "2026-10-05"; // Monday
  const rulesSlots: AvailabilityRule[] = [
    { dayOfWeek: 1, startTime: "12:00", endTime: "14:00" },
  ];
  const slots = generateSlots(
    dateStr,
    "UTC",
    60, // 60 min session duration
    rulesSlots,
    [],
    [],
    0,
    30,
    new Date("2026-10-01T00:00:00Z"),
  );
  // Expected start times at 30-min granularity for 12:00 to 14:00 range with 60-min sessions:
  // 12:00, 12:30, 13:00 (since 13:00 to 14:00 fits within range, 13:30 to 14:30 exceeds range)
  console.log("Generated slot labels:", slots.map((s) => s.label));
  assert(slots.length === 3, "Generated 3 slots at 30-min start intervals for 2h window with 60m session");

  // 11. STAGE 20: Collision prevention for 60-min session booked at 12:30
  // Existing booked session: 12:30 to 13:30
  const busySession = [{ start: new Date("2026-10-05T12:30:00Z"), end: new Date("2026-10-05T13:30:00Z") }];
  const slotsAfterBooking = generateSlots(
    dateStr,
    "UTC",
    60,
    rulesSlots,
    [],
    busySession,
    0,
    30,
    new Date("2026-10-01T00:00:00Z"),
  );
  // 12:00-13:00 overlaps 12:30-13:30 (blocked)
  // 12:30-13:30 overlaps 12:30-13:30 (blocked)
  // 13:00-14:00 overlaps 12:30-13:30 (blocked)
  assert(slotsAfterBooking.length === 0, "60-min booking at 12:30 correctly blocks 12:00, 12:30, and 13:00 start times from collision");

  console.log(`\nTEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) process.exit(1);
}

runTests();
