import React, { useState } from "react";
import { useCreateModal } from "../../contexts/CreateModalContext";
import { useTaskEvents } from "../../contexts/TaskEventContext";
import api from "../../services/api";
import "./createmodal.css";

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
const EVENT_STATUSES = ["scheduled", "ongoing", "completed", "canceled"] as const;
const EVENT_RECURRENCES = ["none", "daily", "weekly", "monthly"] as const;
const PATTERN_OPTIONS = [
  { value: "solid", label: "Solid Color" },
  { value: "diagonal-right", label: "Diagonal Stripes (/)" },
  { value: "diagonal-left", label: "Diagonal Stripes (\\)" },
  { value: "vertical", label: "Vertical Lines" },
  { value: "horizontal", label: "Horizontal Lines" },
];

const normalizeHexColor = (value?: string | null, fallback = DEFAULT_TASK_COLOR) => {
  if (!value) return fallback;
  const color = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : fallback;
};

const encodeColorAndPattern = (color: string, pattern: string) => {
  return `${pattern}:${normalizeHexColor(color)}`;
};

const CreateModal: React.FC = () => {
  const { activeCreate, closeCreate } = useCreateModal();
  const { triggerRefresh } = useTaskEvents();

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDetails, setTaskDetails] = useState("");
  const [taskTag, setTaskTag] = useState(DEFAULT_TAG);
  const [taskColor, setTaskColor] = useState(DEFAULT_TASK_COLOR);
  const [taskPattern, setTaskPattern] = useState(DEFAULT_PATTERN);
  const [taskDate, setTaskDate] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [taskPriority, setTaskPriority] = useState(1);
  const [taskStatus, setTaskStatus] = useState<string>("todo");

  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStartAt, setEventStartAt] = useState("");
  const [eventEndAt, setEventEndAt] = useState("");
  const [eventColor, setEventColor] = useState(DEFAULT_EVENT_COLOR);
  const [eventPattern, setEventPattern] = useState(DEFAULT_PATTERN);
  const [eventLocation, setEventLocation] = useState("");
  const [eventStatus, setEventStatus] = useState<string>("scheduled");
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventRecurrence, setEventRecurrence] = useState<string>("none");

  if (!activeCreate) return null;

  const resetTaskForm = () => {
    setTaskTitle("");
    setTaskDetails("");
    setTaskTag(DEFAULT_TAG);
    setTaskColor(DEFAULT_TASK_COLOR);
    setTaskPattern(DEFAULT_PATTERN);
    setTaskDate("");
    setTaskTime("");
    setTaskPriority(1);
    setTaskStatus("todo");
  };

  const resetEventForm = () => {
    setEventTitle("");
    setEventDescription("");
    setEventStartAt("");
    setEventEndAt("");
    setEventColor(DEFAULT_EVENT_COLOR);
    setEventPattern(DEFAULT_PATTERN);
    setEventLocation("");
    setEventStatus("scheduled");
    setEventAllDay(false);
    setEventRecurrence("none");
  };

  const handleClose = () => {
    resetTaskForm();
    resetEventForm();
    closeCreate();
  };

  const addTask = async () => {
    if (!taskTitle.trim() || !taskDate || !taskTime || !taskPriority) {
      alert("Title, date, time, and priority are required.");
      return;
    }
    try {
      await api.post("/tasks", {
        title: taskTitle.trim(),
        description: taskDetails.trim() || null,
        tag: taskTag,
        color: encodeColorAndPattern(taskColor, taskPattern),
        priority: taskPriority,
        status: taskStatus,
        due_date: taskDate,
        due_time: taskTime,
      });
      triggerRefresh();
      resetTaskForm();
      closeCreate();
    } catch (err) {
      console.error("Failed to create task", err);
      alert("Failed to create task.");
    }
  };

  const addEvent = async () => {
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
        color: encodeColorAndPattern(eventColor, eventPattern),
        location: eventLocation.trim() || null,
        status: eventStatus,
        all_day: eventAllDay,
        recurrence: eventRecurrence,
      });
      triggerRefresh();
      resetEventForm();
      closeCreate();
    } catch (err) {
      console.error("Failed to create event", err);
      alert("Failed to create event.");
    }
  };

  const onEventStartChange = (value: string) => {
    setEventStartAt(value);
    if (eventEndAt && new Date(eventEndAt) <= new Date(value)) {
      setEventEndAt("");
    }
  };

  return (
    <div className="createModalOverlay" onClick={handleClose}>
      <div className="createModalContent" onClick={(e) => e.stopPropagation()}>
        {activeCreate === "task" && (
          <>
            <h3>Add Task</h3>
            <input type="text" placeholder="Task title" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
            <textarea placeholder="Task details" value={taskDetails} onChange={(e) => setTaskDetails(e.target.value)} />
            <select value={taskTag} onChange={(e) => { const t = e.target.value; setTaskTag(t); setTaskColor(TAG_COLORS[t] ?? DEFAULT_TASK_COLOR); }}>
              {Object.keys(TAG_COLORS).map((tag) => (<option key={tag} value={tag}>{tag}</option>))}
            </select>
            <div className="colorPatternRow">
              <input type="color" value={taskColor} onChange={(e) => setTaskColor(e.target.value)} />
              <select value={taskPattern} onChange={(e) => setTaskPattern(e.target.value)}>
                {PATTERN_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
              </select>
            </div>
            <input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} />
            <input type="time" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} />
            <input type="number" placeholder="Priority (1-10)" value={taskPriority} onChange={(e) => setTaskPriority(Number(e.target.value))} min={1} max={10} />
            <select value={taskStatus} onChange={(e) => setTaskStatus(e.target.value)}>
              {TASK_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
            <div className="createModalActions">
              <button className="createModalSubmit" onClick={addTask}>Add Task</button>
              <button className="createModalCancel" onClick={handleClose}>Cancel</button>
            </div>
          </>
        )}

        {activeCreate === "event" && (
          <>
            <h3>Add Event</h3>
            <input type="text" placeholder="Event title" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} />
            <textarea placeholder="Event description" value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} />
            <input type="datetime-local" value={eventStartAt} onChange={(e) => onEventStartChange(e.target.value)} />
            <input type="datetime-local" value={eventEndAt} onChange={(e) => setEventEndAt(e.target.value)} min={eventStartAt || undefined} disabled={!eventStartAt} />
            <div className="colorPatternRow">
              <input type="color" value={eventColor} onChange={(e) => setEventColor(e.target.value)} />
              <select value={eventPattern} onChange={(e) => setEventPattern(e.target.value)}>
                {PATTERN_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
              </select>
            </div>
            <input type="text" placeholder="Location" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} />
            <select value={eventStatus} onChange={(e) => setEventStatus(e.target.value)}>
              {EVENT_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
            <label className="createModalCheckbox">
              <input type="checkbox" checked={eventAllDay} onChange={(e) => setEventAllDay(e.target.checked)} />
              All day
            </label>
            <select value={eventRecurrence} onChange={(e) => setEventRecurrence(e.target.value)}>
              {EVENT_RECURRENCES.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
            <div className="createModalActions">
              <button className="createModalSubmit" onClick={addEvent}>Add Event</button>
              <button className="createModalCancel" onClick={handleClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CreateModal;
