// Real-time Game Engine using WebSockets
class RealTimeGameEngine {
    constructor() {
        this.gameState = {
            phase: 'selection', // selection, ready, playing, ended
            selectionTimeLeft: 60,
            currentNumber: null,
            calledNumbers: [],
            takenCards: [],
            players: new Map(),
            gameActive: true,
            lastNumberTime: null,
            gameStartTime: Date.now() + 60000
        };
        
        this.timers = new Map();
        this.broadcastCallbacks = [];
    }
    
    // Initialize new game session
    initializeNewGame() {
        console.log('🎮 Initializing new synchronized game session');
        
        this.gameState = {
            phase: 'selection',
            selectionTimeLeft: 60,
            currentNumber: null,
            calledNumbers: [],
            takenCards: [],
            players: new Map(),
            gameActive: true,
            lastNumberTime: null,
            gameStartTime: Date.now() + 60000
        };
        
        // Clear all timers
        this.timers.forEach(timer => clearInterval(timer));
        this.timers.clear();
        
        return this.gameState;
    }
    
    // Add player to game
    addPlayer(socketId, playerData) {
        const player = {
            id: playerData.playerId,
            name: playerData.playerName,
            socketId: socketId,
            selectedCards: [],
            connectedAt: Date.now(),
            lastSeen: Date.now()
        };
        
        this.gameState.players.set(socketId, player);
        console.log(`👤 Player joined: ${player.name} (${socketId})`);
        
        return player;
    }
    
    // Remove player
    removePlayer(socketId) {
        const player = this.gameState.players.get(socketId);
        if (player) {
            // Release player's cards
            player.selectedCards.forEach(cardNumber => {
                this.releaseCard(cardNumber);
            });
            
            this.gameState.players.delete(socketId);
            console.log(`👤 Player left: ${player.name} (${socketId})`);
        }
    }
    
    // Select card for player
    selectCard(socketId, cardNumber) {
        const player = this.gameState.players.get(socketId);
        if (!player) return { success: false, error: 'Player not found' };
        
        // Check if card already taken
        if (this.gameState.takenCards.includes(cardNumber)) {
            return { success: false, error: 'Card already taken' };
        }
        
        // Check player card limit (2 cards)
        if (player.selectedCards.length >= 2) {
            return { success: false, error: 'Maximum 2 cards per player' };
        }
        
        // Reserve card
        this.gameState.takenCards.push(cardNumber);
        player.selectedCards.push(cardNumber);
        
        console.log(`🎴 Card ${cardNumber} selected by ${player.name}`);
        
        return { 
            success: true, 
            cardNumber,
            playerId: player.id,
            takenCards: [...this.gameState.takenCards]
        };
    }
    
    // Release card
    releaseCard(cardNumber) {
        const index = this.gameState.takenCards.indexOf(cardNumber);
        if (index > -1) {
            this.gameState.takenCards.splice(index, 1);
            
            // Remove from all players' selections
            this.gameState.players.forEach(player => {
                const cardIndex = player.selectedCards.indexOf(cardNumber);
                if (cardIndex > -1) {
                    player.selectedCards.splice(cardIndex, 1);
                }
            });
            
            console.log(`🎴 Card ${cardNumber} released`);
            return true;
        }
        return false;
    }
    
    // Start selection countdown
    startSelectionCountdown(broadcastCallback) {
        this.timers.set('selection', setInterval(() => {
            this.gameState.selectionTimeLeft--;
            
            // Broadcast countdown to all clients
            broadcastCallback('selection-countdown', {
                seconds: this.gameState.selectionTimeLeft,
                phase: this.gameState.phase
            });
            
            // Handle time's up
            if (this.gameState.selectionTimeLeft <= 0) {
                this.endSelectionPhase(broadcastCallback);
            }
        }, 1000));
    }
    
    // End selection phase
    endSelectionPhase(broadcastCallback) {
        clearInterval(this.timers.get('selection'));
        this.timers.delete('selection');
        
        // Start ready phase
        this.startReadyPhase(broadcastCallback);
    }
    
