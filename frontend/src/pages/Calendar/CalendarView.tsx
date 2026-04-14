//import React from "react";
import React, {useState} from "react";
import { useLocation } from "react-router-dom";
import "./calendar.css";
import MonthView from "./MonthView";
import WeekCalendar from "./WeekView";
import DayView from "./DayView";
import BackButton from "../../components/BackButton";

//(Alex) essentually a container to hold all of the views and allow switching with the buttons from one of our frs
//doesnt currently adapt to events or tasks as database was not complete by day of demo
const CalendarView = () => {
    const location = useLocation();

    // state allows month, week, day view, efaults to month
    const [calendarView, setCalendarView] = useState<"month" | "week" | "day">(() => {
        if (location.state && location.state.returnTo) {
            return location.state.returnTo;
        }
        return "month";
    });
    const hours = Array.from({ length: 12}, (_, i) => i + 8);

    return (
        <div className="calendarContainer">
            {/*
            <div className="back-button-wrapper">
                <BackButton />
            </div>
            */}
            <div className="calendarView">
                <div className="calendarButtons">
                    {/* buttons to switch views*/}

                <button
                    className={calendarView === "month" ? "active" : ""} onClick={() => setCalendarView("month")}>
                    Month
                </button>
                <button
                    className={calendarView === "week" ? "active" : ""} onClick={() => setCalendarView("week")}>
                    Week
                </button>
                <button className={calendarView === "day" ? "active" : ""} onClick={() => setCalendarView("day")}>
                    Day
                </button>
                </div>
                <div className="calendarViewDisplay">
                    {calendarView === "month" && <div>
                        <MonthView />
                    </div>}
                    {calendarView === "week" && <div>
                        <WeekCalendar />
                    </div>}
                    {calendarView === "day" && <div>
                        <DayView hideBackButton={true} />
                    </div>}
                </div>
            </div>
        </div>
    );
};

export default CalendarView;