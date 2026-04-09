import React from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import CalendarView from "../Calendar/CalendarView"; // You can likely remove this import if unused
import TaskPanel from "../../components/TaskPanel/TaskPanel";
import HighPriorityDash from "../HighPriority/HighPriorityDash";
import DayView from "../Calendar/DayView";
import "../../styles/SharedLayout.css";

// container maintained+made by alex+ ankush to make website consistent

/*
TODO:
- Make more like mockup 
--> organize today's agenda and play around with its styling 
- Make agenda and priority tasks fit on one standard page. 
- Add an option for overdue tasks and reflect that on the day view.
- Make task and events more of a 'todo'
- move new event button to top right corner 
*/ 

const Dashboard = () => {
  return (
    <div>
      <div className="dashboardHeader">
        <h1>AgendaAI</h1>
        <h2>Dashboard</h2>
      </div>
    
      {/* we Used these groups from the css file in order to organize the dashboard into 3 main panels, left middle and right */}
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