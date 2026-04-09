import React from "react";
import "./taskpanel.css";
import api from "../../services/api";
import BackButton from "../BackButton";
//currently there is no mcp integration with task creations all manual because the database doesnt currently support tasks
//task making by alex, editing +deletion by bini
//basically making a task its own object ish

interface Task {
    id: number;
    title: string;
    details: string;
    tag: string;
    color: string;
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
    color?: string | null;
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
    color?: string | null;
    location?: string | null;
    status?: string | null;
    all_day?: boolean | null;
    recurrence?: string | null;
    user_id: number;
    created_at: string;
    updated_at: string;
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
const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
const EVENT_STATUSES = ["scheduled", "ongoing", "completed", "canceled"] as const;
const EVENT_RECURRENCES = ["none", "daily", "weekly", "monthly"] as const;

const normalizeHexColor = (value?: string | null, fallback = DEFAULT_TASK_COLOR) => {
    if (!value) return fallback;
    const color = value.trim();
    return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : fallback;
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

const TaskPanel = () => {
    const [view, setView] = React.useState<"tasks" | "events">("tasks");
    const [activeForm, setActiveForm] = React.useState<"task" | "event" | null>(null);

    const [tasks, setTasks] = React.useState<Task[]>([]);
    const [events, setEvents] = React.useState<EventItem[]>([]);

    const [editingTaskId, setEditingTaskId] = React.useState<number | null>(null);
    const [editingEventId, setEditingEventId] = React.useState<number | null>(null);

    const [newTaskTitle, setNewTaskTitle] = React.useState("");
    const [newTaskDetails, setNewTaskDetails] = React.useState("");
    const [newTaskTag, setNewTaskTag] = React.useState(DEFAULT_TAG);
    const [newTaskColor, setNewTaskColor] = React.useState(DEFAULT_TASK_COLOR);
    const [newTaskDate, setNewTaskDate] = React.useState("");
    const [newTaskTime, setNewTaskTime] = React.useState("");
    const [newTaskPriority, setNewTaskPriority] = React.useState(1);
    const [newTaskStatus, setNewTaskStatus] = React.useState<string>("todo");

    const [editTaskTitle, setEditTaskTitle] = React.useState("");
    const [editTaskDetails, setEditTaskDetails] = React.useState("");
    const [editTaskTag, setEditTaskTag] = React.useState(DEFAULT_TAG);
    const [editTaskColor, setEditTaskColor] = React.useState(DEFAULT_TASK_COLOR);
    const [editTaskDate, setEditTaskDate] = React.useState("");
    const [editTaskTime, setEditTaskTime] = React.useState("");
    const [editTaskPriority, setEditTaskPriority] = React.useState(1);
    const [editTaskStatus, setEditTaskStatus] = React.useState<string>("todo");

    const [newEventTitle, setNewEventTitle] = React.useState("");
    const [newEventDescription, setNewEventDescription] = React.useState("");
    const [newEventStartAt, setNewEventStartAt] = React.useState("");
    const [newEventEndAt, setNewEventEndAt] = React.useState("");
    const [newEventColor, setNewEventColor] = React.useState(DEFAULT_EVENT_COLOR);
    const [newEventLocation, setNewEventLocation] = React.useState("");
    const [newEventStatus, setNewEventStatus] = React.useState<string>("scheduled");
    const [newEventAllDay, setNewEventAllDay] = React.useState(false);
    const [newEventRecurrence, setNewEventRecurrence] = React.useState<string>("none");

    const [editEventTitle, setEditEventTitle] = React.useState("");
    const [editEventDescription, setEditEventDescription] = React.useState("");
    const [editEventStartAt, setEditEventStartAt] = React.useState("");
    const [editEventEndAt, setEditEventEndAt] = React.useState("");
    const [editEventColor, setEditEventColor] = React.useState(DEFAULT_EVENT_COLOR);
    const [editEventLocation, setEditEventLocation] = React.useState("");
    const [editEventStatus, setEditEventStatus] = React.useState<string>("scheduled");
    const [editEventAllDay, setEditEventAllDay] = React.useState(false);
    const [editEventRecurrence, setEditEventRecurrence] = React.useState<string>("none");

    React.useEffect(() => {
        const loadAll = async () => {
            try {
                const [tasksRes, eventsRes] = await Promise.all([
                    api.get<ApiTask[]>("/tasks/"),
                    api.get<ApiEvent[]>("/events/"),
                ]);

                const mappedTasks = tasksRes.data.map((task) => {
                    const legacy = parseLegacyDescription(task.description);
                    return {
                        id: task.id,
                        title: task.title,
                        details: legacy.details,
                        tag: task.tag ?? DEFAULT_TAG,
                        color: normalizeHexColor(task.color),
                        dueDate: task.due_date ?? legacy.dueDate,
                        dueTime: task.due_time?.slice(0, 5) ?? legacy.dueTime,
                        priority: task.priority ?? legacy.priority,
                        status: task.status ?? "todo",
                        completed: task.completed,
                    };
                });

                const mappedEvents = eventsRes.data.map((event) => ({
                    id: event.id,
                    title: event.title,
                    description: event.description ?? "",
                    startAt: formatDateTimeLocal(event.start_at),
                    endAt: formatDateTimeLocal(event.end_at),
                    color: normalizeHexColor(event.color, DEFAULT_EVENT_COLOR),
                    location: event.location ?? "",
                    status: event.status ?? "scheduled",
                    allDay: Boolean(event.all_day),
                    recurrence: event.recurrence ?? "none",
                }));

                setTasks(mappedTasks);
                setEvents(mappedEvents);
            } catch (err) {
                console.error("Failed to load tasks/events", err);
            }
        };

        loadAll();
    }, []);

    const addTask = async () => {
        if (!newTaskTitle.trim() || !newTaskDate || !newTaskTime || !newTaskPriority) {
            alert("Title, date, time, and priority are required.");
            return;
        }
        try {
            const res = await api.post<ApiTask>("/tasks/", {
                title: newTaskTitle.trim(),
                description: newTaskDetails.trim() || null,
                tag: newTaskTag,
                color: normalizeHexColor(newTaskColor),
                priority: newTaskPriority,
                status: newTaskStatus,
                due_date: newTaskDate,
                due_time: newTaskTime,
            });
            const newTask: Task = {
                id: res.data.id,
                title: res.data.title,
                details: res.data.description ?? "",
                tag: res.data.tag ?? DEFAULT_TAG,
                color: normalizeHexColor(res.data.color),
                dueDate: res.data.due_date ?? newTaskDate,
                dueTime: res.data.due_time?.slice(0, 5) ?? newTaskTime,
                priority: res.data.priority ?? newTaskPriority,
                status: res.data.status ?? newTaskStatus,
                completed: res.data.completed,
            };
            setTasks((prev) => [...prev, newTask]);
        } catch (err) {
            console.error("Failed to create task", err);
            alert("Failed to create task.");
            return;
        }

        setNewTaskTitle("");
        setNewTaskDetails("");
        setNewTaskTag(DEFAULT_TAG);
        setNewTaskColor(DEFAULT_TASK_COLOR);
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
        setEditTaskDate(task.dueDate);
        setEditTaskTime(task.dueTime);
        setEditTaskPriority(task.priority);
        setEditTaskStatus(task.status);
    };

    const saveEditTask = async (taskId: number) => {
        if (!editTaskTitle.trim() || !editTaskDate || !editTaskTime || !editTaskPriority) {
            alert("Title, date, time, and priority are required.");
            return;
        }
        try {
            const res = await api.put<ApiTask>(`/tasks/${taskId}`, {
                title: editTaskTitle.trim(),
                description: editTaskDetails.trim() || null,
                tag: editTaskTag,
                color: normalizeHexColor(editTaskColor),
                priority: editTaskPriority,
                status: editTaskStatus,
                due_date: editTaskDate,
                due_time: editTaskTime,
            });
            setTasks((prev) =>
                prev.map((task) =>
                    task.id === taskId
                        ? {
                              ...task,
                              title: res.data.title,
                              details: res.data.description ?? "",
                              tag: res.data.tag ?? editTaskTag,
                              color: normalizeHexColor(res.data.color ?? editTaskColor),
                              dueDate: res.data.due_date ?? editTaskDate,
                              dueTime: res.data.due_time?.slice(0, 5) ?? editTaskTime,
                              priority: res.data.priority ?? editTaskPriority,
                              status: res.data.status ?? editTaskStatus,
                          }
                        : task,
                ),
            );
            setEditingTaskId(null);
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

        try {
            const res = await api.post<ApiEvent>("/events/", {
                title: newEventTitle.trim(),
                description: newEventDescription.trim() || null,
                start_at: newEventStartAt,
                end_at: newEventEndAt,
                color: normalizeHexColor(newEventColor, DEFAULT_EVENT_COLOR),
                location: newEventLocation.trim() || null,
                status: newEventStatus,
                all_day: newEventAllDay,
                recurrence: newEventRecurrence,
            });

            setEvents((prev) => [
                ...prev,
                {
                    id: res.data.id,
                    title: res.data.title,
                    description: res.data.description ?? "",
                    startAt: formatDateTimeLocal(res.data.start_at),
                    endAt: formatDateTimeLocal(res.data.end_at),
                    color: normalizeHexColor(res.data.color, DEFAULT_EVENT_COLOR),
                    location: res.data.location ?? "",
                    status: res.data.status ?? "scheduled",
                    allDay: Boolean(res.data.all_day),
                    recurrence: res.data.recurrence ?? "none",
                },
            ]);
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

        try {
            const res = await api.put<ApiEvent>(`/events/${eventId}`, {
                title: editEventTitle.trim(),
                description: editEventDescription.trim() || null,
                start_at: editEventStartAt,
                end_at: editEventEndAt,
                color: normalizeHexColor(editEventColor, DEFAULT_EVENT_COLOR),
                location: editEventLocation.trim() || null,
                status: editEventStatus,
                all_day: editEventAllDay,
                recurrence: editEventRecurrence,
            });

            setEvents((prev) =>
                prev.map((event) =>
                    event.id === eventId
                        ? {
                              ...event,
                              title: res.data.title,
                              description: res.data.description ?? "",
                              startAt: formatDateTimeLocal(res.data.start_at),
                              endAt: formatDateTimeLocal(res.data.end_at),
                              color: normalizeHexColor(res.data.color, DEFAULT_EVENT_COLOR),
                              location: res.data.location ?? "",
                              status: res.data.status ?? "scheduled",
                              allDay: Boolean(res.data.all_day),
                              recurrence: res.data.recurrence ?? "none",
                          }
                        : event,
                ),
            );
            setEditingEventId(null);
        } catch (err) {
            console.error("Failed to update event", err);
            alert("Failed to update event.");
        }
    };

    const deleteEvent = async (eventId: number) => {
        try {
            await api.delete(`/events/${eventId}`);
            setEvents((prev) => prev.filter((event) => event.id !== eventId));
        } catch (err) {
            console.error("Failed to delete event", err);
            alert("Failed to delete event.");
        }
    };

    return (
        <div className="taskPanelContainer"> 
            <BackButton />
            <div className="taskPanel">
                <h3 className="panelTitle">Tasks & Events</h3>
                <div className="panelSwitch">
                    <button className={view === "tasks" ? "switchBtn active" : "switchBtn"} onClick={() => setView("tasks")}>
                        Tasks
                    </button>
                    <button className={view === "events" ? "switchBtn active" : "switchBtn"} onClick={() => setView("events")}>
                        Events
                    </button>
                </div>

                {view === "tasks" ? (
                    <ul className="taskList">
                        {tasks.map((task) => (
                            <li key={task.id} className="taskItem" style={{ borderLeftColor: task.color }}>
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
                                                setEditTaskColor(TAG_COLORS[nextTag] ?? DEFAULT_TASK_COLOR);
                                            }}
                                        >
                                            {Object.keys(TAG_COLORS).map((tag) => (
                                                <option key={tag} value={tag}>
                                                    {tag}
                                                </option>
                                            ))}
                                        </select>
                                        <input type="color" value={editTaskColor} onChange={(e) => setEditTaskColor(e.target.value)} />
                                        <input type="date" value={editTaskDate} onChange={(e) => setEditTaskDate(e.target.value)} />
                                        <input type="time" value={editTaskTime} onChange={(e) => setEditTaskTime(e.target.value)} />
                                        <input
                                            type="number"
                                            value={editTaskPriority}
                                            onChange={(e) => setEditTaskPriority(Number(e.target.value))}
                                            min={1}
                                            max={10}
                                        />
                                        <select value={editTaskStatus} onChange={(e) => setEditTaskStatus(e.target.value)}>
                                            {TASK_STATUSES.map((status) => (
                                                <option key={status} value={status}>
                                                    {status}
                                                </option>
                                            ))}
                                        </select>
                                        <button onClick={() => saveEditTask(task.id)}>Save</button>
                                        <button onClick={() => setEditingTaskId(null)}>Cancel</button>
                                    </div>
                                ) : (
                                    <div className="taskView">
                                        <strong>{task.title}</strong>
                                        <span className="taskTag" style={{ backgroundColor: task.color }}>
                                            {task.tag}
                                        </span>
                                        <br />
                                        {task.details && (
                                            <>
                                                Details: {task.details}
                                                <br />
                                            </>
                                        )}
                                        <br />
                                        Deadline: {task.dueDate} @ {task.dueTime}
                                        <br />
                                        Priority: {task.priority}
                                        <br />
                                        Status: {task.status}
                                        <br />
                                        <button onClick={() => startEditTask(task)}>Edit</button>
                                        <button onClick={() => deleteTask(task.id)}>Delete</button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <ul className="taskList">
                        {events.map((event) => (
                            <li key={event.id} className="taskItem" style={{ borderLeftColor: event.color }}>
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
                                        <input type="color" value={editEventColor} onChange={(e) => setEditEventColor(e.target.value)} />
                                        <input
                                            type="text"
                                            value={editEventLocation}
                                            onChange={(e) => setEditEventLocation(e.target.value)}
                                            placeholder="Location"
                                        />
                                        <select value={editEventStatus} onChange={(e) => setEditEventStatus(e.target.value)}>
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
                                        <select value={editEventRecurrence} onChange={(e) => setEditEventRecurrence(e.target.value)}>
                                            {EVENT_RECURRENCES.map((recurrence) => (
                                                <option key={recurrence} value={recurrence}>
                                                    {recurrence}
                                                </option>
                                            ))}
                                        </select>
                                        <button onClick={() => saveEditEvent(event.id)}>Save</button>
                                        <button onClick={() => setEditingEventId(null)}>Cancel</button>
                                    </div>
                                ) : (
                                    <div className="taskView">
                                        <strong>{event.title}</strong>
                                        <span className="taskTag" style={{ backgroundColor: event.color }}>
                                            Event
                                        </span>
                                        <br />
                                        {event.description && (
                                            <>
                                                Description: {event.description}
                                                <br />
                                            </>
                                        )}
                                        <br />
                                        Start: {formatDateTimeLabel(event.startAt)}
                                        <br />
                                        End: {formatDateTimeLabel(event.endAt)}
                                        <br />
                                        {event.location && (
                                            <>
                                                Location: {event.location}
                                                <br />
                                            </>
                                        )}
                                        Status: {event.status}
                                        <br />
                                        All day: {event.allDay ? "Yes" : "No"}
                                        <br />
                                        Recurrence: {event.recurrence}
                                        <br />
                                        <button onClick={() => startEditEvent(event)}>Edit</button>
                                        <button onClick={() => deleteEvent(event.id)}>Delete</button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}

                <div className="panelActions">
                    <button className="addTask" onClick={() => setActiveForm("task")}>
                        Add Task
                    </button>
                    <button className="addTask" onClick={() => setActiveForm("event")}>
                        Add Event
                    </button>
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
                        <input type="color" value={newTaskColor} onChange={(e) => setNewTaskColor(e.target.value)} />
                        <input type="date" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} />
                        <input type="time" value={newTaskTime} onChange={(e) => setNewTaskTime(e.target.value)} />
                        <input
                            type="number"
                            placeholder="Priority (1-10)"
                            value={newTaskPriority}
                            onChange={(e) => setNewTaskPriority(Number(e.target.value))}
                            min={1}
                            max={10}
                        />
                        <select value={newTaskStatus} onChange={(e) => setNewTaskStatus(e.target.value)}>
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
                        <input type="color" value={newEventColor} onChange={(e) => setNewEventColor(e.target.value)} />
                        <input
                            type="text"
                            placeholder="Location"
                            value={newEventLocation}
                            onChange={(e) => setNewEventLocation(e.target.value)}
                        />
                        <select value={newEventStatus} onChange={(e) => setNewEventStatus(e.target.value)}>
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
                        <select value={newEventRecurrence} onChange={(e) => setNewEventRecurrence(e.target.value)}>
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