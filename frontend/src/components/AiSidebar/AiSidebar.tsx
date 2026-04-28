//Biniam Gashaw
//AI Sidebar Component for interacting with AI assistant
//Reference: https://coreui.io/react/docs/templates/admin-dashboard/
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { fetchAuthSession } from "aws-amplify/auth";
import { BsStars } from "react-icons/bs";
import { FiMic, FiSend } from "react-icons/fi";
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

//voice 
type VoiceInputMode = "dictate" | "voice";

const DEFAULT_VOICE_LEVELS = Array.from({ length: 14 }, () => 0.12);
const AUTO_SEND_SILENCE_MS = 1200;
const MIN_AUTO_SEND_LENGTH = 2;

const AISidebar: React.FC<AISidebarProps> = ({
  isOpen: propIsOpen,
  onToggle,
  fullScreen = false,
  onAgentResponse,
}) => {
  const { triggerRefresh } = useTaskEvents();
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
  const [inputMode, setInputMode] = useState<VoiceInputMode>("dictate");
  const [isLoading, setIsLoading] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [dictationError, setDictationError] = useState("");
  const [voiceLevels, setVoiceLevels] = useState(DEFAULT_VOICE_LEVELS);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const dictationActiveRef = useRef(false);
  const baseTranscriptRef = useRef("");
  const inputModeRef = useRef<VoiceInputMode>("dictate");
  const inputMessageRef = useRef("");

  const syncInputMessage = useCallback((nextMessage: string) => {
    // Keep the React state and mutable ref in sync for speech callbacks.
    inputMessageRef.current = nextMessage;
    setInputMessage(nextMessage);
  }, []);

  const clearSilenceTimeout = useCallback(() => {
    // Cancel any pending auto-send timer before restarting voice capture.
    if (silenceTimeoutRef.current !== null) {
      window.clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, []);

  const setVoiceInputMode = useCallback((nextMode: VoiceInputMode) => {
    // Track the selected mic behavior in both state and refs for async handlers.
    inputModeRef.current = nextMode;
    setInputMode(nextMode);
  }, []);

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
    clearSilenceTimeout();
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
  }, [clearSilenceTimeout, stopMicVisualizer]);

  useEffect(() => {
    return () => {
      stopDictation();
    };
  }, [stopDictation]);

  useEffect(() => {
    inputModeRef.current = inputMode;
  }, [inputMode]);

  const handleSendMessage = useCallback(
    async (messageOverride?: string) => {
      // Send either the live transcript or the typed message through the existing chat API.
      const messageToSend = (messageOverride ?? inputMessageRef.current).trim();
      if (!messageToSend || isLoading) return;
      if (dictationActiveRef.current) {
        stopDictation();
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        text: messageToSend,
        isUser: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      syncInputMessage("");
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
          { message: messageToSend },
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
    },
    [isLoading, onAgentResponse, stopDictation, syncInputMessage, triggerRefresh],
  );

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

  const startDictation = useCallback(async (mode?: VoiceInputMode) => {
    // Start browser speech recognition and branch to dictate or auto-send voice behavior.
    const SpeechRecognitionConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const activeMode = mode ?? inputModeRef.current;

    if (!SpeechRecognitionConstructor) {
      setDictationError("Voice dictation works best in Google Chrome.");
      return;
    }

    setDictationError("");
    clearSilenceTimeout();
    baseTranscriptRef.current = inputMessageRef.current.trim()
      ? `${inputMessageRef.current.trim()} `
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
        clearSilenceTimeout();
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

        const nextTranscript =
          `${baseTranscriptRef.current}${finalTranscript}${interimTranscript}`.trimStart();
        syncInputMessage(nextTranscript);

        if (
          activeMode === "voice" &&
          finalTranscript.trim() &&
          nextTranscript.trim().length >= MIN_AUTO_SEND_LENGTH
        ) {
          silenceTimeoutRef.current = window.setTimeout(() => {
            const transcriptToSend = inputMessageRef.current.trim();
            if (transcriptToSend.length < MIN_AUTO_SEND_LENGTH || isLoading) {
              return;
            }
            stopDictation();
            void handleSendMessage(transcriptToSend);
          }, AUTO_SEND_SILENCE_MS);
        }
      };

      recognition.onerror = (event) => {
        if (
          event.error === "not-allowed" ||
          event.error === "service-not-allowed"
        ) {
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
  }, [
    clearSilenceTimeout,
    handleSendMessage,
    isLoading,
    startMicVisualizer,
    stopDictation,
    syncInputMessage,
  ]);

  const getAuthToken = async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() ?? null;
    } catch (error) {
      console.error("Failed to get auth token:", error);
      return null;
    }
  };

  const handleVoiceModeAction = (mode: VoiceInputMode) => {
    // Reuse the same mic pipeline but change what happens when the user finishes speaking.
    if (isLoading) return;

    const wasDictating = dictationActiveRef.current;
    const previousMode = inputModeRef.current;
    setVoiceInputMode(mode);

    if (wasDictating) {
      const transcriptToSend = inputMessageRef.current.trim();
      stopDictation();

      if (previousMode === mode && mode === "voice") {
        if (transcriptToSend.length >= MIN_AUTO_SEND_LENGTH) {
          void handleSendMessage(transcriptToSend);
        }
        return;
      }

      if (previousMode !== mode) {
        window.setTimeout(() => {
          void startDictation(mode);
        }, 0);
      }
      return;
    }

    void startDictation(mode);
  };

  const handleEndVoiceMode = () => {
    // Stop listening and return the composer to dictate mode without sending.
    stopDictation();
    setVoiceInputMode("dictate");
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
            {isOpen ? "↓" : "↑"}
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
                  <div className="thinking-dots">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="input-container">
            <div className="dictation-input-area">
              <div className="composer-shell">
                <textarea
                  value={inputMessage}
                  onChange={(e) => syncInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    inputMode === "voice"
                      ? "Speak your question or type here..."
                      : "Dictate into the box or type here..."
                  }
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
                    <span className="voice-status">
                      {inputMode === "voice"
                        ? "Listening for your question..."
                        : "Dictating into the message box..."}
                    </span>
                  </div>
                )}
                <div className="composer-footer">
                  <div className="voice-mode-group">
                    <button
                      type="button"
                      className={`mode-icon-btn inline ${inputMode === "dictate" ? "active" : ""} ${isDictating && inputMode === "dictate" ? "recording" : ""}`}
                      onClick={() => handleVoiceModeAction("dictate")}
                      disabled={isLoading}
                      aria-pressed={inputMode === "dictate"}
                      title={
                        isDictating && inputMode === "dictate"
                          ? "Stop dictation"
                          : "Dictate mode"
                      }
                    >
                      <FiMic />
                    </button>
                    <button
                      type="button"
                      className={`mode-icon-btn inline ${inputMode === "voice" ? "active" : ""} ${isDictating && inputMode === "voice" ? "recording" : ""}`}
                      onClick={() => handleVoiceModeAction("voice")}
                      disabled={isLoading}
                      aria-pressed={inputMode === "voice"}
                      title={
                        isDictating && inputMode === "voice"
                          ? "Stop and send voice message"
                          : "Voice mode"
                      }
                    >
                      <BsStars />
                    </button>
                    <span className="voice-mode-caption">
                      {inputMode === "voice"
                        ? "Voice sends automatically when you pause."
                        : "Dictate fills the box so you can edit first."}
                    </span>
                  </div>
                  <button
                    className={`send-btn ${inputMode === "voice" ? "end-btn" : ""}`}
                    onClick={
                      inputMode === "voice"
                        ? handleEndVoiceMode
                        : () => void handleSendMessage()
                    }
                    disabled={
                      inputMode === "voice"
                        ? isLoading
                        : !inputMessage.trim() || isLoading
                    }
                    title={inputMode === "voice" ? "End voice mode" : "Send message"}
                  >
                    {inputMode === "voice" ? (
                      <span>End</span>
                    ) : (
                      <>
                        <FiSend />
                        <span>{isLoading ? "Sending..." : "Send"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              {dictationError && (
                <div className="dictation-error">{dictationError}</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AISidebar;
