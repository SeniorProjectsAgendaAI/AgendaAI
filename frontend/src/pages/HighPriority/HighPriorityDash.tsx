//Author: Biniam Gashaw
//CS425: Senior Projects
import React, { useState, useEffect } from "react";
import "./highprioritydash.css";
import api from "../../services/api";

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
  type: "task" | "event";
  title: string;
  dueDate: Date;
  priority?: number;
  completed?: boolean;
}

const HighPriorityDash: React.FC = () => {
  const [items, setItems] = useState<DashItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHighPriorityItems();
  }, []);

  const loadHighPriorityItems = async () => {
    try {
      setLoading(true);
      const tasksRes = await api.get<ApiTask[]>("/tasks/");

      console.log("All tasks from API:", tasksRes.data);

      const now = new Date();
      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(now.getDate() + 3);
      threeDaysFromNow.setHours(23, 59, 59, 999);

      console.log("Now:", now);
      console.log("Three days from now:", threeDaysFromNow);

      //Filter high priority tasks
      const highPriorityTasks: DashItem[] = tasksRes.data
        .filter((task) => {
          console.log(`Task: ${task.title}`);
          console.log(`  Priority: ${task.priority}`);
          console.log(`  Completed: ${task.completed}`);
          console.log(`  Due Date: ${task.due_date}`);
          console.log(`  Due Time: ${task.due_time}`);

          if (task.completed) {
            console.log(`  -> Filtered out: completed`);
            return false;
          }
          if (!task.priority || task.priority < 3) {
            console.log(`  -> Filtered out: priority too low or missing`);
            return false;
          }
          if (!task.due_date) {
            console.log(`  -> Filtered out: no due date`);
            return false;
          }

          const timeStr = task.due_time || "00:00:00";
          const formattedTime =
            timeStr.includes(":") && timeStr.split(":").length === 2
              ? `${timeStr}:00`
              : timeStr;

          const dueDateTime = new Date(`${task.due_date}T${formattedTime}`);
          console.log(`  Due DateTime parsed: ${dueDateTime}`);
          console.log(
            `  Is before threshold: ${dueDateTime <= threeDaysFromNow}`,
          );

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
          };
        });

      console.log("High priority tasks after filtering:", highPriorityTasks);


      const sorted = highPriorityTasks.sort((a, b) => {
        if (a.priority !== b.priority) {
          return (b.priority ?? 0) - (a.priority ?? 0);
        }
        return a.dueDate.getTime() - b.dueDate.getTime();
      });

      //top 5
      setItems(sorted.slice(0, 5));
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
          <p className="emptyText">No high priority items in the next 3 days</p>
        ) : (
          <div className="dashItems">
            {items.map((item) => (
              <div key={item.id} className="dashItem">
                <div className="dashItemHeader">
                  <span className="dashItemIcon">
                    {item.type === "task" ? "" : ""}
                  </span>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HighPriorityDash;
