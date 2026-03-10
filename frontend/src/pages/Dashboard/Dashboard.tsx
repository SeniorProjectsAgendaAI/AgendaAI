import React from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import CalendarView from "../Calendar/CalendarView";
import TaskPanel from "../../components/TaskPanel/TaskPanel";
import HighPriorityDash from "../HighPriority/HighPriorityDash";
import DayView from "../Calendar/DayView";
import "./dashboard.css";

const Dashboard = () => {
  return (
    <div>
      <div className="dashboardHeader">
        <h1>AgendaAI</h1>
        <h2>Dashboard</h2>
      </div>
    
      {/* we Used these groups from the css file in order to organize the dashboardinto 3 main pannels, left middle and right*/}
      <div className="dashboardGroup">
        <Sidebar />

        <div className="centerDash">
          <DayView />
          <HighPriorityDash />
        </div>
        <TaskPanel />
      </div>
    </div>
  );
};

export default Dashboard;
