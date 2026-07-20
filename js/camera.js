let currentStream = null;
let currentDeviceId = null;
let preferredFacingMode = "environment";

export async function startCamera(video, options = {}) {
  const stream = await openCameraStream(options);

  stopCurrentStream();
  currentStream = stream;
  video.srcObject = stream;

  await playVideo(video);

  const [track] = stream.getVideoTracks();
  const settings = track?.getSettings?.() || {};

  currentDeviceId = settings.deviceId || currentDeviceId;
  preferredFacingMode = settings.facingMode || options.facingMode || preferredFacingMode;

  console.log("Camera settings:", settings);
  return settings;
}

export async function switchCamera(video) {
  preferredFacingMode = preferredFacingMode === "environment" ? "user" : "environment";
  return startCamera(video, {
    facingMode: preferredFacingMode,
    exactFacingMode: true,
  });
}

async function openCameraStream({
  deviceId,
  facingMode = preferredFacingMode,
  exactFacingMode = false,
} = {}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera API is unavailable in this browser context.");
  }

  const videoConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };

  if (deviceId) {
    videoConstraints.deviceId = { exact: deviceId };
  } else {
    videoConstraints.facingMode = exactFacingMode ? { exact: facingMode } : { ideal: facingMode };
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: false,
    });
  } catch (err) {
    console.warn("Preferred camera failed:", err);

    if (exactFacingMode && !deviceId) {
      return navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: { ideal: facingMode },
        },
        audio: false,
      });
    }

    console.warn("Falling back to any video input.");

    return navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
  }
}

function playVideo(video) {
  return new Promise((resolve) => {
    video.onloadedmetadata = async () => {
      await video.play();
      resolve();
    };
  });
}

function stopCurrentStream() {
  if (!currentStream) {
    return;
  }

  for (const track of currentStream.getTracks()) {
    track.stop();
  }

  currentStream = null;
}
