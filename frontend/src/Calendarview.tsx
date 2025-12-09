//import React from "react";
import React, {useState} from "react";
import app from "./App";
import {NavLink} from "react-router-dom";
import Sidebar from "./Sidebar";
import "./calendar.css";


const CalendarView = () => {
    // state allows month, week, day view, efaults to month
    const [calendarView, setCalendarView] = useState<"month" | "week" | "day">("month");

    return (
        <div className="calendarView">
            <div className="calendarButtons">
                {/* buttons to switch views*/}
                <button onClick={()=>setCalendarView("month")}>
                    Month
                </button>
                <button onClick={()=>setCalendarView("week")}>
                    Week
                </button>
                <button onClick={()=>setCalendarView("day")}>
                    Day
                </button>
            </div>
            <div className="calendarViewDisplay">
                {calendarView === "month" && <div>Month View</div>}
                {calendarView === "week" && <div>Week View</div>}
                {calendarView === "day" && <div>Day View</div>}
            </div>
        </div>
    );
};

export default CalendarView;