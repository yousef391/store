"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 text-center">
      <h2 className="text-2xl font-bold mb-4">حدث خطأ ما</h2>
      <button
        onClick={() => reset()}
        className="px-6 py-2 bg-white text-black font-bold rounded-xl"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}
