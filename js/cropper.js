export function cropDetection(sourceCanvas, detection) {
  const sourceWidth = sourceCanvas.width;
  const sourceHeight = sourceCanvas.height;

  const left = Math.floor(clamp(detection.x, 0, sourceWidth));
  const top = Math.floor(clamp(detection.y, 0, sourceHeight));
  const right = Math.ceil(clamp(detection.x + detection.width, 0, sourceWidth));
  const bottom = Math.ceil(clamp(detection.y + detection.height, 0, sourceHeight));

  const cropWidth = Math.max(1, right - left);
  const cropHeight = Math.max(1, bottom - top);

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = cropWidth;
  cropCanvas.height = cropHeight;

  const ctx = cropCanvas.getContext("2d");
  ctx.drawImage(
    sourceCanvas,
    left,
    top,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  return cropCanvas;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
