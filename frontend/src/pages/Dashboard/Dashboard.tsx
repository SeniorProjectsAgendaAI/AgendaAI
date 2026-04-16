import React from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import TaskPanel from "../../components/TaskPanel/TaskPanel";
import HighPriorityDash from "../HighPriority/HighPriorityDash";
// import DayView from "../Calendar/DayView";
import WeekView from "../Calendar/WeekView";
import AISidebar from "../../components/AiSidebar/AiSidebar";
import "../../styles/SharedLayout.css";

// container maintained+made by alex+ ankush to make website consistent

const Dashboard = () => {
  return (
    <div className="app-wrapper"> {/* <-- GLOBAL WRAPPER */}
      <div className="dashboardHeader">
        <h1>AgendaAI</h1>
        <h2>Dashboard</h2>
      </div>
      <div className="dashboardGroup">
        <Sidebar />
        <div className="centerDash">
          <WeekView embedded />
          <HighPriorityDash />
        </div>
        <div className="rightDash">
          <TaskPanel hideBackButton={true} />
          <AISidebar fullScreen={false} />
        </div>

      </div>
    </div>
  );
};

export default Dashboard;