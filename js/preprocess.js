export const YOLO_INPUT_SIZE = 640;

export function letterbox(sourceCanvas, size = YOLO_INPUT_SIZE) {
    const sourceWidth = sourceCanvas.width;
    const sourceHeight = sourceCanvas.height;

    if (!sourceWidth || !sourceHeight) {
        throw new Error("Source canvas has no dimensions.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgb(114,114,114)";
    ctx.fillRect(0, 0, size, size);

    const scale = Math.min(size / sourceWidth, size / sourceHeight);
    const resizedWidth = Math.round(sourceWidth * scale);
    const resizedHeight = Math.round(sourceHeight * scale);

    const dx = Math.round((size - resizedWidth) / 2 - 0.1);
    const dy = Math.round((size - resizedHeight) / 2 - 0.1);

    ctx.drawImage(
        sourceCanvas,
        0,
        0,
        sourceWidth,
        sourceHeight,
        dx,
        dy,
        resizedWidth,
        resizedHeight
    );

    return { canvas, scale, dx, dy };
}

export function canvasToTensor(canvas, ortRuntime = globalThis.ort, size = YOLO_INPUT_SIZE) {
    if (!ortRuntime) {
        throw new Error("onnxruntime-web is not loaded.");
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, size, size).data;
    const planeSize = size * size;
    const input = new Float32Array(3 * planeSize);

    for (let pixel = 0, rgba = 0; pixel < planeSize; pixel++, rgba += 4) {
        input[pixel] = imageData[rgba] / 255;
        input[pixel + planeSize] = imageData[rgba + 1] / 255;
        input[pixel + planeSize * 2] = imageData[rgba + 2] / 255;
    }

    return new ortRuntime.Tensor("float32", input, [1, 3, size, size]);
}
