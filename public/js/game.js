// ====================================================
// GAME.JS - UPDATED with 3-second READY animation
// ====================================================

class GamePage {
    constructor() {
        this.gameState = gameState;
        this.telegramManager = telegramManager;
        
        // BINGO ranges
        this.BINGO_RANGES = {
            'B': { min: 1, max: 15 },
            'I': { min: 16, max: 30 },
            'N': { min: 31, max: 45 },
            'G': { min: 46, max: 60 },
            'O': { min: 61, max: 75 }
        };
        
        // DOM elements
        this.currentNumberDisplay = document.getElementById('currentNumberDisplay');
        this.currentNumber = document.getElementById('currentNumber');
        this.numberLetter = document.getElementById('numberLetter');
        this.calledNumbersGrid = document.getElementById('calledNumbersGrid');
        this.numbersCalled = document.getElementById('numbersCalled');
        this.gameTime = document.getElementById('gameTime');
        this.activePlayers = document.getElementById('activePlayers');
        this.nextCallTimer = document.getElementById('nextCallTimer');
        this.playerCardsContainer = document.getElementById('playerCardsContainer');
        this.playerName = document.getElementById('playerName');
        this.playerAvatar = document.getElementById('playerAvatar');
        this.autoMarkBtn = document.getElementById('autoMarkBtn');
        this.bingoBtn = document.getElementById('bingoBtn');
        this.audioToggle = document.getElementById('audioToggle');
        
        // NEW: READY animation elements
        this.readyOverlay = null;
        this.readyText = null;
        
        // Audio elements
        this.numberCallAudio = document.getElementById('numberCallAudio');
        this.bingoAudio = document.getElementById('bingoAudio');
        this.backgroundMusic = document.getElementById('backgroundMusic');
        this.readySound = document.getElementById('readySound');
        
        // Game state
        this.bingoNumbers = {};
        this.nextCallTime = 5;
        this.callIntervalId = null;
        this.gameTimerId = null;
        this.nextCallTimerId = null;
        this.callInterval = 5000;
        this.isGameActive = false; // Start as false, will be true after READY
        this.winDetected = false;
        
        // Track winning pattern details
        this.winningPatternData = {
            card1: { winningCells: [], winningLines: [] },
            card2: { winningCells: [], winningLines: [] }
        };
        
        this.init();
    }

    init() {
        this.loadGameState();
        this.setupUserInfo();
        this.generateBingoCards();
        this.initializeDisplays();
        this.setupAudio();
        this.checkForExistingCalls();
        this.setupEventListeners();
        
        // Start with READY animation for 3 seconds
        this.showReadyAnimation();
    }

    loadGameState() {
        this.gameState.loadFromSession();
    }

    setupUserInfo() {
        this.playerName.textContent = this.gameState.playerName;
        this.playerAvatar.textContent = this.gameState.playerName.charAt(0).toUpperCase();
    }

    generateBingoCards() {
        this.playerCardsContainer.innerHTML = '';
        
        this.gameState.selectedCards.forEach((cardNumber, index) => {
            const cardId = `card${index + 1}`;
            
            // Get deterministic card numbers for this card number
            const bingoNumbers = BingoUtils.generateBingoCardNumbers(cardNumber);
            this.bingoNumbers[cardId] = bingoNumbers;
            
            const cardElement = this.createBingoCard(cardNumber, cardId, bingoNumbers);
            this.playerCardsContainer.appendChild(cardElement);
        });
    }

