import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import "./weekview.css";

interface WeekViewProps {
  embedded?: boolean;
}

interface ApiTask {
  id: number;
  title: string;
  description?: string | null;
  tag?: string | null;
  color?: string | null;
  priority?: number | null;
  status?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  completed: boolean;
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

interface WeekItem {
  id: number;
  type: "task" | "event";
  name: string;
  date: string;
  time: string;
  endTime?: string;
  priority: number;
  completed: boolean;
  color?: string;
}

interface CreateSlot {
  dateKey: string;
  hour: number;
  x: number;
  y: number;
}

const HOUR_HEIGHT = 72;
const DEFAULT_EVENT_COLOR = "#4f9d69";

const parseLegacyDescription = (desc?: string | null) => {
  if (!desc) return { date: "", time: "", priority: 1 };
  try {
    const parsed = JSON.parse(desc);
    return {
      date: parsed.date ?? "",
      time: parsed.time ?? "",
      priority: parsed.priority ?? 1,
    };
  } catch {
    return { date: "", time: "", priority: 1 };
  }
};

const getStartOfWeek = (date: Date): Date => {
  const value = new Date(date);
  value.setDate(value.getDate() - value.getDay());
  value.setHours(0, 0, 0, 0);
  return value;
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseTimeToMinutes = (time?: string) => {
  if (!time) return 0;
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
};

const formatMinutesToTime = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.min(23 * 60 + 59, minutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const formatDisplayTime = (time: string) => {
  if (!time) return "";
  const [rawHours, rawMinutes] = time.split(":");
  const hours = Number(rawHours);
  const minutes = rawMinutes ?? "00";
  const suffix = hours >= 12 ? "pm" : "am";
  const normalizedHours = hours % 12 || 12;
  return `${normalizedHours}:${minutes}${suffix}`;
};

const addMinutesToTime = (time: string, minutesToAdd: number) => {
  const total = parseTimeToMinutes(time) + minutesToAdd;
  return formatMinutesToTime(total);
};

const buildLocalDateTime = (dateKey: string, time: string) => `${dateKey}T${time.length === 5 ? `${time}:00` : time}`;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const WeekView: React.FC<WeekViewProps> = ({ embedded = false }) => {
  const calendarShellRef = useRef<HTMLDivElement | null>(null);
  const [weekStart, setWeekStart] = useState(() => getStartOfWeek(new Date()));
  const [items, setItems] = useState<WeekItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [createSlot, setCreateSlot] = useState<CreateSlot | null>(null);
  const [createForm, setCreateForm] = useState<"task" | "event" | null>(null);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState(1);
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskDueTime, setTaskDueTime] = useState("");
  const [taskStatus, setTaskStatus] = useState("todo");

  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStartAt, setEventStartAt] = useState("");
  const [eventEndAt, setEventEndAt] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventColor, setEventColor] = useState(DEFAULT_EVENT_COLOR);
  const [eventStatus, setEventStatus] = useState("scheduled");

