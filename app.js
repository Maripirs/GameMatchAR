import { startCamera, switchCamera } from "./js/camera.js";
import { Detector } from "./js/detector.js";
import { cropDetection } from "./js/cropper.js";

const CROP_CONFIDENCE_THRESHOLD = 0.5;
const MAX_CROPS_PER_SCAN = 16;
const MAX_UPLOAD_IMAGE_SIDE = 2400;
const MATCH_CONCURRENCY = 1;
const GAME_DETAILS_URL = "./data/game_details.json";
const GAME_SEARCH_INDEX_URL = "./data/games_index.json";
const BACKEND_MATCH_TIMEOUT_MS = 20000;
const BACKEND_HEALTH_TIMEOUT_MS = 5000;
const DETAIL_SCORE_THRESHOLD = 0.775;
const DETAIL_USER_REF_SCORE_THRESHOLD = 0.775;
const DETAIL_STRONG_SCORE_THRESHOLD = 0.8;
const DETAIL_MARGIN_THRESHOLD = 0.012;
const SCORE_DISPLAY_DECIMALS = 3;
const SCORE_THRESHOLD_EPSILON = 0.0005;
const MAX_CORRECTION_SUGGESTIONS = 5;
const CONTRIBUTOR_RECENT_REFERENCE_LIMIT = 30;
const CONTRIBUTOR_REVIEW_TIMEOUT_MS = 15000;
const CARD_DISMISS_MIN_DISTANCE = 86;
const CARD_DISMISS_MAX_DISTANCE = 150;
const CARD_DISMISS_RATIO = 0.32;
const CROP_ZOOM_MAX_SIDE = 420;
const CROP_ZOOM_MIN_SIDE = 220;
const CROP_VIEWER_MIN_ZOOM = 0.25;
const CROP_VIEWER_MAX_ZOOM = 8;
const CROP_VIEWER_STEP = 1.25;
const THEME_STORAGE_KEY = "gamematch-theme-preference";
const THEME_OPTIONS = ["light", "auto", "dark"];
const CONTRIBUTOR_PASSWORD_HEADER = "X-Contributor-Password";
const DEBUG_MATCH_LOGS = Boolean(window.GAMEMATCH_DEBUG);

const video = document.getElementById("camera");
const photoPreview = document.getElementById("photoPreview");
const captureCanvas = document.getElementById("capture");
const boxesCanvas = document.getElementById("boxes");
const statusText = document.getElementById("status");
const startCameraButton = document.getElementById("startCameraButton");
const scanButton = document.getElementById("scanButton");
const backToCameraButton = document.getElementById("backToCameraButton");
const switchCameraButton = document.getElementById("switchCameraButton");
const uploadButton = document.getElementById("uploadButton");
const imageUpload = document.getElementById("imageUpload");
const playersFilter = document.getElementById("playersFilter");
const timeFilter = document.getElementById("timeFilter");
const complexityFilter = document.getElementById("complexityFilter");
const filterSummary = document.getElementById("filterSummary");
const resultsPanel = document.getElementById("resultsPanel");
const resultsGrid = document.getElementById("resultsGrid");
const resultCount = document.getElementById("resultCount");
const resultsNotice = document.getElementById("resultsNotice");
const infoButton = document.getElementById("infoButton");
const infoPanel = document.getElementById("infoPanel");
const infoCloseButton = document.getElementById("infoCloseButton");
const themeOptionButtons = Array.from(document.querySelectorAll("[data-theme-option]"));
const themeValue = document.getElementById("themeValue");
const contributorForm = document.getElementById("contributorForm");
const contributorPasswordInput = document.getElementById("contributorPassword");
const contributorLoginButton = document.getElementById("contributorLoginButton");
const contributorLogoutButton = document.getElementById("contributorLogoutButton");
const contributorModeState = document.getElementById("contributorModeState");
const contributorStatus = document.getElementById("contributorStatus");
const contributorTabs = document.getElementById("contributorTabs");
const contributorTabButtons = Array.from(document.querySelectorAll("[data-contributor-tab]"));
const contributorPanels = Array.from(document.querySelectorAll("[data-contributor-panel]"));
const contributorReviewPanel = document.getElementById("contributorReviewPanel");
const contributorReviewRefreshButton = document.getElementById("contributorReviewRefreshButton");
const contributorReviewStatus = document.getElementById("contributorReviewStatus");
const contributorReviewCount = document.getElementById("contributorReviewCount");
const contributorReviewGrid = document.getElementById("contributorReviewGrid");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const systemLightThemeQuery = window.matchMedia?.("(prefers-color-scheme: light)");
const cropHoverPreviewQuery = window.matchMedia?.("(hover: hover) and (pointer: fine)");

const detector = new Detector();

let cameraReady = false;
let activeSourceCanvas = null;
let activeDisplayElement = video;
let scanToken = 0;
let gameDetailsById = new Map();
let detectorLoadPromise = null;
let backendMatcherLoadPromise = null;
let backendMatcherAvailable = false;
let backendMatcherUnavailable = false;
let gameDetailsLoadPromise = null;
let gameSearchLoadPromise = null;
let gameSearchIndex = [];
let gameSearchById = new Map();
let currentResultCards = [];
let startupStatusActive = true;
let contributorMode = false;
let contributorPassword = "";
let contributorApiBase = configuredApiBase();
let contributorActiveTab = "mode";
let contributorReviewLoadPromise = null;
let contributorReviewImageUrls = [];
let themePreference = "auto";
let cropZoomPreview = null;
let cropViewer = null;
let cropViewerState = null;

initThemeControl();
setControlsEnabled(false);
updateFilterSummary();
video.hidden = true;

main();

startCameraButton.addEventListener("click", startCameraFromTap);
scanButton.addEventListener("click", scanCurrentView);
backToCameraButton.addEventListener("click", backToLiveCamera);
switchCameraButton.addEventListener("click", switchCameraFromTap);
uploadButton.addEventListener("click", () => imageUpload.click());
imageUpload.addEventListener("change", handleImageUpload);
infoButton.addEventListener("click", () => setInfoPanelOpen(true));
infoCloseButton.addEventListener("click", () => setInfoPanelOpen(false));
infoPanel.addEventListener("click", handleInfoPanelBackdropClick);
for (const button of themeOptionButtons) {
  button.addEventListener("click", () => setThemePreference(button.dataset.themeOption));
  button.addEventListener("keydown", handleThemeOptionKeydown);
}
contributorForm.addEventListener("submit", loginContributor);
contributorLogoutButton.addEventListener("click", logoutContributor);
for (const button of contributorTabButtons) {
  button.addEventListener("click", () => selectContributorTab(button.dataset.contributorTab));
}
contributorReviewRefreshButton.addEventListener("click", () => loadContributorReview({ force: true }));
[playersFilter, timeFilter, complexityFilter].forEach((control) => {
  control.addEventListener("input", handleFilterChange);
  control.addEventListener("change", handleFilterChange);
});
window.addEventListener("resize", () => {
  hideCropZoomPreview();

  if (activeSourceCanvas?.lastDetections) {
    drawDetections(activeSourceCanvas.lastDetections, activeSourceCanvas, activeDisplayElement);
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isCropViewerOpen()) {
    event.preventDefault();
    event.stopPropagation();
    closeCropViewer();
  }
}, { capture: true });
window.addEventListener("keydown", (event) => {
  if (isCropViewerOpen()) {
    if (event.key === "Escape") {
      closeCropViewer();
      return;
    }

    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomCropViewerBy(CROP_VIEWER_STEP);
      return;
    }

    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoomCropViewerBy(1 / CROP_VIEWER_STEP);
      return;
    }

    if (event.key === "0" && cropViewerState) {
      event.preventDefault();
      setCropViewerZoom(cropViewerState.fitZoom, { preserveCenter: false });
      window.requestAnimationFrame(centerCropViewer);
      return;
    }
  }

  if (event.key === "Escape" && !infoPanel.hidden) {
    setInfoPanelOpen(false);
    return;
  }
});

async function main() {
  setContributorMode(false);
  setControlsEnabled(true);
  setStatus("Loading scanner...");
  preloadStartupModels();
}

async function startCameraFromTap() {
  startupStatusActive = false;
  setControlsEnabled(false);
  clearResults();
  showCamera();
  setStatus("Starting camera...");

  try {
    const settings = await startCamera(video);
    const facing = settings.facingMode ? ` ${settings.facingMode}` : "";

    cameraReady = true;
    activeSourceCanvas = null;
    activeDisplayElement = video;
    setStatus(`Camera${facing}.`);
  } catch (error) {
    console.error(error);
    cameraReady = false;
    setStatus(cameraErrorMessage(error));
  }

  setControlsEnabled(true);
}

async function switchCameraFromTap() {
  startupStatusActive = false;

  if (!cameraReady) {
    await startCameraFromTap();
    return;
  }

  setControlsEnabled(false);
  clearResults();
  showCamera();
  setStatus("Switching camera...");

  try {
    const settings = await switchCamera(video);
    const facing = settings.facingMode ? ` ${settings.facingMode}` : "";
    setStatus(`Camera${facing}.`);
  } catch (error) {
    console.error(error);
    setStatus("Could not switch camera.");
  }

  setControlsEnabled(true);
}

async function scanCurrentView() {
  startupStatusActive = false;

  if (isCameraFrameFrozen()) {
    setStatus("Tap Back to Camera before scanning again.");
    return;
  }

  if (activeSourceCanvas && !cameraReady) {
    await processImageCanvas(activeSourceCanvas, activeDisplayElement);
    return;
  }

  if (!cameraReady || !video.videoWidth || !video.videoHeight) {
    setStatus("Camera is not ready.");
    return;
  }

  freezeCurrentCameraFrame();
  await processImageCanvas(photoPreview, photoPreview);
}

function backToLiveCamera() {
  if (!cameraReady) {
    return;
  }

  clearResults();
  showCamera();
  setControlsEnabled(true);
  setStatus("Camera live.");
}

async function handleImageUpload() {
  startupStatusActive = false;

  const file = imageUpload.files?.[0];
  imageUpload.value = "";

  if (!file) {
    return;
  }

  clearResults();
  setControlsEnabled(false);
  setStatus("Loading image...");

  try {
    await drawFileToCanvas(file, photoPreview);
    activeSourceCanvas = photoPreview;
    activeDisplayElement = photoPreview;
    showPhotoPreview();
    await processImageCanvas(photoPreview, photoPreview);
  } catch (error) {
    console.error("Could not read uploaded image:", uploadFileDebugInfo(file), error);
    setStatus(uploadImageErrorText(file, error));
  }

  setControlsEnabled(true);
}

