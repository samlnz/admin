class WinnerDisplay {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.confetti = null;
        this.audio = new Audio('/audio/bingo-win.mp3');
        this.audio.volume = 0.8;
        
        this.init();
    }

    init() {
        // Create confetti canvas
        this.createConfettiCanvas();
        
        // Setup audio
        this.audio.preload = 'auto';
    }

    showWinner(winnerData) {
        // Stop any existing animation
        this.stopConfetti();
        
        // Clear container
        this.container.innerHTML = '';
        
        // Create winner display
        const winnerHTML = this.createWinnerHTML(winnerData);
        this.container.innerHTML = winnerHTML;
        
        // Start animations
        this.startConfetti();
        this.playWinSound();
        this.animateTrophy();
        
        // Add event listeners
        this.setupEventListeners();
    }

    createWinnerHTML(winnerData) {
        const { playerName, cardNumber, pattern, gameTime, calledNumbers, winnings } = winnerData;
        
        return `
            <div class="winner-overlay">
                <div class="winner-container">
                    <div class="winner-trophy animate-trophy">
                        <i class="fas fa-trophy"></i>
                    </div>
                    
                    <h1 class="winner-title">BINGO WINNER!</h1>
                    
                    <div class="winner-details">
                        <div class="winner-player">
                            <div class="player-avatar">
                                ${playerName.charAt(0).toUpperCase()}
                            </div>
                            <div class="player-info">
                                <h2>${playerName}</h2>
                                <p class="player-id">Player ID: ${winnerData.playerId || 'N/A'}</p>
                            </div>
                        </div>
                        
                        <div class="winner-stats">
                            <div class="stat-item">
                                <div class="stat-value">${cardNumber}</div>
                                <div class="stat-label">Winning Card</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${pattern}</div>
                                <div class="stat-label">Winning Pattern</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${gameTime}s</div>
                                <div class="stat-label">Game Time</div>
                            </div>
                        </div>
                        
                        ${winnings ? `
                        <div class="winner-prize">
                            <div class="prize-label">Prize Won</div>
                            <div class="prize-amount">ETB ${winnings.toFixed(2)}</div>
                        </div>
                        ` : ''}
                        
                        <div class="winning-card-display">
                            <h3>Winning Card #${cardNumber}</h3>
                            <div class="card-grid" id="winningCardGrid"></div>
                        </div>
                        
                        <div class="game-summary">
                            <h4>Game Summary</h4>
                            <ul>
                                <li><i class="fas fa-hashtag"></i> Numbers Called: ${calledNumbers}</li>
                                <li><i class="fas fa-clock"></i> Game Duration: ${this.formatTime(gameTime)}</li>
                                <li><i class="fas fa-calendar"></i> Win Time: ${new Date().toLocaleString()}</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="winner-actions">
                        <button class="btn-play-again" id="btnPlayAgain">
                            <i class="fas fa-redo"></i> Play Again
                        </button>
                        <button class="btn-share" id="btnShare">
                            <i class="fas fa-share-alt"></i> Share Victory
                        </button>
                        <button class="btn-close" id="btnClose">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                    
                    <div class="countdown-timer">
                        <i class="fas fa-hourglass-half"></i>
                        Returning to lobby in <span id="countdown">10</span> seconds
                    </div>
                </div>
            </div>
        `;
    }

    createConfettiCanvas() {
        const canvas = document.createElement('canvas');
        canvas.id = 'confettiCanvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '9999';
        
        document.body.appendChild(canvas);
        this.confettiCanvas = canvas;
        this.confettiCtx = canvas.getContext('2d');
        
        // Resize handler
        window.addEventListener('resize', () => this.resizeCanvas());
        this.resizeCanvas();
    }

    resizeCanvas() {
        this.confettiCanvas.width = window.innerWidth;
        this.confettiCanvas.height = window.innerHeight;
    }

    startConfetti() {
        this.confettiParticles = [];
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
        
        // Create 150 confetti particles
        for (let i = 0; i < 150; i++) {
            this.confettiParticles.push({
                x: Math.random() * this.confettiCanvas.width,
                y: -50,
                size: Math.random() * 15 + 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                speed: Math.random() * 5 + 2,
                rotation: Math.random() * 360,
                rotationSpeed: Math.random() * 10 - 5,
                shape: Math.random() > 0.5 ? 'circle' : 'rectangle'
            });
        }
        
        // Start animation
        this.confettiAnimation = requestAnimationFrame(() => this.animateConfetti());
    }

    animateConfetti() {
        // Clear canvas
        this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
        
        let particlesAlive = false;
        
        // Update and draw particles
        for (const particle of this.confettiParticles) {
            // Update position
            particle.y += particle.speed;
            particle.x += Math.sin(particle.y * 0.01) * 2;
            particle.rotation += particle.rotationSpeed;
            
            // Draw particle
            this.confettiCtx.save();
            this.confettiCtx.translate(particle.x, particle.y);
            this.confettiCtx.rotate(particle.rotation * Math.PI / 180);
            this.confettiCtx.fillStyle = particle.color;
            
            if (particle.shape === 'circle') {
                this.confettiCtx.beginPath();
                this.confettiCtx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
                this.confettiCtx.fill();
            } else {
                this.confettiCtx.fillRect(
                    -particle.size / 2,
                    -particle.size / 2,
                    particle.size,
                    particle.size
                );
            }
            
            this.confettiCtx.restore();
            
            // Check if particle is still on screen
            if (particle.y < this.confettiCanvas.height) {
                particlesAlive = true;
            }
        }
        
        // Continue animation if particles are alive
        if (particlesAlive) {
            this.confettiAnimation = requestAnimationFrame(() => this.animateConfetti());
        } else {
            // Restart confetti after a delay
            setTimeout(() => this.startConfetti(), 1000);
        }
    }

    stopConfetti() {
        if (this.confettiAnimation) {
            cancelAnimationFrame(this.confettiAnimation);
        }
        if (this.confettiCtx) {
            this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
        }
    }

    playWinSound() {
        this.audio.currentTime = 0;
        this.audio.play().catch(e => console.log('Audio play failed:', e));
    }

    animateTrophy() {
        const trophy = this.container.querySelector('.animate-trophy');
        if (trophy) {
            trophy.style.animation = 'trophySpin 2s ease-in-out infinite';
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    setupEventListeners() {
        // Play Again button
        const btnPlayAgain = document.getElementById('btnPlayAgain');
        if (btnPlayAgain) {
            btnPlayAgain.addEventListener('click', () => {
                window.location.href = '/choose-cards.html';
            });
        }
        
        // Share button
        const btnShare = document.getElementById('btnShare');
        if (btnShare) {
            btnShare.addEventListener('click', () => {
                this.shareVictory();
            });
        }
        
        // Close button
        const btnClose = document.getElementById('btnClose');
        if (btnClose) {
            btnClose.addEventListener('click', () => {
                this.hide();
            });
        }
        
        // Auto-close countdown
        this.startCountdown();
    }

    startCountdown() {
        let countdown = 10;
        const countdownElement = document.getElementById('countdown');
        
        if (!countdownElement) return;
        
        const countdownInterval = setInterval(() => {
            countdown--;
            countdownElement.textContent = countdown;
            
            if (countdown <= 3) {
                countdownElement.style.color = '#ff4444';
                countdownElement.classList.add('pulse');
            }
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                window.location.href = '/choose-cards.html';
            }
        }, 1000);
    }

    shareVictory() {
        const winnerData = this.getWinnerData();
        const shareText = `🎉 I just won BINGO on Addis Bingo! 🏆\n\n` +
                         `Card: #${winnerData.cardNumber}\n` +
                         `Pattern: ${winnerData.pattern}\n` +
                         `Time: ${winnerData.gameTime}s\n\n` +
                         `Play now: ${window.location.origin}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'BINGO Winner!',
                text: shareText,
                url: window.location.origin
            });
        } else {
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(shareText).then(() => {
                alert('Victory message copied to clipboard!');
            });
        }
    }

    getWinnerData() {
        // Extract winner data from DOM
        const playerName = this.container.querySelector('.player-info h2')?.textContent || 'Player';
        const cardNumber = parseInt(this.container.querySelector('.stat-item .stat-value')?.textContent || '0');
        const pattern = this.container.querySelectorAll('.stat-item .stat-value')[1]?.textContent || 'Unknown';
        const gameTime = parseInt(this.container.querySelectorAll('.stat-item .stat-value')[2]?.textContent || '0');
        
        return {
            playerName,
            cardNumber,
            pattern,
            gameTime
        };
    }

    hide() {
        this.stopConfetti();
        this.container.innerHTML = '';
        
        // Remove confetti canvas
        if (this.confettiCanvas && this.confettiCanvas.parentNode) {
            this.confettiCanvas.parentNode.removeChild(this.confettiCanvas);
        }
    }
}