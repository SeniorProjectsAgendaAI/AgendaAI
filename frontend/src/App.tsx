import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Authenticator } from '@aws-amplify/ui-react';
import api from "./services/api";

const Home = ({ signOut, user }: { signOut?: () => void; user?: any }) => {
  const [health, setHealth] = useState("Checking API...");

  useEffect(() => {
    // In a real app, you'd get the JWT token from 'user' and pass it to the backend
    api.get("/health")
      .then((res) => setHealth(res.data.status))
      .catch(() => setHealth("API not reachable"));
  }, []);

  return (
    <div>
      <h1>AgendaAI</h1>
      <p>Welcome, {user?.username}</p>
      <p>Backend health: {health}</p>
      <button onClick={signOut}>Logout</button>
    </div>
  );
};

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
          </Routes>
        </Router>
      )}
    </Authenticator>
  );
}

export default App;
