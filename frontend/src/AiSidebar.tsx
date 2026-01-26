import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./aisidebar.css";

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

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Placeholder AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "This is a placeholder response. AI integration coming next!",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 500);

    setInputMessage("");
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
                  <p>{msg.text}</p>
                </div>
                <span className="message-time">
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>

          <div className="input-container">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about Canvas, Gmail, or Calendar..."
              rows={2}
            />
            <button onClick={handleSendMessage} disabled={!inputMessage.trim()}>
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AISidebar;
