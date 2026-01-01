// ====================================================
// COMMON.JS - Updated with Card Generator
// ====================================================

class GameState {
    constructor() {
        this.selectedCards = [];
        this.playerName = 'Telegram User';
        this.playerId = '0000';
        this.gameTime = 0;
        this.calledNumbers = new Set();
        this.markedNumbers = { card1: new Set(), card2: new Set() };
        this.winningLines = { card1: [], card2: [] };
        this.activePlayers = 0;
        this.isAudioEnabled = true;
        this.isAutoMark = true;
    }

    saveToSession() {
        sessionStorage.setItem('bingoGameState', JSON.stringify({
            selectedCards: this.selectedCards,
            playerName: this.playerName,
            playerId: this.playerId,
            gameTime: this.gameTime,
            calledNumbers: Array.from(this.calledNumbers),
            markedNumbers: {
                card1: Array.from(this.markedNumbers.card1),
                card2: Array.from(this.markedNumbers.card2)
            },
            winningLines: this.winningLines,
            activePlayers: this.activePlayers,
            isAudioEnabled: this.isAudioEnabled,
            isAutoMark: this.isAutoMark
        }));
    }

    loadFromSession() {
        const saved = sessionStorage.getItem('bingoGameState');
        if (saved) {
            const data = JSON.parse(saved);
            this.selectedCards = data.selectedCards || [];
            this.playerName = data.playerName || 'Telegram User';
            this.playerId = data.playerId || '0000';
            this.gameTime = data.gameTime || 0;
            this.calledNumbers = new Set(data.calledNumbers || []);
            this.markedNumbers = {
                card1: new Set(data.markedNumbers?.card1 || []),
                card2: new Set(data.markedNumbers?.card2 || [])
            };
            this.winningLines = data.winningLines || { card1: [], card2: [] };
            this.activePlayers = data.activePlayers || 0;
            this.isAudioEnabled = data.isAudioEnabled !== undefined ? data.isAudioEnabled : true;
            this.isAutoMark = data.isAutoMark !== undefined ? data.isAutoMark : true;
        }
    }

    clearSession() {
        sessionStorage.removeItem('bingoGameState');
    }
}

class BingoUtils {
    static BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'];
    
    static BINGO_RANGES = {
        'B': { min: 1, max: 15 },
        'I': { min: 16, max: 30 },
        'N': { min: 31, max: 45 },
        'G': { min: 46, max: 60 },
        'O': { min: 61, max: 75 }
    };

    static getLetterForNumber(number) {
        for (const [letter, range] of Object.entries(this.BINGO_RANGES)) {
            if (number >= range.min && number <= range.max) {
                return letter;
            }
        }
        return '';
    }

    static generateRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static generateUniqueNumbers(count, min, max, exclude = new Set()) {
        const numbers = new Set();
        while (numbers.size < count) {
            const num = this.generateRandomNumber(min, max);
            if (!exclude.has(num)) {
                numbers.add(num);
            }
        }
        return Array.from(numbers);
    }

    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    static playAudio(audioElement, volume = 1) {
        if (audioElement && gameState.isAudioEnabled) {
            audioElement.volume = volume;
            audioElement.currentTime = 0;
            audioElement.play().catch(e => console.log('Audio play failed:', e));
        }
    }