    // Start ready phase (3-second countdown)
    startReadyPhase(broadcastCallback) {
        this.gameState.phase = 'ready';
        broadcastCallback('game-phase', { phase: 'ready' });
        
        let readyCount = 3;
        
        // Broadcast READY countdown
        const readyTimer = setInterval(() => {
            broadcastCallback('ready-countdown', readyCount);
            readyCount--;
            
            if (readyCount < 0) {
                clearInterval(readyTimer);
                this.startGamePhase(broadcastCallback);
            }
        }, 1000);
        
        this.timers.set('ready', readyTimer);
    }
    
    // Start game phase
    startGamePhase(broadcastCallback) {
        this.gameState.phase = 'playing';
        this.gameState.gameStartTime = Date.now();
        broadcastCallback('game-phase', { phase: 'playing' });
        
        console.log('🎲 Game phase started - Calling numbers');
        
        // Start number calling
        this.startNumberCalling(broadcastCallback);
    }
    
    // Start calling numbers (every 5 seconds)
    startNumberCalling(broadcastCallback) {
        // Call first number immediately
        setTimeout(() => {
            this.callNextNumber(broadcastCallback);
        }, 1000);
        
        // Then every 5 seconds
        const numberTimer = setInterval(() => {
            if (this.gameState.calledNumbers.length >= 75) {
                this.endGame(broadcastCallback);
                return;
            }
            this.callNextNumber(broadcastCallback);
        }, 5000);
        
        this.timers.set('calling', numberTimer);
    }
    
    // Call next BINGO number
    callNextNumber(broadcastCallback) {
        // Generate unique number 1-75
        let number;
        do {
            number = Math.floor(Math.random() * 75) + 1;
        } while (this.gameState.calledNumbers.includes(number));
        
        const letter = this.getBingoLetter(number);
        
        this.gameState.currentNumber = number;
        this.gameState.calledNumbers.push(number);
        this.gameState.lastNumberTime = Date.now();
        
        const numberData = {
            number: number,
            letter: letter,
            full: `${letter}-${number}`,
            timestamp: Date.now(),
            totalCalled: this.gameState.calledNumbers.length
        };
        
        console.log(`🔔 Called: ${numberData.full}`);
        
        // Broadcast to all clients
        broadcastCallback('number-called', numberData);
    }
    
    // Get BINGO letter for number
    getBingoLetter(number) {
        if (number <= 15) return 'B';
        if (number <= 30) return 'I';
        if (number <= 45) return 'N';
        if (number <= 60) return 'G';
        return 'O';
    }
    
    // Handle win claim
    verifyWinClaim(playerData, cardNumber, pattern) {
        const player = Array.from(this.gameState.players.values())
            .find(p => p.id === playerData.playerId);
        
        if (!player) {
            return { valid: false, error: 'Player not found' };
        }
        
        if (!player.selectedCards.includes(cardNumber)) {
            return { valid: false, error: 'Card not owned by player' };
        }
        
        // In production, verify the pattern against called numbers
        // For now, accept any claim for demonstration
        const winner = {
            playerId: player.id,
            playerName: player.name,
            cardNumber: cardNumber,
            pattern: pattern,
            timestamp: Date.now(),
            calledNumbers: this.gameState.calledNumbers.length,
            gameDuration: Math.floor((Date.now() - this.gameState.gameStartTime) / 1000)
        };
        
        return { valid: true, winner };
    }
    
    // End game
    endGame(broadcastCallback, winner = null) {
        // Clear all timers
        this.timers.forEach(timer => clearInterval(timer));
        this.timers.clear();
        
        this.gameState.phase = 'ended';
        this.gameState.gameActive = false;
        
        if (winner) {
            broadcastCallback('winner-declared', winner);
            console.log(`🏆 Winner: ${winner.playerName} with card ${winner.cardNumber}`);
        }
        
        // Restart game in 30 seconds
        setTimeout(() => {
            this.initializeNewGame();
            broadcastCallback('game-state', this.gameState);
            this.startSelectionCountdown(broadcastCallback);
        }, 30000);
    }
    
    // Get current game state
    getGameState() {
        return {
            ...this.gameState,
            players: Array.from(this.gameState.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                selectedCards: p.selectedCards
            })),
            playerCount: this.gameState.players.size
        };
    }
}

module.exports = RealTimeGameEngine;