  const hours = useMemo(() => Array.from({ length: 24 }, (_, hour) => hour), []);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + index);
        return day;
      }),
    [weekStart],
  );

  const todayKey = formatDateKey(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = (nowMinutes / 60) * HOUR_HEIGHT;
  const isTodayInCurrentWeek = useMemo(
    () => days.some((day) => formatDateKey(day) === todayKey),
    [days, todayKey],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (loading || !isTodayInCurrentWeek) return;
    const shell = calendarShellRef.current;
    if (!shell) return;
    const targetTop = nowTop - shell.clientHeight * 0.35;
    shell.scrollTop = Math.max(0, targetTop);
  }, [loading, isTodayInCurrentWeek, nowTop, weekStart]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, eventsRes] = await Promise.all([
        api.get<ApiTask[]>("/tasks"),
        api.get<ApiEvent[]>("/events"),
      ]);

      const mappedTasks: WeekItem[] = tasksRes.data.map((task) => {
        const legacy = parseLegacyDescription(task.description);
        const date = task.due_date ?? legacy.date;
        const time = task.due_time?.slice(0, 5) ?? legacy.time;
        return {
          id: task.id,
          type: "task",
          name: task.title,
          date,
          time,
          priority: task.priority ?? legacy.priority,
          completed: task.completed,
          color: task.color ?? undefined,
        };
      });

      const mappedEvents: WeekItem[] = eventsRes.data.map((event) => {
        const start = new Date(event.start_at);
        const end = new Date(event.end_at);
        return {
          id: event.id,
          type: "event",
          name: event.title,
          date: formatDateKey(start),
          time: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
          endTime: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
          priority: 0,
          completed: false,
          color: event.color ?? undefined,
        };
      });

      setItems([...mappedTasks, ...mappedEvents]);
    } catch (err) {
      console.error("Failed to load tasks/events", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const itemsByDate = useMemo(() => {
    const grouped: Record<string, WeekItem[]> = {};
    items.forEach((item) => {
      if (!item.date) return;
      if (!grouped[item.date]) grouped[item.date] = [];
      grouped[item.date].push(item);
    });
    Object.values(grouped).forEach((dayItems) => {
      dayItems.sort((left, right) => left.time.localeCompare(right.time));
    });
    return grouped;
  }, [items]);

  const goToPreviousWeek = () => {
    const nextWeek = new Date(weekStart);
    nextWeek.setDate(weekStart.getDate() - 7);
    setWeekStart(nextWeek);
  };

  const goToNextWeek = () => {
    const nextWeek = new Date(weekStart);
    nextWeek.setDate(weekStart.getDate() + 7);
    setWeekStart(nextWeek);
  };

  const goToCurrentWeek = () => {
    setWeekStart(getStartOfWeek(new Date()));
  };

  const closeCreationUI = () => {
    setCreateSlot(null);
    setCreateForm(null);
    setTaskTitle("");
    setTaskDescription("");
    setTaskPriority(1);
    setTaskDueDate("");
    setTaskDueTime("");
    setTaskStatus("todo");
    setEventTitle("");
    setEventDescription("");
    setEventStartAt("");
    setEventEndAt("");
    setEventLocation("");
    setEventColor(DEFAULT_EVENT_COLOR);
    setEventStatus("scheduled");
  };

  const openCreateMenu = (dateKey: string, hour: number, x: number, y: number) => {
    setCreateSlot({ dateKey, hour, x, y });
    setCreateForm(null);
  };

  const startTaskCreation = () => {
    if (!createSlot) return;
    setTaskDueDate(createSlot.dateKey);
    setTaskDueTime(`${String(createSlot.hour).padStart(2, "0")}:00`);
    setCreateForm("task");
  };

  const startEventCreation = () => {
    if (!createSlot) return;
    const startTime = `${String(createSlot.hour).padStart(2, "0")}:00`;
    setEventStartAt(buildLocalDateTime(createSlot.dateKey, startTime));
    setEventEndAt(buildLocalDateTime(createSlot.dateKey, addMinutesToTime(startTime, 60)));
    setCreateForm("event");
  };

  const createTask = async () => {
    if (!taskTitle.trim() || !taskDueDate || !taskDueTime) {
      alert("Task title, date, and time are required.");
      return;
    }

    try {
      await api.post("/tasks", {
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        priority: taskPriority,
        status: taskStatus,
        due_date: taskDueDate,
        due_time: taskDueTime,
      });
      await loadAll();
      closeCreationUI();
    } catch (err) {
      console.error("Failed to create task", err);
      alert("Failed to create task.");
    }
  };

  const createEvent = async () => {
    if (!eventTitle.trim() || !eventStartAt || !eventEndAt) {
      alert("Event title, start time, and end time are required.");
      return;
    }

    if (new Date(eventEndAt) <= new Date(eventStartAt)) {
      alert("Event end time must be after start time.");
      return;
    }

    try {
      await api.post("/events", {
        title: eventTitle.trim(),
        description: eventDescription.trim() || null,
        start_at: eventStartAt,
        end_at: eventEndAt,
        color: eventColor,
        location: eventLocation.trim() || null,
        status: eventStatus,
        all_day: false,
        recurrence: "none",
      });
      await loadAll();
      closeCreationUI();
    } catch (err) {
      console.error("Failed to create event", err);
      alert("Failed to create event.");
    }
  };

  const priorityLabel = (priority: number) => {
    if (priority >= 3) return "high";
    if (priority === 2) return "medium";
    return "low";
  };

  const hourHeight = HOUR_HEIGHT;
  const calendarWidthStyle = embedded ? { height: "100%" } : { minHeight: "100vh" };
  const calendarShellStyle = embedded ? undefined : { minHeight: "0" };

  return (
    <div className={`weekViewContainer ${embedded ? "embedded" : "standalone"}`} style={calendarWidthStyle}>
      <div className={`weekViewContent ${embedded ? "embedded" : "standalone"}`}>
        <div className="weekViewHeader">
          <div className="weekHeaderTitleRow">
            <h2>Week View</h2>
            <div className="headerControls">
              <div className="weekRange">
                {weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – {weekEnd.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div className="weekNavigation">
                <button onClick={goToPreviousWeek}>← Previous</button>
                <button onClick={goToCurrentWeek}>This Week</button>
                <button onClick={goToNextWeek}>Next →</button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="weekLoading">Loading tasks…</p>
        ) : (
          <div className="weekCalendarShell" style={calendarShellStyle} ref={calendarShellRef}>
            <div
              className="weekCalendar"
              style={{
                gridTemplateColumns: "72px repeat(7, minmax(0, 1fr))",
                gridTemplateRows: `48px minmax(${hourHeight * 24}px, 1fr)`,
              }}
            >
              <div className="weekCalendarCorner" />
              {days.map((day) => {
                const key = formatDateKey(day);
                const isToday = key === todayKey;
                return (
                  <div key={key} className={`weekDayHeaderCell ${isToday ? "weekDayToday" : ""}`}>
                    <span className="weekDayName">{day.toLocaleDateString("en-US", { weekday: "short" })}</span>
                    <span className={`weekDayNumber ${isToday ? "todayBadge" : ""}`}>{day.getDate()}</span>
                  </div>
                );
              })}

              <div className="weekTimeColumn">
                {hours.map((hour) => (
                  <div key={hour} className="weekTimeSlot">
                    <span>{formatDisplayTime(`${String(hour).padStart(2, "0")}:00`)}</span>
                  </div>
                ))}
              </div>

              {days.map((day) => {
                const key = formatDateKey(day);
                const isToday = key === todayKey;
                const dayItems = itemsByDate[key] || [];
                return (
                  <div key={key} className={`weekDayColumn ${isToday ? "weekDayToday" : ""}`}>
                    <div className="weekHourSlots">
                      {hours.map((hour) => (
                        <button
                          key={hour}
                          type="button"
                          className="weekHourSlotButton"
                          onClick={(event) =>
                            openCreateMenu(
                              key,
                              hour,
                              event.clientX,
                              event.clientY,
                            )
                          }
                        />
                      ))}
                    </div>
                    {isToday && (
                      <div
                        className="weekNowLine"
                        style={{ top: nowTop }}
                        aria-label={`Current time ${formatDisplayTime(formatMinutesToTime(nowMinutes))}`}
                      >
                        <span className="weekNowDot" />
                        <span className="weekNowLabel">Now</span>
                      </div>
                    )}
                    <div className="weekEventLayer">
                      {dayItems.map((item) => {
                        const top = (parseTimeToMinutes(item.time) / 60) * hourHeight;
                        const durationMinutes =
                          item.type === "event"
                            ? Math.max(
                                30,
                                parseTimeToMinutes(item.endTime) - parseTimeToMinutes(item.time),
                              )
                            : 45;
                        const height = Math.max(36, (durationMinutes / 60) * hourHeight - 6);
                        const accent = item.color ?? (item.type === "task" ? "#6b7280" : DEFAULT_EVENT_COLOR);

                        return (
                          <button
                            key={`${item.type}-${item.id}`}
                            type="button"
                            className={`weekEventCard ${item.type} ${item.completed ? "taskCompleted" : ""}`}
                            style={{
                              top,
                              height,
                              borderLeftColor: accent,
                            }}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <span className="weekEventTime">{item.time ? formatDisplayTime(item.time) : "All day"}</span>
                            <span className="weekEventTitle">{item.type === "event" ? "📅 " : ""}{item.name}</span>
                            {item.type === "task" && <span className={`weekPriorityTag ${priorityLabel(item.priority)}`}>Priority {item.priority}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {createSlot && !createForm && (
        <div className="weekCreateOverlay" onClick={closeCreationUI}>
          <div
            className="weekCreateMenu"
            onClick={(event) => event.stopPropagation()}
            style={{
              left: clamp(createSlot.x, 16, typeof window !== "undefined" ? window.innerWidth - 240 : createSlot.x),
              top: clamp(createSlot.y, 16, typeof window !== "undefined" ? window.innerHeight - 140 : createSlot.y),
            }}
          >
            <div className="weekCreateMenuTitle">
              {new Date(createSlot.dateKey).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
            <div className="weekCreateMenuSubtitle">{formatDisplayTime(`${String(createSlot.hour).padStart(2, "0")}:00`)}</div>
            <button onClick={startTaskCreation}>Create task</button>
            <button onClick={startEventCreation}>Create event</button>
          </div>
        </div>
      )}

      {createSlot && createForm === "task" && (
        <div className="weekCreateOverlay" onClick={closeCreationUI}>
          <div className="weekCreateModal" onClick={(event) => event.stopPropagation()}>
            <h3>Create Task</h3>
            <label>
              Title
              <input type="text" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Task title" />
            </label>
            <label>
              Description
              <textarea value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} placeholder="Task details" />
            </label>
            <div className="weekFormRow">
              <label>
                Date
                <input type="date" value={taskDueDate} onChange={(event) => setTaskDueDate(event.target.value)} />
              </label>
              <label>
                Time
                <input type="time" value={taskDueTime} onChange={(event) => setTaskDueTime(event.target.value)} />
              </label>
            </div>
            <div className="weekFormRow">
              <label>
                Priority
                <input type="number" min={1} max={10} value={taskPriority} onChange={(event) => setTaskPriority(Number(event.target.value))} />
              </label>
              <label>
                Status
                <select value={taskStatus} onChange={(event) => setTaskStatus(event.target.value)}>
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </label>
            </div>
            <div className="weekFormActions">
              <button onClick={createTask}>Save task</button>
              <button className="secondary" onClick={closeCreationUI}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {createSlot && createForm === "event" && (
        <div className="weekCreateOverlay" onClick={closeCreationUI}>
          <div className="weekCreateModal" onClick={(event) => event.stopPropagation()}>
            <h3>Create Event</h3>
            <label>
              Title
              <input type="text" value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} placeholder="Event title" />
            </label>
            <label>
              Description
              <textarea value={eventDescription} onChange={(event) => setEventDescription(event.target.value)} placeholder="Event details" />
            </label>
            <div className="weekFormRow">
              <label>
                Start
                <input type="datetime-local" value={eventStartAt} onChange={(event) => setEventStartAt(event.target.value)} />
              </label>
              <label>
                End
                <input type="datetime-local" value={eventEndAt} onChange={(event) => setEventEndAt(event.target.value)} />
              </label>
            </div>
            <div className="weekFormRow">
              <label>
                Location
                <input type="text" value={eventLocation} onChange={(event) => setEventLocation(event.target.value)} placeholder="Optional location" />
              </label>
              <label>
                Color
                <input type="color" value={eventColor} onChange={(event) => setEventColor(event.target.value)} />
              </label>
            </div>
            <label>
              Status
              <select value={eventStatus} onChange={(event) => setEventStatus(event.target.value)}>
                <option value="scheduled">Scheduled</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="canceled">Canceled</option>
              </select>
            </label>
            <div className="weekFormActions">
              <button onClick={createEvent}>Save event</button>
              <button className="secondary" onClick={closeCreationUI}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeekView;
