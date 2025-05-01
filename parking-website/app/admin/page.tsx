"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Wifi, WifiOff, Settings, LogOut } from "lucide-react"
import { useHttpPolling } from "@/hooks/useHttpPolling"
import { ConnectionSetupModal } from "@/components/connection-setup-modal"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// --- slot type matches your HTTP JSON ---
interface Slot {
  slotId: number
  occupied: boolean
  distance: number | null
}

export default function AdminPage() {
  const router = useRouter()

  // ESP IP + setup modal
  const [espIp, setEspIp] = useState<string>("")
  const [showSetupModal, setShowSetupModal] = useState(false)

  // Polling hook
  const { parkingSlots: slots, lastError, start, stop } = useHttpPolling(espIp)
  const [isLoading, setIsLoading] = useState(false)

  // Load saved IP once
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

  // Handle errors
  useEffect(() => {
    if (lastError) {
      toast({ title: "Polling Error", description: lastError, variant: "destructive" })
      setIsLoading(false)
    } else {
      setIsLoading(false)
    }
  }, [lastError])

  // Save new IP & restart polling
  const handleSetupEsp = (ip: string) => {
    localStorage.setItem("esp_ip", ip)
    setEspIp(ip)
    setShowSetupModal(false)
    toast({ title: "Starting polling", description: `http://${ip}/ every 1s` })
    start(ip)
    setIsLoading(true)
  }

  const isConnected = !!espIp && !lastError

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster />
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  stop()
                  setEspIp("")
                  toast({ title: "Stopped polling" })
                }}
              >
                <WifiOff className="mr-1" /> Stop
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowSetupModal(true)}>
                <Wifi className="mr-1" /> Connect
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => router.push("/")}
            >
              <LogOut className="mr-1" /> Dashboard
            </Button>
          </div>
        </div>

        {/* Error */}
        {lastError && (
          <Badge variant="destructive" className="mb-4">
            {lastError}
          </Badge>
        )}

        {/* Slots Table */}
        <Card>
          <CardHeader>
            <CardTitle>Parking Slots</CardTitle>
            <CardDescription>
              {isConnected
                ? `Polling http://${espIp}/ every 1s`
                : "Not connected"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slot ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Distance (cm)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
              <></>
                )}
                {!isLoading && slots.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      No data
                    </TableCell>
                  </TableRow>
                )}
                {slots.map((slot) => (
                  <TableRow key={slot.slotId}>
                    <TableCell>#{slot.slotId}</TableCell>
                    <TableCell>
                      <Badge
                        variant={slot.occupied ? "destructive" : "outline"}
                        className="capitalize"
                      >
                        {slot.occupied ? "Occupied" : "Vacant"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {slot.distance !== null
                        ? slot.distance.toFixed(1)
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ESP IP Setup */}
      <ConnectionSetupModal
        isOpen={showSetupModal}
        onClose={() => {
          if (!espIp) {
            toast({
              title: "IP Required",
              description: "Please enter your ESP32’s IP address",
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
