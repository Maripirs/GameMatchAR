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
// The distinct categories and mechanics with per-value game counts. It exists so
// the theme and mechanic pickers can be built without scanning 5 008 records,
// and so "what can I filter by?" has an answer before any game data loads.
const FILTER_VOCABULARY_URL = "./data/filter_vocabulary.json";
const GAME_SEARCH_INDEX_URL = "./data/games_index.json";
const GAME_ALIASES_URL = "./data/game_aliases.json";
const CATALOG_DETAILS_PATH = "/catalog/details";
const CATALOG_PLAYER_EXPANSIONS_PATH = "/catalog/player-expansions";
const CATALOG_SEARCH_INDEX_PATH = "/catalog/search-index";
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
const bestPlayerCountFilter = document.getElementById("bestPlayerCountFilter");
const bestPlayerCountField = document.getElementById("bestPlayerCountField");
const timeFilter = document.getElementById("timeFilter");
const complexityFilter = document.getElementById("complexityFilter");
const backButton = document.getElementById("backButton");
const missingBoxesButton = document.getElementById("missingBoxesButton");
const filterVisibilityButton = document.getElementById("filterVisibilityButton");
const applyFiltersButton = document.getElementById("applyFiltersButton");
const advancedFilterToggle = document.getElementById("advancedFilterToggle");
const advancedFilterPanel = document.getElementById("advancedFilterPanel");
const minRatingFilter = document.getElementById("minRatingFilter");
const maxRankFilter = document.getElementById("maxRankFilter");
const gameTypeFilter = document.getElementById("gameTypeFilter");
const youngestAgeFilter = document.getElementById("youngestAgeFilter");
const timeRangeMin = document.getElementById("timeRangeMin");
const timeRangeMax = document.getElementById("timeRangeMax");
const timeRangeLabel = document.getElementById("timeRangeLabel");
const weightRangeMin = document.getElementById("weightRangeMin");
const weightRangeMax = document.getElementById("weightRangeMax");
const weightRangeLabel = document.getElementById("weightRangeLabel");
const categoryFilterButton = document.getElementById("categoryFilterButton");
const mechanicFilterButton = document.getElementById("mechanicFilterButton");
const filterPickerOverlay = document.getElementById("filterPickerOverlay");
const filterPickerTitle = document.getElementById("filterPickerTitle");
const filterPickerSearch = document.getElementById("filterPickerSearch");
const filterPickerChips = document.getElementById("filterPickerChips");
const filterPickerList = document.getElementById("filterPickerList");
const filterPickerSummary = document.getElementById("filterPickerSummary");
const filterPickerClearButton = document.getElementById("filterPickerClearButton");
const filterPickerCloseButton = document.getElementById("filterPickerCloseButton");
const filterPickerDoneButton = document.getElementById("filterPickerDoneButton");
const resultsPanel = document.getElementById("resultsPanel");
const resultsGrid = document.getElementById("resultsGrid");
const resultCount = document.getElementById("resultCount");
const backendWarning = document.getElementById("backendWarning");
const resultsNotice = document.getElementById("resultsNotice");
const overlayHint = document.getElementById("overlayHint");
const overlayHintDismiss = document.getElementById("overlayHintDismiss");
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
// "Show in picture" points at a box with a transient pulse rather than a
// persistent highlight, so it never competes with the filter styling for the
// same visual channel -- one owns appearance, the other owns time.
const PULSE_DURATION_MS = 1500;
const PULSE_CYCLE_MS = 500;
const PULSE_MAX_SPREAD = 18;
let detectionPulse = null;
let detectionPulseFrame = 0;

// Detections the user marked as wrong. Held separately from the cards because a
// public "No" dismisses the card and drops it from currentResultCards, while
// the box itself must stay greyed out on the photo.
const rejectedDetections = new Set();
let selectedMatchCard = null;
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
// Set once the user closes the filters themselves. Until then the panel is kept
// open across mode changes so it stays discoverable; afterwards we stop
// reopening it for them. Keyed on dismissal rather than on whether any filter is
// set, because the filters now ship with defaults.
let filterPanelDismissedByUser = false;
let topBarToggleBound = false;
let filterVocabulary = { categories: [], mechanics: [] };
let filterVocabularyLoadPromise = null;
// Theme and mechanic are multi-select, unlike every other filter, so they live
// here rather than on a control's value. A game passes if it carries ANY of the
// selected values -- see checkValueList for why the AND reading is wrong.
const selectedFilterValues = { categories: new Set(), mechanics: new Set() };
let activeFilterPicker = "";
let filterPickerReturnFocus = null;

// The two multi-select filters, which share one picker. `detailField` is the
// key on a game's detail record; `singular` and `plural` are how a failing card
// is told what it missed on.
// Slider positions are indices into this, so the steps are the ones worth
// stopping on rather than every minute between 0 and 180. The last is "no
// limit", which is why it is Infinity and not a number.
const TIME_STEPS = [0, 15, 30, 45, 60, 90, 120, 180, Infinity];

// BGG weight is 1-5 continuous. The thumbs sit on band boundaries, so a range
// is always a whole number of bands and can be named rather than numbered --
// which is what makes "light or medium" sayable.
const WEIGHT_BANDS = { 1: "Light", 2: "Medium", 3: "Heavy", 4: "Very heavy" };

const RANGE_CONTROLS = {
  time: {
    get min() { return timeRangeMin; },
    get max() { return timeRangeMax; },
    get label() { return timeRangeLabel; },
    get preset() { return timeFilter; },
    floor: 0,
    ceiling: TIME_STEPS.length - 1,
    // Slider index to the value the filter compares against.
    value: (index) => TIME_STEPS[index],
    // The preset select stores minutes, so it maps back to an index.
    presetIndex: (value) => {
      const minutes = cleanNumber(value);
      const index = TIME_STEPS.indexOf(minutes);

      return minutes && index > 0 ? index : TIME_STEPS.length - 1;
    },
  },
  weight: {
    get min() { return weightRangeMin; },
    get max() { return weightRangeMax; },
    get label() { return weightRangeLabel; },
    get preset() { return complexityFilter; },
    floor: 1,
    ceiling: 5,
    value: (index) => index,
    presetIndex: (value) => cleanNumber(value) || 5,
  },
};

const FILTER_PICKERS = {
  categories: {
    detailField: "categories",
    title: "Theme",
    searchPlaceholder: "Search themes",
    allHeading: "All themes",
    singular: "theme",
    plural: "themes",
    get button() {
      return categoryFilterButton;
    },
  },
  mechanics: {
    detailField: "mechanics",
    title: "Mechanic",
    searchPlaceholder: "Search mechanics",
    allHeading: "All mechanics",
    singular: "mechanic",
    plural: "mechanics",
    get button() {
      return mechanicFilterButton;
    },
  },
};

initThemeControl();
setControlsEnabled(false);
video.hidden = true;

main();

startCameraButton.addEventListener("click", startCameraFromTap);
scanButton.addEventListener("click", scanCurrentView);
backToCameraButton.addEventListener("click", backToLiveCamera);
closeScanButton.addEventListener("click", closeActiveScan);
backButton.addEventListener("click", closeActiveScan);
missingBoxesButton.addEventListener("click", beginManualBoxMode);
overlayHintDismiss?.addEventListener("click", dismissOverlayHint);

// The long-tail advanced filters, folded away until asked for. They still
// announce themselves when set, so a filter can never be quietly narrowing the
// results from behind a collapsed section.
const advancedExtraToggle = document.getElementById("advancedExtraToggle");
const advancedExtraFilters = document.getElementById("advancedExtraFilters");

function activeExtraFilterCount() {
  if (!advancedExtraFilters) {
    return 0;
  }
  return [...advancedExtraFilters.querySelectorAll("select")]
    .filter((control) => control.value !== "").length
    + [...advancedExtraFilters.querySelectorAll("input[type=checkbox]")]
      .filter((control) => control.checked).length;
}

function refreshAdvancedExtraToggle() {
  if (!advancedExtraToggle || !advancedExtraFilters) {
    return;
  }
  const open = !advancedExtraFilters.hidden;
  const active = activeExtraFilterCount();
  advancedExtraToggle.setAttribute("aria-expanded", String(open));
  advancedExtraToggle.textContent = active
    ? `More filters · ${active} on`
    : "More filters";
  advancedExtraToggle.classList.toggle("hasActive", active > 0);
}

advancedExtraToggle?.addEventListener("click", () => {
  if (!advancedExtraFilters) {
    return;
  }
  advancedExtraFilters.hidden = !advancedExtraFilters.hidden;
  refreshAdvancedExtraToggle();
});

// A collapsed section must never hide an active filter, so opening it is forced
// whenever one of its controls is set -- including by a restored URL or state.
advancedExtraFilters?.addEventListener("change", () => {
  refreshAdvancedExtraToggle();
});
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
[playersFilter, bestPlayerCountFilter, minRatingFilter, maxRankFilter, gameTypeFilter, youngestAgeFilter].forEach((control) => {
  control.addEventListener("input", handleFilterChange);
  control.addEventListener("change", handleFilterChange);
});
// The two selects and the two sliders are views of one range each, so both
// write it rather than being read independently.
timeFilter.addEventListener("change", () => applyRangePreset("time", timeFilter.value));
complexityFilter.addEventListener("change", () => applyRangePreset("weight", complexityFilter.value));
for (const input of [timeRangeMin, timeRangeMax, weightRangeMin, weightRangeMax]) {
  input.addEventListener("input", handleRangeInput);
}
applyFiltersButton.addEventListener("click", closeFilterPanel);
categoryFilterButton.addEventListener("click", () => openFilterPicker("categories"));
mechanicFilterButton.addEventListener("click", () => openFilterPicker("mechanics"));
filterPickerSearch.addEventListener("input", renderFilterPickerList);
filterPickerClearButton.addEventListener("click", clearActiveFilterPicker);
filterPickerCloseButton.addEventListener("click", closeFilterPicker);
filterPickerDoneButton.addEventListener("click", closeFilterPicker);
filterPickerOverlay.addEventListener("click", (event) => {
  if (event.target === filterPickerOverlay) {
    closeFilterPicker();
  }
});
initRangeControls();
refreshFilterPickerButtons();
refreshAdvancedFilterSummary();
ensureFilterVocabularyLoaded();
// Local-only: see index.html for the guard. Enables the contributor UI without
// a password so it can be inspected; the server still rejects every contributor
// request, so nothing privileged actually works.
if (window.GAMEMATCH_FORCE_CONTRIBUTOR) {
  contributorRole = "admin";
  // A placeholder password: the feedback paths bail early without one, so
  // without it the contributor flows cannot be exercised at all. The server
  // rejects it, which is the point -- this reveals the UI, not access.
  contributorPassword = "local-preview";
  setContributorMode(true);
}

// Filters lead on first load, so the panel starts open on every screen.
setFilterPanelOpen(true);
window.addEventListener("resize", () => {
  hideCropZoomPreview();
  syncTopPanelHeight();
  redrawActiveDetections();
});
boxesCanvas.addEventListener("click", handleDetectionTap);
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

  if (event.key === "Escape" && activeFilterPicker) {
    closeFilterPicker();
    return;
  }

  if (event.key === "Escape" && !infoPanel.hidden) {
    setInfoPanelOpen(false);
    return;
  }
});

async function main() {
  setContributorMode(false);
  setControlsEnabled(true);
  restoreStoredContributorLogin();
  preloadStartupModels();
}

async function startCameraFromTap() {
  setControlsEnabled(false);
  clearResults();
  showCamera();

  try {
    const settings = await startCamera(video);
    const facing = settings.facingMode ? ` ${settings.facingMode}` : "";

    cameraReady = true;
    activeSourceCanvas = null;
    activeDisplayElement = video;
  } catch (error) {
    console.error(error);
    cameraReady = false;
  }

  setControlsEnabled(true);
}

async function switchCameraFromTap() {
  if (!cameraReady) {
    await startCameraFromTap();
    return;
  }

  setControlsEnabled(false);
  clearResults();
  showCamera();

  try {
    const settings = await switchCamera(video);
    const facing = settings.facingMode ? ` ${settings.facingMode}` : "";
  } catch (error) {
    console.error(error);
  }

  setControlsEnabled(true);
}

