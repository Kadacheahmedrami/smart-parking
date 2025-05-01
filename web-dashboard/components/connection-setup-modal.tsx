"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Wifi } from "lucide-react"

interface ConnectionSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (espIp: string) => void
  initialValue?: string
}

export function ConnectionSetupModal({ isOpen, onClose, onSave, initialValue = "" }: ConnectionSetupModalProps) {
  const [espIp, setEspIp] = useState(initialValue)
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState("")

  // keep local state in sync when initialValue changes
  useEffect(() => {
    setEspIp(initialValue)
  }, [initialValue])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Basic validation
    if (!espIp.trim()) {
      setError("Please enter an IP address or domain name")
      return
    }

    // Remove protocol if included
    let cleanIp = espIp.trim()
    if (cleanIp.startsWith("http://")) {
      cleanIp = cleanIp.substring(7)
    } else if (cleanIp.startsWith("https://")) {
      cleanIp = cleanIp.substring(8)
    }

    // Remove any path or port
    cleanIp = cleanIp.split("/")[0]

    // Don't split on port as we need to keep it
    // cleanIp = cleanIp.split(":")[0]

    setIsValidating(true)

    try {
      // We'll just validate the format, not actually ping the ESP
      // In a real app, you might want to check if the ESP is reachable
      onSave(cleanIp)
    } catch (error) {
      console.error("Error saving ESP IP:", error)
      setError("Failed to save ESP IP address")
    } finally {
      setIsValidating(false)
    }
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-teal-500/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Wifi className="h-5 w-5 text-teal-500 animate-pulse" />
            Configure ESP32 Polling
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="espIp" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              ESP32 IP Address or Hostname
            </Label>
            <Input
              id="espIp"
              value={espIp}
              onChange={(e) => setEspIp(e.target.value)}
              placeholder="e.g. 192.168.1.100 or esp32.local"
              className="border-teal-500/20 focus-visible:ring-teal-500"
              required
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              The dashboard will poll <code>http://{`[your-input]`}/</code> every second to fetch slot data.
            </p>
          </div>

          <DialogFooter className="pt-4 flex justify-end space-x-2">
            {initialValue && (
              <Button type="button" variant="outline" onClick={onClose} disabled={isValidating}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isValidating}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:from-teal-600 hover:to-emerald-600"
            >
              {isValidating ? "Saving..." : initialValue ? "Update Polling" : "Start Polling"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
