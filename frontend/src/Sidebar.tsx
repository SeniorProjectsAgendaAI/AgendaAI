import react from "react";

import {NavLink} from "react-router-dom";
import "./sidebar.css";

const Sidebar = () => {
  return (
    //Next three buttons are meant to have navigation to the other pages, not sure how we want to display yet
    <div className="sidebar"> 
        <NavLink to="/dashboard" className="navigationItem">
            Dashboard
        </NavLink>
        <NavLink to="/taskpanel" className="navigationItem">
            Task Panel
        </NavLink>
        <NavLink to="/dashboard" className="navigationItem">
            Dashboard
        </NavLink>
    </div>
    );
};

export default Sidebar;