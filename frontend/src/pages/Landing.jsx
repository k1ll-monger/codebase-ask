import { useState, useEffect, useRef } from "react";

const API = "http://localhost:8000";

const PRELOADED = [
  {
    name: "requests-html",
    label: "requests-html",
    description: "HTML parsing & scraping library by Kenneth Reitz",
    lang: "Python",
    stars: "13.4k",
  },
  {
    name: "flask",
    label: "flask",
    description: "Lightweight WSGI web application framework",
    lang: "Python",
    stars: "68k",
  },
  {
    name: "httpx",
    label: "httpx",
    description: "A next-generation HTTP client for Python",
    lang: "Python",
    stars: "13k",
  },
];

function useFadeInOnScroll() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

export default function Landing({ onRepoReady }) {
  const [repoUrl, setRepoUrl] = useState("");
  const [repoName, setRepoName] = useState("");
  const [indexing, setIndexing] = useState(false);
  const [indexError, setIndexError] = useState("");
  const [loadingPreload, setLoadingPreload] = useState(null);
  const [heroReady, setHeroReady] = useState(false);

  const [cardsRef, cardsVisible] = useFadeInOnScroll();
  const [formRef, formVisible] = useFadeInOnScroll();
  const [howRef, howVisible] = useFadeInOnScroll();

  useEffect(() => {
    const t = setTimeout(() => setHeroReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  async function handlePreloaded(repo) {
    setLoadingPreload(repo.name);
    try {
      const res = await fetch(`${API}/repos`);
      const data = await res.json();
      if (data.repos.includes(repo.name)) {
        onRepoReady(repo.name);
      } else {
        setIndexError(`"${repo.name}" isn't indexed yet. Ask the site owner to pre-index it.`);
      }
    } catch {
      setIndexError("Could not reach the backend. Make sure it's running.");
    } finally {
      setLoadingPreload(null);
    }
  }

  async function handleIndex(e) {
    e.preventDefault();
    if (!repoUrl.trim() || !repoName.trim()) return;
    setIndexing(true);
    setIndexError("");
    try {
      const res = await fetch(`${API}/index`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl.trim(), repo_name: repoName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Indexing failed");
      onRepoReady(repoName.trim());
    } catch (err) {
      setIndexError(err.message);
    } finally {
      setIndexing(false);
    }
  }

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          from { transform: translateX(-100%) skewX(-12deg); }
          to   { transform: translateX(220%) skewX(-12deg); }
        }
        @keyframes pulseBg {
          0% { background-color: #141414; }
          50% { background-color: #222222; }
          100% { background-color: #141414; }
        }
        @keyframes loadingDot {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }

        .hero-eyebrow  { opacity: 0; animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s forwards; }
        .hero-headline { opacity: 0; animation: fadeUp 0.85s cubic-bezier(0.22,1,0.36,1) 0.25s forwards; }
        .hero-sub      { opacity: 0; animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.42s forwards; }
        .card-animate  { opacity: 0; transform: translateY(20px); transition: opacity 0.5s ease, transform 0.5s ease; }
        .card-animate.visible { opacity: 1; transform: translateY(0); }

        .repo-card {
          background: #141414;
          border: none;
          border-left: 2px solid transparent;
          padding: 28px 24px;
          text-align: left;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: background 0.2s, transform 0.22s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s ease, border-left-color 0.2s;
        }
        .repo-card:hover {
          background: #1a1a1a;
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.5);
          border-left-color: #ffffff;
          z-index: 1;
        }
        .repo-card:active { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.4); }
        .repo-card .arrow {
          display: inline-block;
          transition: transform 0.2s cubic-bezier(0.22,1,0.36,1);
        }
        .repo-card:hover .arrow { transform: translateX(5px); }

        /* Premium Submit Button Core Styles */
        .submit-btn {
          position: relative;
          overflow: hidden;
          background: #ffffff;
          color: #111111;
          cursor: pointer;
          transition: background-color 0.25s cubic-bezier(0.25, 1, 0.5, 1), 
                      color 0.25s cubic-bezier(0.25, 1, 0.5, 1), 
                      transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), 
                      box-shadow 0.2s ease;
        }
        .submit-btn::after {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 40%;
          height: 100%;
          background: rgba(255,255,255,0.18);
          transform: translateX(-100%) skewX(-12deg);
          pointer-events: none;
        }
        
        /* Interactive States: Hover & Pop out */
        .submit-btn:hover:not(:disabled) {
          background-color: #f0f0f2;
          transform: translateY(-2px) scale(1.015);
          box-shadow: 0 8px 24px rgba(255, 255, 255, 0.12);
        }
        .submit-btn:hover:not(:disabled)::after { 
          animation: shimmer 0.55s ease forwards; 
        }
        
        /* Interactive States: Push Click */
        .submit-btn:active:not(:disabled) { 
          transform: translateY(0) scale(0.98); 
          box-shadow: 0 2px 8px rgba(255, 255, 255, 0.06);
        }

        /* Active Indexing / Processing State */
        .submit-btn.is-indexing {
          animation: pulseBg 2s infinite ease-in-out;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* Loading Dots CSS Engine */
        .dot-loader {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-left: 10px;
        }
        .dot-loader span {
          width: 4px;
          height: 4px;
          background-color: #4b4b4d;
          border-radius: 50%;
          display: inline-block;
          animation: loadingDot 1.4s infinite ease-in-out both;
        }
        .dot-loader span:nth-child(2) { animation-delay: 0.2s; }
        .dot-loader span:nth-child(3) { animation-delay: 0.4s; }

        .how-step { opacity: 0; transform: translateY(16px); transition: opacity 0.45s ease, transform 0.45s ease; }
        .how-step.visible { opacity: 1; transform: translateY(0); }
        input::placeholder { color: #3a3a3a; }
        input:focus { border-color: #ffffff !important; }
      `}</style>

      {/* Utility bar */}
      <div style={{ background: "#0a0a0a", height: 36, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 32px", borderBottom: "1px solid #1f1f1f" }}>
        <span style={{ fontSize: 12, color: "#4b4b4d" }}>
          Built with RAG · FastAPI · ChromaDB · Gemini
        </span>
      </div>

      {/* Nav */}
      <nav style={{ background: "#0a0a0a", height: 60, display: "flex", alignItems: "center", padding: "0 32px", borderBottom: "1px solid #1f1f1f" }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.5px" }}>CODEBASE.ASK</span>
      </nav>

      {/* Hero */}
      <div style={{ background: "#0a0a0a", padding: "100px 32px 88px", textAlign: "center", borderBottom: "1px solid #1f1f1f" }}>
        {heroReady && (
          <>
            <div className="hero-eyebrow" style={{ fontSize: 11, fontWeight: 500, color: "#4b4b4d", letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 28 }}>
              RAG · Retrieval-Augmented Generation
            </div>
            <h1 className="hero-headline" style={{
              fontSize: "clamp(52px, 9vw, 104px)",
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 0.88,
              letterSpacing: "-3px",
              textTransform: "uppercase",
              margin: "0 0 36px",
            }}>
              ASK YOUR<br />CODEBASE
            </h1>
            <p className="hero-sub" style={{ fontSize: 16, color: "#4b4b4d", maxWidth: 460, margin: "0 auto", lineHeight: 1.65 }}>
              Paste a GitHub repo. Ask questions in plain English. Get answers grounded in actual code — with file and function citations.
            </p>
          </>
        )}
      </div>

      {/* Preloaded repos */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "64px 32px 0" }} ref={cardsRef}>
        <div className={`card-animate${cardsVisible ? " visible" : ""}`} style={{ fontSize: 11, fontWeight: 500, color: "#4b4b4d", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 24 }}>
          Try a sample repo — no wait
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 1, background: "#1f1f1f" }}>
          {PRELOADED.map((repo, i) => (
            <button
              key={repo.name}
              onClick={() => handlePreloaded(repo)}
              disabled={loadingPreload === repo.name}
              className={`repo-card card-animate${cardsVisible ? " visible" : ""}`}
              style={{ transitionDelay: cardsVisible ? `${i * 100}ms` : "0ms" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: "#ffffff" }}>{repo.label}</span>
                <span style={{ fontSize: 12, color: "#4b4b4d", background: "#1f1f1f", padding: "2px 10px", borderRadius: 9999 }}>
                  ★ {repo.stars}
                </span>
              </div>
              <p style={{ fontSize: 14, color: "#707072", margin: "0 0 20px", lineHeight: 1.55 }}>{repo.description}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#4b4b4d" }}>{repo.lang}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#ffffff", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {loadingPreload === repo.name ? "Loading..." : <><span>Explore</span><span className="arrow">→</span></>}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ maxWidth: 900, margin: "52px auto", padding: "0 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1, height: 1, background: "#1f1f1f" }} />
        <span style={{ fontSize: 11, color: "#3a3a3a", letterSpacing: "1.5px", textTransform: "uppercase" }}>or index your own</span>
        <div style={{ flex: 1, height: 1, background: "#1f1f1f" }} />
      </div>

      {/* Form */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 32px 80px" }} ref={formRef}>
        <form onSubmit={handleIndex}>
          <div className={`card-animate${formVisible ? " visible" : ""}`} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#4b4b4d", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>
                GitHub URL
              </label>
              <input
                type="text"
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                style={{
                  width: "100%", height: 48, border: "1px solid #2a2a2a",
                  borderRadius: 9999, padding: "0 20px", fontSize: 15,
                  color: "#ffffff", background: "#141414", outline: "none",
                  boxSizing: "border-box", transition: "border-color 0.15s",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#4b4b4d", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>
                Short name
              </label>
              <input
                type="text"
                value={repoName}
                onChange={e => setRepoName(e.target.value)}
                placeholder="my-repo"
                style={{
                  width: "100%", height: 48, border: "1px solid #2a2a2a",
                  borderRadius: 9999, padding: "0 20px", fontSize: 15,
                  color: "#ffffff", background: "#141414", outline: "none",
                  boxSizing: "border-box", transition: "border-color 0.15s",
                }}
              />
            </div>
          </div>

          {indexError && (
            <div style={{ fontSize: 13, color: "#ff6b6b", marginBottom: 12, padding: "10px 16px", background: "#1a0a0a", border: "1px solid #3a1a1a", borderRadius: 8 }}>
              {indexError}
            </div>
          )}

          <button
            type="submit"
            disabled={indexing}
            className={`submit-btn card-animate ${formVisible ? "visible" : ""} ${indexing ? "is-indexing" : ""}`}
            style={{
              transitionDelay: formVisible ? "100ms" : "0ms",
              width: "100%", height: 48,
              borderRadius: 9999,
              fontSize: 15, fontWeight: 700,
              letterSpacing: "0.3px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              // Dynamic configuration context for active processing phase
              background: indexing ? "#2a2a2a" : undefined,
              color: indexing ? "#4b4b4d" : undefined,
            }}
          >
            {indexing ? (
              <>
                Cloning, chunking, embedding... this takes a minute
                <span className="dot-loader"><span></span><span></span><span></span></span>
              </>
            ) : (
              "Index & explore"
            )}
          </button>
        </form>

        {/* How it works */}
        <div style={{ marginTop: 72, paddingTop: 48, borderTop: "1px solid #1f1f1f" }} ref={howRef}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "#4b4b4d", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 36 }}>
            How it works
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 36 }}>
            {[
              { step: "01", title: "Clone", body: "Your GitHub repo is cloned and every Python file is identified." },
              { step: "02", title: "Chunk", body: "Code is split at function and class boundaries using Python's AST parser." },
              { step: "03", title: "Embed", body: "Each chunk is converted to a vector using Gemini's embedding model." },
              { step: "04", title: "Retrieve", body: "Your question is embedded and matched against the codebase vectors." },
              { step: "05", title: "Answer", body: "Gemini answers using only the retrieved chunks, citing exact files and functions." },
            ].map(({ step, title, body }, i) => (
              <div key={step} className={`how-step${howVisible ? " visible" : ""}`} style={{ transitionDelay: howVisible ? `${i * 80}ms` : "0ms" }}>
                <div style={{ fontSize: 11, color: "#3a3a3a", fontWeight: 500, marginBottom: 10 }}>{step}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#ffffff", marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 13, color: "#4b4b4d", lineHeight: 1.65 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #1f1f1f", padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#3a3a3a" }}>CODEBASE.ASK</span>
        <span style={{ fontSize: 12, color: "#3a3a3a" }}>RAG · FastAPI · ChromaDB · Gemini · React</span>
      </div>
    </div>
  );
}