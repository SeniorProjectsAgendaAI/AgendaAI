import React from "react";
//TEMPORARY TEMPLATE NOT REPRESENTATIVE OF INTENDED IMPLIMENTATION SIMPLY VISUAL FOR DEMO
const MonthView = () => {
  // Get today's date
  const today = new Date();

  // Extract month and year
  const year = today.getFullYear();
  const month = today.getMonth(); // 0 = Jan, 1 = Feb...

  // First day of this month
  const firstDay = new Date(year, month, 1);

  // Last day of this month
  const lastDay = new Date(year, month + 1, 0);

  const daysInMonth = lastDay.getDate(); // 28-31
  const startOffset = firstDay.getDay(); // 0=Sun, 1=Mon...

  // Build an array for the calendar cells
  const cells: (number | null)[] = [];

  // Add empty boxes before day 1
  for (let i = 0; i < startOffset; i++) {
    cells.push(null);
  }

  // Add actual days (1 → 28-31)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>
        {today.toLocaleString("default", { month: "long" })} {year}
      </h2>

      {/* Days of the week */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          textAlign: "center",
          fontWeight: "bold",
          marginTop: "10px",
        }}
      >
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "8px",
          marginTop: "10px",
        }}
      >
        {cells.map((day, i) => (
          <div
            key={i}
            style={{
              height: "60px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              padding: "5px",
              textAlign: "right",
              background: day === null ? "#f4f4f4" : "white",
            }}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthView;
