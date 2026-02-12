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
  completed:boolean;
}

// Extending previous api task for easier handling
interface Task extends Omit<ApiTask, 'title' | 'description'>{
  name:string;
  date:string;
  time:string;
  priority:number;
}

const parseDescription = (desc?: string | null) => {
  try {
    return JSON.parse(desc || '{}');
  } catch {
    return {};
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
  const [tasks, setTasks] = useState<Task[]>([]);
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


// load tasks from API 
  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      try {
        const res = await api.get<ApiTask[]>("/tasks/");
        const mapped: Task[] = res.data.map((t) => {
          const meta = parseDescription(t.description);
          return {
            id: t.id,
            name: t.title,
            date: meta.date,
            time: meta.time,
            priority: meta.priority,
            completed: t.completed,
          };
        });
        setTasks(mapped);
      } catch (err) {
        console.error("Failed to load tasks", err);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, []);


  // grouping tasks by date
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((task) => {
      if (task.date) {
        if (!map[task.date]) map[task.date] = [];
        map[task.date].push(task);
      }
    });
    // soprting tasks by time
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => a.time.localeCompare(b.time))
    );
    return map;
  }, [tasks]);

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
              const dayTasks = tasksByDate[key] || [];
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
                    {dayTasks.length === 0 ? (
                      <span className="noTasks">—</span>
                    ) : (
                      dayTasks.map((task) => (
                        <div
                          key={task.id}
                          className={`weekTask priority-${priorityLabel(task.priority)} ${
                            task.completed ? "taskCompleted" : ""
                          }`}
                        >
                          <span className="weekTaskTime">{task.time}</span>
                          <span className="weekTaskName">{task.name}</span>
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