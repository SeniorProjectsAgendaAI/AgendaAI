import React from "react";
import app from "./App";
import Sidebar from "./Sidebar";
import Calendarview from "./Calendarview";
import TaskPanel from "./TaskPanel";
import "./dashboard.css";

const Dashboard = () => {
  return (
    <div>
      <h1>AgendaAI</h1>
      <p>Mcp Calendar Webapp</p>
        <div className='dashboardGroup'>
          <Sidebar />

          <div className="centerDash">
            <Calendarview  />
          </div>
          <TaskPanel />
        </div>
    </div>
  );
};

export default Dashboard;
