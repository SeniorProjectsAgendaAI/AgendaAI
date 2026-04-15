//Biniam Gashaw
//AI Sidebar Component for interacting with AI assistant
//Reference: https://coreui.io/react/docs/templates/admin-dashboard/
import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { fetchAuthSession } from "aws-amplify/auth";
import api from "../../services/api";
import "./aisidebar.css";

//markdown-to-HTML converter
const formatMessage = (text: string) => {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") //Bold
    .replace(/^\* (.+)$/gm, "<li>$1</li>") //Bullet points
    .replace(/<li>/g, "<ul><li>")
    .replace(/<\/li>/g, "</li></ul>") //Wrap lists
    .replace(/<\/ul><ul>/g, "") //Merge consecutive lists
    .replace(/\n/g, "<br/>"); //Line breaks
};

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface AISidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
  fullScreen?: boolean;
}

const AISidebar: React.FC<AISidebarProps> = ({
  isOpen: propIsOpen,
  onToggle,
  fullScreen = false,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
  const [searchParams] = useSearchParams();

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I can help you with Canvas, Gmail, and Google Calendar.",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] =
    useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [isCanvasConnected, setIsCanvasConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);

  useEffect(() => {
    checkGoogleCalendarConnection();
    checkGmailConnection();
    checkCanvasConnection();

    // Handle OAuth callback
    if (searchParams.get("google_calendar_connected") === "true") {
      checkGoogleCalendarConnection();
    }
    if (searchParams.get("gmail_connected") === "true") {
      checkGmailConnection();
    }
    if (searchParams.get("canvas_connected") === "true") {
      checkCanvasConnection();
    }
  }, [searchParams]);

  const getAuthToken = async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() ?? null;
    } catch (error) {
      console.error("Failed to get auth token:", error);
      return null;
    }
  };

  const checkGoogleCalendarConnection = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error("No auth token available");
        return;
      }
      const response = await api.get("/oauth/google-calendar/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsGoogleCalendarConnected(response.data.connected);
    } catch (error) {
      console.error("Failed to check Google Calendar connection:", error);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error("No auth token available");
        return;
      }
      const response = await api.get("/oauth/google-calendar/authorize", {
        headers: { Authorization: `Bearer ${token}` },
      });
      window.location.href = response.data.authorization_url;
    } catch (error) {
      console.error("Failed to initiate Google Calendar connection:", error);
    }
  };

  const handleDisconnectGoogleCalendar = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error("No auth token available");
        return;
      }
      await api.delete("/oauth/google-calendar/disconnect", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsGoogleCalendarConnected(false);
    } catch (error) {
      console.error("Failed to disconnect Google Calendar:", error);
    }
  };

  const checkGmailConnection = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error("No auth token available");
        return;
      }
      const response = await api.get("/oauth/gmail/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsGmailConnected(response.data.connected);
    } catch (error) {
      console.error("Failed to check Gmail connection:", error);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error("No auth token available");
        return;
      }
      const response = await api.get("/oauth/gmail/authorize", {
        headers: { Authorization: `Bearer ${token}` },
      });
      window.location.href = response.data.authorization_url;
    } catch (error) {
      console.error("Failed to initiate Gmail connection:", error);
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error("No auth token available");
        return;
      }
      await api.delete("/oauth/gmail/disconnect", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsGmailConnected(false);
    } catch (error) {
      console.error("Failed to disconnect Gmail:", error);
    }
  };

  const checkCanvasConnection = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error("No auth token available");
        return;
      }
      const response = await api.get("/oauth/canvas/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsCanvasConnected(response.data.connected);
    } catch (error) {
      console.error("Failed to check Canvas connection:", error);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleConnectCanvas = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error("No auth token available");
        return;
      }
      const response = await api.get("/oauth/canvas/authorize", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Redirect to Canvas login page
      window.location.href = response.data.authorization_url;
    } catch (error) {
      console.error("Failed to initiate Canvas connection:", error);
    }
  };

  const handleDisconnectCanvas = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error("No auth token available");
        return;
      }
      await api.delete("/oauth/canvas/disconnect", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsCanvasConnected(false);
    } catch (error) {
      console.error("Failed to disconnect Canvas:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    try {
      const token = await getAuthToken();
      if (!token) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: "Please log in to use the AI assistant.",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setIsLoading(false);
        return;
      }

      const response = await axios.post(
        "http://localhost:8001/chat",
        { message: currentInput },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.response,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text:
          error.response?.data?.detail ||
          "Agent server not running. Start it with: cd mcp-servers/agent && uvicorn server:app --reload --port 8001",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      className={`ai-sidebar ${fullScreen ? "fullscreen" : ""} ${isOpen ? "open" : "closed"}`}
    >
      <div className="sidebar-header">
        {fullScreen && (
          <Link to="/" className="back-btn">
            ← Back
          </Link>
        )}
        <h3>AI Assistant</h3>
        {!fullScreen && (
          <button className="toggle-btn" onClick={handleToggle}>
            {isOpen ? "←" : "→"}
          </button>
        )}
      </div>

      {(isOpen || fullScreen) && (
        <>
          <div className="connections-section">
            <h4>Connected Services</h4>
            <div className="connection-item">
              <span>Google Calendar</span>
              {isCheckingConnection ? (
                <span className="connection-status">Loading...</span>
              ) : isGoogleCalendarConnected ? (
                <button
                  className="disconnect-btn"
                  onClick={handleDisconnectGoogleCalendar}
                >
                  Disconnect
                </button>
              ) : (
                <button
                  className="connect-btn"
                  onClick={handleConnectGoogleCalendar}
                >
                  Connect
                </button>
              )}
            </div>
            <div className="connection-item">
              <span>Gmail</span>
              {isCheckingConnection ? (
                <span className="connection-status">Loading...</span>
              ) : isGmailConnected ? (
                <button
                  className="disconnect-btn"
                  onClick={handleDisconnectGmail}
                >
                  Disconnect
                </button>
              ) : (
                <button className="connect-btn" onClick={handleConnectGmail}>
                  Connect
                </button>
              )}
            </div>
            <div className="connection-item">
              <span>Canvas</span>
              {isCheckingConnection ? (
                <span className="connection-status">Loading...</span>
              ) : isCanvasConnected ? (
                <button
                  className="disconnect-btn"
                  onClick={handleDisconnectCanvas}
                >
                  Disconnect
                </button>
              ) : (
                <button className="connect-btn" onClick={handleConnectCanvas}>
                  Connect
                </button>
              )}
            </div>
          </div>

          <div className="messages-container">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`message ${msg.isUser ? "user" : "ai"}`}
              >
                <div className="message-content">
                  {msg.isUser ? (
                    <p>{msg.text}</p>
                  ) : (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: formatMessage(msg.text),
                      }}
                    />
                  )}
                </div>
                <span className="message-time">
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
            {isLoading && (
              <div className="message ai">
                <div className="message-content">
                  <p>Thinking...</p>
                </div>
              </div>
            )}
          </div>

          <div className="input-container">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about Canvas, Gmail, or Calendar..."
              rows={2}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
            >
              {isLoading ? "Sending..." : "Send"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AISidebar;
