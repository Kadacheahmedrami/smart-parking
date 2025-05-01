// This file would be used in a custom server.js file
// For simplicity, we're just defining the interface here

// WebSocket clients
const clients: Set<WebSocket> = new Set()

// Add a client
export function addClient(client: WebSocket): void {
  clients.add(client)
}

// Remove a client
export function removeClient(client: WebSocket): void {
  clients.delete(client)
}

// Broadcast a message to all clients
export function broadcastMessage(message: string): void {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}

// Get client count
export function getClientCount(): number {
  return clients.size
}
