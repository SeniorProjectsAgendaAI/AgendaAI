//bini work + template
import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import "./dayview.css";
import api from "./services/api";

//Day view consist of all the events that correspond to that day
interface Event {
  id: number;
  title: string;
  time: string;
  duration: number;
}

//Task from database
interface ApiTask {
  id: number;
  title: string;
  description?: string | null;
  completed: boolean;
  user_id: number;
  created_at: string;
}

//Local task interface as a refernce
interface Task {
  id: number;
  name: string;
  date: string;
  time: string;
  priority: number;
  completed: boolean;
}

//parse task description to match the task panel
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

//Convert 24-hour time to 12-hour format with AM/PM
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

  const hours = Array.from({ length: 24 }, (_, i) => i); // Full 24-hour day (0-23)

  //Get task from the database, plan for future expansion of adding events as well.
  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get<ApiTask[]>("/tasks/");
      console.log("Raw tasks from API:", res.data);
      const mapped = res.data.map((task) => {
        const meta = parseTaskDescription(task.description);
        console.log(`Task ${task.id} (${task.title}):`, meta);
        return {
          id: task.id,
          name: task.title,
          date: meta.date,
          time: meta.time,
          priority: meta.priority,
          completed: task.completed,
        };
      });
      console.log("Mapped tasks:", mapped);
      setTasks(mapped);
    } catch (err) {
      console.error("Failed to load tasks", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [currentDate]);

  //Filter tasks for the current date
  const getTasksForDate = (date: Date): Task[] => {
    //Use local date string to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`; //Format: YYYY-MM-DD
    return tasks.filter((task) => task.date === dateStr);
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

  //Delete a task if unwanted
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

  //task completion
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

  //match tasks to current date on the calendar
  const todayTasks = getTasksForDate(currentDate);

  return (
    <div className="dayViewContainer">
     
      <div className="dayViewContent">
        <div className="dayViewHeader">
          <h2>Day View</h2>
          <div className="dateNavigation">
            <button onClick={goToPreviousDay}>← Previous</button>
            <button onClick={goToToday}>Today</button>
            <button onClick={goToNextDay}>Next →</button>
            <button onClick={loadTasks}> Refresh</button>
          </div>
          <div className="currentDate">{formatDate(currentDate)}</div>
        </div>

        {loading ? (
          <div className="loadingMessage">Loading tasks...</div>
        ) : (
          <>
           
            <div className="taskSummary">
              <h3>Tasks for {formatDate(currentDate)}</h3>
              <p>
                {todayTasks.length} task(s) scheduled •{" "}
                {todayTasks.filter((t) => t.completed).length} completed
              </p>
              {todayTasks.length > 0 && (
                <div className="taskList">
                  {todayTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`taskItem ${task.completed ? "completed" : ""}`}
                    >
                      <div className="taskHeader">
                        <span className="taskTitle">{task.name}</span>
                        <span className="taskTime">
                          {formatTime12Hour(task.time)}
                        </span>
                      </div>
                      <div className="taskDetails">
                        <span className="taskPriority">
                          Priority: {task.priority}
                        </span>
                        {task.completed && (
                          <span className="completedBadge">✓ Completed</span>
                        )}
                      </div>
                      <div className="taskActions">
                        <button
                          className="taskActionBtn completeBtn"
                          onClick={() =>
                            toggleComplete(task.id, task.completed)
                          }
                          title={
                            task.completed
                              ? "Mark as incomplete"
                              : "Mark as complete"
                          }
                        >
                          {task.completed ? "↩ Undo" : " Complete"}
                        </button>
                        <button
                          className="taskActionBtn deleteBtn"
                          onClick={() => deleteTask(task.id)}
                          title="Delete task"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
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
                    
                    {events
                      .filter((event) => {
                        const eventHour = parseInt(event.time.split(":")[0]);
                        return eventHour === hour;
                      })
                      .map((event) => (
                        <div key={event.id} className="eventBlock">
                          <div className="eventTitle">{event.title}</div>
                          <div className="eventTime">{event.time}</div>
                        </div>
                      ))}

                  
                    {todayTasks
                      .filter((task) => {
                        if (!task.time) return false;
                        // Parse the time string
                        const timeStr = task.time.trim();
                        const taskHour = parseInt(timeStr.split(":")[0], 10);
                        return taskHour === hour;
                      })
                      .map((task) => (
                        <div
                          key={`task-${task.id}`}
                          className={`taskBlock ${task.completed ? "completed" : ""}`}
                        >
                          <div className="taskBlockTitle">{task.name}</div>
                          <div className="taskBlockTime">
                            {formatTime12Hour(task.time)}
                          </div>
                          <div className="taskBlockPriority">
                            P{task.priority}
                          </div>
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
