// ====================================================
// WINNER.JS - UPDATED with Perfect Pattern Highlighting
// ====================================================

class WinnerPage {
    constructor() {
        console.log('Winner page initializing...');
        
        // Get DOM elements
        this.winnerContainer = document.getElementById('winnerContainer');
        this.confettiContainer = document.getElementById('confettiContainer');
        this.winnerAudio = document.getElementById('winnerAudio');
        
        // Initialize
        this.init();
    }

    init() {
        console.log('Initializing winner page...');
        
        // Load winner data
        const winnerData = this.loadWinnerData();
        console.log('VERIFIED Winner data:', winnerData);
        
        // Verify the win data is valid
        if (!this.verifyWinData(winnerData)) {
            console.error('Invalid win data, redirecting...');
            this.redirectToCardSelection();
            return;
        }
        
        // Create confetti
        this.createConfetti();
        
        // Setup audio
        this.setupAudio();
        
        // Display the winner card
        this.displayWinnerCard(winnerData);
        
        // Start auto-redirect countdown
        this.startAutoRedirect();
    }

    loadWinnerData() {
        console.log('Loading winner data from sessionStorage...');
        
        try {
            const savedData = sessionStorage.getItem('bingoWinner');
            
            if (savedData) {
                const data = JSON.parse(savedData);
                console.log('Data loaded successfully');
                return data;
            } else {
                console.warn('No winner data found, redirecting...');
                this.redirectToCardSelection();
                return null;
            }
        } catch (error) {
            console.error('Error loading winner data:', error);
            this.redirectToCardSelection();
            return null;
        }
    }

    verifyWinData(winnerData) {
        if (!winnerData) return false;
        if (!winnerData.cardData || !winnerData.cardData.card1) return false;
        if (!winnerData.cardData.card1.winningCells || winnerData.cardData.card1.winningCells.length === 0) {
            // Check card2 if card1 has no winning cells
            if (!winnerData.cardData.card2 || !winnerData.cardData.card2.winningCells || winnerData.cardData.card2.winningCells.length === 0) {
                return false;
            }
        }
        return true;
    }

