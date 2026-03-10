import { useEffect, useState } from "react";
import { useGameStore } from "./store";

const BANANA_API = "https://marcconrad.com/uob/banana/api.php?out=json";
const MAX_LIVES = 5;

export function BananaGamePopup() {
  const showBananaPopup = useGameStore((state) => state.showBananaPopup);
  const setShowBananaPopup = useGameStore((state) => state.setShowBananaPopup);
  const lives = useGameStore((state) => state.lives);
  const setLives = useGameStore((state) => state.setLives);
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null); // "correct" | "wrong" | null
  const [lifeAwarded, setLifeAwarded] = useState(false);

  useEffect(() => {
    if (!showBananaPopup) {
      setGameData(null);
      setError(null);
      setAnswer("");
      setFeedback(null);
      setLifeAwarded(false);
      return;
    }
    setLoading(true);
    setError(null);
    setAnswer("");
    setFeedback(null);
    setLifeAwarded(false);
    fetch(BANANA_API)
      .then((res) => res.json())
      .then((data) => {
        setGameData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load game");
        setLoading(false);
      });
  }, [showBananaPopup]);

  const handleClose = () => {
    setShowBananaPopup(false);
  };

  const handleSubmitAnswer = () => {
    if (!gameData || loading) return;
    const solution = gameData.solution;
    const userValue = answer.trim() === "" ? NaN : Number(answer.trim());
    const isCorrect = userValue === solution || String(userValue) === String(solution);
    if (isCorrect) {
      setFeedback("correct");
      if (!lifeAwarded) {
        const newLives = Math.min(MAX_LIVES, lives + 1);
        setLives(newLives);
        setLifeAwarded(true);
      }
    } else {
      setFeedback("wrong");
    }
  };

  if (!showBananaPopup) return null;

  return (
    <div className="banana-popup-overlay" onClick={handleClose}>
      <div
        className="banana-popup"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Banana game"
      >
        <div className="banana-popup-header">
          <h2>🍌 Banana Game</h2>
          <p className="banana-popup-subtitle">
            You hit an obstacle! Answer correctly to earn a life back. Lives: {lives}
          </p>
        </div>
        {loading && <p className="banana-popup-loading">Loading...</p>}
        {error && (
          <p className="banana-popup-error">{error}</p>
        )}
        {gameData && !loading && (
          <div className="banana-popup-content">
            <img
              src={gameData.question}
              alt="Banana game question"
              className="banana-popup-image"
            />
            <p className="banana-popup-hint">Enter your answer (number):</p>
            <input
              type="text"
              inputMode="numeric"
              className="banana-popup-input"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmitAnswer()}
              placeholder="?"
              autoFocus
              disabled={feedback === "correct"}
            />
            <button
              type="button"
              className="banana-popup-submit"
              onClick={handleSubmitAnswer}
              disabled={feedback === "correct"}
            >
              Check answer
            </button>
            {feedback === "correct" && (
              <p className="banana-popup-feedback banana-popup-feedback--correct">
                ✓ Correct! +1 life
              </p>
            )}
            {feedback === "wrong" && (
              <p className="banana-popup-feedback banana-popup-feedback--wrong">
                Wrong, try again
              </p>
            )}
          </div>
        )}
        <button
          type="button"
          className="banana-popup-continue"
          onClick={handleClose}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
