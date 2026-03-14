import { create } from "zustand";
import { me } from "playroomkit";
import {
  saveLeaderboardEntry,
  loadTopLeaderboardEntries,
} from "./firebaseLeaderboard";
import {
  getVirtualIdentityCookie,
  setVirtualIdentityCookie,
} from "./utils/cookies";

function getPlayroomProfileName() {
  try {
    const self = me?.();
    if (!self) return null;
    const profile = self.getProfile?.();
    const name =
      (profile && typeof profile.name === "string" && profile.name.trim()) ||
      (self.state?.profile && typeof self.state.profile.name === "string" && self.state.profile.name.trim());
    if (name) return name.trim();
  } catch {
    // ignore
  }
  return null;
}

function resolveDisplayName() {
  const fromPlayroom = getPlayroomProfileName();
  if (fromPlayroom) {
    setVirtualIdentityCookie(fromPlayroom);
    return fromPlayroom;
  }
  const fromCookie = getVirtualIdentityCookie();
  if (fromCookie) return fromCookie;
  return "Player";
}

export const useGameStore = create((set) => ({
  // --- Core gameplay state ---
  gameStatus: "idle", // "idle" | "running" | "ended"
  endReason: null, // "finish" | "no_lives" | "time" | null
  displayName: "Player",
  setDisplayName: (name) => set({ displayName: name || "Player" }),
  syncVirtualIdentity: () => set({ displayName: resolveDisplayName() }),
  gameStartAtMs: null,
  gameEndAtMs: null,
  gameStartPosition: null, // { x, y, z }
  setGameStartPosition: (pos) => set({ gameStartPosition: pos }),
  leaderboard: [], // [{ name, durationMs, endedAtMs, reason }]
  leaderboardLoading: false,
  leaderboardError: null,
  setLeaderboard: (rows) => set({ leaderboard: rows }),
  refreshLeaderboard: async () => {
    set({ leaderboardLoading: true, leaderboardError: null });
    try {
      const rows = await loadTopLeaderboardEntries(10);
      if (Array.isArray(rows)) {
        set({ leaderboard: rows, leaderboardLoading: false });
      } else {
        set({ leaderboardLoading: false });
      }
    } catch (err) {
      set({
        leaderboardLoading: false,
        leaderboardError: err?.message || "Failed to load leaderboard",
      });
    }
  },
  startGame: () =>
    set(() => ({
      gameStatus: "running",
      endReason: null,
      gameStartAtMs: Date.now(),
      gameEndAtMs: null,
      gameStartPosition: null,
      lives: 5,
      showBananaPopup: false,
    })),
  endGame: (reason) =>
    set((state) => {
      const endedAtMs = Date.now();
      const startAt = state.gameStartAtMs ?? endedAtMs;
      const durationMs = Math.max(0, endedAtMs - startAt);
      const name = resolveDisplayName();
      const lives = state.lives ?? 0;
      const newEntry = {
        name,
        durationMs,
        endedAtMs,
        reason: reason ?? state.endReason ?? null,
        lives,
      };

      // Fire-and-forget save to Firebase
      saveLeaderboardEntry(newEntry).catch(() => {});

      return {
        gameStatus: "ended",
        endReason: reason ?? state.endReason ?? "finish",
        gameEndAtMs: endedAtMs,
        showBananaPopup: false,
        leaderboard: [newEntry, ...(state.leaderboard || [])],
      };
    }),
  resetGame: () =>
    set(() => ({
      gameStatus: "idle",
      endReason: null,
      gameStartAtMs: null,
      gameEndAtMs: null,
      gameStartPosition: null,
      lives: 5,
      showBananaPopup: false,
    })),

  playerPosition: null,
  setPlayerPosition: (position) => set({ playerPosition: position }),
  speed: null,
  setSpeed: (speed) => set({ speed: speed }),
  flamePositions: null,
  setFlamePositions: (positions) => set({ flamePositions: positions }),
  boostPower: 0,
  setBoostPower: (power) => set({ boostPower: power }),
  isBoosting : false,
  setIsBoosting: (isBoosting) => set({ isBoosting }),
  driftLevel: null,
  setDriftLevel: (level) => set({ driftLevel: level }),
  groundPosition: null,
  setGroundPosition: (groundPosition) => set({groundPosition: groundPosition}),
  wheelPositions: null,
  setWheelPositions: (wheelPositions) => set({wheelPositions: wheelPositions}),
  body: null,
  setBody: (body) => set({body: body}),
  joystick: {x: 0, y: 0, distance: 0},
  setJoystick: (joystick) => set({ joystick: joystick }),
  jumpButtonPressed: false,
  setJumpButtonPressed: (pressed) => set({ jumpButtonPressed: pressed }),
  noiseTexture: null,
  setNoiseTexture: (noiseTexture) => set({noiseTexture: noiseTexture}),
  gamepad: null,
  setGamepad: (gamepad) => set({gamepad: gamepad}),
  isOnDirt:null,
  setIsOnDirt: (isOnDirt) => set({isOnDirt: isOnDirt}),
  // Collision system
  collider: null,
  setCollider: (collider) => set({ collider }),
  trackScene: null,
  setTrackScene: (trackScene) => set({ trackScene }),
  // Banana Game popup (when hitting obstacle)
  showBananaPopup: false,
  setShowBananaPopup: (show) => set({ showBananaPopup: show }),
  // Lives (5 max; lose 1 on obstacle hit, gain 1 for correct Banana answer)
  lives: 5,
  setLives: (lives) => set((state) => ({ lives: Math.max(0, Math.min(5, lives)) })),
  // Show lives only after loading screen is gone (car on track)
  loadingComplete: false,
  setLoadingComplete: (value) => set({ loadingComplete: value }),
}));
