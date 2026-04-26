import React, {useState} from "react";
import { useLocation } from "react-router-dom";
import "./calendar.css";
import MonthView from "./MonthView";
import WeekCalendar from "./WeekView";
import DayView from "./DayView";
import BackButton from "../../components/BackButton";

const CalendarView = () => {
    const location = useLocation();

    // state allows month, week, day view, defaults to month
    const [calendarView, setCalendarView] = useState<"month" | "week" | "day">(() => {
        if (location.state && location.state.returnTo) {
            return location.state.returnTo;
        }
        return "month";
    });

    return (
        <div className="calendarContainer">
            <div className="calendarView">
                <div className="calendarButtons">
                    <button
                        className={calendarView === "month" ? "active" : ""} onClick={() => setCalendarView("month")}>
                        Month
                    </button>
                    <button
                        className={calendarView === "week" ? "active" : ""} onClick={() => setCalendarView("week")}>
                        Week
                    </button>
                    <button 
                        className={calendarView === "day" ? "active" : ""} onClick={() => setCalendarView("day")}>
                        Day
                    </button>
                </div>
                <div className="calendarViewDisplay">
                    {/* Removed the extra <div> wrappers here so flexbox works */}
                    {calendarView === "month" && <MonthView />}
                    {calendarView === "week" && <WeekCalendar />}
                    {calendarView === "day" && <DayView hideBackButton={true} />}
                </div>
            </div>
        </div>
    );
};

export default CalendarView;