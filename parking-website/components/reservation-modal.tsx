"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ReservationModalProps {
  isOpen: boolean
  onClose: () => void
  onReserve: ( durationMinutes: number) => void
}

export function ReservationModal({ isOpen, onClose, onReserve }: ReservationModalProps) {
  const [duration, setDuration] = useState("30")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onReserve(Number.parseInt(duration, 10))
      setDuration("30")
      onClose()
    } catch (error) {
      console.error("Reservation failed:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-teal-500/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">
            Reserve Parking Slot
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="duration" className="block text-sm font-medium">
              Duration (minutes)
            </label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full rounded border border-teal-500/20 bg-transparent px-2 py-1 focus:ring-teal-500"
            >
              <option value="1">1 minute (test)</option>
              <option value="5">5 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
            </select>
          </div>

          <DialogFooter className="pt-4 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:from-teal-600 hover:to-emerald-600"
            >
              {isSubmitting ? "Reserving..." : "Reserve Slot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
