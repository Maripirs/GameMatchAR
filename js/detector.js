import { canvasToTensor, letterbox, YOLO_INPUT_SIZE } from "./preprocess.js";

const MODEL_PATH = "./models/board-game-box.onnx";

export class Detector {
    constructor() {
        this.session = null;
        this.ortRuntime = null;
        this.loadPromise = null;
    }

    async load() {
        if (this.loadPromise) {
            return this.loadPromise;
        }

        this.loadPromise = this.loadModel();
        return this.loadPromise;
    }

    async loadModel() {
        this.ortRuntime = await this.getOrt();
        this.session = await this.ortRuntime.InferenceSession.create(MODEL_PATH, {
            executionProviders: ["wasm"],
        });

        console.log("YOLO model loaded");
        console.log("Inputs:", this.session.inputNames);
        console.log("Outputs:", this.session.outputNames);
    }

    async detect(sourceCanvas) {
        if (!this.session) {
            await this.load();
        }

        const inputName = this.session.inputNames[0];
        const letterboxed = letterbox(sourceCanvas, YOLO_INPUT_SIZE);
        const tensor = canvasToTensor(letterboxed.canvas, this.ortRuntime, YOLO_INPUT_SIZE);

        console.log("Input tensor shape:", tensor.dims);
        console.log("Letterbox:", {
            scale: letterboxed.scale,
            dx: letterboxed.dx,
            dy: letterboxed.dy,
        });

        const results = await this.session.run({
            [inputName]: tensor,
        });

        this.logOutputDims(results);

        const outputName = this.session.outputNames[0];
        const detections = this.parseOutput(results[outputName], letterboxed, {
            sourceWidth: sourceCanvas.width,
            sourceHeight: sourceCanvas.height,
        });

        console.log("Top detections:", detections.slice(0, 10));
        return detections;
    }

    parseOutput(output, letterboxed, source, confidenceThreshold = 0.25) {
        const rows = this.getOutputRows(output);
        const detections = [];

        for (const row of rows) {
            if (row.length < 5) {
                continue;
            }

            const x = row[0];
            const y = row[1];
            const w = row[2];
            const h = row[3];

            let bestScore = 0;
            let bestClass = 0;

            for (let classId = 0; classId < row.length - 4; classId++) {
                const score = row[classId + 4];

                if (score > bestScore) {
                    bestScore = score;
                    bestClass = classId;
                }
            }

            if (bestScore >= confidenceThreshold) {
                detections.push(
                    this.toSourceDetection({
                        x,
                        y,
                        w,
                        h,
                        score: bestScore,
                        classId: bestClass,
                        letterboxed,
                        source,
                    })
                );
            }
        }

        detections.sort((a, b) => b.score - a.score);
        return this.nonMaxSuppression(detections);
    }

    getOutputRows(output) {
        const data = output.data;
        const dims = output.dims;

        if (dims.length !== 3 || dims[0] !== 1) {
            throw new Error(`Unexpected YOLO output shape: ${dims.join("x")}`);
        }

        const dim1 = dims[1];
        const dim2 = dims[2];
        const rows = [];

        if (dim1 < dim2) {
            for (let box = 0; box < dim2; box++) {
                const row = [];

                for (let value = 0; value < dim1; value++) {
                    row.push(data[value * dim2 + box]);
                }

                rows.push(row);
            }
        } else {
            for (let box = 0; box < dim1; box++) {
                const offset = box * dim2;
                rows.push(data.slice(offset, offset + dim2));
            }
        }

        return rows;
    }

    toSourceDetection({ x, y, w, h, score, classId, letterboxed, source }) {
        const x1 = (x - w / 2 - letterboxed.dx) / letterboxed.scale;
        const y1 = (y - h / 2 - letterboxed.dy) / letterboxed.scale;
        const x2 = (x + w / 2 - letterboxed.dx) / letterboxed.scale;
        const y2 = (y + h / 2 - letterboxed.dy) / letterboxed.scale;

        const left = clamp(x1, 0, source.sourceWidth);
        const top = clamp(y1, 0, source.sourceHeight);
        const right = clamp(x2, 0, source.sourceWidth);
        const bottom = clamp(y2, 0, source.sourceHeight);

        return {
            x: left,
            y: top,
            width: right - left,
            height: bottom - top,
            score,
            classId,
        };
    }

    nonMaxSuppression(detections, iouThreshold = 0.45, maxDetections = 100) {
        const selected = [];

        for (const detection of detections) {
            const overlapsSelected = selected.some((selectedDetection) => {
                return (
                    selectedDetection.classId === detection.classId &&
                    intersectionOverUnion(detection, selectedDetection) > iouThreshold
                );
            });

            if (!overlapsSelected) {
                selected.push(detection);
            }

            if (selected.length >= maxDetections) {
                break;
            }
        }

        return selected;
    }

    logOutputDims(results) {
        for (const outputName of this.session.outputNames) {
            const output = results[outputName];

            if (output) {
                console.log(`Output ${outputName} dims:`, output.dims);
            }
        }
    }

    async getOrt() {
        if (globalThis.ort) {
            return globalThis.ort;
        }

        const startedAt = performance.now();

        while (!globalThis.ort && performance.now() - startedAt < 15000) {
            await sleep(50);
        }

        if (!globalThis.ort) {
            throw new Error("onnxruntime-web did not load.");
        }

        return globalThis.ort;
    }
}

function sleep(ms) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function intersectionOverUnion(a, b) {
    const aRight = a.x + a.width;
    const aBottom = a.y + a.height;
    const bRight = b.x + b.width;
    const bBottom = b.y + b.height;

    const intersectionLeft = Math.max(a.x, b.x);
    const intersectionTop = Math.max(a.y, b.y);
    const intersectionRight = Math.min(aRight, bRight);
    const intersectionBottom = Math.min(aBottom, bBottom);

    const intersectionWidth = Math.max(0, intersectionRight - intersectionLeft);
    const intersectionHeight = Math.max(0, intersectionBottom - intersectionTop);
    const intersectionArea = intersectionWidth * intersectionHeight;
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    const unionArea = areaA + areaB - intersectionArea;

    if (unionArea <= 0) {
        return 0;
    }

    return intersectionArea / unionArea;
}
