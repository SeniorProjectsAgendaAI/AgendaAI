import React from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import CalendarView from "../Calendar/CalendarView";
import "../../styles/SharedLayout.css"; 

// container maintained+made by alex to make website consistent
const CalendarContainer = () => { 
  return (
    <div>
      <div className="dashboardHeader">
        <h1>AgendaAI</h1>
        <h2>Calendars</h2>
      </div>
    
      {/* we Used these groups from the css file in order to organize the dashboard into 3 main panels, left middle and right */}
      <div className="dashboardGroup">
        <Sidebar />

        <div className="centerDash">
          <CalendarView />
        </div>
      </div>
    </div>
  );
};

export default CalendarContainer; 