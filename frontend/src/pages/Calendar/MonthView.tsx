// base by james, drill down connection and pattern visual integration by alex, styling both, 
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { PENDING_APPROVAL_STATUS } from "../../utils/eventConflicts";
import {
  parseColorAndPattern,
  getPatternStyle,
  DEFAULT_EVENT_COLOR,
  DEFAULT_TASK_COLOR,
} from "../../utils/styleUtils";
import "./monthview.css";

interface ApiTask {
  id: number;
  title: string;
  description?: string | null;
  color?: string | null;
  due_date?: string | null;
  due_time?: string | null;
}

interface ApiEvent {
  id: number;
  title: string;
  start_at: string;
  color?: string | null;
  status?: string | null;
}

interface CalendarItem {
  id: number;
  type: "task" | "event";
  title: string;
  date: string;
  time: string;
  color: string;
  pattern: string;
}

const parseLegacyDescription = (description?: string | null) => {
  if (!description) return { date: "", time: "" };
  try {
    const parsed = JSON.parse(description);
    return { date: parsed.date ?? "", time: parsed.time ?? "" };
  } catch {
    return { date: "", time: "" };
  }
};

const formatDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

//match the 12-hour time format from WeekView/DayView
const formatDisplayTime = (time: string) => {
  if (!time) return "";
  const [rawHours, rawMinutes] = time.split(":");
  const hours = Number(rawHours);
  const minutes = rawMinutes ?? "00";
  const suffix = hours >= 12 ? "pm" : "am";
  const normalizedHours = hours % 12 || 12;
  return `${normalizedHours}:${minutes}${suffix}`;
};

