class CardSelector {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            totalCards: 500,
            maxSelection: 2,
            cardsPerPage: 100,
            onSelectionChange: () => {},
            ...options
        };
        
        this.selectedCards = [];
        this.availableCards = Array.from({ length: this.options.totalCards }, (_, i) => i + 1);
        this.takenCards = [];
        this.currentPage = 0;
        
        this.init();
    }

    init() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.container.innerHTML = '';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'card-selector-header';
        header.innerHTML = `
            <h3>Select Your Bingo Cards (1-${this.options.totalCards})</h3>
            <div class="selection-info">
                <span class="selected-count">${this.selectedCards.length}/${this.options.maxSelection}</span> cards selected
            </div>
        `;
        this.container.appendChild(header);
        
        // Create card grid
        const gridContainer = document.createElement('div');
        gridContainer.className = 'card-grid-container';
        
        const startCard = this.currentPage * this.options.cardsPerPage + 1;
        const endCard = Math.min(startCard + this.options.cardsPerPage - 1, this.options.totalCards);
        
        for (let i = startCard; i <= endCard; i++) {
            const cardElement = this.createCardElement(i);
            gridContainer.appendChild(cardElement);
        }
        
        this.container.appendChild(gridContainer);
        
        // Create pagination
        this.renderPagination();
        
        // Create selected cards display
        this.renderSelectedCards();
    }

    createCardElement(cardNumber) {
        const card = document.createElement('div');
        card.className = 'bingo-card-number';
        card.dataset.cardNumber = cardNumber;
        card.textContent = cardNumber;
        
        // Check status
        if (this.takenCards.includes(cardNumber)) {
            card.classList.add('taken');
            card.title = 'Already taken by another player';
        } else if (this.selectedCards.includes(cardNumber)) {
            card.classList.add('selected');
            card.title = 'Selected';
        } else {
            card.classList.add('available');
            card.addEventListener('click', () => this.selectCard(cardNumber));
        }
        
        return card;
    }

    selectCard(cardNumber) {
        // Check if already selected
        const index = this.selectedCards.indexOf(cardNumber);
        
        if (index > -1) {
            // Deselect card
            this.selectedCards.splice(index, 1);
        } else {
            // Check max selection
            if (this.selectedCards.length >= this.options.maxSelection) {
                alert(`Maximum ${this.options.maxSelection} cards allowed`);
                return;
            }
            
            // Select card
            this.selectedCards.push(cardNumber);
        }
        
        // Update UI
        this.updateCardDisplay(cardNumber);
        this.renderSelectedCards();
        
        // Trigger callback
        this.options.onSelectionChange(this.selectedCards);
    }

    updateCardDisplay(cardNumber) {
        const cardElement = this.container.querySelector(`[data-card-number="${cardNumber}"]`);
        if (!cardElement) return;
        
        cardElement.classList.remove('selected', 'available');
        
        if (this.selectedCards.includes(cardNumber)) {
            cardElement.classList.add('selected');
        } else if (this.takenCards.includes(cardNumber)) {
            cardElement.classList.add('taken');
        } else {
            cardElement.classList.add('available');
        }
    }

    renderSelectedCards() {
        // Remove existing display
        const existingDisplay = this.container.querySelector('.selected-cards-display');
        if (existingDisplay) {
            existingDisplay.remove();
        }
        
        if (this.selectedCards.length === 0) return;
        
        const display = document.createElement('div');
        display.className = 'selected-cards-display';
        
        const title = document.createElement('h4');
        title.textContent = 'Your Selected Cards:';
        display.appendChild(title);
        
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'selected-cards-list';
        
        this.selectedCards.forEach((cardNumber, index) => {
            const cardDisplay = document.createElement('div');
            cardDisplay.className = 'selected-card-item';
            cardDisplay.innerHTML = `
                <div class="card-number">${cardNumber}</div>
                <div class="card-preview" id="card-preview-${cardNumber}"></div>
                <button class="btn-remove" data-card="${cardNumber}">×</button>
            `;
            cardsContainer.appendChild(cardDisplay);
            
            // Generate preview
            this.generateCardPreview(cardNumber);
        });
        
        display.appendChild(cardsContainer);
        this.container.appendChild(display);
        
        // Add remove button listeners
        cardsContainer.querySelectorAll('.btn-remove').forEach(button => {
            button.addEventListener('click', (e) => {
                const cardNumber = parseInt(e.target.dataset.card);
                this.selectCard(cardNumber); // Toggle selection
            });
        });
    }

    generateCardPreview(cardNumber) {
        const previewContainer = document.getElementById(`card-preview-${cardNumber}`);
        if (!previewContainer) return;
        
        const cardNumbers = BingoCardGenerator.generateCardNumbers(cardNumber);
        const grid = BingoCardGenerator.numbersToGrid(cardNumbers);
        
        let previewHTML = '<div class="mini-bingo-grid">';
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const num = grid[row][col];
                const isFree = num === 0;
                previewHTML += `
                    <div class="mini-cell ${isFree ? 'free' : ''}">
                        ${isFree ? 'FREE' : num}
                    </div>
                `;
            }
        }
        previewHTML += '</div>';
        
        previewContainer.innerHTML = previewHTML;
    }

    renderPagination() {
        const totalPages = Math.ceil(this.options.totalCards / this.options.cardsPerPage);
        
        const pagination = document.createElement('div');
        pagination.className = 'card-pagination';
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.innerHTML = '&laquo; Previous';
        prevBtn.disabled = this.currentPage === 0;
        prevBtn.addEventListener('click', () => {
            if (this.currentPage > 0) {
                this.currentPage--;
                this.render();
            }
        });
        
        // Page info
        const pageInfo = document.createElement('span');
        pageInfo.className = 'page-info';
        pageInfo.textContent = `Page ${this.currentPage + 1} of ${totalPages}`;
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.innerHTML = 'Next &raquo;';
        nextBtn.disabled = this.currentPage >= totalPages - 1;
        nextBtn.addEventListener('click', () => {
            if (this.currentPage < totalPages - 1) {
                this.currentPage++;
                this.render();
            }
        });
        
        pagination.appendChild(prevBtn);
        pagination.appendChild(pageInfo);
        pagination.appendChild(nextBtn);
        
        this.container.appendChild(pagination);
    }

    setTakenCards(takenCards) {
        this.takenCards = takenCards;
        this.render();
    }

    getSelectedCards() {
        return [...this.selectedCards];
    }

    clearSelection() {
        this.selectedCards = [];
        this.render();
    }

    setupEventListeners() {
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearSelection();
            }
        });
    }
}

