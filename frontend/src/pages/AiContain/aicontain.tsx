import React from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import AISidebar from "../../components/AiSidebar/AiSidebar";
import "./aicontain.css";

const AiContain = () => {
  return (
    <div>
      <div className="dashboardHeader">
        <h1>AgendaAI</h1>
        <h2>Ai Agent</h2>
      </div>
    
      {/* we Used these groups from the css file in order to organize the dashboardinto 3 main pannels, left middle and right*/}
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