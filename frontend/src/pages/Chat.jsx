import { useState, useRef, useEffect } from "react";

const API = "http://localhost:8000";

function SourceBadge({ source }) {
  const label = source.class_name
    ? `${source.class_name}.${source.label}`
    : source.label;
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: "#141414",
      border: "1px solid #2a2a2a",
      borderRadius: 9999,
      padding: "4px 12px",
      fontSize: 12,
      color: "#9e9ea0",
      fontWeight: 500,
      marginRight: 6,
      marginBottom: 6,
      transition: "border-color 0.15s, color 0.15s",
      cursor: "default",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = "#4b4b4d"; e.currentTarget.style.color = "#ffffff"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.color = "#9e9ea0"; }}
    >
      <span style={{ color: "#3a3a3a", fontSize: 11 }}>↗</span>
      <span>{label}</span>
      <span style={{ color: "#3a3a3a" }}>·</span>
      <span style={{ color: "#3a3a3a", fontSize: 11 }}>L{source.start_line}</span>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      padding: "24px 0",
      borderBottom: "1px solid #141414",
      display: "flex",
      gap: 16,
      alignItems: "flex-start",
      animation: "msgIn 0.35s cubic-bezier(0.22,1,0.36,1) both",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: isUser ? "#ffffff" : "#1a1a1a",
        border: isUser ? "none" : "1px solid #2a2a2a",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 700,
        color: isUser ? "#111111" : "#4b4b4d",
        flexShrink: 0, letterSpacing: "0.5px",
      }}>
        {isUser ? "YOU" : "AI"}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 15, color: isUser ? "#cccccc" : "#e0e0e0",
          lineHeight: 1.75, whiteSpace: "pre-wrap",
          marginBottom: msg.sources && msg.sources.length > 0 ? 16 : 0,
        }}>
          {msg.content}
        </div>
        {msg.sources && msg.sources.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, color: "#3a3a3a", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>
              Sources
            </div>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {msg.sources.map((s, i) => <SourceBadge key={i} source={s} />)}
            </div>
          </div>
        )}
        {msg.loading && (
          <div style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 8 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: "50%", background: "#3a3a3a",
                animation: `dot 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Chat({ repoName, onBack }) {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: `Codebase indexed. Ask anything about ${repoName} — I'll cite the exact file and function my answer comes from.`,
    sources: [],
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;
    setInput("");
    setMessages(prev => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "", sources: [], loading: true },
    ]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_name: repoName, question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Something went wrong");
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: data.answer, sources: data.sources || [], loading: false };
        return updated;
      });
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: `Error: ${err.message}`, sources: [], loading: false };
        return updated;
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const SUGGESTIONS = [
    "How is this library structured?",
    "What are the main classes?",
    "How are sessions handled?",
    "How does error handling work?",
  ];

  return (
    <div style={{
      background: "#0a0a0a", minHeight: "100vh",
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dot {
          0%, 100% { opacity: 0.2; transform: scale(0.7); }
          50%       { opacity: 1;   transform: scale(1); }
        }
        @keyframes shimmer {
          from { transform: translateX(-100%) skewX(-12deg); }
          to   { transform: translateX(220%) skewX(-12deg); }
        }
        .chip {
          background: #141414;
          border: 1px solid #2a2a2a;
          border-radius: 9999px;
          padding: 8px 16px;
          font-size: 13px;
          color: #707072;
          cursor: pointer;
          font-weight: 500;
          transition: border-color 0.15s, color 0.15s, background 0.15s, transform 0.15s;
          font-family: inherit;
        }
        .chip:hover { border-color: #ffffff; color: #ffffff; background: #1a1a1a; transform: scale(1.04); }
        .chip:active { transform: scale(0.97); }
        .send-btn {
          position: relative;
          overflow: hidden;
          transition: transform 0.12s ease, box-shadow 0.2s ease;
        }
        .send-btn::after {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 40%;
          height: 100%;
          background: rgba(0,0,0,0.12);
          transform: translateX(-100%) skewX(-12deg);
          pointer-events: none;
        }
        .send-btn:hover:not(:disabled)::after { animation: shimmer 0.5s ease forwards; }
        .send-btn:hover:not(:disabled) { box-shadow: 0 0 0 3px rgba(255,255,255,0.12); }
        .send-btn:active:not(:disabled) { transform: scale(0.96); }
        .back-btn {
          transition: border-color 0.15s, color 0.15s, transform 0.15s;
        }
        .back-btn:hover { border-color: #4b4b4d !important; color: #ffffff !important; transform: translateX(-3px); }
        .back-btn:active { transform: translateX(-1px); }
        input::placeholder { color: #2a2a2a; }
      `}</style>

      {/* Nav */}
      <nav style={{
        background: "#0a0a0a", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", borderBottom: "1px solid #1f1f1f", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={onBack}
            className="back-btn"
            style={{
              background: "none", border: "1px solid #2a2a2a",
              borderRadius: 9999, padding: "6px 16px", fontSize: 13,
              fontWeight: 500, color: "#9e9ea0", cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ← Back
          </button>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.5px" }}>CODEBASE.ASK</span>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#141414", border: "1px solid #2a2a2a",
          borderRadius: 9999, padding: "6px 16px",
        }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#007d48" }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "#9e9ea0" }}>{repoName}</span>
        </div>
      </nav>

      {/* Thread */}
      <div style={{ flex: 1, overflowY: "auto", maxWidth: 720, width: "100%", margin: "0 auto", padding: "0 32px" }}>
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips */}
      {messages.length === 1 && (
        <div style={{ maxWidth: 720, width: "100%", margin: "0 auto", padding: "16px 32px 0", display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SUGGESTIONS.map(s => (
            <button key={s} className="chip" onClick={() => setInput(s)}>{s}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ borderTop: "1px solid #1f1f1f", padding: "20px 32px", flexShrink: 0, background: "#0a0a0a" }}>
        <form onSubmit={handleSend} style={{ maxWidth: 720, margin: "0 auto", display: "flex", gap: 12 }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Ask about ${repoName}...`}
            disabled={loading}
            style={{
              flex: 1, height: 48, border: "1px solid #2a2a2a",
              borderRadius: 9999, padding: "0 20px", fontSize: 15,
              color: "#ffffff", background: "#141414", outline: "none",
              transition: "border-color 0.15s", fontFamily: "inherit",
            }}
            onFocus={e => e.target.style.borderColor = "#ffffff"}
            onBlur={e => e.target.style.borderColor = "#2a2a2a"}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="send-btn"
            style={{
              height: 48, padding: "0 28px",
              background: loading || !input.trim() ? "#1a1a1a" : "#ffffff",
              color: loading || !input.trim() ? "#3a3a3a" : "#111111",
              border: "none", borderRadius: 9999,
              fontSize: 15, fontWeight: 700,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              flexShrink: 0, fontFamily: "inherit",
            }}
          >
            {loading ? "···" : "Ask"}
          </button>
        </form>
      </div>
    </div>
  );
}