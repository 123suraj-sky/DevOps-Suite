import { useMemo, useState } from 'react';

/**
 * ActivityHeatmap
 *
 * GitHub-style 52-week contribution graph.
 *
 * Props:
 *   data      — Array<{ date: "2025-08-01", count: number }> (sparse — only days with runs)
 *   loading   — boolean
 *   totalDays — number of days to render (default 365)
 */

// ── Colour levels ─────────────────────────────────────────────────────────────
// 0 runs → level 0 (empty), 1 → 1, 2-3 → 2, 4-6 → 3, 7+ → 4
function getLevel(count) {
  if (!count || count === 0) return 0;
  if (count === 1)            return 1;
  if (count <= 3)             return 2;
  if (count <= 6)             return 3;
  return 4;
}

const LEVEL_CLASSES = [
  'bg-gray-100',           // 0 — no activity
  'bg-green-200',          // 1 — light
  'bg-green-400',          // 2 — medium
  'bg-green-600',          // 3 — strong
  'bg-green-800',          // 4 — max
];

const LEVEL_LABELS = ['No runs', '1 run', '2–3 runs', '4–6 runs', '7+ runs'];

// Short month names
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Day-of-week labels (Sun = 0)
const DOW_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/**
 * Build a calendar grid: an array of 53 columns (weeks), each an array of up to 7
 * day objects { dateStr, count, level }.
 * The grid always ends on "today" and extends back totalDays.
 */
function buildGrid(data, totalDays) {
  // Convert sparse data array into a map keyed by "YYYY-MM-DD"
  const countMap = {};
  (data ?? []).forEach(({ date, count }) => {
    countMap[date] = count;
  });

  // Build the list of days: start from (today - totalDays + 1), end today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - totalDays + 1);

  // Rewind to the previous Sunday so the grid starts on a Sunday column
  const gridStart = new Date(startDate);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  const days = [];
  const cursor = new Date(gridStart);
  while (cursor <= today) {
    const dateStr = cursor.toISOString().slice(0, 10);
    const inRange = cursor >= startDate;
    const count   = inRange ? (countMap[dateStr] ?? 0) : null; // null = out of range (greyed)
    days.push({ dateStr, count, level: inRange ? getLevel(count) : -1 });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Chunk into weeks (columns of 7)
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

/**
 * Derive the month label positions: for each week column, if the first day in
 * that column is a new month (different from the previous column's first day),
 * emit the month name.
 */
function buildMonthLabels(weeks) {
  const labels = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstDay = week.find((d) => d.count !== null);
    if (!firstDay) { labels.push(null); return; }
    const month = new Date(firstDay.dateStr).getMonth();
    if (month !== lastMonth) {
      labels.push(MONTH_LABELS[month]);
      lastMonth = month;
    } else {
      labels.push(null);
    }
  });
  return labels;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ActivityHeatmap({ data = [], loading = false, totalDays = 365 }) {
  const [tooltip, setTooltip] = useState(null); // { dateStr, count, x, y }

  const weeks      = useMemo(() => buildGrid(data, totalDays), [data, totalDays]);
  const monthLabels = useMemo(() => buildMonthLabels(weeks), [weeks]);

  const totalRuns = useMemo(
    () => (data ?? []).reduce((sum, d) => sum + (d.count ?? 0), 0),
    [data]
  );

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 w-40 bg-gray-200 rounded mb-3" />
        <div className="h-24 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  // Cell size + gap (px) — used for tooltip positioning
  const CELL = 13; // px (w-3 h-3 = 12px + 1px gap)

  return (
    <div className="select-none">
      {/* ── Header ── */}
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">
          Code Run Activity
        </p>
        <p className="text-xs text-gray-400">
          {totalRuns.toLocaleString()} run{totalRuns !== 1 ? 's' : ''} in the past year
        </p>
      </div>

      {/* ── Grid wrapper ── */}
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex gap-0 min-w-max">

          {/* Day-of-week labels column */}
          <div className="flex flex-col gap-[3px] mr-1.5 pt-5">
            {DOW_LABELS.map((label, i) => (
              <div
                key={label}
                className="h-3 text-[9px] text-gray-400 leading-3 text-right w-6"
                style={{ visibility: i % 2 === 1 ? 'visible' : 'hidden' }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Week columns */}
          <div className="flex flex-col">
            {/* Month row */}
            <div className="flex gap-[3px] mb-1 h-4">
              {weeks.map((_, wi) => (
                <div key={wi} className="w-3 text-[9px] text-gray-400 leading-none shrink-0 overflow-visible whitespace-nowrap">
                  {monthLabels[wi] ?? ''}
                </div>
              ))}
            </div>

            {/* Cell grid: each week is a column of 7 cells */}
            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day, di) => {
                    if (day.level === -1) {
                      // Out-of-range placeholder
                      return <div key={di} className="w-3 h-3 rounded-sm bg-transparent" />;
                    }
                    return (
                      <div
                        key={di}
                        className={`w-3 h-3 rounded-sm cursor-default transition-opacity hover:opacity-75
                          ${LEVEL_CLASSES[day.level]}`}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({
                            dateStr: day.dateStr,
                            count:   day.count,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        role="gridcell"
                        aria-label={`${day.dateStr}: ${day.count} run${day.count !== 1 ? 's' : ''}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-1.5 mt-2 justify-end">
        <span className="text-[10px] text-gray-400">Less</span>
        {LEVEL_CLASSES.map((cls, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-sm ${cls} border border-gray-200`}
            title={LEVEL_LABELS[i]}
          />
        ))}
        <span className="text-[10px] text-gray-400">More</span>
      </div>

      {/* ── Tooltip (fixed, follows mouse) ── */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-2 py-1 rounded bg-gray-900 text-white text-xs shadow-lg whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y - 36,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="font-semibold">{tooltip.count}</span> run{tooltip.count !== 1 ? 's' : ''} on{' '}
          {new Date(tooltip.dateStr + 'T00:00:00').toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </div>
      )}
    </div>
  );
}
