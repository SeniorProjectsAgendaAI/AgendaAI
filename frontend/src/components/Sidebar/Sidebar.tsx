import react from "react";

import {NavLink} from "react-router-dom";
import "./sidebar.css";
import { useAuthenticator } from "@aws-amplify/ui-react";
//sidebar maintained by alex
const Sidebar = () => {
  const { signOut } = useAuthenticator();
  return (
    //Next three buttons are meant to have navigation to the other pages, not sure how we want to display yet
    <div className="sidebar"> 
        <NavLink to="/dashboard" className="navigationItem">
            Dashboard
        </NavLink>
        <NavLink to="/aisidebar" className="navigationItem">
            AI Agent
        </NavLink>
        <NavLink to="/calendarcontainer" className="navigationItem">
            Calendars
        </NavLink>
        <NavLink to="/profilecontainer" className="navigationItem">
            Profile
        </NavLink>
    
        <button className="navigationItemlogout" onClick={signOut}>
          Logout
        </button>
    </div>
    );
};

export default Sidebar;