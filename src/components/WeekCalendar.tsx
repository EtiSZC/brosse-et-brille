import { cn } from "@/lib/utils";
import type { WeekDay } from "@/lib/progress";

interface WeekCalendarProps {
  week: WeekDay[];
  streak: number;
}

/** This week's brushings: a sun (morning) and a moon (evening) per day, plus a gentle streak. */
const WeekCalendar = ({ week, streak }: WeekCalendarProps) => {
  const done = week.reduce((n, d) => n + Number(d.morning) + Number(d.evening), 0);
  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-2">
      {streak > 0 && (
        <p className="px-3 py-1 rounded-full bg-white border-2 border-ink/15 font-display font-semibold text-ink">
          🔥 {streak} {streak > 1 ? "jours de suite\u00A0!" : "jour"}
        </p>
      )}
      <div
        className="w-full grid grid-cols-7 gap-1 bg-white/90 border-[3px] border-ink rounded-3xl px-2 py-2 shadow-[0_5px_0_hsl(var(--ink)/0.15)]"
        role="img"
        aria-label={`Cette semaine : ${done} brossage${done > 1 ? "s" : ""}${streak > 1 ? `, ${streak} jours de suite` : ""}`}
      >
        {week.map((d) => (
          <div
            key={d.date}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl py-1",
              d.isToday && "bg-tile ring-[2.5px] ring-ink",
              d.isFuture && "opacity-40",
            )}
          >
            <span className="font-display font-bold text-sm text-ink leading-none">{d.label}</span>
            <SlotDot filled={d.morning} kind="morning" />
            <SlotDot filled={d.evening} kind="evening" />
          </div>
        ))}
      </div>
    </div>
  );
};

const SlotDot = ({ filled, kind }: { filled: boolean; kind: "morning" | "evening" }) => (
  <span
    className={cn(
      "w-7 h-7 rounded-full flex items-center justify-center text-sm leading-none",
      filled
        ? kind === "morning"
          ? "bg-sunshine border-2 border-ink"
          : "bg-[hsl(230_60%_45%)] border-2 border-ink"
        : "border-2 border-dashed border-ink/25",
    )}
  >
    {filled ? (kind === "morning" ? "☀️" : "🌙") : ""}
  </span>
);

export default WeekCalendar;