async function processImageCanvas(sourceCanvas, displayElement) {
  const token = ++scanToken;

  setControlsEnabled(false);
  clearResults(false);
  setStatus("Detecting boxes...");

  try {
    setStatus("Loading detector...");
    await ensureDetectorLoaded();

    const detections = await detector.detect(sourceCanvas);
    const allConfident = detections.filter((detection) => detection.score >= CROP_CONFIDENCE_THRESHOLD);
    const confident = allConfident.slice(0, MAX_CROPS_PER_SCAN);

    sourceCanvas.lastDetections = confident;
    drawDetections(confident, sourceCanvas, displayElement);

    if (!confident.length) {
      setStatus("No boxes found.");
      return;
    }

    const cappedMessage = allConfident.length > confident.length
      ? ` Top ${confident.length} only.`
      : "";
    setStatus(`Matching ${confident.length} box${confident.length === 1 ? "" : "es"}...${cappedMessage}`);
    showResultShell(confident.length);

    const cards = confident.map((detection, index) => {
      const cropCanvas = cropDetection(sourceCanvas, detection);
      return createMatchCard(cropCanvas, detection, index);
    });
    currentResultCards = cards;
    let matchFailures = 0;

    setStatus("Checking matcher...");

    try {
      await ensureBackendMatcherReady({ force: true });
    } catch (error) {
      console.warn("Backend matcher unavailable:", error);
      setResultsNotice(backendOfflineMessage(), "warning");

      for (const card of cards) {
        card.setError("Server offline", {
          meta: `Matcher not reachable at ${backendDisplayName()}`,
          fitText: "Detected box",
          detailsText: "Game names and filters will work after the matching server is online.",
        });
      }

      updateResultStats();
      sortCards();
      setStatus("Matching server offline. Boxes were detected.");
      return;
    }

    setResultsNotice("");
    setStatus(`Matching ${confident.length} box${confident.length === 1 ? "" : "es"}...`);

    await processWithConcurrency(cards, MATCH_CONCURRENCY, async (card, index) => {
      if (token !== scanToken || card.dismissed) {
        return;
      }

      try {
        const matches = await matchCrop(card.cropCanvas, (text) => card.setPending(text));

        if (token !== scanToken || card.dismissed) {
          return;
        }

        if (DEBUG_MATCH_LOGS) {
          console.log(`Crop ${index + 1} matches:`);
          console.table(matches.map((match) => ({
            id: match.id,
            name: match.name,
            score: match.score.toFixed(4),
            rank_score: matchSortScore(match).toFixed(4),
            source: match.source,
            matcher: match.matcher,
            shape_penalized: match.shape_penalized ? "yes" : "",
            noisy_penalized: match.noisy_penalized ? "yes" : "",
            feedback_adjustment: match.feedback_adjustment?.toFixed(4) || "",
            confident: isConfidentMatch(matches),
          })));
        }

        await ensureGameDetailsLoaded();
        card.setMatches(matches);
      } catch (error) {
        if (card.dismissed) {
          return;
        }

        matchFailures += 1;
        console.warn(`Crop ${index + 1} match failed:`, error);
        card.setError("Match failed", {
          meta: "Server did not return a match",
          fitText: "Try again",
          detailsText: "This crop could not be matched, but the other crops can continue.",
        });
      }

      updateResultStats();
      sortCards();
    });

    if (token === scanToken) {
      setStatus(matchFailures
        ? `Done. ${matchFailures} match${matchFailures === 1 ? "" : "es"} failed.`
        : "Done.");
    }
  } catch (error) {
    console.error(error);
    setStatus("Scan failed.");
  } finally {
    setControlsEnabled(true);
  }
}

function ensureDetectorLoaded() {
  if (!detectorLoadPromise) {
    detectorLoadPromise = detector.load().catch((error) => {
      detectorLoadPromise = null;
      throw error;
    });
  }

  return detectorLoadPromise;
}

function ensureBackendMatcherReady({ force = false } = {}) {
  if (backendMatcherUnavailable && !force) {
    return Promise.reject(new Error("Backend matcher is unavailable."));
  }

  if (!backendMatcherLoadPromise) {
    backendMatcherLoadPromise = fetchWithTimeout(
      apiUrl("/health"),
      { cache: "no-store" },
      BACKEND_HEALTH_TIMEOUT_MS
    )
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.ok) {
          throw new Error(result.detail || `Backend health failed: ${response.status}`);
        }

        backendMatcherAvailable = true;
        backendMatcherUnavailable = false;
        console.log("Backend matcher available:", result);
        return result;
      })
      .catch((error) => {
        backendMatcherAvailable = false;
        backendMatcherUnavailable = true;
        backendMatcherLoadPromise = null;
        throw error;
      });
  }

  return backendMatcherLoadPromise;
}

async function matchCrop(cropCanvas, setPending) {
  setPending("Matching on server...");
  await ensureBackendMatcherReady();
  return matchCropWithBackend(cropCanvas);
}

async function matchCropWithBackend(cropCanvas) {
  const blob = await canvasToBlob(cropCanvas);
  const formData = new FormData();

  formData.append("file", blob, "crop.jpg");

  const response = await fetchWithTimeout(
    apiUrl("/match"),
    {
      method: "POST",
      body: formData,
    },
    BACKEND_MATCH_TIMEOUT_MS
  );
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.detail || `Backend match failed: ${response.status}`);
  }

  return (result.matches || []).map((match) => ({
    id: Number(match.id),
    name: match.name,
    score: cleanNumber(match.score),
    rank_score: cleanNumber(match.rank_score ?? match.score),
    source: match.source || "backend",
    shape_penalized: Boolean(match.shape_penalized),
    noisy_penalized: Boolean(match.noisy_penalized),
    feedback_adjustment: cleanNumber(match.feedback_adjustment),
    reference_image_path: match.reference_image_path || "",
    matcher: "backend",
  }));
}

async function preloadStartupModels() {
  const requiredTasks = [
    ["detector", ensureDetectorLoaded()],
    ["game details", ensureGameDetailsLoaded()],
  ];
  const backendTask = ensureBackendMatcherReady({ force: true })
    .then(() => {
      console.log("Startup reached backend.");
      return { ok: true };
    })
    .catch((error) => {
      console.warn("Backend unavailable at startup:", error);
      return { ok: false, error };
    });

  const results = await Promise.allSettled(
    requiredTasks.map(async ([name, promise]) => {
      await promise;
      console.log(`Startup loaded ${name}.`);
    })
  );
  const backendResult = await backendTask;
  const failed = results
    .map((result, index) => ({ result, name: requiredTasks[index][0] }))
    .filter(({ result }) => result.status === "rejected");

  if (failed.length) {
    console.warn(
      "Startup preload failed:",
      failed.map(({ name, result }) => ({
        name,
        error: result.reason,
      }))
    );
    if (startupStatusActive) {
      setStatus("Scanner did not finish loading. Scan will retry.");
    }

    return;
  }

  if (startupStatusActive) {
    setStatus(backendResult.ok
      ? "Ready."
      : "Ready. Matching server offline; boxes can still be detected.");
  }
}

function createMatchCard(cropCanvas, detection, index) {
  const card = document.createElement("article");
  const dismissButton = document.createElement("button");
  const body = document.createElement("div");
  const name = document.createElement("div");
  const meta = document.createElement("div");
  const score = document.createElement("div");
  const fit = document.createElement("div");
  const details = document.createElement("div");
  const feedbackActions = document.createElement("div");
  const confirmButton = document.createElement("button");
  const denyButton = document.createElement("button");
  const feedbackStatus = document.createElement("div");
  const correctionPanel = document.createElement("form");
  const correctionLabel = document.createElement("label");
  const correctionLabelText = document.createElement("span");
  const correctionInput = document.createElement("input");
  const correctionSuggestions = document.createElement("div");
  const correctionActions = document.createElement("div");
  const correctionSaveButton = document.createElement("button");
  const correctionCancelButton = document.createElement("button");
  const correctionStatus = document.createElement("div");

  card.className = "matchCard";
  dismissButton.className = "cardDismissButton";
  cropCanvas.classList.add("matchCropCanvas");
  card.dataset.score = "-1";
  body.className = "matchBody";
  name.className = "matchName";
  meta.className = "matchMeta";
  score.className = "matchScore";
  fit.className = "filterFit";
  details.className = "gameDetails";
  feedbackActions.className = "feedbackActions";
  confirmButton.className = "feedbackConfirmButton";
  denyButton.className = "feedbackDenyButton";
  feedbackStatus.className = "feedbackStatus";
  correctionPanel.className = "correctionPanel";
  correctionSuggestions.className = "correctionSuggestions";
  correctionActions.className = "correctionActions";
  correctionSaveButton.className = "correctionSaveButton";
  correctionCancelButton.className = "correctionCancelButton";
  correctionStatus.className = "correctionStatus";

  name.textContent = `Box ${index + 1}`;
  dismissButton.type = "button";
  dismissButton.textContent = "X";
  dismissButton.setAttribute("aria-label", "Dismiss match");
  meta.textContent = `Detection ${detection.score.toFixed(2)}`;
  score.textContent = "Waiting";
  fit.textContent = "Checking filters";
  confirmButton.type = "button";
  denyButton.type = "button";
  confirmButton.textContent = "Yes";
  denyButton.textContent = "No";
  correctionLabelText.textContent = "Correct game";
  correctionInput.type = "text";
  correctionInput.inputMode = "search";
  correctionInput.autocomplete = "off";
  correctionInput.placeholder = "Name, BGG URL, or BGG ID";
  correctionSaveButton.type = "submit";
  correctionCancelButton.type = "button";
  correctionSaveButton.textContent = "Save correct";
  correctionCancelButton.textContent = "Skip";
  confirmButton.setAttribute("aria-label", "Confirm recognition");
  denyButton.setAttribute("aria-label", "Deny recognition");
  feedbackStatus.textContent = "Waiting for match";
  correctionPanel.hidden = true;
  correctionStatus.textContent = "";

  correctionLabel.append(correctionLabelText, correctionInput);
  correctionActions.append(correctionSaveButton, correctionCancelButton);
  correctionPanel.append(correctionLabel, correctionSuggestions, correctionActions, correctionStatus);
  feedbackActions.append(confirmButton, denyButton, feedbackStatus);
  body.append(name, meta, score, fit, details, feedbackActions, correctionPanel);
  card.append(dismissButton, cropCanvas, body);
  resultsGrid.append(card);

  const cardApi = {
    card,
    cropCanvas,
    matches: [],
    details: null,
    isConfident: false,
    fitsFilters: false,
    feedbackSent: false,
    matchFailed: false,
    dismissed: false,
    feedbackControls: {
      confirmButton,
      denyButton,
      feedbackStatus,
      correctionPanel,
      correctionInput,
      correctionSuggestions,
      correctionSaveButton,
      correctionCancelButton,
      correctionStatus,
    },
    setPending(text) {
      if (this.dismissed) {
        return;
      }

      score.textContent = text;
    },
    setMatches(matches) {
      const best = matches[0];
      this.matches = matches;
      this.isConfident = isConfidentMatch(matches);
      this.details = best ? gameDetailsById.get(Number(best.id)) || null : null;
      this.feedbackSent = false;
      this.matchFailed = false;
      card.classList.remove("feedbackConfirmed", "feedbackDenied");

      if (!best) {
        name.textContent = "No match";
        score.textContent = "";
        details.replaceChildren();
        card.dataset.score = "-1";
        updateFeedbackActions(this);
        this.applyFilters();
        return;
      }

      name.textContent = best.name;
      meta.textContent = `BGG ${best.id} · ${formatMatchSource(best)}`;
      score.textContent = formatMatchScoreText(best);
      card.dataset.score = String(matchSortScore(best));
      renderGameDetails(details, matches);
      this.applyFilters();
      updateFeedbackActions(this);
    },
    setCorrectedGame(game) {
      const correctedMatch = {
        id: Number(game.id),
        name: game.name,
        score: 1,
        rank_score: 1,
        source: "contributor_correction",
        matcher: "contributor",
      };

      this.matches = [correctedMatch];
      this.isConfident = true;
      this.details = gameDetailsById.get(Number(game.id)) || null;
      name.textContent = game.name;
      meta.textContent = `BGG ${game.id} · corrected`;
      score.textContent = "Saved as correct";
      card.dataset.score = "1";
      renderGameDetails(details, this.matches);
      this.applyFilters();
    },
    setError(text, options = {}) {
      this.matches = [];
      this.details = null;
      this.isConfident = false;
      this.fitsFilters = false;
      this.matchFailed = true;
      name.textContent = text;
      meta.textContent = options.meta || "Backend matcher unavailable";
      score.textContent = "";
      fit.className = "filterFit unknown";
      fit.textContent = options.fitText || "Try again";
      details.className = "gameDetails muted";
      details.textContent = options.detailsText || "Start the backend and scan again.";
      card.dataset.score = "-1";
      card.dataset.fit = "0";
      updateFeedbackActions(this);
    },
    applyFilters() {
      const result = evaluateCardAgainstFilters(this);

      this.fitsFilters = result.fits;
      card.dataset.fit = result.rank;
      card.classList.toggle("recommended", result.fits);
      card.classList.toggle("rejected", result.rank === "0");
      fit.className = `filterFit ${result.className}`;
      fit.textContent = result.text;
    },
  };

  confirmButton.addEventListener("click", () => submitRecognitionFeedback(cardApi, "confirm"));
  denyButton.addEventListener("click", () => submitRecognitionFeedback(cardApi, "deny"));
  dismissButton.addEventListener("click", () => dismissMatchCard(cardApi, 1));
  enableCropHoverPreview(cropCanvas);
  cropCanvas.addEventListener("click", () => openCropViewer(cropCanvas, name.textContent));
  correctionPanel.addEventListener("submit", (event) => submitCorrectedReference(event, cardApi));
  correctionInput.addEventListener("input", () => updateCorrectionSuggestions(cardApi));
  correctionInput.addEventListener("keydown", (event) => handleCorrectionInputKeyDown(event, cardApi));
  correctionCancelButton.addEventListener("click", () => hideCorrectionPrompt(cardApi));
  enableSwipeDismiss(cardApi);
  updateFeedbackActions(cardApi);
  cardApi.applyFilters();
  return cardApi;
}

