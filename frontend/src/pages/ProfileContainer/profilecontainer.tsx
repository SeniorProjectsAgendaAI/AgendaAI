import React from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import Profile from "../Profile/Profile";
import "../../styles/SharedLayout.css"; // <-- ADDED SHARED CSS

const ProfileContainer = () => {
  return (
    <div>
      <div className="dashboardHeader">
        <h1>AgendaAI</h1>
        <h2>Profile</h2>
      </div>
    
      {/* we Used these groups from the css file in order to organize the dashboard into 3 main panels, left middle and right */}
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