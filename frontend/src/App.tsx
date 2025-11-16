import { useEffect, useState } from "react";

function App() {
  const [health, setHealth] = useState("Checking API...");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/health")
      .then((res) => res.json())
      .then((data) => setHealth(data.status))
      .catch(() => setHealth("API not reachable"));
  }, []);

  return (
    <div>
      <h1>AgendaAI</h1>
      <p>Backend health: {health}</p>
    </div>
  );
}

export default App;
