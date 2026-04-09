import React from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import AISidebar from "../../components/AiSidebar/AiSidebar";
import "../../styles/SharedLayout.css";

// container maintained+made by alex to make website consistent
// not currently functioning due to ai sidebar formatting options
const AiContain = () => {
  return (
    <div className="app-wrapper">
      <div className="dashboardHeader">
        <h1>AgendaAI</h1>
        <h2>Ai Agent</h2>
      </div>
    
      {/* we Used these groups from the css file in order to organize the dashboard into 3 main panels, left middle and right */}
      <div className="dashboardGroup">
        <Sidebar />

        <div className="centerDash">
          <AISidebar />
        </div>

      </div>
    </div>
  );
};

export default AiContain;