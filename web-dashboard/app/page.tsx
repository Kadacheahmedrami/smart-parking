"use client"

import { useEffect, useState, useRef } from "react"
import {
  Wifi,
  WifiOff,
  Car,
  AlertTriangle,
  MapPin,
  Shield,
  Settings,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { ConnectionSetupModal } from "@/components/connection-setup-modal"
import { useHttpPolling } from "@/hooks/useHttpPolling"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@radix-ui/react-dropdown-menu"

// Simplified slot type
interface Slot {
  slotId: number
  occupied: boolean
  distance: number | null
}

export default function Dashboard() {
  const router = useRouter()

  // ESP32 IP & setup modal
  const [espIp, setEspIp] = useState<string>("")
  const [showSetupModal, setShowSetupModal] = useState(false)

  // Polling hook
  const { parkingSlots: slots, lastError, start, stop } = useHttpPolling(espIp)
  const [isLoading, setIsLoading] = useState(false)

  // Track negative distance timestamps
  const disconnectTimestamps = useRef<Record<number, number>>({})

  // Load saved ESP IP on mount
  useEffect(() => {
    const saved = localStorage.getItem("esp_ip")
    if (saved) {
      setEspIp(saved)
      start(saved)
      setIsLoading(true)
    } else {
      setShowSetupModal(true)
    }
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

  const handleChangeEspIp = () => setShowSetupModal(true)

  const handleSetupEsp = (ip: string) => {
    localStorage.setItem("esp_ip", ip)
    setEspIp(ip)
    setShowSetupModal(false)
    toast({
      title: "Starting polling",
      description: `http://${ip}/ every 1s`,
    })
    start(ip)
    setIsLoading(true)
  }

  const isConnected = !!espIp && !lastError

  // Determine slot status, including disconnection
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
                  ? `Polling http://${espIp}/ every 1s`
                  : "Not connected"}
              </p>
              {isConnected ? <Wifi className="text-green-500" /> : <WifiOff className="animate-pulse text-red-500" />}
            </div>
          </div>
          <div className="flex items-end justify-end md:items-center  gap-3">
            {!isConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSetupModal(true)}
                className="flex items-center gap-1"
              >
                <Wifi className="h-4 w-4" />
                Connect
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin")}
              className="flex items-center gap-1"
            >
              <Shield className="h-4 w-4" />
              Admin
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                  <Settings className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="z-50 w-48 rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 py-2"
              >
                <DropdownMenuItem
                  onClick={handleChangeEspIp}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
                >
                  <Settings className="h-4 w-4 text-teal-500" />
                  Change ESP32 IP
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 bg-gray-200 dark:bg-gray-700" />
                {espIp && (
                  <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    <p className="font-semibold">Current ESP32:</p>
                    <p>{espIp}</p>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
              return (
                <motion.div
                  key={slot.slotId}
                  layout
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "relative rounded-xl p-6 shadow-xl bg-white dark:bg-gray-800 transition-colors",
                    isDisconnected
                      ? "border-2 border-black  "
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
                    <MapPin className={cn("mr-2 h-5 w-5", isDisconnected ? "" : "text-gray-500")} />
                    <span className={cn("text-sm", isDisconnected ? "" : "text-gray-600")}>                  
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
              Please connect to your ESP32 to view slots
            </p>
            <Button
              onClick={() => setShowSetupModal(true)}
              className="mt-4 bg-gradient-to-r from-teal-400 to-emerald-400 text-white.hover:from-teal-500 hover:to-emerald-500"
            >
              Set ESP32 IP
            </Button>
          </div>
        )}
      </div>

      {/* ESP IP setup dialog */}
      <ConnectionSetupModal
        isOpen={showSetupModal}
        onClose={() => {
          if (!espIp) {
            toast({
              title: "IP Required",
              description: "Enter your ESP32’s IP address to proceed.",
              variant: "destructive",
            })
          } else {
            setShowSetupModal(false)
          }
        }}
        onSave={handleSetupEsp}
        initialValue={espIp}
      />
    </div>
  )
}
