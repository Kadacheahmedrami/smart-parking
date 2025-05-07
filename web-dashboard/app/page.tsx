"use client"

import { useEffect, useState, useRef } from "react"
import {
  Wifi,
  WifiOff,
  Car,
  AlertTriangle,
  MapPin,
  Shield,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useHttpPolling } from "@/hooks/useHttpPolling"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

// Fixed URL for polling
const FIXED_API_URL = "https://cologne-mutual-carnival-constantly.trycloudflare.com"

// Simplified slot type
interface Slot {
  slotId: number
  occupied: boolean
  distance: number | null
}

export default function Dashboard() {
  const router = useRouter()

  // Polling hook
  const { parkingSlots: slots, lastError, start, stop } = useHttpPolling(FIXED_API_URL)
  const [isLoading, setIsLoading] = useState(false)

  // Track negative distance timestamps
  const disconnectTimestamps = useRef<Record<number, number>>({})

  // Start polling on mount
  useEffect(() => {
    start(FIXED_API_URL)
    setIsLoading(true)
  }, [start])

  // Show errors as toast
  useEffect(() => {
    if (lastError) {
      toast({
        title: "Polling Error",
        description: lastError,
        variant: "destructive",
      })
      setIsLoading(false)
    } else {
      setIsLoading(false)
    }
  }, [lastError])

  const isConnected = !lastError

  // Determine slot status, including disconnection and danger
  const getSlotStatus = (slot: Slot) => {
    const now = Date.now()
    if (slot.distance !== null && slot.distance < 0) {
      // record first negative timestamp
      if (!disconnectTimestamps.current[slot.slotId]) {
        disconnectTimestamps.current[slot.slotId] = now
      }
      // if negative for > 3s, treat as disconnected
      if (now - disconnectTimestamps.current[slot.slotId] > 1000) {
        return 'disconnected'
      }
    } else {
      // reset if valid distance
      delete disconnectTimestamps.current[slot.slotId]
    }
    
    // Check for danger zone (distance between 1 and 5 cm)
    if (slot.distance !== null && slot.distance >= 1 && slot.distance <= 5) {
      return 'danger'
    }
    
    return slot.occupied ? 'occupied' : 'vacant'
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <Toaster />
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <header className="mb-8 flex flex-col-reverse gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <h1 className="text-4xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
              Smart Parking Dashboard
            </h1>
            <div className="flex items-center justify-center md:justify-start gap-2 text-gray-600 dark:text-gray-400">
              <p className="font-medium">
                {isConnected
                  ? `Connected to API`
                  : "Connection error"}
              </p>
              {isConnected ? <Wifi className="text-green-500" /> : <WifiOff className="animate-pulse text-red-500" />}
            </div>
          </div>
          <div className="flex items-end justify-end md:items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin")}
              className="flex items-center gap-1"
            >
              <Shield className="h-4 w-4" />
              Admin
            </Button>
          </div>
        </header>

        {/* Error banner */}
        {lastError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Polling Error</AlertTitle>
            <AlertDescription>{lastError}</AlertDescription>
          </Alert>
        )}

        {/* Parking grid */}
        {isConnected ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {slots.map((slot) => {
              const status = getSlotStatus(slot)
              const isDisconnected = status === 'disconnected'
              const isDanger = status === 'danger'
              return (
                <motion.div
                  key={slot.slotId}
                  layout
                  initial={{ opacity: 0.8 }}
                  animate={{ 
                    opacity: 1
                  }}
                  transition={{ 
                    duration: 0.2
                  }}
                  className={cn(
                    "relative rounded-xl p-6 shadow-xl dark:bg-gray-800 transition-colors",
                    isDisconnected
                      ? "border-2 border-black"
                      : isDanger
                      ? "border-2 border-yellow-500 bg-red-600 text-white"
                      : status === "occupied"
                      ? "border-2 border-red-400"
                      : "border-2 border-emerald-400"
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Slot #{slot.slotId}</h2>
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full",
                        isDisconnected
                          ? "bg-black"
                          : isDanger
                          ? "bg-white"
                          : status === "occupied"
                          ? "bg-red-500"
                          : "bg-emerald-500"
                      )}
                    />
                  </div>
                  <div className="flex items-center mb-3">
                    <Car
                      className={cn(
                        "mr-2 h-5 w-5",
                        isDisconnected
                          ? ""
                          : isDanger
                          ? ""
                          : status === "occupied"
                          ? "text-red-500"
                          : "text-emerald-500"
                      )}
                    />
                    <span className="font-medium capitalize">
                      {isDisconnected ? 'Not connected' : status}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className={cn(
                      "mr-2 h-5 w-5", 
                      isDisconnected 
                        ? "" 
                        : isDanger 
                        ? "" 
                        : "text-gray-500"
                    )} />
                    <span className={cn(
                      "text-sm", 
                      isDisconnected 
                        ? "" 
                        : isDanger 
                        ? " font-semibold" 
                        : "text-gray-600"
                    )}>                  
                      Distance: {isDisconnected || slot.distance === null ? "N/A" : `${slot.distance.toFixed(1)} cm`}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <WifiOff className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Having trouble connecting to the API
            </p>
            <Button
              onClick={() => {
                stop()
                start(FIXED_API_URL)
                setIsLoading(true)
                toast({
                  title: "Reconnecting",
                  description: "Attempting to reconnect to the API"
                })
              }}
              className="mt-4 bg-gradient-to-r from-teal-400 to-emerald-400 text-white hover:from-teal-500 hover:to-emerald-500"
            >
              Retry Connection
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}