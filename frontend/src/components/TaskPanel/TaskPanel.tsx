import React from "react";
import "./taskpanel.css";
import api from "../../services/api";
import { useTaskEvents } from "../../contexts/TaskEventContext";
import BackButton from "../BackButton";
import { useRef, useEffect } from "react";
import {
  findEventConflicts,
  formatConflictMessage,
  PENDING_APPROVAL_STATUS,
} from "../../utils/eventConflicts";
//currently there is no mcp integration with task creations all manual because the database doesnt currently support tasks
//task making by alex, editing +deletion by bini
//basically making a task its own object ish

interface Task {
  id: number;
  title: string;
  details: string;
  tag: string;
  color: string;
  pattern: string;
  dueDate: string;
  dueTime: string;
  priority: number;
  status: string;
  completed: boolean;
}

interface ApiTask {
  id: number;
  title: string;
  description?: string | null;
  tag?: string | null;
  color?: string | null; // We will pack pattern + color into this string
  priority?: number | null;
  status?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  completed: boolean;
  user_id: number;
  created_at: string;
}

interface EventItem {
  id: number;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  color: string;
  pattern: string;
  location: string;
  status: string;
  allDay: boolean;
  recurrence: string;
}

interface ApiEvent {
  id: number;
  title: string;
  description?: string | null;
  start_at: string;
  end_at: string;
  color?: string | null; // We will pack pattern + color into this string
  location?: string | null;
  status?: string | null;
  all_day?: boolean | null;
  recurrence?: string | null;
  user_id: number;
  created_at: string;
  updated_at: string;
}

interface TaskPanelProps {
  hideBackButton?: boolean;
  refreshTrigger?: number;
}

const TAG_COLORS: Record<string, string> = {
  Homework: "#4A90E2",
  Quiz: "#F5A623",
  Chores: "#7ED321",
  Project: "#BD10E0",
  Work: "#D0021B",
  Personal: "#50E3C2",
};

const DEFAULT_TAG = "Homework";
const DEFAULT_TASK_COLOR = TAG_COLORS[DEFAULT_TAG];
const DEFAULT_EVENT_COLOR = "#1f8bd1";
const DEFAULT_PATTERN = "solid";
const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
const EVENT_STATUSES = [
  "scheduled",
  "ongoing",
  "completed",
  "canceled",
  PENDING_APPROVAL_STATUS,
] as const;
const EVENT_RECURRENCES = ["none", "daily", "weekly", "monthly"] as const;
const PATTERN_OPTIONS = [
  { value: "solid", label: "Solid Color" },
  { value: "diagonal-right", label: "Diagonal Stripes (/)" },
  { value: "diagonal-left", label: "Diagonal Stripes (\\)" },
  { value: "vertical", label: "Vertical Lines" },
  { value: "horizontal", label: "Horizontal Lines" }
];

const normalizeHexColor = (
  value?: string | null,
  fallback = DEFAULT_TASK_COLOR,
) => {
  if (!value) return fallback;
  const color = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : fallback;
};

// NEW: Helper to parse the packed "pattern:color" string from the database
const parseColorAndPattern = (value?: string | null, fallbackColor = DEFAULT_TASK_COLOR) => {
  if (!value) return { color: fallbackColor, pattern: "solid" };
  const str = value.trim();
  if (str.includes(":")) {
    const [pattern, color] = str.split(":");
    return { pattern, color: normalizeHexColor(color, fallbackColor) };
  }
  // Legacy support for plain hex colors already in the DB
  return { pattern: "solid", color: normalizeHexColor(str, fallbackColor) };
};

// NEW: Helper to format the pattern and color to send to the database
const encodeColorAndPattern = (color: string, pattern: string) => {
  return `${pattern}:${normalizeHexColor(color)}`;
};

const getPatternStyle = (color: string, pattern: string): React.CSSProperties => {
  const spacing = "5px";
  const transparentSpacing = "10px";
  switch (pattern) {
      case "diagonal-right":
          return { backgroundImage: `repeating-linear-gradient(45deg, ${color}, ${color} ${spacing}, transparent ${spacing}, transparent ${transparentSpacing})` };
      case "diagonal-left":
          return { backgroundImage: `repeating-linear-gradient(-45deg, ${color}, ${color} ${spacing}, transparent ${spacing}, transparent ${transparentSpacing})` };
      case "vertical":
          return { backgroundImage: `repeating-linear-gradient(90deg, ${color}, ${color} ${spacing}, transparent ${spacing}, transparent ${transparentSpacing})` };
      case "horizontal":
          return { backgroundImage: `repeating-linear-gradient(0deg, ${color}, ${color} ${spacing}, transparent ${spacing}, transparent ${transparentSpacing})` };
      case "solid":
      default:
          return { backgroundColor: color };
  }
};