async function scanCurrentView() {
  if (isCameraFrameFrozen()) {
    return;
  }

  if (activeSourceCanvas && !cameraReady) {
    await processImageCanvas(activeSourceCanvas, activeDisplayElement);
    return;
  }

  if (!cameraReady || !video.videoWidth || !video.videoHeight) {
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
}

function closeActiveScan() {
  clearResults();
  photoPreview.hidden = true;
  activeSourceCanvas = null;
  activeDisplayElement = video;
  setControlsEnabled(true);
}

async function handleImageUpload() {
  const file = imageUpload.files?.[0];
  imageUpload.value = "";

  if (!file) {
    return;
  }

  clearResults();
  setControlsEnabled(false);

  try {
    await drawFileToCanvas(file, photoPreview);
    activeSourceCanvas = photoPreview;
    activeDisplayElement = photoPreview;
    showPhotoPreview();
    await processImageCanvas(photoPreview, photoPreview);
  } catch (error) {
    console.error("Could not read uploaded image:", uploadFileDebugInfo(file), error);
  }

  setControlsEnabled(true);
}

async function scanExampleImage(button) {
  const src = button.dataset.exampleSrc;
  const label = button.dataset.exampleLabel || "example";

  if (!src) {
    return;
  }

  clearResults();
  setControlsEnabled(false);

  try {
    await drawImageUrlToCanvas(src, photoPreview);
    activeSourceCanvas = photoPreview;
    activeDisplayElement = photoPreview;
    showPhotoPreview();
    await processImageCanvas(photoPreview, photoPreview);
  } catch (error) {
    console.error(`Could not load example image ${src}:`, error);
  }

  setControlsEnabled(true);
}

async function processImageCanvas(sourceCanvas, displayElement) {
  const token = ++scanToken;

  setControlsEnabled(false);
  clearResults(false);

  try {
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
      return;
    }

    const cappedMessage = allConfident.length > confident.length
      ? ` Top ${confident.length} only.`
      : "";
    showResultShell();

    const cards = confident.map((detection, index) => {
      const cropCanvas = cropDetection(sourceCanvas, detection);
      return createMatchCard(cropCanvas, detection, index);
    });
    currentResultCards = cards;


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
      return;
    }

    setResultsNotice("");

    await processWithConcurrency(cards, MATCH_CONCURRENCY, async (card, index) => {
      if (token !== scanToken || card.dismissed) {
        return;
      }

      try {
        const matches = await matchCrop(card.cropCanvas, (text) => card.setPending(text), card.detection);

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

        // Details are shown for a player whatever the confidence, so they have
        // to be fetched for those cards too -- not only the confident ones.
        if (!card.details) {
          await card.resolveDetails();
        }
      } catch (error) {
        if (card.dismissed) {
          return;
        }

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
  } catch (error) {
    console.error(error);
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
  // Hiding the strip gives the photo the full height back, so the overlay has
  // to be remeasured against the new box or the boxes sit where the photo used
  // to be.
  requestAnimationFrame(redrawActiveDetections);
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
  showResultsPanel();
  // Same in reverse: the strip returns and the photo shrinks again.
  requestAnimationFrame(redrawActiveDetections);
}

function dismissDinoSuggestion() {
  if (activeSourceCanvas) {
    activeSourceCanvas.dinoSuggestionDismissed = true;
  }
  dinoSuggestButton.hidden = true;
  dismissDinoSuggestButton.hidden = true;
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
    showResultShell();
    hideResultsPanel();
    dinoSuggestButton.textContent = `Matching ${suggestions.length} new ${
      suggestions.length === 1 ? "box" : "boxes"
    }...`;
    await processWithConcurrency(cards, MATCH_CONCURRENCY, async (card) => {
      if (card.dismissed) {
        return;
      }
      try {
        const matches = await matchCrop(card.cropCanvas, (text) => card.setPending(text), card.detection);
        if (card.dismissed) {
          return;
        }
        await Promise.all([
          ensureGameDetailsLoaded(),
          ensurePlayerExpansionIndexLoaded(),
        ]);
        card.setMatches(matches);
        // Details are shown for a player whatever the confidence, so they have
        // to be fetched for those cards too -- not only the confident ones.
        if (!card.details) {
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
    await finishDinoSuggestionButton("Done");
  } catch (error) {
    console.warn("DINO box suggestion failed:", error);
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

// ---------------------------------------------------------------------------
// Overlay geometry
//
// How the photo maps onto the boxes canvas. This was previously computed in
// three places -- the drawing pass and both hit-test helpers -- which drifted:
// a change to the vertical alignment was applied to two of them and the third
// silently kept sending taps to the wrong box. One function, three callers.
//
// Outside box editing the photo is bottom-aligned, matching
// `object-position: center bottom` in the stylesheet. While editing it is
// centred and carries the modifier zoom/pan.
// ---------------------------------------------------------------------------
function overlayGeometry(width, height, sourceWidth, sourceHeight) {
  const baseScale = Math.min(width / sourceWidth, height / sourceHeight);
  const scale = baseScale * (manualBoxMode ? modifierZoom : 1);

  return {
    scale,
    offsetX: (width - sourceWidth * scale) / 2 + (manualBoxMode ? modifierPanX : 0),
    offsetY: manualBoxMode
      ? (height - sourceHeight * scale) / 2 + modifierPanY
      : height - sourceHeight * scale,
  };
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
  const { scale, offsetX, offsetY } = overlayGeometry(
    displayWidth, displayHeight, sourceWidth, sourceHeight,
  );
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
    });
  }
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
  showResultShell();
  updateResultStats();
  hideResultsPanel();

  if (contributorMode) {
    queueContributorDetectorAnnotationSave(sourceCanvas).catch((error) => {
      console.warn("Could not save detector annotation:", error);
    });
  }

  try {
    await ensureBackendMatcherReady({ force: true });
    const matches = await matchCrop(card.cropCanvas, (text) => card.setPending(text), card.detection);
    await Promise.all([
      ensureGameDetailsLoaded(),
      ensurePlayerExpansionIndexLoaded(),
    ]);
    card.setMatches(matches);
    if (!card.details) {
      await card.resolveDetails();
    }
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
        setBackendWarning(false);
        console.log("Backend matcher available:", result);
        return result;
      })
      .catch((error) => {
        backendMatcherAvailable = false;
        backendMatcherUnavailable = true;
        setBackendWarning(true);
        backendMatcherLoadPromise = null;
        throw error;
      });
  }

  return backendMatcherLoadPromise;
}

async function matchCrop(cropCanvas, setPending, detection = null) {
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
  await backendTask;
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
  const expandButton = document.createElement("button");
  const reportWrongButton = document.createElement("button");
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

  // Left blank on purpose while the matcher works. `Box 1` looked like an
  // answer -- five cards reading "Box 1..5" with a live "Wrong game?" beside
  // them read as a scan that finished and identified nothing, which is the
  // opposite of what is happening. The shimmer in .matchName says "working".
  name.textContent = "";
  card.dataset.pending = "yes";
  dismissButton.type = "button";
  dismissButton.textContent = "X";
  dismissButton.setAttribute("aria-label", "Dismiss match");
  meta.textContent = `Detection ${detection.score.toFixed(2)}`;
  score.textContent = "Waiting";
  fit.textContent = "Checking filters";
  confirmButton.type = "button";
  denyButton.type = "button";
  // Contributor-only; updateFeedbackActions hides the pair for a player.
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
  reportWrongButton.className = "cardReportWrongButton";
  reportWrongButton.type = "button";
  reportWrongButton.textContent = "Wrong game?";
  reportWrongButton.setAttribute("aria-label", "This is not the game in the picture");
  expandButton.className = "cardExpandButton";
  expandButton.type = "button";
  expandButton.textContent = "See more";
  expandButton.setAttribute("aria-expanded", "false");
  // Directly under the details it disputes, so it reads as a footnote to the
  // facts above it rather than as another action competing with them.
  // The tile's two actions share a row rather than being an inline link and an
  // absolutely-positioned one. Both need a 44px hit area; as separate children
  // that meant two invisible pseudo-element pads overlapping each other and the
  // card's own click target. One row, sized once, is easier to reason about.
  const cardActions = document.createElement("div");
  cardActions.className = "cardActions";
  cardActions.append(reportWrongButton, expandButton);
  body.append(name, meta, matchDiagnostic, score, paligemmaHint, fit, details, findGameButton, feedbackActions, correctionPanel, cardActions);
  card.append(dismissButton, cropCanvas, body);
  card.tabIndex = 0;
  // Lead with the game, fall back to the position. A screen reader announcing
  // "Highlight box 3 in the photo" told a player where a card was and never
  // what it was -- and the name is the only part they came for. The box number
  // stays on the end because tapping a card still flashes that box.
  const describeCard = (gameName) => {
    card.setAttribute(
      "aria-label",
      gameName
        ? `${gameName} — box ${index + 1} in the photo`
        : `Box ${index + 1} in the photo, still matching`,
    );
  };
  describeCard("");
  resultsGrid.append(card);

  const cardApi = {
    card,
    cropCanvas,
    detection,
    matches: [],
    details: null,
    isConfident: false,
    fitsFilters: false,
    // Drives how this card's box is drawn on the photo overlay:
    // pending | yes | conditional | no | unknown
    filterClassName: "pending",
    feedbackSent: false,
    userConfirmed: false,
    matchFailed: false,
    dismissed: false,
    // The player said this is not the game: it stays on screen, greyed and
    // last, but stops counting as a match anywhere.
    markedWrong: false,
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
      card.dataset.pending = "no";
      this.matches = matches;
      this.isConfident = isConfidentMatch(matches);
      this.details = best ? gameDetailsById.get(Number(best.id)) || null : null;
      this.feedbackSent = false;
      this.userConfirmed = false;
      this.matchFailed = false;
      // A fresh match result replaces whatever the user rejected before.
      this.markedWrong = false;
      rejectedDetections.delete(this.detection);
      card.classList.remove("feedbackConfirmed", "feedbackDenied", "markedWrong");
      reportWrongButton.hidden = false;

      if (!best) {
        name.textContent = "No match";
        describeCard("No match");
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
      describeCard(best.name);
      meta.textContent = `BGG ${best.id}`;
      matchDiagnostic.textContent = `Match source: ${formatMatchSource(best)}`;
      score.textContent = formatMatchScoreText(best);
      paligemmaHint.textContent = best.paligemma_text
        ? `PaLIGemma sees: ${best.paligemma_text}`
        : "";
      paligemmaHint.hidden = !best.paligemma_text;
      card.dataset.score = String(matchSortScore(best));
      findGameButton.disabled = false;
      renderGameDetails(details, matches, this.details);
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
      // The correction supersedes the rejection -- this box now has a game the
      // user vouched for, so it should stop being greyed out.
      rejectedDetections.delete(this.detection);
      this.details = gameDetailsById.get(Number(game.id)) || null;
      name.textContent = game.name;
      describeCard(game.name);
      meta.textContent = `BGG ${game.id} · corrected`;
      matchDiagnostic.textContent = "Match source: contributor correction";
      score.textContent = "Saved as correct";
      card.dataset.score = "1";
      renderGameDetails(details, this.matches, this.details);
      this.applyFilters();
      refreshSelectedMatchCard(this);
    },
    markWrong() {
      if (this.markedWrong || !this.matches.length) {
        return;
      }

      this.markedWrong = true;
      // One-way, so the offer to say it again is withdrawn rather than left
      // sitting there on a card that already carries the answer.
      reportWrongButton.hidden = true;
      // Greys this box on the photo too -- the same treatment a denied match
      // has always had.
      rejectedDetections.add(this.detection);
      this.applyFilters();
      refreshResultCards();
      refreshSelectedMatchCard(this);
    },
    // Contributor mode can be switched on and off with cards already on screen,
    // and it moves the bar for showing details -- so they get re-rendered.
    renderDetails() {
      if (!this.matches.length) {
        return;
      }

      // Certainty is worded for players and numeric for contributors, so it has
      // to be re-rendered when the mode changes under a card that already exists
      // -- setContributorMode calls this for every card on screen.
      if (!this.userConfirmed) {
        score.textContent = formatMatchScoreText(this.matches[0]);
      }
      renderGameDetails(details, this.matches, this.details);
      this.applyFilters();
    },
    async resolveDetails() {
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
      renderGameDetails(details, this.matches, this.details);
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
      renderGameDetails(details, this.matches, this.details);
      this.applyFilters();
      refreshSelectedMatchCard(this);
      await this.resolveDetails();
    },
    setError(text, options = {}) {
      // A failed match is an answer, so the card stops shimmering and says so.
      card.dataset.pending = "no";
      this.matches = [];
      this.details = null;
      this.isConfident = false;
      this.fitsFilters = false;
      this.filterClassName = "unknown";
      this.matchFailed = true;
      this.userConfirmed = false;
      name.textContent = text;
      describeCard(text);
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
      this.filterClassName = result.className;

      // Nothing to expand into unless renderGameDetails actually produced any
      // details for this card.
      card.dataset.details = this.matches.length ? "yes" : "no";

      const checks = this.checks || {};
      card.dataset.checkPlayers = checks.players || "off";
      card.dataset.checkTime = checks.time || "off";
      card.dataset.checkWeight = checks.weight || "off";
      card.dataset.fit = result.rank;
      // Drives the "Best at 4" badge on the tile.
      card.dataset.playerTier = result.playerTier || "off";
      // Read by sortCards, which pushes these past even the pending cards.
      card.dataset.wrong = this.markedWrong ? "yes" : "no";
      card.classList.toggle("recommended", result.className === "yes");
      card.classList.toggle("conditional", result.className === "conditional");
      card.classList.toggle("rejected", result.rank === "0");
      card.classList.toggle("markedWrong", this.markedWrong);
      fit.className = `filterFit ${result.className}`;
      fit.textContent = result.text;
      fit.title = result.title || result.text;
      // Keep this card's box on the photo in step with its filter verdict.
      redrawActiveDetections();
    },
  };

  card.addEventListener("click", (event) => {
    if (isMatchSelectionInteractiveTarget(event.target)) {
      return;
    }

    selectMatchCard(cardApi);
    pulseDetection(cardApi.detection);
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
  dismissButton.addEventListener("click", (event) => {
    // Expanded, the X reads as "close this" -- dismissing the match outright is
    // a far more destructive thing than the icon suggests.
    if (cardApi.card.classList.contains("isExpanded")) {
      event.stopPropagation();
      toggleCardExpanded(cardApi, cardApi.card.querySelector(".cardExpandButton"));
      return;
    }

    dismissMatchCard(cardApi, 1);
  });
  findGameButton.addEventListener("click", () => {
    // Collapse first: expanded, this card covers the lower part of the photo,
    // so the pulse it triggers plays behind it and looks like nothing happened.
    collapseExpandedCard();
    selectMatchCard(cardApi);
    requestAnimationFrame(() => pulseDetection(cardApi.detection));
  });
  expandButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleCardExpanded(cardApi, expandButton);
  });
  reportWrongButton.addEventListener("click", (event) => {
    event.stopPropagation();
    // Collapse first: the card is about to move to the end of the strip, and
    // watching an open panel slide away is disorienting.
    if (cardApi.card.classList.contains("isExpanded")) {
      toggleCardExpanded(cardApi, cardApi.card.querySelector(".cardExpandButton"));
    }

    // Player-only: CSS keeps this link out of the contributor view, where X
    // denies and then asks for the right game. Kept as a fallback so the link
    // cannot silently change meaning if that rule ever moves.
    if (contributorMode) {
      submitRecognitionFeedback(cardApi, "deny");
      return;
    }

    cardApi.markWrong();
    reportWrongMatch(cardApi);
  });
  enableCropHoverPreview(cropCanvas);
  cropCanvas.addEventListener("click", () => {
    selectMatchCard(cardApi);

    if (contributorMode) {
      openCropViewer(cropCanvas, name.textContent);
      return;
    }

    // For a player the thumbnail behaves like the rest of the card: it points
    // at the box on the photo rather than opening a crop inspector.
    pulseDetection(cardApi.detection);
  });
  correctionPanel.addEventListener("submit", (event) => submitCorrectedReference(event, cardApi));
  correctionInput.addEventListener("input", () => {
    resetCorrectionCoverConfirmation(cardApi);
    updateCorrectionSuggestions(cardApi);
  });
  correctionInput.addEventListener("keydown", (event) => handleCorrectionInputKeyDown(event, cardApi));
  correctionCancelButton.addEventListener("click", () => skipCorrection(cardApi));
  correctionCoverConfirmButton.addEventListener("click", () => saveConfirmedCorrectedReference(cardApi));
  correctionCoverBackButton.addEventListener("click", () => resetCorrectionCoverConfirmation(cardApi, { focus: true }));
  updateFeedbackActions(cardApi);
  cardApi.applyFilters();
  return cardApi;
}

function isMatchSelectionInteractiveTarget(target) {
  return target.closest?.("button, input, select, textarea, a, label, .correctionPanel, .matchCropCanvas");
}

let stripScrollBeforeExpand = 0;

function setExpansionClipping(expanded) {
  // Switching a scroll container to overflow: visible discards its scroll
  // position, so it is captured here and restored on collapse.
  if (expanded) {
    stripScrollBeforeExpand = resultsGrid.scrollLeft;
  }

  // Both the panel and the grid clip their overflow; neither may while a card
  // is growing past them.
  resultsPanel.classList.toggle("hasExpandedCard", expanded);
  resultsGrid.classList.toggle("hasExpandedCard", expanded);

  if (!expanded) {
    requestAnimationFrame(() => {
      resultsGrid.scrollLeft = stripScrollBeforeExpand;
    });
  }
}

function returnCardToStrip(cardApi) {
  const button = cardApi.card.querySelector(".cardExpandButton");

  cardApi.card.classList.remove("isExpanded");
  setExpansionClipping(false);

  if (button) {
    button.textContent = "See more";
    button.setAttribute("aria-expanded", "false");
  }
}

function collapseExpandedCard(except = null) {
  let restored = false;

  for (const cardApi of currentResultCards) {
    if (cardApi === except || !cardApi.card.classList.contains("isExpanded")) {
      continue;
    }

    returnCardToStrip(cardApi);
    restored = true;
  }

}

function toggleCardExpanded(cardApi, button) {
  const card = cardApi.card;
  const expanding = !card.classList.contains("isExpanded");

  collapseExpandedCard(cardApi);

  // The strip scrolls horizontally, and a scroll container clips its own
  // overflow, so an expanded card cannot grow upward in place. It detaches to a
  // fixed overlay above the strip instead, leaving the strip's own height alone.
  if (expanding) {
    setExpansionClipping(true);
    card.classList.add("isExpanded");
    button.textContent = "See less";
    button.setAttribute("aria-expanded", "true");
    selectMatchCard(cardApi);
    return;
  }

  returnCardToStrip(cardApi);
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

function releaseSwipePointer(card, pointerId) {
  if (card.hasPointerCapture?.(pointerId)) {
    card.releasePointerCapture(pointerId);
  }
}

function dismissMatchCard(cardApi, direction) {
  if (cardApi.dismissed) {
    return;
  }

  hideCropZoomPreview();

  const card = cardApi.card;
  // Cards drop out of the strip downward. Sliding sideways read as scrolling
  // now that the strip itself scrolls horizontally.
  const dismissY = card.offsetHeight + 40;
  let removed = false;

  cardApi.dismissed = true;
  hideCorrectionPrompt(cardApi);
  currentResultCards = currentResultCards.filter((candidate) => candidate !== cardApi);

  if (selectedMatchCard === cardApi) {
    clearSelectedMatchCard();
    redrawActiveDetections();
  }

  card.style.setProperty("--dismiss-y", `${dismissY}px`);
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
    if (!contributorMode) {
      return;
    }
    showCropZoomPreview(source, event);
  });
  source.addEventListener("pointermove", (event) => {
    if (!contributorMode) {
      return;
    }
    positionCropZoomPreview(event);
  });
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
  // Open showing the whole crop. Cover zoom fills the frame but clips the
  // edges, which is the wrong default when the point is to inspect the crop.
  const initialZoom = fitZoom;

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
    const payload = await fetchCatalogPayload(
      `${CATALOG_DETAILS_PATH}?tier=core`,
      GAME_DETAILS_URL
    );
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

function ensureFilterVocabularyLoaded() {
  if (!filterVocabularyLoadPromise) {
    filterVocabularyLoadPromise = loadFilterVocabulary();
  }

  return filterVocabularyLoadPromise;
}

// Bundled only -- 10 KB, and BGG's vocabulary is finite (85 categories, 191
// mechanics), so it is a fixed cost that does not grow with the catalog. Losing
// it is not fatal: the picker falls back to the values the games on screen
// actually carry, which is the subset that can change anything anyway.
async function loadFilterVocabulary() {
  try {
    const response = await fetch(FILTER_VOCABULARY_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Filter vocabulary returned ${response.status}`);
    }

    const payload = await response.json();

    filterVocabulary = {
      categories: parseVocabularyList(payload?.categories),
      mechanics: parseVocabularyList(payload?.mechanics),
    };
    console.log(
      `Loaded filter vocabulary: ${filterVocabulary.categories.length} themes, `
      + `${filterVocabulary.mechanics.length} mechanics.`
    );
  } catch (error) {
    console.warn("Filter vocabulary unavailable:", error);
    filterVocabulary = { categories: [], mechanics: [] };
  }
}

function parseVocabularyList(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => ({
      name: String(entry?.name || "").trim(),
      games: cleanNumber(entry?.games),
    }))
    .filter((entry) => entry.name)
    // Ordered by frequency so the values worth reaching for are at the top of
    // the list, not buried alphabetically among the 191.
    .sort((left, right) => right.games - left.games || left.name.localeCompare(right.name));
}

async function loadPlayerExpansionIndex() {
  try {
    const payload = await fetchCatalogPayload(
      CATALOG_PLAYER_EXPANSIONS_PATH,
      PLAYER_EXPANSION_INDEX_URL
    );
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
    const payload = await fetchCatalogPayload(
      `${CATALOG_DETAILS_PATH}?tier=obscure`,
      GAME_OBSCURE_DETAILS_URL
    );
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
    let payload;
    let aliasesById = {};
    try {
      const response = await fetch(
        apiUrl(CATALOG_SEARCH_INDEX_PATH, contributorApiBase),
        { cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error(`Backend catalog returned ${response.status}`);
      }
      payload = await response.json();
    } catch (backendError) {
      console.warn("Backend search catalog unavailable; using bundled fallback:", backendError);
      const [response, aliasesResponse] = await Promise.all([
        fetch(GAME_SEARCH_INDEX_URL, { cache: "no-store" }),
        fetch(GAME_ALIASES_URL, { cache: "no-store" }),
      ]);
      if (!response.ok) {
        throw new Error(`Could not load game search index: ${response.status}`);
      }
      payload = await response.json();
      aliasesById = aliasesResponse.ok ? await aliasesResponse.json() : {};
    }
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

async function fetchCatalogPayload(backendPath, fallbackUrl) {
  try {
    const response = await fetch(apiUrl(backendPath, contributorApiBase), {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Backend catalog returned ${response.status}`);
    }
    return await response.json();
  } catch (backendError) {
    console.warn(`Backend catalog unavailable for ${backendPath}; using bundled fallback:`, backendError);
    const fallbackResponse = await fetch(fallbackUrl, { cache: "no-store" });
    if (!fallbackResponse.ok) {
      throw new Error(`Could not load fallback catalog: ${fallbackResponse.status}`);
    }
    return await fallbackResponse.json();
  }
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
  } catch (error) {
    console.error(error);
    contributorStatus.textContent = error.message || "Contributor login failed.";
  }
}

// The contributor tools are not part of the app a player is using, so they stay
// out of the help sheet unless they are wanted: #contributor in the URL, or an
// existing login to restore. Bookmarkable, and one line to check.
const contributorArea = document.getElementById("contributorArea");

function revealContributorArea() {
  if (contributorArea) {
    contributorArea.hidden = false;
  }
}

function contributorAreaRequested() {
  try {
    return window.location.hash.toLowerCase() === "#contributor";
  } catch (error) {
    return false;
  }
}

if (contributorAreaRequested()) {
  revealContributorArea();
}

window.addEventListener("hashchange", () => {
  if (contributorAreaRequested()) {
    revealContributorArea();
    infoPanel?.removeAttribute("hidden");
  }
});

async function restoreStoredContributorLogin() {
  const password = loadStoredContributorPassword();

  if (!password) {
    return;
  }

  // Someone with a saved login is a contributor whether or not they used the
  // hash, so give them their tools back.
  revealContributorArea();

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
    card.renderDetails();
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

  // Grading the match is contributor work. A player came to find a game, not to
  // label the dataset, so they are never asked -- a match that is wrong is
  // reported with the tile's own "Wrong game?" instead.
  const asksForFeedback = contributorMode;
  const asked = asksForFeedback && !card.feedbackSent;

  confirmButton.textContent = "Yes";
  denyButton.textContent = "No";
  confirmButton.setAttribute("aria-label", "Yes, this match is right");
  denyButton.setAttribute("aria-label", "No, enter the correct game");

  confirmButton.hidden = !asked;
  denyButton.hidden = !asked;
  confirmButton.disabled = disabled;
  denyButton.disabled = disabled;

  if (card.feedbackSent) {
    return;
  }

  if (!asksForFeedback) {
    feedbackStatus.textContent = "";
  } else if (card.matchFailed) {
    feedbackStatus.textContent = "No match available";
  } else if (waiting) {
    feedbackStatus.textContent = "Matching...";
  } else {
    feedbackStatus.textContent = "Correct?";
  }
}

// Fire and forget: the card is already set aside on screen, and a matcher that
// is down should not turn that into an error the player has to think about.
function reportWrongMatch(card) {
  const best = card.matches[0];

  if (!best || card.feedbackSent) {
    return;
  }

  card.feedbackSent = true;
  sendRecognitionFeedback(card, "deny", best, {
    confident: card.isConfident,
    contributor: false,
    feedbackEventId: createDetectorAnnotationId(),
  }).catch((error) => {
    console.warn("Could not report the wrong match:", error);
  });
}

// The contributor's Yes: both buttons go at once, the card takes its confirmed
// state, and the POST follows behind.
function confirmContributorMatch(card, best) {
  const { feedbackStatus } = card.feedbackControls;

  card.feedbackSent = true;
  updateFeedbackActions(card);
  card.card.classList.add("feedbackConfirmed");
  card.card.classList.remove("feedbackDenied");
  card.confirmMatch().then(refreshResultCards);
  feedbackStatus.textContent = acceptedFeedbackText(card);
  sendRecognitionFeedback(card, "confirm", best, {
    confident: card.isConfident,
    contributor: true,
    feedbackEventId: createDetectorAnnotationId(),
  }).catch((error) => {
    console.error(error);
    feedbackStatus.textContent = "Confirmed here, but not recorded";
  });
}

// The contributor's No: the card opens onto the correction form immediately,
// and the denial is posted behind it. A matcher that is slow or down must not
// stand between "that is wrong" and typing what is right.
function denyContributorMatch(card, best) {
  const { feedbackStatus } = card.feedbackControls;
  const feedbackEventId = createDetectorAnnotationId();

  card.denialFeedbackEventId = feedbackEventId;
  card.deniedMatch = { ...best };

  if (card.detection) {
    rejectedDetections.add(card.detection);
  }

  redrawActiveDetections();
  card.feedbackSent = true;
  updateFeedbackActions(card);
  card.card.classList.add("feedbackDenied");
  card.card.classList.remove("feedbackConfirmed");
  feedbackStatus.textContent = "Denied";

  // Expanded first: the correction prompt needs room for a field and its
  // suggestions, which a tile does not have.
  if (!card.card.classList.contains("isExpanded")) {
    toggleCardExpanded(card, card.card.querySelector(".cardExpandButton"));
  }

  showCorrectionPrompt(card);
  sendRecognitionFeedback(card, "deny", best, {
    confident: card.isConfident,
    contributor: true,
    feedbackEventId,
  }).catch((error) => {
    console.error(error);
    card.feedbackControls.correctionStatus.textContent =
      "Denial not recorded, but the correction below will still save.";
  });
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

  // Both contributor answers land on the card immediately rather than after a
  // round trip -- the verdict is already decided by the tap, and the POST that
  // records it has nothing to add to the screen. It follows in the background.
  if (contributorMode) {
    if (action === "deny") {
      denyContributorMatch(card, best);
    } else {
      confirmContributorMatch(card, best);
    }

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
      if (card.detection) {
        rejectedDetections.add(card.detection);
      }
      redrawActiveDetections();
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
    } else {
      // Same outcome as the tile's "Wrong game?": set aside, not thrown away.
      feedbackStatus.textContent = "Thanks";
      card.markWrong();
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

// "Yes, same game" is the end of the correction: the form has served its
// purpose and closes on the tap, leaving the card showing the game that was
// just named. The save runs behind it.
function saveConfirmedCorrectedReference(card) {
  const { feedbackStatus } = card.feedbackControls;
  const game = card.correctionSelectedGame;
  const originalMatch = card.deniedMatch || card.matches[0] || null;

  if (!game) {
    return;
  }

  hideCorrectionPrompt(card);
  card.feedbackSent = true;
  card.card.classList.add("feedbackConfirmed");
  card.card.classList.remove("feedbackDenied");
  card.setCorrectedGame(game);
  card.resolveDetails().then(refreshResultCards);
  feedbackStatus.textContent = "Corrected";
  sendRecognitionFeedback(
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
      originalMatch,
    }
  ).catch((error) => {
    console.error(error);
    feedbackStatus.textContent = "Corrected here, but not saved";
  });
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

// Skipping leaves a box that was denied and never corrected. It gets the same
// treatment a player's "Wrong game?" gives: greyed, sorted to the end, and out
// of the counts -- rather than sitting among the answers still showing the name
// the contributor just rejected.
function skipCorrection(card) {
  const { feedbackStatus } = card.feedbackControls;

  hideCorrectionPrompt(card);

  if (card.card.classList.contains("isExpanded")) {
    toggleCardExpanded(card, card.card.querySelector(".cardExpandButton"));
  }

  card.markWrong();
  feedbackStatus.textContent = "Skipped";
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

function setFilterPanelOpen(open) {
  document.body.classList.toggle("filterPanelOpen", open);
  filterVisibilityButton.textContent = open ? "Close filters" : "Filters";
  filterVisibilityButton.setAttribute("aria-expanded", open ? "true" : "false");
}

function toggleFilterPanelVisibility() {
  const open = !document.body.classList.contains("filterPanelOpen");
  filterPanelDismissedByUser = !open;
  setFilterPanelOpen(open);
}

// The panel is held open on entering camera/photo mode so filters are
// discoverable. Dismissing it is an explicit action -- Done, or the Filters
// toggle -- rather than something that happens under the user mid-edit.
function closeFilterPanel() {
  filterPanelDismissedByUser = true;
  setFilterPanelOpen(false);
}

// The poll is not in the shipped catalog yet -- BGG's XML API needs a token to
// backfill it. Offering "Best at this count only" against data that does not
// exist would just empty the strip, so the control stays hidden until at least
// one game on screen actually carries votes. It appears on its own once a
// backfill lands; nothing else has to change.
function refreshBestPlayerCountAvailability() {
  const available = currentResultCards.some((card) => (
    card.details?.best_player_counts?.length
    || card.details?.recommended_player_counts?.length
  ));

  if (!available && bestPlayerCountFilter.checked) {
    bestPlayerCountFilter.checked = false;
  }

  bestPlayerCountField.hidden = !available;
}

// ---------------------------------------------------------------------------
// Time and complexity ranges
//
// Both filters have a meaningful lower end -- "between 30 and 60 minutes",
// "light or medium" -- that a single cap cannot express. The select in the
// basic panel and the slider in the advanced one are two views of the same
// range, not two filters: the select writes the upper bound and clears the
// lower, the slider writes both, and each reflects what the other did.
// ---------------------------------------------------------------------------

function readRange(kind) {
  const control = RANGE_CONTROLS[kind];
  const minIndex = cleanNumber(control.min.value);
  const maxIndex = cleanNumber(control.max.value);
  const minSet = minIndex > control.floor;
  const maxSet = maxIndex < control.ceiling;

  return {
    minIndex,
    maxIndex,
    min: control.value(minIndex),
    max: control.value(maxIndex),
    minSet,
    maxSet,
    set: minSet || maxSet,
  };
}

// Thumbs may not cross, and may not meet: a range of zero width would exclude
// everything, which no drag is ever asking for.
function handleRangeInput(event) {
  const kind = event.target.closest(".rangeSlider").dataset.range;
  const control = RANGE_CONTROLS[kind];
  const minIndex = cleanNumber(control.min.value);
  const maxIndex = cleanNumber(control.max.value);

  if (minIndex >= maxIndex) {
    if (event.target === control.min) {
      control.min.value = String(maxIndex - 1);
    } else {
      control.max.value = String(minIndex + 1);
    }
  }

  syncRangePreset(kind);
  refreshRangeDisplay(kind);
  handleFilterChange();
}

// The basic select only has room for the upper bound, so choosing from it drops
// any lower bound rather than silently keeping one the user cannot see.
function applyRangePreset(kind, value) {
  if (value === "custom") {
    return;
  }

  const control = RANGE_CONTROLS[kind];

  control.min.value = String(control.floor);
  control.max.value = String(control.presetIndex(value));
  refreshRangeDisplay(kind);
  handleFilterChange();
}

function syncRangePreset(kind) {
  const control = RANGE_CONTROLS[kind];
  const range = readRange(kind);
  const preset = [...control.preset.options].find((option) => (
    option.value !== "custom" && control.presetIndex(option.value) === range.maxIndex
  ));

  // "Custom" is hidden from the list but still selectable in code, so the
  // select can report a range it has no option for instead of showing a bound
  // that is no longer true.
  control.preset.value = (preset && !range.minSet) ? preset.value : "custom";
}

function refreshRangeDisplay(kind) {
  const control = RANGE_CONTROLS[kind];
  const range = readRange(kind);
  const fill = document.querySelector(`[data-range-fill="${kind}"]`);
  const span = control.ceiling - control.floor;

  control.label.textContent = kind === "time"
    ? describeTimeRange(range)
    : describeWeightRange(range);

  if (fill) {
    fill.style.left = `${((range.minIndex - control.floor) / span) * 100}%`;
    fill.style.right = `${((control.ceiling - range.maxIndex) / span) * 100}%`;
  }

  // What a screen reader announces on each thumb: the index alone says nothing.
  control.min.setAttribute("aria-valuetext", control.label.textContent);
  control.max.setAttribute("aria-valuetext", control.label.textContent);
}

function describeTimeRange(range) {
  if (!range.minSet && !range.maxSet) {
    return "Any length";
  }

  if (!range.minSet) {
    return `Up to ${range.max} min`;
  }

  if (!range.maxSet) {
    return `${range.min} min or more`;
  }

  return `Between ${range.min} and ${range.max} min`;
}

function describeWeightRange(range) {
  if (!range.minSet && !range.maxSet) {
    return "Any complexity";
  }

  // Bands sit between the thumbs, so a range spanning indices 1-3 covers the
  // two bands named at 1 and 2.
  const names = [];

  for (let band = range.minIndex; band < range.maxIndex; band += 1) {
    names.push(WEIGHT_BANDS[band]);
  }

  if (names.length === 1) {
    return names[0];
  }

  if (names.length === 2) {
    return `${names[0]} or ${names[1].toLowerCase()}`;
  }

  return `${names[0]} to ${names[names.length - 1].toLowerCase()}`;
}

function initRangeControls() {
  for (const kind of Object.keys(RANGE_CONTROLS)) {
    // The selects carry the defaults, so the sliders start from them rather
    // than from a second copy that could drift.
    applyRangePreset(kind, RANGE_CONTROLS[kind].preset.value);
  }
}

// ---------------------------------------------------------------------------
// Theme and mechanic picker
//
// Two filters, one component. A <select> cannot carry 191 mechanics or express
// "any of these", and a phone has no room for 191 checkboxes inline, so this is
// a searchable sheet: frequency-ordered, multi-select, and led by the values the
// games currently on screen actually carry.
// ---------------------------------------------------------------------------

function openFilterPicker(kind) {
  const picker = FILTER_PICKERS[kind];

  if (!picker) {
    console.warn(`Unknown filter picker: ${kind}`);
    return;
  }

  // Only matters on a cold open before startup finished; the list re-renders
  // itself when it lands, so the sheet is never left empty waiting on it.
  ensureFilterVocabularyLoaded().then(() => {
    if (activeFilterPicker === kind) {
      renderFilterPickerList();
    }
  });

  activeFilterPicker = kind;
  filterPickerReturnFocus = picker.button;
  filterPickerTitle.textContent = picker.title;
  filterPickerSearch.placeholder = picker.searchPlaceholder;
  filterPickerSearch.value = "";
  filterPickerOverlay.hidden = false;
  picker.button.setAttribute("aria-expanded", "true");
  document.body.classList.add("filterPickerOpen");
  renderFilterPickerChips();
  renderFilterPickerList();
  // Not focusing the search field: on a phone that raises the keyboard over the
  // list, and the top of the list is usually the answer.
  window.setTimeout(() => filterPickerCloseButton.focus(), 0);
}

function closeFilterPicker() {
  if (!activeFilterPicker) {
    return;
  }

  FILTER_PICKERS[activeFilterPicker].button.setAttribute("aria-expanded", "false");
  activeFilterPicker = "";
  filterPickerOverlay.hidden = true;
  document.body.classList.remove("filterPickerOpen");
  filterPickerList.replaceChildren();
  filterPickerReturnFocus?.focus();
  filterPickerReturnFocus = null;
}

function clearActiveFilterPicker() {
  if (!activeFilterPicker) {
    return;
  }

  selectedFilterValues[activeFilterPicker].clear();
  renderFilterPickerChips();
  renderFilterPickerList();
  applyFilterValueChange();
}

// Selections take effect as they are made rather than on Done, so closing the
// sheet never has a pending edit to lose.
function applyFilterValueChange() {
  refreshFilterPickerButtons();
  handleFilterChange();
}

function toggleFilterValue(kind, name, selected) {
  const values = selectedFilterValues[kind];

  if (selected) {
    values.add(name);
  } else {
    values.delete(name);
  }

  renderFilterPickerChips();
  syncFilterPickerOptionState();
  applyFilterValueChange();
}

// The values carried by the games currently on screen. Everything else in the
// vocabulary can only ever remove cards, so these lead the list -- and it is
// also how a value the bundled vocabulary never saw (an obscure game's theme)
// still becomes selectable.
function filterValuesOnScreen(field) {
  const values = new Set();

  for (const card of currentResultCards) {
    const entries = card.details?.[field];

    if (!Array.isArray(entries)) {
      continue;
    }

    for (const entry of entries) {
      const name = String(entry || "").trim();

      if (name) {
        values.add(name);
      }
    }
  }

  return values;
}

function buildFilterPickerEntries(kind, query) {
  const picker = FILTER_PICKERS[kind];
  const selected = selectedFilterValues[kind];
  const onScreen = filterValuesOnScreen(picker.detailField);
  const counts = new Map(filterVocabulary[kind].map((entry) => [entry.name, entry.games]));
  const names = new Set([...counts.keys(), ...onScreen, ...selected]);
  const needle = normalizeGameLookupText(query);
  const entries = [...names]
    .filter((name) => !needle || normalizeGameLookupText(name).includes(needle))
    .map((name) => ({
      name,
      games: counts.get(name) || 0,
      onScreen: onScreen.has(name),
      selected: selected.has(name),
    }))
    // Frequency order, and deliberately not "selected first": re-sorting on
    // every tap would slide the next row under the finger that just tapped.
    .sort((left, right) => right.games - left.games || left.name.localeCompare(right.name));

  return {
    onScreen: entries.filter((entry) => entry.onScreen),
    rest: entries.filter((entry) => !entry.onScreen),
  };
}

function renderFilterPickerList() {
  if (!activeFilterPicker) {
    return;
  }

  const picker = FILTER_PICKERS[activeFilterPicker];
  const { onScreen, rest } = buildFilterPickerEntries(activeFilterPicker, filterPickerSearch.value);

  filterPickerList.replaceChildren();

  if (!onScreen.length && !rest.length) {
    const empty = document.createElement("p");

    empty.className = "filterPickerEmpty";
    empty.textContent = filterPickerSearch.value.trim()
      ? `No ${picker.plural} match "${filterPickerSearch.value.trim()}".`
      : `No ${picker.plural} loaded yet.`;
    filterPickerList.append(empty);
    updateFilterPickerSummary();
    return;
  }

  if (onScreen.length) {
    filterPickerList.append(
      filterPickerHeading("In this photo"),
      ...onScreen.map((entry) => filterPickerOption(activeFilterPicker, entry)),
    );
  }

  if (rest.length) {
    filterPickerList.append(
      filterPickerHeading(onScreen.length ? picker.allHeading : ""),
      ...rest.map((entry) => filterPickerOption(activeFilterPicker, entry)),
    );
  }

  updateFilterPickerSummary();
}

function filterPickerHeading(text) {
  const heading = document.createElement("p");

  heading.className = "filterPickerHeading";
  heading.textContent = text;
  heading.hidden = !text;
  return heading;
}

function filterPickerOption(kind, entry) {
  const option = document.createElement("label");
  const input = document.createElement("input");
  const name = document.createElement("span");
  const count = document.createElement("span");

  option.className = "filterPickerOption";
  option.dataset.value = entry.name;
  option.classList.toggle("isSelected", entry.selected);
  input.type = "checkbox";
  input.checked = entry.selected;
  input.addEventListener("change", () => {
    option.classList.toggle("isSelected", input.checked);
    toggleFilterValue(kind, entry.name, input.checked);
  });
  name.className = "filterPickerOptionName";
  name.textContent = entry.name;
  count.className = "filterPickerOptionCount";
  // A value no game in the catalog carries still gets a row when a game on
  // screen has it, and saying "0 games" there would be a lie about the catalog
  // rather than a useful number.
  count.textContent = entry.games ? String(entry.games) : "";
  option.append(input, name, count);
  return option;
}

// Checkbox state after a chip removal, without rebuilding the list -- rebuilding
// would scroll it back to the top mid-edit.
function syncFilterPickerOptionState() {
  if (!activeFilterPicker) {
    return;
  }

  const selected = selectedFilterValues[activeFilterPicker];

  for (const option of filterPickerList.querySelectorAll(".filterPickerOption")) {
    const checked = selected.has(option.dataset.value);

    option.querySelector("input").checked = checked;
    option.classList.toggle("isSelected", checked);
  }

  updateFilterPickerSummary();
}

function renderFilterPickerChips() {
  if (!activeFilterPicker) {
    return;
  }

  const kind = activeFilterPicker;
  const values = [...selectedFilterValues[kind]];

  filterPickerChips.replaceChildren();
  filterPickerChips.hidden = !values.length;

  for (const value of values) {
    const chip = document.createElement("button");

    chip.type = "button";
    chip.className = "filterPickerChip";
    chip.textContent = value;
    chip.setAttribute("aria-label", `Remove ${value}`);
    chip.addEventListener("click", () => toggleFilterValue(kind, value, false));
    filterPickerChips.append(chip);
  }

  updateFilterPickerSummary();
}

function updateFilterPickerSummary() {
  if (!activeFilterPicker) {
    return;
  }

  const picker = FILTER_PICKERS[activeFilterPicker];
  const count = selectedFilterValues[activeFilterPicker].size;

  filterPickerSummary.textContent = count
    ? `${count} selected · a game needs any one`
    : `Any ${picker.singular}`;
  filterPickerClearButton.disabled = !count;
}

function refreshFilterPickerButtons() {
  for (const [kind, picker] of Object.entries(FILTER_PICKERS)) {
    const values = [...selectedFilterValues[kind]];

    picker.button.textContent = values.length === 0
      ? "Any"
      : (values.length === 1 ? values[0] : `${values.length} selected`);
    picker.button.title = values.length ? values.join(", ") : `Any ${picker.singular}`;
    picker.button.classList.toggle("isSet", values.length > 0);
  }
}

// Ten advanced filters do not fit on screen collapsed, so the toggle carries how
// many are set. Without it, a card can silently fail a filter the user set once
// and cannot see.
function refreshAdvancedFilterSummary() {
  const filters = getFilters();
  const count = [
    filters.minRating,
    filters.maxRank,
    filters.gameType,
    filters.youngestAge,
    filters.bestPlayerCountOnly,
    filters.categories.length,
    filters.mechanics.length,
    // Only the lower bounds: the upper ones have a control in the basic panel
    // and are visible without opening this one.
    filters.time.minSet,
    filters.weight.minSet,
  ].filter(Boolean).length;

  advancedFilterToggle.textContent = count ? `Advanced · ${count}` : "Advanced";
  advancedFilterToggle.classList.toggle("isSet", count > 0);
}

function handleFilterChange() {
  for (const card of currentResultCards) {
    card.applyFilters();
  }

  refreshResultCards();
  refreshAdvancedFilterSummary();
}

function refreshResultCards() {
  updateResultStats();
  sortCards();
  // Filter state drives the box overlay, so the photo has to redraw too.
  redrawActiveDetections();
}

function getFilters() {
  const players = cleanNumber(playersFilter.value);
  // Only meaningful alongside a player count -- on its own there is no count
  // to be best at.
  const bestPlayerCountOnly = Boolean(players) && bestPlayerCountFilter.checked;
  const time = readRange("time");
  const weight = readRange("weight");
  const minRating = cleanNumber(minRatingFilter.value);
  const maxRank = cleanNumber(maxRankFilter.value);
  const gameType = gameTypeFilter.value;
  // The age of the youngest player, so it caps the game's recommended age
  // rather than setting a floor -- "we have an 8-year-old" wants games rated 8
  // and under, not games rated 8 and over.
  const youngestAge = cleanNumber(youngestAgeFilter.value);
  const categories = [...selectedFilterValues.categories];
  const mechanics = [...selectedFilterValues.mechanics];
  // A lower bound on either range is only reachable from the advanced panel, so
  // it counts as advanced even though the upper bound has a basic control.
  const hasAdvanced = Boolean(
    minRating || maxRank || gameType || bestPlayerCountOnly || youngestAge
    || categories.length || mechanics.length
    || time.minSet || weight.minSet,
  );

  return {
    players,
    bestPlayerCountOnly,
    time,
    weight,
    minRating,
    maxRank,
    gameType,
    youngestAge,
    categories,
    mechanics,
    hasAdvanced,
    hasAny: Boolean(players || time.set || weight.set || hasAdvanced),
  };
}

// Every recognised box is run through the filters, whatever the matcher thought
// of its own guess. A shaky match is not a reason to withhold the answer -- it
// is a reason to rank it below the sure ones, which the score sort already does.
function evaluateCardAgainstFilters(card) {
  const filters = getFilters();

  if (!card.matches.length) {
    return {
      fits: false,
      rank: "-1",
      className: "pending",
      text: "Matching...",
    };
  }

  // Sorted below everything else and no longer counted: the player has said
  // this is not the game, so it stops competing with the real answers.
  if (card.markedWrong) {
    return {
      fits: false,
      rank: "-2",
      className: "no",
      text: "Marked wrong",
    };
  }

  if (!card.details) {
    return {
      fits: false,
      rank: "1",
      className: "unknown",
      text: "No game data",
    };
  }

  const result = gameFitsFilters(card.details, filters);
  card.checks = result.checks;
  card.playerTier = result.playerTier;

  if (result.fits) {
    if (result.conditionalFits?.length) {
      const expansion = result.conditionalFits[0];
      const expansionName = formatExpansionShortName(expansion, card.details);

      return {
        fits: true,
        rank: "2",
        className: "conditional",
        playerTier: result.playerTier,
        text: `+ ${expansionName}`,
        title: `Matches the filters if ${expansion.name} is included.`,
      };
    }

    // Best and Recommended rank above a game that merely seats the group, and a
    // count the voters rate poorly ranks below it -- but all of them still fit.
    // A game with no votes sits at "supported", so nothing is demoted for
    // lacking data.
    const rank = PLAYER_TIER_RANK[result.playerTier] || PLAYER_TIER_RANK.supported;

    return {
      fits: true,
      rank,
      className: "yes",
      playerTier: result.playerTier,
      text: playerTierText(result.playerTier, filters),
      title: playerTierTitle(result.playerTier, filters),
    };
  }

  return {
    fits: false,
    rank: "0",
    className: "no",
    text: result.reasons.join(" · "),
    title: result.reasons.join(" · "),
  };
}

// Fit ranks, highest first. sortCards reads these off data-fit, so the gaps
// matter more than the numbers: 2 conditional (needs an expansion to seat the
// group at all), 1 no game data, 0 fails a filter, -1 pending, -2 marked wrong.
// A poorly-voted count still outranks needing to buy something.
const PLAYER_TIER_RANK = {
  best: "6",
  recommended: "5",
  supported: "4",
  not_recommended: "3",
};

// The badge on a card that fits. Says which grade of fit it is when BGG's
// voters have an opinion, and falls back to the old wording when they do not.
function playerTierText(tier, filters) {
  if (tier === "best") {
    return `Best at ${filters.players}`;
  }

  if (tier === "recommended") {
    return `Good at ${filters.players}`;
  }

  if (tier === "not_recommended") {
    return `Poor at ${filters.players}`;
  }

  return filters.hasAny ? "Fits" : "Recognised";
}

function playerTierTitle(tier, filters) {
  if (tier === "best") {
    return `BGG voters rate this game best with ${filters.players} players.`;
  }

  if (tier === "recommended") {
    return `BGG voters recommend this game with ${filters.players} players, though it is not their favourite count.`;
  }

  if (tier === "not_recommended") {
    return `It plays at ${filters.players}, but BGG voters do not recommend that count.`;
  }

  return "";
}

function gameFitsFilters(details, filters) {
  const reasons = [];
  const conditionalFits = [];
  // Per-dimension verdicts for the basic filters: "pass", "fail", "maybe"
  // (fits only with an expansion), or "off" when that filter is not set.
  const checks = { players: "off", time: "off", weight: "off" };
  // "off" until a player filter is set; otherwise best | recommended |
  // supported | not_recommended | unsupported | unknown.
  let playerTier = "off";

  if (filters.players) {
    const playerResult = checkPlayerCount(details, filters.players, {
      bestOnly: filters.bestPlayerCountOnly,
    });
    checks.players = playerResult.fits ? "pass" : "fail";
    // Carried out so the fit ranking can put "best at 4" above "plays 4".
    playerTier = playerResult.tier;

    if (!playerResult.fits) {
      const expansionResult = checkPlayerExpansionCount(details, filters.players);

      if (expansionResult.fits) {
        conditionalFits.push(expansionResult.expansion);
        checks.players = "maybe";
      } else {
        reasons.push(playerResult.reason);
      }
    }
  }

  if (filters.time.set) {
    const timeResult = checkTimeRange(details, filters.time);
    checks.time = timeResult.fits ? "pass" : "fail";

    if (!timeResult.fits) {
      reasons.push(timeResult.reason);
    }
  }

  if (filters.weight.set) {
    const weightResult = checkWeightRange(details, filters.weight);
    checks.weight = weightResult.fits ? "pass" : "fail";

    if (!weightResult.fits) {
      reasons.push(weightResult.reason);
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

  if (filters.categories.length) {
    const categoryResult = checkValueList(details, "categories", filters.categories, {
      singular: "theme",
      plural: "themes",
    });

    if (!categoryResult.fits) {
      reasons.push(categoryResult.reason);
    }
  }

  if (filters.mechanics.length) {
    const mechanicResult = checkValueList(details, "mechanics", filters.mechanics, {
      singular: "mechanic",
      plural: "mechanics",
    });

    if (!mechanicResult.fits) {
      reasons.push(mechanicResult.reason);
    }
  }

  if (filters.youngestAge) {
    const ageResult = checkPlayerAge(details, filters.youngestAge);

    if (!ageResult.fits) {
      reasons.push(ageResult.reason);
    }
  }

  return {
    fits: reasons.length === 0,
    conditionalFits: reasons.length === 0 ? conditionalFits : [],
    reasons,
    checks,
    playerTier,
  };
}

// BGG's poll records a verdict per player count, as strings: "1", "2" ... up to
// the game's maximum, then a final "4+" row. That last row means MORE than four,
// not four-or-more -- four has its own row right before it. Reading it as
// "or more" made a game whose top count is unvoted inherit the "4+" verdict.
function pollCountMatches(pollCounts, players) {
  return (pollCounts || []).some((entry) => {
    const raw = String(entry).trim();

    if (raw.endsWith("+")) {
      const floor = cleanNumber(raw.slice(0, -1));
      return Boolean(floor) && players > floor;
    }

    return cleanNumber(raw) === players;
  });
}

// What BGG's voters think of this game AT this count, which is a different
// question from whether the box allows it. "supported" is both the honest
// answer for a game with no poll and the tier that reproduces the old
// behaviour, so a game without votes ranks exactly where it always did.
function playerCountTier(details, players) {
  if (pollCountMatches(details.best_player_counts, players)) {
    return "best";
  }

  if (pollCountMatches(details.recommended_player_counts, players)) {
    return "recommended";
  }

  if (pollCountMatches(details.not_recommended_player_counts, players)) {
    return "not_recommended";
  }

  return "supported";
}

function checkPlayerCount(details, players, { bestOnly = false } = {}) {
  const minPlayers = cleanNumber(details.min_players);
  const maxPlayers = cleanNumber(details.max_players);

  if (!minPlayers && !maxPlayers) {
    return { fits: false, tier: "unknown", reason: "No player data" };
  }

  const inRange = players >= (minPlayers || maxPlayers) && players <= (maxPlayers || minPlayers);

  if (!inRange) {
    return { fits: false, tier: "unsupported", reason: `Not ${players} players` };
  }

  const tier = playerCountTier(details, players);

  // Voted down at this count still fits: the group can play it tonight, and the
  // ranking is what says they probably should not. Only the explicit best-only
  // filter turns a tier into a fail.
  if (bestOnly && tier !== "best") {
    return {
      fits: false,
      tier,
      reason: tier === "recommended"
        ? `Only recommended at ${players}`
        : `Not voted best at ${players}`,
    };
  }

  return { fits: true, tier, reason: "" };
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

// Both bounds read the game's longest play, which is what the max-only filter
// always used. The lower bound then means "will not be over before then" --
// a game that can run 45 minutes can fill a 30-minute slot.
function checkTimeRange(details, range) {
  const duration = cleanNumber(details.max_playtime || details.playing_time);

  if (!duration) {
    return { fits: false, reason: "No time data" };
  }

  if (range.minSet && duration < range.min) {
    return { fits: false, reason: `Under ${range.min} min` };
  }

  if (range.maxSet && duration > range.max) {
    return { fits: false, reason: `Over ${range.max} min` };
  }

  return { fits: true, reason: "" };
}

function checkWeightRange(details, range) {
  const weight = cleanNumber(details.average_weight);

  if (!weight) {
    return { fits: false, reason: "No weight data" };
  }

  if (range.minSet && weight < range.min) {
    return { fits: false, reason: `Lighter than ${WEIGHT_BANDS[range.min]?.toLowerCase()}` };
  }

  if (range.maxSet && weight > range.max) {
    return { fits: false, reason: `Heavier than ${WEIGHT_BANDS[range.max - 1]?.toLowerCase()}` };
  }

  return { fits: true, reason: "" };
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

// Themes and mechanics are lists on both sides, and selecting several asks for
// ANY of them, not all. The AND reading empties the strip almost every time --
// "Fantasy and Economic" is a handful of games in the whole catalog, and the
// user picking both is saying "either of these appeals tonight".
function checkValueList(details, field, wanted, { singular, plural }) {
  const values = Array.isArray(details[field]) ? details[field] : [];

  if (!values.length) {
    return { fits: false, reason: `No ${singular} data` };
  }

  const present = new Set(values.map((value) => String(value).toLowerCase()));
  const hit = wanted.find((value) => present.has(String(value).toLowerCase()));

  if (hit) {
    return { fits: true, reason: "" };
  }

  return {
    fits: false,
    reason: wanted.length === 1 ? `Not ${wanted[0].toLowerCase()}` : `No ${plural} match`,
  };
}

// BGG carries two ages: the publisher's box age (min_age) and what the community
// voted (suggested_player_age). The vote wins where it exists -- publishers
// routinely state an age the table disagrees with -- with the box age as the
// fallback, since the poll is missing for ~31% of obscure games.
function checkPlayerAge(details, youngestAge) {
  const age = cleanNumber(details.suggested_player_age) || cleanNumber(details.min_age);

  if (!age) {
    return { fits: false, reason: "No age data" };
  }

  return {
    fits: age <= youngestAge,
    reason: age <= youngestAge ? "" : `Ages ${age}+`,
  };
}

// BGG's language-dependence poll, 1 (no text) to 5 (unplayable translated).
// Phrased as a fact about the game rather than about the filter, so a failing
// card says what it is instead of what it missed.
const LANGUAGE_LEVEL_LABELS = {
  1: "No text",
  2: "Little text",
  3: "Some text",
  4: "Lots of text",
  5: "Text-heavy",
};

// Players, time and weight: the three the filters act on, and the three the
// compact tile has room for. Kept in sync with the CSS that hides the rest.
const TRIAGE_DETAIL_FIELDS = new Set(["players", "time", "weight"]);

// Every card shows what was found, contributor or player alike. Withholding the
// details behind a confidence bar left cards that said nothing at all, and the
// score line and box colour already carry how sure the matcher is.
function renderGameDetails(container, matches, detailsRecord = null) {
  container.replaceChildren();
  container.classList.remove("muted");

  const best = matches[0];
  const details = detailsRecord || gameDetailsById.get(Number(best.id));

  if (!details) {
    container.textContent = "No local details for this game yet.";
    container.classList.add("muted");
    return;
  }

  // The tile shows the three the filters act on, picked out by field rather
  // than by position: plenty of BGG entries carry no player count, time or
  // weight at all, and dropping those rows used to slide Rank and Type up into
  // the tile's three slots -- so a game with no player count showed its rank
  // under the heading the eye reads as players.
  const rows = [
    ["players", "Players", formatPlayers(details)],
    ["time", "Time", formatDuration(details)],
    ["weight", "Weight", formatWeight(details.average_weight)],
    ["rank", "Rank", formatRank(details.rank)],
    ["rating", "Rating", formatRating(details.average_rating)],
    ["type", "Type", formatGameTypeTags(details.game_type_tags)],
    ["year", "Year", formatYear(details.year_published)],
    // The fields the advanced filters act on, so a verdict like "Not fantasy"
    // can be checked against what the game actually carries. Language is here
    // without a filter behind it: nothing else on the card says whether a
    // non-English table can play the thing.
    ["age", "Age", formatPlayerAge(details)],
    ["language", "Language", formatLanguageDependence(details.language_dependence)],
    ["themes", "Themes", formatTagList(details.categories)],
    ["mechanics", "Mechanics", formatTagList(details.mechanics)],
  ].filter(([field, , value]) => value || TRIAGE_DETAIL_FIELDS.has(field));

  for (const [field, label, value] of rows) {
    const row = document.createElement("div");
    const labelNode = document.createElement("span");
    const valueNode = document.createElement("strong");

    row.dataset.field = field;
    labelNode.textContent = label;
    // An empty slot says so rather than letting the next field take its place.
    valueNode.textContent = value || "Not known";
    valueNode.classList.toggle("isMissing", !value);
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

// Two numbers a player cannot act on. `Similarity 0.982 · confidence 0.912`
// reads as a score *for the game* -- 0.9 out of 1 for a game they were about to
// play -- rather than as the matcher's own certainty about which box this is.
// Players get the certainty in words; contributors, who are grading matches and
// need to compare them, keep the figures. Same call site, audience decides.
function formatMatchScoreText(match) {
  const confidence = matchSortScore(match);

  if (contributorMode) {
    if (match?.visual_score_available === false) {
      return `Confidence ${confidence.toFixed(SCORE_DISPLAY_DECIMALS)}`;
    }
    const roundedSimilarity = cleanNumber(match?.score).toFixed(SCORE_DISPLAY_DECIMALS);
    const roundedConfidence = confidence.toFixed(SCORE_DISPLAY_DECIMALS);
    return roundedSimilarity !== roundedConfidence
      ? `Similarity ${roundedSimilarity} · confidence ${roundedConfidence}`
      : `Similarity ${roundedSimilarity}`;
  }

  return matchCertaintyPhrase(confidence);
}

// Bands rather than a number, worded so the weakest one invites a correction
// instead of asserting something the matcher is not sure of.
function matchCertaintyPhrase(confidence) {
  if (confidence >= 0.9) {
    return "Confident match";
  }
  if (confidence >= 0.8) {
    return "Likely match";
  }
  return "Best guess — check the cover";
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

// Themes and mechanics run to a dozen entries on a heavy game. Three plus a
// count says what kind of game it is without turning the card into a list.
function formatTagList(values, limit = 3) {
  const tags = (Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (!tags.length) {
    return "";
  }

  const shown = tags.slice(0, limit).join(", ");

  return tags.length > limit ? `${shown} +${tags.length - limit}` : shown;
}

function formatPlayerAge(details) {
  const age = cleanNumber(details.suggested_player_age) || cleanNumber(details.min_age);

  return age ? `${age}+` : "";
}

function formatLanguageDependence(dependence) {
  const level = cleanNumber(dependence?.level);

  return level ? (LANGUAGE_LEVEL_LABELS[level] || "") : "";
}

function cleanNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function matchSortScore(match) {
  return cleanNumber(match?.rank_score ?? match?.score);
}

// Tapping a box is now the primary way into a match, and a canvas offers no
// affordance to advertise it. Hint once, then never again.
const BOX_TAP_HINT_KEY = "gamematchBoxTapHintSeen";

function boxTapHintSeen() {
  try {
    return Boolean(localStorage.getItem(BOX_TAP_HINT_KEY));
  } catch (error) {
    // A private-mode browser just means the hint shows again; not worth failing.
    return false;
  }
}

// The hint this replaces was a string appended to a status line, and both the
// function producing it and the summary it was appended to had become
// unreachable -- so the flag was being set on first tap while nothing was ever
// shown. The legend lives here now as well, since the outline colours are the
// one thing a player cannot work out by looking.
function showOverlayHintOnce() {
  if (!overlayHint || boxTapHintSeen() || contributorMode) {
    return;
  }
  overlayHint.hidden = false;
  document.body.classList.add("hasOverlayHint");
  redrawActiveDetections();
}

function dismissOverlayHint() {
  if (!overlayHint || overlayHint.hidden) {
    return;
  }
  overlayHint.hidden = true;
  document.body.classList.remove("hasOverlayHint");
  markBoxTapHintSeen();
  // The photo area just changed size, so the overlay has to be re-fitted to it.
  redrawActiveDetections();
}

function markBoxTapHintSeen() {
  try {
    localStorage.setItem(BOX_TAP_HINT_KEY, "1");
  } catch (error) {
    // A private-mode browser just means the hint shows again; not worth failing.
  }
}

function detectionMatchStates() {
  const states = new Map();
  let anyFits = false;

  for (const cardApi of currentResultCards) {
    if (cardApi.dismissed || !cardApi.detection) {
      continue;
    }

    const state = cardApi.filterClassName || "pending";
    if (state === "yes" || state === "conditional") {
      anyFits = true;
    }

    states.set(cardApi.detection, {
      state,
      name: cardApi.matches?.[0]?.name || "",
    });
  }

  // Applied last so a rejection always wins over whatever the matcher thought.
  for (const detection of rejectedDetections) {
    states.set(detection, { state: "rejected", name: "" });
  }

  // Greying every box when nothing fits just washes the photo out and conveys
  // nothing -- highlighting only reads as highlighting against a contrast. With
  // no winners, only user-rejected boxes are dimmed and the rest stay neutral.
  return { states, anyFits };
}

// Mirrors the transform drawDetections uses outside manual box mode, so a tap
// lands on the same box the user sees. It deliberately ignores the modifier
// zoom/pan, which only apply while editing boxes.
function overlaySourcePoint(event) {
  if (!activeSourceCanvas) {
    return null;
  }

  const rect = boxesCanvas.getBoundingClientRect();
  const sourceWidth = activeSourceCanvas.width;
  const sourceHeight = activeSourceCanvas.height;

  if (!rect.width || !rect.height || !sourceWidth || !sourceHeight) {
    return null;
  }

  const { scale, offsetX, offsetY } = overlayGeometry(
    rect.width, rect.height, sourceWidth, sourceHeight,
  );
  const x = (event.clientX - rect.left - offsetX) / scale;
  const y = (event.clientY - rect.top - offsetY) / scale;

  if (x < 0 || x > sourceWidth || y < 0 || y > sourceHeight) {
    return null;
  }

  return { x, y };
}

function cardForDetection(detection) {
  return currentResultCards.find(
    (cardApi) => cardApi.detection === detection && !cardApi.dismissed,
  ) || null;
}

function pulseDetection(detection) {
  if (!detection) {
    return;
  }

  detectionPulse = { detection, start: performance.now() };

  if (detectionPulseFrame) {
    return;
  }

  const step = () => {
    if (!detectionPulse) {
      detectionPulseFrame = 0;
      return;
    }

    if (performance.now() - detectionPulse.start >= PULSE_DURATION_MS) {
      detectionPulse = null;
      detectionPulseFrame = 0;
      redrawActiveDetections();
      return;
    }

    redrawActiveDetections();
    detectionPulseFrame = requestAnimationFrame(step);
  };

  detectionPulseFrame = requestAnimationFrame(step);
}

function drawDetectionPulse(ctx, box, elapsed, color) {
  // Rings expand outward and fade, repeating until the whole effect fades out.
  const phase = (elapsed % PULSE_CYCLE_MS) / PULSE_CYCLE_MS;
  const overallFade = Math.max(0, 1 - elapsed / PULSE_DURATION_MS);
  const spread = phase * PULSE_MAX_SPREAD;

  ctx.save();
  ctx.globalAlpha = (1 - phase) * overallFade;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4 * (1 - phase) + 1;
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.strokeRect(
    box.x - spread,
    box.y - spread,
    box.width + spread * 2,
    box.height + spread * 2,
  );
  ctx.restore();
}

function openMatchesForCard(cardApi) {
  if (!cardApi) {
    return;
  }

  showResultsPanel();
  selectMatchCard(cardApi);
  requestAnimationFrame(() => {
    cardApi.card.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  });
}

function handleDetectionTap(event) {
  if (manualBoxMode || !activeSourceCanvas?.lastDetections || !currentResultCards.length) {
    return;
  }

  const point = overlaySourcePoint(event);
  if (!point) {
    return;
  }

  const detection = findDetectionAtPoint(activeSourceCanvas.lastDetections, point);
  const cardApi = detection ? cardForDetection(detection) : null;
  if (!cardApi) {
    return;
  }

  // Tapping a box is the thing the hint was advertising, so doing it retires
  // the hint -- both the flag and whatever is still on screen.
  dismissOverlayHint();
  markBoxTapHintSeen();
  openMatchesForCard(cardApi);
}

// The title block's height varies with the status text, so the action row's
// offset is measured rather than assumed -- they must meet with no seam.
function syncTopPanelHeight() {
  const bar = document.getElementById("topBar");

  if (!bar) {
    return;
  }

  const barHeight = bar.getBoundingClientRect().height;
  // The controls row sits inside the top chrome while a scan is on screen, so
  // the photo has to clear both. Measured rather than assumed: the status line
  // wraps and the row is hidden in other modes.
  const controlsVisible = document.body.classList.contains("imagePreview")
    && !document.body.classList.contains("manualBoxMode");
  // The scan-view controls bar no longer exists; only the title bar occupies
  // the top during a scan.
  const controlsHeight = controlsVisible && controls.offsetParent
    ? controls.getBoundingClientRect().height
    : 0;
  // The filter panel is permanent chrome, so the photo has to clear it too.
  // Measured from its rect rather than offsetParent, which is null for a
  // fixed-position element and silently reported it as absent.
  const filters = document.getElementById("filterPanel");
  const filtersHeight = filters ? filters.getBoundingClientRect().height : 0;

  const next = Math.round(barHeight + controlsHeight + filtersHeight);
  const previous = document.documentElement.style.getPropertyValue("--topchrome-height");

  document.documentElement.style.setProperty("--topbar-height", `${Math.round(barHeight)}px`);
  document.documentElement.style.setProperty("--topchrome-height", `${next}px`);

  // Changing the chrome height resizes the photo, so the overlay has to be
  // remeasured against it or the boxes keep the old geometry.
  if (previous !== `${next}px`) {
    requestAnimationFrame(redrawActiveDetections);
  }
}

function updateBoxInteractivity() {
  const interactive = Boolean(
    !manualBoxMode
    && currentResultCards.length
    && activeSourceCanvas?.lastDetections?.length,
  );
  document.body.classList.toggle("boxesInteractive", interactive);
}

function redrawActiveDetections() {
  updateBoxInteractivity();

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
    // Only box editing uses selection to restyle the overlay now, so there is
    // nothing to pass outside it.
    manualBoxMode ? selectedBoxEdit?.draft || null : null,
  );
  positionBoxEditActions();
}

function drawDetections(detections, sourceCanvas, displayElement, selectedDetection = null) {
  // Clear the inline sizing from the previous pass first. It is set below and
  // would otherwise override the stylesheet, pinning the canvas to whatever
  // size it happened to be drawn at before the layout changed around it.
  boxesCanvas.style.width = "";
  boxesCanvas.style.height = "";

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

  const { scale, offsetX, offsetY } = overlayGeometry(
    displayWidth, displayHeight, sourceWidth, sourceHeight,
  );
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
  // Boxes borrow the match cards' colour language so a highlighted box and its
  // card are recognisably the same thing.
  const fitStroke = cssValue(styles, "--success", "#8ea2ff");
  const mutedStroke = resolvedTheme === "light" ? "#3a3c4a" : "#c4cade";
  // A contrast halo under the muted outline, so a filtered-out box stays
  // legible over both dark and pale box art rather than only one.
  const mutedHalo = resolvedTheme === "light"
    ? "rgba(255, 255, 255, 0.5)"
    : "rgba(0, 0, 0, 0.45)";
  const matchStates = manualBoxMode ? null : detectionMatchStates();
  // Label rects already drawn this pass, used to keep names from overlapping.
  const placedLabels = [];
  let pulseBox = null;

  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.font = "800 13px system-ui, sans-serif";
  ctx.textBaseline = "middle";

  // Every box in screen space, up front, so label placement can treat them as
  // obstacles. The draw loop computes these one at a time, which is too late --
  // a label is placed before the boxes below it have been measured.
  const boxRects = detections.map((entry) => ({
    detection: entry,
    x: entry.x * scale + offsetX,
    y: entry.y * scale + offsetY,
    width: entry.width * scale,
    height: entry.height * scale,
  }));

  for (const detection of detections) {
    const selected = detection === selectedDetection;
    // Outside box editing, selection no longer restyles the overlay: the filter
    // status owns how a box looks, and "Show in picture" points with a pulse
    // instead. In manual box mode selection still drives the edit affordances.
    const focused = manualBoxMode && selected;
    const dimUnselected = manualBoxMode && selectedDetection && !selected;
    const x = detection.x * scale + offsetX;
    const y = detection.y * scale + offsetY;
    const width = detection.width * scale;
    const height = detection.height * scale;
    let rawLabel = detection.dino
      ? `DINO ${detection.score.toFixed(2)}`
      : detection.manual
      ? "Manual"
      : `${detection.score.toFixed(2)}`;
    if (detectionPulse && detection === detectionPulse.detection) {
      pulseBox = { x, y, width, height };
    }

    const matchInfo = matchStates ? matchStates.states.get(detection) : null;
    let matchState = matchInfo ? matchInfo.state : null;

    // With nothing to contrast against, dimming everything says nothing -- so
    // only the boxes the user explicitly rejected stay dimmed.
    if (matchState && !matchStates.anyFits && matchState !== "rejected") {
      matchState = null;
    }

    const boxGradient = ctx.createLinearGradient(x, y, x + width, y + height);
    let boxLineWidth = focused ? 5 : 3;
    let stateAlpha = 1;
    let fits = false;
    let greyed = false;

    if (detection.dino) {
      boxGradient.addColorStop(0, "#d946ef");
      boxGradient.addColorStop(1, "#f0abfc");
    } else if (matchState === "yes" || matchState === "conditional") {
      // A confident, filter-passing match is the whole point of the scan, so it
      // gets a deliberately louder treatment than a box that is merely a box.
      boxGradient.addColorStop(0, matchState === "yes" ? fitStroke : boxEnd);
      boxGradient.addColorStop(1, matchState === "yes" ? boxEnd : boxStart);
      boxLineWidth = 6;
      fits = true;
    } else if (matchState === "unknown") {
      // Matched, but not confidently enough to judge against the filters. Kept
      // in the neutral colour rather than the excluded grey -- this is "not yet
      // decided", not "ruled out" -- and left visible enough that the dashed
      // edge actually registers. A dash alone at excluded-grey alpha was
      // imperceptible.
      boxGradient.addColorStop(0, boxStart);
      boxGradient.addColorStop(1, boxEnd);
      boxLineWidth = focused ? 5 : 3;
      stateAlpha = 0.55;
    } else if (matchState === "rejected" || matchState === "no") {
      // The outline keeps the accent colour -- the box was still found -- and
      // the greying happens inside it, over the art, rather than by fading the
      // outline until it disappears.
      boxGradient.addColorStop(0, boxStart);
      boxGradient.addColorStop(1, boxEnd);
      boxLineWidth = focused ? 5 : 2;
      stateAlpha = 0.8;
      greyed = true;
    } else {
      // Detected, still unresolved: present but visually quiet.
      boxGradient.addColorStop(0, boxStart);
      boxGradient.addColorStop(1, boxEnd);
      boxLineWidth = focused ? 5 : 2;
      stateAlpha = matchState === "pending" ? 0.6 : 0.75;
    }

    // Name the game on a box that matched. A bare detector score is the least
    // useful thing to show once we know what the box actually is. Greyed-out
    // boxes keep the score so they stay visually quiet.
    const named = Boolean(fits && matchInfo && matchInfo.name);
    if (named) {
      rawLabel = matchInfo.name;
    }

    ctx.save();
    // A selected box is always fully visible, even if its game was filtered out.
    ctx.globalAlpha = focused ? 1 : (dimUnselected ? 0.35 : stateAlpha);

    // "Too uncertain to judge" and "judged, and excluded" are opposite facts
    // that both used to render as the same grey. A dashed edge distinguishes
    // the unknown ones, so widening the filters has a visible target.
    if (matchState === "unknown") {
      ctx.setLineDash([8, 6]);
    }

    // Matched boxes are deliberately not filled -- a wash over the cover veils
    // the very artwork the user is checking the match against. The emphasis
    // comes from border weight, a dark contrast halo, and glow instead.
    if (focused) {
      ctx.fillStyle = resolvedTheme === "light"
        ? "rgba(62, 99, 255, 0.13)"
        : "rgba(113, 139, 255, 0.16)";
      ctx.fillRect(x, y, width, height);
    }

    if (greyed) {
      // A wash over the box art: reads as "found, but not for you" without
      // hiding what the box is.
      ctx.fillStyle = resolvedTheme === "light"
        ? "rgba(126, 128, 142, 0.46)"
        : "rgba(12, 14, 26, 0.52)";
      ctx.fillRect(x, y, width, height);
    }

    if (fits) {
      // Sits under the bright border so it stays legible over pale box art.
      ctx.strokeStyle = resolvedTheme === "light"
        ? "rgba(12, 14, 32, 0.34)"
        : "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = boxLineWidth + 4;
      ctx.strokeRect(x, y, width, height);
    }

    if (focused || fits) {
      ctx.shadowColor = fits ? fitStroke : boxEnd;
      ctx.shadowBlur = fits ? 26 : 18;
    }

    ctx.strokeStyle = boxGradient;
    ctx.lineWidth = boxLineWidth;
    ctx.strokeRect(x, y, width, height);
    ctx.shadowBlur = 0;

    // A greyed box carries no useful text. Its only available label would be the
    // detector's box-confidence, which says nothing about which game it is --
    // the most prominent number on a dimmed box would mean nothing to a player.
    // The outline alone already reads as "found something, not for you".
    // Outside box editing a box is labelled with a game name or with nothing at
    // all. The only other text available is the detector's box-confidence --
    // the noise B2 removed from greyed boxes, which was still reaching the
    // player by two other routes: every box while the matcher was still
    // working, and every box in a scan where nothing fits (the `anyFits` reset
    // above rewrites those states to null before they can be checked here).
    // Naming the condition rather than the states closes both at once.
    // DINO and manual boxes keep their labels -- those name what the box is
    // rather than scoring what it might be, and they only appear for a
    // contributor who asked for them.
    const unnamedScore = !named && !detection.dino && !detection.manual;
    const quietState = unnamedScore
      || matchState === "no"
      || matchState === "rejected"
      || matchState === "unknown";

    // A detection clipped by the frame edge would otherwise strand its label
    // over empty letterbox with no box beneath it.
    const photoLeft = offsetX;
    const photoTop = offsetY;
    const photoRight = offsetX + sourceWidth * scale;
    const photoBottom = offsetY + sourceHeight * scale;
    const visibleWidth = Math.max(0, Math.min(x + width, photoRight) - Math.max(x, photoLeft));
    const visibleHeight = Math.max(0, Math.min(y + height, photoBottom) - Math.max(y, photoTop));
    const visibleFraction = width * height > 0
      ? (visibleWidth * visibleHeight) / (width * height)
      : 0;

    // Never skip in box-editing mode -- the loop still has to draw drag handles.
    if (!manualBoxMode && (quietState || visibleFraction < 0.4)) {
      ctx.restore();
      continue;
    }

    const labelPaddingX = 7;
    const labelHeight = 22;
    // Game names run much wider than a bare score, so cap them rather than let
    // one name span the photo.
    const labelMaxWidth = Math.max(
      24,
      Math.min(displayWidth - labelPaddingX * 2, displayWidth * 0.6),
    );
    const label = fitOverlayLabel(ctx, rawLabel, labelMaxWidth);
    const labelWidth = Math.ceil(ctx.measureText(label).width) + labelPaddingX * 2;
    // Confine labels to the photo itself rather than the whole canvas, so none
    // of them land in the letterbox bars above or below it.
    const labelMinX = Math.max(0, photoLeft);
    const labelMinY = Math.max(0, photoTop);
    const maxLabelX = Math.max(labelMinX, Math.min(displayWidth, photoRight) - labelWidth);
    const maxLabelY = Math.max(labelMinY, Math.min(displayHeight, photoBottom) - labelHeight);
    // Labels used to avoid each other and nothing else, which on a stack of
    // boxes lying shoulder to shoulder meant every label cleared its neighbours
    // and then sat squarely on the next box's cover art -- "Verdant" over
    // Santorini, "Juicy Fruits" over Clank!. That defeats the reason the
    // highlight is unfilled in the first place: the art it is being checked
    // against has to stay visible. Boxes are obstacles now, not just labels.
    const clampX = (candidate) => Math.min(Math.max(labelMinX, candidate), maxLabelX);
    const clampY = (candidate) => Math.min(Math.max(labelMinY, candidate), maxLabelY);
    const overlap = (ax, ay, bx, by, bw, bh) => {
      const ox = Math.max(0, Math.min(ax + labelWidth, bx + bw) - Math.max(ax, bx));
      const oy = Math.max(0, Math.min(ay + labelHeight, by + bh) - Math.max(ay, by));
      return ox * oy;
    };

    // Above the box first -- that is where a label belongs when there is room.
    // The rest are fallbacks in descending order of how well they read.
    const candidates = [];
    for (const cx of [
      clampX(x),
      clampX(x + width - labelWidth),
      clampX(x + (width - labelWidth) / 2),
    ]) {
      candidates.push(
        { x: cx, y: clampY(y - labelHeight - 5) },
        { x: cx, y: clampY(y + height + 5) },
        { x: cx, y: clampY(y + 4) },
        { x: cx, y: clampY(y + height - labelHeight - 4) },
      );
    }

    // Beside the stack. On a bag or a shelf the boxes pile up vertically with
    // their bounding rects overlapping each other, so there can be no gap above
    // or below any of them -- but there is usually clear space to one side, and
    // a label there covers no art at all.
    const besideY = clampY(y + (height - labelHeight) / 2);
    candidates.push(
      { x: clampX(x - labelWidth - 6), y: besideY },
      { x: clampX(x + width + 6), y: besideY },
    );

    let best = null;
    for (const candidate of candidates) {
      let cost = 0;
      for (const placed of placedLabels) {
        // Two labels on top of each other is the one thing worse than a label
        // on the art, so this dominates everything else in the score.
        cost += overlap(candidate.x, candidate.y, placed.x, placed.y, placed.width, labelHeight) * 40;
      }
      for (const box of boxRects) {
        const area = overlap(candidate.x, candidate.y, box.x, box.y, box.width, box.height);
        // Covering a slice of its own box is a fair price for staying near it;
        // covering someone else's is the thing being avoided.
        cost += box.detection === detection ? area * 0.12 : area;
      }
      if (!best || cost < best.cost) {
        best = { ...candidate, cost };
      }
    }

    const labelX = best.x;
    const labelY = best.y;

    placedLabels.push({ x: labelX, y: labelY, width: labelWidth });

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

  // Drawn last so the rings sit above every box rather than being overpainted
  // by a neighbour drawn after them.
  if (pulseBox && detectionPulse) {
    drawDetectionPulse(
      ctx,
      pulseBox,
      performance.now() - detectionPulse.start,
      fitStroke,
    );
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

function showResultShell() {
  // The matches strip is permanent while results exist. The photo is resized to
  // sit above it rather than behind it, so nothing needs to be dismissed to see
  // the picture.
  resultsPanel.hidden = false;
  showMatchesButton.hidden = true;
  document.body.classList.add("hasResults");
  // The strip opens before a single crop has been matched, so the only honest
  // thing it can say is that it is working. It used to open on a bare box count
  // sitting where the verdict goes, which reads as a verdict.
  resultCount.textContent = "Loading...";
  setResultsNotice("");
  // The photo box just changed size, so the overlay has to be remeasured.
  requestAnimationFrame(redrawActiveDetections);
}

// Retained because box editing hides the strip entirely; ordinary use never
// closes it.
function hideResultsPanel() {
  resultsPanel.hidden = true;
  showMatchesButton.hidden = true;
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
    // Anything the player called wrong goes to the end, past even the cards
    // still waiting on the matcher.
    const wrongDifference = Number(left.dataset.wrong === "yes")
      - Number(right.dataset.wrong === "yes");

    if (wrongDifference !== 0) {
      return wrongDifference;
    }

    const fitDifference = Number(right.dataset.fit || 0) - Number(left.dataset.fit || 0);

    if (fitDifference !== 0) {
      return fitDifference;
    }

    // Within one fit rank, the matcher's confidence decides the order.
    return Number(right.dataset.score) - Number(left.dataset.score);
  });
  resultsGrid.replaceChildren(...cards);
}

// Cards still waiting on the matcher. A card that failed outright is not
// pending -- it has its answer, and the answer is that there isn't one.
function pendingResultCards() {
  return currentResultCards.filter(
    (card) => !card.matches.length && !card.matchFailed,
  ).length;
}

function updateResultStats() {
  refreshBestPlayerCountAvailability();

  if (!currentResultCards.length) {
    return;
  }

  // Cards are matched one request at a time, so a count published mid-scan
  // starts at zero and climbs. "0 of 5 fit your filters" is a statement about
  // the filters, and while the matcher is still working it is not a true one --
  // the boxes are simply not answered for yet.
  if (pendingResultCards()) {
    resultCount.textContent = "Loading...";
    return;
  }

  const filters = getFilters();
  const matched = currentResultCards.filter((card) => card.fitsFilters).length;
  const checked = currentResultCards.filter(
    (card) => !card.markedWrong && (card.matches.length || card.matchFailed),
  ).length;

  // Reads as a statement about the scan rather than a bare ratio, so the
  // follow-up question beside it lands as part of the same thought.
  resultCount.textContent = filters.hasAny
    ? `${matched} of ${currentResultCards.length} fit your filters`
    : `${checked} of ${currentResultCards.length} recognised`;

  // Only once the scan has actually answered: a legend explaining highlighted
  // versus grey means nothing while every box is still waiting.
  showOverlayHintOnce();
}

// The matches panel now stays closed after a scan, so its "2/5 fit" counter is
// out of sight. Without this the screen just shows mostly-grey boxes and reads
// as a failed scan rather than as filters doing their job.
function filterOutcomeSummary() {
  const total = currentResultCards.length;

  if (!total) {
    return "";
  }

  if (pendingResultCards()) {
    return "";
  }

  if (!getFilters().hasAny) {
    const identified = currentResultCards.filter(
      (card) => !card.markedWrong && card.matches.length,
    ).length;
    return identified
      ? `Recognised ${identified} of ${total}.`
      : `Found ${total} box${total === 1 ? "" : "es"}, none recognised.`;
  }

  const matched = currentResultCards.filter((card) => card.fitsFilters).length;

  if (!matched) {
    // Phrased without reference to the Filters button, since the panel may
    // already be open.
    return `None of the ${total} fit your filters. Adjust them to find a match.`;
  }

  return `${matched} of ${total} fit your filters.`;
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
  document.body.classList.remove("boxesInteractive");
  applyModifierZoom();
  collapseExpandedCard();
  currentResultCards = [];
  document.body.classList.remove("hasResults");
  rejectedDetections.clear();
  detectionPulse = null;
  if (detectionPulseFrame) {
    cancelAnimationFrame(detectionPulseFrame);
    detectionPulseFrame = 0;
  }
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
  // Only on a mode *transition*, never on the repeated calls in between --
  // otherwise this would keep reopening a panel the user just closed.
  if (imageModeActive !== filterImageModeActive) {
    setFilterPanelOpen(!filterPanelDismissedByUser);
  }
  filterImageModeActive = imageModeActive;
  filterVisibilityButton.hidden = manualBoxMode;
  backButton.hidden = !imagePreviewActive || manualBoxMode;
  missingBoxesButton.hidden = !imagePreviewActive || manualBoxMode;
  requestAnimationFrame(syncTopPanelHeight);
  // Flow A: tapping the status line toggles the action row on touch, where
  // there is no hover.
  if (!topBarToggleBound) {
    topBarToggleBound = true;
    document.getElementById("topBar")?.addEventListener("click", (event) => {
      if (event.target.closest("button")) {
        return;
      }
      document.body.classList.toggle("chromeOpen");
      requestAnimationFrame(syncTopPanelHeight);
    });
  }

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
  youngestAgeFilter.disabled = !enabled;
  for (const input of [timeRangeMin, timeRangeMax, weightRangeMin, weightRangeMax]) {
    input.disabled = !enabled;
  }
}

function isCameraFrameFrozen() {
  return cameraReady && activeDisplayElement === photoPreview && !photoPreview.hidden;
}

function setBackendWarning(offline) {
  if (backendWarning) {
    backendWarning.hidden = !offline;
  }
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
