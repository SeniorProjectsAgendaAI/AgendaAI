//bini work + template
//Reference: https://mui.com/x/react-date-pickers/date-calendar/

/*
TODO:
- Make progress bar a little smaller and put percentage 

*/

/* Progress Bar - Alex*/
import React, { useState, useEffect } from "react";
import "./dayview.css";
import BackButton from "../../components/BackButton";
import api from "../../services/api";
import TaskPanel from "../../components/TaskPanel/TaskPanel";

//Task from database
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

//Event from database
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

//Local task interface
interface Task {
  id: number;
  name: string;
  date: string;
  time: string;
  priority: number;
  completed: boolean;
}

//Local event interface
interface Event {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  date: string;
  color?: string;
  location?: string;
  status?: string;
  allDay?: boolean;
  recurrence?: string;
}

const parseTaskDescription = (description?: string | null) => {
  if (!description) {
    return { date: "", time: "", priority: 1 };
  }
  try {
    const parsed = JSON.parse(description);
    return {
      date: parsed.date ?? "",
      time: parsed.time ?? "",
      priority: parsed.priority ?? 1,
    };
  } catch {
    return { date: "", time: "", priority: 1 };
  }
};

const formatTime12Hour = (time24: string): string => {
  if (!time24) return "";
  const [hourStr, minute] = time24.split(":");
  const hour = parseInt(hourStr, 10);

  if (hour === 0) return `12:${minute} AM`;
  if (hour < 12) return `${hour}:${minute} AM`;
  if (hour === 12) return `12:${minute} PM`;
  return `${hour - 12}:${minute} PM`;
};

