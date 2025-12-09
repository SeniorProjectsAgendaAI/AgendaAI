import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AxiosResponse } from "axios";
import Dashboard from "./Dashboard";
import TaskPanel from "./TaskPanel";
import CalendarView from "./Calendarview";
import { Link } from "react-router-dom";

import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import api from "./services/api";

const Home = ({ signOut, user }: { signOut?: () => void; user?: any }) => {
  const [health, setHealth] = useState("Checking API...");

  useEffect(() => {
    api
      .get("/health")
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
    </div>
  );
};

function App() {
  return (
    <Authenticator socialProviders={["google"]}>
      {({ signOut, user }) => (
        <Router>
          <Routes>
            <Route path="/" element={<Home signOut={signOut} user={user} />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/taskpanel" element={<TaskPanel />} />
            <Route path="/calendarview" element={<CalendarView />} />
          </Routes>
        </Router>
      )}
    </Authenticator>
  );
}

export default App;
