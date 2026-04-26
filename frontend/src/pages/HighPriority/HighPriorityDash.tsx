//Author: Biniam Gashaw
//CS425: Senior Projects
import React, { useState, useEffect } from "react";
import "./highprioritydash.css";
import api from "../../services/api";
import { useTaskEvents } from "../../contexts/TaskEventContext";

interface ApiTask {
  id: number;
  title: string;
  description?: string | null;
  priority?: number | null;
  due_date?: string | null;
  due_time?: string | null;
  completed: boolean;
}

interface DashItem {
  id: string;
  type: "task";
  title: string;
  dueDate: Date;
  priority?: number;
  completed?: boolean;
  taskId?: number;
}

const HighPriorityDash: React.FC = () => {
  const { refreshKey, triggerRefresh } = useTaskEvents();
  const [items, setItems] = useState<DashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editPriority, setEditPriority] = useState(1);
  const [allTasks, setAllTasks] = useState<ApiTask[]>([]);

  useEffect(() => {
    loadHighPriorityItems();
  }, [refreshKey]);

  const loadHighPriorityItems = async () => {
    try {
      setLoading(true);
      const tasksRes = await api.get<ApiTask[]>("/tasks");

      console.log("All tasks from API:", tasksRes.data);

      setAllTasks(tasksRes.data);

      const now = new Date();
      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(now.getDate() + 6);
      threeDaysFromNow.setHours(23, 59, 59, 999);

      //Filter high priority tasks
      const highPriorityTasks: DashItem[] = tasksRes.data
        .filter((task) => {
          if (task.completed) {
            return false;
          }
          if (!task.priority || task.priority < 3) {
            return false;
          }
          if (!task.due_date) {
            return false;
          }

          const timeStr = task.due_time || "00:00:00";
          const formattedTime =
            timeStr.includes(":") && timeStr.split(":").length === 2
              ? `${timeStr}:00`
              : timeStr;

          const dueDateTime = new Date(`${task.due_date}T${formattedTime}`);
          return dueDateTime <= threeDaysFromNow;
        })
        .map((task) => {
          const timeStr = task.due_time || "00:00:00";
          const formattedTime =
            timeStr.includes(":") && timeStr.split(":").length === 2
              ? `${timeStr}:00`
              : timeStr;

          return {
            id: `task-${task.id}`,
            type: "task" as const,
            title: task.title,
            dueDate: new Date(`${task.due_date}T${formattedTime}`),
            priority: task.priority || 1,
            completed: task.completed,
            taskId: task.id,
          };
        });

      console.log("High priority tasks after filtering:", highPriorityTasks);

      //Sort by priority (descending) then by due date
      const sorted = highPriorityTasks.sort((a, b) => {
        if ((a.priority ?? 0) !== (b.priority ?? 0)) {
          return (b.priority ?? 0) - (a.priority ?? 0);
        }
        return a.dueDate.getTime() - b.dueDate.getTime();
      });

      setItems(sorted);
    } catch (err) {
      console.error("Failed to load high priority items", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDueDate = (date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const itemDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    //check if overdue
    if (date < now) {
      const daysOverdue = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysOverdue === 0) {
        return `Today ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} (Overdue)`;
      } else if (daysOverdue === 1) {
        return "Yesterday (Overdue)";
      } else {
        return `${daysOverdue} days ago (Overdue)`;
      }
    }

    if (itemDate.getTime() === today.getTime()) {
      return `Today ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    } else if (itemDate.getTime() === tomorrow.getTime()) {
      return `Tomorrow ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    } else {
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
  };

  const getPriorityColor = (priority?: number): string => {
    if (!priority) return "#666";
    if (priority >= 5) return "#d32f2f";
    if (priority >= 3) return "#f57c00";
    return "#666";
  };

  const completeTask = async (taskId: number) => {
    try {
      await api.put(`/tasks/${taskId}`, { completed: true });
      setItems((prev) =>
        prev.filter(
          (item) => !(item.type === "task" && item.taskId === taskId),
        ),
      );
      triggerRefresh();
    } catch (err) {
      console.error("Failed to complete task", err);
      alert("Failed to complete task.");
    }
  };

  const deleteTask = async (taskId: number) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      setItems((prev) =>
        prev.filter(
          (item) => !(item.type === "task" && item.taskId === taskId),
        ),
      );
      triggerRefresh();
    } catch (err) {
      console.error("Failed to delete task", err);
      alert("Failed to delete task.");
    }
  };

  const startEditTask = (taskId: number) => {
    const task = allTasks.find((t) => t.id === taskId);
    if (task) {
      setEditingTaskId(taskId);
      setEditTitle(task.title);
      setEditDate(task.due_date || "");
      setEditTime(task.due_time?.slice(0, 5) || "");
      setEditPriority(task.priority || 1);
    }
  };

  const saveEditTask = async () => {
    if (!editTitle.trim() || !editDate || !editTime) {
      alert("Title, date, and time are required.");
      return;
    }

    try {
      await api.put(`/tasks/${editingTaskId}`, {
        title: editTitle.trim(),
        due_date: editDate,
        due_time: editTime,
        priority: editPriority,
      });
      setEditingTaskId(null);
      triggerRefresh();
    } catch (err) {
      console.error("Failed to update task", err);
      alert("Failed to update task.");
    }
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setEditTitle("");
    setEditDate("");
    setEditTime("");
    setEditPriority(1);
  };

  return (
    <div className="highPriorityDash">
      <div className="dashHeader">
        <span className="starIcon"></span>
        <h3>High Priority Tasks</h3>
      </div>
      <div className="dashContent">
        {loading ? (
          <p className="loadingText">Loading...</p>
        ) : items.length === 0 ? (
          <p className="emptyText">No high priority tasks in the next 3 days</p>
        ) : (
          <div className="dashItems">
            {items.map((item) => (
              <div key={item.id} className="dashItem">
                <div className="dashItemHeader">
                  <span className="dashItemTitle">{item.title}</span>
                </div>
                <div className="dashItemFooter">
                  <span className="dashItemDate">
                    {formatDueDate(item.dueDate)}
                  </span>
                  {item.priority && (
                    <span
                      className="dashItemPriority"
                      style={{
                        backgroundColor: getPriorityColor(item.priority),
                      }}
                    >
                      P{item.priority}
                    </span>
                  )}
                </div>
                {item.taskId && (
                  <div className="dashItemActions">
                    <button
                      className="dashActionBtn dashActionComplete"
                      onClick={() => completeTask(item.taskId!)}
                      title="Mark as complete"
                    >
                      ✓
                    </button>
                    <button
                      className="dashActionBtn dashActionEdit"
                      onClick={() => startEditTask(item.taskId!)}
                      title="Edit task"
                    >
                      Edit
                    </button>
                    <button
                      className="dashActionBtn dashActionDelete"
                      onClick={() => deleteTask(item.taskId!)}
                      title="Delete task"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {editingTaskId !== null && (
        <div className="editTaskModal">
          <div className="editTaskOverlay" onClick={cancelEditTask} />
          <div className="editTaskForm">
            <h4>Edit Task</h4>
            <div className="editFormGroup">
              <label>Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Task title"
              />
            </div>
            <div className="editFormGroup">
              <label>Date</label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div className="editFormGroup">
              <label>Time</label>
              <input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
              />
            </div>
            <div className="editFormGroup">
              <label>Priority</label>
              <input
                type="number"
                value={editPriority}
                onChange={(e) => setEditPriority(Number(e.target.value))}
                min={1}
                max={10}
              />
            </div>
            <div className="editFormActions">
              <button className="editSaveBtn" onClick={saveEditTask}>
                Save
              </button>
              <button className="editCancelBtn" onClick={cancelEditTask}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HighPriorityDash;