const MonthView = () => {
  const navigate = useNavigate();
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between syncs
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const syncGoogleCalendar = async () => {
    try {
      const response = await api.post("/events/sync/google-calendar", {});
      console.log("Google Calendar sync initiated:", response.data);
    } catch (err) {
      console.debug("Google Calendar sync not available:", err);
    }
  };

  const syncCanvas = async () => {
    try {
      const response = await api.post("/events/sync/canvas", {});
      console.log("Canvas sync initiated:", response.data);
    } catch (err) {
      console.debug("Canvas sync not available:", err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([syncGoogleCalendar(), syncCanvas()]);
    } catch (err) {
      console.debug("Sync failed, continuing with local data:", err);
    }

    const [tasksResult, eventsResult] = await Promise.allSettled([
      api.get<ApiTask[]>("/tasks"),
      api.get<ApiEvent[]>("/events"),
    ]);

    const taskItems: CalendarItem[] = tasksResult.status === "fulfilled"
      ? tasksResult.value.data.map((task) => {
          const legacy = parseLegacyDescription(task.description);
          const parsedStyles = parseColorAndPattern(task.color, DEFAULT_TASK_COLOR);
          return {
            id: task.id,
            type: "task",
            title: task.title,
            date: task.due_date ?? legacy.date,
            time: task.due_time?.slice(0, 5) ?? legacy.time,
            color: parsedStyles.color,
            pattern: parsedStyles.pattern,
          };
        })
      : (() => { console.error("Failed to load tasks", tasksResult.reason); return []; })();

    const eventItems: CalendarItem[] = eventsResult.status === "fulfilled"
      ? eventsResult.value.data
          .filter((event) => event.status !== PENDING_APPROVAL_STATUS)
          .map((event) => {
            const start = new Date(event.start_at);
            const y = start.getFullYear();
            const m = String(start.getMonth() + 1).padStart(2, "0");
            const d = String(start.getDate()).padStart(2, "0");
            const hh = String(start.getHours()).padStart(2, "0");
            const mm = String(start.getMinutes()).padStart(2, "0");
            const parsedStyles = parseColorAndPattern(event.color, DEFAULT_EVENT_COLOR);
            return {
              id: event.id,
              type: "event",
              title: event.title,
              date: `${y}-${m}-${d}`,
              time: `${hh}:${mm}`,
              color: parsedStyles.color,
              pattern: parsedStyles.pattern,
            };
          })
      : (() => { console.error("Failed to load events", eventsResult.reason); return []; })();

    setItems([...taskItems, ...eventItems]);
    setLoading(false);
  };

  const setupAutoRefresh = () => {
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
    }

    autoRefreshTimerRef.current = setInterval(async () => {
      const now = Date.now();
      const timeSinceLastSync = now - lastSyncTimeRef.current;

      if (timeSinceLastSync >= SYNC_COOLDOWN_MS) {
        lastSyncTimeRef.current = now;
        await loadAll();
      }
    }, 60000);
  };

  const handleManualRefresh = async () => {
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTimeRef.current;

    if (timeSinceLastSync < SYNC_COOLDOWN_MS) {
      const remainingMs = SYNC_COOLDOWN_MS - timeSinceLastSync;
      const remainingSecs = Math.ceil(remainingMs / 1000);
      setCooldownSeconds(remainingSecs);

      // Start countdown timer
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
      cooldownTimerRef.current = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            if (cooldownTimerRef.current) {
              clearInterval(cooldownTimerRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return;
    }

    setCooldownSeconds(0);
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
    }
    lastSyncTimeRef.current = now;
    await loadAll();
    setupAutoRefresh();
  };

  useEffect(() => {
    lastSyncTimeRef.current = Date.now();
    loadAll();
    setupAutoRefresh();

    // Cleanup on unmount
    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, []);

  const handleDayClick = (dateKey: string) => {
    navigate(`/dayview?date=${dateKey}`, { state: { fromView: "month" } });
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startOffset = firstDay.getDay();
  const todayKey = formatDateKey(new Date());

  const itemsByDate = useMemo(() => {
    const byDate: Record<string, CalendarItem[]> = {};
    items.forEach((item) => {
      if (!item.date) return;
      if (!byDate[item.date]) byDate[item.date] = [];
      byDate[item.date].push(item);
    });
    Object.values(byDate).forEach((dayItems) =>
      dayItems.sort((a, b) => a.time.localeCompare(b.time)),
    );
    return byDate;
  }, [items]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  const goToPreviousMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  return (
    <div className="monthViewContainer">
      <div className="monthViewHeader">
        <h2>
          {currentMonth.toLocaleString("default", { month: "long" })} {year}
        </h2>
        <div className="monthNavigation">
          <button onClick={goToPreviousMonth}>← Previous</button>
          <button onClick={goToCurrentMonth}>This Month</button>
          <button onClick={goToNextMonth}>Next →</button>
          <button
            onClick={handleManualRefresh}
            disabled={cooldownSeconds > 0}
            style={{
              opacity: cooldownSeconds > 0 ? 0.6 : 1,
              cursor: cooldownSeconds > 0 ? "not-allowed" : "pointer",
            }}
          >
            {cooldownSeconds > 0 ? `Refresh (${cooldownSeconds}s)` : "Refresh"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="monthLoading">Loading tasks/events…</p>
      ) : (
        <>
          <div className="monthWeekdayRow">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (dayName) => (
                <div key={dayName} className="monthWeekdayCell">
                  {dayName}
                </div>
              ),
            )}
          </div>

          <div className="monthGrid">
            {cells.map((day, i) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${i}`}
                    className="monthCell monthCellEmpty"
                  />
                );
              }

              const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayItems = itemsByDate[dateKey] ?? [];
              const isToday = dateKey === todayKey;
              const visibleItems = dayItems.slice(0, 3);
              const overflowCount = dayItems.length - visibleItems.length;

              return (
                <div
                  key={dateKey}
                  className={`monthCell ${isToday ? "monthCellToday" : ""}`}
                  onClick={() => handleDayClick(dateKey)}
                  title="Click to view day"
                >
                  <div
                    className={`monthCellDate ${isToday ? "todayBadge" : ""}`}
                  >
                    {day}
                  </div>
                  <div className="monthItems">
                    {visibleItems.map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className={`monthItem ${item.type === "task" ? "monthTask" : "monthEvent"}`}
                        title={
                          item.time
                            ? `${formatDisplayTime(item.time)} ${item.title}`
                            : item.title
                        }
                      >
                        <div
                          className="taskItemPattern"
                          style={getPatternStyle(item.color, item.pattern)}
                        />
                        <span className="monthItemTime">
                          {item.time ? `${formatDisplayTime(item.time)} ` : ""}
                        </span>
                        <span className="monthItemTitle">{item.title}</span>
                      </div>
                    ))}
                    {overflowCount > 0 && (
                      <div className="monthMore">+{overflowCount} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default MonthView;
