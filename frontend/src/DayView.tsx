//bini work + template
import React, { useState } from "react";
import Sidebar from "./Sidebar";
import "./dayview.css";
import BackButton from "./components/BackButton";

interface Event {
  id: number;
  title: string;
  time: string;
  duration: number;
}

// const CreateEvent = () => {
//   return (
//     <div className="page-container">
//       <BackButton />
//       <h1> Create New Event </h1>
//     </div>
//   );
// };

const DayView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([
    { id: 1, title: "Team Meeting", time: "09:00", duration: 60 },
    { id: 2, title: "Project Review", time: "11:30", duration: 90 },
    { id: 3, title: "Lunch Break", time: "13:00", duration: 60 },
  ]);

  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="dayViewContainer">
      {/* <Sidebar /> */}
      <div className="dayViewContent">
        <div className="dayViewHeader">
          <div className="back-button-wrapper">
            <BackButton />
          </div>
          <h2>Day View</h2>
          <div className="dateNavigation">
            <button onClick={goToPreviousDay}>← Previous</button>
            <button onClick={goToToday}>Today</button>
            <button onClick={goToNextDay}>Next →</button>
          </div>
          <div className="currentDate">{formatDate(currentDate)}</div>
        </div>

        <div className="daySchedule">
          <div className="timeColumn">
            {hours.map((hour) => (
              <div key={hour} className="timeSlot">
                {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? "PM" : "AM"}
              </div>
            ))}
          </div>
          <div className="eventsColumn">
            {hours.map((hour) => (
              <div key={hour} className="hourBlock">
                {events
                  .filter((event) => {
                    const eventHour = parseInt(event.time.split(":")[0]);
                    return eventHour === hour;
                  })
                  .map((event) => (
                    <div key={event.id} className="eventBlock">
                      <div className="eventTitle">{event.title}</div>
                      <div className="eventTime">{event.time}</div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayView;
