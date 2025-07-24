"use client";
import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";

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

// Add this function to call the Flask API
async function getPrediction(landmarks: number[]): Promise<string | null> {
  try {
    const response = await fetch('http://localhost:5000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ landmarks }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.prediction;
  } catch (err) {
    console.error('Prediction API error:', err);
    return null;
  }
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

const SIGN_EMOJIS: Record<string, string> = {
  "A (Fist)": "✊",
  "B (Open Palm)": "🖐️",
  "C (C-shape)": "🤏",
  "V (Peace)": "✌️",
  "L (L-shape)": "🤟",
};

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
      hands = new (window as any).Hands({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
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
        let detectedLandmarks = null;
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          for (const landmarks of results.multiHandLandmarks) {
            const drawConnectors = (window as any).drawConnectors;
            const drawLandmarks = (window as any).drawLandmarks;
            const HAND_CONNECTIONS = (window as any).HAND_CONNECTIONS;
            if (drawConnectors && drawLandmarks && HAND_CONNECTIONS) {
              drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 2 });
              drawLandmarks(ctx, landmarks, { color: "#FF0000", lineWidth: 1 });
            }
            detectedLandmarks = landmarks;
            // Flatten landmarks to [x1, y1, z1, ...]
            const flatLandmarks = landmarks.flatMap((lm: any) => [lm.x, lm.y, lm.z]);
            getPrediction(flatLandmarks).then(prediction => {
              if (prediction) setSign(prediction);
              else setSign("");
            });
          }
        } else {
          setSign("");
        }
        setLastLandmarks(detectedLandmarks);
        ctx.restore();
      });
      camera = new (window as any).Camera(videoRef.current, {
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
    <div className="flex flex-col items-center w-full">
      <div className="relative w-[360px] h-[270px]">
        <video ref={videoRef} className="absolute top-0 left-0 w-full h-full" style={{ display: "none" }} />
        <canvas ref={canvasRef} width={360} height={270} className="rounded-xl shadow-lg border border-gray-300 dark:border-gray-700" />
      </div>
      <div className="mt-4 text-xl font-semibold text-blue-700 dark:text-blue-300 min-h-[2rem]">
        {sign ? `Detected Sign: ${sign}` : "Show a sign to the camera!"}
      </div>
      <div className="flex flex-wrap justify-center gap-2 mb-6 w-full max-w-xs">
        {SIGN_LABELS.map(label => (
          <div key={label} className={`flex flex-col items-center px-2 py-1 rounded-lg transition-all duration-300 ${sign === label ? "bg-blue-500 text-white scale-110 shadow-lg" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"}`}>
            <span className="text-2xl">{SIGN_EMOJIS[label]}</span>
            <span className="text-xs font-medium">{label.replace(/ \(.*/, "")}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-col items-center gap-2 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow w-full max-w-xs">
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
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-all duration-200"
          onClick={handleCapture}
          disabled={!lastLandmarks}
        >
          Capture Sample
        </button>
        <button
          className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition-all duration-200"
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