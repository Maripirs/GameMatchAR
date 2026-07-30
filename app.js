import { startCamera, switchCamera } from "./js/camera.js?v=20260730-match1";
import { Detector } from "./js/detector.js?v=20260730-match1";
import { cropDetection } from "./js/cropper.js?v=20260730-match1";

const CROP_CONFIDENCE_THRESHOLD = 0.5;
const MAX_CROPS_PER_SCAN = 16;
const MAX_UPLOAD_IMAGE_SIDE = 2400;
const MATCH_CONCURRENCY = 1;
const GAME_DETAILS_URL = "./data/game_details.json";
const GAME_OBSCURE_DETAILS_URL = "./data/game_details_obscure.json";
const PLAYER_EXPANSION_INDEX_URL = "./data/player_expansion_index.json";
const GAME_SEARCH_INDEX_URL = "./data/games_index.json";
const GAME_ALIASES_URL = "./data/game_aliases.json";
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
const CARD_DISMISS_MIN_DISTANCE = 36;
const CARD_DISMISS_MAX_DISTANCE = 70;
const CARD_DISMISS_RATIO = 0.15;
const CARD_DISMISS_FLICK_MIN_DISTANCE = 20;
const CARD_DISMISS_FLICK_VELOCITY = 0.25;
const CROP_ZOOM_MAX_SIDE = 420;
const CROP_ZOOM_MIN_SIDE = 220;
const CROP_VIEWER_MIN_ZOOM = 0.25;
const CROP_VIEWER_MAX_ZOOM = 8;
const CROP_VIEWER_STEP = 1.25;
const THEME_STORAGE_KEY = "gamematch-theme-preference";
const CONTRIBUTOR_STORAGE_KEY = "gamematch-contributor-password";
const THEME_OPTIONS = ["light", "auto", "dark"];
const CONTRIBUTOR_PASSWORD_HEADER = "X-Contributor-Password";
const DEBUG_MATCH_LOGS = Boolean(window.GAMEMATCH_DEBUG);
const DINO_BUTTON_LABEL = "Automatically detect more boxes";

const video = document.getElementById("camera");
const photoPreview = document.getElementById("photoPreview");
const captureCanvas = document.getElementById("capture");
const boxesCanvas = document.getElementById("boxes");
const boxEditActions = document.getElementById("boxEditActions");
const deleteSelectedBoxButton = document.getElementById("deleteSelectedBoxButton");
const confirmSelectedBoxButton = document.getElementById("confirmSelectedBoxButton");
const exitModifierButton = document.getElementById("exitModifierButton");
const statusText = document.getElementById("status");
const startCameraButton = document.getElementById("startCameraButton");
const scanButton = document.getElementById("scanButton");
const backToCameraButton = document.getElementById("backToCameraButton");
const closeScanButton = document.getElementById("closeScanButton");
const modifyBoxesButton = document.getElementById("modifyBoxesButton");
const zoomOutButton = document.getElementById("zoomOutButton");
const finishModifyingButton = document.getElementById("finishModifyingButton");
const zoomInButton = document.getElementById("zoomInButton");
const dinoSuggestButton = document.getElementById("dinoSuggestButton");
const dismissDinoSuggestButton = document.getElementById("dismissDinoSuggestButton");
const switchCameraButton = document.getElementById("switchCameraButton");
const uploadButton = document.getElementById("uploadButton");
const imageUpload = document.getElementById("imageUpload");
const examplePanel = document.getElementById("examplePanel");
const exampleButtons = Array.from(document.querySelectorAll("[data-example-src]"));
const playersFilter = document.getElementById("playersFilter");
const timeFilter = document.getElementById("timeFilter");
const complexityFilter = document.getElementById("complexityFilter");
const filterSummary = document.getElementById("filterSummary");
const filterVisibilityButton = document.getElementById("filterVisibilityButton");
const advancedFilterToggle = document.getElementById("advancedFilterToggle");
const advancedFilterPanel = document.getElementById("advancedFilterPanel");
const minRatingFilter = document.getElementById("minRatingFilter");
const maxRankFilter = document.getElementById("maxRankFilter");
const gameTypeFilter = document.getElementById("gameTypeFilter");
const expansionFilter = document.getElementById("expansionFilter");
const minYearFilter = document.getElementById("minYearFilter");
const resultsPanel = document.getElementById("resultsPanel");
const resultsGrid = document.getElementById("resultsGrid");
const resultCount = document.getElementById("resultCount");
const resultsNotice = document.getElementById("resultsNotice");
const hideResultsButton = document.getElementById("hideResultsButton");
const showMatchesButton = document.getElementById("showMatchesButton");
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
const latestContributorTabButton = document.querySelector('[data-contributor-tab="latest"]');
const detectorContributorTabButton = document.querySelector('[data-contributor-tab="detector"]');
const contributorPanels = Array.from(document.querySelectorAll("[data-contributor-panel]"));
const contributorReviewPanel = document.getElementById("contributorReviewPanel");
const contributorReviewRefreshButton = document.getElementById("contributorReviewRefreshButton");
const contributorReviewStatus = document.getElementById("contributorReviewStatus");
const contributorReviewCount = document.getElementById("contributorReviewCount");
const contributorReviewGrid = document.getElementById("contributorReviewGrid");
const detectorReviewPanel = document.getElementById("detectorReviewPanel");
const detectorReviewRefreshButton = document.getElementById("detectorReviewRefreshButton");
const detectorReviewStatus = document.getElementById("detectorReviewStatus");
const detectorReviewCount = document.getElementById("detectorReviewCount");
const detectorReviewGrid = document.getElementById("detectorReviewGrid");
const untouchedDetectorStatus = document.getElementById("untouchedDetectorStatus");
const untouchedDetectorCount = document.getElementById("untouchedDetectorCount");
const untouchedDetectorGrid = document.getElementById("untouchedDetectorGrid");
const detectorTrainingStatus = document.getElementById("detectorTrainingStatus");
const startDetectorTrainingButton = document.getElementById("startDetectorTrainingButton");
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
let obscureGameDetailsLoadPromise = null;
let obscureGameDetailsLoaded = false;
let obscureGameDetailsAvailable = true;
let playerExpansionIndexLoadPromise = null;
let playerExpansionIndex = new Map();
let gameSearchLoadPromise = null;
let gameSearchIndex = [];
let gameSearchById = new Map();
let currentResultCards = [];
let selectedMatchCard = null;
let startupStatusActive = true;
let contributorMode = false;
let contributorRole = "";
let contributorPassword = "";
let contributorApiBase = configuredApiBase();
let contributorActiveTab = "mode";
let contributorReviewLoadPromise = null;
let contributorReviewImageUrls = [];
let detectorReviewLoadPromise = null;
let detectorReviewImageUrls = [];
let themePreference = "auto";
let cropZoomPreview = null;
let cropViewer = null;
let cropViewerState = null;
let manualBoxMode = false;
let manualBoxGesture = null;
let manualDraftDetection = null;
let selectedBoxEdit = null;
let modifierZoom = 1;
let modifierPanX = 0;
let modifierPanY = 0;
let modifierGestureStartZoom = 1;
const modifierTouchPointers = new Map();
const modifierSuppressedTouchPointers = new Set();
let modifierTouchGesture = null;
let filterImageModeActive = false;

initThemeControl();
setControlsEnabled(false);
updateFilterSummary();
video.hidden = true;

main();

startCameraButton.addEventListener("click", startCameraFromTap);
scanButton.addEventListener("click", scanCurrentView);
backToCameraButton.addEventListener("click", backToLiveCamera);
closeScanButton.addEventListener("click", closeActiveScan);
modifyBoxesButton.addEventListener("click", beginManualBoxMode);
finishModifyingButton.addEventListener("click", endManualBoxMode);
exitModifierButton.addEventListener("click", endManualBoxMode);
deleteSelectedBoxButton.addEventListener("click", deleteSelectedBox);
confirmSelectedBoxButton.addEventListener("click", confirmSelectedBox);
zoomOutButton.addEventListener("click", () => changeModifierZoom(-0.25));
zoomInButton.addEventListener("click", () => changeModifierZoom(0.25));
dinoSuggestButton.addEventListener("click", suggestDinoBoxes);
dismissDinoSuggestButton.addEventListener("click", dismissDinoSuggestion);
switchCameraButton.addEventListener("click", switchCameraFromTap);
uploadButton.addEventListener("click", () => imageUpload.click());
imageUpload.addEventListener("change", handleImageUpload);
advancedFilterToggle.addEventListener("click", toggleAdvancedFilters);
filterVisibilityButton.addEventListener("click", toggleFilterPanelVisibility);
hideResultsButton.addEventListener("click", hideResultsPanel);
showMatchesButton.addEventListener("click", showResultsPanel);
for (const button of exampleButtons) {
  button.addEventListener("click", () => scanExampleImage(button));
}
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
detectorReviewRefreshButton.addEventListener("click", () => loadDetectorReview({ force: true }));
startDetectorTrainingButton.addEventListener("click", startDetectorTraining);
[playersFilter, timeFilter, complexityFilter, minRatingFilter, maxRankFilter, gameTypeFilter, expansionFilter, minYearFilter].forEach((control) => {
  control.addEventListener("input", handleFilterChange);
  control.addEventListener("change", handleFilterChange);
});
window.addEventListener("resize", () => {
  hideCropZoomPreview();
  redrawActiveDetections();
});
boxesCanvas.addEventListener("pointerdown", handleModifierPointerDown);
boxesCanvas.addEventListener("pointermove", handleModifierPointerMove);
boxesCanvas.addEventListener("pointerup", handleModifierPointerUp);
boxesCanvas.addEventListener("pointercancel", handleModifierPointerCancel);
document.addEventListener("wheel", scrollModifierImage, { passive: false });
document.addEventListener("gesturestart", startModifierPinch, { passive: false });
document.addEventListener("gesturechange", changeModifierPinch, { passive: false });
document.addEventListener("gestureend", endModifierPinch, { passive: false });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && manualBoxMode) {
    event.preventDefault();
    endManualBoxMode();
    return;
  }
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
  restoreStoredContributorLogin();
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