function enableSwipeDismiss(cardApi) {
  const card = cardApi.card;
  let gesture = null;

  card.addEventListener("pointerdown", (event) => {
    if (
      cardApi.dismissed
      || (event.pointerType === "mouse" && event.button !== 0)
      || isSwipeDismissInteractiveTarget(event.target)
    ) {
      return;
    }

    gesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      dragging: false,
    };

    card.setPointerCapture?.(event.pointerId);
  });

  card.addEventListener("pointermove", (event) => {
    if (!gesture || gesture.pointerId !== event.pointerId || cardApi.dismissed) {
      return;
    }

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (!gesture.dragging) {
      if (absX < 8 && absY < 8) {
        return;
      }

      if (absY > absX) {
        resetSwipeGesture(card, gesture.pointerId);
        gesture = null;
        return;
      }

      gesture.dragging = true;
      card.classList.add("isSwiping");
    }

    gesture.dx = dx;
    updateSwipeDismissPreview(card, dx);
    event.preventDefault();
  });

  card.addEventListener("pointerup", (event) => {
    finishSwipeDismiss(cardApi, gesture, event, true);
    gesture = null;
  });

  card.addEventListener("pointercancel", (event) => {
    finishSwipeDismiss(cardApi, gesture, event, false);
    gesture = null;
  });
}

function isSwipeDismissInteractiveTarget(target) {
  return target.closest?.("button, input, select, textarea, a, label, .correctionPanel, .matchCropCanvas");
}

function finishSwipeDismiss(cardApi, gesture, event, allowDismiss) {
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return;
  }

  const shouldDismiss = allowDismiss
    && gesture.dragging
    && Math.abs(gesture.dx) >= swipeDismissThreshold(cardApi.card);

  releaseSwipePointer(cardApi.card, gesture.pointerId);

  if (shouldDismiss) {
    dismissMatchCard(cardApi, Math.sign(gesture.dx) || 1);
  } else {
    resetSwipeCard(cardApi.card);
  }
}

function updateSwipeDismissPreview(card, dx) {
  const threshold = swipeDismissThreshold(card);
  const progress = Math.min(1, Math.abs(dx) / threshold);
  const rotation = (dx / Math.max(1, card.offsetWidth)) * 3;

  card.style.transform = `translate3d(${dx}px, 0, 0) rotate(${rotation}deg)`;
  card.style.opacity = String(1 - progress * 0.34);
  card.classList.toggle("isDismissReady", progress >= 1);
}

function resetSwipeGesture(card, pointerId) {
  releaseSwipePointer(card, pointerId);
  resetSwipeCard(card);
}

function releaseSwipePointer(card, pointerId) {
  if (card.hasPointerCapture?.(pointerId)) {
    card.releasePointerCapture(pointerId);
  }
}

function resetSwipeCard(card) {
  card.classList.remove("isSwiping", "isDismissReady");
  card.style.transform = "";
  card.style.opacity = "";
}

function swipeDismissThreshold(card) {
  const cardDistance = card.offsetWidth * CARD_DISMISS_RATIO;

  return Math.min(
    CARD_DISMISS_MAX_DISTANCE,
    Math.max(CARD_DISMISS_MIN_DISTANCE, cardDistance)
  );
}

function dismissMatchCard(cardApi, direction) {
  if (cardApi.dismissed) {
    return;
  }

  hideCropZoomPreview();

  const card = cardApi.card;
  const viewportWidth = window.innerWidth || card.offsetWidth || 1;
  const dismissX = (direction < 0 ? -1 : 1) * (viewportWidth + card.offsetWidth);
  let removed = false;

  cardApi.dismissed = true;
  hideCorrectionPrompt(cardApi);
  currentResultCards = currentResultCards.filter((candidate) => candidate !== cardApi);

  card.style.setProperty("--dismiss-x", `${dismissX}px`);
  card.classList.remove("isSwiping", "isDismissReady");
  card.classList.add("isDismissing");
  card.style.transform = "";
  card.style.opacity = "";

  if (currentResultCards.length) {
    updateResultStats();
  }

  const removeCard = () => {
    if (removed) {
      return;
    }

    removed = true;
    card.remove();

    if (!currentResultCards.length) {
      resultsPanel.hidden = true;
      resultCount.textContent = "";
      return;
    }

    updateResultStats();
    sortCards();
  };

  card.addEventListener("transitionend", removeCard, { once: true });
  window.setTimeout(removeCard, 260);
}

function enableCropHoverPreview(cropCanvas) {
  cropCanvas.addEventListener("pointerenter", (event) => {
    showCropZoomPreview(cropCanvas, event);
  });
  cropCanvas.addEventListener("pointermove", positionCropZoomPreview);
  cropCanvas.addEventListener("pointerleave", hideCropZoomPreview);
  cropCanvas.addEventListener("pointercancel", hideCropZoomPreview);
}

function showCropZoomPreview(sourceCanvas, event) {
  if (!cropHoverPreviewQuery?.matches || !sourceCanvas.width || !sourceCanvas.height) {
    return;
  }

  const preview = getCropZoomPreview();
  const maxSide = Math.min(
    CROP_ZOOM_MAX_SIDE,
    window.innerWidth - 32,
    window.innerHeight - 32
  );
  const sourceMaxSide = Math.max(sourceCanvas.width, sourceCanvas.height);
  const scale = Math.min(
    maxSide / sourceMaxSide,
    Math.max(CROP_ZOOM_MIN_SIDE / sourceMaxSide, 1)
  );
  const width = Math.max(1, Math.round(sourceCanvas.width * scale));
  const height = Math.max(1, Math.round(sourceCanvas.height * scale));
  const context = preview.getContext("2d");

  preview.width = width;
  preview.height = height;
  preview.style.width = `${width}px`;
  preview.style.height = `${height}px`;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.clearRect(0, 0, width, height);
  context.drawImage(sourceCanvas, 0, 0, width, height);
  preview.hidden = false;
  positionCropZoomPreview(event);
}

function getCropZoomPreview() {
  if (!cropZoomPreview) {
    cropZoomPreview = document.createElement("canvas");
    cropZoomPreview.className = "cropZoomPreview";
    cropZoomPreview.hidden = true;
    document.body.append(cropZoomPreview);
  }

  return cropZoomPreview;
}

function positionCropZoomPreview(event) {
  if (!cropZoomPreview || cropZoomPreview.hidden || !cropHoverPreviewQuery?.matches) {
    return;
  }

  const margin = 16;
  const width = cropZoomPreview.offsetWidth || cropZoomPreview.width;
  const height = cropZoomPreview.offsetHeight || cropZoomPreview.height;
  let left = event.clientX + margin;
  let top = event.clientY + margin;

  if (left + width + margin > window.innerWidth) {
    left = event.clientX - width - margin;
  }

  if (top + height + margin > window.innerHeight) {
    top = event.clientY - height - margin;
  }

  cropZoomPreview.style.left = `${Math.max(margin, left)}px`;
  cropZoomPreview.style.top = `${Math.max(margin, top)}px`;
}

function hideCropZoomPreview() {
  if (cropZoomPreview) {
    cropZoomPreview.hidden = true;
  }
}

function openCropViewer(sourceCanvas, titleText = "Crop") {
  if (!sourceCanvas.width || !sourceCanvas.height) {
    return;
  }

  hideCropZoomPreview();

  const viewer = getCropViewer();
  const { overlay, canvas, title, scroller } = viewer;
  const context = canvas.getContext("2d");

  title.textContent = titleText || "Crop";
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(sourceCanvas, 0, 0);
  overlay.hidden = false;
  document.body.classList.add("cropViewerOpen");

  const fitZoom = calculateCropViewerFitZoom(sourceCanvas, scroller);
  const coverZoom = calculateCropViewerCoverZoom(sourceCanvas, scroller);
  const initialZoom = coverZoom;

  cropViewerState = {
    sourceWidth: sourceCanvas.width,
    sourceHeight: sourceCanvas.height,
    fitZoom,
    coverZoom,
    zoom: initialZoom,
    drag: null,
  };

  setCropViewerZoom(initialZoom, { preserveCenter: false });
  window.requestAnimationFrame(centerCropViewer);
}

function getCropViewer() {
  if (cropViewer) {
    return cropViewer;
  }

  const overlay = document.createElement("section");
  const panel = document.createElement("div");
  const header = document.createElement("div");
  const title = document.createElement("h2");
  const toolbar = document.createElement("div");
  const zoomOutButton = document.createElement("button");
  const zoomValue = document.createElement("span");
  const zoomInButton = document.createElement("button");
  const resetButton = document.createElement("button");
  const closeButton = document.createElement("button");
  const scroller = document.createElement("div");
  const canvas = document.createElement("canvas");

  overlay.className = "cropViewerOverlay";
  panel.className = "cropViewerWindow";
  header.className = "cropViewerHeader";
  toolbar.className = "cropViewerToolbar";
  zoomValue.className = "cropViewerZoomValue";
  scroller.className = "cropViewerScroller";
  canvas.className = "cropViewerCanvas";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Crop viewer");

  zoomOutButton.type = "button";
  zoomInButton.type = "button";
  resetButton.type = "button";
  closeButton.type = "button";
  zoomOutButton.textContent = "-";
  zoomInButton.textContent = "+";
  resetButton.textContent = "Reset";
  closeButton.textContent = "Close";
  zoomOutButton.setAttribute("aria-label", "Zoom out");
  zoomInButton.setAttribute("aria-label", "Zoom in");
  resetButton.setAttribute("aria-label", "Reset zoom");
  closeButton.setAttribute("aria-label", "Close crop viewer");

  toolbar.append(zoomOutButton, zoomValue, zoomInButton, resetButton, closeButton);
  header.append(title, toolbar);
  scroller.append(canvas);
  panel.append(header, scroller);
  overlay.append(panel);
  document.body.append(overlay);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeCropViewer();
    }
  });
  closeButton.addEventListener("click", closeCropViewer);
  zoomOutButton.addEventListener("click", () => zoomCropViewerBy(1 / CROP_VIEWER_STEP));
  zoomInButton.addEventListener("click", () => zoomCropViewerBy(CROP_VIEWER_STEP));
  resetButton.addEventListener("click", () => {
    if (cropViewerState) {
      setCropViewerZoom(cropViewerState.fitZoom, { preserveCenter: false });
      window.requestAnimationFrame(centerCropViewer);
    }
  });
  scroller.addEventListener("wheel", handleCropViewerWheel, { passive: false });
  canvas.addEventListener("pointerdown", startCropViewerPan);
  canvas.addEventListener("pointermove", moveCropViewerPan);
  canvas.addEventListener("pointerup", endCropViewerPan);
  canvas.addEventListener("pointercancel", endCropViewerPan);

  cropViewer = {
    overlay,
    canvas,
    title,
    scroller,
    zoomValue,
  };

  return cropViewer;
}