// Card generator utility
class BingoCardGenerator {
    static generateCardNumbers(cardNumber) {
        // Deterministic card generation
        const seed = cardNumber * 7919;
        const numbers = [];
        
        // BINGO column ranges
        const ranges = [
            { min: 1, max: 15 },   // B
            { min: 16, max: 30 },  // I
            { min: 31, max: 45 },  // N
            { min: 46, max: 60 },  // G
            { min: 61, max: 75 }   // O
        ];
        
        // Generate 5 numbers for each column
        for (let col = 0; col < 5; col++) {
            const columnNumbers = this.generateColumnNumbers(
                seed + col,
                ranges[col].min,
                ranges[col].max
            );
            numbers.push(...columnNumbers);
        }
        
        // Center is FREE (0)
        numbers[12] = 0;
        
        return numbers;
    }

    static generateColumnNumbers(seed, min, max) {
        const rng = this.createSeededRNG(seed);
        const available = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        
        // Shuffle and pick 5
        const shuffled = this.shuffleArray(available, rng);
        return shuffled.slice(0, 5).sort((a, b) => a - b);
    }

    static createSeededRNG(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    static shuffleArray(array, rng) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    static numbersToGrid(numbers) {
        const grid = [];
        for (let row = 0; row < 5; row++) {
            const rowNumbers = [];
            for (let col = 0; col < 5; col++) {
                const index = col * 5 + row; // Column-major order
                rowNumbers.push(numbers[index]);
            }
            grid.push(rowNumbers);
        }
        return grid;
    }

    static getCardGrid(cardNumber) {
        const numbers = this.generateCardNumbers(cardNumber);
        return this.numbersToGrid(numbers);
    }
}