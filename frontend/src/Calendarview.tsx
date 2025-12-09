import React, { useState } from "react";
import "./calendar.css";

const CalendarView = () => {
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day">(
    "month",
  );
  const hours = Array.from({ length: 12 }, (_, i) => i + 8);

  return (
    <div className="calendarContainer">
      <div className="calendarView">
        <div className="calendarButtons">
          <button onClick={() => setCalendarView("month")}>Month</button>
          <button onClick={() => setCalendarView("week")}>Week</button>
          <button onClick={() => setCalendarView("day")}>Day</button>
        </div>
        <div className="calendarViewDisplay">
          {calendarView === "month" && <div>Month View</div>}
          {calendarView === "week" && <div>Week View</div>}
          {calendarView === "day" && (
            <div>
              {hours.map((hour) => (
                <div key={hour} className="timeSlot">
                  {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? "PM" : "AM"}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
