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
      {/* we Used these groups from the css file in order to organize the dashboardinto 3 main pannels, left middle and right*/}
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
