import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { FaCheck } from "react-icons/fa";
import api from "../../services/api";
import { useTaskEvents } from "../../contexts/TaskEventContext";
import {
  findEventConflicts,
  formatConflictMessage,
  PENDING_APPROVAL_STATUS,
} from "../../utils/eventConflicts";
import {
  parseColorAndPattern,
  getPatternStyle,
  encodeColorAndPattern,
  DEFAULT_EVENT_COLOR,
  DEFAULT_TASK_COLOR,
} from "../../utils/styleUtils";
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
  color: string;
  pattern: string;
  status?: string | null;
  location?: string;
}

interface CreateSlot {
  dateKey: string;
  hour: number;
  x: number;
  y: number;
}

const HOUR_HEIGHT = 72;

const PATTERN_OPTIONS = [
  { value: "solid", label: "Solid Color" },
  { value: "diagonal-right", label: "Diagonal Stripes (/)" },
  { value: "diagonal-left", label: "Diagonal Stripes (\\)" },
  { value: "vertical", label: "Vertical Lines" },
  { value: "horizontal", label: "Horizontal Lines" },
];

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

const buildLocalDateTime = (dateKey: string, time: string) =>
  `${dateKey}T${time.length === 5 ? `${time}:00` : time}`;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const WeekView: React.FC<WeekViewProps> = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { refreshKey, triggerRefresh } = useTaskEvents();
  const calendarShellRef = useRef<HTMLDivElement | null>(null);
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between syncs
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
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStartAt, setEventStartAt] = useState("");
  const [eventEndAt, setEventEndAt] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventColor, setEventColor] = useState(DEFAULT_EVENT_COLOR);
  const [eventPattern, setEventPattern] = useState("solid");
  const [eventStatus, setEventStatus] = useState("scheduled");

  const hours = useMemo(
    () => Array.from({ length: 24 }, (_, hour) => hour),
    [],
  );

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
      await Promise.all([
        (async () => {
          try {
            const response = await api.post("/events/sync/google-calendar", {});
            console.log("Google Calendar sync initiated:", response.data);
          } catch (err) {
            console.debug("Google Calendar sync not available:", err);
          }
        })(),
        (async () => {
          try {
            const response = await api.post("/events/sync/canvas", {});
            console.log("Canvas sync initiated:", response.data);
          } catch (err) {
            console.debug("Canvas sync not available:", err);
          }
        })(),
      ]);

      const [tasksResult, eventsResult] = await Promise.allSettled([
        api.get<ApiTask[]>("/tasks"),
        api.get<ApiEvent[]>("/events"),
      ]);

      const mappedTasks: WeekItem[] =
        tasksResult.status === "fulfilled"
          ? tasksResult.value.data.map((task) => {
              const legacy = parseLegacyDescription(task.description);
              const parsedStyles = parseColorAndPattern(
                task.color,
                DEFAULT_TASK_COLOR,
              );
              const date = task.due_date ?? legacy.date;
              const time = task.due_time?.slice(0, 5) ?? legacy.time;
              return {
                id: task.id,
                type: "task" as const,
                name: task.title,
                date,
                time,
                priority: task.priority ?? legacy.priority,
                completed: task.completed,
                color: parsedStyles.color,
                pattern: parsedStyles.pattern,
              };
            })
          : (() => {
              console.error("Failed to load tasks", tasksResult.reason);
              return [];
            })();

      const mappedEvents: WeekItem[] =
        eventsResult.status === "fulfilled"
          ? eventsResult.value.data
              .filter((event) => event.status !== PENDING_APPROVAL_STATUS)
              .map((event) => {
                const start = new Date(event.start_at);
                const end = new Date(event.end_at);
                const parsedStyles = parseColorAndPattern(
                  event.color,
                  DEFAULT_EVENT_COLOR,
                );
                return {
                  id: event.id,
                  type: "event" as const,
                  name: event.title,
                  date: formatDateKey(start),
                  time: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
                  endTime: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
                  priority: 0,
                  completed: false,
                  color: parsedStyles.color,
                  pattern: parsedStyles.pattern,
                  status: event.status,
                };
              })
          : (() => {
              console.error("Failed to load events", eventsResult.reason);
              return [];
            })();

      setItems([...mappedTasks, ...mappedEvents]);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load tasks/events", err);
      setLoading(false);
    }
    const [tasksResult, eventsResult] = await Promise.allSettled([
      api.get<ApiTask[]>("/tasks"),
      api.get<ApiEvent[]>("/events"),
    ]);

    const mappedTasks: WeekItem[] = tasksResult.status === "fulfilled"
      ? tasksResult.value.data.map((task) => {
          const legacy = parseLegacyDescription(task.description);
          const parsedStyles = parseColorAndPattern(task.color, DEFAULT_TASK_COLOR);
          const date = task.due_date ?? legacy.date;
          const time = task.due_time?.slice(0, 5) ?? legacy.time;
          return {
            id: task.id,
            type: "task" as const,
            name: task.title,
            date,
            time,
            priority: task.priority ?? legacy.priority,
            completed: task.completed,
            color: parsedStyles.color,
            pattern: parsedStyles.pattern,
          };
        })
      : (() => { console.error("Failed to load tasks", tasksResult.reason); return []; })();

    const mappedEvents: WeekItem[] = eventsResult.status === "fulfilled"
      ? eventsResult.value.data
          .filter((event) => event.status !== PENDING_APPROVAL_STATUS)
          .map((event) => {
            const start = new Date(event.start_at);
            const end = new Date(event.end_at);
            const parsedStyles = parseColorAndPattern(event.color, DEFAULT_EVENT_COLOR);
            return {
              id: event.id,
              type: "event" as const,
              name: event.title,
              date: formatDateKey(start),
              time: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
              endTime: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
              priority: 0,
              completed: false,
              color: parsedStyles.color,
              pattern: parsedStyles.pattern,
              status: event.status,
              location: event.location ?? "",
            };
          })
      : (() => { console.error("Failed to load events", eventsResult.reason); return []; })();

    setItems([...mappedTasks, ...mappedEvents]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll, refreshKey]);

  // Set up auto-refresh that resets on manual refresh
  const setupAutoRefresh = () => {
    // Clear existing timer if any
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
    }

    // Set new auto-refresh timer for 60 seconds, but respect cooldown
    autoRefreshTimerRef.current = setInterval(async () => {
      const now = Date.now();
      const timeSinceLastSync = now - lastSyncTimeRef.current;

      // Only sync if cooldown has passed
      if (timeSinceLastSync >= SYNC_COOLDOWN_MS) {
        lastSyncTimeRef.current = now;
        await loadAll();
      }
    }, 60000); // Check every 60 seconds
  };

  // Handle manual refresh - calls loadAll and resets the auto-refresh timer
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
    setupAutoRefresh(); // Reset the auto-refresh timer
  };

  useEffect(() => {
    lastSyncTimeRef.current = Date.now();
    setupAutoRefresh();

    // Cleanup on unmount
    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
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

  const handleDayClick = (dateKey: string) => {
    navigate(`/dayview?date=${dateKey}`, { state: { fromView: "week" } });
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
    setEventPattern("solid");
    setEventStatus("scheduled");
  };

  const openCreateMenu = (
    dateKey: string,
    hour: number,
    x: number,
    y: number,
  ) => {
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
    setEventEndAt(
      buildLocalDateTime(createSlot.dateKey, addMinutesToTime(startTime, 60)),
    );
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
      triggerRefresh();
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

    const eventConflicts = findEventConflicts(
      items
        .filter((item) => item.type === "event")
        .map((item) => ({
          id: item.id,
          title: item.name,
          startAt: buildLocalDateTime(item.date, item.time),
          endAt: buildLocalDateTime(item.date, item.endTime ?? item.time),
          status: item.status,
        })),
      eventStartAt,
      eventEndAt,
    );
    const hasConflicts = eventConflicts.length > 0;
    if (hasConflicts) {
      const approved = window.confirm(
        `This event conflicts with:\n\n${formatConflictMessage(eventConflicts)}\n\nIt will be saved as pending approval and will not appear on the calendar until approved.`,
      );
      if (!approved) return;
    }

    try {
      const response = await api.post<ApiEvent>("/events", {
        title: eventTitle.trim(),
        description: eventDescription.trim() || null,
        start_at: eventStartAt,
        end_at: eventEndAt,
        color: encodeColorAndPattern(eventColor, eventPattern),
        location: eventLocation.trim() || null,
        status: hasConflicts ? PENDING_APPROVAL_STATUS : eventStatus,
        all_day: false,
        recurrence: "none",
      });
      await loadAll();
      triggerRefresh();
      if (response.data.status === PENDING_APPROVAL_STATUS) {
        alert(
          "Event saved as pending approval. Approve it from the task panel before it appears on the calendar.",
        );
      }
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

  const [selectedItem, setSelectedItem] = useState<WeekItem | null>(null);
  const [detailMode, setDetailMode] = useState<"view" | "edit">("view");

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editPriority, setEditPriority] = useState(1);
  const [editStatus, setEditStatus] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editColor, setEditColor] = useState(DEFAULT_EVENT_COLOR);
  const [editPattern, setEditPattern] = useState("solid");

  const openDetail = (item: WeekItem) => {
    setSelectedItem(item);
    setDetailMode("view");
  };

  const closeDetail = () => {
    setSelectedItem(null);
    setDetailMode("view");
  };

  const startEdit = () => {
    if (!selectedItem) return;
    setEditTitle(selectedItem.name);
    setEditDescription("");
    setEditDate(selectedItem.date);
    setEditTime(selectedItem.time);
    setEditEndTime(selectedItem.endTime ?? "");
    setEditPriority(selectedItem.priority);
    setEditStatus(selectedItem.status ?? (selectedItem.type === "task" ? "todo" : "scheduled"));
    setEditLocation(selectedItem.location ?? "");
    setEditColor(selectedItem.color);
    setEditPattern(selectedItem.pattern);
    setDetailMode("edit");
  };

  const saveDetail = async () => {
    if (!selectedItem) return;
    try {
      if (selectedItem.type === "task") {
        await api.put(`/tasks/${selectedItem.id}`, {
          title: editTitle.trim(),
          priority: editPriority,
          status: editStatus,
          due_date: editDate,
          due_time: editTime,
        });
      } else {
        const startAt = buildLocalDateTime(editDate, editTime);
        const endAt = buildLocalDateTime(editDate, editEndTime);
        if (new Date(endAt) <= new Date(startAt)) {
          alert("End time must be after start time.");
          return;
        }
        await api.put(`/events/${selectedItem.id}`, {
          title: editTitle.trim(),
          start_at: startAt,
          end_at: endAt,
          status: editStatus,
          color: encodeColorAndPattern(editColor, editPattern),
          location: editLocation.trim() || null,
        });
      }
      await loadAll();
      triggerRefresh();
      closeDetail();
    } catch (err) {
      console.error("Failed to update item", err);
      alert("Failed to update.");
    }
  };

  const deleteItem = async () => {
    if (!selectedItem) return;
    if (!window.confirm(`Delete "${selectedItem.name}"?`)) return;
    try {
      const endpoint = selectedItem.type === "task" ? "tasks" : "events";
      await api.delete(`/${endpoint}/${selectedItem.id}`);
      await loadAll();
      triggerRefresh();
      closeDetail();
    } catch (err) {
      console.error("Failed to delete item", err);
      alert("Failed to delete.");
    }
  };

  const completeTask = async () => {
    if (!selectedItem || selectedItem.type !== "task") return;
    try {
      await api.put(`/tasks/${selectedItem.id}`, { completed: true });
      await loadAll();
      triggerRefresh();
      closeDetail();
    } catch (err) {
      console.error("Failed to complete task", err);
      alert("Failed to complete task.");
    }
  };

  const hourHeight = HOUR_HEIGHT;
  const calendarWidthStyle = embedded
    ? { height: "100%" }
    : { minHeight: "100vh" };
  const calendarShellStyle = embedded ? undefined : { minHeight: "0" };

  return (
    <div
      className={`weekViewContainer ${embedded ? "embedded" : "standalone"}`}
      style={calendarWidthStyle}
    >
      <div
        className={`weekViewContent ${embedded ? "embedded" : "standalone"}`}
      >
        <div className="weekViewHeader">
          <div className="weekHeaderTitleRow">
            <h2>Week View</h2>
            <div className="headerControls">
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
              <div className="weekNavigation">
                <button onClick={goToPreviousWeek}>← Previous</button>
                <button onClick={goToCurrentWeek}>This Week</button>
                <button onClick={goToNextWeek}>Next →</button>
                <button
                  onClick={handleManualRefresh}
                  disabled={cooldownSeconds > 0}
                  style={{
                    opacity: cooldownSeconds > 0 ? 0.6 : 1,
                    cursor: cooldownSeconds > 0 ? "not-allowed" : "pointer",
                  }}
                >
                  {cooldownSeconds > 0
                    ? `Refresh (${cooldownSeconds}s)`
                    : "Refresh"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="weekLoading">Loading tasks…</p>
        ) : (
          <div
            className="weekCalendarShell"
            style={calendarShellStyle}
            ref={calendarShellRef}
          >
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
                  <div
                    key={key}
                    className={`weekDayHeaderCell ${isToday ? "weekDayToday" : ""}`}
                    onClick={() => handleDayClick(key)}
                    title="Click to view day"
                  >
                    <span className="weekDayName">
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span
                      className={`weekDayNumber ${isToday ? "todayBadge" : ""}`}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}

              <div className="weekTimeColumn">
                {hours.map((hour) => (
                  <div key={hour} className="weekTimeSlot">
                    <span>
                      {formatDisplayTime(`${String(hour).padStart(2, "0")}:00`)}
                    </span>
                  </div>
                ))}
              </div>

              {days.map((day) => {
                const key = formatDateKey(day);
                const isToday = key === todayKey;
                const dayItems = itemsByDate[key] || [];
                return (
                  <div
                    key={key}
                    className={`weekDayColumn ${isToday ? "weekDayToday" : ""}`}
                  >
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
                        const top =
                          (parseTimeToMinutes(item.time) / 60) * hourHeight;
                        // Calculate duration strictly for events bc tasks are too small otherwise (minimum 30 mins visual size)
                        const durationMinutes =
                          item.type === "event"
                            ? Math.max(
                                30,
                                parseTimeToMinutes(item.endTime) -
                                  parseTimeToMinutes(item.time),
                              )
                            : 0;

                        // Events scale exactly to their duration tasks just autosize
                        const height =
                          item.type === "event"
                            ? Math.max(
                                36,
                                (durationMinutes / 60) * hourHeight - 6,
                              )
                            : "auto";

                        return (
                          <button
                            key={`${item.type}-${item.id}`}
                            type="button"
                            className={`weekEventCard ${item.type} ${item.completed ? "taskCompleted" : ""}`}
                            style={{ top, height }}
                            onClick={(e) => { e.stopPropagation(); openDetail(item); }}
                          >
                            <div
                              className="taskItemPattern"
                              style={getPatternStyle(item.color, item.pattern)}
                            />
                            <span className="weekEventTime">
                              {item.time
                                ? item.type === "event" && item.endTime
                                  ? `${formatDisplayTime(item.time)} - ${formatDisplayTime(item.endTime)}`
                                  : formatDisplayTime(item.time)
                                : "All day"}
                            </span>
                            <span className="weekEventTitle">
                              {item.type === "event" ? "📅 " : ""}
                              {item.name}
                            </span>
                            {item.type === "task" && (
                              <span
                                className={`weekPriorityTag ${priorityLabel(item.priority)}`}
                              >
                                Priority {item.priority}
                              </span>
                            )}
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
              left: clamp(
                createSlot.x,
                16,
                typeof window !== "undefined"
                  ? window.innerWidth - 240
                  : createSlot.x,
              ),
              top: clamp(
                createSlot.y,
                16,
                typeof window !== "undefined"
                  ? window.innerHeight - 140
                  : createSlot.y,
              ),
            }}
          >
            <div className="weekCreateMenuTitle">
              {new Date(createSlot.dateKey).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
            <div className="weekCreateMenuSubtitle">
              {formatDisplayTime(
                `${String(createSlot.hour).padStart(2, "0")}:00`,
              )}
            </div>
            <button onClick={startTaskCreation}>Create task</button>
            <button onClick={startEventCreation}>Create event</button>
          </div>
        </div>
      )}

      {createSlot && createForm === "task" && (
        <div className="weekCreateOverlay" onClick={closeCreationUI}>
          <div
            className="weekCreateModal"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Create Task</h3>
            <label>
              Title
              <input
                type="text"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Task title"
              />
            </label>
            <label>
              Description
              <textarea
                value={taskDescription}
                onChange={(event) => setTaskDescription(event.target.value)}
                placeholder="Task details"
              />
            </label>
            <div className="weekFormRow">
              <label>
                Date
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(event) => setTaskDueDate(event.target.value)}
                />
              </label>
              <label>
                Time
                <input
                  type="time"
                  value={taskDueTime}
                  onChange={(event) => setTaskDueTime(event.target.value)}
                />
              </label>
            </div>
            <div className="weekFormRow">
              <label>
                Priority
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={taskPriority}
                  onChange={(event) =>
                    setTaskPriority(Number(event.target.value))
                  }
                />
              </label>
              <label>
                Status
                <select
                  value={taskStatus}
                  onChange={(event) => setTaskStatus(event.target.value)}
                >
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </label>
            </div>
            <div className="weekFormActions">
              <button onClick={createTask}>Save task</button>
              <button className="secondary" onClick={closeCreationUI}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {createSlot && createForm === "event" && (
        <div className="weekCreateOverlay" onClick={closeCreationUI}>
          <div
            className="weekCreateModal"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Create Event</h3>
            <label>
              Title
              <input
                type="text"
                value={eventTitle}
                onChange={(event) => setEventTitle(event.target.value)}
                placeholder="Event title"
              />
            </label>
            <label>
              Description
              <textarea
                value={eventDescription}
                onChange={(event) => setEventDescription(event.target.value)}
                placeholder="Event details"
              />
            </label>
            <div className="weekFormRow">
              <label>
                Start
                <input
                  type="datetime-local"
                  value={eventStartAt}
                  onChange={(event) => setEventStartAt(event.target.value)}
                />
              </label>
              <label>
                End
                <input
                  type="datetime-local"
                  value={eventEndAt}
                  onChange={(event) => setEventEndAt(event.target.value)}
                />
              </label>
            </div>
            <div className="weekFormRow">
              <label>
                Location
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(event) => setEventLocation(event.target.value)}
                  placeholder="Optional location"
                />
              </label>
              <label>
                Color & Pattern
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="color"
                    value={eventColor}
                    onChange={(event) => setEventColor(event.target.value)}
                    style={{ height: "38px", width: "50px" }}
                  />
                  <select
                    value={eventPattern}
                    onChange={(event) => setEventPattern(event.target.value)}
                    style={{ flex: 1 }}
                  >
                    {PATTERN_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>
            <label>
              Status
              <select
                value={eventStatus}
                onChange={(event) => setEventStatus(event.target.value)}
              >
                <option value="scheduled">Scheduled</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="canceled">Canceled</option>
              </select>
            </label>
            <div className="weekFormActions">
              <button onClick={createEvent}>Save event</button>
              <button className="secondary" onClick={closeCreationUI}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="weekCreateOverlay" onClick={closeDetail}>
          <div className="weekCreateModal" onClick={(e) => e.stopPropagation()}>
            {detailMode === "view" ? (
              <>
                <div className="weekDetailHeader">
                  <h3>{selectedItem.name}</h3>
                  <div className="weekDetailActions">
                    {selectedItem.type === "task" && !selectedItem.completed && (
                      <button className="weekDetailIconBtn complete" onClick={completeTask} title="Complete">
                        <FaCheck />
                      </button>
                    )}
                    <button className="weekDetailIconBtn edit" onClick={startEdit} title="Edit">
                      <FiEdit2 />
                    </button>
                    <button className="weekDetailIconBtn delete" onClick={deleteItem} title="Delete">
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
                <div className="weekDetailBody">
                  <div className="weekDetailRow">
                    <span className="weekDetailLabel">Type</span>
                    <span>{selectedItem.type === "task" ? "Task" : "Event"}</span>
                  </div>
                  <div className="weekDetailRow">
                    <span className="weekDetailLabel">{selectedItem.type === "task" ? "Due" : "Time"}</span>
                    <span>
                      {selectedItem.date && new Date(selectedItem.date + "T00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      {selectedItem.time && ` at ${formatDisplayTime(selectedItem.time)}`}
                      {selectedItem.endTime && ` – ${formatDisplayTime(selectedItem.endTime)}`}
                    </span>
                  </div>
                  {selectedItem.type === "task" && (
                    <div className="weekDetailRow">
                      <span className="weekDetailLabel">Priority</span>
                      <span className={`weekPriorityTag ${priorityLabel(selectedItem.priority)}`}>
                        {selectedItem.priority}
                      </span>
                    </div>
                  )}
                  {selectedItem.type === "event" && selectedItem.location && (
                    <div className="weekDetailRow">
                      <span className="weekDetailLabel">Location</span>
                      <span>{selectedItem.location}</span>
                    </div>
                  )}
                  <div className="weekDetailRow">
                    <span className="weekDetailLabel">Status</span>
                    <span>{selectedItem.completed ? "Completed" : (selectedItem.status ?? (selectedItem.type === "task" ? "todo" : "scheduled"))}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3>Edit {selectedItem.type === "task" ? "Task" : "Event"}</h3>
                <label>
                  Title
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </label>
                {selectedItem.type === "task" ? (
                  <>
                    <div className="weekFormRow">
                      <label>
                        Date
                        <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                      </label>
                      <label>
                        Time
                        <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                      </label>
                    </div>
                    <div className="weekFormRow">
                      <label>
                        Priority
                        <input type="number" min={1} max={10} value={editPriority} onChange={(e) => setEditPriority(Number(e.target.value))} />
                      </label>
                      <label>
                        Status
                        <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                          <option value="todo">Todo</option>
                          <option value="in_progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      </label>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="weekFormRow">
                      <label>
                        Start
                        <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                      </label>
                      <label>
                        End
                        <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} />
                      </label>
                    </div>
                    <div className="weekFormRow">
                      <label>
                        Location
                        <input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Location" />
                      </label>
                      <label>
                        Color & Pattern
                        <div style={{ display: "flex", gap: "8px" }}>
                          <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} style={{ height: "38px", width: "50px" }} />
                          <select value={editPattern} onChange={(e) => setEditPattern(e.target.value)} style={{ flex: 1 }}>
                            {PATTERN_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </label>
                    </div>
                    <label>
                      Status
                      <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                        <option value="scheduled">Scheduled</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                        <option value="canceled">Canceled</option>
                      </select>
                    </label>
                  </>
                )}
                <div className="weekFormActions">
                  <button onClick={saveDetail}>Save</button>
                  <button className="secondary" onClick={() => setDetailMode("view")}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeekView;