function closeActiveScan() {
  clearResults();
  photoPreview.hidden = true;
  activeSourceCanvas = null;
  activeDisplayElement = video;
  setControlsEnabled(true);
  setStatus("Choose camera, upload, or try an example.");
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

async function scanExampleImage(button) {
  startupStatusActive = false;

  const src = button.dataset.exampleSrc;
  const label = button.dataset.exampleLabel || "example";

  if (!src) {
    return;
  }

  clearResults();
  setControlsEnabled(false);
  setStatus(`Loading ${label}...`);

  try {
    await drawImageUrlToCanvas(src, photoPreview);
    activeSourceCanvas = photoPreview;
    activeDisplayElement = photoPreview;
    showPhotoPreview();
    await processImageCanvas(photoPreview, photoPreview);
  } catch (error) {
    console.error(`Could not load example image ${src}:`, error);
    setStatus("Could not load that example image.");
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
    sourceCanvas.detectorDetections = [...detections];
    sourceCanvas.manualDetections = [];
    sourceCanvas.removedDetectorDetections = [];
    sourceCanvas.detectorAnnotationId = createDetectorAnnotationId();
    sourceCanvas.detectorAnnotationSavePromise = Promise.resolve();
    sourceCanvas.detectorAnnotationSaved = false;
    sourceCanvas.dinoSuggestionCompleted = false;
    sourceCanvas.dinoSuggestionDismissed = false;
    drawDetections(confident, sourceCanvas, displayElement);

    if (contributorMode) {
      queueContributorDetectorAnnotationSave(sourceCanvas).catch((error) => {
        console.warn("Could not retain contributor detector scan:", error);
      });
    }

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

        await Promise.all([
          ensureGameDetailsLoaded(),
          ensurePlayerExpansionIndexLoaded(),
        ]);
        card.setMatches(matches);

        if (card.isConfident && !card.details) {
          await card.resolveDetails();
        }
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

function beginManualBoxMode() {
  if (!activeSourceCanvas || !activeDisplayElement) {
    return;
  }

  hideCropZoomPreview();
  manualBoxMode = true;
  manualBoxGesture = null;
  manualDraftDetection = null;
  selectedBoxEdit = null;
  boxEditActions.hidden = true;
  resetModifierTouchGesture();
  modifierZoom = 1;
  modifierPanX = 0;
  modifierPanY = 0;
  document.body.classList.add("manualBoxMode");
  dinoSuggestButton.textContent = DINO_BUTTON_LABEL;
  dismissDinoSuggestButton.hidden = Boolean(
    activeSourceCanvas.dinoSuggestionCompleted
    || activeSourceCanvas.dinoSuggestionDismissed
  );
  applyModifierZoom();
  setControlsEnabled(true);
  hideResultsPanel();
  setStatus("Drag to add a missed box, or tap an existing box to adjust it.");
}

function endManualBoxMode() {
  if (selectedBoxEdit) {
    confirmSelectedBox();
  }
  manualBoxMode = false;
  manualBoxGesture = null;
  manualDraftDetection = null;
  selectedBoxEdit = null;
  boxEditActions.hidden = true;
  resetModifierTouchGesture();
  modifierZoom = 1;
  modifierPanX = 0;
  modifierPanY = 0;
  document.body.classList.remove("manualBoxMode");
  boxesCanvas.style.cursor = "";
  applyModifierZoom();
  setControlsEnabled(true);
  redrawActiveDetections();
  setStatus("Finished modifying boxes.");
}

function dismissDinoSuggestion() {
  if (activeSourceCanvas) {
    activeSourceCanvas.dinoSuggestionDismissed = true;
  }
  dinoSuggestButton.hidden = true;
  dismissDinoSuggestButton.hidden = true;
  setStatus("Automatic box detection dismissed.");
}

async function suggestDinoBoxes() {
  const sourceCanvas = activeSourceCanvas;
  if (!manualBoxMode || !sourceCanvas) {
    return;
  }
  dinoSuggestButton.disabled = true;
  dismissDinoSuggestButton.hidden = true;
  sourceCanvas.dinoSuggestionCompleted = true;
  dinoSuggestButton.textContent = "Detecting more boxes...";
  setStatus("DINO is looking for missed boxes...");
  try {
    const formData = new FormData();
    formData.append(
      "existing_boxes",
      JSON.stringify(normalizedDetectorBoxes(sourceCanvas, sourceCanvas.lastDetections)),
    );
    let suggestionPath = "/detector-dino-suggestions";
    let suggestionHeaders = {};
    if (contributorMode && contributorPassword) {
      await queueContributorDetectorAnnotationSave(sourceCanvas);
      formData.append("annotation_id", sourceCanvas.detectorAnnotationId);
      suggestionPath = "/contributor/detector-dino-suggestions";
      suggestionHeaders = { [CONTRIBUTOR_PASSWORD_HEADER]: contributorPassword };
    } else {
      const blob = await canvasToBlob(sourceCanvas);
      formData.append("file", blob, "detector-source.jpg");
    }
    const response = await fetch(
      apiUrl(suggestionPath, contributorApiBase),
      {
        method: "POST",
        headers: suggestionHeaders,
        body: formData,
      },
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(result.detail || "Could not generate automatic boxes.");
    }
    const suggestions = (Array.isArray(result.suggestions) ? result.suggestions : [])
      .map((box) => ({
        x: Number(box.x) * sourceCanvas.width,
        y: Number(box.y) * sourceCanvas.height,
        width: Number(box.width) * sourceCanvas.width,
        height: Number(box.height) * sourceCanvas.height,
        score: Number(box.score) || 0,
        manual: true,
        dino: true,
      }))
      .filter((box) => (
        Number.isFinite(box.x)
        && Number.isFinite(box.y)
        && box.width >= 16
        && box.height >= 16
      ));
    if (!suggestions.length) {
      setStatus("DINO did not find any additional boxes.");
      await finishDinoSuggestionButton("Done — no additional boxes");
      return;
    }
    sourceCanvas.lastDetections = [...(sourceCanvas.lastDetections || []), ...suggestions];
    sourceCanvas.manualDetections = [...(sourceCanvas.manualDetections || []), ...suggestions];
    redrawActiveDetections();
    if (contributorMode) {
      await queueContributorDetectorAnnotationSave(sourceCanvas);
    }
    const firstCardIndex = currentResultCards.length;
    const cards = suggestions.map((detection, index) => {
      const cropCanvas = cropDetection(sourceCanvas, detection);
      return createMatchCard(cropCanvas, detection, firstCardIndex + index);
    });
    currentResultCards.push(...cards);
    showResultShell(currentResultCards.length);
    hideResultsPanel();
    setStatus(
      `DINO added ${suggestions.length} possible ${suggestions.length === 1 ? "box" : "boxes"}. `
      + "Tap any incorrect purple box to remove it. Matching the new boxes...",
    );
    dinoSuggestButton.textContent = `Matching ${suggestions.length} new ${
      suggestions.length === 1 ? "box" : "boxes"
    }...`;
    await processWithConcurrency(cards, MATCH_CONCURRENCY, async (card) => {
      if (card.dismissed) {
        return;
      }
      try {
        const matches = await matchCrop(card.cropCanvas, (text) => card.setPending(text));
        if (card.dismissed) {
          return;
        }
        await Promise.all([
          ensureGameDetailsLoaded(),
          ensurePlayerExpansionIndexLoaded(),
        ]);
        card.setMatches(matches);
        if (card.isConfident && !card.details) {
          await card.resolveDetails();
        }
      } catch (error) {
        if (!card.dismissed) {
          card.setError("Match failed", {
            meta: "Automatic box saved",
            fitText: "Try again",
            detailsText: "The box was added, but this crop could not be matched.",
          });
        }
      }
      updateResultStats();
      sortCards();
    });
    setStatus(
      `DINO added and matched ${suggestions.length} possible `
      + `${suggestions.length === 1 ? "box" : "boxes"}. Tap incorrect purple boxes to remove them.`,
    );
    await finishDinoSuggestionButton("Done");
  } catch (error) {
    console.warn("DINO box suggestion failed:", error);
    setStatus(error.message || "Could not generate automatic boxes.");
    await finishDinoSuggestionButton("Could not detect more boxes");
  }
}

async function finishDinoSuggestionButton(message) {
  for (let seconds = 3; seconds >= 1; seconds -= 1) {
    dinoSuggestButton.textContent = `${message} · hiding in ${seconds}...`;
    await new Promise((resolve) => window.setTimeout(resolve, 1000));
  }
  dinoSuggestButton.hidden = true;
  dismissDinoSuggestButton.hidden = true;
}

function manualBoxSourcePoint(event) {
  if (!activeSourceCanvas || !activeDisplayElement) {
    return null;
  }

  const rect = boxesCanvas.getBoundingClientRect();
  const displayWidth = rect.width;
  const displayHeight = rect.height;
  const sourceWidth = activeSourceCanvas.width;
  const sourceHeight = activeSourceCanvas.height;
  const scale = Math.min(displayWidth / sourceWidth, displayHeight / sourceHeight) * modifierZoom;
  const offsetX = (displayWidth - sourceWidth * scale) / 2 + modifierPanX;
  const offsetY = (displayHeight - sourceHeight * scale) / 2 + modifierPanY;
  const sourceX = (event.clientX - rect.left - offsetX) / scale;
  const sourceY = (event.clientY - rect.top - offsetY) / scale;
  if (sourceX < 0 || sourceX > sourceWidth || sourceY < 0 || sourceY > sourceHeight) {
    return null;
  }
  return {
    x: sourceX,
    y: sourceY,
  };
}

function changeModifierZoom(delta) {
  if (!manualBoxMode) {
    return;
  }
  modifierZoom = Math.max(0.5, Math.min(3, modifierZoom + delta));
  modifierPanX = clampModifierPanX(modifierPanX);
  modifierPanY = clampModifierPanY(modifierPanY);
  applyModifierZoom();
  redrawActiveDetections();
  setStatus(`Detection modifier zoom: ${Math.round(modifierZoom * 100)}%.`);
}

function scrollModifierImage(event) {
  if (!manualBoxMode) {
    return;
  }
  if (event.ctrlKey) {
    const zoomDirection = event.deltaY < 0 ? 0.25 : -0.25;
    changeModifierZoom(zoomDirection);
    event.preventDefault();
    return;
  }
  if (modifierZoom <= 1) {
    event.preventDefault();
    return;
  }
  const horizontalDelta = event.deltaX || (event.shiftKey ? event.deltaY : 0);
  const verticalDelta = event.shiftKey ? 0 : event.deltaY;
  modifierPanX = clampModifierPanX(modifierPanX - horizontalDelta);
  modifierPanY = clampModifierPanY(modifierPanY - verticalDelta);
  applyModifierZoom();
  redrawActiveDetections();
  event.preventDefault();
}

function startModifierPinch(event) {
  if (!manualBoxMode) {
    return;
  }
  modifierGestureStartZoom = modifierZoom;
  event.preventDefault();
}

function changeModifierPinch(event) {
  if (!manualBoxMode) {
    return;
  }
  modifierZoom = Math.max(0.5, Math.min(3, modifierGestureStartZoom * event.scale));
  modifierPanX = clampModifierPanX(modifierPanX);
  modifierPanY = clampModifierPanY(modifierPanY);
  applyModifierZoom();
  redrawActiveDetections();
  event.preventDefault();
}

function endModifierPinch(event) {
  if (manualBoxMode) {
    event.preventDefault();
  }
}

function clampModifierPanY(value) {
  if (!manualBoxMode || modifierZoom <= 1 || !activeSourceCanvas) {
    return 0;
  }
  const rect = boxesCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return 0;
  }
  const baseScale = Math.min(
    rect.width / activeSourceCanvas.width,
    rect.height / activeSourceCanvas.height,
  );
  const zoomedHeight = activeSourceCanvas.height * baseScale * modifierZoom;
  const limit = Math.max(0, (zoomedHeight - rect.height) / 2);
  return Math.max(-limit, Math.min(limit, value));
}

function clampModifierPanX(value) {
  if (!manualBoxMode || modifierZoom <= 1 || !activeSourceCanvas) {
    return 0;
  }
  const rect = boxesCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return 0;
  }
  const baseScale = Math.min(
    rect.width / activeSourceCanvas.width,
    rect.height / activeSourceCanvas.height,
  );
  const zoomedWidth = activeSourceCanvas.width * baseScale * modifierZoom;
  const limit = Math.max(0, (zoomedWidth - rect.width) / 2);
  return Math.max(-limit, Math.min(limit, value));
}

function applyModifierZoom() {
  document.documentElement.style.setProperty("--modifier-zoom", String(modifierZoom));
  document.documentElement.style.setProperty("--modifier-pan-x", `${modifierPanX}px`);
  document.documentElement.style.setProperty("--modifier-pan-y", `${modifierPanY}px`);
  zoomOutButton.disabled = !manualBoxMode || modifierZoom <= 0.5;
  zoomInButton.disabled = !manualBoxMode || modifierZoom >= 3;
}

function handleModifierPointerDown(event) {
  if (event.pointerType !== "touch") {
    startManualBox(event);
    return;
  }
  modifierTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  boxesCanvas.setPointerCapture?.(event.pointerId);
  if (modifierTouchPointers.size >= 2) {
    beginModifierTouchGesture();
    event.preventDefault();
    return;
  }
  startManualBox(event);
}

function handleModifierPointerMove(event) {
  if (event.pointerType !== "touch") {
    updateModifierCursor(event);
  }
  if (event.pointerType !== "touch" || !modifierTouchPointers.has(event.pointerId)) {
    moveManualBox(event);
    return;
  }
  modifierTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (modifierTouchGesture && modifierTouchPointers.size >= 2) {
    updateModifierTouchGesture();
    event.preventDefault();
    return;
  }
  if (!modifierSuppressedTouchPointers.has(event.pointerId)) {
    moveManualBox(event);
  }
}

function handleModifierPointerUp(event) {
  if (event.pointerType !== "touch") {
    finishManualBox(event);
    updateModifierCursor(event);
    return;
  }
  const suppressed = modifierSuppressedTouchPointers.has(event.pointerId);
  if (modifierTouchPointers.has(event.pointerId)) {
    modifierTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }
  modifierTouchPointers.delete(event.pointerId);
  modifierSuppressedTouchPointers.delete(event.pointerId);
  if (modifierTouchPointers.size < 2) {
    modifierTouchGesture = null;
  }
  if (suppressed) {
    manualBoxGesture = null;
    manualDraftDetection = null;
    redrawActiveDetections();
    boxesCanvas.releasePointerCapture?.(event.pointerId);
    event.preventDefault();
    return;
  }
  finishManualBox(event);
}

function handleModifierPointerCancel(event) {
  modifierTouchPointers.delete(event.pointerId);
  modifierSuppressedTouchPointers.delete(event.pointerId);
  if (modifierTouchPointers.size < 2) {
    modifierTouchGesture = null;
  }
  cancelManualBox(event);
}

function beginModifierTouchGesture() {
  const points = Array.from(modifierTouchPointers.entries()).slice(0, 2);
  const geometry = modifierTouchGeometry(points);
  if (!geometry) {
    return;
  }
  for (const [pointerId] of points) {
    modifierSuppressedTouchPointers.add(pointerId);
  }
  manualBoxGesture = null;
  manualDraftDetection = null;
  modifierTouchGesture = {
    pointerIds: points.map(([pointerId]) => pointerId),
    startDistance: geometry.distance,
    startCenterX: geometry.centerX,
    startCenterY: geometry.centerY,
    startZoom: modifierZoom,
    startPanX: modifierPanX,
    startPanY: modifierPanY,
  };
  redrawActiveDetections();
}

function updateModifierTouchGesture() {
  const gesture = modifierTouchGesture;
  if (!gesture) {
    return;
  }
  const points = gesture.pointerIds
    .map((pointerId) => [pointerId, modifierTouchPointers.get(pointerId)])
    .filter(([, point]) => point);
  const geometry = modifierTouchGeometry(points);
  if (!geometry || !gesture.startDistance) {
    return;
  }
  const nextZoom = Math.max(
    0.5,
    Math.min(3, gesture.startZoom * geometry.distance / gesture.startDistance),
  );
  const viewport = boxesCanvas.getBoundingClientRect();
  const viewportCenterX = viewport.left + viewport.width / 2;
  const viewportCenterY = viewport.top + viewport.height / 2;
  const zoomRatio = nextZoom / gesture.startZoom;
  modifierZoom = nextZoom;
  modifierPanX = clampModifierPanX(
    geometry.centerX - viewportCenterX
      - zoomRatio * (gesture.startCenterX - viewportCenterX - gesture.startPanX),
  );
  modifierPanY = clampModifierPanY(
    geometry.centerY - viewportCenterY
      - zoomRatio * (gesture.startCenterY - viewportCenterY - gesture.startPanY),
  );
  applyModifierZoom();
  redrawActiveDetections();
}

function modifierTouchGeometry(points) {
  if (points.length < 2 || !points[0][1] || !points[1][1]) {
    return null;
  }
  const first = points[0][1];
  const second = points[1][1];
  return {
    centerX: (first.x + second.x) / 2,
    centerY: (first.y + second.y) / 2,
    distance: Math.hypot(second.x - first.x, second.y - first.y),
  };
}

function resetModifierTouchGesture() {
  modifierTouchPointers.clear();
  modifierSuppressedTouchPointers.clear();
  modifierTouchGesture = null;
}

function startManualBox(event) {
  if (!manualBoxMode || !activeSourceCanvas) {
    return;
  }

  const point = manualBoxSourcePoint(event);
  if (!point) {
    return;
  }

  if (selectedBoxEdit) {
    const handle = selectedBoxHandleAtPoint(point);
    if (handle || isPointOnDetectionBorder(selectedBoxEdit.draft, point)) {
      boxesCanvas.style.cursor = handle
        ? modifierHandleCursor(handle)
        : "grabbing";
      manualBoxGesture = {
        pointerId: event.pointerId,
        editHandle: handle || "move",
        startX: point.x,
        startY: point.y,
        startBox: { ...selectedBoxEdit.draft },
      };
      boxesCanvas.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      return;
    }
  }

  const hitDetection = (
    findDetectionLabelAtClientPoint(
      activeSourceCanvas.lastDetections,
      event.clientX,
      event.clientY,
    )
    || findDetectionAtPoint(activeSourceCanvas.lastDetections, point)
  );
  if (selectedBoxEdit) {
    confirmSelectedBox();
  }
  manualBoxGesture = {
    pointerId: event.pointerId,
    startX: point.x,
    startY: point.y,
    startClientX: event.clientX,
    startClientY: event.clientY,
    hitDetection,
  };
  boxesCanvas.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function moveManualBox(event) {
  if (!manualBoxGesture || manualBoxGesture.pointerId !== event.pointerId) {
    return;
  }

  const point = manualBoxSourcePoint(event);
  if (!point) {
    return;
  }

  if (manualBoxGesture.editHandle && selectedBoxEdit) {
    selectedBoxEdit.draft = resizedDetection(
      manualBoxGesture.startBox,
      manualBoxGesture.editHandle,
      point.x - manualBoxGesture.startX,
      point.y - manualBoxGesture.startY,
    );
    redrawActiveDetections();
    event.preventDefault();
    return;
  }

  manualDraftDetection = rectangleFromPoints(
    manualBoxGesture.startX,
    manualBoxGesture.startY,
    point.x,
    point.y,
  );
  redrawActiveDetections();
  event.preventDefault();
}

function finishManualBox(event) {
  if (!manualBoxGesture || manualBoxGesture.pointerId !== event.pointerId) {
    return;
  }

  const gesture = manualBoxGesture;
  if (gesture.editHandle) {
    boxesCanvas.releasePointerCapture?.(event.pointerId);
    manualBoxGesture = null;
    positionBoxEditActions();
    redrawActiveDetections();
    setStatus("Adjust the box, then tap the checkmark to keep it.");
    event.preventDefault();
    return;
  }
  const point = manualBoxSourcePoint(event);
  const pointerTravel = Math.hypot(
    event.clientX - gesture.startClientX,
    event.clientY - gesture.startClientY,
  );
  const detection = point
    ? rectangleFromPoints(
        gesture.startX,
        gesture.startY,
        point.x,
        point.y,
      )
    : null;
  boxesCanvas.releasePointerCapture?.(event.pointerId);
  manualBoxGesture = null;
  manualDraftDetection = null;

  if (gesture.hitDetection && pointerTravel < 10) {
    selectBoxForEditing(gesture.hitDetection);
    event.preventDefault();
    return;
  }

  if (!detection || detection.width < 16 || detection.height < 16) {
    redrawActiveDetections();
    setStatus("Drag a larger rectangle to add a box, or click an existing box to adjust it.");
    return;
  }

  addManualDetection(detection);
  event.preventDefault();
}

function cancelManualBox(event) {
  if (!manualBoxGesture || manualBoxGesture.pointerId !== event.pointerId) {
    return;
  }

  boxesCanvas.releasePointerCapture?.(event.pointerId);
  manualBoxGesture = null;
  manualDraftDetection = null;
  redrawActiveDetections();
}

function rectangleFromPoints(startX, startY, endX, endY) {
  return {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
    score: 1,
    manual: true,
  };
}

function findDetectionBorderAtPoint(detections, point) {
  return [...(detections || [])].reverse().find((detection) => (
    isPointOnDetectionBorder(detection, point)
  )) || null;
}

function findDetectionAtPoint(detections, point) {
  return [...(detections || [])].reverse().find((detection) => (
    containsDetectionPoint(detection, point)
  )) || null;
}

function findDetectionLabelAtClientPoint(detections, clientX, clientY) {
  if (!activeSourceCanvas) {
    return null;
  }
  const canvasRect = boxesCanvas.getBoundingClientRect();
  const displayWidth = canvasRect.width;
  const displayHeight = canvasRect.height;
  const baseScale = Math.min(
    displayWidth / activeSourceCanvas.width,
    displayHeight / activeSourceCanvas.height,
  );
  const scale = baseScale * modifierZoom;
  const offsetX = (displayWidth - activeSourceCanvas.width * scale) / 2 + modifierPanX;
  const offsetY = (displayHeight - activeSourceCanvas.height * scale) / 2 + modifierPanY;
  const localX = clientX - canvasRect.left;
  const localY = clientY - canvasRect.top;
  const context = boxesCanvas.getContext("2d");
  context.save();
  context.font = "800 13px system-ui, sans-serif";
  const match = [...(detections || [])].reverse().find((detection) => {
    const x = detection.x * scale + offsetX;
    const y = detection.y * scale + offsetY;
    const label = detection.dino
      ? `DINO ${detection.score.toFixed(2)}`
      : detection.manual
        ? "Manual"
        : `${detection.score.toFixed(2)}`;
    const labelPaddingX = 7;
    const labelHeight = 22;
    const fittedLabel = fitOverlayLabel(
      context,
      label,
      Math.max(24, displayWidth - labelPaddingX * 2),
    );
    const labelWidth = Math.ceil(context.measureText(fittedLabel).width) + labelPaddingX * 2;
    const labelX = Math.min(Math.max(0, x), Math.max(0, displayWidth - labelWidth));
    const preferredLabelY = y - labelHeight - 5;
    const labelY = Math.min(
      Math.max(0, preferredLabelY >= 0 ? preferredLabelY : y + 5),
      Math.max(0, displayHeight - labelHeight),
    );
    return (
      localX >= labelX
      && localX <= labelX + labelWidth
      && localY >= labelY
      && localY <= labelY + labelHeight
    );
  }) || null;
  context.restore();
  return match;
}

function containsDetectionPoint(detection, point) {
  return (
    point.x >= detection.x
    && point.x <= detection.x + detection.width
    && point.y >= detection.y
    && point.y <= detection.y + detection.height
  );
}

function isPointOnDetectionBorder(detection, point) {
  if (!containsDetectionPoint(detection, point) || !activeSourceCanvas) {
    return false;
  }
  const rect = boxesCanvas.getBoundingClientRect();
  const scale = Math.min(
    rect.width / activeSourceCanvas.width,
    rect.height / activeSourceCanvas.height,
  ) * modifierZoom;
  const tolerance = 8 / Math.max(scale, 0.001);
  const right = detection.x + detection.width;
  const bottom = detection.y + detection.height;
  return (
    Math.abs(point.x - detection.x) <= tolerance
    || Math.abs(point.x - right) <= tolerance
    || Math.abs(point.y - detection.y) <= tolerance
    || Math.abs(point.y - bottom) <= tolerance
  );
}

function selectBoxForEditing(detection) {
  selectedBoxEdit = {
    original: detection,
    draft: { ...detection },
  };
  boxEditActions.hidden = false;
  redrawActiveDetections();
  positionBoxEditActions();
  setStatus("Drag the handles to resize, drag the outline to move, then confirm or delete.");
}

function selectedBoxHandleAtPoint(point) {
  if (!selectedBoxEdit || !activeSourceCanvas) {
    return null;
  }
  const rect = boxesCanvas.getBoundingClientRect();
  const scale = Math.min(
    rect.width / activeSourceCanvas.width,
    rect.height / activeSourceCanvas.height,
  ) * modifierZoom;
  const tolerance = 18 / Math.max(scale, 0.001);
  const box = selectedBoxEdit.draft;
  const left = box.x;
  const right = box.x + box.width;
  const top = box.y;
  const bottom = box.y + box.height;
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const handles = [
    ["nw", left, top], ["n", centerX, top], ["ne", right, top],
    ["e", right, centerY], ["se", right, bottom], ["s", centerX, bottom],
    ["sw", left, bottom], ["w", left, centerY],
  ];
  return handles.find(([, x, y]) => (
    Math.hypot(point.x - x, point.y - y) <= tolerance
  ))?.[0] || null;
}

function updateModifierCursor(event) {
  if (!manualBoxMode || !activeSourceCanvas) {
    boxesCanvas.style.cursor = "";
    return;
  }
  if (manualBoxGesture?.editHandle) {
    boxesCanvas.style.cursor = manualBoxGesture.editHandle === "move"
      ? "grabbing"
      : modifierHandleCursor(manualBoxGesture.editHandle);
    return;
  }
  const point = manualBoxSourcePoint(event);
  if (!point) {
    boxesCanvas.style.cursor = "default";
    return;
  }
  const handle = selectedBoxHandleAtPoint(point);
  if (handle) {
    boxesCanvas.style.cursor = modifierHandleCursor(handle);
  } else if (selectedBoxEdit && isPointOnDetectionBorder(selectedBoxEdit.draft, point)) {
    boxesCanvas.style.cursor = "grab";
  } else if (
    findDetectionLabelAtClientPoint(
      activeSourceCanvas.lastDetections,
      event.clientX,
      event.clientY,
    )
    || findDetectionBorderAtPoint(activeSourceCanvas.lastDetections, point)
  ) {
    boxesCanvas.style.cursor = "pointer";
  } else {
    boxesCanvas.style.cursor = "crosshair";
  }
}

function modifierHandleCursor(handle) {
  return {
    n: "ns-resize",
    s: "ns-resize",
    e: "ew-resize",
    w: "ew-resize",
    ne: "nesw-resize",
    sw: "nesw-resize",
    nw: "nwse-resize",
    se: "nwse-resize",
  }[handle] || "move";
}

function resizedDetection(startBox, handle, deltaX, deltaY) {
  const sourceWidth = activeSourceCanvas.width;
  const sourceHeight = activeSourceCanvas.height;
  const minimumSize = 16;
  if (handle === "move") {
    return {
      ...startBox,
      x: Math.max(0, Math.min(sourceWidth - startBox.width, startBox.x + deltaX)),
      y: Math.max(0, Math.min(sourceHeight - startBox.height, startBox.y + deltaY)),
    };
  }
  let left = startBox.x;
  let right = startBox.x + startBox.width;
  let top = startBox.y;
  let bottom = startBox.y + startBox.height;
  if (handle.includes("w")) left = Math.max(0, Math.min(right - minimumSize, left + deltaX));
  if (handle.includes("e")) right = Math.min(sourceWidth, Math.max(left + minimumSize, right + deltaX));
  if (handle.includes("n")) top = Math.max(0, Math.min(bottom - minimumSize, top + deltaY));
  if (handle.includes("s")) bottom = Math.min(sourceHeight, Math.max(top + minimumSize, bottom + deltaY));
  return {
    ...startBox,
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function deleteSelectedBox() {
  if (!selectedBoxEdit) {
    return;
  }
  const detection = selectedBoxEdit.original;
  selectedBoxEdit = null;
  boxEditActions.hidden = true;
  removeDetection(detection);
}

function confirmSelectedBox() {
  if (!selectedBoxEdit) {
    return;
  }
  const { original, draft } = selectedBoxEdit;
  const changed = (
    Math.abs(original.x - draft.x) > 0.5
    || Math.abs(original.y - draft.y) > 0.5
    || Math.abs(original.width - draft.width) > 0.5
    || Math.abs(original.height - draft.height) > 0.5
  );
  selectedBoxEdit = null;
  boxEditActions.hidden = true;
  if (!changed) {
    redrawActiveDetections();
    setStatus("Box confirmed.");
    return;
  }
  removeDetection(original);
  addManualDetection({
    ...draft,
    score: 1,
    manual: true,
    dino: false,
  });
}

function positionBoxEditActions() {
  if (!selectedBoxEdit || !activeSourceCanvas || boxEditActions.hidden) {
    return;
  }
  const rect = boxesCanvas.getBoundingClientRect();
  const scale = Math.min(
    rect.width / activeSourceCanvas.width,
    rect.height / activeSourceCanvas.height,
  ) * modifierZoom;
  const offsetX = (rect.width - activeSourceCanvas.width * scale) / 2 + modifierPanX;
  const offsetY = (rect.height - activeSourceCanvas.height * scale) / 2 + modifierPanY;
  const box = selectedBoxEdit.draft;
  const centerX = rect.left + offsetX + (box.x + box.width / 2) * scale;
  const top = rect.top + offsetY + box.y * scale;
  boxEditActions.style.left = `${Math.max(58, Math.min(window.innerWidth - 58, centerX))}px`;
  boxEditActions.style.top = `${Math.max(66, top - 10)}px`;
}

function removeDetection(detection) {
  const sourceCanvas = activeSourceCanvas;
  if (!sourceCanvas || !detection) {
    return;
  }

  sourceCanvas.lastDetections = (sourceCanvas.lastDetections || [])
    .filter((candidate) => candidate !== detection);
  if (detection.manual) {
    sourceCanvas.manualDetections = (sourceCanvas.manualDetections || [])
      .filter((candidate) => candidate !== detection);
  } else if (!(sourceCanvas.removedDetectorDetections || []).includes(detection)) {
    sourceCanvas.removedDetectorDetections = [
      ...(sourceCanvas.removedDetectorDetections || []),
      detection,
    ];
  }

  const removedCard = currentResultCards.find((cardApi) => cardApi.detection === detection);
  if (removedCard) {
    removedCard.dismissed = true;
    removedCard.card.remove();
    currentResultCards = currentResultCards.filter((cardApi) => cardApi !== removedCard);
    if (selectedMatchCard === removedCard) {
      clearSelectedMatchCard();
    }
  }

  redrawActiveDetections();
  if (currentResultCards.length) {
    updateResultStats();
    sortCards();
  } else {
    resultsPanel.hidden = true;
    showMatchesButton.hidden = true;
    resultCount.textContent = "";
  }

  if (contributorMode) {
    queueContributorDetectorAnnotationSave(sourceCanvas).catch((error) => {
      console.warn("Could not save detector annotation:", error);
      setStatus("Box removed, but the detector correction could not be saved.");
    });
  }
  setStatus(detection.manual ? "Removed the manually added box." : "Removed the incorrect detector box.");
}

async function addManualDetection(detection) {
  const sourceCanvas = activeSourceCanvas;
  if (!sourceCanvas) {
    return;
  }

  sourceCanvas.lastDetections = [...(sourceCanvas.lastDetections || []), detection];
  sourceCanvas.manualDetections = [...(sourceCanvas.manualDetections || []), detection];
  redrawActiveDetections();

  const cropCanvas = cropDetection(sourceCanvas, detection);
  const card = createMatchCard(cropCanvas, detection, currentResultCards.length);
  currentResultCards.push(card);
  showResultShell(currentResultCards.length);
  updateResultStats();
  hideResultsPanel();
  setStatus("Matching the manually added box...");

  if (contributorMode) {
    queueContributorDetectorAnnotationSave(sourceCanvas).catch((error) => {
      console.warn("Could not save detector annotation:", error);
      setStatus("Box added, but the detector annotation could not be saved.");
    });
  }

  try {
    await ensureBackendMatcherReady({ force: true });
    const matches = await matchCrop(card.cropCanvas, (text) => card.setPending(text));
    await Promise.all([
      ensureGameDetailsLoaded(),
      ensurePlayerExpansionIndexLoaded(),
    ]);
    card.setMatches(matches);
    if (card.isConfident && !card.details) {
      await card.resolveDetails();
    }
    setStatus("Manual box added and matched.");
  } catch (error) {
    console.warn("Manual box match failed:", error);
    card.setError("Match failed", {
      meta: "Manual box saved",
      fitText: "Try again",
      detailsText: "The rectangle was added, but this crop could not be matched.",
    });
  }

  updateResultStats();
  sortCards();
}

function normalizedDetectorBoxes(sourceCanvas, detections) {
  return (detections || []).map((detection) => ({
    x: detection.x / sourceCanvas.width,
    y: detection.y / sourceCanvas.height,
    width: detection.width / sourceCanvas.width,
    height: detection.height / sourceCanvas.height,
    score: Number.isFinite(detection.score) ? detection.score : null,
  }));
}

function queueContributorDetectorAnnotationSave(sourceCanvas) {
  const previousSave = sourceCanvas.detectorAnnotationSavePromise || Promise.resolve();
  const nextSave = previousSave
    .catch(() => {})
    .then(() => saveContributorDetectorAnnotation(sourceCanvas));
  sourceCanvas.detectorAnnotationSavePromise = nextSave;
  return nextSave;
}

async function saveContributorDetectorAnnotation(sourceCanvas) {
  const hasCorrections = (
    sourceCanvas.manualDetections?.length
    || sourceCanvas.removedDetectorDetections?.length
  );
  if (
    !contributorMode
    || !contributorPassword
  ) {
    return;
  }

  const blob = await canvasToBlob(sourceCanvas);
  const formData = new FormData();
  formData.append("file", blob, "detector-source.jpg");
  formData.append(
    "annotation_id",
    sourceCanvas.detectorAnnotationId || createDetectorAnnotationId(),
  );
  formData.append(
    "manual_boxes",
    JSON.stringify(normalizedDetectorBoxes(sourceCanvas, sourceCanvas.manualDetections)),
  );
  formData.append(
    "detector_boxes",
    JSON.stringify(normalizedDetectorBoxes(sourceCanvas, sourceCanvas.detectorDetections)),
  );
  formData.append(
    "accepted_boxes",
    JSON.stringify(normalizedDetectorBoxes(sourceCanvas, sourceCanvas.lastDetections)),
  );
  formData.append(
    "removed_boxes",
    JSON.stringify(normalizedDetectorBoxes(sourceCanvas, sourceCanvas.removedDetectorDetections)),
  );

  const response = await fetch(apiUrl("/contributor/detector-annotation", contributorApiBase), {
    method: "POST",
    headers: {
      [CONTRIBUTOR_PASSWORD_HEADER]: contributorPassword,
    },
    body: formData,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    throw new Error(result.detail || `Annotation save failed: ${response.status}`);
  }
  if (result.annotation_id) {
    sourceCanvas.detectorAnnotationId = result.annotation_id;
  }
  sourceCanvas.detectorAnnotationSaved = true;
  if (hasCorrections) {
    setStatus(
      `Saved ${result.manual_boxes} added and ${result.removed_boxes} removed detector correction`
      + `${result.manual_boxes + result.removed_boxes === 1 ? "" : "s"}.`,
    );
  }
}

function createDetectorAnnotationId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `scan-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
    paligemma_adjustment: cleanNumber(match.paligemma_adjustment),
    paligemma_image_score: cleanNumber(match.paligemma_image_score),
    paligemma_image_rank_score: cleanNumber(match.paligemma_image_rank_score),
    paligemma_used: Boolean(result.paligemma_used),
    paligemma_text: result.paligemma_text || "",
    paligemma_candidates: result.paligemma_candidates || [],
    reference_image_path: match.reference_image_path || "",
    visual_score_available: match.visual_score_available !== false,
    matcher: "backend",
  }));
}

async function preloadStartupModels() {
  const requiredTasks = [
    ["detector", ensureDetectorLoaded()],
    ["game details", ensureGameDetailsLoaded()],
    ["player expansion index", ensurePlayerExpansionIndexLoaded()],
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
  const matchDiagnostic = document.createElement("div");
  const score = document.createElement("div");
  const paligemmaHint = document.createElement("div");
  const fit = document.createElement("div");
  const details = document.createElement("div");
  const findGameButton = document.createElement("button");
  const feedbackActions = document.createElement("div");
  const confirmButton = document.createElement("button");
  const denyButton = document.createElement("button");
  const feedbackStatus = document.createElement("div");
  const correctionPanel = document.createElement("form");
  const correctionLabel = document.createElement("label");
  const correctionLabelText = document.createElement("span");
  const correctionInput = document.createElement("input");
  const correctionSuggestions = document.createElement("div");
  const correctionCoverPanel = document.createElement("div");
  const correctionCoverImage = document.createElement("img");
  const correctionCoverName = document.createElement("strong");
  const correctionCoverQuestion = document.createElement("span");
  const correctionCoverActions = document.createElement("div");
  const correctionCoverConfirmButton = document.createElement("button");
  const correctionCoverBackButton = document.createElement("button");
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
  matchDiagnostic.className = "matchDiagnostic";
  score.className = "matchScore";
  paligemmaHint.className = "paligemmaHint";
  paligemmaHint.hidden = true;
  fit.className = "filterFit";
  details.className = "gameDetails";
  findGameButton.className = "findGameButton";
  feedbackActions.className = "feedbackActions";
  confirmButton.className = "feedbackConfirmButton";
  denyButton.className = "feedbackDenyButton";
  feedbackStatus.className = "feedbackStatus";
  correctionPanel.className = "correctionPanel";
  correctionSuggestions.className = "correctionSuggestions";
  correctionCoverPanel.className = "correctionCoverPanel";
  correctionCoverImage.className = "correctionCoverImage";
  correctionCoverName.className = "correctionCoverName";
  correctionCoverQuestion.className = "correctionCoverQuestion";
  correctionCoverActions.className = "correctionCoverActions";
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
  correctionCoverConfirmButton.type = "button";
  correctionCoverBackButton.type = "button";
  correctionCancelButton.type = "button";
  correctionSaveButton.textContent = "Check cover";
  correctionCoverConfirmButton.textContent = "Yes, same game";
  correctionCoverBackButton.textContent = "Choose another";
  correctionCancelButton.textContent = "Skip";
  confirmButton.setAttribute("aria-label", "Confirm recognition");
  denyButton.setAttribute("aria-label", "Deny recognition");
  feedbackStatus.textContent = "Waiting for match";
  findGameButton.type = "button";
  findGameButton.textContent = "Show in picture";
  findGameButton.setAttribute("aria-label", "Show this game in the scanned picture");
  findGameButton.title = "Highlight this game's box in the picture";
  findGameButton.disabled = true;
  correctionPanel.hidden = true;
  correctionCoverPanel.hidden = true;
  correctionStatus.textContent = "";

  correctionLabel.append(correctionLabelText, correctionInput);
  correctionCoverActions.append(correctionCoverConfirmButton, correctionCoverBackButton);
  correctionCoverPanel.append(
    correctionCoverImage,
    correctionCoverName,
    correctionCoverQuestion,
    correctionCoverActions,
  );
  correctionActions.append(correctionSaveButton, correctionCancelButton);
  correctionPanel.append(
    correctionLabel,
    correctionSuggestions,
    correctionCoverPanel,
    correctionActions,
    correctionStatus,
  );
  feedbackActions.append(confirmButton, denyButton, feedbackStatus);
  body.append(name, meta, matchDiagnostic, score, paligemmaHint, fit, details, findGameButton, feedbackActions, correctionPanel);
  card.append(dismissButton, cropCanvas, body);
  card.tabIndex = 0;
  card.setAttribute("aria-label", `Highlight box ${index + 1} in the photo`);
  resultsGrid.append(card);

  const cardApi = {
    card,
    cropCanvas,
    detection,
    matches: [],
    details: null,
    isConfident: false,
    fitsFilters: false,
    feedbackSent: false,
    userConfirmed: false,
    matchFailed: false,
    dismissed: false,
    correctionSelectedGame: null,
    feedbackControls: {
      confirmButton,
      denyButton,
      feedbackStatus,
      correctionPanel,
      correctionLabel,
      correctionInput,
      correctionSuggestions,
      correctionCoverPanel,
      correctionCoverImage,
      correctionCoverName,
      correctionCoverQuestion,
      correctionCoverConfirmButton,
      correctionCoverBackButton,
      correctionActions,
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
      this.userConfirmed = false;
      this.matchFailed = false;
      card.classList.remove("feedbackConfirmed", "feedbackDenied");

      if (!best) {
        name.textContent = "No match";
        meta.textContent = "";
        matchDiagnostic.textContent = "";
        score.textContent = "";
        paligemmaHint.hidden = true;
        details.replaceChildren();
        findGameButton.disabled = true;
        card.dataset.score = "-1";
        updateFeedbackActions(this);
        this.applyFilters();
        refreshSelectedMatchCard(this);
        return;
      }

      name.textContent = best.name;
      meta.textContent = `BGG ${best.id}`;
      matchDiagnostic.textContent = `Match source: ${formatMatchSource(best)}`;
      score.textContent = formatMatchScoreText(best);
      paligemmaHint.textContent = best.paligemma_text
        ? `PaLIGemma sees: ${best.paligemma_text}`
        : "";
      paligemmaHint.hidden = !best.paligemma_text;
      card.dataset.score = String(matchSortScore(best));
      findGameButton.disabled = false;
      renderGameDetails(details, matches, {
        force: this.isConfident,
        detailsRecord: this.details,
      });
      this.applyFilters();
      updateFeedbackActions(this);
      refreshSelectedMatchCard(this);
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
      this.userConfirmed = true;
      this.details = gameDetailsById.get(Number(game.id)) || null;
      name.textContent = game.name;
      meta.textContent = `BGG ${game.id} · corrected`;
      matchDiagnostic.textContent = "Match source: contributor correction";
      score.textContent = "Saved as correct";
      card.dataset.score = "1";
      renderGameDetails(details, this.matches, {
        force: true,
        detailsRecord: this.details,
      });
      this.applyFilters();
      refreshSelectedMatchCard(this);
    },
    async resolveDetails({ force = false } = {}) {
      const best = this.matches[0];

      if (!best || this.dismissed) {
        return false;
      }

      const detailsRecord = await ensureDetailsForGame(best.id);

      if (
        this.dismissed
        || !this.matches[0]
        || Number(this.matches[0].id) !== Number(best.id)
      ) {
        return false;
      }

      if (!detailsRecord) {
        return false;
      }

      this.details = detailsRecord;
      renderGameDetails(details, this.matches, {
        force: force || this.isConfident,
        detailsRecord: this.details,
      });
      this.applyFilters();
      refreshSelectedMatchCard(this);
      return true;
    },
    async confirmMatch() {
      const best = this.matches[0];

      if (!best) {
        return;
      }

      this.userConfirmed = true;
      this.isConfident = true;
      this.details = gameDetailsById.get(Number(best.id)) || null;
      renderGameDetails(details, this.matches, {
        force: true,
        detailsRecord: this.details,
      });
      this.applyFilters();
      refreshSelectedMatchCard(this);
      await this.resolveDetails({ force: true });
    },
    setError(text, options = {}) {
      this.matches = [];
      this.details = null;
      this.isConfident = false;
      this.fitsFilters = false;
      this.matchFailed = true;
      this.userConfirmed = false;
      name.textContent = text;
      meta.textContent = options.meta || "Backend matcher unavailable";
      score.textContent = "";
      fit.className = "filterFit unknown";
      fit.textContent = options.fitText || "Try again";
      details.className = "gameDetails muted";
      details.textContent = options.detailsText || "Start the backend and scan again.";
      findGameButton.disabled = true;
      card.dataset.score = "-1";
      card.dataset.fit = "0";
      card.classList.remove("recommended", "conditional", "rejected");
      updateFeedbackActions(this);
      refreshSelectedMatchCard(this);
    },
    applyFilters() {
      const result = evaluateCardAgainstFilters(this);

      this.fitsFilters = result.fits;
      card.dataset.fit = result.rank;
      card.classList.toggle("recommended", result.className === "yes");
      card.classList.toggle("conditional", result.className === "conditional");
      card.classList.toggle("rejected", result.rank === "0");
      fit.className = `filterFit ${result.className}`;
      fit.textContent = result.text;
      fit.title = result.title || result.text;
    },
  };

  card.addEventListener("click", (event) => {
    if (isMatchSelectionInteractiveTarget(event.target)) {
      return;
    }

    selectMatchCard(cardApi);
  });
  card.addEventListener("keydown", (event) => {
    if (
      (event.key !== "Enter" && event.key !== " ")
      || isMatchSelectionInteractiveTarget(event.target)
    ) {
      return;
    }

    event.preventDefault();
    selectMatchCard(cardApi);
  });
  confirmButton.addEventListener("click", () => submitRecognitionFeedback(cardApi, "confirm"));
  denyButton.addEventListener("click", () => submitRecognitionFeedback(cardApi, "deny"));
  dismissButton.addEventListener("click", () => dismissMatchCard(cardApi, 1));
  findGameButton.addEventListener("click", () => {
    selectMatchCard(cardApi);
    hideResultsPanel();
  });
  enableCropHoverPreview(cropCanvas);
  cropCanvas.addEventListener("click", () => {
    selectMatchCard(cardApi);
    openCropViewer(cropCanvas, name.textContent);
  });
  correctionPanel.addEventListener("submit", (event) => submitCorrectedReference(event, cardApi));
  correctionInput.addEventListener("input", () => {
    resetCorrectionCoverConfirmation(cardApi);
    updateCorrectionSuggestions(cardApi);
  });
  correctionInput.addEventListener("keydown", (event) => handleCorrectionInputKeyDown(event, cardApi));
  correctionCancelButton.addEventListener("click", () => hideCorrectionPrompt(cardApi));
  correctionCoverConfirmButton.addEventListener("click", () => saveConfirmedCorrectedReference(cardApi));
  correctionCoverBackButton.addEventListener("click", () => resetCorrectionCoverConfirmation(cardApi, { focus: true }));
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
      startTime: event.timeStamp,
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

      if (absY > absX * 1.25) {
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

function isMatchSelectionInteractiveTarget(target) {
  return target.closest?.("button, input, select, textarea, a, label, .correctionPanel, .matchCropCanvas");
}

function selectMatchCard(cardApi) {
  if (!cardApi || cardApi.dismissed) {
    return;
  }

  if (selectedMatchCard && selectedMatchCard !== cardApi) {
    selectedMatchCard.card.classList.remove("isSelected");
  }

  selectedMatchCard = cardApi;
  cardApi.card.classList.add("isSelected");
  redrawActiveDetections();

  const best = cardApi.matches[0];
  setStatus(best
    ? `${best.name} highlighted in the photo.`
    : "Selected box highlighted in the photo.");
}

function clearSelectedMatchCard() {
  if (selectedMatchCard) {
    selectedMatchCard.card.classList.remove("isSelected");
  }

  selectedMatchCard = null;
}

function refreshSelectedMatchCard(cardApi) {
  if (selectedMatchCard === cardApi) {
    redrawActiveDetections();
  }
}

function finishSwipeDismiss(cardApi, gesture, event, allowDismiss) {
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return;
  }

  const distance = Math.abs(gesture.dx);
  const elapsed = Math.max(1, event.timeStamp - gesture.startTime);
  const wasQuickFlick = distance >= CARD_DISMISS_FLICK_MIN_DISTANCE
    && distance / elapsed >= CARD_DISMISS_FLICK_VELOCITY;
  const shouldDismiss = allowDismiss
    && gesture.dragging
    && (distance >= swipeDismissThreshold(cardApi.card) || wasQuickFlick);

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

  if (selectedMatchCard === cardApi) {
    clearSelectedMatchCard();
    redrawActiveDetections();
  }

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
      showMatchesButton.hidden = true;
      resultCount.textContent = "";
      return;
    }

    updateResultStats();
    sortCards();
  };

  card.addEventListener("transitionend", removeCard, { once: true });
  window.setTimeout(removeCard, 260);
}

function enableCropHoverPreview(source) {
  source.addEventListener("pointerenter", (event) => {
    showCropZoomPreview(source, event);
  });
  source.addEventListener("pointermove", positionCropZoomPreview);
  source.addEventListener("pointerleave", hideCropZoomPreview);
  source.addEventListener("pointercancel", hideCropZoomPreview);
}

function showCropZoomPreview(source, event) {
  const sourceSize = drawableSourceSize(source);

  if (
    manualBoxMode
    || !cropHoverPreviewQuery?.matches
    || !sourceSize.width
    || !sourceSize.height
  ) {
    hideCropZoomPreview();
    return;
  }

  const preview = getCropZoomPreview();
  const maxSide = Math.min(
    CROP_ZOOM_MAX_SIDE,
    window.innerWidth - 32,
    window.innerHeight - 32
  );
  const sourceMaxSide = Math.max(sourceSize.width, sourceSize.height);
  const scale = Math.min(
    maxSide / sourceMaxSide,
    Math.max(CROP_ZOOM_MIN_SIDE / sourceMaxSide, 1)
  );
  const width = Math.max(1, Math.round(sourceSize.width * scale));
  const height = Math.max(1, Math.round(sourceSize.height * scale));
  const context = preview.getContext("2d");

  preview.width = width;
  preview.height = height;
  preview.style.width = `${width}px`;
  preview.style.height = `${height}px`;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.clearRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
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

function openCropViewer(source, titleText = "Crop") {
  const sourceSize = drawableSourceSize(source);

  if (!sourceSize.width || !sourceSize.height) {
    return;
  }

  hideCropZoomPreview();

  const viewer = getCropViewer();
  const { overlay, canvas, title, scroller } = viewer;
  const context = canvas.getContext("2d");

  title.textContent = titleText || "Crop";
  canvas.width = sourceSize.width;
  canvas.height = sourceSize.height;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0);
  overlay.hidden = false;
  document.body.classList.add("cropViewerOpen");

  const fitZoom = calculateCropViewerFitZoom(sourceSize, scroller);
  const coverZoom = calculateCropViewerCoverZoom(sourceSize, scroller);
  const initialZoom = coverZoom;

  cropViewerState = {
    sourceWidth: sourceSize.width,
    sourceHeight: sourceSize.height,
    fitZoom,
    coverZoom,
    zoom: initialZoom,
    drag: null,
  };

  setCropViewerZoom(initialZoom, { preserveCenter: false });
  window.requestAnimationFrame(centerCropViewer);
}

function drawableSourceSize(source) {
  return {
    width: source?.naturalWidth || source?.videoWidth || source?.width || 0,
    height: source?.naturalHeight || source?.videoHeight || source?.height || 0,
  };
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
    gameDetailsById = new Map();
    const loadedCount = mergeGameDetailPayload(payload);

    console.log(`Loaded ${loadedCount} core game detail records.`);
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

function ensurePlayerExpansionIndexLoaded() {
  if (!playerExpansionIndexLoadPromise) {
    playerExpansionIndexLoadPromise = loadPlayerExpansionIndex();
  }

  return playerExpansionIndexLoadPromise;
}

async function loadPlayerExpansionIndex() {
  try {
    const response = await fetch(PLAYER_EXPANSION_INDEX_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Could not load player expansion index: ${response.status}`);
    }

    const payload = await response.json();
    playerExpansionIndex = parsePlayerExpansionIndex(payload);
    console.log(`Loaded ${playerExpansionIndex.size} player expansion override records.`);

    if (currentResultCards.length) {
      handleFilterChange();
    }
  } catch (error) {
    console.warn("Player expansion index unavailable:", error);
    playerExpansionIndex = new Map();
  }
}

function parsePlayerExpansionIndex(payload) {
  const nextIndex = new Map();

  for (const [baseId, entries] of Object.entries(payload || {})) {
    const gameId = cleanNumber(baseId);

    if (!Number.isInteger(gameId) || gameId <= 0 || !Array.isArray(entries)) {
      continue;
    }

    const normalizedEntries = entries
      .map(normalizePlayerExpansionEntry)
      .filter(Boolean);

    if (normalizedEntries.length) {
      nextIndex.set(gameId, normalizedEntries);
    }
  }

  return nextIndex;
}

function normalizePlayerExpansionEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const name = String(entry.name || "").trim();
  let minPlayers = cleanNumber(entry.min_players ?? entry.minPlayers);
  let maxPlayers = cleanNumber(entry.max_players ?? entry.maxPlayers);

  if (!name || (!minPlayers && !maxPlayers)) {
    return null;
  }

  if (!minPlayers) {
    minPlayers = maxPlayers;
  }

  if (!maxPlayers) {
    maxPlayers = minPlayers;
  }

  if (maxPlayers < minPlayers) {
    [minPlayers, maxPlayers] = [maxPlayers, minPlayers];
  }

  return {
    id: cleanNumber(entry.id),
    name,
    minPlayers,
    maxPlayers,
    bggUrl: String(entry.bgg_url || entry.bggUrl || "").trim(),
  };
}

