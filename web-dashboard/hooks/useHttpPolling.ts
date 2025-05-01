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
  start: (espIp: string) => void;
  stop: () => void;
}

export function useHttpPolling(initialEspIp = ""): HttpPollingReturn {
  const [parkingSlots, setParkingSlots] = useState<ParkingSlot[]>([])
  const [lastError, setLastError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const espIpRef = useRef<string>(initialEspIp)

  const fetchStatus = async () => {
    try {
      const resp = await fetch(`http://${espIpRef.current}/`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()

      if (Array.isArray(data.slots)) {
        const slots: ParkingSlot[] = data.slots.map((s: any) => ({
          slotId: s.id,
          occupied: s.occupied,
          distance: typeof s.distance_cm === 'number' ? s.distance_cm : null,
        }))
        setParkingSlots(slots)
      }

      setLastError(null)
    } catch (err: any) {
      console.error("Polling error", err)
      setLastError(err.message)
    }
  }

  const start = (espIp: string) => {
    espIpRef.current = espIp
    if (intervalRef.current) clearInterval(intervalRef.current)
    // Fetch immediately then 2 every second
    fetchStatus()
    intervalRef.current = setInterval(fetchStatus, 2000)
  }

  const stop = () => {
    if (intervalRef.current) {      
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => {
    if (initialEspIp) start(initialEspIp)
    return stop
  }, [initialEspIp])

  return { parkingSlots, lastError, start, stop }
}