function calculateCropViewerFitZoom(sourceCanvas, scroller) {
  const { width: availableWidth, height: availableHeight } = cropViewerAvailableSize(scroller);

  return clampNumber(
    Math.min(availableWidth / sourceCanvas.width, availableHeight / sourceCanvas.height),
    CROP_VIEWER_MIN_ZOOM,
    CROP_VIEWER_MAX_ZOOM
  );
}

function calculateCropViewerCoverZoom(sourceCanvas, scroller) {
  const { width: availableWidth, height: availableHeight } = cropViewerAvailableSize(scroller);

  return clampNumber(
    Math.max(availableWidth / sourceCanvas.width, availableHeight / sourceCanvas.height),
    CROP_VIEWER_MIN_ZOOM,
    CROP_VIEWER_MAX_ZOOM
  );
}

function cropViewerAvailableSize(scroller) {
  return {
    width: Math.max(1, scroller.clientWidth - 28),
    height: Math.max(1, scroller.clientHeight - 28),
  };
}

function setCropViewerZoom(nextZoom, { preserveCenter = true, anchorClientX = null, anchorClientY = null } = {}) {
  if (!cropViewer || !cropViewerState) {
    return;
  }

  const { canvas, scroller, zoomValue } = cropViewer;
  const previousZoom = cropViewerState.zoom || 1;
  const hasAnchor = Number.isFinite(anchorClientX) && Number.isFinite(anchorClientY);
  const scrollerRect = scroller.getBoundingClientRect();
  const anchorX = hasAnchor ? anchorClientX - scrollerRect.left : scroller.clientWidth / 2;
  const anchorY = hasAnchor ? anchorClientY - scrollerRect.top : scroller.clientHeight / 2;
  const canvasOffsetX = canvas.offsetLeft || 0;
  const canvasOffsetY = canvas.offsetTop || 0;
  const imageX = (scroller.scrollLeft + anchorX - canvasOffsetX) / previousZoom;
  const imageY = (scroller.scrollTop + anchorY - canvasOffsetY) / previousZoom;
  const zoom = clampNumber(nextZoom, CROP_VIEWER_MIN_ZOOM, CROP_VIEWER_MAX_ZOOM);

  cropViewerState.zoom = zoom;
  canvas.style.width = `${Math.max(1, Math.round(cropViewerState.sourceWidth * zoom))}px`;
  canvas.style.height = `${Math.max(1, Math.round(cropViewerState.sourceHeight * zoom))}px`;
  zoomValue.textContent = `${Math.round(zoom * 100)}%`;

  if (preserveCenter || hasAnchor) {
    window.requestAnimationFrame(() => {
      scroller.scrollLeft = imageX * zoom + canvasOffsetX - anchorX;
      scroller.scrollTop = imageY * zoom + canvasOffsetY - anchorY;
    });
  }
}

function zoomCropViewerBy(multiplier) {
  if (cropViewerState) {
    setCropViewerZoom(cropViewerState.zoom * multiplier);
  }
}

function handleCropViewerWheel(event) {
  if (!cropViewerState) {
    return;
  }

  event.preventDefault();
  const zoomFactor = Math.exp(-event.deltaY * 0.002);

  setCropViewerZoom(cropViewerState.zoom * zoomFactor, {
    anchorClientX: event.clientX,
    anchorClientY: event.clientY,
  });
}

function startCropViewerPan(event) {
  if (!cropViewerState || event.button !== 0) {
    return;
  }

  cropViewerState.drag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    scrollLeft: cropViewer.scroller.scrollLeft,
    scrollTop: cropViewer.scroller.scrollTop,
  };
  cropViewer.canvas.classList.add("isDragging");
  cropViewer.canvas.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function moveCropViewerPan(event) {
  const drag = cropViewerState?.drag;

  if (!drag || drag.pointerId !== event.pointerId) {
    return;
  }

  cropViewer.scroller.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
  cropViewer.scroller.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
}

function endCropViewerPan(event) {
  const drag = cropViewerState?.drag;

  if (!drag || drag.pointerId !== event.pointerId) {
    return;
  }

  cropViewer.canvas.releasePointerCapture?.(event.pointerId);
  cropViewer.canvas.classList.remove("isDragging");
  cropViewerState.drag = null;
}

function centerCropViewer() {
  if (!cropViewer) {
    return;
  }

  const { scroller } = cropViewer;
  scroller.scrollLeft = Math.max(0, (scroller.scrollWidth - scroller.clientWidth) / 2);
  scroller.scrollTop = Math.max(0, (scroller.scrollHeight - scroller.clientHeight) / 2);
}

function closeCropViewer() {
  if (!cropViewer) {
    return;
  }

  cropViewer.overlay.hidden = true;
  cropViewerState = null;
  document.body.classList.remove("cropViewerOpen");
}

function isCropViewerOpen() {
  return Boolean(cropViewer && !cropViewer.overlay.hidden);
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function loadGameDetails() {
  try {
    const response = await fetch(GAME_DETAILS_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Could not load game details: ${response.status}`);
    }

    const payload = await response.json();
    const records = Array.isArray(payload)
      ? payload
      : Object.values(payload);

    gameDetailsById = new Map(
      records
        .filter((game) => game?.id && game.name)
        .map((game) => [Number(game.id), game])
    );

    console.log(`Loaded ${gameDetailsById.size} game detail records.`);
  } catch (error) {
    console.warn("Game details unavailable:", error);
    gameDetailsById = new Map();
  }
}

function ensureGameDetailsLoaded() {
  if (!gameDetailsLoadPromise) {
    gameDetailsLoadPromise = loadGameDetails();
  }

  return gameDetailsLoadPromise;
}

function ensureGameSearchIndexLoaded() {
  if (!gameSearchLoadPromise) {
    gameSearchLoadPromise = loadGameSearchIndex().catch((error) => {
      gameSearchLoadPromise = null;
      throw error;
    });
  }

  return gameSearchLoadPromise;
}

async function loadGameSearchIndex() {
  await ensureGameDetailsLoaded();

  try {
    const response = await fetch(GAME_SEARCH_INDEX_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Could not load game search index: ${response.status}`);
    }

    const payload = await response.json();
    const records = Array.isArray(payload)
      ? payload
      : Object.values(payload);

    gameSearchIndex = records
      .map(normalizeGameSearchRecord)
      .filter(Boolean);
  } catch (error) {
    console.warn("Game search index unavailable; using details database:", error);
    gameSearchIndex = Array.from(gameDetailsById.values())
      .map(normalizeGameSearchRecord)
      .filter(Boolean);
  }

  gameSearchById = new Map(gameSearchIndex.map((game) => [Number(game.id), game]));
  console.log(`Loaded ${gameSearchIndex.length} searchable game names.`);
}

function normalizeGameSearchRecord(game) {
  const gameId = Number(game?.id);
  const name = String(game?.name || "").trim();

  if (!Number.isInteger(gameId) || gameId <= 0 || !name) {
    return null;
  }

  const details = gameDetailsById.get(gameId) || {};
  const normalizedName = normalizeGameLookupText(name);

  if (!normalizedName) {
    return null;
  }

  return {
    id: gameId,
    name,
    rank: cleanNumber(game.rank ?? details.rank),
    year_published: cleanNumber(game.year_published ?? game.yearpublished ?? details.year_published),
    usersrated: cleanNumber(game.usersrated ?? details.usersrated),
    is_expansion: Boolean(game.is_expansion),
    normalizedName,
    searchTokens: uniqueTokens(normalizedName),
  };
}

function updateCorrectionSuggestions(card) {
  const {
    correctionInput,
    correctionSuggestions,
    correctionStatus,
  } = card.feedbackControls;
  const suggestions = searchGameCandidates(correctionInput.value, MAX_CORRECTION_SUGGESTIONS);

  renderCorrectionSuggestions(card, suggestions);

  if (!correctionInput.value.trim()) {
    correctionStatus.textContent = "Type a game name, BGG URL, or BGG ID.";
  } else if (suggestions.length) {
    correctionStatus.textContent = "Press Enter to use the best match.";
  } else {
    correctionStatus.textContent = "No local suggestion yet. Paste a BGG URL or enter a BGG ID.";
  }
}

function renderCorrectionSuggestions(card, suggestions) {
  const {
    correctionInput,
    correctionSuggestions,
  } = card.feedbackControls;
  const fragment = document.createDocumentFragment();

  for (const suggestion of suggestions) {
    const button = document.createElement("button");
    const name = document.createElement("span");
    const meta = document.createElement("small");

    button.type = "button";
    button.className = "correctionSuggestion";
    name.textContent = suggestion.name;
    meta.textContent = gameSuggestionMeta(suggestion);
    button.append(name, meta);
    button.addEventListener("click", () => {
      correctionInput.value = suggestion.name;
      renderCorrectionSuggestions(card, [suggestion]);
      submitCorrectedReference(new Event("submit"), card);
    });
    fragment.append(button);
  }

  correctionSuggestions.replaceChildren(fragment);
}

function searchGameCandidates(value, limit = 5) {
  const bggId = extractBggId(value);

  if (bggId && gameSearchById.has(bggId)) {
    return [{ ...gameSearchById.get(bggId), searchScore: 1.3 }];
  }

  const query = normalizeGameLookupText(stripSuggestionMeta(value));

  if (!query) {
    return [];
  }

  const queryTokens = uniqueTokens(query);

  return gameSearchIndex
    .map((game) => ({
      ...game,
      searchScore: scoreGameCandidate(query, queryTokens, game),
    }))
    .filter((game) => game.searchScore >= 0.56)
    .sort(compareGameCandidates)
    .slice(0, limit);
}

function stripSuggestionMeta(value) {
  return String(value || "")
    .replace(/\s+·\s+BGG\s+\d+.*$/i, "")
    .replace(/\s*\((?:BGG\s*)?\d+\)\s*$/i, "")
    .trim();
}

function uniqueTokens(value) {
  return Array.from(new Set(String(value || "").split(" ").filter(Boolean)));
}

