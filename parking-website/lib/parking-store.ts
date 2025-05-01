// In-memory store for parking slots and reservations
// In a production app, this would be replaced with a database

interface Slot {
  slotId: number
  occupied: boolean
  reservedBy?: string
  reservedUntil?: string // ISO timestamp
}

interface Reservation {
  id: string
  slotId: number
  userId: string
  startTime: string
  endTime: string
}

// Initialize with 6 empty parking slots
const slots: Slot[] = Array.from({ length: 6 }, (_, i) => ({
  slotId: i + 1,
  occupied: false,
}))

let reservations: Reservation[] = []

// Generate a unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Get all slots
export function getSlots(): Slot[] {
  return slots
}

// Get a slot by ID
export function getSlotById(slotId: number): Slot | undefined {
  return slots.find((slot) => slot.slotId === slotId)
}

// Update slot occupancy
export function updateSlotOccupancy(slotId: number, occupied: boolean): Slot | null {
  const slotIndex = slots.findIndex((slot) => slot.slotId === slotId)

  if (slotIndex === -1) return null

  slots[slotIndex] = {
    ...slots[slotIndex],
    occupied,
  }

  return slots[slotIndex]
}

// Update multiple slots at once
export function updateMultipleSlots(updates: { slotId: number; occupied: boolean }[]): void {
  updates.forEach((update) => {
    const slotIndex = slots.findIndex((slot) => slot.slotId === update.slotId)
    if (slotIndex !== -1) {
      slots[slotIndex] = {
        ...slots[slotIndex],
        occupied: update.occupied,
      }
    }
  })
}

// Create a reservation
export function createReservation(slotId: number, userId: string, durationMinutes: number): Reservation {
  const startTime = new Date()
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000)

  const reservation: Reservation = {
    id: generateId(),
    slotId,
    userId,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  }

  reservations.push(reservation)

  // Update the slot with reservation info
  const slotIndex = slots.findIndex((slot) => slot.slotId === slotId)
  if (slotIndex !== -1) {
    slots[slotIndex] = {
      ...slots[slotIndex],
      reservedBy: userId,
      reservedUntil: endTime.toISOString(),
    }
  }

  // Schedule reservation expiration
  setTimeout(
    () => {
      expireReservation(reservation.id)
    },
    durationMinutes * 60 * 1000,
  )

  return reservation
}

// Expire a reservation
function expireReservation(reservationId: string): void {
  const reservationIndex = reservations.findIndex((r) => r.id === reservationId)

  if (reservationIndex === -1) return

  const reservation = reservations[reservationIndex]

  // Remove reservation from the list
  reservations = reservations.filter((r) => r.id !== reservationId)

  // Update the slot to remove reservation info
  const slotIndex = slots.findIndex((slot) => slot.slotId === reservation.slotId)
  if (slotIndex !== -1) {
    slots[slotIndex] = {
      ...slots[slotIndex],
      reservedBy: undefined,
      reservedUntil: undefined,
    }
  }

  // Broadcast the update (this would be implemented in a real app)
  // broadcastReservationExpired(reservation.slotId);
}

// Get all reservations
export function getReservations(): Reservation[] {
  return reservations
}

// Get reservations for a specific slot
export function getReservationsForSlot(slotId: number): Reservation[] {
  return reservations.filter((r) => r.slotId === slotId)
}

// Get reservations for a specific user
export function getReservationsForUser(userId: string): Reservation[] {
  return reservations.filter((r) => r.userId === userId)
}
