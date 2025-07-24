"use client";

import React, { useRef, useEffect } from "react";
import HandTracker from "./HandTracker";
import { FaRegHandPeace } from "react-icons/fa";

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
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-blue-100 via-purple-100 to-pink-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-500">
      <header className="w-full flex flex-col items-center py-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl text-blue-600 dark:text-blue-400 drop-shadow-lg"><FaRegHandPeace /></span>
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 dark:from-blue-300 dark:via-purple-300 dark:to-pink-300 drop-shadow-lg">
            AI Sign Language Interpreter
          </h1>
        </div>
        <p className="text-lg text-gray-700 dark:text-gray-300 text-center max-w-xl">
          Real-time sign language recognition powered by AI. Allow camera access and show your hand sign to get started!
        </p>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 rounded-2xl shadow-2xl p-8 w-full max-w-2xl flex flex-col items-center border border-gray-200 dark:border-gray-700">
          <HandTracker />
        </div>
      </main>
      <footer className="w-full py-4 flex flex-col items-center text-gray-500 dark:text-gray-400 text-sm">
        <span>Made with <span className="text-pink-500">♥</span> for inclusive communication</span>
        <span className="mt-1">&copy; {new Date().getFullYear()} AI Sign Language Interpreter</span>
      </footer>
    </div>
  );
}
