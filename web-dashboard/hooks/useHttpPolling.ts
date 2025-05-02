"use client"

import { useState, useEffect, useRef } from "react"

// Define parking-specific type with only occupied status and distance
interface ParkingSlot {
  slotId: number;
  occupied: boolean;
  distance: number | null; // distance in cm, null if invalid
}

type HttpPollingReturn = {
  parkingSlots: ParkingSlot[];
  lastError: string | null;
  start: (serverAddress: string) => void;
  stop: () => void;
}

// Helper function to determine if a string is an IP address
const isIpAddress = (address: string): boolean => {
  // Simple IPv4 validation regex
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  return ipRegex.test(address);
};

export function useHttpPolling(initialServerAddress = ""): HttpPollingReturn {
  const [parkingSlots, setParkingSlots] = useState<ParkingSlot[]>([])
  const [lastError, setLastError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const serverAddressRef = useRef<string>(initialServerAddress)

  const fetchStatus = async () => {
    try {
      const address = serverAddressRef.current;
      if (!address) {
        setLastError("No server address provided");
        return;
      }

      // Use HTTP for IP addresses and HTTPS for domains
      const protocol = isIpAddress(address) ? "http" : "https";
      const resp = await fetch(`${protocol}://${address}/`);
      
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      if (Array.isArray(data.slots)) {
        const slots: ParkingSlot[] = data.slots.map((s: any) => ({
          slotId: s.id,
          occupied: s.occupied,
          distance: typeof s.distance_cm === 'number' ? s.distance_cm : null,
        }));
        setParkingSlots(slots);
      }

      setLastError(null);
    } catch (err: any) {
      console.error("Polling error", err);
      setLastError(err.message);
    }
  };

  const start = (serverAddress: string) => {
    serverAddressRef.current = serverAddress;
    if (intervalRef.current) clearInterval(intervalRef.current);
    // Fetch immediately then every 2 seconds
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, 2000);
  };

  const stop = () => {
    if (intervalRef.current) {      
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (initialServerAddress) start(initialServerAddress);
    return stop;
  }, [initialServerAddress]);

  return { parkingSlots, lastError, start, stop };
}