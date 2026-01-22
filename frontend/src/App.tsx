import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AxiosResponse } from "axios";
import Dashboard from "./Dashboard";
import TaskPanel from "./TaskPanel";
import DayView from "./DayView";
import WeekView from "./WeekView";
import MonthView from "./MonthView";
import CalendarView from "./Calendarview";
import { Link } from "react-router-dom";


import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import api from "./services/api";


const Home = ({ signOut, user }: { signOut?: () => void; user?: any }) => {
  const [health, setHealth] = useState("Checking API...");
  

  useEffect(() => {
    api.get("/health")
      .then((res: AxiosResponse) => setHealth(res.data.status))
      .catch(() => setHealth("API not reachable"));
  }, []);

  return (
    <div>
      <h1>AgendaAI</h1>
      <p>Welcome, {user?.signInDetails?.loginId}</p>
      <p>Backend health: {health}</p>
      <button onClick={signOut}>Logout</button>
      <Link to="/dashboard">
        <button>Go to Dashboard</button>
      </Link>
      <Link to="/taskpanel">
        <button>Go to Task Panel</button>
      </Link>
      <Link to="/calendarview">
        <button>Go to Calendar View</button>
      </Link>
      <Link to="/dayview">
        <button>Go to Day View</button>
      </Link>
      <Link to="/weekview">
        <button>Go to Week View</button>
      </Link>
      <Link to="/monthview">
        <button>Go to Month View</button>
      </Link>
    </div>
    
  );
};
// (Ankush) implemented socialProviders prop for Google OAuth as well as the login page UI for users to be able to login via Google OAuth or email/password
// (Alex) Added some buttons to allow for easier navigation to independently view components aswell as added each component to the router 
function App() {
  return (
    <Authenticator socialProviders={['google']}>  
      {({ signOut, user }) => (
        <Router>
          <Routes>
            <Route
              path="/"
              element={<Home signOut={signOut} user={user} />}
            />
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />
            <Route
              path="/taskpanel"
              element={<TaskPanel />}
            />
            <Route
              path="/calendarview"
              element={<CalendarView />}
            />
            <Route
              path="/dayview"
              element={<DayView />}
            />
            <Route
              path="/weekview"
              element={<WeekView />}
            />
            <Route
              path="/monthview"
              element={<MonthView />}
            />
          </Routes>
        </Router>
      )}
    </Authenticator>
  );
}

export default App;