    createConfetti() {
        console.log('Creating confetti...');
        
        const colors = ['#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800'];
        const confettiCount = 150;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.setProperty('--color', colors[Math.floor(Math.random() * colors.length)]);
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.width = `${Math.random() * 10 + 5}px`;
            confetti.style.height = `${Math.random() * 15 + 10}px`;
            confetti.style.opacity = Math.random() * 0.5 + 0.5;
            
            const animationDuration = Math.random() * 3 + 2;
            const animationDelay = Math.random() * 5;
            
            confetti.style.animation = `confettiFall ${animationDuration}s linear ${animationDelay}s infinite`;
            
            this.confettiContainer.appendChild(confetti);
        }
    }

    setupAudio() {
        console.log('Setting up audio...');
        
        if (this.winnerAudio) {
            this.winnerAudio.volume = 0.6;
            
            // Try to play audio
            const playAudio = () => {
                this.winnerAudio.play().catch(e => {
                    console.log('Audio play failed:', e);
                });
            };
            
            // Try immediately
            playAudio();
            
            // Also try on any user interaction
            document.addEventListener('click', playAudio, { once: true });
        }
    }

    displayWinnerCard(winnerData) {
        console.log('Displaying winner card...');
        
        // Clear container
        this.winnerContainer.innerHTML = '';
        
        // Find which card has the winning pattern
        const winningCardIndex = winnerData.cardData.card1.winningCells.length > 0 ? 1 : 2;
        const winningCard = winningCardIndex === 1 ? winnerData.cardData.card1 : winnerData.cardData.card2;
        const cardNumber = winnerData.cardNumbers[winningCardIndex - 1];
        
        // Create the winner card HTML
        const html = `
            <div class="winner-header">
                <div class="winner-trophy">
                    <i class="fas fa-trophy"></i>
                </div>
                <h1 class="winner-title">BINGO VICTORY!</h1>
                <p class="winner-subtitle">Verified Win - No False Positives</p>
            </div>
            
            <div class="player-info-section">
                <div class="player-display">
                    <div class="player-avatar-large">
                        ${winnerData.playerName.charAt(0).toUpperCase()}
                    </div>
                    <div class="player-details">
                        <h2>${winnerData.playerName}</h2>
                        <p>Player ID: ${winnerData.playerId}</p>
                    </div>
                </div>
                
                <div class="stats-section">
                    <div class="stat-box">
                        <div class="stat-value">${winnerData.totalLines}</div>
                        <div class="stat-label">Verified Lines</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${winnerData.gameTime}s</div>
                        <div class="stat-label">Game Time</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${winnerData.calledNumbers}</div>
                        <div class="stat-label">Numbers Called</div>
                    </div>
                </div>
            </div>
            
            <div class="bingo-card-display">
                <h2 class="card-title">
                    <i class="fas fa-dice-${winningCardIndex === 1 ? 'one' : 'two'}"></i> 
                    WINNING CARD #${cardNumber}
                </h2>
                
                <div class="winning-pattern-badge">
                    <i class="fas fa-medal"></i>
                    ${winningCard.winningLines.length} VERIFIED WINNING LINE${winningCard.winningLines.length > 1 ? 'S' : ''}
                </div>
                
                <div class="bingo-grid-container" id="bingoGrid">
                    <!-- Bingo grid will be generated by JavaScript -->
                </div>
                
                <div class="winning-pattern-details">
                    <h3><i class="fas fa-star"></i> Winning Pattern Details</h3>
                    <div class="pattern-list" id="patternList">
                        <!-- Pattern details will be inserted here -->
                    </div>
                </div>
            </div>
            
            <div class="countdown-message" id="countdownMessage">
                <i class="fas fa-hourglass-half"></i> 
                Returning to card selection in <span id="countdownNumber">10</span> seconds...
            </div>
        `;
        
        // Insert HTML into container
        this.winnerContainer.innerHTML = html;
        
        // Generate the bingo grid with perfect highlighting
        this.generateBingoGrid(winningCard, cardNumber);
        
        // Generate pattern list
        this.generatePatternList(winningCard);
        
        console.log('Winner card displayed successfully');
    }

    generateBingoGrid(cardData, cardNumber) {
        const gridContainer = document.getElementById('bingoGrid');
        if (!gridContainer) return;
        
        // Clear any existing content
        gridContainer.innerHTML = '';
        
        // Get the actual card numbers for this card number
        const actualCardNumbers = BingoUtils.generateBingoCardNumbers(cardNumber);
        
        // Create column headers
        ['B', 'I', 'N', 'G', 'O'].forEach(letter => {
            const header = document.createElement('div');
            header.className = 'bingo-header';
            header.textContent = letter;
            gridContainer.appendChild(header);
        });
        
        // Create the 5x5 grid (25 cells total)
        for (let i = 0; i < 25; i++) {
            const row = Math.floor(i / 5);
            const col = i % 5;
            
            const cell = document.createElement('div');
            cell.className = 'bingo-cell';
            cell.setAttribute('data-index', i);
            
            // Get the number from actualCardNumbers (column-major order)
            const numberIndex = col * 5 + row;
            const number = actualCardNumbers[numberIndex];
            
            // Check if this is the free space
            const isFreeSpace = number === 0;
            
            if (isFreeSpace) {
                cell.textContent = 'FREE';
                cell.className += ' free marked';
            } else {
                cell.textContent = number;
                
                // Check if this number is marked
                const isMarked = cardData.markedNumbers && 
                                cardData.markedNumbers.includes(number);
                
                if (isMarked) {
                    cell.className += ' marked';
                }
                
                // Check if this cell is part of winning pattern
                if (cardData.winningCells && cardData.winningCells.includes(i)) {
                    cell.className += ' winning-cell';
                    cell.title = 'Part of winning pattern';
                }
            }
            
            gridContainer.appendChild(cell);
        }
    }

    generatePatternList(cardData) {
        const patternList = document.getElementById('patternList');
        if (!patternList || !cardData.winningLines) return;
        
        patternList.innerHTML = '';
        
        cardData.winningLines.forEach((pattern, index) => {
            const patternItem = document.createElement('div');
            patternItem.className = 'pattern-item';
            patternItem.innerHTML = `
                <div class="pattern-number">${index + 1}</div>
                <div class="pattern-name">${pattern}</div>
                <div class="pattern-verified">
                    <i class="fas fa-check-circle"></i> Verified
                </div>
            `;
            patternList.appendChild(patternItem);
        });
    }

    startAutoRedirect() {
        let countdown = 10;
        const countdownElement = document.getElementById('countdownNumber');
        const countdownMessage = document.getElementById('countdownMessage');
        
        if (!countdownElement || !countdownMessage) return;
        
        const countdownInterval = setInterval(() => {
            countdown--;
            countdownElement.textContent = countdown;
            
            if (countdown <= 3) {
                countdownElement.style.color = '#ff4b4b';
                countdownElement.classList.add('pulse');
            }
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                countdownMessage.innerHTML = '<i class="fas fa-rocket"></i> Redirecting now...';
                this.redirectToCardSelection();
            }
        }, 1000);
    }

    redirectToCardSelection() {
        console.log('Redirecting to card selection page...');
        
        // Clear session storage
        sessionStorage.removeItem('bingoWinner');
        sessionStorage.removeItem('bingoGameState');
        
        // Redirect to choose-cards.html
        window.location.href = 'choose-cards.html';
    }
}

// Start the winner page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting winner page...');
    
    // Hide loading message after a short delay
    setTimeout(() => {
        const loadingMessage = document.getElementById('loadingMessage');
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
        
        const winnerContainer = document.getElementById('winnerContainer');
        if (winnerContainer) {
            winnerContainer.style.display = 'block';
        }
    }, 500);
    
    // Initialize winner page
    new WinnerPage();
});

// Fallback in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new WinnerPage();
    });
} else {
    // DOM already loaded
    new WinnerPage();
}