function detailRecordsFromPayload(payload) {
  return Array.isArray(payload)
    ? payload
    : Object.values(payload || {});
}

function mergeGameDetailPayload(payload) {
  let count = 0;

  for (const game of detailRecordsFromPayload(payload)) {
    const gameId = Number(game?.id);

    if (!Number.isInteger(gameId) || gameId <= 0 || !game.name) {
      continue;
    }

    gameDetailsById.set(gameId, game);
    count += 1;
  }

  return count;
}

async function ensureObscureGameDetailsLoaded() {
  await ensureGameDetailsLoaded();

  if (obscureGameDetailsLoaded || !obscureGameDetailsAvailable) {
    return;
  }

  if (!obscureGameDetailsLoadPromise) {
    obscureGameDetailsLoadPromise = loadObscureGameDetails().catch((error) => {
      obscureGameDetailsLoadPromise = null;
      throw error;
    });
  }

  return obscureGameDetailsLoadPromise;
}

async function loadObscureGameDetails() {
  try {
    const response = await fetch(GAME_OBSCURE_DETAILS_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Could not load obscure game details: ${response.status}`);
    }

    const payload = await response.json();
    const loadedCount = mergeGameDetailPayload(payload);
    obscureGameDetailsLoaded = true;
    console.log(`Loaded ${loadedCount} obscure game detail records.`);
  } catch (error) {
    obscureGameDetailsAvailable = false;
    console.warn("Obscure game details unavailable:", error);
  }
}

async function ensureDetailsForGame(gameId) {
  const normalizedGameId = Number(gameId);

  if (!Number.isInteger(normalizedGameId) || normalizedGameId <= 0) {
    return null;
  }

  await ensureGameDetailsLoaded();

  if (gameDetailsById.has(normalizedGameId)) {
    return gameDetailsById.get(normalizedGameId);
  }

  await ensureObscureGameDetailsLoaded();
  return gameDetailsById.get(normalizedGameId) || null;
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
    const [response, aliasesResponse] = await Promise.all([
      fetch(GAME_SEARCH_INDEX_URL, { cache: "no-store" }),
      fetch(GAME_ALIASES_URL, { cache: "no-store" }),
    ]);

    if (!response.ok) {
      throw new Error(`Could not load game search index: ${response.status}`);
    }

    const payload = await response.json();
    const aliasesById = aliasesResponse.ok ? await aliasesResponse.json() : {};
    const records = Array.isArray(payload)
      ? payload
      : Object.values(payload);

    gameSearchIndex = records
      .map((game) => normalizeGameSearchRecord({
        ...game,
        aliases: aliasesById[String(game?.id)] || game?.aliases || [],
      }))
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
  const aliases = Array.isArray(game.aliases)
    ? game.aliases.map((alias) => String(alias || "").trim()).filter(Boolean)
    : [];
  const normalizedAliases = aliases.map(normalizeGameLookupText).filter(Boolean);

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
    thumbnail_url: game.thumbnail_url || details.thumbnail_url || "",
    image_url: game.image_url || details.image_url || "",
    bgg_url: game.bgg_url || details.bgg_url || `https://boardgamegeek.com/boardgame/${gameId}`,
    normalizedName,
    searchTokens: uniqueTokens(normalizedName),
    aliases,
    normalizedAliases,
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
      showCorrectionCoverConfirmation(card, suggestion).catch((error) => {
        console.error(error);
        resetCorrectionCoverConfirmation(card);
        card.feedbackControls.correctionStatus.textContent =
          error.message || "Could not load that game's cover.";
      });
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
  const titleOptions = [
    { normalizedName: game.normalizedName, searchTokens: game.searchTokens },
    ...(game.normalizedAliases || []).map((normalizedName) => ({
      normalizedName,
      searchTokens: uniqueTokens(normalizedName),
    })),
  ];
  return Math.max(...titleOptions.map((title) => scoreGameCandidateTitle(
    query,
    queryTokens,
    { ...game, ...title },
  )));
}

function scoreGameCandidateTitle(query, queryTokens, game) {
  if (!query || !queryTokens.length || !game.normalizedName) {
    return 0;
  }

  const name = game.normalizedName;

  if (name === query) {
    return 1.3;
  }

  const fullPhraseScore = scorePhraseMatch(query, name);
  const tokenScore = scoreTokenMatch(queryTokens, game.searchTokens);
  const tokenCoverage = scoreQueryTokenCoverage(queryTokens, game.searchTokens);
  const lengthRatio = Math.min(query.length, name.length) / Math.max(query.length, name.length);
  const phraseWeight = fullPhraseScore >= 0.9 ? 0.58 : 0.38;
  const tokenWeight = fullPhraseScore >= 0.9 ? 0.32 : 0.52;
  const coverageBoost = Math.min(queryTokens.length, game.searchTokens.length) >= 2 ? 0.08 : 0;
  const variantBoost = queryTokens.length > 1 && allQueryTokensAppear(queryTokens, game.searchTokens) ? 0.14 : 0;
  const completeTokenBoost = queryTokens.length > 1 && tokenCoverage >= 1 ? 0.18 : 0;
  const conciseTitleBoost = queryTokens.length > 1 && tokenCoverage >= 1
    ? Math.max(0, 0.06 - Math.max(0, game.searchTokens.length - queryTokens.length) * 0.02)
    : 0;
  const missingTokenPenalty = queryTokens.length > 1 ? (1 - tokenCoverage) * 0.22 : 0;
  const shortPenalty = getShortMatchPenalty(queryTokens, game.searchTokens, tokenScore, fullPhraseScore);
  const expansionPenalty = game.is_expansion && !query.includes("expansion") ? 0.015 : 0;
  const rankBoost = game.rank ? Math.max(0, 0.04 - Math.log10(game.rank + 1) * 0.007) : 0;
  const score = fullPhraseScore * phraseWeight
    + tokenScore * tokenWeight
    + lengthRatio * 0.08
    + coverageBoost
    + variantBoost
    + completeTokenBoost
    + conciseTitleBoost
    + rankBoost
    - missingTokenPenalty
    - shortPenalty
    - expansionPenalty;

  return Math.min(1.29, Math.max(0, score));
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
  return queryTokens.every((token) => bestTokenSimilarity(token, candidateTokens) >= tokenCoverageThreshold(token));
}

function scoreQueryTokenCoverage(queryTokens, candidateTokens) {
  if (!queryTokens.length) {
    return 0;
  }

  const matched = queryTokens.filter((token) => (
    bestTokenSimilarity(token, candidateTokens) >= tokenCoverageThreshold(token)
  )).length;

  return matched / queryTokens.length;
}

function tokenCoverageThreshold(token) {
  if (token.length <= 1) {
    return 0.64;
  }

  if (token.length <= 2) {
    return 0.76;
  }

  return 0.86;
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

  if (right.startsWith(left) && left.length >= 1) {
    if (left.length >= 5) {
      return 0.95;
    }

    if (left.length >= 3) {
      return 0.88;
    }

    return left.length === 2 ? 0.78 : 0.64;
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

  const exact = gameSearchIndex.find((game) => (
    game.normalizedName === query || game.normalizedAliases?.includes(query)
  ));

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
    contributorRole = result.role === "admin" ? "admin" : "contributor";
    contributorApiBase = nextApiBase;
    saveStoredContributorPassword(password);
    resetBackendMatcherProbe();

    contributorPasswordInput.value = "";
    contributorStatus.textContent = contributorRole === "admin"
      ? "Admin mode enabled."
      : "Contributor mode enabled.";
    setContributorMode(true);
    selectContributorTab(contributorRole === "admin" ? "latest" : "mode");
    setStatus("Contributor mode on. Use OK or X on each match.");
  } catch (error) {
    console.error(error);
    contributorStatus.textContent = error.message || "Contributor login failed.";
  }
}

async function restoreStoredContributorLogin() {
  const password = loadStoredContributorPassword();

  if (!password) {
    return;
  }

  const nextApiBase = configuredApiBase();
  contributorStatus.textContent = "Restoring contributor mode...";

  try {
    const response = await fetchWithTimeout(
      apiUrl("/contributor-login", nextApiBase),
      {
        method: "POST",
        headers: {
          [CONTRIBUTOR_PASSWORD_HEADER]: password,
        },
      },
      BACKEND_HEALTH_TIMEOUT_MS
    );
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      const error = new Error(result.detail || `Login failed: ${response.status}`);
      error.invalidContributorLogin = true;
      throw error;
    }

    contributorPassword = password;
    contributorRole = result.role === "admin" ? "admin" : "contributor";
    contributorApiBase = nextApiBase;
    resetBackendMatcherProbe();
    contributorPasswordInput.value = "";
    contributorStatus.textContent = contributorRole === "admin"
      ? "Admin mode remembered."
      : "Contributor mode remembered.";
    setContributorMode(true);
  } catch (error) {
    console.warn("Could not restore contributor mode:", error);

    if (error.invalidContributorLogin) {
      clearStoredContributorPassword();
      contributorStatus.textContent = "Saved contributor login expired.";
      return;
    }

    contributorStatus.textContent = "Contributor login saved. Backend is not reachable yet.";
  }
}

function logoutContributor() {
  contributorPassword = "";
  contributorRole = "";
  clearStoredContributorPassword();
  setContributorMode(false);
  clearContributorReview();
  selectContributorTab("mode", { load: false });
  contributorStatus.textContent = "Contributor mode disabled.";
  setStatus("Contributor mode off.");
}

function setContributorMode(enabled) {
  contributorMode = enabled;
  document.body.classList.toggle("contributorMode", contributorMode);
  contributorModeState.textContent = contributorMode
    ? (contributorRole === "admin" ? "Admin" : "On")
    : "Off";
  contributorTabs.hidden = !contributorMode;
  latestContributorTabButton.hidden = !contributorMode || contributorRole !== "admin";
  detectorContributorTabButton.hidden = !contributorMode || contributorRole !== "admin";
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

function loadStoredContributorPassword() {
  try {
    return localStorage.getItem(CONTRIBUTOR_STORAGE_KEY) || "";
  } catch (error) {
    console.warn("Contributor login storage is unavailable:", error);
    return "";
  }
}

function saveStoredContributorPassword(password) {
  try {
    localStorage.setItem(CONTRIBUTOR_STORAGE_KEY, password);
  } catch (error) {
    console.warn("Could not remember contributor login:", error);
  }
}

function clearStoredContributorPassword() {
  try {
    localStorage.removeItem(CONTRIBUTOR_STORAGE_KEY);
  } catch (error) {
    console.warn("Could not clear contributor login:", error);
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
      ? (contributorRole === "admin" ? "Admin mode is active." : "Contributor mode is active.")
      : "Enter the contributor password.";
    if (contributorMode && contributorActiveTab === "latest") {
      loadContributorReview();
    } else if (contributorMode && contributorActiveTab === "detector") {
      loadDetectorReview();
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
  const nextTab = ["latest", "detector"].includes(tab) ? tab : "mode";

  if (["latest", "detector"].includes(nextTab) && contributorRole !== "admin") {
    contributorStatus.textContent = "Admin access is required to review submissions.";
    contributorActiveTab = "mode";
  } else if (nextTab !== "mode" && (!contributorMode || !contributorPassword)) {
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
  } else if (contributorActiveTab === "detector" && load) {
    loadDetectorReview();
    window.setTimeout(() => detectorReviewPanel?.scrollIntoView({ block: "start", behavior: "smooth" }), 60);
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
  if (!contributorMode || !contributorPassword || contributorRole !== "admin") {
    contributorReviewStatus.textContent = "Admin access is required to review saved references.";
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

async function loadDetectorReview({ force = false } = {}) {
  if (!contributorMode || !contributorPassword || contributorRole !== "admin") {
    detectorReviewStatus.textContent = "Admin access is required for detector review.";
    return;
  }
  if (force) {
    detectorReviewLoadPromise = null;
  }
  if (detectorReviewLoadPromise) {
    return detectorReviewLoadPromise;
  }
  detectorReviewRefreshButton.disabled = true;
  detectorReviewStatus.textContent = "Loading detector corrections...";
  detectorReviewLoadPromise = Promise.all([
    fetch(apiUrl("/contributor/detector-annotations?status=needs_review&limit=50", contributorApiBase), {
      cache: "no-store",
      headers: { [CONTRIBUTOR_PASSWORD_HEADER]: contributorPassword },
    }),
    fetch(apiUrl("/contributor/detector-training-status", contributorApiBase), {
      cache: "no-store",
      headers: { [CONTRIBUTOR_PASSWORD_HEADER]: contributorPassword },
    }),
    fetch(apiUrl("/contributor/detector-annotations?status=unverified&limit=50", contributorApiBase), {
      cache: "no-store",
      headers: { [CONTRIBUTOR_PASSWORD_HEADER]: contributorPassword },
    }),
  ])
    .then(async ([annotationsResponse, trainingResponse, untouchedResponse]) => {
      const annotations = await annotationsResponse.json().catch(() => ({}));
      const training = await trainingResponse.json().catch(() => ({}));
      const untouched = await untouchedResponse.json().catch(() => ({}));
      if (!annotationsResponse.ok) {
        throw new Error("Could not load detection reviews.");
      }
      if (!trainingResponse.ok) {
        throw new Error("Could not load detection reviews.");
      }
      if (!untouchedResponse.ok) {
        throw new Error("Could not load untouched detector scans.");
      }
      renderDetectorReview(
        annotations.annotations || [],
        untouched.annotations || [],
        annotations.counts || {},
      );
      renderDetectorTrainingStatus(training);
    })
    .catch((error) => {
      console.error(error);
      detectorReviewStatus.textContent = "Could not load detection reviews.";
    })
    .finally(() => {
      detectorReviewRefreshButton.disabled = false;
      detectorReviewLoadPromise = null;
    });
  return detectorReviewLoadPromise;
}

function renderDetectorReview(annotations, untouchedAnnotations, counts) {
  for (const url of detectorReviewImageUrls) {
    URL.revokeObjectURL(url);
  }
  detectorReviewImageUrls = [];
  detectorReviewGrid.replaceChildren();
  untouchedDetectorGrid.replaceChildren();
  const pendingCount = counts.needs_review || 0;
  const untouchedCount = (counts.unverified || 0) + (counts.no_corrections || 0);
  detectorReviewCount.textContent = pendingCount
    ? `${pendingCount} to review`
    : "";
  detectorReviewStatus.textContent = annotations.length
    ? "Only confirm when every visible game box is marked correctly."
    : "No detector corrections are waiting for review.";
  for (const annotation of annotations) {
    detectorReviewGrid.append(createDetectorReviewCard(annotation));
  }
  untouchedDetectorCount.textContent = untouchedCount
    ? `${untouchedCount} saved`
    : "";
  untouchedDetectorStatus.textContent = untouchedAnnotations.length
    ? "These scans were saved without box changes. Review them before using them for training."
    : "No untouched contributor scans have been saved yet.";
  for (const annotation of untouchedAnnotations) {
    untouchedDetectorGrid.append(createDetectorReviewCard(annotation, { untouched: true }));
  }
}

function createDetectorReviewCard(annotation, { untouched = false } = {}) {
  const card = document.createElement("article");
  const image = document.createElement("img");
  const body = document.createElement("div");
  const title = document.createElement("strong");
  const meta = document.createElement("div");
  const legend = document.createElement("div");
  const actions = document.createElement("div");
  const openButton = document.createElement("button");
  const approveButton = document.createElement("button");
  const rejectButton = document.createElement("button");
  const status = document.createElement("div");
  card.className = "contributorReviewCard";
  card.classList.toggle("isFlaggedForReview", Boolean(reference.flagged_for_review));
  image.className = "contributorReviewImage";
  body.className = "contributorReviewBody";
  meta.className = "contributorReviewMeta";
  legend.className = "detectorBoxLegend";
  actions.className = "contributorReviewActions";
  actions.classList.add("detectorReviewActions");
  status.className = "contributorReviewItemStatus";
  image.alt = untouched ? "Untouched detector scan" : "Corrected detector scan";
  title.textContent = `${untouched ? "Untouched" : "Corrected"} scan ${annotation.annotation_id.slice(0, 8)}`;
  meta.textContent = `${annotation.accepted_boxes?.length || 0} accepted · `
    + `${annotation.manual_boxes?.length || 0} added · ${annotation.removed_boxes?.length || 0} removed`;
  legend.innerHTML = [
    '<span><i class="detectorKeepColor"></i>Model: keep</span>',
    '<span><i class="detectorRemoveColor"></i>Model: remove</span>',
    '<span><i class="detectorManualColor"></i>Manual: added</span>',
  ].join("");
  openButton.type = "button";
  approveButton.type = "button";
  rejectButton.type = "button";
  openButton.textContent = "Adjust boxes";
  openButton.disabled = true;
  approveButton.textContent = "Review & approve";
  rejectButton.textContent = "Reject";
  status.textContent = untouched ? "Saved for later review" : "Needs review";
  actions.append(openButton, approveButton, rejectButton);
  body.append(title, meta, legend, actions, status);
  card.append(image, body);
  loadDetectorAnnotationImage(annotation, image, openButton);
  image.addEventListener("click", () => openDetectorReviewEditor(annotation, card, status));
  openButton.addEventListener("click", () => openDetectorReviewEditor(annotation, card, status));
  approveButton.addEventListener("click", () => openDetectorReviewEditor(annotation, card, status));
  rejectButton.addEventListener("click", () => reviewDetectorAnnotation(annotation, "reject", card, status));
  return card;
}

async function loadDetectorAnnotationImage(annotation, image, openButton) {
  try {
    const reviewImageUrl = new URL(apiUrl(annotation.image_url, contributorApiBase));
    reviewImageUrl.searchParams.set("overlay", "true");
    const response = await fetch(reviewImageUrl.toString(), {
      cache: "no-store",
      headers: { [CONTRIBUTOR_PASSWORD_HEADER]: contributorPassword },
    });
    if (!response.ok) {
      throw new Error(`Image failed: ${response.status}`);
    }
    const url = URL.createObjectURL(await response.blob());
    detectorReviewImageUrls.push(url);
    image.src = url;
    await image.decode?.().catch(() => {});
    openButton.disabled = false;
  } catch (error) {
    console.warn(error);
    image.classList.add("loadFailed");
  }
}

async function reviewDetectorAnnotation(annotation, action, card, status, adjustments = null) {
  status.textContent = action === "approve" ? "Approving..." : "Rejecting...";
  const formData = new FormData();
  formData.append("annotation_id", annotation.annotation_id);
  formData.append("action", action);
  if (adjustments) {
    formData.append("accepted_boxes", JSON.stringify(adjustments.acceptedBoxes));
    formData.append("manual_boxes", JSON.stringify(adjustments.manualBoxes));
    formData.append("removed_boxes", JSON.stringify(adjustments.removedBoxes));
  }
  try {
    const response = await fetch(apiUrl("/contributor/detector-annotation-review", contributorApiBase), {
      method: "POST",
      headers: { [CONTRIBUTOR_PASSWORD_HEADER]: contributorPassword },
      body: formData,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(result.detail || `Review failed: ${response.status}`);
    }
    card.remove();
    loadDetectorReview({ force: true });
  } catch (error) {
    status.textContent = error.message || "Review failed.";
  }
}

function detectorReviewBoxesMatch(left, right, tolerance = 0.002) {
  return ["x", "y", "width", "height"].every(
    (key) => Math.abs(Number(left?.[key] || 0) - Number(right?.[key] || 0)) <= tolerance,
  );
}

async function openDetectorReviewEditor(annotation, card, cardStatus) {
  const modal = document.createElement("div");
  const windowElement = document.createElement("section");
  const header = document.createElement("header");
  const title = document.createElement("h2");
  const closeButton = document.createElement("button");
  const canvasWrap = document.createElement("div");
  const canvas = document.createElement("canvas");
  const toolbar = document.createElement("div");
  const hint = document.createElement("p");
  const hintDismissButton = document.createElement("button");
  const suggestButton = document.createElement("button");
  const fitReviewButton = document.createElement("button");
  const undoButton = document.createElement("button");
  const approveButton = document.createElement("button");
  const editorStatus = document.createElement("span");
  const context = canvas.getContext("2d");
  const image = new Image();
  const originalImageUrl = new URL(apiUrl(annotation.image_url, contributorApiBase));
  originalImageUrl.searchParams.set("overlay", "false");
  const manualBoxes = structuredClone(annotation.manual_boxes || []);
  const acceptedSource = Array.isArray(annotation.accepted_boxes)
    ? annotation.accepted_boxes
    : (annotation.detector_suggestions || []);
  const modelBoxes = structuredClone(acceptedSource.filter(
    (box) => !manualBoxes.some((manual) => detectorReviewBoxesMatch(box, manual)),
  ));
  const removedBoxes = structuredClone(annotation.removed_boxes || []);
  const history = [];
  let draftStart = null;
  let draftBox = null;
  let reviewZoom = 1;
  let reviewPanX = 0;
  let reviewPanY = 0;
  let reviewPanGesture = null;
  let reviewResizeObserver = null;
  const reviewPointers = new Map();

  modal.className = "detectorReviewEditorOverlay";
  windowElement.className = "detectorReviewEditorWindow";
  header.className = "detectorReviewEditorHeader";
  title.textContent = "Review boxes";
  closeButton.type = "button";
  closeButton.className = "ghostButton";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "Close review");
  closeButton.title = "Close review";
  canvasWrap.className = "detectorReviewEditorCanvasWrap";
  canvas.className = "detectorReviewEditorCanvas";
  toolbar.className = "detectorReviewEditorToolbar";
  hint.innerHTML = "<span><strong>Mark every game</strong> · drag to add · tap to toggle · pinch to zoom · two-finger scroll to pan</span>";
  hintDismissButton.type = "button";
  hintDismissButton.textContent = "×";
  hintDismissButton.setAttribute("aria-label", "Dismiss review instructions");
  hintDismissButton.title = "Dismiss instructions";
  hint.append(hintDismissButton);
  suggestButton.type = "button";
  fitReviewButton.type = "button";
  undoButton.type = "button";
  approveButton.type = "button";
  suggestButton.textContent = "Auto boxes";
  fitReviewButton.textContent = "Fit";
  fitReviewButton.title = "Fit the full image";
  undoButton.textContent = "Undo";
  approveButton.textContent = "Approve";
  undoButton.disabled = true;
  editorStatus.className = "detectorReviewEditorStatus";
  toolbar.append(
    suggestButton,
    fitReviewButton,
    undoButton,
    approveButton,
    editorStatus,
  );
  header.append(title, closeButton);
  canvasWrap.append(canvas, hint);
  windowElement.append(header, canvasWrap, toolbar);
  modal.append(windowElement);
  document.body.append(modal);

  const applyReviewView = () => {
    canvas.style.setProperty("--review-zoom", String(reviewZoom));
    canvas.style.setProperty("--review-pan-x", `${reviewPanX}px`);
    canvas.style.setProperty("--review-pan-y", `${reviewPanY}px`);
  };
  const fitReviewCanvasSize = () => {
    if (!image.naturalWidth || !image.naturalHeight) {
      return;
    }
    const availableWidth = canvasWrap.clientWidth;
    const availableHeight = canvasWrap.clientHeight;
    if (!availableWidth || !availableHeight) {
      return;
    }
    const scale = Math.min(
      availableWidth / image.naturalWidth,
      availableHeight / image.naturalHeight,
    );
    canvas.style.width = `${Math.max(1, image.naturalWidth * scale)}px`;
    canvas.style.height = `${Math.max(1, image.naturalHeight * scale)}px`;
  };
  const changeReviewZoom = (factor) => {
    reviewZoom = Math.max(0.5, Math.min(8, reviewZoom * factor));
    if (reviewZoom <= 1) {
      reviewPanX = 0;
      reviewPanY = 0;
    }
    applyReviewView();
    editorStatus.textContent = `Zoom ${Math.round(reviewZoom * 100)}%.`;
  };
  const fitReviewImage = () => {
    fitReviewCanvasSize();
    reviewZoom = 1;
    reviewPanX = 0;
    reviewPanY = 0;
    applyReviewView();
    editorStatus.textContent = "Full image fitted.";
  };
  const close = () => {
    reviewResizeObserver?.disconnect();
    URL.revokeObjectURL(image.src);
    modal.remove();
  };
  const snapshot = () => {
    history.push({
      model: structuredClone(modelBoxes),
      manual: structuredClone(manualBoxes),
      removed: structuredClone(removedBoxes),
    });
    undoButton.disabled = false;
  };
  const drawBox = (box, color, lineWidth) => {
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.strokeRect(
      box.x * canvas.width,
      box.y * canvas.height,
      box.width * canvas.width,
      box.height * canvas.height,
    );
  };
  const redraw = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const lineWidth = Math.max(3, Math.round(Math.min(canvas.width, canvas.height) / 180));
    modelBoxes.forEach((box) => drawBox(
      box,
      box.source === "dino" ? "#d946ef" : "#32d583",
      lineWidth,
    ));
    removedBoxes.forEach((box) => drawBox(box, "#ff3b30", lineWidth));
    manualBoxes.forEach((box) => drawBox(box, "#ffd60a", lineWidth));
    if (draftBox) {
      drawBox(draftBox, "#ffd60a", lineWidth);
    }
  };
  const pointFromEvent = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  };
  const containsPoint = (box, point) => (
    point.x >= box.x && point.x <= box.x + box.width
    && point.y >= box.y && point.y <= box.y + box.height
  );
  const toggleAtPoint = (point) => {
    let index = manualBoxes.findLastIndex((box) => containsPoint(box, point));
    if (index >= 0) {
      snapshot();
      manualBoxes.splice(index, 1);
      return true;
    }
    index = modelBoxes.findLastIndex((box) => containsPoint(box, point));
    if (index >= 0) {
      snapshot();
      removedBoxes.push(modelBoxes.splice(index, 1)[0]);
      return true;
    }
    index = removedBoxes.findLastIndex((box) => containsPoint(box, point));
    if (index >= 0) {
      snapshot();
      modelBoxes.push(removedBoxes.splice(index, 1)[0]);
      return true;
    }
    return false;
  };

  closeButton.addEventListener("click", close);
  hintDismissButton.addEventListener("click", () => {
    hint.remove();
  });
  fitReviewButton.addEventListener("click", fitReviewImage);
  canvasWrap.addEventListener("wheel", (event) => {
    if (event.ctrlKey) {
      changeReviewZoom(event.deltaY < 0 ? 1.15 : 1 / 1.15);
      event.preventDefault();
      return;
    }
    if (reviewZoom > 1) {
      reviewPanX -= event.deltaX || (event.shiftKey ? event.deltaY : 0);
      reviewPanY -= event.shiftKey ? 0 : event.deltaY;
      applyReviewView();
      editorStatus.textContent = `Zoom ${Math.round(reviewZoom * 100)}%.`;
    }
    event.preventDefault();
  }, { passive: false });
  suggestButton.addEventListener("click", async () => {
    suggestButton.disabled = true;
    editorStatus.textContent = "Looking for missed boxes...";
    const formData = new FormData();
    formData.append("annotation_id", annotation.annotation_id);
    formData.append("existing_boxes", JSON.stringify([...modelBoxes, ...manualBoxes]));
    try {
      const response = await fetch(
        apiUrl("/contributor/detector-dino-suggestions", contributorApiBase),
        {
          method: "POST",
          headers: { [CONTRIBUTOR_PASSWORD_HEADER]: contributorPassword },
          body: formData,
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.detail || "Could not generate suggestions.");
      }
      const suggestions = Array.isArray(result.suggestions) ? result.suggestions : [];
      if (suggestions.length) {
        snapshot();
        modelBoxes.push(...suggestions);
        redraw();
      }
      editorStatus.textContent = suggestions.length
        ? `${suggestions.length} possible missed ${suggestions.length === 1 ? "box" : "boxes"} added.`
        : "No additional boxes found.";
    } catch (error) {
      editorStatus.textContent = error.message || "Could not generate suggestions.";
    } finally {
      suggestButton.disabled = false;
    }
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
  undoButton.addEventListener("click", () => {
    const previous = history.pop();
    if (!previous) return;
    modelBoxes.splice(0, modelBoxes.length, ...previous.model);
    manualBoxes.splice(0, manualBoxes.length, ...previous.manual);
    removedBoxes.splice(0, removedBoxes.length, ...previous.removed);
    undoButton.disabled = history.length === 0;
    redraw();
  });
  const touchGeometry = () => {
    const points = Array.from(reviewPointers.values()).slice(0, 2);
    if (points.length < 2) return null;
    return {
      centerX: (points[0].x + points[1].x) / 2,
      centerY: (points[0].y + points[1].y) / 2,
      distance: Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y),
    };
  };
  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") {
      reviewPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      canvas.setPointerCapture?.(event.pointerId);
      if (reviewPointers.size >= 2) {
        const geometry = touchGeometry();
        draftStart = null;
        draftBox = null;
        reviewPanGesture = geometry && {
          touch: true,
          centerX: geometry.centerX,
          centerY: geometry.centerY,
          distance: geometry.distance,
          zoom: reviewZoom,
          panX: reviewPanX,
          panY: reviewPanY,
        };
        redraw();
        event.preventDefault();
        return;
      }
    }
    if (event.button === 1 || event.shiftKey) {
      reviewPanGesture = {
        touch: false,
        pointerId: event.pointerId,
        centerX: event.clientX,
        centerY: event.clientY,
        panX: reviewPanX,
        panY: reviewPanY,
      };
      canvas.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      return;
    }
    draftStart = pointFromEvent(event);
    draftBox = null;
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" && reviewPointers.has(event.pointerId)) {
      reviewPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (reviewPanGesture?.touch && reviewPointers.size >= 2) {
      const geometry = touchGeometry();
      if (!geometry) return;
      reviewZoom = Math.max(
        0.5,
        Math.min(8, reviewPanGesture.zoom * geometry.distance / reviewPanGesture.distance),
      );
      reviewPanX = reviewPanGesture.panX + geometry.centerX - reviewPanGesture.centerX;
      reviewPanY = reviewPanGesture.panY + geometry.centerY - reviewPanGesture.centerY;
      applyReviewView();
      event.preventDefault();
      return;
    }
    if (reviewPanGesture && !reviewPanGesture.touch
      && reviewPanGesture.pointerId === event.pointerId) {
      reviewPanX = reviewPanGesture.panX + event.clientX - reviewPanGesture.centerX;
      reviewPanY = reviewPanGesture.panY + event.clientY - reviewPanGesture.centerY;
      applyReviewView();
      event.preventDefault();
      return;
    }
    if (!draftStart) return;
    const point = pointFromEvent(event);
    draftBox = {
      x: Math.min(draftStart.x, point.x),
      y: Math.min(draftStart.y, point.y),
      width: Math.abs(point.x - draftStart.x),
      height: Math.abs(point.y - draftStart.y),
    };
    redraw();
  });
  canvas.addEventListener("pointerup", (event) => {
    if (event.pointerType === "touch") {
      reviewPointers.delete(event.pointerId);
    }
    if (reviewPanGesture) {
      if (!reviewPanGesture.touch || reviewPointers.size < 2) {
        reviewPanGesture = null;
      }
      canvas.releasePointerCapture?.(event.pointerId);
      event.preventDefault();
      return;
    }
    if (!draftStart) return;
    const point = pointFromEvent(event);
    const candidate = draftBox;
    draftStart = null;
    draftBox = null;
    if (candidate && candidate.width >= 0.015 && candidate.height >= 0.015) {
      snapshot();
      manualBoxes.push({ ...candidate, source: "manual", class_id: 0 });
    } else {
      toggleAtPoint(point);
    }
    redraw();
  });
  canvas.addEventListener("pointercancel", (event) => {
    reviewPointers.delete(event.pointerId);
    reviewPanGesture = null;
    draftStart = null;
    draftBox = null;
    redraw();
  });
  approveButton.addEventListener("click", async () => {
    approveButton.disabled = true;
    editorStatus.textContent = "Saving corrections...";
    const acceptedBoxes = [...modelBoxes, ...manualBoxes];
    await reviewDetectorAnnotation(annotation, "approve", card, cardStatus, {
      acceptedBoxes,
      manualBoxes,
      removedBoxes,
    });
    if (!card.isConnected) {
      close();
    } else {
      approveButton.disabled = false;
      editorStatus.textContent = cardStatus.textContent;
    }
  });

  try {
    const response = await fetch(originalImageUrl.toString(), {
      cache: "no-store",
      headers: { [CONTRIBUTOR_PASSWORD_HEADER]: contributorPassword },
    });
    if (!response.ok) throw new Error("Review image could not be loaded.");
    image.src = URL.createObjectURL(await response.blob());
    await image.decode();
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    fitReviewCanvasSize();
    if (typeof ResizeObserver === "function") {
      reviewResizeObserver = new ResizeObserver(() => {
        fitReviewCanvasSize();
        applyReviewView();
      });
      reviewResizeObserver.observe(canvasWrap);
    }
    redraw();
  } catch (error) {
    editorStatus.textContent = error.message || "Review image could not be loaded.";
    approveButton.disabled = true;
  }
}

function renderDetectorTrainingStatus(training) {
  const job = training.job || { status: "idle" };
  const running = ["preparing", "evaluating_baseline", "training", "evaluating", "exporting"]
    .includes(job.status);
  startDetectorTrainingButton.disabled = !training.ready || running;
  startDetectorTrainingButton.hidden = !training.ready && !running;
  detectorTrainingStatus.hidden = false;
  if (running) {
    detectorTrainingStatus.textContent = "Model training is in progress.";
  } else if (job.status === "completed") {
    detectorTrainingStatus.textContent = job.candidate_improved
      ? "A trained model is ready for review."
      : "Model training finished.";
  } else if (job.status === "failed") {
    detectorTrainingStatus.textContent = "Model training could not be completed.";
  } else if (!training.ready) {
    detectorTrainingStatus.textContent = "";
    detectorTrainingStatus.hidden = true;
  } else {
    detectorTrainingStatus.textContent = "";
    detectorTrainingStatus.hidden = true;
  }
}

async function startDetectorTraining() {
  startDetectorTrainingButton.disabled = true;
  detectorTrainingStatus.textContent = "Preparing candidate training...";
  try {
    const response = await fetch(apiUrl("/contributor/start-detector-training", contributorApiBase), {
      method: "POST",
      headers: { [CONTRIBUTOR_PASSWORD_HEADER]: contributorPassword },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(result.detail || `Could not start training: ${response.status}`);
    }
    detectorTrainingStatus.textContent = "Candidate training started. Refresh to check progress.";
  } catch (error) {
    console.error(error);
    detectorTrainingStatus.hidden = false;
    detectorTrainingStatus.textContent = "Model training could not be started.";
  } finally {
    loadDetectorReview({ force: true });
  }
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
  const dismissButton = document.createElement("button");
  const image = document.createElement("img");
  const body = document.createElement("div");
  const title = document.createElement("strong");
  const meta = document.createElement("div");
  const quality = document.createElement("div");
  const feedback = document.createElement("div");
  const actions = document.createElement("div");
  const confirmButton = document.createElement("button");
  const denyButton = document.createElement("button");
  const undoButton = document.createElement("button");
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
  undoButton.className = "contributorReviewUndo";
  dismissButton.className = "contributorReviewDismiss";

  image.alt = reference.name;
  image.loading = "lazy";
  image.decoding = "async";
  title.textContent = reference.name;
  meta.textContent = `BGG ${reference.id} · ${formatReferenceDate(reference.created_at)}`;
  if (reference.flagged_for_review) {
    meta.textContent += ` · Re-review after ${reference.previous_admin_action || "admin decision"}`;
  }
  quality.textContent = formatReferenceQuality(reference);
  feedback.textContent = formatReferenceFeedback(reference.feedback);
  confirmButton.type = "button";
  denyButton.type = "button";
  undoButton.type = "button";
  dismissButton.type = "button";
  confirmButton.textContent = "Looks right";
  denyButton.textContent = "Wrong label";
  undoButton.textContent = "Undo";
  undoButton.hidden = true;
  dismissButton.textContent = "X";
  dismissButton.setAttribute("aria-label", `Close ${reference.name} review card`);
  bggLink.href = reference.bgg_url || `https://boardgamegeek.com/boardgame/${reference.id}`;
  bggLink.target = "_blank";
  bggLink.rel = "noreferrer";
  bggLink.textContent = "BGG";
  status.textContent = reference.review_reason || "Waiting for review";

  loadContributorReferenceImage(reference, image);
  enableCropHoverPreview(image);
  image.addEventListener("click", () => openCropViewer(image, reference.name));
  confirmButton.addEventListener("click", () => submitContributorReferenceReview(reference, "confirm", {
    card,
    confirmButton,
    denyButton,
    feedback,
    status,
    undoButton,
  }));
  denyButton.addEventListener("click", () => submitContributorReferenceReview(reference, "deny", {
    card,
    confirmButton,
    denyButton,
    feedback,
    status,
    undoButton,
  }));
  undoButton.addEventListener("click", () => undoContributorReferenceReview(reference, {
    card,
    confirmButton,
    denyButton,
    feedback,
    status,
    undoButton,
  }));
  dismissButton.addEventListener("click", () => dismissContributorReviewCard(card));

  actions.append(confirmButton, denyButton, undoButton, bggLink);
  body.append(title, meta, quality, feedback, actions, status);
  card.append(dismissButton, image, body);

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
  const { card, confirmButton, denyButton, feedback, status, undoButton } = controls;

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
    setStatus(`${reference.name} review saved.`);
    dismissContributorReviewCard(card);
  } catch (error) {
    console.error(error);
    status.textContent = error.message || "Could not save review.";
    confirmButton.disabled = false;
    denyButton.disabled = false;
  }
}

async function undoContributorReferenceReview(reference, controls) {
  const { card, confirmButton, denyButton, feedback, status, undoButton } = controls;
  const priorAction = reference.lastReviewAction;

  if (!priorAction) {
    return;
  }

  undoButton.disabled = true;
  status.textContent = "Undoing...";

  try {
    const formData = new FormData();
    formData.append("action", "undo");
    formData.append("undo_action", priorAction);
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
      throw new Error(result.detail || `Undo failed: ${response.status}`);
    }

    reference.feedback = result.feedback || reference.feedback || {};
    reference.lastReviewAction = "";
    feedback.textContent = formatReferenceFeedback(reference.feedback);
    card.classList.remove("reviewConfirmed", "reviewDenied");
    confirmButton.hidden = false;
    denyButton.hidden = false;
    confirmButton.disabled = false;
    denyButton.disabled = false;
    undoButton.hidden = true;
    status.textContent = "Review undone";
    setStatus(`${reference.name} review undone.`);
  } catch (error) {
    console.error(error);
    status.textContent = error.message || "Could not undo review.";
    undoButton.disabled = false;
  }
}

function dismissContributorReviewCard(card) {
  if (card.classList.contains("isDismissing")) {
    return;
  }

  hideCropZoomPreview();
  card.classList.add("isDismissing");
  window.setTimeout(() => {
    card.remove();
    updateContributorReviewCountAfterRemoval();
  }, 190);
}

function updateContributorReviewCountAfterRemoval() {
  const remaining = contributorReviewGrid.querySelectorAll(".contributorReviewCard:not(.isDismissing)").length;
  const totalMatch = contributorReviewCount.textContent.match(/\/(\d+)/);

  if (remaining) {
    contributorReviewCount.textContent = totalMatch ? `${remaining}/${totalMatch[1]}` : String(remaining);
    contributorReviewStatus.textContent = "Review recent contributor references.";
    return;
  }

  contributorReviewCount.textContent = "";
  contributorReviewStatus.textContent = "All visible references reviewed.";
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
    const feedbackEventId = createDetectorAnnotationId();
    if (action === "deny") {
      card.denialFeedbackEventId = feedbackEventId;
      card.deniedMatch = { ...best };
    }
    await sendRecognitionFeedback(card, action, best, {
      confident: card.isConfident,
      contributor: contributorMode,
      feedbackEventId,
    });
    card.feedbackSent = true;
    updateFeedbackActions(card);
    card.card.classList.toggle("feedbackConfirmed", action === "confirm");
    card.card.classList.toggle("feedbackDenied", action === "deny");

    if (action === "confirm") {
      await card.confirmMatch();
      refreshResultCards();
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

    await showCorrectionCoverConfirmation(card, game);
  } catch (error) {
    console.error(error);
    correctionStatus.textContent = error.message || "Could not load that game's cover.";
    correctionSaveButton.disabled = false;
    correctionCancelButton.disabled = false;
  }
}

async function showCorrectionCoverConfirmation(card, game) {
  const {
    correctionLabel,
    correctionSuggestions,
    correctionCoverPanel,
    correctionCoverImage,
    correctionCoverName,
    correctionCoverQuestion,
    correctionCoverConfirmButton,
    correctionActions,
    correctionSaveButton,
    correctionCancelButton,
    correctionStatus,
  } = card.feedbackControls;
  correctionSaveButton.disabled = true;
  correctionCancelButton.disabled = true;
  correctionStatus.textContent = "Loading official cover...";
  let preview = {
    ...game,
    thumbnail_url: game.thumbnail_url || "",
    image_url: game.image_url || "",
  };
  if (!preview.thumbnail_url && !preview.image_url) {
    const response = await fetch(
      apiUrl(`/contributor/bgg-game-preview?game_id=${encodeURIComponent(game.id)}`, contributorApiBase),
      { headers: { [CONTRIBUTOR_PASSWORD_HEADER]: contributorPassword } },
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.detail || `Could not load BGG cover: ${response.status}`);
    }
    preview = { ...game, ...result };
  }
  card.correctionSelectedGame = preview;
  correctionCoverConfirmButton.disabled = false;
  correctionCoverImage.onerror = () => {
    if (preview.image_url && correctionCoverImage.src !== preview.image_url) {
      correctionCoverImage.src = preview.image_url;
      return;
    }
    correctionStatus.textContent = "The official cover could not be displayed. Choose another game.";
    correctionCoverConfirmButton.disabled = true;
  };
  correctionCoverImage.src = preview.thumbnail_url || preview.image_url;
  correctionCoverImage.alt = `${preview.name} cover`;
  correctionCoverName.textContent = preview.name;
  correctionCoverQuestion.textContent = "Is this the same game shown in your scan?";
  correctionLabel.hidden = true;
  correctionSuggestions.hidden = true;
  correctionCoverPanel.hidden = false;
  correctionActions.hidden = true;
  correctionCancelButton.disabled = false;
  correctionStatus.textContent = "Confirm the cover before submitting.";
}

async function saveConfirmedCorrectedReference(card) {
  const {
    correctionCoverConfirmButton,
    correctionCoverBackButton,
    correctionActions,
    correctionStatus,
    feedbackStatus,
  } = card.feedbackControls;
  const game = card.correctionSelectedGame;
  if (!game) {
    return;
  }
  correctionCoverConfirmButton.disabled = true;
  correctionCoverBackButton.disabled = true;
  correctionStatus.textContent = "Saving correct reference...";
  try {
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
      {
        confident: true,
        contributor: true,
        feedbackEventId: createDetectorAnnotationId(),
        correctionOfEventId: card.denialFeedbackEventId || "",
        originalMatch: card.deniedMatch || card.matches[0] || null,
      }
    );

    card.feedbackSent = true;
    card.card.classList.add("feedbackConfirmed");
    card.card.classList.remove("feedbackDenied");
    card.setCorrectedGame(game);
    await card.resolveDetails({ force: true });
    refreshResultCards();
    hideCorrectionPrompt(card, { clear: false });
    feedbackStatus.textContent = "Corrected";
    setStatus(`${game.name} saved as the correct reference.`);
  } catch (error) {
    console.error(error);
    correctionStatus.textContent = error.message || "Could not save correct game.";
    correctionCoverConfirmButton.disabled = false;
    correctionCoverBackButton.disabled = false;
  }
}

