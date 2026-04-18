//Biniam Gashaw
//AI Sidebar Component for interacting with AI assistant
//Reference: https://coreui.io/react/docs/templates/admin-dashboard/
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { fetchAuthSession } from "aws-amplify/auth";
import api from "../../services/api";
import { useTaskEvents } from "../../contexts/TaskEventContext";
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
  onAgentResponse?: () => void;
}

const DEFAULT_VOICE_LEVELS = Array.from({ length: 14 }, () => 0.12);

const AISidebar: React.FC<AISidebarProps> = ({
  isOpen: propIsOpen,
  onToggle,
  fullScreen = false,
  onAgentResponse,
}) => {
  const { triggerRefresh } = useTaskEvents();
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
  const [searchParams] = useSearchParams();

  // NEW STATE: Tracks if the connections panel is expanded
  const [showConnections, setShowConnections] = useState(false);

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
  const [isDictating, setIsDictating] = useState(false);
  const [dictationError, setDictationError] = useState("");
  const [voiceLevels, setVoiceLevels] = useState(DEFAULT_VOICE_LEVELS);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dictationActiveRef = useRef(false);
  const baseTranscriptRef = useRef("");

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

  const stopMicVisualizer = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => undefined);
    }
    audioContextRef.current = null;
    setVoiceLevels(DEFAULT_VOICE_LEVELS);
  }, []);

  const stopDictation = useCallback(() => {
    dictationActiveRef.current = false;
    setIsDictating(false);

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onresult = null;
      try {
        recognitionRef.current.stop();
      } catch {
        recognitionRef.current.abort();
      }
      recognitionRef.current = null;
    }

    stopMicVisualizer();
  }, [stopMicVisualizer]);

  useEffect(() => {
    return () => {
      stopDictation();
    };
  }, [stopDictation]);

  const startMicVisualizer = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone access is not available in this browser.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AudioContextConstructor =
      window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextConstructor();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.78;
    source.connect(analyser);

    mediaStreamRef.current = stream;
    audioContextRef.current = audioContext;

    const updateVoiceLevels = () => {
      analyser.getByteFrequencyData(dataArray);
      const barCount = DEFAULT_VOICE_LEVELS.length;
      const bucketSize = Math.max(1, Math.floor(dataArray.length / barCount));
      const time = performance.now() / 180;
      const nextLevels = Array.from({ length: barCount }, (_, index) => {
        const start = index * bucketSize;
        const end = Math.min(start + bucketSize, dataArray.length);
        let total = 0;
        for (let i = start; i < end; i += 1) {
          total += dataArray[i];
        }
        const average = total / Math.max(1, end - start);
        const idleWave = 0.18 + Math.sin(time + index * 0.7) * 0.08;
        const voiceBoost = average / 125;
        return Math.max(0.12, Math.min(1, idleWave + voiceBoost));
      });

      setVoiceLevels(nextLevels);
      animationFrameRef.current =
        window.requestAnimationFrame(updateVoiceLevels);
    };

    updateVoiceLevels();
  }, []);

  const startDictation = useCallback(async () => {
    const SpeechRecognitionConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setDictationError("Voice dictation works best in Google Chrome.");
      return;
    }

    setDictationError("");
    baseTranscriptRef.current = inputMessage.trim()
      ? `${inputMessage.trim()} `
      : "";

    try {
      await startMicVisualizer();

      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        dictationActiveRef.current = true;
        setIsDictating(true);
      };

      recognition.onresult = (event) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = 0; i < event.results.length; i += 1) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += `${transcript.trim()} `;
          } else {
            interimTranscript += transcript;
          }
        }

        setInputMessage(
          `${baseTranscriptRef.current}${finalTranscript}${interimTranscript}`.trimStart(),
        );
      };

      recognition.onerror = (event) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setDictationError("Microphone permission is blocked for this site.");
        } else if (event.error !== "no-speech") {
          setDictationError("Dictation stopped. Please try again.");
        }
        stopDictation();
      };

      recognition.onend = () => {
        if (!dictationActiveRef.current) return;
        try {
          recognition.start();
        } catch {
          stopDictation();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error("Failed to start dictation", error);
      setDictationError("Could not access the microphone.");
      stopDictation();
    }
  }, [inputMessage, startMicVisualizer, stopDictation]);

  const toggleDictation = () => {
    if (isDictating) {
      stopDictation();
      return;
    }
    startDictation();
  };

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
    if (dictationActiveRef.current) {
      stopDictation();
    }

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

      const agentUrl =
        process.env.REACT_APP_AGENT_URL || "http://localhost:8001";
      const response = await axios.post(
        `${agentUrl}/chat`,
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
      triggerRefresh();
      onAgentResponse?.();
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text:
          error.response?.data?.detail ||
          "AI assistant is temporarily unavailable. Please try again later.",
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
        
        {/*Title is now a clickable toggle button */}
        <h3 
          onClick={() => setShowConnections(!showConnections)}
          style={{ 
            cursor: "pointer", 
            display: "flex", 
            alignItems: "center", 
            gap: "8px",
            userSelect: "none"
          }}
          title="Toggle Connected Services"
        >
          AI Assistant
          <span style={{ fontSize: "0.7em", opacity: 0.6 }}>
            {showConnections ? "▲" : "▼"}
          </span>
        </h3>

        {!fullScreen && (
          <button className="toggle-btn" onClick={handleToggle}>
            {isOpen ? "↓" : "↑"}
          </button>
        )}
      </div>

      {(isOpen || fullScreen) && (
        <>
          {/* MODIFIED: Connections show based on the toggle state, regardless of screen size */}
          {showConnections && (
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
          )}

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
            <div className="dictation-input-area">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about Canvas, Gmail, or Calendar..."
                rows={2}
              />
              {isDictating && (
                <div className="voice-visualizer" aria-label="Listening">
                  <div className="voice-bars" aria-hidden="true">
                    {voiceLevels.map((level, index) => (
                      <span
                        key={index}
                        className="voice-bar"
                        style={{ height: `${Math.round(5 + level * 26)}px` }}
                      />
                    ))}
                  </div>
                  <span className="voice-status">Listening...</span>
                </div>
              )}
              {dictationError && (
                <div className="dictation-error">{dictationError}</div>
              )}
            </div>
            <button
              type="button"
              className={`mic-btn ${isDictating ? "recording" : ""}`}
              onClick={toggleDictation}
              disabled={isLoading}
              aria-pressed={isDictating}
              title={isDictating ? "Stop dictation" : "Start dictation"}
            >
              {isDictating ? "Stop" : "Mic"}
            </button>
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
