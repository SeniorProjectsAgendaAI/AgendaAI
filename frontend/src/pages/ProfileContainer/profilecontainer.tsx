import React from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import CalendarView from "../Calendar/CalendarView";


import Profile from "../Profile/Profile";


const  ProfileContainer = () => {
  return (
    <div>
      <div className="dashboardHeader">
        <h1>AgendaAI</h1>
        <h2>Profile</h2>
      </div>
    
      {/* we Used these groups from the css file in order to organize the dashboardinto 3 main pannels, left middle and right*/}
      <div className="dashboardGroup">
        <Sidebar />

        <div className="centerDash">
          <Profile />
        </div>
      </div>
    </div>
  );
};

export default ProfileContainer;