function resetCorrectionCoverConfirmation(card, { focus = false } = {}) {
  const {
    correctionLabel,
    correctionSuggestions,
    correctionCoverPanel,
    correctionCoverImage,
    correctionCoverConfirmButton,
    correctionCoverBackButton,
    correctionActions,
    correctionSaveButton,
    correctionCancelButton,
  } = card.feedbackControls;
  card.correctionSelectedGame = null;
  correctionCoverImage.removeAttribute("src");
  correctionCoverImage.onerror = null;
  correctionCoverPanel.hidden = true;
  correctionLabel.hidden = false;
  correctionSuggestions.hidden = false;
  correctionActions.hidden = false;
  correctionSaveButton.disabled = false;
  correctionCancelButton.disabled = false;
  correctionCoverConfirmButton.disabled = false;
  correctionCoverBackButton.disabled = false;
  if (focus) {
    card.feedbackControls.correctionInput.focus();
  }
}

function handleCorrectionInputKeyDown(event, card) {
  if (event.key !== "Enter" || event.isComposing) {
    return;
  }

  event.preventDefault();
  submitCorrectedReference(event, card);
}

async function sendRecognitionFeedback(
  card,
  action,
  match,
  {
    confident = false,
    contributor = false,
    feedbackEventId = "",
    correctionOfEventId = "",
    originalMatch = null,
  } = {},
) {
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
  formData.append("feedback_event_id", feedbackEventId);
  if (correctionOfEventId) {
    formData.append("correction_of_event_id", correctionOfEventId);
  }
  if (originalMatch) {
    formData.append("original_game_id", String(originalMatch.id));
    formData.append("original_game_name", originalMatch.name || "");
    formData.append("original_score", String(cleanNumber(
      originalMatch.rank_score ?? originalMatch.score,
    )));
    formData.append("original_source", originalMatch.source || "");
  }

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
  resetCorrectionCoverConfirmation(card);
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
  resetCorrectionCoverConfirmation(card);
  correctionSaveButton.disabled = false;
  correctionCancelButton.disabled = false;

  if (clear) {
    correctionInput.value = "";
    correctionSuggestions.replaceChildren();
    correctionStatus.textContent = "";
  }
}

