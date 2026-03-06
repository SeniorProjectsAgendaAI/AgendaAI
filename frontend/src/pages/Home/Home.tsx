import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AxiosResponse } from "axios";
import api from "../../services/api";

const Home = ({ signOut, user }: { signOut?: () => void; user?: any }) => {
  const [health, setHealth] = useState("Checking API...");

  useEffect(() => {
    api
      .get("/health")
      .then((res: AxiosResponse) => setHealth(res.data.status))
      .catch(() => setHealth("API not reachable"));
  }, []);

  return (
    <div className="App">
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
      <Link to="/aisidebar">
        <button>Go to the AgendaAI Assistant</button>
      </Link>
      <Link to="/profile">
        <button>Go to Profile</button>
      </Link>
    </div>
  );
};

export default Home;
