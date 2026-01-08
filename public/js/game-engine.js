class BingoGameEngine {
    constructor(options = {}) {
        this.options = {
            cardCount: 500,
            maxCardsPerPlayer: 2,
            selectionTime: 60,
            numberInterval: 5,
            ...options
        };
        
        // Game state
        this.state = {
            phase: 'selection', // selection, ready, playing, ended
            selectedCards: [],
            markedNumbers: { card1: [], card2: [] },
            calledNumbers: [],
            currentNumber: null,
            selectionTimeLeft: this.options.selectionTime,
            gameTime: 0,
            players: [],
            winner: null,
            isAudioEnabled: true
        };
        
        // Audio
        this.audio = {
            numberCall: new Audio('/audio/number-call.mp3'),
            bingoWin: new Audio('/audio/bingo-win.mp3'),
            background: new Audio('/audio/background.mp3')
        };
        
        // Initialize
        this.initAudio();
    }

    initAudio() {
        // Set audio volumes
        this.audio.numberCall.volume = 0.7;
        this.audio.bingoWin.volume = 0.8;
        this.audio.background.volume = 0.3;
        this.audio.background.loop = true;
    }

    toggleAudio(enabled) {
        this.state.isAudioEnabled = enabled;
        if (!enabled) {
            this.audio.background.pause();
        } else if (this.state.phase === 'playing') {
            this.audio.background.play().catch(e => console.log('Audio play failed:', e));
        }
    }

    startSelectionPhase() {
        this.state.phase = 'selection';
        this.state.selectionTimeLeft = this.options.selectionTime;
        
        // Start selection timer
        this.selectionTimer = setInterval(() => {
            this.state.selectionTimeLeft--;
            
            if (this.state.selectionTimeLeft <= 0) {
                clearInterval(this.selectionTimer);
                this.endSelectionPhase();
            }
        }, 1000);
    }

    endSelectionPhase() {
        // Auto-select cards if none selected
        if (this.state.selectedCards.length === 0) {
            this.autoSelectCards();
        }
        
        // Move to ready phase
        this.startReadyPhase();
    }

    startReadyPhase() {
        this.state.phase = 'ready';
        
        // 3-second countdown
        let countdown = 3;
        const countdownInterval = setInterval(() => {
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                this.startGamePhase();
            }
            countdown--;
        }, 1000);
    }

    startGamePhase() {
        this.state.phase = 'playing';
        this.state.gameTime = 0;
        
        // Start game timer
        this.gameTimer = setInterval(() => {
            this.state.gameTime++;
        }, 1000);
        
        // Start background music
        if (this.state.isAudioEnabled) {
            this.audio.background.play().catch(e => console.log('Audio play failed:', e));
        }
    }

    callNumber(number) {
        if (!number || this.state.calledNumbers.includes(number)) {
            return false;
        }
        
        this.state.calledNumbers.push(number);
        this.state.currentNumber = number;
        
        // Play sound
        if (this.state.isAudioEnabled) {
            this.audio.numberCall.currentTime = 0;
            this.audio.numberCall.play().catch(e => console.log('Audio play failed:', e));
        }
        
        // Auto-mark numbers on cards
        this.autoMarkNumber(number);
        
        return true;
    }

    autoMarkNumber(number) {
        // Check and mark number on all selected cards
        this.state.selectedCards.forEach((cardNumber, index) => {
            const cardKey = `card${index + 1}`;
            const cardNumbers = BingoCardGenerator.generateCardNumbers(cardNumber);
            
            if (cardNumbers.includes(number)) {
                if (!this.state.markedNumbers[cardKey].includes(number)) {
                    this.state.markedNumbers[cardKey].push(number);
                }
            }
        });
    }

    markNumber(cardIndex, number) {
        const cardKey = `card${cardIndex + 1}`;
        
        if (!this.state.markedNumbers[cardKey].includes(number)) {
            this.state.markedNumbers[cardKey].push(number);
            
            // Check for win
            this.checkForWin(cardIndex);
            
            return true;
        }
        
        return false;
    }

    checkForWin(cardIndex) {
        const cardKey = `card${cardIndex + 1}`;
        const cardNumber = this.state.selectedCards[cardIndex];
        const markedNumbers = this.state.markedNumbers[cardKey];
        const cardNumbers = BingoCardGenerator.generateCardNumbers(cardNumber);
        
        // Check all winning patterns
        const patterns = this.getWinningPatterns();
        
        for (const pattern of patterns) {
            if (this.checkPattern(pattern, markedNumbers, cardNumbers)) {
                this.declareWinner(cardIndex, pattern);
                return true;
            }
        }
        
        return false;
    }

    getWinningPatterns() {
        return [
            {
                name: 'row',
                positions: [
                    [0, 1, 2, 3, 4],     // Row 1
                    [5, 6, 7, 8, 9],     // Row 2
                    [10, 11, 12, 13, 14], // Row 3 (center FREE counts)
                    [15, 16, 17, 18, 19], // Row 4
                    [20, 21, 22, 23, 24]  // Row 5
                ]
            },
            {
                name: 'column',
                positions: [
                    [0, 5, 10, 15, 20],  // Column 1
                    [1, 6, 11, 16, 21],  // Column 2
                    [2, 7, 12, 17, 22],  // Column 3
                    [3, 8, 13, 18, 23],  // Column 4
                    [4, 9, 14, 19, 24]   // Column 5
                ]
            },
            {
                name: 'diagonal',
                positions: [
                    [0, 6, 12, 18, 24],  // Diagonal top-left to bottom-right
                    [4, 8, 12, 16, 20]   // Diagonal top-right to bottom-left
                ]
            },
            {
                name: 'four_corners',
                positions: [[0, 4, 20, 24]]
            }
        ];
    }

    checkPattern(pattern, markedNumbers, cardNumbers) {
        for (const positions of pattern.positions) {
            let isComplete = true;
            
            for (const position of positions) {
                const number = cardNumbers[position];
                
                // FREE space (0) is always marked
                if (number === 0) continue;
                
                if (!markedNumbers.includes(number)) {
                    isComplete = false;
                    break;
                }
            }
            
            if (isComplete) {
                return {
                    pattern: pattern.name,
                    positions: positions,
                    cardNumbers: positions.map(pos => cardNumbers[pos])
                };
            }
        }
        
        return false;
    }

    declareWinner(cardIndex, pattern) {
        this.state.winner = {
            cardIndex: cardIndex,
            cardNumber: this.state.selectedCards[cardIndex],
            pattern: pattern,
            gameTime: this.state.gameTime,
            calledNumbers: this.state.calledNumbers.length
        };
        
        this.state.phase = 'ended';
        
        // Stop timers
        clearInterval(this.gameTimer);
        this.audio.background.pause();
        
        // Play win sound
        if (this.state.isAudioEnabled) {
            this.audio.bingoWin.play().catch(e => console.log('Audio play failed:', e));
        }
        
        return this.state.winner;
    }

    autoSelectCards() {
        // Select random cards from available pool
        const availableCards = this.getAvailableCards();
        const cardsToSelect = Math.min(this.options.maxCardsPerPlayer, availableCards.length);
        
        this.state.selectedCards = [];
        
        for (let i = 0; i < cardsToSelect; i++) {
            const randomIndex = Math.floor(Math.random() * availableCards.length);
            this.state.selectedCards.push(availableCards[randomIndex]);
            availableCards.splice(randomIndex, 1);
        }
    }

    getAvailableCards() {
        // In real implementation, this would come from server
        return Array.from({ length: this.options.cardCount }, (_, i) => i + 1);
    }

    getGameState() {
        return { ...this.state };
    }

    reset() {
        this.state = {
            phase: 'selection',
            selectedCards: [],
            markedNumbers: { card1: [], card2: [] },
            calledNumbers: [],
            currentNumber: null,
            selectionTimeLeft: this.options.selectionTime,
            gameTime: 0,
            players: [],
            winner: null,
            isAudioEnabled: this.state.isAudioEnabled
        };
        
        clearInterval(this.selectionTimer);
        clearInterval(this.gameTimer);
        this.audio.background.pause();
    }
}