function toggleAdvancedFilters() {
  const open = advancedFilterPanel.hidden;

  advancedFilterPanel.hidden = !open;
  advancedFilterToggle.setAttribute("aria-expanded", open ? "true" : "false");
  advancedFilterToggle.classList.toggle("isOpen", open);
}

function toggleFilterPanelVisibility() {
  const open = !document.body.classList.contains("filterPanelOpen");
  document.body.classList.toggle("filterPanelOpen", open);
  filterVisibilityButton.textContent = open ? "Close filters" : "Filters";
  filterVisibilityButton.setAttribute("aria-expanded", open ? "true" : "false");
}

function handleFilterChange() {
  updateFilterSummary();

  for (const card of currentResultCards) {
    card.applyFilters();
  }

  refreshResultCards();
}

function refreshResultCards() {
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

  if (filters.minRating) {
    parts.push(`${filters.minRating}+ rating`);
  }

  if (filters.maxRank) {
    parts.push(`top ${filters.maxRank}`);
  }

  if (filters.gameType) {
    parts.push(formatGameTypeTag(filters.gameType));
  }

  if (filters.expansionMode === "base") {
    parts.push("base games");
  } else if (filters.expansionMode === "expansion") {
    parts.push("expansions");
  }

  if (filters.minYear) {
    parts.push(`since ${filters.minYear}`);
  }

  filterSummary.textContent = parts.length ? parts.join(" · ") : "Any game";
}

