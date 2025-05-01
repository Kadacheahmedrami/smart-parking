const { createServer } = require("http")
const { parse } = require("url")
const next = require("next")
const WebSocket = require("ws")

const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const handle = app.getRequestHandler()

// WebSocket clients
const clients = new Set()

// Broadcast a message to all clients
function broadcast(message) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  // Create WebSocket server
  const wss = new WebSocket.Server({ noServer: true })

  wss.on("connection", (ws) => {
    // Add client to the set
    clients.add(ws)
    console.log("WebSocket client connected. Total clients:", clients.size)

    // Handle messages from clients
    ws.on("message", (message) => {
      try {
        // Simply relay all messages to all clients
        // The ESP32 will handle the actual data storage and processing
        broadcast(message.toString())
      } catch (error) {
        console.error("Error processing WebSocket message:", error)
      }
    })

    // Handle client disconnection
    ws.on("close", () => {
      clients.delete(ws)
      console.log("WebSocket client disconnected. Total clients:", clients.size)
    })
  })

  // Handle WebSocket upgrade
  server.on("upgrade", (request, socket, head) => {
    const { pathname } = parse(request.url)

    if (pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request)
      })
    } else {
      socket.destroy()
    }
  })

  const PORT = process.env.PORT || 3000
  server.listen(PORT, (err) => {
    if (err) throw err
    console.log(`> Ready on http://localhost:${PORT}`)
  })
})