    static showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    static createLoadingOverlay(text = 'Loading...') {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${text}</div>
        `;
        
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            overlay.classList.add('active');
        }, 10);
        
        return {
            hide: () => {
                overlay.classList.remove('active');
                setTimeout(() => {
                    document.body.removeChild(overlay);
                }, 500);
            },
            updateText: (newText) => {
                overlay.querySelector('.loading-text').textContent = newText;
            }
        };
    }

    static navigateTo(url, transition = true) {
        if (transition) {
            const transitionOverlay = document.createElement('div');
            transitionOverlay.className = 'page-transition';
            document.body.appendChild(transitionOverlay);
            
            setTimeout(() => {
                transitionOverlay.classList.add('active');
                setTimeout(() => {
                    window.location.href = url;
                }, 800);
            }, 100);
        } else {
            window.location.href = url;
        }
    }

    // ===== NEW: Deterministic Card Generation =====
    static generateBingoCardNumbers(cardNumber) {
        const card = cardGenerator.generateCard(cardNumber);
        return card.numbers;
    }

    static getCardGrid(cardNumber) {
        const card = cardGenerator.generateCard(cardNumber);
        return cardGenerator.numbersToGrid(card.numbers);
    }

    static getCardPreviewHTML(cardNumber) {
        const grid = this.getCardGrid(cardNumber);
        let html = '';
        
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const number = grid[row][col];
                const isFree = number === 'FREE';
                const cssClass = isFree ? 'preview-cell free' : 'preview-cell';
                html += `<div class="${cssClass}">${number}</div>`;
            }
        }
        
        return html;
    }
    // ===== END NEW =====
}

// Initialize global game state
const gameState = new GameState();
// Add this class to common.js
class ServerConnection {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.serverUrl = window.location.origin.replace(/^http/, 'ws');
    }
    
    connect() {
        this.socket = io(this.serverUrl);
        
        this.socket.on('connect', () => {
            console.log('Connected to game server');
            this.isConnected = true;
            
            // Join game
            this.socket.emit('playerJoin', {
                playerId: gameState.playerId,
                playerName: gameState.playerName
            });
        });
        
        this.socket.on('gameState', (state) => {
            this.handleGameState(state);
        });
        
        this.socket.on('newNumber', (numberData) => {
            this.handleNewNumber(numberData);
        });
        
        this.socket.on('gamePhase', (phase) => {
            this.handleGamePhase(phase);
        });
        
        this.socket.on('countdown', (seconds) => {
            this.handleCountdown(seconds);
        });
        
        this.socket.on('cardsUpdate', (data) => {
            this.handleCardsUpdate(data);
        });
        
        this.socket.on('winner', (winnerData) => {
            this.handleWinner(winnerData);
        });
        
        this.socket.on('disconnect', () => {
            this.isConnected = false;
            console.log('Disconnected from server');
        });
    }
    
    handleGameState(state) {
        // Update local game state from server
        gameState.calledNumbers = new Set(state.calledNumbers);
        gameState.activePlayers = state.playerCount;
        
        // Update UI based on game phase
        if (state.phase === 'selection') {
            this.showSelectionPhase(state.selectionTimeLeft);
        } else if (state.phase === 'playing') {
            this.showGamePhase();
        }
    }
    
    handleNewNumber(numberData) {
        // Update called numbers display
        gameState.calledNumbers.add(numberData.number);
        
        // Trigger number call animation
        if (window.updateNumberDisplay) {
            window.updateNumberDisplay(numberData);
        }
        
        // Auto-mark if enabled
        if (gameState.isAutoMark) {
            this.autoMarkNumber(numberData.number);
        }
    }
    
    handleGamePhase(phase) {
        if (phase === 'playing') {
            // Start 3-second READY animation
            this.showReadyAnimation();
        }
    }
    
    // ... other handler methods
    
    sendCardSelection(cardNumbers) {
        if (this.socket && this.isConnected) {
            this.socket.emit('cardSelection', {
                playerId: gameState.playerId,
                cardNumbers: cardNumbers
            });
        }
    }
    
    claimBingo(cardId, pattern) {
        if (this.socket && this.isConnected) {
            this.socket.emit('bingoClaim', {
                playerId: gameState.playerId,
                cardId: cardId,
                pattern: pattern
            });
        }
    }
}

// Add to global scope
const serverConnection = new ServerConnection();

// Modify BingoUtils.navigateTo to use server connection
BingoUtils.navigateTo = function(url, transition = true) {
    if (serverConnection.isConnected) {
        serverConnection.socket.disconnect();
    }
    
    if (transition) {
        const transitionOverlay = document.createElement('div');
        transitionOverlay.className = 'page-transition';
        document.body.appendChild(transitionOverlay);
        
        setTimeout(() => {
            transitionOverlay.classList.add('active');
            setTimeout(() => {
                window.location.href = url;
            }, 800);
        }, 100);
    } else {
        window.location.href = url;
    }
};