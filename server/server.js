const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const cors = require('cors');
const RealTimeGameEngine = require('./game-engine');

// Initialize
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'],
    pingInterval: 5000,
    pingTimeout: 20000
});

const gameEngine = new RealTimeGameEngine();

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Track connected players by socket ID
const connectedPlayers = new Map();

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log(`🔌 New connection: ${socket.id}`);
    
    // Send initial game state
    socket.emit('game-state', gameEngine.getGameState());
    
    // If game is in progress, send current phase
    const currentState = gameEngine.getGameState();
    if (currentState.phase === 'playing') {
        socket.emit('game-phase', { phase: 'playing' });
        socket.emit('numbers-called', { 
            numbers: currentState.calledNumbers,
            current: currentState.currentNumber 
        });
    } else if (currentState.phase === 'ready') {
        socket.emit('game-phase', { phase: 'ready' });
    }
    
    // Handle player registration
    socket.on('register-player', (playerData) => {
        console.log(`👤 Player registering: ${playerData.playerName}`);
        
        const player = gameEngine.addPlayer(socket.id, playerData);
        connectedPlayers.set(socket.id, player.id);
        
        // Confirm registration
        socket.emit('registration-confirmed', {
            playerId: player.id,
            playerName: player.name,
            gameState: gameEngine.getGameState()
        });
        
        // Broadcast updated player count to ALL players
        io.emit('players-updated', {
            playerCount: gameEngine.gameState.players.size,
            players: Array.from(gameEngine.gameState.players.values()).map(p => ({
                id: p.id,
                name: p.name
            }))
        });
    });
    
    // Handle card selection
    socket.on('select-card', (data) => {
        const result = gameEngine.selectCard(socket.id, data.cardNumber);
        
        if (result.success) {
            // Confirm to player
            socket.emit('card-selected', result);
            
            // Broadcast to ALL other players
            io.emit('card-taken', {
                cardNumber: data.cardNumber,
                playerId: result.playerId,
                takenCards: result.takenCards
            });
        } else {
            socket.emit('card-unavailable', {
                cardNumber: data.cardNumber,
                error: result.error
            });
        }
    });
    
    // Handle card deselection
    socket.on('deselect-card', (data) => {
        const released = gameEngine.releaseCard(data.cardNumber);
        
        if (released) {
            socket.emit('card-deselected', { cardNumber: data.cardNumber });
            io.emit('card-released', {
                cardNumber: data.cardNumber,
                takenCards: gameEngine.gameState.takenCards
            });
        }
    });
    
    // Handle win claim
    socket.on('claim-win', (data) => {
        const verification = gameEngine.verifyWinClaim(
            data, 
            data.cardNumber, 
            data.pattern
        );
        
        if (verification.valid) {
            // Broadcast winner to ALL players
            io.emit('winner-declared', verification.winner);
            
            // End game for everyone
            gameEngine.endGame(
                (event, data) => io.emit(event, data),
                verification.winner
            );
        } else {
            socket.emit('win-rejected', {
                error: verification.error,
                cardNumber: data.cardNumber
            });
        }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`🔌 Disconnected: ${socket.id}`);
        
        const playerId = connectedPlayers.get(socket.id);
        if (playerId) {
            gameEngine.removePlayer(socket.id);
            connectedPlayers.delete(socket.id);
            
            // Broadcast updated player count to ALL players
            io.emit('players-updated', {
                playerCount: gameEngine.gameState.players.size
            });
        }
    });
    
    // Keep-alive ping
    socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
    });
    
    // Request current game state
    socket.on('get-game-state', () => {
        socket.emit('game-state', gameEngine.getGameState());
    });
});

// Game lifecycle management - START THIS WHEN SERVER STARTS
function startGameLifecycle() {
    console.log('🚀 Starting GLOBALLY synchronized game lifecycle');
    
    // Initialize game
    const initialState = gameEngine.initializeNewGame();
    io.emit('game-state', initialState);
    
    // Start selection countdown with broadcast to ALL
    gameEngine.startSelectionCountdown((event, data) => {
        console.log(`📡 Broadcasting to ALL: ${event}`);
        io.emit(event, data);
    });
}

// Start server with automatic port detection
function startServer(port, maxAttempts = 10) {
    const startPort = port || 3000;
    let attempts = 0;
    
    function tryListen(currentPort) {
        if (attempts >= maxAttempts) {
            console.error(`❌ Could not find an available port after ${maxAttempts} attempts.`);
            console.error(`💡 Please free up a port or set PORT environment variable manually.`);
            process.exit(1);
        }
        
        // Remove any existing error listeners to avoid duplicates
        server.removeAllListeners('error');
        
        server.listen(currentPort, () => {
            console.log(`✅ Real-time Bingo Server running on port ${currentPort}`);
            console.log(`🌐 WebSocket: ws://localhost:${currentPort}`);
            console.log(`🌐 HTTP: http://localhost:${currentPort}`);
            
            // Start synchronized game for everyone
            startGameLifecycle();
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                attempts++;
                const nextPort = currentPort + 1;
                console.log(`⚠️  Port ${currentPort} is in use, trying port ${nextPort}...`);
                // If listen() failed, server isn't listening, so we can try next port directly
                tryListen(nextPort);
            } else {
                console.error('❌ Server error:', err);
                process.exit(1);
            }
        });
    }
    
    tryListen(startPort);
}

const PORT = process.env.PORT ? parseInt(process.env.PORT) : null;
startServer(PORT);

// Export for testing
module.exports = { server, io, gameEngine };