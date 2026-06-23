import { useState } from "react";
import Landing from "./pages/Landing";
import Chat from "./pages/Chat";

export default function App() {
  const [activePage, setActivePage] = useState("landing");
  const [activeRepo, setActiveRepo] = useState(null);

  function handleRepoReady(repoName) {
    setActiveRepo(repoName);
    setActivePage("chat");
  }

  function handleBack() {
    setActivePage("landing");
    setActiveRepo(null);
  }

  return activePage === "landing" ? (
    <Landing onRepoReady={handleRepoReady} />
  ) : (
    <Chat repoName={activeRepo} onBack={handleBack} />
  );
}