import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import api from "./services/api";

const Home = () => {
  const [health, setHealth] = useState("Checking API...");

  useEffect(() => {
    api.get("/health")
      .then((res) => setHealth(res.data.status))
      .catch(() => setHealth("API not reachable"));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div>
      <h1>AgendaAI</h1>
      <p>Backend health: {health}</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

const PrivateRoute = ({ children }: { children: React.ReactElement }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