function scoreGameCandidate(query, queryTokens, game) {
  if (!query || !queryTokens.length || !game.normalizedName) {
    return 0;
  }

  const name = game.normalizedName;

  if (name === query) {
    return 1.3;
  }

  const fullPhraseScore = scorePhraseMatch(query, name);
  const tokenScore = scoreTokenMatch(queryTokens, game.searchTokens);
  const lengthRatio = Math.min(query.length, name.length) / Math.max(query.length, name.length);
  const phraseWeight = fullPhraseScore >= 0.9 ? 0.58 : 0.38;
  const tokenWeight = fullPhraseScore >= 0.9 ? 0.32 : 0.52;
  const coverageBoost = Math.min(queryTokens.length, game.searchTokens.length) >= 2 ? 0.08 : 0;
  const variantBoost = queryTokens.length > 1 && allQueryTokensAppear(queryTokens, game.searchTokens) ? 0.14 : 0;
  const shortPenalty = getShortMatchPenalty(queryTokens, game.searchTokens, tokenScore, fullPhraseScore);
  const expansionPenalty = game.is_expansion && !query.includes("expansion") ? 0.015 : 0;
  const rankBoost = game.rank ? Math.max(0, 0.04 - Math.log10(game.rank + 1) * 0.007) : 0;
  const score = fullPhraseScore * phraseWeight
    + tokenScore * tokenWeight
    + lengthRatio * 0.08
    + coverageBoost
    + variantBoost
    + rankBoost
    - shortPenalty
    - expansionPenalty;

  return Math.max(0, score);
}

function scorePhraseMatch(query, name) {
  if (name === query) {
    return 1;
  }

  if (name.startsWith(query)) {
    return query.length >= 5 ? 0.98 : 0.9;
  }

  if (name.includes(query)) {
    return query.length >= 5 ? 0.95 : 0.82;
  }

  if (query.length >= 5 && name.length >= 5) {
    return boundedEditSimilarity(query, name);
  }

  return 0;
}

function scoreTokenMatch(queryTokens, candidateTokens) {
  let total = 0;
  let strongMatches = 0;

  for (const token of queryTokens) {
    const similarity = bestTokenSimilarity(token, candidateTokens);
    total += similarity;

    if (similarity >= 0.86) {
      strongMatches += 1;
    }
  }

  const average = total / queryTokens.length;
  const coverage = strongMatches / queryTokens.length;

  if (coverage < 0.5 && average < 0.78) {
    return average * 0.55;
  }

  return average * 0.72 + coverage * 0.28;
}

function allQueryTokensAppear(queryTokens, candidateTokens) {
  return queryTokens.every((token) => bestTokenSimilarity(token, candidateTokens) >= 0.9);
}

function getShortMatchPenalty(queryTokens, candidateTokens, tokenScore, phraseScore) {
  const queryLength = queryTokens.join("").length;
  const nameLength = candidateTokens.join("").length;

  if (queryTokens.length > 1 || queryLength >= 7) {
    return 0;
  }

  if (queryLength <= 4 && nameLength <= 5 && tokenScore >= 0.78 && phraseScore < 0.9) {
    return 0.18;
  }

  if (queryLength <= 5 && candidateTokens.length === 1) {
    return 0.08;
  }

  return 0;
}

function bestTokenSimilarity(token, candidateTokens) {
  let best = 0;

  for (const candidate of candidateTokens) {
    best = Math.max(best, tokenSimilarity(token, candidate));

    if (best >= 1) {
      return best;
    }
  }

  return best;
}

function tokenSimilarity(left, right) {
  if (left === right) {
    return 1;
  }

  if (right.startsWith(left) && left.length >= 3) {
    return left.length >= 5 ? 0.95 : 0.88;
  }

  if (left.startsWith(right) && right.length >= 4) {
    return 0.88;
  }

  if (right.includes(left) && left.length >= 4) {
    return 0.86;
  }

  if (left.includes(right) && right.length >= 4) {
    return 0.82;
  }

  if (left.length >= 5 && right.length >= 5) {
    return boundedEditSimilarity(left, right);
  }

  return 0;
}

function boundedEditSimilarity(left, right) {
  const maxLength = Math.max(left.length, right.length);

  if (!maxLength) {
    return 1;
  }

  if (Math.abs(left.length - right.length) > Math.max(3, Math.ceil(maxLength * 0.45))) {
    return 0;
  }

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array(right.length + 1).fill(0);

  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= right.length; j += 1) {
      const substitutionCost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + substitutionCost
      );
    }

    for (let j = 0; j <= right.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return 1 - previous[right.length] / maxLength;
}

function compareGameCandidates(left, right) {
  const scoreDelta = right.searchScore - left.searchScore;

  if (Math.abs(scoreDelta) > 0.0001) {
    return scoreDelta;
  }

  const leftRank = left.rank || Number.MAX_SAFE_INTEGER;
  const rightRank = right.rank || Number.MAX_SAFE_INTEGER;

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return left.name.localeCompare(right.name);
}

function gameSuggestionMeta(game) {
  const parts = [`BGG ${game.id}`];

  if (game.year_published) {
    parts.push(String(game.year_published));
  }

  if (game.rank) {
    parts.push(`rank ${game.rank}`);
  }

  if (game.is_expansion) {
    parts.push("expansion");
  }

  return parts.join(" · ");
}

function resolveCorrectedGame(value) {
  const text = String(value || "").trim();

  if (!text) {
    return null;
  }

  const bggId = extractBggId(text);

  if (bggId) {
    return gameSearchById.get(bggId) || gameDetailsById.get(bggId) || {
      id: bggId,
      name: fallbackGameNameFromInput(text, bggId),
    };
  }

  const query = normalizeGameLookupText(stripSuggestionMeta(text));

  if (!query) {
    return null;
  }

  const exact = gameSearchIndex.find((game) => game.normalizedName === query);

  if (exact) {
    return exact;
  }

  const suggestions = searchGameCandidates(query, 1);

  return suggestions[0] || null;
}

function extractBggId(value) {
  const text = String(value || "");
  const patterns = [
    /boardgame\/(\d+)/i,
    /\bBGG\s*#?\s*(\d+)\b/i,
    /\((?:BGG\s*)?(\d+)\)\s*$/i,
    /^\s*(\d+)\s*$/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      const id = Number(match[1]);

      if (Number.isInteger(id) && id > 0) {
        return id;
      }
    }
  }

  return null;
}

function fallbackGameNameFromInput(value, gameId) {
  const slugMatch = String(value || "").match(/boardgame\/\d+\/([^/?#]+)/i);

  if (!slugMatch) {
    return `BGG ${gameId}`;
  }

  const words = slugMatch[1]
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

  return words.length ? words.join(" ") : `BGG ${gameId}`;
}

function normalizeGameLookupText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function initThemeControl() {
  setThemePreference(getStoredThemePreference(), { persist: false });

  if (systemLightThemeQuery?.addEventListener) {
    systemLightThemeQuery.addEventListener("change", () => {
      if (themePreference === "auto") {
        applyThemePreference(themePreference);
      }
    });
  } else if (systemLightThemeQuery?.addListener) {
    systemLightThemeQuery.addListener(() => {
      if (themePreference === "auto") {
        applyThemePreference(themePreference);
      }
    });
  }
}

function setThemePreference(preference, { persist = true } = {}) {
  const nextPreference = THEME_OPTIONS.includes(preference) ? preference : "auto";
  themePreference = nextPreference;

  if (persist) {
    storeThemePreference(nextPreference);
  }

  applyThemePreference(nextPreference);
}

function handleThemeOptionKeydown(event) {
  const currentIndex = THEME_OPTIONS.indexOf(themePreference);
  let nextIndex = currentIndex;

  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    nextIndex = Math.max(0, currentIndex - 1);
  } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    nextIndex = Math.min(THEME_OPTIONS.length - 1, currentIndex + 1);
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = THEME_OPTIONS.length - 1;
  } else {
    return;
  }

  event.preventDefault();
  setThemePreference(THEME_OPTIONS[nextIndex]);

  const nextButton = themeOptionButtons.find((button) => button.dataset.themeOption === THEME_OPTIONS[nextIndex]);
  nextButton?.focus();
}

function getStoredThemePreference() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);

    return THEME_OPTIONS.includes(stored) ? stored : "auto";
  } catch {
    return "auto";
  }
}

function storeThemePreference(preference) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Ignore storage failures; the live theme still updates.
  }
}

function applyThemePreference(preference) {
  const resolvedTheme = resolveThemePreference(preference);
  const label = preference === "auto"
    ? `Auto (${resolvedTheme})`
    : preference.charAt(0).toUpperCase() + preference.slice(1);

  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = resolvedTheme;
  themeValue.textContent = label;
  updateThemeOptionButtons(preference);

  if (themeColorMeta) {
    themeColorMeta.content = resolvedTheme === "light" ? "#f7f3ed" : "#080913";
  }
}

function updateThemeOptionButtons(preference) {
  for (const button of themeOptionButtons) {
    const isSelected = button.dataset.themeOption === preference;
    button.classList.toggle("isSelected", isSelected);
    button.setAttribute("aria-checked", isSelected ? "true" : "false");
    button.tabIndex = isSelected ? 0 : -1;
  }
}

function resolveThemePreference(preference) {
  if (preference === "light" || preference === "dark") {
    return preference;
  }

  return systemLightThemeQuery?.matches ? "light" : "dark";
}

async function loginContributor(event) {
  event.preventDefault();

  const password = contributorPasswordInput.value.trim();
  const nextApiBase = configuredApiBase();

  if (!password) {
    contributorStatus.textContent = "Enter the contributor password.";
    contributorPasswordInput.focus();
    return;
  }

  contributorStatus.textContent = "Checking password...";

  try {
    const response = await fetch(apiUrl("/contributor-login", nextApiBase), {
      method: "POST",
      headers: {
        [CONTRIBUTOR_PASSWORD_HEADER]: password,
      },
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      throw new Error(result.detail || `Login failed: ${response.status}`);
    }

    contributorPassword = password;
    contributorApiBase = nextApiBase;
    resetBackendMatcherProbe();

    contributorPasswordInput.value = "";
    contributorStatus.textContent = "Contributor mode enabled.";
    setContributorMode(true);
    selectContributorTab("latest");
    setStatus("Contributor mode on. Use OK or X on each match.");
  } catch (error) {
    console.error(error);
    contributorStatus.textContent = error.message || "Contributor login failed.";
  }
}

function logoutContributor() {
  contributorPassword = "";
  setContributorMode(false);
  clearContributorReview();
  selectContributorTab("mode", { load: false });
  contributorStatus.textContent = "Contributor mode disabled.";
  setStatus("Contributor mode off.");
}

function setContributorMode(enabled) {
  contributorMode = enabled;
  document.body.classList.toggle("contributorMode", contributorMode);
  contributorModeState.textContent = contributorMode ? "On" : "Off";
  contributorTabs.hidden = !contributorMode;
  contributorLoginButton.hidden = contributorMode;
  contributorLogoutButton.hidden = !contributorMode;
  contributorPasswordInput.disabled = contributorMode;

  if (!contributorMode) {
    contributorReviewLoadPromise = null;
  }

  for (const card of currentResultCards) {
    updateFeedbackActions(card);
  }
}

function handleInfoPanelBackdropClick(event) {
  if (event.target === infoPanel) {
    setInfoPanelOpen(false);
  }
}

function setInfoPanelOpen(open, { focusContributor = false } = {}) {
  if (!infoPanel) {
    console.warn("Info panel is missing from the page.");
    return;
  }

  infoPanel.hidden = !open;
  infoButton.setAttribute("aria-expanded", open ? "true" : "false");

  if (open) {
    contributorApiBase = configuredApiBase();
    contributorStatus.textContent = contributorMode
      ? "Contributor mode is active."
      : "Enter the contributor password.";
    if (contributorMode && contributorActiveTab === "latest") {
      loadContributorReview();
    }
    window.setTimeout(() => {
      if (focusContributor) {
        contributorPasswordInput.focus();
      } else {
        infoCloseButton.focus();
      }
    }, 0);
  }
}

function selectContributorTab(tab, { load = true } = {}) {
  const nextTab = tab === "latest" ? "latest" : "mode";

  if (nextTab === "latest" && (!contributorMode || !contributorPassword)) {
    contributorStatus.textContent = "Log in before reviewing saved images.";
    contributorActiveTab = "mode";
  } else {
    contributorActiveTab = nextTab;
  }

  for (const button of contributorTabButtons) {
    const selected = button.dataset.contributorTab === contributorActiveTab;
    button.classList.toggle("isSelected", selected);
    button.setAttribute("aria-selected", selected ? "true" : "false");
  }

  for (const panel of contributorPanels) {
    panel.hidden = panel.dataset.contributorPanel !== contributorActiveTab;
  }

  if (contributorActiveTab === "latest" && load) {
    loadContributorReview();
    scrollContributorReviewIntoView();
  }
}

function scrollContributorReviewIntoView() {
  window.setTimeout(() => {
    contributorReviewPanel?.scrollIntoView({
      block: "start",
      behavior: "smooth",
    });
  }, 60);
}

async function loadContributorReview({ force = false } = {}) {
  if (!contributorMode || !contributorPassword) {
    contributorReviewStatus.textContent = "Log in to review saved references.";
    selectContributorTab("mode", { load: false });
    return;
  }

  if (force) {
    contributorReviewLoadPromise = null;
  }

  if (contributorReviewLoadPromise) {
    return contributorReviewLoadPromise;
  }

  contributorReviewRefreshButton.disabled = true;
  contributorReviewStatus.textContent = "Loading latest saved images...";

  contributorReviewLoadPromise = fetchWithTimeout(
    apiUrl(`/contributor/recent-references?limit=${CONTRIBUTOR_RECENT_REFERENCE_LIMIT}`, contributorApiBase),
    {
      cache: "no-store",
      headers: {
        [CONTRIBUTOR_PASSWORD_HEADER]: contributorPassword,
      },
    },
    CONTRIBUTOR_REVIEW_TIMEOUT_MS
  )
    .then(async (response) => {
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.detail || `Could not load references: ${response.status}`);
      }

      renderContributorReview(result.references || [], result.total || 0);
      return result;
    })
    .catch((error) => {
      console.error(error);
      contributorReviewStatus.textContent = error.message || "Could not load latest images.";
      return null;
    })
    .finally(() => {
      contributorReviewRefreshButton.disabled = false;
      contributorReviewLoadPromise = null;
    });

  return contributorReviewLoadPromise;
}

