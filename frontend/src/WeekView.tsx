import React from "react";
//TEMPORARY TEMPLATE NOT REPRESENTATIVE OF INTENDED IMPLIMENTATION SIMPLY VISUAL FOR DEMO
//NOT OUR CODE
// This example uses the *current week* based on today's date.

const WeekView: React.FC = () => {
  const today = new Date();

  // Determine first day of the week (Sunday-based)
  const firstDayOfWeek = new Date(today);
  firstDayOfWeek.setDate(today.getDate() - today.getDay());

  // Generate the 7 days of the week
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(firstDayOfWeek);
    day.setDate(firstDayOfWeek.getDate() + i);
    return day;
  });

  return (
    <div style={{ padding: "20px" }}>
      <h2>Week View</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "5px",
          border: "1px solid #ccc",
          padding: "10px",
          background: "#fafafa",
        }}
      >
        {days.map((day, index) => (
          <div
            key={index}
            style={{
              border: "1px solid #ccc",
              minHeight: "80px",
              padding: "10px",
              background: "white",
            }}
          >
            <strong>
              {day.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeekView;