    createBingoCard(cardNumber, cardId, bingoNumbers) {
        const cardElement = document.createElement('div');
        cardElement.className = 'bingo-card';
        cardElement.id = cardId;
        
        const cardHTML = `
            <div class="card-header">
                <h3 class="card-title">
                    <i class="fas fa-dice-${cardId === 'card1' ? 'one' : 'two'}"></i>
                    CARD #${cardNumber}
                    <span class="card-type">(Fixed Pattern)</span>
                </h3>
                <div class="card-number">#${cardNumber}</div>
            </div>
            
            <div class="bingo-grid">
                ${['B', 'I', 'N', 'G', 'O'].map(letter => 
                    `<div class="grid-header">${letter}</div>`
                ).join('')}
                
                ${Array.from({ length: 25 }, (_, i) => {
                    const row = Math.floor(i / 5);
                    const col = i % 5;
                    const numberIndex = col * 5 + row;
                    const number = bingoNumbers[numberIndex];
                    const isFreeSpace = number === 0;
                    
                    return `
                        <div class="grid-cell ${isFreeSpace ? 'free marked' : ''}" 
                             data-card="${cardId}" 
                             data-number="${isFreeSpace ? 'FREE' : number}"
                             data-row="${row}" 
                             data-col="${col}"
                             data-index="${i}">
                            ${isFreeSpace ? 'FREE' : number}
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div class="card-stats">
                <div class="stat">
                    <div class="stat-value" id="${cardId}-marked">0</div>
                    <div class="stat-label">Marked</div>
                </div>
                <div class="stat">
                    <div class="stat-value" id="${cardId}-needed">5</div>
                    <div class="stat-label">To Win</div>
                </div>
                <div class="stat">
                    <div class="stat-value" id="${cardId}-lines">0</div>
                    <div class="stat-label">Lines</div>
                </div>
            </div>
        `;
        
        cardElement.innerHTML = cardHTML;
        
        const cells = cardElement.querySelectorAll('.grid-cell:not(.free)');
        cells.forEach(cell => {
            cell.addEventListener('click', () => {
                const cardId = cell.dataset.card;
                const number = parseInt(cell.dataset.number);
                this.toggleNumberMark(cardId, number, cell);
            });
        });
        
        return cardElement;
    }

    // ===== NEW: READY ANIMATION =====
    showReadyAnimation() {
        // Create overlay
        this.readyOverlay = document.createElement('div');
        this.readyOverlay.className = 'ready-overlay';
        this.readyOverlay.innerHTML = `
            <div class="ready-container">
                <div class="ready-text" id="readyText">READY</div>
                <div class="countdown" id="countdown">3</div>
            </div>
        `;
        
        document.body.appendChild(this.readyOverlay);
        
        // Animate READY text
        this.readyText = document.getElementById('readyText');
        
        // Animation sequence
        this.animateReadyText();
        
        // Play ready sound if available
        if (this.readySound) {
            this.readySound.play().catch(e => console.log('Ready sound play failed:', e));
        }
        
        // Countdown from 3
        const countdownElement = document.getElementById('countdown');
        let countdown = 3;
        
        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                countdownElement.textContent = countdown;
                countdownElement.classList.add('pulse');
                setTimeout(() => countdownElement.classList.remove('pulse'), 300);
            } else {
                clearInterval(countdownInterval);
                countdownElement.textContent = 'GO!';
                countdownElement.classList.add('go-animation');
                
                // Start game after 1 second
                setTimeout(() => {
                    this.removeReadyAnimation();
                    this.startGame();
                }, 1000);
            }
        }, 1000);
    }

    animateReadyText() {
        const letters = this.readyText.textContent.split('');
        this.readyText.innerHTML = '';
        
        letters.forEach((letter, index) => {
            const span = document.createElement('span');
            span.textContent = letter;
            span.style.animationDelay = `${index * 0.1}s`;
            this.readyText.appendChild(span);
        });
    }

    removeReadyAnimation() {
        if (this.readyOverlay) {
            this.readyOverlay.classList.add('fade-out');
            setTimeout(() => {
                document.body.removeChild(this.readyOverlay);
                this.readyOverlay = null;
            }, 500);
        }
    }

    startGame() {
        this.isGameActive = true;
        this.startTimers();
        this.startCaller();
        BingoUtils.showNotification('Game started! Numbers will be called every 5 seconds', 'success');
    }
    // ===== END NEW =====

    toggleNumberMark(cardId, number, cell) {
        if (!this.isGameActive) return;
        
        const markedNumbers = this.gameState.markedNumbers[cardId];
        
        if (markedNumbers.has(number)) {
            markedNumbers.delete(number);
            cell.classList.remove('marked');
        } else {
            markedNumbers.add(number);
            cell.classList.add('marked');
            
            this.checkForWinningLine(cardId);
        }
        
        this.updateCardStats(cardId);
    }

    updateCardStats(cardId) {
        const markedCount = this.gameState.markedNumbers[cardId].size + 1;
        const linesCount = this.gameState.winningLines[cardId].length;
        
        document.getElementById(`${cardId}-marked`).textContent = markedCount;
        document.getElementById(`${cardId}-lines`).textContent = linesCount;
        
        this.updateBingoButton();
    }

    // ===== UPDATED: Improved win detection =====
    checkForWinningLine(cardId) {
        if (this.winDetected || !this.isGameActive) return;
        
        const markedNumbers = this.gameState.markedNumbers[cardId];
        const calledNumbers = this.gameState.calledNumbers;
        
        // Check all possible winning patterns
        const patterns = [
            // Rows
            [[0,0], [0,1], [0,2], [0,3], [0,4]],
            [[1,0], [1,1], [1,2], [1,3], [1,4]],
            [[2,0], [2,1], [2,2], [2,3], [2,4]],
            [[3,0], [3,1], [3,2], [3,3], [3,4]],
            [[4,0], [4,1], [4,2], [4,3], [4,4]],
            // Columns
            [[0,0], [1,0], [2,0], [3,0], [4,0]],
            [[0,1], [1,1], [2,1], [3,1], [4,1]],
            [[0,2], [1,2], [2,2], [3,2], [4,2]],
            [[0,3], [1,3], [2,3], [3,3], [4,3]],
            [[0,4], [1,4], [2,4], [3,4], [4,4]],
            // Diagonals
            [[0,0], [1,1], [2,2], [3,3], [4,4]],
            [[0,4], [1,3], [2,2], [3,1], [4,0]],
            // Four corners
            [[0,0], [0,4], [4,0], [4,4]]
        ];
        
        patterns.forEach((pattern, patternIndex) => {
            let isComplete = true;
            let allNumbersCalled = true;
            const patternCells = [];
            
            pattern.forEach(([row, col]) => {
                const cell = document.querySelector(`[data-card="${cardId}"][data-row="${row}"][data-col="${col}"]`);
                if (!cell) return;
                
                patternCells.push(cell);
                const number = cell.dataset.number;
                
                // Check if marked (FREE is always marked)
                if (number !== 'FREE' && !markedNumbers.has(parseInt(number))) {
                    isComplete = false;
                }
                
                // Check if called (FREE doesn't need to be called)
                if (number !== 'FREE' && !calledNumbers.has(parseInt(number))) {
                    allNumbersCalled = false;
                }
            });
            
            // VERIFIED WIN: Must be complete AND all numbers must have been called
            if (isComplete && allNumbersCalled && patternCells.length === pattern.length) {
                const patternName = this.getPatternName(patternIndex, pattern);
                
                // Check if this pattern is already recorded
                const existingIndex = this.winningPatternData[cardId].winningLines.findIndex(
                    line => line.name === patternName
                );
                
                if (existingIndex === -1) {
                    // Record new winning pattern
                    this.winningPatternData[cardId].winningLines.push({
                        name: patternName,
                        cells: pattern.map(([row, col]) => row * 5 + col)
                    });
                    
                    // Add winning cells
                    pattern.forEach(([row, col]) => {
                        const cellIndex = row * 5 + col;
                        if (!this.winningPatternData[cardId].winningCells.includes(cellIndex)) {
                            this.winningPatternData[cardId].winningCells.push(cellIndex);
                        }
                    });
                    
                    // Highlight cells
                    patternCells.forEach(cell => {
                        cell.classList.add('winning');
                    });
                    
                    // Add to game state
                    this.gameState.winningLines[cardId].push(patternName);
                    
                    console.log(`Verified win on ${cardId}: ${patternName}`);
                    this.checkForAutoWin();
                }
            }
        });
        
        this.updateCardStats(cardId);
    }

    getPatternName(patternIndex, pattern) {
        if (patternIndex < 5) return `Row ${patternIndex + 1}`;
        if (patternIndex < 10) return `Column ${String.fromCharCode(65 + (patternIndex - 5))}`;
        if (patternIndex === 10) return 'Diagonal (Top-Left to Bottom-Right)';
        if (patternIndex === 11) return 'Diagonal (Top-Right to Bottom-Left)';
        if (patternIndex === 12) return 'Four Corners';
        return `Pattern ${patternIndex + 1}`;
    }

    checkForAutoWin() {
        const totalLines = this.gameState.winningLines.card1.length + this.gameState.winningLines.card2.length;
        
        if (totalLines > 0 && !this.winDetected) {
            this.winDetected = true;
            this.stopGame();
            
            // Wait 1 second to show the winning pattern, then go to winner page
            setTimeout(() => {
                this.claimBingo();
            }, 1000);
        }
    }

    stopGame() {
        this.isGameActive = false;
        
        clearInterval(this.callIntervalId);
        clearInterval(this.gameTimerId);
        clearInterval(this.nextCallTimerId);
        
        this.callIntervalId = null;
        this.gameTimerId = null;
        this.nextCallTimerId = null;
        
        this.bingoBtn.disabled = true;
        this.autoMarkBtn.disabled = true;
        
        BingoUtils.playAudio(this.bingoAudio, 0.8);
        BingoUtils.showNotification('BINGO! Game stopped. Preparing winner announcement...', 'success');
    }

    updateBingoButton() {
        const hasWinningLine = this.gameState.winningLines.card1.length > 0 || this.gameState.winningLines.card2.length > 0;
        this.bingoBtn.disabled = !hasWinningLine;
        
        if (hasWinningLine) {
            const totalLines = this.gameState.winningLines.card1.length + this.gameState.winningLines.card2.length;
            this.bingoBtn.innerHTML = `<i class="fas fa-trophy"></i> BINGO! (${totalLines} Line${totalLines > 1 ? 's' : ''})`;
        } else {
            this.bingoBtn.innerHTML = `<i class="fas fa-trophy"></i> BINGO! I HAVE A LINE!`;
        }
    }

    initializeDisplays() {
        this.createCalledNumbersGrid();
        this.updateDisplays();
    }

    createCalledNumbersGrid() {
        this.calledNumbersGrid.innerHTML = '';
        
        const columns = [
            { letter: 'B', min: 1, max: 15, color: '#FF0000' },
            { letter: 'I', min: 16, max: 30, color: '#00FF00' },
            { letter: 'N', min: 31, max: 45, color: '#0000FF' },
            { letter: 'G', min: 46, max: 60, color: '#FFFF00' },
            { letter: 'O', min: 61, max: 75, color: '#FF00FF' }
        ];
        
        columns.forEach(col => {
            const columnDiv = document.createElement('div');
            columnDiv.className = 'bingo-column';
            columnDiv.id = `column-${col.letter}`;
            
            const headerDiv = document.createElement('div');
            headerDiv.className = 'column-header';
            headerDiv.textContent = col.letter;
            headerDiv.style.color = col.color;
            headerDiv.style.borderColor = col.color;
            columnDiv.appendChild(headerDiv);
            
            const numbersContainer = document.createElement('div');
            numbersContainer.className = 'column-numbers';
            numbersContainer.id = `numbers-${col.letter}`;
            
            for (let i = col.min; i <= col.max; i++) {
                const numberElement = document.createElement('div');
                numberElement.className = 'called-number';
                numberElement.textContent = i;
                numberElement.dataset.number = i;
                numberElement.dataset.column = col.letter;
                numbersContainer.appendChild(numberElement);
            }
            
            columnDiv.appendChild(numbersContainer);
            this.calledNumbersGrid.appendChild(columnDiv);
        });
    }

    updateCalledNumbersDisplay() {
        this.gameState.calledNumbers.forEach(number => {
            const element = document.querySelector(`.called-number[data-number="${number}"]`);
            if (element) {
                element.classList.add('called');
                element.style.backgroundColor = '#4CAF50';
                element.style.color = '#FFFFFF';
                element.style.fontWeight = 'bold';
                element.style.boxShadow = '0 0 10px rgba(255,255,255,0.5)';
            }
        });
        
        this.numbersCalled.textContent = this.gameState.calledNumbers.size;
    }

    updateDisplays() {
        this.activePlayers.textContent = this.gameState.activePlayers;
    }

    generateNextNumber() {
        if (this.gameState.calledNumbers.size >= 75) {
            return null;
        }
        
        let number;
        do {
            number = Math.floor(Math.random() * 75) + 1;
        } while (this.gameState.calledNumbers.has(number));
        
        return number;
    }

    callNextNumber() {
        if (!this.isGameActive) return;
        
        const number = this.generateNextNumber();
        if (!number) {
            this.endGame();
            return;
        }
        
        this.gameState.calledNumbers.add(number);
        
        this.updateNumberDisplay(number);
        this.updateCalledNumbersDisplay();
        
        if (this.gameState.isAutoMark) {
            this.autoMarkNumbers(number);
        }
        
        BingoUtils.playAudio(this.numberCallAudio, 0.7);
        
        this.nextCallTime = 5;
        this.updateNextCallTimer();
        
        this.gameState.saveToSession();
    }

    updateNumberDisplay(number) {
        let letter = '';
        for (const [l, range] of Object.entries(this.BINGO_RANGES)) {
            if (number >= range.min && number <= range.max) {
                letter = l;
                break;
            }
        }
        
        const letterColors = {
            'B': '#FF0000',
            'I': '#00FF00',
            'N': '#0000FF',
            'G': '#FFFF00',
            'O': '#FF00FF'
        };
        
        this.currentNumber.style.transform = 'scale(0.5)';
        this.currentNumber.style.opacity = '0';
        
        setTimeout(() => {
            this.currentNumber.textContent = number.toString().padStart(2, '0');
            this.numberLetter.textContent = letter;
            this.currentNumberDisplay.textContent = `${letter}-${number}`;
            
            if (letterColors[letter]) {
                this.currentNumber.style.color = letterColors[letter];
                this.numberLetter.style.color = letterColors[letter];
            }
            
            this.currentNumber.style.transform = 'scale(1)';
            this.currentNumber.style.opacity = '1';
            this.currentNumber.classList.add('animate-number-pop');
            
            setTimeout(() => {
                this.currentNumber.classList.remove('animate-number-pop');
            }, 500);
        }, 300);
    }

    autoMarkNumbers(number) {
        if (!this.gameState.calledNumbers.has(number)) return;
        
        this.gameState.selectedCards.forEach((_, index) => {
            const cardId = `card${index + 1}`;
            const bingoNumbers = this.bingoNumbers[cardId];
            
            if (bingoNumbers.includes(number)) {
                const cells = document.querySelectorAll(`[data-card="${cardId}"]`);
                cells.forEach(cell => {
                    if (parseInt(cell.dataset.number) === number) {
                        this.gameState.markedNumbers[cardId].add(number);
                        cell.classList.add('marked');
                        
                        this.checkForWinningLine(cardId);
                    }
                });
            }
        });
    }

    checkForExistingCalls() {
        // Don't generate any numbers before READY animation
        // Numbers will start after the 3-second READY animation
    }

    startTimers() {
        this.startGameTimer();
    }

    startGameTimer() {
        this.gameTimerId = setInterval(() => {
            this.gameState.gameTime++;
            
            const minutes = Math.floor(this.gameState.gameTime / 60);
            const seconds = this.gameState.gameTime % 60;
            this.gameTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    startCaller() {
        // First call immediately
        this.callNextNumber();
        
        // Then every 5 seconds
        this.callIntervalId = setInterval(() => {
            this.callNextNumber();
        }, this.callInterval);
        
        this.startNextCallTimer();
    }

    startNextCallTimer() {
        this.nextCallTimerId = setInterval(() => {
            this.nextCallTime--;
            this.updateNextCallTimer();
            
            if (this.nextCallTime <= 0) {
                this.nextCallTime = 5;
            }
        }, 1000);
    }

    updateNextCallTimer() {
        this.nextCallTimer.textContent = this.nextCallTime.toString().padStart(2, '0');
    }

    setupAudio() {
        if (this.numberCallAudio) this.numberCallAudio.volume = 0.7;
        if (this.bingoAudio) this.bingoAudio.volume = 0.8;
        if (this.backgroundMusic) this.backgroundMusic.volume = 0.3;
        
        // Don't play background music until game starts
        if (this.gameState.isAudioEnabled && this.backgroundMusic) {
            this.backgroundMusic.pause();
        }
    }

    endGame() {
        this.stopGame();
        BingoUtils.showNotification('All numbers have been called! Game over.', 'info');
    }

    setupEventListeners() {
        this.autoMarkBtn.addEventListener('click', () => {
            if (!this.isGameActive) return;
            
            this.gameState.isAutoMark = !this.gameState.isAutoMark;
            this.autoMarkBtn.innerHTML = this.gameState.isAutoMark ? 
                `<i class="fas fa-robot"></i> AUTO-MARK: ON` :
                `<i class="fas fa-robot"></i> AUTO-MARK: OFF`;
            this.autoMarkBtn.style.background = this.gameState.isAutoMark ?
                'linear-gradient(135deg, #4CAF50, #2E7D32)' :
                'linear-gradient(135deg, #f44336, #c62828)';
            
            this.gameState.saveToSession();
        });
        
        this.bingoBtn.addEventListener('click', () => {
            if (this.bingoBtn.disabled || !this.isGameActive) return;
            
            // Manual BINGO - verify again before claiming
            this.verifyManualWin();
        });
        
        this.audioToggle.addEventListener('click', () => {
            this.gameState.isAudioEnabled = !this.gameState.isAudioEnabled;
            
            if (this.gameState.isAudioEnabled) {
                this.audioToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
                this.audioToggle.style.color = '#00b4d8';
                this.audioToggle.style.borderColor = '#00b4d8';
                
                if (this.isGameActive && this.backgroundMusic) {
                    this.backgroundMusic.play().catch(e => console.log('Audio play failed:', e));
                }
            } else {
                this.audioToggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
                this.audioToggle.style.color = '#ff4b4b';
                this.audioToggle.style.borderColor = '#ff4b4b';
                
                if (this.backgroundMusic) {
                    this.backgroundMusic.pause();
                }
            }
            
            this.gameState.saveToSession();
        });
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('Game paused');
                if (this.backgroundMusic) {
                    this.backgroundMusic.pause();
                }
            } else {
                console.log('Game resumed');
                if (this.gameState.isAudioEnabled && this.backgroundMusic && this.isGameActive) {
                    this.backgroundMusic.play().catch(e => console.log('Audio play failed:', e));
                }
            }
        });
    }

    verifyManualWin() {
        // Double-check all winning patterns before claiming
        let hasVerifiedWin = false;
        
        this.gameState.selectedCards.forEach((_, index) => {
            const cardId = `card${index + 1}`;
            const markedNumbers = this.gameState.markedNumbers[cardId];
            const calledNumbers = this.gameState.calledNumbers;
            
            // Re-check all patterns
            const patterns = [
                [[0,0], [0,1], [0,2], [0,3], [0,4]],
                [[1,0], [1,1], [1,2], [1,3], [1,4]],
                [[2,0], [2,1], [2,2], [2,3], [2,4]],
                [[3,0], [3,1], [3,2], [3,3], [3,4]],
                [[4,0], [4,1], [4,2], [4,3], [4,4]],
                [[0,0], [1,0], [2,0], [3,0], [4,0]],
                [[0,1], [1,1], [2,1], [3,1], [4,1]],
                [[0,2], [1,2], [2,2], [3,2], [4,2]],
                [[0,3], [1,3], [2,3], [3,3], [4,3]],
                [[0,4], [1,4], [2,4], [3,4], [4,4]],
                [[0,0], [1,1], [2,2], [3,3], [4,4]],
                [[0,4], [1,3], [2,2], [3,1], [4,0]],
                [[0,0], [0,4], [4,0], [4,4]]
            ];
            
            patterns.forEach((pattern, patternIndex) => {
                let isComplete = true;
                let allNumbersCalled = true;
                
                pattern.forEach(([row, col]) => {
                    const cell = document.querySelector(`[data-card="${cardId}"][data-row="${row}"][data-col="${col}"]`);
                    if (!cell) return;
                    
                    const number = cell.dataset.number;
                    
                    if (number !== 'FREE' && !markedNumbers.has(parseInt(number))) {
                        isComplete = false;
                    }
                    
                    if (number !== 'FREE' && !calledNumbers.has(parseInt(number))) {
                        allNumbersCalled = false;
                    }
                });
                
                if (isComplete && allNumbersCalled) {
                    hasVerifiedWin = true;
                }
            });
        });
        
        if (hasVerifiedWin) {
            this.stopGame();
            this.claimBingo();
        } else {
            BingoUtils.showNotification('No valid winning line detected yet! Keep playing.', 'warning');
        }
    }

    claimBingo() {
        // Get all marked numbers for each card
        const markedNumbers1 = Array.from(this.gameState.markedNumbers.card1);
        const markedNumbers2 = Array.from(this.gameState.markedNumbers.card2);
        
        // Get card numbers
        const card1Numbers = this.bingoNumbers.card1;
        const card2Numbers = this.bingoNumbers.card2;
        
        const winnerData = {
            playerName: this.gameState.playerName,
            playerId: this.gameState.playerId,
            cardNumbers: this.gameState.selectedCards,
            winningLines: {
                card1: this.gameState.winningLines.card1.length,
                card2: this.gameState.winningLines.card2.length
            },
            totalLines: this.gameState.winningLines.card1.length + this.gameState.winningLines.card2.length,
            gameTime: this.gameState.gameTime,
            calledNumbers: this.gameState.calledNumbers.size,
            // Save detailed winning pattern data
            winningPatternData: this.winningPatternData,
            // Save card data for displaying on winner page
            cardData: {
                card1: {
                    numbers: card1Numbers,
                    markedNumbers: markedNumbers1,
                    winningCells: this.winningPatternData.card1.winningCells,
                    winningLines: this.winningPatternData.card1.winningLines.map(wl => wl.name)
                },
                card2: {
                    numbers: card2Numbers,
                    markedNumbers: markedNumbers2,
                    winningCells: this.winningPatternData.card2.winningCells,
                    winningLines: this.winningPatternData.card2.winningLines.map(wl => wl.name)
                }
            }
        };
        
        console.log('VERIFIED WINNER DATA:', winnerData);
        
        // Save to sessionStorage
        try {
            sessionStorage.setItem('bingoWinner', JSON.stringify(winnerData));
            console.log('Winner data saved successfully');
        } catch (error) {
            console.error('Error saving winner data:', error);
        }
        
        this.sendWinData(winnerData);
        
        // Redirect to winner page
        setTimeout(() => {
            window.location.href = 'winner.html';
        }, 1500);
    }

    sendWinData(winnerData) {
        const winData = {
            action: 'player_win',
            ...winnerData,
            timestamp: Date.now(),
            platform: 'telegram'
        };
        
        console.log('Sending win data:', winData);
        
        if (this.telegramManager.isInitialized) {
            this.telegramManager.sendData(winData);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GamePage();
});