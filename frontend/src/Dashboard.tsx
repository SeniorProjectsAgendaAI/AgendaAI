import React from "react";
import app from "./App";
import Sidebar from "./Sidebar";
//import Calendarview from "./Calendarview";
import TaskPanel from "./TaskPanel";

const Dashboard = () => {
  return (
    <div>
      <h1>AgendaAI</h1>
      <p>Mcp Calendar Webapp</p>
        <Sidebar />
        <TaskPanel />
    </div>
  );
};

export default Dashboard;