function renderContributorReview(references, total) {
  clearContributorReviewImages();
  contributorReviewGrid.replaceChildren();
  contributorReviewCount.textContent = references.length
    ? `${references.length}${total > references.length ? `/${total}` : ""}`
    : "";

  if (!references.length) {
    contributorReviewStatus.textContent = "No saved references yet.";
    return;
  }

  contributorReviewStatus.textContent = "Review recent contributor references.";

  for (const reference of references) {
    contributorReviewGrid.append(createContributorReviewCard(reference));
  }
}

function createContributorReviewCard(reference) {
  const card = document.createElement("article");
  const image = document.createElement("img");
  const body = document.createElement("div");
  const title = document.createElement("strong");
  const meta = document.createElement("div");
  const quality = document.createElement("div");
  const feedback = document.createElement("div");
  const actions = document.createElement("div");
  const confirmButton = document.createElement("button");
  const denyButton = document.createElement("button");
  const bggLink = document.createElement("a");
  const status = document.createElement("div");

  card.className = "contributorReviewCard";
  image.className = "contributorReviewImage";
  body.className = "contributorReviewBody";
  meta.className = "contributorReviewMeta";
  quality.className = "contributorReviewQuality";
  feedback.className = "contributorReviewFeedback";
  actions.className = "contributorReviewActions";
  status.className = "contributorReviewItemStatus";

  image.alt = reference.name;
  image.loading = "lazy";
  image.decoding = "async";
  title.textContent = reference.name;
  meta.textContent = `BGG ${reference.id} · ${formatReferenceDate(reference.created_at)}`;
  quality.textContent = formatReferenceQuality(reference);
  feedback.textContent = formatReferenceFeedback(reference.feedback);
  confirmButton.type = "button";
  denyButton.type = "button";
  confirmButton.textContent = "Looks right";
  denyButton.textContent = "Wrong label";
  bggLink.href = reference.bgg_url || `https://boardgamegeek.com/boardgame/${reference.id}`;
  bggLink.target = "_blank";
  bggLink.rel = "noreferrer";
  bggLink.textContent = "BGG";
  status.textContent = "Waiting for review";

  loadContributorReferenceImage(reference, image);
  confirmButton.addEventListener("click", () => submitContributorReferenceReview(reference, "confirm", {
    card,
    confirmButton,
    denyButton,
    feedback,
    status,
  }));
  denyButton.addEventListener("click", () => submitContributorReferenceReview(reference, "deny", {
    card,
    confirmButton,
    denyButton,
    feedback,
    status,
  }));

  actions.append(confirmButton, denyButton, bggLink);
  body.append(title, meta, quality, feedback, actions, status);
  card.append(image, body);

  return card;
}