function getFilters() {
  const players = cleanNumber(playersFilter.value);
  const maxTime = cleanNumber(timeFilter.value);
  const maxWeight = cleanNumber(complexityFilter.value) || 5;
  const complexityLabel = complexityFilter.selectedOptions[0]?.textContent || "Any";
  const minRating = cleanNumber(minRatingFilter.value);
  const maxRank = cleanNumber(maxRankFilter.value);
  const gameType = gameTypeFilter.value;
  const expansionMode = expansionFilter.value;
  const minYear = cleanNumber(minYearFilter.value);
  const hasAdvanced = Boolean(minRating || maxRank || gameType || expansionMode || minYear);

  return {
    players,
    maxTime,
    maxWeight,
    complexityLabel,
    minRating,
    maxRank,
    gameType,
    expansionMode,
    minYear,
    hasAdvanced,
    hasAny: Boolean(players || maxTime || maxWeight < 5 || hasAdvanced),
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
    if (result.conditionalFits?.length) {
      const expansion = result.conditionalFits[0];
      const expansionName = formatExpansionShortName(expansion, card.details);

      return {
        fits: true,
        rank: "2",
        className: "conditional",
        text: `Fits with ${expansionName}`,
        title: `Matches the filters if ${expansion.name} is included.`,
      };
    }

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
  const conditionalFits = [];

  if (filters.players) {
    const playerResult = checkPlayerCount(details, filters.players);

    if (!playerResult.fits) {
      const expansionResult = checkPlayerExpansionCount(details, filters.players);

      if (expansionResult.fits) {
        conditionalFits.push(expansionResult.expansion);
      } else {
        reasons.push(playerResult.reason);
      }
    }
  }

  if (filters.maxTime) {
    const timeResult = checkMaxTime(details, filters.maxTime);

    if (!timeResult.fits) {
      reasons.push(timeResult.reason);
    }
  }

  if (filters.maxWeight < 5) {
    const complexityResult = checkComplexity(details, filters.maxWeight, filters.complexityLabel);

    if (!complexityResult.fits) {
      reasons.push(complexityResult.reason);
    }
  }

  if (filters.minRating) {
    const ratingResult = checkMinRating(details, filters.minRating);

    if (!ratingResult.fits) {
      reasons.push(ratingResult.reason);
    }
  }

  if (filters.maxRank) {
    const rankResult = checkMaxRank(details, filters.maxRank);

    if (!rankResult.fits) {
      reasons.push(rankResult.reason);
    }
  }

  if (filters.gameType) {
    const typeResult = checkGameType(details, filters.gameType);

    if (!typeResult.fits) {
      reasons.push(typeResult.reason);
    }
  }

  if (filters.expansionMode) {
    const expansionResult = checkExpansionMode(details, filters.expansionMode);

    if (!expansionResult.fits) {
      reasons.push(expansionResult.reason);
    }
  }

  if (filters.minYear) {
    const yearResult = checkMinYear(details, filters.minYear);

    if (!yearResult.fits) {
      reasons.push(yearResult.reason);
    }
  }

  return {
    fits: reasons.length === 0,
    conditionalFits: reasons.length === 0 ? conditionalFits : [],
    reasons,
  };
}

function checkPlayerCount(details, players) {
  const minPlayers = cleanNumber(details.min_players);
  const maxPlayers = cleanNumber(details.max_players);

  if (!minPlayers && !maxPlayers) {
    return { fits: false, reason: "No player data" };
  }

  const fits = players >= (minPlayers || maxPlayers) && players <= (maxPlayers || minPlayers);

  return {
    fits,
    reason: fits ? "" : `Not ${players} players`,
  };
}

function checkPlayerExpansionCount(details, players) {
  const expansions = playerExpansionIndex.get(cleanNumber(details.id)) || [];
  const expansion = expansions.find((entry) => (
    players >= entry.minPlayers && players <= entry.maxPlayers
  ));

  return {
    fits: Boolean(expansion),
    expansion,
  };
}

function formatExpansionShortName(expansion, details) {
  const fullName = expansion?.name || "player-count expansion";
  const baseName = String(details?.name || "").trim();

  if (!baseName) {
    return fullName;
  }

  if (fullName.toLowerCase().startsWith(baseName.toLowerCase())) {
    return fullName.slice(baseName.length).replace(/^[\s:-]+/, "").trim() || fullName;
  }

  return fullName;
}

function checkMaxTime(details, maxTime) {
  const duration = cleanNumber(details.max_playtime || details.playing_time);

  if (!duration) {
    return { fits: false, reason: "No time data" };
  }

  return {
    fits: duration <= maxTime,
    reason: duration <= maxTime ? "" : `Over ${maxTime} min`,
  };
}

function checkComplexity(details, maxWeight, complexityLabel) {
  const weight = cleanNumber(details.average_weight);

  if (!weight) {
    return { fits: false, reason: "No weight data" };
  }

  return {
    fits: weight <= maxWeight,
    reason: weight <= maxWeight ? "" : `Above ${complexityLabel.toLowerCase()}`,
  };
}

function checkMinRating(details, minRating) {
  const rating = cleanNumber(details.average_rating);

  if (!rating) {
    return { fits: false, reason: "No rating data" };
  }

  return {
    fits: rating >= minRating,
    reason: rating >= minRating ? "" : `Under ${minRating.toFixed(1)} rating`,
  };
}

function checkMaxRank(details, maxRank) {
  const rank = cleanNumber(details.rank);

  if (!rank) {
    return { fits: false, reason: "No rank data" };
  }

  return {
    fits: rank <= maxRank,
    reason: rank <= maxRank ? "" : `Below top ${maxRank}`,
  };
}

function checkGameType(details, gameType) {
  const tags = Array.isArray(details.game_type_tags) ? details.game_type_tags : [];

  if (!tags.length) {
    return { fits: false, reason: "No type data" };
  }

  const fits = tags.includes(gameType);

  return {
    fits,
    reason: fits ? "" : `Not ${formatGameTypeTag(gameType).toLowerCase()}`,
  };
}

function checkExpansionMode(details, mode) {
  const isExpansion = details.is_expansion === true;

  if (mode === "base") {
    return {
      fits: !isExpansion,
      reason: isExpansion ? "Expansion" : "",
    };
  }

  if (mode === "expansion") {
    return {
      fits: isExpansion,
      reason: isExpansion ? "" : "Not an expansion",
    };
  }

  return { fits: true, reason: "" };
}

function checkMinYear(details, minYear) {
  const year = cleanNumber(details.year_published);

  if (!year) {
    return { fits: false, reason: "No year data" };
  }

  return {
    fits: year >= minYear,
    reason: year >= minYear ? "" : `Before ${minYear}`,
  };
}

function renderGameDetails(container, matches, { force = false, detailsRecord = null } = {}) {
  container.replaceChildren();

  if (!force && !isConfidentMatch(matches)) {
    container.textContent = "Game details hidden until the match is stronger.";
    container.classList.add("muted");
    return;
  }

  container.classList.remove("muted");

  const best = matches[0];
  const details = detailsRecord || gameDetailsById.get(Number(best.id));

  if (!details) {
    container.textContent = "No local details for this game yet.";
    container.classList.add("muted");
    return;
  }

  const rows = [
    ["Players", formatPlayers(details)],
    ["Time", formatDuration(details)],
    ["Weight", formatWeight(details.average_weight)],
    ["Rank", formatRank(details.rank)],
    ["Rating", formatRating(details.average_rating)],
    ["Type", formatGameTypeTags(details.game_type_tags)],
    ["Year", formatYear(details.year_published)],
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
  if (match?.visual_score_available === false) {
    return `Confidence ${matchSortScore(match).toFixed(SCORE_DISPLAY_DECIMALS)}`;
  }
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

function formatRank(value) {
  const rank = cleanNumber(value);

  return rank ? `#${rank}` : "";
}

function formatRating(value) {
  const rating = cleanNumber(value);

  return rating ? rating.toFixed(1) : "";
}

function formatGameTypeTags(tags) {
  if (!Array.isArray(tags) || !tags.length) {
    return "";
  }

  return tags
    .map(formatGameTypeTag)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
}

function formatGameTypeTag(tag) {
  const words = String(tag || "").replace(/_/g, " ").trim();

  if (!words) {
    return "";
  }

  return words.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function formatYear(value) {
  const year = cleanNumber(value);

  return year ? String(year) : "";
}

function cleanNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function matchSortScore(match) {
  return cleanNumber(match?.rank_score ?? match?.score);
}

function redrawActiveDetections() {
  if (!activeSourceCanvas?.lastDetections || !activeDisplayElement) {
    return;
  }

  if (
    selectedMatchCard
    && (selectedMatchCard.dismissed || !currentResultCards.includes(selectedMatchCard))
  ) {
    clearSelectedMatchCard();
  }

  let detections = selectedBoxEdit
    ? activeSourceCanvas.lastDetections.map((detection) => (
        detection === selectedBoxEdit.original ? selectedBoxEdit.draft : detection
      ))
    : activeSourceCanvas.lastDetections;
  if (manualDraftDetection) {
    detections = [...detections, manualDraftDetection];
  }
  drawDetections(
    detections,
    activeSourceCanvas,
    activeDisplayElement,
    manualBoxMode
      ? selectedBoxEdit?.draft || null
      : selectedMatchCard?.detection || null,
    manualBoxMode ? "" : selectedMatchCard?.matches?.[0]?.name || ""
  );
  positionBoxEditActions();
}

function drawDetections(detections, sourceCanvas, displayElement, selectedDetection = null, selectedLabel = "") {
  const displayRect = boxesCanvas.getBoundingClientRect();
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

  const baseScale = Math.min(displayWidth / sourceWidth, displayHeight / sourceHeight);
  const scale = baseScale * (manualBoxMode ? modifierZoom : 1);
  const offsetX = (displayWidth - sourceWidth * scale) / 2
    + (manualBoxMode ? modifierPanX : 0);
  const offsetY = (displayHeight - sourceHeight * scale) / 2
    + (manualBoxMode ? modifierPanY : 0);
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
    const selected = detection === selectedDetection;
    const dimUnselected = selectedDetection && !selected;
    const x = detection.x * scale + offsetX;
    const y = detection.y * scale + offsetY;
    const width = detection.width * scale;
    const height = detection.height * scale;
    const rawLabel = detection.dino
      ? `DINO ${detection.score.toFixed(2)}`
      : detection.manual
      ? "Manual"
      : selected && selectedLabel
      ? `${selectedLabel} ${detection.score.toFixed(2)}`
      : `${detection.score.toFixed(2)}`;
    const boxGradient = ctx.createLinearGradient(x, y, x + width, y + height);
    const boxLineWidth = selected ? 5 : 3;

    boxGradient.addColorStop(0, detection.dino ? "#d946ef" : boxStart);
    boxGradient.addColorStop(1, detection.dino ? "#f0abfc" : boxEnd);

    ctx.save();
    ctx.globalAlpha = dimUnselected ? 0.35 : 1;

    if (selected) {
      ctx.fillStyle = resolvedTheme === "light"
        ? "rgba(62, 99, 255, 0.13)"
        : "rgba(113, 139, 255, 0.16)";
      ctx.fillRect(x, y, width, height);
      ctx.shadowColor = boxEnd;
      ctx.shadowBlur = 18;
    }

    ctx.strokeStyle = boxGradient;
    ctx.lineWidth = boxLineWidth;
    ctx.strokeRect(x, y, width, height);
    ctx.shadowBlur = 0;

    const labelPaddingX = 7;
    const labelHeight = 22;
    const label = fitOverlayLabel(ctx, rawLabel, Math.max(24, displayWidth - labelPaddingX * 2));
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
    ctx.lineWidth = boxLineWidth;
    ctx.fillStyle = labelText;
    ctx.fillText(label, labelX + labelPaddingX, labelY + labelHeight / 2);

    if (manualBoxMode && selected) {
      const handleRadius = Math.max(7, Math.min(11, 9 / Math.sqrt(modifierZoom)));
      const handles = [
        [x, y], [x + width / 2, y], [x + width, y],
        [x + width, y + height / 2], [x + width, y + height],
        [x + width / 2, y + height], [x, y + height], [x, y + height / 2],
      ];
      ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
      ctx.shadowBlur = 5;
      for (const [handleX, handleY] of handles) {
        ctx.beginPath();
        ctx.arc(handleX, handleY, handleRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#5d7cff";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function fitOverlayLabel(ctx, label, maxWidth) {
  if (ctx.measureText(label).width <= maxWidth) {
    return label;
  }

  const ellipsis = "...";
  let fitted = label;

  while (fitted.length > 4 && ctx.measureText(`${fitted}${ellipsis}`).width > maxWidth) {
    fitted = fitted.slice(0, -1);
  }

  return `${fitted.trim()}${ellipsis}`;
}

function cssValue(styles, name, fallback) {
  return styles.getPropertyValue(name).trim() || fallback;
}

function showResultShell(count) {
  resultsPanel.hidden = false;
  showMatchesButton.hidden = true;
  resultCount.textContent = `${count}`;
  setResultsNotice("");
}

function hideResultsPanel() {
  if (!currentResultCards.length) {
    return;
  }

  resultsPanel.hidden = true;
  showMatchesButton.hidden = false;
}

function showResultsPanel() {
  if (!currentResultCards.length) {
    return;
  }

  resultsPanel.hidden = false;
  showMatchesButton.hidden = true;
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
  clearSelectedMatchCard();
  manualBoxMode = false;
  manualBoxGesture = null;
  manualDraftDetection = null;
  selectedBoxEdit = null;
  boxEditActions.hidden = true;
  resetModifierTouchGesture();
  modifierZoom = 1;
  modifierPanX = 0;
  modifierPanY = 0;
  document.body.classList.remove("manualBoxMode");
  applyModifierZoom();
  currentResultCards = [];
  resultsGrid.replaceChildren();
  resultsPanel.hidden = true;
  showMatchesButton.hidden = true;
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
  const imagePreviewActive = activeDisplayElement === photoPreview && !photoPreview.hidden;
  const canDrawMissedBox = Boolean(activeSourceCanvas && (frozenFrame || imagePreviewActive));
  const imageModeActive = liveCamera || frozenFrame || imagePreviewActive;

  document.body.classList.toggle("cameraLive", liveCamera);
  document.body.classList.toggle("cameraFrozen", frozenFrame);
  document.body.classList.toggle("imagePreview", imagePreviewActive);
  if (imageModeActive && !filterImageModeActive) {
    document.body.classList.remove("filterPanelOpen");
    filterVisibilityButton.textContent = "Filters";
    filterVisibilityButton.setAttribute("aria-expanded", "false");
  } else if (!imageModeActive) {
    document.body.classList.remove("filterPanelOpen");
  }
  filterImageModeActive = imageModeActive;
  filterVisibilityButton.hidden = !imageModeActive || manualBoxMode;

  startCameraButton.hidden = cameraReady || imagePreviewActive;
  uploadButton.hidden = false;
  examplePanel.hidden = cameraReady || imagePreviewActive;
  scanButton.hidden = !cameraReady || frozenFrame;
  backToCameraButton.hidden = !frozenFrame;
  closeScanButton.hidden = cameraReady || !imagePreviewActive;
  modifyBoxesButton.hidden = !canDrawMissedBox || manualBoxMode;
  finishModifyingButton.hidden = !manualBoxMode;
  exitModifierButton.hidden = !manualBoxMode;
  zoomOutButton.hidden = !manualBoxMode;
  zoomInButton.hidden = !manualBoxMode;
  dinoSuggestButton.hidden = (
    !manualBoxMode
    || Boolean(activeSourceCanvas?.dinoSuggestionCompleted)
    || Boolean(activeSourceCanvas?.dinoSuggestionDismissed)
  );
  dismissDinoSuggestButton.hidden = dinoSuggestButton.hidden;
  switchCameraButton.hidden = !cameraReady || frozenFrame;

  startCameraButton.disabled = !enabled || cameraReady || imagePreviewActive;
  uploadButton.disabled = !enabled;
  imageUpload.disabled = !enabled;
  for (const button of exampleButtons) {
    button.disabled = !enabled || cameraReady || imagePreviewActive;
  }
  scanButton.disabled = !enabled || !cameraReady || frozenFrame;
  backToCameraButton.disabled = !enabled || !frozenFrame;
  closeScanButton.disabled = !enabled || cameraReady || !imagePreviewActive;
  modifyBoxesButton.disabled = !enabled || !canDrawMissedBox;
  finishModifyingButton.disabled = !enabled || !manualBoxMode;
  exitModifierButton.disabled = !enabled || !manualBoxMode;
  zoomOutButton.disabled = !enabled || !manualBoxMode || modifierZoom <= 0.5;
  zoomInButton.disabled = !enabled || !manualBoxMode || modifierZoom >= 3;
  dinoSuggestButton.disabled = (
    !enabled
    || !manualBoxMode
    || Boolean(activeSourceCanvas?.dinoSuggestionCompleted)
  );
  switchCameraButton.disabled = !enabled || !cameraReady || frozenFrame;
  playersFilter.disabled = !enabled;
  timeFilter.disabled = !enabled;
  complexityFilter.disabled = !enabled;
  advancedFilterToggle.disabled = !enabled;
  minRatingFilter.disabled = !enabled;
  maxRankFilter.disabled = !enabled;
  gameTypeFilter.disabled = !enabled;
  expansionFilter.disabled = !enabled;
  minYearFilter.disabled = !enabled;
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

async function drawImageUrlToCanvas(src, canvas) {
  const image = new Image();
  const loadPromise = image.decode ? null : waitForImageLoad(image);

  image.decoding = "async";
  image.src = src;

  if (image.decode) {
    await image.decode();
  } else {
    await loadPromise;
  }

  drawImageSourceToCanvas(image, canvas);
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
