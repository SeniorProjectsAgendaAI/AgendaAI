import {NavLink} from "react-router-dom";
import "./sidebar.css";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { MdOutlineSpaceDashboard } from "react-icons/md";
import { MdSpaceDashboard } from "react-icons/md";
import { BsStars } from "react-icons/bs";
import { FaRegCalendarAlt } from "react-icons/fa";
import { FaUser } from "react-icons/fa";
import { FiLogOut } from "react-icons/fi";



//sidebar maintained by alex
const Sidebar = () => {
  const { signOut } = useAuthenticator();
  return (
    //Next three buttons are meant to have navigation to the other pages, not sure how we want to display yet
    <div className="sidebar"> 
        <NavLink to="/dashboard" className="navigationItem">
            <MdSpaceDashboard className="navigationIcon" />
            Dashboard
        </NavLink>
        <NavLink to="/aisidebar" className="navigationItem">
            <BsStars className='navigationIcon' />
            AI Agent
        </NavLink>
        <NavLink to="/calendarcontainer" className="navigationItem">
            <FaRegCalendarAlt className='navigationIcon' />    
            Calendars
        </NavLink>
        <NavLink to="/profilecontainer" className="navigationItem">
            <FaUser className='navigationIcon' />
            Profile
        </NavLink>
    
        <button className="navigationItemlogout" onClick={signOut}>
          <FiLogOut className="navigationIcon" />
            Sign Out
        </button>
    </div>
    );
};

export default Sidebar;