async function loadContributorReferenceImage(reference, image) {
  try {
    const response = await fetchWithTimeout(
      apiUrl(`/contributor/reference-image?path=${encodeURIComponent(reference.image_path)}`, contributorApiBase),
      {
        cache: "no-store",
        headers: {
          [CONTRIBUTOR_PASSWORD_HEADER]: contributorPassword,
        },
      },
      CONTRIBUTOR_REVIEW_TIMEOUT_MS
    );

    if (!response.ok) {
      throw new Error(`Image failed: ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    contributorReviewImageUrls.push(url);
    image.src = url;
  } catch (error) {
    console.warn(`Could not load reference image ${reference.image_path}:`, error);
    image.classList.add("loadFailed");
    image.alt = "Image unavailable";
  }
}

async function submitContributorReferenceReview(reference, action, controls) {
  const { card, confirmButton, denyButton, feedback, status } = controls;

  if (!contributorMode || !contributorPassword) {
    selectContributorTab("mode", { load: false });
    contributorPasswordInput.focus();
    return;
  }

  confirmButton.disabled = true;
  denyButton.disabled = true;
  status.textContent = action === "confirm" ? "Confirming..." : "Flagging...";

  try {
    const formData = new FormData();

    formData.append("action", action);
    formData.append("game_id", String(reference.id));
    formData.append("game_name", reference.name);
    formData.append("reference_image_path", reference.image_path);

    const response = await fetch(apiUrl("/contributor/reference-feedback", contributorApiBase), {
      method: "POST",
      headers: {
        [CONTRIBUTOR_PASSWORD_HEADER]: contributorPassword,
      },
      body: formData,
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      throw new Error(result.detail || `Feedback failed: ${response.status}`);
    }

    reference.feedback = result.feedback || reference.feedback || {};
    feedback.textContent = formatReferenceFeedback(reference.feedback);
    card.classList.toggle("reviewConfirmed", action === "confirm");
    card.classList.toggle("reviewDenied", action === "deny");
    status.textContent = action === "confirm" ? "Marked right" : "Marked wrong";
    setStatus(`${reference.name} review saved.`);
  } catch (error) {
    console.error(error);
    status.textContent = error.message || "Could not save review.";
    confirmButton.disabled = false;
    denyButton.disabled = false;
  }
}

function clearContributorReview() {
  clearContributorReviewImages();
  contributorReviewGrid.replaceChildren();
  contributorReviewCount.textContent = "";
  contributorReviewStatus.textContent = "Log in to review saved references.";
}

function clearContributorReviewImages() {
  for (const url of contributorReviewImageUrls) {
    URL.revokeObjectURL(url);
  }

  contributorReviewImageUrls = [];
}

function formatReferenceDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "recent";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatReferenceQuality(reference) {
  const parts = [];

  if (reference.image_width && reference.image_height) {
    parts.push(`${reference.image_width}x${reference.image_height}`);
  }

  if (reference.quality_score) {
    parts.push(`quality ${reference.quality_score.toFixed(2)}`);
  }

  if (reference.cleanliness_score) {
    parts.push(`clean ${reference.cleanliness_score.toFixed(2)}`);
  }

  return parts.length ? parts.join(" · ") : "No quality score yet";
}

function formatReferenceFeedback(feedback = {}) {
  const positive = cleanNumber(feedback.positive);
  const falsePositive = cleanNumber(feedback.false_positive);

  if (!positive && !falsePositive) {
    return "No feedback yet";
  }

  return `Feedback +${positive} / -${falsePositive}`;
}

function updateFeedbackActions(card) {
  const best = card.matches[0];
  const { confirmButton, denyButton, feedbackStatus } = card.feedbackControls;
  const waiting = !best;
  const disabled = waiting || card.feedbackSent;

  confirmButton.textContent = contributorMode ? "OK" : "Yes";
  denyButton.textContent = contributorMode ? "X" : "No";
  confirmButton.setAttribute("aria-label", contributorMode ? "Confirm recognition" : "Yes, this match is right");
  denyButton.setAttribute("aria-label", contributorMode ? "Deny recognition" : "No, this match is wrong");
  confirmButton.hidden = card.feedbackSent;
  denyButton.hidden = card.feedbackSent;
  confirmButton.disabled = disabled;
  denyButton.disabled = disabled;

  if (card.feedbackSent) {
    return;
  }

  if (card.matchFailed) {
    feedbackStatus.textContent = "No match available";
  } else if (waiting) {
    feedbackStatus.textContent = "Waiting for match";
  } else if (contributorMode) {
    feedbackStatus.textContent = "Confirm or deny";
  } else {
    feedbackStatus.textContent = card.isConfident
      ? "Is this right?"
      : "This might be it. Is it right?";
  }
}

async function submitRecognitionFeedback(card, action) {
  const best = card.matches[0];
  const { confirmButton, denyButton, feedbackStatus } = card.feedbackControls;

  if (contributorMode && !contributorPassword) {
    setInfoPanelOpen(true, { focusContributor: true });
    return;
  }

  if (!best) {
    feedbackStatus.textContent = "No match yet";
    return;
  }

  confirmButton.disabled = true;
  denyButton.disabled = true;
  feedbackStatus.textContent = action === "confirm" ? "Confirming..." : "Sending...";

  try {
    await sendRecognitionFeedback(card, action, best, {
      confident: card.isConfident,
      contributor: contributorMode,
    });
    card.feedbackSent = true;
    updateFeedbackActions(card);
    card.card.classList.toggle("feedbackConfirmed", action === "confirm");
    card.card.classList.toggle("feedbackDenied", action === "deny");

    if (action === "confirm") {
      card.applyFilters();
      feedbackStatus.textContent = acceptedFeedbackText(card);
      setStatus(`${best.name} confirmed.`);
    } else if (contributorMode) {
      feedbackStatus.textContent = "Denied";
      setStatus(`${best.name} denied. Add the correct game.`);
      showCorrectionPrompt(card);
    } else {
      feedbackStatus.textContent = "Thanks";
      setStatus(`${best.name} marked as wrong.`);
      dismissMatchCard(card, 1);
    }
  } catch (error) {
    console.error(error);
    feedbackStatus.textContent = "Could not send";
    confirmButton.disabled = false;
    denyButton.disabled = false;
  }
}

function acceptedFeedbackText(card) {
  const result = evaluateCardAgainstFilters(card);

  if (result.className === "yes") {
    return result.text === "Confident match"
      ? "Accepted"
      : `Accepted · ${result.text}`;
  }

  if (result.className === "no") {
    return `Accepted · ${result.text}`;
  }

  return `Accepted · ${result.text}`;
}

async function submitCorrectedReference(event, card) {
  event.preventDefault();

  const {
    correctionInput,
    correctionSaveButton,
    correctionCancelButton,
    correctionStatus,
    feedbackStatus,
  } = card.feedbackControls;

  if (correctionSaveButton.disabled) {
    return;
  }

  if (!contributorMode || !contributorPassword) {
    setInfoPanelOpen(true, { focusContributor: true });
    return;
  }

  correctionSaveButton.disabled = true;
  correctionCancelButton.disabled = true;
  correctionStatus.textContent = "Checking game...";

  try {
    await ensureGameSearchIndexLoaded();
    const game = resolveCorrectedGame(correctionInput.value);

    if (!game) {
      correctionStatus.textContent = "Choose a suggestion, paste a BGG URL, or enter a BGG ID.";
      correctionSaveButton.disabled = false;
      correctionCancelButton.disabled = false;
      correctionInput.focus();
      return;
    }

    correctionStatus.textContent = "Saving correct reference...";
    await sendRecognitionFeedback(
      card,
      "confirm",
      {
        id: game.id,
        name: game.name,
        score: 1,
        rank_score: 1,
        source: "contributor_correction",
      },
      { confident: true, contributor: true }
    );

    card.feedbackSent = true;
    card.card.classList.add("feedbackConfirmed");
    card.card.classList.remove("feedbackDenied");
    card.setCorrectedGame(game);
    hideCorrectionPrompt(card, { clear: false });
    feedbackStatus.textContent = "Corrected";
    setStatus(`${game.name} saved as the correct reference.`);
  } catch (error) {
    console.error(error);
    correctionStatus.textContent = error.message || "Could not save correct game.";
    correctionSaveButton.disabled = false;
    correctionCancelButton.disabled = false;
  }
}

function handleCorrectionInputKeyDown(event, card) {
  if (event.key !== "Enter" || event.isComposing) {
    return;
  }

  event.preventDefault();
  submitCorrectedReference(event, card);
}

async function sendRecognitionFeedback(card, action, match, { confident = false, contributor = false } = {}) {
  const blob = await canvasToBlob(card.cropCanvas);
  const formData = new FormData();

  formData.append("file", blob, "crop.jpg");
  formData.append("action", action);
  formData.append("game_id", String(match.id));
  formData.append("game_name", match.name);
  formData.append("score", String(cleanNumber(match.score)));
  formData.append("rank_score", String(cleanNumber(match.rank_score ?? match.score)));
  formData.append("source", match.source || "");
  formData.append("reference_image_path", match.reference_image_path || "");
  formData.append("confident", confident ? "true" : "false");

  const headers = contributor
    ? { [CONTRIBUTOR_PASSWORD_HEADER]: contributorPassword }
    : {};
  const response = await fetch(apiUrl("/recognition-feedback", contributorApiBase), {
    method: "POST",
    headers,
    body: formData,
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.ok) {
    throw new Error(result.detail || `Feedback failed: ${response.status}`);
  }

  return result;
}

async function showCorrectionPrompt(card) {
  const {
    correctionPanel,
    correctionInput,
    correctionSaveButton,
    correctionCancelButton,
    correctionStatus,
  } = card.feedbackControls;

  correctionPanel.hidden = false;
  correctionPanel.classList.add("isOpen");
  correctionInput.value = "";
  correctionSaveButton.disabled = false;
  correctionCancelButton.disabled = false;
  correctionStatus.textContent = "Loading game search...";

  try {
    await ensureGameSearchIndexLoaded();
    updateCorrectionSuggestions(card);
  } catch (error) {
    console.warn("Game suggestions unavailable:", error);
    correctionStatus.textContent = "Suggestions unavailable. Paste a BGG URL or enter a BGG ID.";
  }

  window.setTimeout(() => correctionInput.focus(), 0);
}

function hideCorrectionPrompt(card, { clear = true } = {}) {
  const {
    correctionPanel,
    correctionInput,
    correctionSuggestions,
    correctionSaveButton,
    correctionCancelButton,
    correctionStatus,
  } = card.feedbackControls;

  correctionPanel.hidden = true;
  correctionPanel.classList.remove("isOpen");
  correctionSaveButton.disabled = false;
  correctionCancelButton.disabled = false;

  if (clear) {
    correctionInput.value = "";
    correctionSuggestions.replaceChildren();
    correctionStatus.textContent = "";
  }
}

function handleFilterChange() {
  updateFilterSummary();

  for (const card of currentResultCards) {
    card.applyFilters();
  }

  updateResultStats();
  sortCards();
}

function updateFilterSummary() {
  const filters = getFilters();
  const parts = [];

  if (filters.players) {
    parts.push(`${filters.players} player${filters.players === 1 ? "" : "s"}`);
  }

  if (filters.maxTime) {
    parts.push(`under ${filters.maxTime} min`);
  }

  if (filters.maxWeight < 5) {
    parts.push(`${filters.complexityLabel.toLowerCase()} complexity`);
  }

  filterSummary.textContent = parts.length ? parts.join(" · ") : "Any game";
}

function getFilters() {
  const players = cleanNumber(playersFilter.value);
  const maxTime = cleanNumber(timeFilter.value);
  const maxWeight = cleanNumber(complexityFilter.value) || 5;
  const complexityLabel = complexityFilter.selectedOptions[0]?.textContent || "Any";

  return {
    players,
    maxTime,
    maxWeight,
    complexityLabel,
    hasAny: Boolean(players || maxTime || maxWeight < 5),
  };
}

function evaluateCardAgainstFilters(card) {
  const filters = getFilters();

  if (!card.matches.length) {
    return {
      fits: false,
      rank: "-1",
      className: "pending",
      text: "Waiting for match",
    };
  }

  if (!card.isConfident) {
    return {
      fits: false,
      rank: "1",
      className: "unknown",
      text: "Match is too uncertain for filters",
    };
  }

  if (!card.details) {
    return {
      fits: false,
      rank: "1",
      className: "unknown",
      text: "No local data to check filters",
    };
  }

  const result = gameFitsFilters(card.details, filters);

  if (result.fits) {
    return {
      fits: true,
      rank: "3",
      className: "yes",
      text: filters.hasAny ? "Fits your filters" : "Confident match",
    };
  }

  return {
    fits: false,
    rank: "0",
    className: "no",
    text: result.reasons.join(" · "),
  };
}

function gameFitsFilters(details, filters) {
  const reasons = [];

  if (filters.players && !supportsPlayerCount(details, filters.players)) {
    reasons.push(`Not ${filters.players} players`);
  }

  if (filters.maxTime && !supportsMaxTime(details, filters.maxTime)) {
    reasons.push(`Over ${filters.maxTime} min`);
  }

  if (filters.maxWeight < 5 && !supportsComplexity(details, filters.maxWeight)) {
    reasons.push(`Above ${filters.complexityLabel.toLowerCase()}`);
  }

  return {
    fits: reasons.length === 0,
    reasons,
  };
}

function supportsPlayerCount(details, players) {
  const minPlayers = cleanNumber(details.min_players);
  const maxPlayers = cleanNumber(details.max_players);

  if (!minPlayers && !maxPlayers) {
    return false;
  }

  return players >= (minPlayers || maxPlayers) && players <= (maxPlayers || minPlayers);
}

function supportsMaxTime(details, maxTime) {
  const duration = cleanNumber(details.max_playtime || details.playing_time);

  if (!duration) {
    return false;
  }

  return duration <= maxTime;
}

function supportsComplexity(details, maxWeight) {
  const weight = cleanNumber(details.average_weight);

  if (!weight) {
    return false;
  }

  return weight <= maxWeight;
}

function renderGameDetails(container, matches) {
  container.replaceChildren();

  if (!isConfidentMatch(matches)) {
    container.textContent = "Game details hidden until the match is stronger.";
    container.classList.add("muted");
    return;
  }

  container.classList.remove("muted");

  const best = matches[0];
  const details = gameDetailsById.get(Number(best.id));

  if (!details) {
    container.textContent = "No local details for this game yet.";
    container.classList.add("muted");
    return;
  }

  const rows = [
    ["Players", formatPlayers(details)],
    ["Time", formatDuration(details)],
    ["Weight", formatWeight(details.average_weight)],
  ].filter(([, value]) => value);

  for (const [label, value] of rows) {
    const row = document.createElement("div");
    const labelNode = document.createElement("span");
    const valueNode = document.createElement("strong");

    labelNode.textContent = label;
    valueNode.textContent = value;
    row.append(labelNode, valueNode);
    container.append(row);
  }

  if (details.bgg_url) {
    const link = document.createElement("a");

    link.href = details.bgg_url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Open on BGG";
    container.append(link);
  }
}

function isConfidentMatch(matches) {
  const best = matches[0];

  if (!best) {
    return false;
  }

  const runnerUp = matches[1];
  const score = matchSortScore(best);
  const displayedScore = displayedMatchScore(best);
  const requiredScore = best.source === "user_ref"
    ? DETAIL_USER_REF_SCORE_THRESHOLD
    : DETAIL_SCORE_THRESHOLD;
  const margin = runnerUp
    ? score - matchSortScore(runnerUp)
    : DETAIL_MARGIN_THRESHOLD;

  if (scoreAtLeast(displayedScore, DETAIL_STRONG_SCORE_THRESHOLD)) {
    return true;
  }

  return scoreAtLeast(score, requiredScore) && scoreAtLeast(margin, DETAIL_MARGIN_THRESHOLD);
}

function formatMatchScoreText(match) {
  const similarity = cleanNumber(match?.score);
  const confidence = matchSortScore(match);
  const roundedSimilarity = similarity.toFixed(SCORE_DISPLAY_DECIMALS);
  const roundedConfidence = confidence.toFixed(SCORE_DISPLAY_DECIMALS);

  if (roundedSimilarity !== roundedConfidence) {
    return `Similarity ${roundedSimilarity} · confidence ${roundedConfidence}`;
  }

  return `Similarity ${roundedSimilarity}`;
}

function displayedMatchScore(match) {
  return Number(matchSortScore(match).toFixed(SCORE_DISPLAY_DECIMALS));
}

function scoreAtLeast(score, threshold) {
  return score + SCORE_THRESHOLD_EPSILON >= threshold;
}

function formatMatchSource(match) {
  const source = String(match.source || "match").replace(/_/g, " ");
  const engine = match.matcher === "backend"
    ? "server"
    : match.matcher === "contributor"
      ? "contributor"
      : "browser";
  const parts = [engine, source];

  if (match.shape_penalized) {
    parts.push("spine adjusted");
  }

  return parts.join(" · ");
}

function formatPlayers(details) {
  if (details.players) {
    return details.players;
  }

  const minPlayers = cleanNumber(details.min_players);
  const maxPlayers = cleanNumber(details.max_players);

  if (!minPlayers && !maxPlayers) {
    return "";
  }

  if (minPlayers === maxPlayers || !maxPlayers) {
    return String(minPlayers || maxPlayers);
  }

  return `${minPlayers}-${maxPlayers}`;
}

function formatDuration(details) {
  if (details.duration) {
    return details.duration;
  }

  const minTime = cleanNumber(details.min_playtime);
  const maxTime = cleanNumber(details.max_playtime || details.playing_time);

  if (!minTime && !maxTime) {
    return "";
  }

  if (minTime === maxTime || !maxTime) {
    return `${minTime || maxTime} min`;
  }

  return `${minTime}-${maxTime} min`;
}

function formatWeight(value) {
  const weight = cleanNumber(value);

  return weight ? `${weight.toFixed(1)} / 5` : "";
}

function cleanNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function matchSortScore(match) {
  return cleanNumber(match?.rank_score ?? match?.score);
}

function drawDetections(detections, sourceCanvas, displayElement) {
  const displayRect = displayElement.getBoundingClientRect();
  const displayWidth = displayRect.width;
  const displayHeight = displayRect.height;
  const sourceWidth = sourceCanvas.width;
  const sourceHeight = sourceCanvas.height;

  if (!displayWidth || !displayHeight || !sourceWidth || !sourceHeight) {
    return;
  }

  const devicePixelRatio = window.devicePixelRatio || 1;
  boxesCanvas.width = Math.round(displayWidth * devicePixelRatio);
  boxesCanvas.height = Math.round(displayHeight * devicePixelRatio);
  boxesCanvas.style.width = `${displayWidth}px`;
  boxesCanvas.style.height = `${displayHeight}px`;

  const ctx = boxesCanvas.getContext("2d");
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, displayWidth, displayHeight);

  const scale = Math.max(displayWidth / sourceWidth, displayHeight / sourceHeight);
  const offsetX = (displayWidth - sourceWidth * scale) / 2;
  const offsetY = (displayHeight - sourceHeight * scale) / 2;
  const styles = getComputedStyle(document.documentElement);
  const boxStart = cssValue(styles, "--blue", "#5d7cff");
  const boxEnd = cssValue(styles, "--violet", "#bf5af2");
  const labelText = cssValue(styles, "--accent-strong", "#d7dfff");
  const resolvedTheme = document.documentElement.dataset.theme || resolveThemePreference(themePreference);
  const labelBackground = resolvedTheme === "light"
    ? "rgba(255, 251, 243, 0.9)"
    : "rgba(8, 9, 19, 0.78)";
  const labelBorder = resolvedTheme === "light"
    ? "rgba(62, 99, 255, 0.32)"
    : "rgba(215, 223, 255, 0.24)";

  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.font = "800 13px system-ui, sans-serif";
  ctx.textBaseline = "middle";

  for (const detection of detections) {
    const x = detection.x * scale + offsetX;
    const y = detection.y * scale + offsetY;
    const width = detection.width * scale;
    const height = detection.height * scale;
    const label = `${detection.score.toFixed(2)}`;
    const boxGradient = ctx.createLinearGradient(x, y, x + width, y + height);

    boxGradient.addColorStop(0, boxStart);
    boxGradient.addColorStop(1, boxEnd);

    ctx.strokeStyle = boxGradient;
    ctx.strokeRect(x, y, width, height);

    const labelPaddingX = 7;
    const labelHeight = 22;
    const labelWidth = Math.ceil(ctx.measureText(label).width) + labelPaddingX * 2;
    const maxLabelX = Math.max(0, displayWidth - labelWidth);
    const maxLabelY = Math.max(0, displayHeight - labelHeight);
    const labelX = Math.min(Math.max(0, x), maxLabelX);
    const preferredLabelY = y - labelHeight - 5;
    const labelY = Math.min(Math.max(0, preferredLabelY >= 0 ? preferredLabelY : y + 5), maxLabelY);

    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 6);
    } else {
      ctx.rect(labelX, labelY, labelWidth, labelHeight);
    }
    ctx.fillStyle = labelBackground;
    ctx.fill();
    ctx.strokeStyle = labelBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.fillStyle = labelText;
    ctx.fillText(label, labelX + labelPaddingX, labelY + labelHeight / 2);
  }
}

function cssValue(styles, name, fallback) {
  return styles.getPropertyValue(name).trim() || fallback;
}

function showResultShell(count) {
  resultsPanel.hidden = false;
  resultCount.textContent = `${count}`;
  setResultsNotice("");
}

function sortCards() {
  if (resultsGrid.querySelector(".matchCard.isDismissing")) {
    return;
  }

  const cards = Array.from(resultsGrid.children);
  cards.sort((left, right) => {
    const fitDifference = Number(right.dataset.fit || 0) - Number(left.dataset.fit || 0);

    if (fitDifference !== 0) {
      return fitDifference;
    }

    return Number(right.dataset.score) - Number(left.dataset.score);
  });
  resultsGrid.replaceChildren(...cards);
}

function updateResultStats() {
  if (!currentResultCards.length) {
    return;
  }

  const filters = getFilters();
  const matched = currentResultCards.filter((card) => card.fitsFilters).length;
  const checked = currentResultCards.filter((card) => card.matches.length || card.matchFailed).length;

  resultCount.textContent = filters.hasAny && matched
    ? `${matched}/${currentResultCards.length} fit`
    : `${checked}/${currentResultCards.length} checked`;
}

function clearResults(cancelActiveScan = true) {
  if (cancelActiveScan) {
    scanToken++;
  }
  hideCropZoomPreview();
  closeCropViewer();
  currentResultCards = [];
  resultsGrid.replaceChildren();
  resultsPanel.hidden = true;
  resultCount.textContent = "";
  setResultsNotice("");

  const ctx = boxesCanvas.getContext("2d");
  ctx.clearRect(0, 0, boxesCanvas.width, boxesCanvas.height);
}

function setResultsNotice(text, tone = "info") {
  if (!resultsNotice) {
    return;
  }

  resultsNotice.hidden = !text;
  resultsNotice.textContent = text || "";
  resultsNotice.dataset.tone = tone;
}

function backendDisplayName() {
  const base = configuredApiBase();

  if (!base) {
    return "the local backend";
  }

  try {
    return new URL(base).host;
  } catch {
    return base.replace(/^https?:\/\//, "");
  }
}

function backendOfflineMessage() {
  const target = backendDisplayName();

  return `Matching server offline. Start ${target} and scan again to identify games.`;
}

function setControlsEnabled(enabled) {
  const frozenFrame = isCameraFrameFrozen();
  const liveCamera = cameraReady && !frozenFrame;

  document.body.classList.toggle("cameraLive", liveCamera);
  document.body.classList.toggle("cameraFrozen", frozenFrame);

  startCameraButton.hidden = cameraReady;
  uploadButton.hidden = cameraReady;
  scanButton.hidden = !cameraReady || frozenFrame;
  backToCameraButton.hidden = !frozenFrame;
  switchCameraButton.hidden = !cameraReady || frozenFrame;

  startCameraButton.disabled = !enabled || cameraReady;
  uploadButton.disabled = !enabled || cameraReady;
  imageUpload.disabled = !enabled || cameraReady;
  scanButton.disabled = !enabled || !cameraReady || frozenFrame;
  backToCameraButton.disabled = !enabled || !frozenFrame;
  switchCameraButton.disabled = !enabled || !cameraReady || frozenFrame;
  playersFilter.disabled = !enabled;
  timeFilter.disabled = !enabled;
  complexityFilter.disabled = !enabled;
}

function isCameraFrameFrozen() {
  return cameraReady && activeDisplayElement === photoPreview && !photoPreview.hidden;
}

function setStatus(text) {
  statusText.textContent = text;
}

function freezeCurrentCameraFrame() {
  photoPreview.width = video.videoWidth;
  photoPreview.height = video.videoHeight;
  photoPreview.getContext("2d").drawImage(video, 0, 0);
  activeSourceCanvas = photoPreview;
  activeDisplayElement = photoPreview;
  showPhotoPreview();
}

function showCamera() {
  video.hidden = false;
  photoPreview.hidden = true;
  activeSourceCanvas = null;
  activeDisplayElement = video;
}

function showPhotoPreview() {
  video.hidden = true;
  photoPreview.hidden = false;
}

async function drawFileToCanvas(file, canvas) {
  try {
    await drawBrowserReadableImageToCanvas(file, canvas);
    return;
  } catch (browserError) {
    console.warn("Browser image decode failed:", uploadFileDebugInfo(file), browserError);
  }

  await drawImageThroughBackend(file, canvas);
}

async function drawBrowserReadableImageToCanvas(file, canvas) {
  if (window.createImageBitmap) {
    try {
      const bitmap = await window.createImageBitmap(file, { imageOrientation: "from-image" });

      try {
        drawImageSourceToCanvas(bitmap, canvas);
      } finally {
        bitmap.close?.();
      }

      return;
    } catch (error) {
      console.warn("createImageBitmap failed; trying HTML image decode.", error);
    }
  }

  await drawImageElementToCanvas(file, canvas);
}

async function drawImageElementToCanvas(file, canvas) {
  const image = new Image();
  const url = URL.createObjectURL(file);

  try {
    image.decoding = "async";
    const loadPromise = image.decode ? null : waitForImageLoad(image);
    image.src = url;

    if (image.decode) {
      await image.decode();
    } else {
      await loadPromise;
    }

    drawImageSourceToCanvas(image, canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function waitForImageLoad(image) {
  return new Promise((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not load image."));
  });
}

async function drawImageThroughBackend(file, canvas) {
  const formData = new FormData();
  formData.append("file", file, file.name || "upload");

  const response = await fetchWithTimeout(
    apiUrl("/decode-image"),
    {
      method: "POST",
      body: formData,
    },
    BACKEND_MATCH_TIMEOUT_MS
  );

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.detail || `Backend could not decode image: ${response.status}`);
  }

  const jpegBlob = await response.blob();
  await drawBrowserReadableImageToCanvas(jpegBlob, canvas);
}

function drawImageSourceToCanvas(source, canvas) {
  const width = source.naturalWidth || source.videoWidth || source.width;
  const height = source.naturalHeight || source.videoHeight || source.height;

  if (!width || !height) {
    throw new Error("Decoded image has no usable dimensions.");
  }

  const scale = Math.min(1, MAX_UPLOAD_IMAGE_SIDE / Math.max(width, height));
  const outputWidth = Math.max(1, Math.round(width * scale));
  const outputHeight = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");

  canvas.width = outputWidth;
  canvas.height = outputHeight;
  context.clearRect(0, 0, outputWidth, outputHeight);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, outputWidth, outputHeight);
}

function uploadImageErrorText(file, error) {
  if (isLikelyHeicImage(file)) {
    return "Could not read that HEIC image. Try exporting it as JPG or install HEIC support on the backend.";
  }

  if (String(error?.message || "").includes("Backend could not decode")) {
    return "Could not read that image. Try JPG, PNG, or WebP.";
  }

  return "Could not read that image.";
}

function isLikelyHeicImage(file) {
  const name = String(file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase();

  return type.includes("heic")
    || type.includes("heif")
    || name.endsWith(".heic")
    || name.endsWith(".heif");
}

function uploadFileDebugInfo(file) {
  return {
    name: file?.name || "",
    type: file?.type || "",
    size: formatBytes(file?.size || 0),
  };
}

function formatBytes(size) {
  if (!Number.isFinite(size) || size <= 0) {
    return "0 B";
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not encode crop image."));
      }
    }, "image/jpeg", 0.9);
  });
}

function normalizeContributorApiBase(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return "";
  }

  try {
    return new URL(trimmed).toString().replace(/\/$/, "");
  } catch {
    return trimmed.replace(/\/$/, "");
  }
}

function configuredApiBase() {
  return normalizeContributorApiBase(window.GAMEMATCH_API_BASE || "");
}

function apiUrl(path, base = configuredApiBase()) {
  return `${base || window.location.origin}${path}`;
}

function resetBackendMatcherProbe() {
  backendMatcherLoadPromise = null;
  backendMatcherAvailable = false;
  backendMatcherUnavailable = false;
}

function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => {
    window.clearTimeout(timeoutId);
  });
}

async function processWithConcurrency(items, concurrency, worker) {
  let nextIndex = 0;

  async function runNext() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      await worker(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, runNext)
  );
}

function cameraErrorMessage(error) {
  if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
    return "Camera needs HTTPS.";
  }

  if (error?.name === "NotAllowedError") {
    return "Camera permission was blocked.";
  }

  if (error?.name === "NotFoundError") {
    return "No camera found.";
  }

  return "Could not start camera.";
}
