const WebSocket = require('ws');
const GameManager = require('./game-manager');
const crypto = require('crypto');

class GameServer {
    constructor(port = 3001) {
        this.port = port;
        this.wss = null;
        this.gameManager = new GameManager();
        this.connections = new Map(); // playerId -> { socket, playerData }
        this.rooms = new Map(); // roomId -> Set of playerIds
        
        // Game state
        this.games = new Map(); // gameId -> game data
        this.cardAssignments = new Map(); // playerId -> [card1, card2]
        
        this.init();
    }

    init() {
        this.wss = new WebSocket.Server({ port: this.port });
        console.log(`🎮 Game WebSocket Server started on port ${this.port}`);
        
        this.setupEventHandlers();
        this.startGameLoop();
    }

    setupEventHandlers() {
        this.wss.on('connection', (ws, req) => {
            console.log('🎮 New player connected');
            
            // Generate unique connection ID
            const connectionId = crypto.randomBytes(16).toString('hex');
            ws.connectionId = connectionId;
            
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleMessage(ws, message);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            });
            
            ws.on('close', () => {
                console.log('🎮 Player disconnected');
                this.handleDisconnection(ws);
            });
            
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
            });
            
            // Send welcome message
            ws.send(JSON.stringify({
                type: 'welcome',
                connectionId: connectionId,
                timestamp: Date.now()
            }));
        });
    }

    handleMessage(ws, message) {
        const { type, data } = message;
        
        switch (type) {
            case 'join':
                this.handleJoin(ws, data);
                break;
            case 'select_cards':
                this.handleCardSelection(ws, data);
                break;
            case 'ready':
                this.handleReady(ws, data);
                break;
            case 'mark_number':
                this.handleMarkNumber(ws, data);
                break;
            case 'claim_bingo':
                this.handleBingoClaim(ws, data);
                break;
            case 'chat':
                this.handleChat(ws, data);
                break;
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                break;
            default:
                console.warn('Unknown message type:', type);
        }
    }

    handleJoin(ws, data) {
        const { playerId, playerName, gameId } = data;
        
        if (!playerId || !playerName) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Missing player information'
            }));
            return;
        }
        
        // Create or get game
        let game = this.games.get(gameId);
        if (!game) {
            game = this.createNewGame(gameId);
            this.games.set(gameId, game);
        }
        
        // Check if game is full
        if (game.players.size >= game.maxPlayers) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Game is full'
            }));
            return;
        }
        
        // Add player to game
        const player = {
            id: playerId,
            name: playerName,
            socket: ws,
            joinedAt: Date.now(),
            cards: [],
            isReady: false,
            score: 0
        };
        
        game.players.set(playerId, player);
        ws.playerId = playerId;
        ws.gameId = gameId;
        
        // Send game state to player
        ws.send(JSON.stringify({
            type: 'joined',
            game: this.getGameState(gameId),
            playerId: playerId
        }));
        
        // Notify other players
        this.broadcastToGame(gameId, {
            type: 'player_joined',
            player: {
                id: playerId,
                name: playerName
            },
            playerCount: game.players.size
        }, playerId);
        
        console.log(`👤 Player ${playerName} joined game ${gameId}`);
    }

    createNewGame(gameId) {
        return {
            id: gameId,
            status: 'waiting', // waiting, selection, ready, playing, ended
            players: new Map(),
            maxPlayers: 10,
            minPlayers: 2,
            calledNumbers: [],
            currentNumber: null,
            startTime: null,
            endTime: null,
            winner: null,
            selectionEndTime: null,
            nextNumberTime: null,
            settings: {
                selectionDuration: 60000, // 60 seconds
                numberInterval: 5000, // 5 seconds
                totalNumbers: 75,
                winningPatterns: ['row', 'column', 'diagonal', 'four_corners']
            }
        };
    }

    handleCardSelection(ws, data) {
        const { playerId, gameId, cards } = data;
        const game = this.games.get(gameId);
        
        if (!game || game.status !== 'selection') {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Cannot select cards at this time'
            }));
            return;
        }
        
        const player = game.players.get(playerId);
        if (!player) return;
        
        // Validate cards (1-500, max 2 cards)
        if (!cards || cards.length > 2 || cards.length === 0) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid card selection'
            }));
            return;
        }
        
        // Check if cards are available
        for (const card of cards) {
            if (this.isCardTaken(gameId, card)) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: `Card ${card} is already taken`
                }));
                return;
            }
        }
        
        // Assign cards to player
        player.cards = cards;
        cards.forEach(card => this.markCardTaken(gameId, card, playerId));
        
        // Send confirmation
        ws.send(JSON.stringify({
            type: 'cards_selected',
            cards: cards,
            availableCards: this.getAvailableCards(gameId)
        }));
        
        // Broadcast to other players
        this.broadcastToGame(gameId, {
            type: 'cards_taken',
            playerId: playerId,
            cards: cards,
            availableCards: this.getAvailableCards(gameId)
        }, playerId);
        
        // Start game if all players have selected cards
        this.checkGameStart(gameId);
    }

    handleReady(ws, data) {
        const { playerId, gameId } = data;
        const game = this.games.get(gameId);
        
        if (!game || game.status !== 'selection') return;
        
        const player = game.players.get(playerId);
        if (!player) return;
        
        player.isReady = true;
        
        // Broadcast ready status
        this.broadcastToGame(gameId, {
            type: 'player_ready',
            playerId: playerId
        });
        
        // Check if all players are ready
        const allReady = Array.from(game.players.values()).every(p => p.isReady);
        if (allReady && game.players.size >= game.minPlayers) {
            this.startGame(gameId);
        }
    }

    startGame(gameId) {
        const game = this.games.get(gameId);
        if (!game) return;
        
        game.status = 'ready';
        game.startTime = Date.now();
        
        // Start 3-second countdown
        let countdown = 3;
        const countdownInterval = setInterval(() => {
            this.broadcastToGame(gameId, {
                type: 'countdown',
                seconds: countdown
            });
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                this.beginNumberCalling(gameId);
            }
            countdown--;
        }, 1000);
        
        console.log(`🎲 Game ${gameId} starting...`);
    }

    beginNumberCalling(gameId) {
        const game = this.games.get(gameId);
        if (!game) return;
        
        game.status = 'playing';
        game.nextNumberTime = Date.now() + game.settings.numberInterval;
        
        // Start number calling loop
        const gameLoop = setInterval(() => {
            if (game.status !== 'playing') {
                clearInterval(gameLoop);
                return;
            }
            
            if (game.calledNumbers.length >= game.settings.totalNumbers) {
                this.endGame(gameId, 'no_winner');
                clearInterval(gameLoop);
                return;
            }
            
            this.callNextNumber(gameId);
        }, game.settings.numberInterval);
        
        // Store interval reference
        game.gameLoop = gameLoop;
        
        // Call first number immediately
        setTimeout(() => {
            this.callNextNumber(gameId);
        }, 1000);
    }

    callNextNumber(gameId) {
        const game = this.games.get(gameId);
        if (!game) return;
        
        // Generate unique number 1-75
        let number;
        do {
            number = Math.floor(Math.random() * 75) + 1;
        } while (game.calledNumbers.includes(number));
        
        game.calledNumbers.push(number);
        game.currentNumber = number;
        game.nextNumberTime = Date.now() + game.settings.numberInterval;
        
        const letter = this.getBingoLetter(number);
        
        // Broadcast to all players
        this.broadcastToGame(gameId, {
            type: 'number_called',
            number: number,
            letter: letter,
            full: `${letter}-${number}`,
            calledNumbers: game.calledNumbers,
            timestamp: Date.now()
        });
        
        console.log(`🔔 Game ${gameId}: Called ${letter}-${number}`);
    }

    getBingoLetter(number) {
        if (number <= 15) return 'B';
        if (number <= 30) return 'I';
        if (number <= 45) return 'N';
        if (number <= 60) return 'G';
        return 'O';
    }

    handleBingoClaim(ws, data) {
        const { playerId, gameId, cardId, pattern, markedNumbers } = data;
        const game = this.games.get(gameId);
        
        if (!game) return;
        
        const player = game.players.get(playerId);
        if (!player) return;
        
        // Verify the claim
        const isValid = this.verifyBingoClaim(
            markedNumbers, 
            game.calledNumbers, 
            pattern
        );
        
        if (isValid) {
            // Declare winner
            game.winner = playerId;
            game.status = 'ended';
            game.endTime = Date.now();
            
            // Stop game loop
            if (game.gameLoop) {
                clearInterval(game.gameLoop);
            }
            
            // Broadcast winner
            this.broadcastToGame(gameId, {
                type: 'winner',
                playerId: playerId,
                playerName: player.name,
                cardId: cardId,
                pattern: pattern,
                gameDuration: Date.now() - game.startTime,
                calledNumbers: game.calledNumbers.length
            });
            
            console.log(`🏆 Game ${gameId}: Winner is ${player.name}`);
            
            // Clean up after 30 seconds
            setTimeout(() => {
                this.cleanupGame(gameId);
            }, 30000);
        } else {
            ws.send(JSON.stringify({
                type: 'bingo_rejected',
                message: 'Invalid BINGO claim'
            }));
        }
    }

    verifyBingoClaim(markedNumbers, calledNumbers, pattern) {
        // Verify all marked numbers have been called
        for (const num of markedNumbers) {
            if (num !== 0 && !calledNumbers.includes(num)) { // 0 = FREE space
                return false;
            }
        }
        
        // Verify pattern based on marked positions
        // This is a simplified check - in production, you'd verify the actual pattern
        return markedNumbers.length >= 5;
    }

    cleanupGame(gameId) {
        const game = this.games.get(gameId);
        if (!game) return;
        
        // Notify players game is ending
        this.broadcastToGame(gameId, {
            type: 'game_ending',
            message: 'Game session ending'
        });
        
        // Disconnect all players
        for (const player of game.players.values()) {
            if (player.socket.readyState === WebSocket.OPEN) {
                player.socket.close();
            }
        }
        
        // Remove game
        this.games.delete(gameId);
        console.log(`🧹 Cleaned up game ${gameId}`);
    }

    // Helper methods
    broadcastToGame(gameId, message, excludePlayerId = null) {
        const game = this.games.get(gameId);
        if (!game) return;
        
        for (const player of game.players.values()) {
            if (player.id !== excludePlayerId && player.socket.readyState === WebSocket.OPEN) {
                player.socket.send(JSON.stringify(message));
            }
        }
    }

    getGameState(gameId) {
        const game = this.games.get(gameId);
        if (!game) return null;
        
        return {
            id: game.id,
            status: game.status,
            players: Array.from(game.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                isReady: p.isReady
            })),
            playerCount: game.players.size,
            calledNumbers: game.calledNumbers,
            currentNumber: game.currentNumber,
            startTime: game.startTime,
            settings: game.settings
        };
    }

    getAvailableCards(gameId) {
        // In production, implement card tracking
        return Array.from({ length: 500 }, (_, i) => i + 1);
    }

    isCardTaken(gameId, cardNumber) {
        // Implement card tracking logic
        return false;
    }

    markCardTaken(gameId, cardNumber, playerId) {
        // Implement card tracking logic
    }

    startGameLoop() {
        // Periodically clean up old games
        setInterval(() => {
            const now = Date.now();
            for (const [gameId, game] of this.games.entries()) {
                if (game.endTime && now - game.endTime > 300000) { // 5 minutes after end
                    this.cleanupGame(gameId);
                }
            }
        }, 60000); // Every minute
    }

    handleDisconnection(ws) {
        const playerId = ws.playerId;
        const gameId = ws.gameId;
        
        if (!playerId || !gameId) return;
        
        const game = this.games.get(gameId);
        if (!game) return;
        
        const player = game.players.get(playerId);
        if (!player) return;
        
        // Remove player
        game.players.delete(playerId);
        
        // Release their cards
        player.cards.forEach(card => {
            this.releaseCard(gameId, card);
        });
        
        // Notify other players
        this.broadcastToGame(gameId, {
            type: 'player_left',
            playerId: playerId,
            playerCount: game.players.size
        });
        
        // If too few players, end game
        if (game.players.size < game.minPlayers && game.status === 'playing') {
            this.endGame(gameId, 'not_enough_players');
        }
    }
}

// Export server
module.exports = GameServer;

// Start server if run directly
if (require.main === module) {
    const port = process.env.GAME_PORT || 3001;
    new GameServer(port);
}