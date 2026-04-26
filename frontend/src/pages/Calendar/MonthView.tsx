import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { PENDING_APPROVAL_STATUS } from "../../utils/eventConflicts";
import { 
  parseColorAndPattern, 
  getPatternStyle, 
  DEFAULT_EVENT_COLOR, 
  DEFAULT_TASK_COLOR 
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
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [tasksRes, eventsRes] = await Promise.all([
          api.get<ApiTask[]>("/tasks"),
          api.get<ApiEvent[]>("/events"),
        ]);

        const taskItems: CalendarItem[] = tasksRes.data.map((task) => {
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
        });

        const eventItems: CalendarItem[] = eventsRes.data
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
          });

        setItems([...taskItems, ...eventItems]);
      } catch (err) {
        console.error("Failed to load tasks/events", err);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  const handleDayClick = (dateKey: string) => {
    navigate(`/dayview?date=${dateKey}`, { state: { fromView: 'month' } });
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
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
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
        </div>
      </div>

      {loading ? (
        <p className="monthLoading">Loading tasks/events…</p>
      ) : (
        <>
          <div className="monthWeekdayRow">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
              <div key={dayName} className="monthWeekdayCell">
                {dayName}
              </div>
            ))}
          </div>

          <div className="monthGrid">
            {cells.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} className="monthCell monthCellEmpty" />;
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
                  <div className={`monthCellDate ${isToday ? "todayBadge" : ""}`}>{day}</div>
                  <div className="monthItems">
                    {visibleItems.map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className={`monthItem ${item.type === "task" ? "monthTask" : "monthEvent"}`}
                        title={item.time ? `${formatDisplayTime(item.time)} ${item.title}` : item.title}
                      >
                        <div className="taskItemPattern" style={getPatternStyle(item.color, item.pattern)} />
                        <span className="monthItemTime">{item.time ? `${formatDisplayTime(item.time)} ` : ""}</span>
                        <span className="monthItemTitle">{item.title}</span>
                      </div>
                    ))}
                    {overflowCount > 0 && <div className="monthMore">+{overflowCount} more</div>}
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