const DayView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTaskName, setEditTaskName] = useState("");
  const [editTaskDate, setEditTaskDate] = useState("");
  const [editTaskTime, setEditTaskTime] = useState("");
  const [editTaskPriority, setEditTaskPriority] = useState(1);

  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editEventTitle, setEditEventTitle] = useState("");
  const [editEventDescription, setEditEventDescription] = useState("");
  const [editEventStartTime, setEditEventStartTime] = useState("");
  const [editEventEndTime, setEditEventEndTime] = useState("");
  const [editEventLocation, setEditEventLocation] = useState("");
  const [editEventColor, setEditEventColor] = useState("");

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const loadTasks = async () => {
    const res = await api.get<ApiTask[]>("/tasks");
    const mapped = res.data.map((task) => {
      const meta = parseTaskDescription(task.description);
      return {
        id: task.id,
        name: task.title,
        date: task.due_date ?? meta.date,
        time: task.due_time?.slice(0, 5) ?? meta.time,
        priority: task.priority ?? meta.priority,
        completed: task.completed,
      };
    });
    setTasks(mapped);
  };

  const loadEvents = async () => {
    const res = await api.get<ApiEvent[]>("/events");
    const mapped = res.data.map((event) => {
      const start = new Date(event.start_at);
      const end = new Date(event.end_at);

      const year = start.getFullYear();
      const month = String(start.getMonth() + 1).padStart(2, "0");
      const day = String(start.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const startHH = String(start.getHours()).padStart(2, "0");
      const startMM = String(start.getMinutes()).padStart(2, "0");
      const startTime = `${startHH}:${startMM}`;

      const endHH = String(end.getHours()).padStart(2, "0");
      const endMM = String(end.getMinutes()).padStart(2, "0");
      const endTime = `${endHH}:${endMM}`;

      return {
        id: event.id,
        title: event.title,
        description: event.description ?? undefined,
        startTime,
        endTime,
        date: dateStr,
        color: event.color ?? undefined,
        location: event.location ?? undefined,
        status: event.status ?? undefined,
        allDay: event.all_day ?? false,
        recurrence: event.recurrence ?? undefined,
      };
    });
    setEvents(mapped);
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      await Promise.all([loadTasks(), loadEvents()]);
    } catch (err) {
      console.error("Failed to load tasks/events", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const getTasksForDate = (date: Date): Task[] => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    return tasks.filter((task) => task.date === dateStr);
  };

  const getEventsForDate = (date: Date): Event[] => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    return events.filter((event) => event.date === dateStr);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const deleteTask = async (taskId: number) => {
    if (!window.confirm("Are you sure you want to delete this task?")) {
      return;
    }
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (err) {
      console.error("Failed to delete task", err);
      alert("Failed to delete task.");
    }
  };

  const toggleComplete = async (taskId: number, currentCompleted: boolean) => {
    try {
      await api.put(`/tasks/${taskId}`, {
        completed: !currentCompleted,
      });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, completed: !currentCompleted } : task,
        ),
      );
    } catch (err) {
      console.error("Failed to update task", err);
      alert("Failed to update task.");
    }
  };

  const startEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTaskName(task.name);
    setEditTaskDate(task.date);
    setEditTaskTime(task.time);
    setEditTaskPriority(task.priority);
  };

  const saveEditTask = async (taskId: number) => {
    try {
      await api.put(`/tasks/${taskId}`, {
        title: editTaskName,
        due_date: editTaskDate,
        due_time: editTaskTime,
        priority: editTaskPriority,
      });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                name: editTaskName,
                date: editTaskDate,
                time: editTaskTime,
                priority: editTaskPriority,
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

  const deleteEvent = async (eventId: number) => {
    if (!window.confirm("Are you sure you want to delete this event?")) {
      return;
    }
    try {
      await api.delete(`/events/${eventId}`);
      setEvents((prev) => prev.filter((event) => event.id !== eventId));
    } catch (err) {
      console.error("Failed to delete event", err);
      alert("Failed to delete event.");
    }
  };

  const startEditEvent = (event: Event) => {
    setEditingEventId(event.id);
    setEditEventTitle(event.title);
    setEditEventDescription(event.description || "");
    setEditEventStartTime(event.startTime);
    setEditEventEndTime(event.endTime);
    setEditEventLocation(event.location || "");
    setEditEventColor(event.color || "#2196f3");
  };

  const saveEditEvent = async (eventId: number) => {
    try {
      const event = events.find((e) => e.id === eventId);
      if (!event) return;

      const startDateTime = `${event.date}T${editEventStartTime}:00`;
      const endDateTime = `${event.date}T${editEventEndTime}:00`;

      await api.put(`/events/${eventId}`, {
        title: editEventTitle,
        description: editEventDescription,
        start_at: startDateTime,
        end_at: endDateTime,
        location: editEventLocation,
        color: editEventColor,
      });

      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                title: editEventTitle,
                description: editEventDescription,
                startTime: editEventStartTime,
                endTime: editEventEndTime,
                location: editEventLocation,
                color: editEventColor,
              }
            : e,
        ),
      );
      setEditingEventId(null);
    } catch (err) {
      console.error("Failed to update event", err);
      alert("Failed to update event.");
    }
  };

  const todayTasks = getTasksForDate(currentDate);
  const todayEvents = getEventsForDate(currentDate);
  ///math for the progress bar //test later
  const totalTaskInDay = todayTasks.length;

  const completedTaskInDay = todayTasks.filter((task) => task.completed).length;

  const percentageComplete = totalTaskInDay === 0 ? 0 : (completedTaskInDay / totalTaskInDay) * 100;

  return (
    <div className="dayViewContainer">
      <div className="dayViewContent">
        <div className="dayViewHeader">
          {/* 
          <div className="back-button-wrapper">
            <BackButton />
          </div>
          */}
          <h2>Today's Agenda</h2>
          <div className="dateNavigation">
            <button onClick={goToPreviousDay}>← Previous</button>
            <button onClick={goToToday}>Today</button>
            <button onClick={goToNextDay}>Next →</button>
            <button onClick={loadAll}> Refresh</button>
          </div>
          <div className="currentDate">{formatDate(currentDate)}</div>
        </div>

        {loading ? (
          <div className="loadingMessage">Loading tasks...</div>
        ) : (
          <>
            {todayEvents.length > 0 && (
              <div className="eventsSummary">
                <h3>Events for {formatDate(currentDate)}</h3>
                <p>{todayEvents.length} event(s) scheduled</p>
                <div className="eventsList">
                  {todayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="eventItem"
                      style={
                        event.color
                          ? {
                              borderLeftColor: event.color,
                              borderLeftWidth: "4px",
                            }
                          : undefined
                      }
                    >
                      {editingEventId === event.id ? (
                        <div className="eventEditor">
                          <input
                            type="text"
                            value={editEventTitle}
                            onChange={(e) => setEditEventTitle(e.target.value)}
                            placeholder="Event title"
                            className="editInput"
                          />
                          <textarea
                            value={editEventDescription}
                            onChange={(e) => setEditEventDescription(e.target.value)}
                            placeholder="Description"
                            className="editInput"
                          />
                          <input
                            type="time"
                            value={editEventStartTime}
                            onChange={(e) => setEditEventStartTime(e.target.value)}
                            className="editInput"
                          />
                          <input
                            type="time"
                            value={editEventEndTime}
                            onChange={(e) => setEditEventEndTime(e.target.value)}
                            className="editInput"
                          />
                          <input
                            type="text"
                            value={editEventLocation}
                            onChange={(e) => setEditEventLocation(e.target.value)}
                            placeholder="Location"
                            className="editInput"
                          />
                          <input
                            type="color"
                            value={editEventColor}
                            onChange={(e) => setEditEventColor(e.target.value)}
                            className="editInput"
                          />
                          <div className="editActions">
                            <button className="taskActionBtn completeBtn" onClick={() => saveEditEvent(event.id)}>
                              Save
                            </button>
                            <button className="taskActionBtn deleteBtn" onClick={() => setEditingEventId(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="eventItemHeader">
                            <span className="eventItemTitle">{event.title}</span>
                            <span className="eventItemTime">
                              {event.allDay
                                ? "All Day"
                                : `${formatTime12Hour(event.startTime)} - ${formatTime12Hour(event.endTime)}`}
                            </span>
                          </div>
                          {event.description && <div className="eventItemDescription">{event.description}</div>}
                          <div className="eventItemDetails">
                            {event.location && <span className="eventLocation">{event.location}</span>}
                            {event.status && <span className="eventStatus">Status: {event.status}</span>}
                            {event.recurrence && <span className="eventRecurrence">Recurring: {event.recurrence}</span>}
                          </div>
                          <div className="taskActions">
                            <button className="taskActionBtn completeBtn" onClick={() => startEditEvent(event)}>
                              Edit
                            </button>
                            <button className="taskActionBtn deleteBtn" onClick={() => deleteEvent(event.id)}>
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="taskSummary">
              <h3>Schedule for {formatDate(currentDate)}</h3>
              <p>
                {todayTasks.length} task(s) scheduled • {todayTasks.filter((t) => t.completed).length} completed • {todayEvents.length} event(s)
              </p>
              {todayTasks.length > 0 && (
                <div className="taskList">
                  {todayTasks.map((task) => (
                    <div key={task.id} className={`taskItem ${task.completed ? "completed" : ""}`}>
                      {editingTaskId === task.id ? (
                        <div className="taskEditor">
                          <input
                            type="text"
                            value={editTaskName}
                            onChange={(e) => setEditTaskName(e.target.value)}
                            placeholder="Task name"
                            className="editInput"
                          />
                          <input
                            type="date"
                            value={editTaskDate}
                            onChange={(e) => setEditTaskDate(e.target.value)}
                            className="editInput"
                          />
                          <input
                            type="time"
                            value={editTaskTime}
                            onChange={(e) => setEditTaskTime(e.target.value)}
                            className="editInput"
                          />
                          <input
                            type="number"
                            value={editTaskPriority}
                            onChange={(e) => setEditTaskPriority(Number(e.target.value))}
                            placeholder="Priority"
                            min={1}
                            max={10}
                            className="editInput"
                          />
                          <div className="editActions">
                            <button className="taskActionBtn completeBtn" onClick={() => saveEditTask(task.id)}>
                              Save
                            </button>
                            <button className="taskActionBtn deleteBtn" onClick={() => setEditingTaskId(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="taskHeader">
                            <span className="taskTitle">{task.name}</span>
                            <span className="taskTime">{formatTime12Hour(task.time)}</span>
                          </div>
                          <div className="taskDetails">
                            <span className="taskPriority">Priority: {task.priority}</span>
                            {task.completed && <span className="completedBadge">✓ Completed</span>}
                          </div>
                          <div className="taskActions">
                            <button
                              className="taskActionBtn completeBtn"
                              onClick={() => toggleComplete(task.id, task.completed)}
                              title={task.completed ? "Mark as incomplete" : "Mark as complete"}
                            >
                              {task.completed ? "↩ Undo" : " Complete"}
                            </button>
                            <button className="taskActionBtn completeBtn" onClick={() => startEditTask(task)} title="Edit task">
                              Edit
                            </button>
                            <button className="taskActionBtn deleteBtn" onClick={() => deleteTask(task.id)} title="Delete task">
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                
                {/* ///////////////////////////////////////////////start of taskbar visuals*/}
                {totalTaskInDay > 0 && (
                  <div className="taskProgressBarContainer">
                    <div className="taskProgressBarHeader">
                      <span> Daily Progress</span>
                      <span>{percentageComplete}% ({completedTaskInDay}/{totalTaskInDay})</span>
                    </div>
                    {/*grey part of bar, could change later idk*/}
                    <div className="taskProgressBarBackground">
                      <div className="taskProgressBarFill" style={{ width: `${percentageComplete}%` }}>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

            <div className="daySchedule">
              <div className="timeColumn">
                {hours.map((hour) => (
                  <div key={hour} className="timeSlot">
                    {hour === 0
                      ? "12:00 AM"
                      : hour < 12
                        ? `${hour}:00 AM`
                        : hour === 12
                          ? "12:00 PM"
                          : `${hour - 12}:00 PM`}
                  </div>
                ))}
              </div>
              <div className="eventsColumn">
                {hours.map((hour) => (
                  <div key={hour} className="hourBlock">
                    {todayEvents
                      .filter((event) => {
                        if (event.allDay) return hour === 0;
                        const eventStartHour = parseInt(event.startTime.split(":")[0], 10);
                        const eventEndHour = parseInt(event.endTime.split(":")[0], 10);
                        return hour >= eventStartHour && hour <= eventEndHour;
                      })
                      .map((event) => (
                        <div
                          key={`event-${event.id}-${hour}`}
                          className="eventBlock"
                          style={
                            event.color
                              ? {
                                  borderLeftColor: event.color,
                                  borderLeftWidth: "4px",
                                }
                              : undefined
                          }
                        >
                          <div className="eventBlockTitle">{event.title}</div>
                          <div className="eventBlockTime">
                            {event.allDay
                              ? "All Day"
                              : `${formatTime12Hour(event.startTime)} - ${formatTime12Hour(event.endTime)}`}
                          </div>
                          {event.location && <div className="eventBlockLocation">{event.location}</div>}
                          {event.description && <div className="eventBlockDescription">{event.description}</div>}
                        </div>
                      ))}

                    {todayTasks
                      .filter((task) => {
                        if (!task.time) return false;
                        const taskHour = parseInt(task.time.trim().split(":")[0], 10);
                        return taskHour === hour;
                      })
                      .map((task) => (
                        <div key={`task-${task.id}`} className={`taskBlock ${task.completed ? "completed" : ""}`}>
                          <div className="taskBlockTitle">{task.name}</div>
                          <div className="taskBlockTime">{formatTime12Hour(task.time)}</div>
                          <div className="taskBlockPriority">P{task.priority}</div>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DayView;
