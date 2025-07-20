"use client";

import React, { useRef, useEffect } from "react";
import HandTracker from "./HandTracker";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const getWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };
    getWebcam();
    // Cleanup on unmount
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">
        AI-Powered Sign Language Interpreter
      </h1>
      <div className="rounded-lg shadow-lg bg-white dark:bg-gray-800 p-6 flex flex-col items-center">
        <HandTracker />
        <p className="text-gray-600 dark:text-gray-300 text-center">
          Allow camera access to start interpreting sign language in real time.
        </p>
      </div>
    </div>
  );
}
