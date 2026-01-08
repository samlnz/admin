class GameManager {
    constructor() {
        this.games = new Map();
        this.cardGenerator = new CardGenerator();
        this.activeGames = new Set();
    }

    createGame(options = {}) {
        const gameId = this.generateGameId();
        
        const game = {
            id: gameId,
            status: 'waiting',
            players: new Map(),
            settings: {
                entryPrice: options.entryPrice || 10,
                maxPlayers: options.maxPlayers || 10,
                minPlayers: options.minPlayers || 2,
                selectionTime: 60000, // 60 seconds
                numberInterval: 5000, // 5 seconds
                commission: 0.10, // 10%
            },
            prizePool: 0,
            calledNumbers: [],
            takenCards: new Set(),
            startTime: null,
            endTime: null,
            winner: null,
            createdAt: Date.now()
        };
        
        this.games.set(gameId, game);
        this.activeGames.add(gameId);
        
        console.log(`🎮 Created game ${gameId}`);
        return game;
    }

    generateGameId() {
        return 'GAME' + Math.random().toString(36).substr(2, 8).toUpperCase();
    }

    addPlayer(gameId, playerData) {
        const game = this.games.get(gameId);
        if (!game) return { success: false, error: 'Game not found' };
        
        if (game.players.size >= game.settings.maxPlayers) {
            return { success: false, error: 'Game is full' };
        }
        
        // Check if player already in game
        if (this.isPlayerInGame(gameId, playerData.id)) {
            return { success: false, error: 'Player already in game' };
        }
        
        const player = {
            id: playerData.id,
            name: playerData.name,
            telegramId: playerData.telegramId,
            balance: playerData.balance || 0,
            cards: [],
            isReady: false,
            joinedAt: Date.now(),
            markedNumbers: [],
            hasClaimedBingo: false
        };
        
        game.players.set(playerData.id, player);
        
        // Update prize pool
        game.prizePool += game.settings.entryPrice;
        
        // Check if game should start
        if (game.players.size >= game.settings.minPlayers && game.status === 'waiting') {
            game.status = 'selection';
            game.selectionEndTime = Date.now() + game.settings.selectionTime;
        }
        
        return { 
            success: true, 
            player,
            gameState: this.getGameState(gameId)
        };
    }

    assignCards(gameId, playerId, cardNumbers) {
        const game = this.games.get(gameId);
        if (!game) return { success: false, error: 'Game not found' };
        
        const player = game.players.get(playerId);
        if (!player) return { success: false, error: 'Player not found' };
        
        // Check if cards are available
        for (const cardNumber of cardNumbers) {
            if (game.takenCards.has(cardNumber)) {
                return { success: false, error: `Card ${cardNumber} is already taken` };
            }
        }
        
        // Assign cards
        player.cards = cardNumbers;
        cardNumbers.forEach(card => game.takenCards.add(card));
        
        // Generate board data for each card
        player.boards = cardNumbers.map(cardNumber => 
            this.cardGenerator.generateCard(cardNumber)
        );
        
        return { 
            success: true, 
            cards: cardNumbers,
            boards: player.boards,
            availableCards: this.getAvailableCards(gameId)
        };
    }

    getAvailableCards(gameId) {
        const game = this.games.get(gameId);
        if (!game) return [];
        
        const allCards = Array.from({ length: 500 }, (_, i) => i + 1);
        return allCards.filter(card => !game.takenCards.has(card));
    }

    markPlayerReady(gameId, playerId) {
        const game = this.games.get(gameId);
        if (!game) return false;
        
        const player = game.players.get(playerId);
        if (!player) return false;
        
        player.isReady = true;
        
        // Check if all players are ready
        const allReady = Array.from(game.players.values()).every(p => p.isReady);
        if (allReady && game.players.size >= game.settings.minPlayers) {
            this.startGame(gameId);
            return 'game_starting';
        }
        
        return 'player_ready';
    }

    startGame(gameId) {
        const game = this.games.get(gameId);
        if (!game) return;
        
        game.status = 'playing';
        game.startTime = Date.now();
        game.nextNumberTime = Date.now() + 3000; // 3-second ready countdown
        
        console.log(`🎲 Game ${gameId} started with ${game.players.size} players`);
    }

    callNextNumber(gameId) {
        const game = this.games.get(gameId);
        if (!game) return null;
        
        // Generate unique number 1-75
        let number;
        do {
            number = Math.floor(Math.random() * 75) + 1;
        } while (game.calledNumbers.includes(number));
        
        game.calledNumbers.push(number);
        game.currentNumber = number;
        game.nextNumberTime = Date.now() + game.settings.numberInterval;
        
        return {
            number,
            letter: this.getBingoLetter(number),
            calledNumbers: [...game.calledNumbers],
            nextCallTime: game.nextNumberTime
        };
    }

    getBingoLetter(number) {
        if (number <= 15) return 'B';
        if (number <= 30) return 'I';
        if (number <= 45) return 'N';
        if (number <= 60) return 'G';
        return 'O';
    }

    checkBingo(gameId, playerId, cardIndex, markedPositions) {
        const game = this.games.get(gameId);
        if (!game) return { isValid: false, error: 'Game not found' };
        
        const player = game.players.get(playerId);
        if (!player) return { isValid: false, error: 'Player not found' };
        
        // Get card numbers
        const card = player.boards[cardIndex];
        if (!card) return { isValid: false, error: 'Card not found' };
        
        // Check if all marked numbers have been called
        for (const position of markedPositions) {
            const number = card.numbers[position];
            if (number !== 0 && !game.calledNumbers.includes(number)) {
                return { isValid: false, error: 'Number not called yet' };
            }
        }
        
        // Check winning pattern
        const pattern = this.detectWinningPattern(markedPositions);
        if (!pattern) {
            return { isValid: false, error: 'No valid winning pattern' };
        }
        
        return {
            isValid: true,
            pattern: pattern,
            winningNumbers: markedPositions.map(pos => card.numbers[pos])
        };
    }

    detectWinningPattern(positions) {
        // Convert positions to rows/cols
        const cells = positions.map(pos => ({
            row: Math.floor(pos / 5),
            col: pos % 5
        }));
        
        // Check for patterns
        if (this.isRow(cells)) return 'row';
        if (this.isColumn(cells)) return 'column';
        if (this.isDiagonal(cells)) return 'diagonal';
        if (this.isFourCorners(cells)) return 'four_corners';
        
        return null;
    }

    isRow(cells) {
        // All cells in same row
        const row = cells[0].row;
        return cells.every(cell => cell.row === row);
    }

    isColumn(cells) {
        // All cells in same column
        const col = cells[0].col;
        return cells.every(cell => cell.col === col);
    }

    isDiagonal(cells) {
        // Check main diagonal (0,0 to 4,4)
        const mainDiagonal = cells.every((cell, i) => 
            cell.row === i && cell.col === i
        );
        
        // Check anti-diagonal (0,4 to 4,0)
        const antiDiagonal = cells.every((cell, i) => 
            cell.row === i && cell.col === 4 - i
        );
        
        return mainDiagonal || antiDiagonal;
    }

    isFourCorners(cells) {
        const corners = [
            { row: 0, col: 0 },
            { row: 0, col: 4 },
            { row: 4, col: 0 },
            { row: 4, col: 4 }
        ];
        
        return cells.length === 4 && 
               cells.every(cell => 
                   corners.some(corner => 
                       corner.row === cell.row && corner.col === cell.col
                   )
               );
    }

    declareWinner(gameId, playerId, pattern) {
        const game = this.games.get(gameId);
        if (!game) return false;
        
        game.winner = playerId;
        game.status = 'ended';
        game.endTime = Date.now();
        
        // Calculate winnings (prize pool - commission)
        const commission = game.prizePool * game.settings.commission;
        const winnings = game.prizePool - commission;
        
        console.log(`🏆 Game ${gameId}: ${playerId} wins ${winnings} with ${pattern}`);
        
        return {
            winnerId: playerId,
            winnings: winnings,
            commission: commission,
            gameDuration: game.endTime - game.startTime,
            calledNumbers: game.calledNumbers.length
        };
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
                isReady: p.isReady,
                hasCards: p.cards.length > 0
            })),
            playerCount: game.players.size,
            prizePool: game.prizePool,
            calledNumbers: game.calledNumbers,
            currentNumber: game.currentNumber,
            startTime: game.startTime,
            settings: game.settings,
            selectionEndTime: game.selectionEndTime,
            nextNumberTime: game.nextNumberTime
        };
    }

    isPlayerInGame(gameId, playerId) {
        const game = this.games.get(gameId);
        if (!game) return false;
        return game.players.has(playerId);
    }

    removePlayer(gameId, playerId) {
        const game = this.games.get(gameId);
        if (!game) return false;
        
        const player = game.players.get(playerId);
        if (!player) return false;
        
        // Release cards
        player.cards.forEach(card => {
            game.takenCards.delete(card);
        });
        
        // Remove player
        game.players.delete(playerId);
        
        // Update prize pool
        game.prizePool -= game.settings.entryPrice;
        
        // If not enough players, end game
        if (game.players.size < game.settings.minPlayers && game.status === 'playing') {
            this.endGame(gameId, 'not_enough_players');
        }
        
        return true;
    }

    endGame(gameId, reason) {
        const game = this.games.get(gameId);
        if (!game) return;
        
        game.status = 'ended';
        game.endTime = Date.now();
        game.endReason = reason;
        
        console.log(`⏹️ Game ${gameId} ended: ${reason}`);
        
        // Clean up after delay
        setTimeout(() => {
            this.cleanupGame(gameId);
        }, 60000); // 1 minute
    }

    cleanupGame(gameId) {
        this.games.delete(gameId);
        this.activeGames.delete(gameId);
        console.log(`🧹 Cleaned up game ${gameId}`);
    }
}

module.exports = GameManager;