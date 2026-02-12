// Ankush Joshi 
// WeekView.tsx: Displays tasks for the current week in a grid format allowing users to switch between weeks and navigate between pages

/*
TODO:
  - Allow users to be able to click directly on tasks to view mroe details in a pop-up
  - Allow users to be able to click on a day and get sent to the day view page for that day
*/

import React, { useState, useEffect, useMemo } from "react";
import BackButton from "./components/BackButton";
import api from "./services/api";
import "./weekview.css";

// Type definitions and helpers
interface ApiTask{
  id:number; 
  title:string;
  description?:string | null;
  tag?: string | null;
  color?: string | null;
  priority?: number | null;
  status?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  completed:boolean;
}

interface ApiEvent {
  id: number;
  title: string;
  description?: string | null;
  start_at: string;
  end_at: string;
  color?: string | null;
  location?: string | null;
  status?: string | null;
  all_day?: boolean | null;
  recurrence?: string | null;
}

// Unified item shown on the week grid
interface WeekItem {
  id: number;
  type: "task" | "event";
  name: string;
  date: string;
  time: string;
  priority: number;
  completed: boolean;
  color?: string;
}

const parseLegacyDescription = (desc?: string | null) => {
  if (!desc) return { date: "", time: "", priority: 1 };
  try {
    const parsed = JSON.parse(desc);
    return { date: parsed.date ?? "", time: parsed.time ?? "", priority: parsed.priority ?? 1 };
  } catch {
    return { date: "", time: "", priority: 1 };
  }
};

const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); 
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const WeekView: React.FC = () => {
  const [weekStart, setWeekStart] = useState(() => getStartOfWeek(new Date()));
  const [items, setItems] = useState<WeekItem[]>([]);
  const [loading, setLoading] = useState(true);


  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        return day;
      }),
    [weekStart]
  );


// load tasks and events from API 
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [tasksRes, eventsRes] = await Promise.all([
          api.get<ApiTask[]>("/tasks/"),
          api.get<ApiEvent[]>("/events/"),
        ]);

        // Map tasks → WeekItem
        const mappedTasks: WeekItem[] = tasksRes.data.map((t) => {
          const legacy = parseLegacyDescription(t.description);
          const date = t.due_date ?? legacy.date;
          const time = t.due_time?.slice(0, 5) ?? legacy.time;
          return {
            id: t.id,
            type: "task",
            name: t.title,
            date,
            time,
            priority: t.priority ?? legacy.priority,
            completed: t.completed,
            color: t.color ?? undefined,
          };
        });

        // Map events → WeekItem (extract date & time from start_at)
        const mappedEvents: WeekItem[] = eventsRes.data.map((e) => {
          const start = new Date(e.start_at);
          const y = start.getFullYear();
          const m = String(start.getMonth() + 1).padStart(2, "0");
          const d = String(start.getDate()).padStart(2, "0");
          const hh = String(start.getHours()).padStart(2, "0");
          const mm = String(start.getMinutes()).padStart(2, "0");
          return {
            id: e.id,
            type: "event",
            name: e.title,
            date: `${y}-${m}-${d}`,
            time: `${hh}:${mm}`,
            priority: 0, // events don't have priority
            completed: false,
            color: e.color ?? undefined,
          };
        });

        setItems([...mappedTasks, ...mappedEvents]);
      } catch (err) {
        console.error("Failed to load tasks/events", err);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);


  // grouping items by date
  const itemsByDate = useMemo(() => {
    const map: Record<string, WeekItem[]> = {};
    items.forEach((item) => {
      if (item.date) {
        if (!map[item.date]) map[item.date] = [];
        map[item.date].push(item);
      }
    });
    // sorting items by time
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => a.time.localeCompare(b.time))
    );
    return map;
  }, [items]);

  // functions to navigate between weeks 
  const goToPreviousWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() - 7);
    setWeekStart(newStart);
  };

 
  const goToNextWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() + 7);
    setWeekStart(newStart);
  };


  const goToCurrentWeek = () => {
    setWeekStart(getStartOfWeek(new Date()));
  };

 // getting today's date for highlighing in UI
  const todayKey = formatDateKey(new Date());

  // calculating end of week for header display
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  // fiunction to convert priority number for CSS classes
  const priorityLabel = (p: number) => {
    if (p >= 3) return "high";
    if (p === 2) return "medium";
    return "low";
  };

  
  return (
    <div className="weekViewContainer">
      <div className="weekViewContent">
        <BackButton />


        <div className="weekViewHeader">
          <h2>Week View</h2>
          <div className="weekNavigation">
            <button onClick={goToPreviousWeek}>← Previous</button>
            <button onClick={goToCurrentWeek}>This Week</button>
            <button onClick={goToNextWeek}>Next →</button>
          </div>
          <div className="weekRange">
            {weekStart.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })}{" "}
            –{" "}
            {weekEnd.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>


        {loading ? (
          <p className="weekLoading">Loading tasks…</p>
        ) : (
          <div className="weekGrid">
            {days.map((day) => {
              const key = formatDateKey(day);
              const dayItems = itemsByDate[key] || [];
              const isToday = key === todayKey;


              return (
                <div
                  key={key}
                  className={`weekDay ${isToday ? "weekDayToday" : ""}`}
                >
                  <div className="weekDayHeader">
                    <span className="weekDayName">
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span className={`weekDayNumber ${isToday ? "todayBadge" : ""}`}>
                      {day.getDate()}
                    </span>
                  </div>


                  <div className="weekDayTasks">
                    {dayItems.length === 0 ? (
                      <span className="noTasks">—</span>
                    ) : (
                      dayItems.map((item) => (
                        <div
                          key={`${item.type}-${item.id}`}
                          className={`weekTask ${item.type === "task" ? `priority-${priorityLabel(item.priority)}` : "week-event"} ${
                            item.completed ? "taskCompleted" : ""
                          }`}
                          style={item.type === "event" && item.color ? { borderLeftColor: item.color } : undefined}
                        >
                          <span className="weekTaskTime">{item.time}</span>
                          <span className="weekTaskName">
                            {item.type === "event" ? "📅 " : ""}{item.name}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};


export default WeekView;