import React from "react";
import app from "./App";
import {NavLink} from "react-router-dom";
import Sidebar from "./Sidebar";
import "./taskpanel.css";
//currently there is no mcp integration with task creations all manual because the database doesnt currently support tasks
//basically making a task its own object ish
interface Task
{
    id: number;
    name: string;
    date: string;
    time: string;
    priority: number;
}


const TaskPanel = () => {
    //creating a list of Task s called "tasks", all by default empty
    const [tasks, setTasks] = React.useState<Task[]>([]);
    //checking if the popuup actually popped up/is still up
    const [isPopupOpen, setIsPopupOpen] = React.useState(false);

    const [newTaskName, setNewTaskName] = React.useState("");
    const [newTaskDate, setNewTaskDate] = React.useState("");
    const [newTaskTime, setNewTaskTime] = React.useState("");
    const [newTaskPriority, setNewTaskPriority] = React.useState(1);

    const addTask = () => {
        //const task = prompt("Type task name, date, and priority"); DONT NEED ANYMORE
        //if one of the spaces are empty we dont addd in the task (basically requiring all feilds)
        if (!newTaskName || !newTaskDate || !newTaskTime || !newTaskPriority)    
        {
            alert("All 4 fields are required, Thank you!");
            return;
        }
        //uses date now for the id so that theyre never the same, im sure there is another easier way idk
        const newTask: Task = {
            id: Date.now(),
            name: newTaskName,
            date: newTaskDate,
            time: newTaskTime,
            priority: newTaskPriority,
        };
        setTasks([...tasks, newTask]);
        //reset ttask box 
        setNewTaskName("");
        setNewTaskDate("");
        setNewTaskTime("");
        setNewTaskPriority(1);
        //ADD A TASK REMOVAL FEATURE WITH MCP ITEGRATION

    };
    return (
        <div>
            <div className="taskPanel">
                <h1>AgendaAI</h1>
                <p>Mcp Calendar Webapp</p>
                {/* Trying to see if it gives illusion of only changing center? */}
                {/*<Sidebar />*/ }
            
                <ul className="taskList">
                    {/*mapping means putting i t in the array with the id as leading for us*/}
                    {tasks.map((task) => (
                        <li key={task.id} className="taskItem">
                            <div> 
                                <strong>{task.name}</strong>
                                <br />
                                Date: {task.date} @ {task.time}
                                <br />
                                Priority: {task.priority}
                            </div>
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