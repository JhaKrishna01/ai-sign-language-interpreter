"use client";
import React, { useRef, useEffect, useState } from "react";

const HANDS_SCRIPT = "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js";
const DRAWING_SCRIPT = "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js";
const CAMERA_SCRIPT = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src=\"${src}\"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.body.appendChild(script);
  });
}

// Simple rule-based classifier for demo: recognizes 'A' (fist) and 'B' (open palm)
function classifySign(landmarks: any[]): string {
  if (!landmarks || landmarks.length !== 21) return "";
  const wrist = landmarks[0];
  const tips = [4, 8, 12, 16, 20].map(i => landmarks[i]);

  // A (Fist): All tips close to wrist
  const isFist = tips.every(tip => {
    const dx = tip.x - wrist.x;
    const dy = tip.y - wrist.y;
    return Math.sqrt(dx*dx + dy*dy) < 0.15;
  });
  if (isFist) return "A (Fist)";

  // B (Open Palm): All tips far from wrist
  const isPalm = tips.every(tip => {
    const dx = tip.x - wrist.x;
    const dy = tip.y - wrist.y;
    return Math.sqrt(dx*dx + dy*dy) > 0.25;
  });
  if (isPalm) return "B (Open Palm)";

  // C (C-shape): All tips far from wrist, but thumb tip (4) and index tip (8) are close together
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const thumbIndexDist = Math.sqrt(
    Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2)
  );
  const isC = tips.every(tip => {
    const dx = tip.x - wrist.x;
    const dy = tip.y - wrist.y;
    return Math.sqrt(dx*dx + dy*dy) > 0.18;
  }) && thumbIndexDist < 0.13;
  if (isC) return "C (C-shape)";

  // V (Peace): Index and middle fingers extended, others curled
  const indexDist = Math.sqrt(
    Math.pow(landmarks[8].x - wrist.x, 2) + Math.pow(landmarks[8].y - wrist.y, 2)
  );
  const middleDist = Math.sqrt(
    Math.pow(landmarks[12].x - wrist.x, 2) + Math.pow(landmarks[12].y - wrist.y, 2)
  );
  const ringDist = Math.sqrt(
    Math.pow(landmarks[16].x - wrist.x, 2) + Math.pow(landmarks[16].y - wrist.y, 2)
  );
  const pinkyDist = Math.sqrt(
    Math.pow(landmarks[20].x - wrist.x, 2) + Math.pow(landmarks[20].y - wrist.y, 2)
  );
  const thumbDist = Math.sqrt(
    Math.pow(landmarks[4].x - wrist.x, 2) + Math.pow(landmarks[4].y - wrist.y, 2)
  );
  const isV = indexDist > 0.22 && middleDist > 0.22 && ringDist < 0.15 && pinkyDist < 0.15 && thumbDist < 0.18;
  if (isV) return "V (Peace)";

  // L (L-shape): Thumb and index extended, others curled
  const isL = indexDist > 0.22 && thumbDist > 0.18 && middleDist < 0.15 && ringDist < 0.15 && pinkyDist < 0.15;
  if (isL) return "L (L-shape)";

  return "";
}

const SIGN_LABELS = [
  "A (Fist)",
  "B (Open Palm)",
  "C (C-shape)",
  "V (Peace)",
  "L (L-shape)"
];

const HandTracker: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<any>(null);
  const [sign, setSign] = useState("");
  const [currentLabel, setCurrentLabel] = useState(SIGN_LABELS[0]);
  const [lastLandmarks, setLastLandmarks] = useState<any[] | null>(null);
  const [dataset, setDataset] = useState<any[]>([]);

  useEffect(() => {
    let hands: any;
    let camera: any;
    let isMounted = true;
    async function setup() {
      await loadScript(HANDS_SCRIPT);
      await loadScript(DRAWING_SCRIPT);
      await loadScript(CAMERA_SCRIPT);

      if (!isMounted) return;
      // @ts-ignore
      hands = new window.Hands({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });

      hands.onResults((results: any) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        let detectedSign = "";
        let detectedLandmarks = null;
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          for (const landmarks of results.multiHandLandmarks) {
            // @ts-ignore
            window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 2 });
            // @ts-ignore
            window.drawLandmarks(ctx, landmarks, { color: "#FF0000", lineWidth: 1 });
            detectedSign = classifySign(landmarks);
            detectedLandmarks = landmarks;
          }
        }
        setSign(detectedSign);
        setLastLandmarks(detectedLandmarks);
        ctx.restore();
      });

      // @ts-ignore
      camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          await hands.send({ image: videoRef.current });
        },
        width: 360,
        height: 270,
      });
      camera.start();
      cameraRef.current = camera;
    }

    setup();

    return () => {
      isMounted = false;
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (hands) {
        hands.close();
      }
    };
  }, []);

  // Data collection handlers
  const handleCapture = () => {
    if (lastLandmarks) {
      setDataset(prev => [...prev, { label: currentLabel, landmarks: lastLandmarks }]);
    }
  };

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataset, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "sign_language_dataset.json");
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    document.body.removeChild(dlAnchor);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[360px] h-[270px]">
        <video ref={videoRef} className="absolute top-0 left-0 w-full h-full" style={{ display: "none" }} />
        <canvas ref={canvasRef} width={360} height={270} className="rounded shadow-lg border border-gray-300 dark:border-gray-700" />
      </div>
      <div className="mt-4 text-xl font-semibold text-blue-700 dark:text-blue-300 min-h-[2rem]">
        {sign ? `Detected Sign: ${sign}` : "Show a sign to the camera!"}
      </div>
      {/* Data collection UI */}
      <div className="mt-6 flex flex-col items-center gap-2 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow w-full max-w-xs">
        <label className="font-medium mb-1">Label for Data Collection:</label>
        <select
          className="p-2 rounded border border-gray-300 dark:bg-gray-900 dark:text-white"
          value={currentLabel}
          onChange={e => setCurrentLabel(e.target.value)}
        >
          {SIGN_LABELS.map(label => (
            <option key={label} value={label}>{label}</option>
          ))}
        </select>
        <button
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          onClick={handleCapture}
          disabled={!lastLandmarks}
        >
          Capture Sample
        </button>
        <button
          className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          onClick={handleDownload}
          disabled={dataset.length === 0}
        >
          Download Dataset ({dataset.length} samples)
        </button>
      </div>
    </div>
  );
};

export default HandTracker; 