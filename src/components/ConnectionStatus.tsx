"use client";

import React, { useEffect, useState } from "react";

export default function ConnectionStatus() {
  const [online, setOnline] = useState<boolean>(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
      {!online && (
        <div className="rounded-lg bg-yellow-500 px-3 py-2 text-xs font-medium text-white shadow-lg">
          ⚠️ Offline - changes will sync when back online
        </div>
      )}
    </div>
  );
}