const parseLegacyDescription = (description?: string | null) => {
  if (!description) {
    return { details: "", dueDate: "", dueTime: "", priority: 1 };
  }
  try {
    const parsed = JSON.parse(description);
    return {
      details: parsed.details ?? "",
      dueDate: parsed.date ?? "",
      dueTime: parsed.time ?? "",
      priority: parsed.priority ?? 1,
    };
  } catch {
    return { details: description, dueDate: "", dueTime: "", priority: 1 };
  }
};

const formatDateTimeLocal = (iso?: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDateTimeLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const mapApiEvent = (
  event: ApiEvent,
  fallbackColor = DEFAULT_EVENT_COLOR,
): EventItem => {
  const parsedStyles = parseColorAndPattern(event.color, fallbackColor);
  return {
    id: event.id,
    title: event.title,
    description: event.description ?? "",
    startAt: formatDateTimeLocal(event.start_at),
    endAt: formatDateTimeLocal(event.end_at),
    color: parsedStyles.color,
    pattern: parsedStyles.pattern,
    location: event.location ?? "",
    status: event.status ?? "scheduled",
    allDay: Boolean(event.all_day),
    recurrence: event.recurrence ?? "none",
  };
};

type RangeFilter = "today" | "week" | "month" | "all";

const RANGE_OPTIONS: { value: RangeFilter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All" },
];

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const getRangeBounds = (
  range: RangeFilter,
): { start: Date; end: Date | null } => {
  const today = startOfDay(new Date());
  if (range === "all") return { start: today, end: null };
  const end = new Date(today);
  if (range === "today") end.setDate(end.getDate() + 1);
  if (range === "week") end.setDate(end.getDate() + 7);
  if (range === "month") end.setDate(end.getDate() + 30);
  return { start: today, end };
};

const isWithinRange = (date: Date, range: RangeFilter): boolean => {
  const { start, end } = getRangeBounds(range);
  if (date < start) return false;
  if (end && date >= end) return false;
  return true;
};

const parseTaskDate = (dueDate: string, dueTime: string): Date | null => {
  if (!dueDate) return null;
  const combined = dueTime ? `${dueDate}T${dueTime}` : `${dueDate}T00:00`;
  const d = new Date(combined);
  return Number.isNaN(d.getTime()) ? null : d;
};

const parseEventDate = (startAt: string): Date | null => {
  if (!startAt) return null;
  const d = new Date(startAt);
  return Number.isNaN(d.getTime()) ? null : d;
};

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const formatDateHeader = (d: Date): string => {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const itemDay = startOfDay(d);
  const monthDay = itemDay.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  if (itemDay.getTime() === today.getTime()) return `Today · ${monthDay}`;
  if (itemDay.getTime() === tomorrow.getTime()) return `Tomorrow · ${monthDay}`;
  const weekday = itemDay.toLocaleDateString(undefined, { weekday: "long" });
  return `${weekday} · ${monthDay}`;
};

const formatTimeLabel = (value: string): string => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const formatDueTime = (time: string): string => {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hours = Number(h);
  if (Number.isNaN(hours)) return time;
  const d = new Date();
  d.setHours(hours, Number(m ?? 0), 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

function groupByDate<T>(
  items: T[],
  getDate: (item: T) => Date | null,
): { key: string; date: Date | null; items: T[] }[] {
  const map = new Map<string, { key: string; date: Date | null; items: T[] }>();
  for (const item of items) {
    const d = getDate(item);
    const key = d ? dateKey(d) : "undated";
    if (!map.has(key)) {
      map.set(key, { key, date: d ? startOfDay(d) : null, items: [] });
    }
    map.get(key)!.items.push(item);
  }
  return Array.from(map.values()).sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.getTime() - b.date.getTime();
  });
}

const TaskPanel: React.FC<TaskPanelProps> = ({ hideBackButton = false }) => {
  const { refreshKey, triggerRefresh } = useTaskEvents();
  const [view, setView] = React.useState<"tasks" | "events">("tasks");
  const [rangeFilter, setRangeFilter] = React.useState<RangeFilter>("week");
  const [activeForm, setActiveForm] = React.useState<"task" | "event" | null>(
    null,
  );
  const [showCreateMenu, setShowCreateMenu] = React.useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        createMenuRef.current &&
        !createMenuRef.current.contains(e.target as Node)
      ) {
        setShowCreateMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [events, setEvents] = React.useState<EventItem[]>([]);

  const [editingTaskId, setEditingTaskId] = React.useState<number | null>(null);
  const [editingEventId, setEditingEventId] = React.useState<number | null>(
    null,
  );

  const [newTaskTitle, setNewTaskTitle] = React.useState("");
  const [newTaskDetails, setNewTaskDetails] = React.useState("");
  const [newTaskTag, setNewTaskTag] = React.useState(DEFAULT_TAG);
  const [newTaskColor, setNewTaskColor] = React.useState(DEFAULT_TASK_COLOR);
  const [newTaskPattern, setNewTaskPattern] = React.useState(DEFAULT_PATTERN);
  const [newTaskDate, setNewTaskDate] = React.useState("");
  const [newTaskTime, setNewTaskTime] = React.useState("");
  const [newTaskPriority, setNewTaskPriority] = React.useState(1);
  const [newTaskStatus, setNewTaskStatus] = React.useState<string>("todo");

  const [editTaskTitle, setEditTaskTitle] = React.useState("");
  const [editTaskDetails, setEditTaskDetails] = React.useState("");
  const [editTaskTag, setEditTaskTag] = React.useState(DEFAULT_TAG);
  const [editTaskColor, setEditTaskColor] = React.useState(DEFAULT_TASK_COLOR);
  const [editTaskPattern, setEditTaskPattern] = React.useState(DEFAULT_PATTERN);
  const [editTaskDate, setEditTaskDate] = React.useState("");
  const [editTaskTime, setEditTaskTime] = React.useState("");
  const [editTaskPriority, setEditTaskPriority] = React.useState(1);
  const [editTaskStatus, setEditTaskStatus] = React.useState<string>("todo");

  const [newEventTitle, setNewEventTitle] = React.useState("");
  const [newEventDescription, setNewEventDescription] = React.useState("");
  const [newEventStartAt, setNewEventStartAt] = React.useState("");
  const [newEventEndAt, setNewEventEndAt] = React.useState("");
  const [newEventColor, setNewEventColor] = React.useState(DEFAULT_EVENT_COLOR);
  const [newEventPattern, setNewEventPattern] = React.useState(DEFAULT_PATTERN);
  const [newEventLocation, setNewEventLocation] = React.useState("");
  const [newEventStatus, setNewEventStatus] =
    React.useState<string>("scheduled");
  const [newEventAllDay, setNewEventAllDay] = React.useState(false);
  const [newEventRecurrence, setNewEventRecurrence] =
    React.useState<string>("none");

  const [editEventTitle, setEditEventTitle] = React.useState("");
  const [editEventDescription, setEditEventDescription] = React.useState("");
  const [editEventStartAt, setEditEventStartAt] = React.useState("");
  const [editEventEndAt, setEditEventEndAt] = React.useState("");
  const [editEventColor, setEditEventColor] =
    React.useState(DEFAULT_EVENT_COLOR);
  const [editEventPattern, setEditEventPattern] = React.useState(DEFAULT_PATTERN);
  const [editEventLocation, setEditEventLocation] = React.useState("");
  const [editEventStatus, setEditEventStatus] =
    React.useState<string>("scheduled");
  const [editEventAllDay, setEditEventAllDay] = React.useState(false);
  const [editEventRecurrence, setEditEventRecurrence] =
    React.useState<string>("none");

  React.useEffect(() => {
    const loadAll = async () => {
      try {
        const [tasksRes, eventsRes] = await Promise.all([
          api.get<ApiTask[]>("/tasks"),
          api.get<ApiEvent[]>("/events"),
        ]);

        const mappedTasks = tasksRes.data.map((task) => {
          const legacy = parseLegacyDescription(task.description);
          const parsedStyles = parseColorAndPattern(task.color, DEFAULT_TASK_COLOR);
          return {
            id: task.id,
            title: task.title,
            details: legacy.details,
            tag: task.tag ?? DEFAULT_TAG,
            color: parsedStyles.color,
            pattern: parsedStyles.pattern,
            dueDate: task.due_date ?? legacy.dueDate,
            dueTime: task.due_time?.slice(0, 5) ?? legacy.dueTime,
            priority: task.priority ?? legacy.priority,
            status: task.status ?? "todo",
            completed: task.completed,
          };
        });

        const mappedEvents = eventsRes.data.map((event) => mapApiEvent(event));

        setTasks(mappedTasks);
        setEvents(mappedEvents);
      } catch (err) {
        console.error("Failed to load tasks/events", err);
      }
    };

    loadAll();
  }, [refreshKey]);

  const addTask = async () => {
    if (
      !newTaskTitle.trim() ||
      !newTaskDate ||
      !newTaskTime ||
      !newTaskPriority
    ) {
      alert("Title, date, time, and priority are required.");
      return;
    }
    try {
      const res = await api.post<ApiTask>("/tasks", {
        title: newTaskTitle.trim(),
        description: newTaskDetails.trim() || null,
        tag: newTaskTag,
        color: encodeColorAndPattern(newTaskColor, newTaskPattern), // Pack it here
        priority: newTaskPriority,
        status: newTaskStatus,
        due_date: newTaskDate,
        due_time: newTaskTime,
      });
      const parsedResStyles = parseColorAndPattern(res.data.color, newTaskColor);
      const newTask: Task = {
        id: res.data.id,
        title: res.data.title,
        details: res.data.description ?? "",
        tag: res.data.tag ?? DEFAULT_TAG,
        color: parsedResStyles.color,
        pattern: parsedResStyles.pattern,
        dueDate: res.data.due_date ?? newTaskDate,
        dueTime: res.data.due_time?.slice(0, 5) ?? newTaskTime,
        priority: res.data.priority ?? newTaskPriority,
        status: res.data.status ?? newTaskStatus,
        completed: res.data.completed,
      };
      setTasks((prev) => [...prev, newTask]);
      triggerRefresh();
    } catch (err) {
      console.error("Failed to create task", err);
      alert("Failed to create task.");
      return;
    }

    setNewTaskTitle("");
    setNewTaskDetails("");
    setNewTaskTag(DEFAULT_TAG);
    setNewTaskColor(DEFAULT_TASK_COLOR);
    setNewTaskPattern(DEFAULT_PATTERN);
    setNewTaskDate("");
    setNewTaskTime("");
    setNewTaskPriority(1);
    setNewTaskStatus("todo");
    setActiveForm(null);
  };

  const deleteTask = async (taskId: number) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      triggerRefresh();
    } catch (err) {
      console.error("Failed to delete task", err);
      alert("Failed to delete task.");
    }
  };

  const startEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditTaskDetails(task.details);
    setEditTaskTag(task.tag);
    setEditTaskColor(task.color);
    setEditTaskPattern(task.pattern);
    setEditTaskDate(task.dueDate);
    setEditTaskTime(task.dueTime);
    setEditTaskPriority(task.priority);
    setEditTaskStatus(task.status);
  };

  const saveEditTask = async (taskId: number) => {
    if (
      !editTaskTitle.trim() ||
      !editTaskDate ||
      !editTaskTime ||
      !editTaskPriority
    ) {
      alert("Title, date, time, and priority are required.");
      return;
    }
    try {
      const res = await api.put<ApiTask>(`/tasks/${taskId}`, {
        title: editTaskTitle.trim(),
        description: editTaskDetails.trim() || null,
        tag: editTaskTag,
        color: encodeColorAndPattern(editTaskColor, editTaskPattern), // Pack it here
        priority: editTaskPriority,
        status: editTaskStatus,
        due_date: editTaskDate,
        due_time: editTaskTime,
      });
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id === taskId) {
            const parsedResStyles = parseColorAndPattern(res.data.color, editTaskColor);
            return {
              ...task,
              title: res.data.title,
              details: res.data.description ?? "",
              tag: res.data.tag ?? editTaskTag,
              color: parsedResStyles.color,
              pattern: parsedResStyles.pattern,
              dueDate: res.data.due_date ?? editTaskDate,
              dueTime: res.data.due_time?.slice(0, 5) ?? editTaskTime,
              priority: res.data.priority ?? editTaskPriority,
              status: res.data.status ?? editTaskStatus,
            };
          }
          return task;
        }),
      );
      setEditingTaskId(null);
      triggerRefresh();
    } catch (err) {
      console.error("Failed to update task", err);
      alert("Failed to update task.");
    }
  };

  const addEvent = async () => {
    if (!newEventTitle.trim() || !newEventStartAt || !newEventEndAt) {
      alert("Event title, start time, and end time are required.");
      return;
    }

    if (new Date(newEventEndAt) <= new Date(newEventStartAt)) {
      alert("Event end time must be after start time.");
      return;
    }

    const conflicts = findEventConflicts(events, newEventStartAt, newEventEndAt);
    const hasConflicts = conflicts.length > 0;
    if (hasConflicts) {
      const approved = window.confirm(
        `This event conflicts with:\n\n${formatConflictMessage(conflicts)}\n\nIt will be saved as pending approval and will not appear on the calendar until approved.`,
      );
      if (!approved) return;
    }

    try {
      const res = await api.post<ApiEvent>("/events", {
        title: newEventTitle.trim(),
        description: newEventDescription.trim() || null,
        start_at: newEventStartAt,
        end_at: newEventEndAt,
        color: encodeColorAndPattern(newEventColor, newEventPattern), // Pack it here
        location: newEventLocation.trim() || null,
        status: hasConflicts ? PENDING_APPROVAL_STATUS : newEventStatus,
        all_day: newEventAllDay,
        recurrence: newEventRecurrence,
      });

      const createdEvent = mapApiEvent(res.data, newEventColor);
      setEvents((prev) => [...prev, createdEvent]);
      if (createdEvent.status === PENDING_APPROVAL_STATUS) {
        alert("Event saved as pending approval. It will not show on the calendar until approved.");
      }
      triggerRefresh();
    } catch (err) {
      console.error("Failed to create event", err);
      alert("Failed to create event.");
      return;
    }

    setNewEventTitle("");
    setNewEventDescription("");
    setNewEventStartAt("");
    setNewEventEndAt("");
    setNewEventColor(DEFAULT_EVENT_COLOR);
    setNewEventPattern(DEFAULT_PATTERN);
    setNewEventLocation("");
    setNewEventStatus("scheduled");
    setNewEventAllDay(false);
    setNewEventRecurrence("none");
    setActiveForm(null);
  };

  const onNewEventStartChange = (value: string) => {
    setNewEventStartAt(value);
    if (newEventEndAt && new Date(newEventEndAt) <= new Date(value)) {
      setNewEventEndAt("");
    }
  };

  const onEditEventStartChange = (value: string) => {
    setEditEventStartAt(value);
    if (editEventEndAt && new Date(editEventEndAt) <= new Date(value)) {
      setEditEventEndAt("");
    }
  };

  const startEditEvent = (event: EventItem) => {
    setEditingEventId(event.id);
    setEditEventTitle(event.title);
    setEditEventDescription(event.description);
    setEditEventStartAt(event.startAt);
    setEditEventEndAt(event.endAt);
    setEditEventColor(event.color);
    setEditEventPattern(event.pattern);
    setEditEventLocation(event.location);
    setEditEventStatus(event.status);
    setEditEventAllDay(event.allDay);
    setEditEventRecurrence(event.recurrence);
  };

  const saveEditEvent = async (eventId: number) => {
    if (!editEventTitle.trim() || !editEventStartAt || !editEventEndAt) {
      alert("Event title, start time, and end time are required.");
      return;
    }

    if (new Date(editEventEndAt) <= new Date(editEventStartAt)) {
      alert("Event end time must be after start time.");
      return;
    }

    const conflicts = findEventConflicts(
      events,
      editEventStartAt,
      editEventEndAt,
      eventId,
    );
    const hasConflicts = conflicts.length > 0;
    const nextStatus = hasConflicts
      ? PENDING_APPROVAL_STATUS
      : editEventStatus;
    if (hasConflicts) {
      const approved = window.confirm(
        `This update conflicts with:\n\n${formatConflictMessage(conflicts)}\n\nThe event will move to pending approval and will not appear on the calendar until approved.`,
      );
      if (!approved) return;
    }

    try {
      const res = await api.put<ApiEvent>(`/events/${eventId}`, {
        title: editEventTitle.trim(),
        description: editEventDescription.trim() || null,
        start_at: editEventStartAt,
        end_at: editEventEndAt,
        color: encodeColorAndPattern(editEventColor, editEventPattern), // Pack it here
        location: editEventLocation.trim() || null,
        status: nextStatus,
        all_day: editEventAllDay,
        recurrence: editEventRecurrence,
      });

      setEvents((prev) =>
        prev.map((event) => {
          if (event.id === eventId) {
            return mapApiEvent(res.data, editEventColor);
          }
          return event;
        }),
      );
      if ((res.data.status ?? "scheduled") === PENDING_APPROVAL_STATUS) {
        alert("Event moved to pending approval. It will not show on the calendar until approved.");
      }
      setEditingEventId(null);
      triggerRefresh();
    } catch (err) {
      console.error("Failed to update event", err);
      alert("Failed to update event.");
    }
  };

  const deleteEvent = async (eventId: number) => {
    try {
      await api.delete(`/events/${eventId}`);
      setEvents((prev) => prev.filter((event) => event.id !== eventId));
      triggerRefresh();
    } catch (err) {
      console.error("Failed to delete event", err);
      alert("Failed to delete event.");
    }
  };

  const approveEvent = async (event: EventItem) => {
    const conflicts = findEventConflicts(
      events,
      event.startAt,
      event.endAt,
      event.id,
    );
    if (conflicts.length > 0) {
      const approved = window.confirm(
        `Approving this event will show it on the calendar even though it conflicts with:\n\n${formatConflictMessage(conflicts)}`,
      );
      if (!approved) return;
    }

    try {
      const res = await api.put<ApiEvent>(`/events/${event.id}`, {
        status: "scheduled",
      });
      setEvents((prev) =>
        prev.map((item) =>
          item.id === event.id ? mapApiEvent(res.data, event.color) : item,
        ),
      );
      triggerRefresh();
    } catch (err) {
      console.error("Failed to approve event", err);
      alert("Failed to approve event.");
    }
  };

  const visibleTasks = tasks
    .filter((task) => !task.completed)
    .filter((task) => {
      const d = parseTaskDate(task.dueDate, task.dueTime);
      if (!d) return rangeFilter === "all";
      return isWithinRange(d, rangeFilter);
    });

  const visibleEvents = events.filter((event) => {
    const d = parseEventDate(event.startAt);
    if (!d) return rangeFilter === "all";
    return isWithinRange(d, rangeFilter);
  });

  const taskGroups = groupByDate(visibleTasks, (t) =>
    parseTaskDate(t.dueDate, t.dueTime),
  );
  const eventGroups = groupByDate(visibleEvents, (e) =>
    parseEventDate(e.startAt),
  );

  return (
    <div className="taskPanelContainer">
      {!hideBackButton && <BackButton />}
      <div className="taskPanel">
        <h3 className="panelTitle">Tasks & Events</h3>
        <div className="panelSwitch">
          <button
            className={view === "tasks" ? "switchBtn active" : "switchBtn"}
            onClick={() => setView("tasks")}
          >
            Tasks
          </button>
          <button
            className={view === "events" ? "switchBtn active" : "switchBtn"}
            onClick={() => setView("events")}
          >
            Events
          </button>
          <select
            className="rangeSelect"
            value={rangeFilter}
            onChange={(e) => setRangeFilter(e.target.value as RangeFilter)}
            aria-label="Filter by date range"
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {view === "tasks" ? (
          <div className="taskList">
            {taskGroups.length === 0 && (
              <p className="emptyRange">No tasks in this range.</p>
            )}
            {taskGroups.map((group) => (
              <div key={group.key} className="dateGroup">
                <div className="dateHeader">
                  {group.date ? formatDateHeader(group.date) : "No due date"}
                </div>
                <ul className="dateGroupList">
                  {group.items.map((task) => (
                <li
                  key={task.id}
                  className="taskItem"
                >
                  <div className="taskItemPattern" style={getPatternStyle(task.color, task.pattern)} />
                  {editingTaskId === task.id ? (
                    <div className="taskEditor">
                      <input
                        type="text"
                        value={editTaskTitle}
                        onChange={(e) => setEditTaskTitle(e.target.value)}
                        placeholder="Task title"
                      />
                      <textarea
                        value={editTaskDetails}
                        onChange={(e) => setEditTaskDetails(e.target.value)}
                        placeholder="Details"
                      />
                      <select
                        value={editTaskTag}
                        onChange={(e) => {
                          const nextTag = e.target.value;
                          setEditTaskTag(nextTag);
                          setEditTaskColor(
                            TAG_COLORS[nextTag] ?? DEFAULT_TASK_COLOR,
                          );
                        }}
                      >
                        {Object.keys(TAG_COLORS).map((tag) => (
                          <option key={tag} value={tag}>
                            {tag}
                          </option>
                        ))}
                      </select>
                      <div className="colorPatternRow">
                        <input
                          type="color"
                          value={editTaskColor}
                          onChange={(e) => setEditTaskColor(e.target.value)}
                        />
                        <select value={editTaskPattern} onChange={(e) => setEditTaskPattern(e.target.value)}>
                            {PATTERN_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                      </div>
                      <input
                        type="date"
                        value={editTaskDate}
                        onChange={(e) => setEditTaskDate(e.target.value)}
                      />
                      <input
                        type="time"
                        value={editTaskTime}
                        onChange={(e) => setEditTaskTime(e.target.value)}
                      />
                      <input
                        type="number"
                        value={editTaskPriority}
                        onChange={(e) =>
                          setEditTaskPriority(Number(e.target.value))
                        }
                        min={1}
                        max={10}
                      />
                      <select
                        value={editTaskStatus}
                        onChange={(e) => setEditTaskStatus(e.target.value)}
                      >
                        {TASK_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <button onClick={() => saveEditTask(task.id)}>
                        Save
                      </button>
                      <button onClick={() => setEditingTaskId(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="taskView">
                      <div className="itemHeader">
                        <strong>{task.title}</strong>
                        <span
                          className="taskTag"
                          style={{ backgroundColor: task.color }}
                        >
                          {task.tag}
                        </span>
                        {task.dueTime && (
                          <span className="timeBadge">
                            {formatDueTime(task.dueTime)}
                          </span>
                        )}
                      </div>
                      {task.details && (
                        <>
                          Details: {task.details}
                          <br />
                        </>
                      )}
                      Priority: {task.priority}
                      <br />
                      Status: {task.status}
                      <br />
                      <button onClick={() => startEditTask(task)}>Edit</button>
                      <button onClick={() => deleteTask(task.id)}>
                        Delete
                      </button>
                    </div>
                  )}
                </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="taskList">
            {eventGroups.length === 0 && (
              <p className="emptyRange">No events in this range.</p>
            )}
            {eventGroups.map((group) => (
              <div key={group.key} className="dateGroup">
                <div className="dateHeader">
                  {group.date ? formatDateHeader(group.date) : "No date"}
                </div>
                <ul className="dateGroupList">
                  {group.items.map((event) => {
                    const eventConflicts =
                      event.status === PENDING_APPROVAL_STATUS
                        ? findEventConflicts(
                            events,
                            event.startAt,
                            event.endAt,
                            event.id,
                          )
                        : [];
                    return (
              <li
                key={event.id}
                className={`taskItem ${event.status === PENDING_APPROVAL_STATUS ? "pendingApprovalItem" : ""}`}
              >
                <div className="taskItemPattern" style={getPatternStyle(event.color, event.pattern)} />
                {editingEventId === event.id ? (
                  <div className="taskEditor">
                    <input
                      type="text"
                      value={editEventTitle}
                      onChange={(e) => setEditEventTitle(e.target.value)}
                      placeholder="Event title"
                    />
                    <textarea
                      value={editEventDescription}
                      onChange={(e) => setEditEventDescription(e.target.value)}
                      placeholder="Description"
                    />
                    <input
                      type="datetime-local"
                      value={editEventStartAt}
                      onChange={(e) => onEditEventStartChange(e.target.value)}
                    />
                    <input
                      type="datetime-local"
                      value={editEventEndAt}
                      onChange={(e) => setEditEventEndAt(e.target.value)}
                      min={editEventStartAt || undefined}
                      disabled={!editEventStartAt}
                    />
                    <div className="colorPatternRow">
                      <input
                        type="color"
                        value={editEventColor}
                        onChange={(e) => setEditEventColor(e.target.value)}
                      />
                      <select value={editEventPattern} onChange={(e) => setEditEventPattern(e.target.value)}>
                          {PATTERN_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                      </select>
                    </div>
                    <input
                      type="text"
                      value={editEventLocation}
                      onChange={(e) => setEditEventLocation(e.target.value)}
                      placeholder="Location"
                    />
                    <select
                      value={editEventStatus}
                      onChange={(e) => setEditEventStatus(e.target.value)}
                    >
                      {EVENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <label>
                      <input
                        type="checkbox"
                        checked={editEventAllDay}
                        onChange={(e) => setEditEventAllDay(e.target.checked)}
                      />
                        All day
                    </label>
                    <select
                      value={editEventRecurrence}
                      onChange={(e) => setEditEventRecurrence(e.target.value)}
                    >
                      {EVENT_RECURRENCES.map((recurrence) => (
                        <option key={recurrence} value={recurrence}>
                          {recurrence}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => saveEditEvent(event.id)}>
                      Save
                    </button>
                    <button onClick={() => setEditingEventId(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="taskView">
                    <div className="itemHeader">
                      <strong>{event.title}</strong>
                      <span
                        className="taskTag"
                        style={{ backgroundColor: event.color }}
                      >
                        {event.status === PENDING_APPROVAL_STATUS ? "Pending" : "Event"}
                      </span>
                      <span className="timeBadge">
                        {event.allDay
                          ? "All day"
                          : `${formatTimeLabel(event.startAt)} – ${formatTimeLabel(event.endAt)}`}
                      </span>
                    </div>
                    {event.description && (
                      <>
                        Description: {event.description}
                        <br />
                      </>
                    )}
                    {event.location && (
                      <>
                        Location: {event.location}
                        <br />
                      </>
                    )}
                    Status: {event.status}
                    <br />
                    Recurrence: {event.recurrence}
                    <br />
                    {event.status === PENDING_APPROVAL_STATUS && (
                      <div className="conflictNotice">
                        <strong>Needs approval before calendar display.</strong>
                        {eventConflicts.length > 0 && (
                          <span>
                            Conflicts with: {eventConflicts.map((conflict) => conflict.title).join(", ")}
                          </span>
                        )}
                      </div>
                    )}
                    {event.status === PENDING_APPROVAL_STATUS && (
                      <button onClick={() => approveEvent(event)}>Approve</button>
                    )}
                    <button onClick={() => startEditEvent(event)}>Edit</button>
                    <button onClick={() => deleteEvent(event.id)}>
                      Delete
                    </button>
                  </div>
                )}
              </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="panelActions">
          <div className="createNewWrapper" ref={createMenuRef}>
            <button
              className="addTask"
              onClick={() => setShowCreateMenu((prev) => !prev)}
            >
              + Create New ▾
            </button>
            {showCreateMenu && (
              <div className="createNewMenu">
                <button
                  onClick={() => {
                    setActiveForm("task");
                    setShowCreateMenu(false);
                  }}
                >
                  Task
                </button>
                <button
                  onClick={() => {
                    setActiveForm("event");
                    setShowCreateMenu(false);
                  }}
                >
                  Event
                </button>
              </div>
            )}
          </div>
        </div>

        {activeForm === "task" && (
          <div className="popup">
            <h3>Add Task</h3>
            <input
              type="text"
              placeholder="Task title"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
            <textarea
              placeholder="Task details"
              value={newTaskDetails}
              onChange={(e) => setNewTaskDetails(e.target.value)}
            />
            <select
              value={newTaskTag}
              onChange={(e) => {
                const nextTag = e.target.value;
                setNewTaskTag(nextTag);
                setNewTaskColor(TAG_COLORS[nextTag] ?? DEFAULT_TASK_COLOR);
              }}
            >
              {Object.keys(TAG_COLORS).map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            <div className="colorPatternRow">
              <input
                type="color"
                value={newTaskColor}
                onChange={(e) => setNewTaskColor(e.target.value)}
              />
              <select value={newTaskPattern} onChange={(e) => setNewTaskPattern(e.target.value)}>
                  {PATTERN_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
              </select>
            </div>
            <input
              type="date"
              value={newTaskDate}
              onChange={(e) => setNewTaskDate(e.target.value)}
            />
            <input
              type="time"
              value={newTaskTime}
              onChange={(e) => setNewTaskTime(e.target.value)}
            />
            <input
              type="number"
              placeholder="Priority (1-10)"
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(Number(e.target.value))}
              min={1}
              max={10}
            />
            <select
              value={newTaskStatus}
              onChange={(e) => setNewTaskStatus(e.target.value)}
            >
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button onClick={addTask}>Add Task</button>
            <button onClick={() => setActiveForm(null)}>Cancel</button>
          </div>
        )}

        {activeForm === "event" && (
          <div className="popup">
            <h3>Add Event</h3>
            <input
              type="text"
              placeholder="Event title"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
            />
            <textarea
              placeholder="Event description"
              value={newEventDescription}
              onChange={(e) => setNewEventDescription(e.target.value)}
            />
            <input
              type="datetime-local"
              value={newEventStartAt}
              onChange={(e) => onNewEventStartChange(e.target.value)}
            />
            <input
              type="datetime-local"
              value={newEventEndAt}
              onChange={(e) => setNewEventEndAt(e.target.value)}
              min={newEventStartAt || undefined}
              disabled={!newEventStartAt}
            />
            <div className="colorPatternRow">
              <input
                type="color"
                value={newEventColor}
                onChange={(e) => setNewEventColor(e.target.value)}
              />
              <select value={newEventPattern} onChange={(e) => setNewEventPattern(e.target.value)}>
                  {PATTERN_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
              </select>
            </div>
            <input
              type="text"
              placeholder="Location"
              value={newEventLocation}
              onChange={(e) => setNewEventLocation(e.target.value)}
            />
            <select
              value={newEventStatus}
              onChange={(e) => setNewEventStatus(e.target.value)}
            >
              {EVENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <label>
              <input
                type="checkbox"
                checked={newEventAllDay}
                onChange={(e) => setNewEventAllDay(e.target.checked)}
              />
              All day
            </label>
            <select
              value={newEventRecurrence}
              onChange={(e) => setNewEventRecurrence(e.target.value)}
            >
              {EVENT_RECURRENCES.map((recurrence) => (
                <option key={recurrence} value={recurrence}>
                  {recurrence}
                </option>
              ))}
            </select>
            <button onClick={addEvent}>Add Event</button>
            <button onClick={() => setActiveForm(null)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskPanel;
