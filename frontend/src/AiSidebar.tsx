//Biniam Gashaw
//AI Sidebar Component for interacting with AI assistant
//Reference: https://coreui.io/react/docs/templates/admin-dashboard/
import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
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
      const response = await axios.post("http://localhost:8001/chat", {
        message: currentInput,
      });

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
