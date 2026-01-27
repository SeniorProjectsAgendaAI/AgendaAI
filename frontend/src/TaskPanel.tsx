import React from "react";
import app from "./App";
import {NavLink} from "react-router-dom";
import Sidebar from "./Sidebar";
import "./taskpanel.css";
import api from "./services/api";
//currently there is no mcp integration with task creations all manual because the database doesnt currently support tasks
//task making by alex, editing +deletion by bini
//basically making a task its own object ish
interface Task
{
    id: number;
    name: string;
    date: string;
    time: string;
    priority: number;
}

interface ApiTask {
    id: number;
    title: string;
    description?: string | null;
    completed: boolean;
    user_id: number;
    created_at: string;
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

const buildTaskDescription = (date: string, time: string, priority: number) =>
    JSON.stringify({ date, time, priority });
//(Alex) i implimented everything except the editing part
// bini did the editing and deletion part of this code.

const TaskPanel = () => {
    //creating a list of Task s called "tasks", all by default empty
    const [tasks, setTasks] = React.useState<Task[]>([]);
    //checking if the popuup actually popped up/is still up
    const [isPopupOpen, setIsPopupOpen] = React.useState(false);

     const [editingTaskId, setEditingTaskId] = React.useState<number | null>(null);

    const [newTaskName, setNewTaskName] = React.useState("");
    const [newTaskDate, setNewTaskDate] = React.useState("");
    const [newTaskTime, setNewTaskTime] = React.useState("");
    const [newTaskPriority, setNewTaskPriority] = React.useState(1);

    const [editTaskName, setEditTaskName] = React.useState("");
    const [editTaskDate, setEditTaskDate] = React.useState("");
    const [editTaskTime, setEditTaskTime] = React.useState("");
    const [editTaskPriority, setEditTaskPriority] = React.useState(1);

    React.useEffect(() => {
        const loadTasks = async () => {
            try {
                const res = await api.get<ApiTask[]>("/tasks");
                const mapped = res.data.map((task) => {
                    const meta = parseTaskDescription(task.description);
                    return {
                        id: task.id,
                        name: task.title,
                        date: meta.date,
                        time: meta.time,
                        priority: meta.priority,
                    };
                });
                setTasks(mapped);
            } catch (err) {
                console.error("Failed to load tasks", err);
            }
        };
        loadTasks();
    }, []);

    const addTask = async () => {
        //const task = prompt("Type task name, date, and priority"); DONT NEED ANYMORE
        //if one of the spaces are empty we dont addd in the task (basically requiring all feilds)
        if (!newTaskName || !newTaskDate || !newTaskTime || !newTaskPriority)    
        {
            alert("All 4 fields are required, Thank you!");
            return;
        }
        try {
            const res = await api.post<ApiTask>("/tasks", {
                title: newTaskName,
                description: buildTaskDescription(newTaskDate, newTaskTime, newTaskPriority),
            });
            const meta = parseTaskDescription(res.data.description);
            const newTask: Task = {
                id: res.data.id,
                name: res.data.title,
                date: meta.date,
                time: meta.time,
                priority: meta.priority,
            };
            setTasks((prev) => [...prev, newTask]);
        } catch (err) {
            console.error("Failed to create task", err);
            alert("Failed to create task.");
            return;
        }
        //reset ttask box 
        setNewTaskName("");
        setNewTaskDate("");
        setNewTaskTime("");
        setNewTaskPriority(1);
        setIsPopupOpen(false);
        //ADD A TASK REMOVAL FEATURE WITH MCP ITEGRATION

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
    setEditTaskName(task.name);
    setEditTaskDate(task.date);
    setEditTaskTime(task.time);
    setEditTaskPriority(task.priority);
    };

    const saveEditTask = async (taskId: number) => {
        if (!editTaskName || !editTaskDate || !editTaskTime || !editTaskPriority) {
        alert("All 4 fields are required, Thank you!");
        return;
    }
    try {
        const res = await api.put<ApiTask>(`/tasks/${taskId}`, {
            title: editTaskName,
            description: buildTaskDescription(editTaskDate, editTaskTime, editTaskPriority),
        });
        const meta = parseTaskDescription(res.data.description);
        setTasks((prev) =>
            prev.map((task) =>
                task.id === taskId
                ? {
                    ...task,
                    name: res.data.title,
                    date: meta.date,
                    time: meta.time,
                    priority: meta.priority,
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

    const cancelEdit = () => {
        setEditingTaskId(null);
    };

      return (
        <div>
            <div className="taskPanel">
                {/*<Sidebar />*/ }
            
                <ul className="taskList">
                    {/*mapping means putting i t in the array with the id as leading for us*/}
                    
                    {/*mapping for task editing below*/}
                    {tasks.map((task) => (
                        <li key={task.id} className="taskItem">
                            {editingTaskId === task.id ? (
                                <div>
                                <input
                                    type="text"
                                    value={editTaskName}
                                    onChange={(e) => setEditTaskName(e.target.value)}
                                />
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
                                <button onClick={() => saveEditTask(task.id)}>Save</button>
                                <button onClick={cancelEdit}>Cancel</button>
                                </div>
                            ) : (                            
                            <div> 
                                <strong>{task.name}</strong>
                                <br />
                                Date: {task.date} @ {task.time}
                                <br />
                                Priority: {task.priority}
                                <br />
                                <button onClick={() => startEditTask(task)}>Edit</button>
                                <button onClick={() => deleteTask(task.id)}>Delete</button>
                                    </div>
                            )}
                        </li>
                    ))}
                </ul>
                {/*add a new task button */}
                <button className="addTask" onClick={()=> setIsPopupOpen(true)}>
                    Add Task
                </button>

                {/*actual popup for adding a task*/}
                {isPopupOpen && (
                    <div className="popup">
                        <h3>Please add a task</h3>
                    <input
                        type="text"
                        placeholder="Task Name"
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                    />
                    <input
                        type="date"
                        placeholder="Date"
                        value={newTaskDate}
                        onChange={(e) => setNewTaskDate(e.target.value)}
                    />
                    <input
                        type="time"
                        placeholder="Time"
                        value={newTaskTime}
                        onChange={(e) => setNewTaskTime(e.target.value)}
                    />
                    <input
                        type="number"
                        placeholder="Priority (1-5)"
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(Number(e.target.value))}
                        min={1}
                        max={10}
                    />
                    {/*button to actually add the task or bail*/}
                    <button onClick={addTask}>
                        Add Task
                    </button>
                    <button onClick={() => setIsPopupOpen(false)}>
                        Cancel
                    </button>
                </div>
            )}
        </div>
    </div>
    );
};

export default TaskPanel;
