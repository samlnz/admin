class CardGenerator {
    constructor() {
        this.totalCards = 500;
        this.generatedCards = new Map();
        this.initializeCards();
    }

    initializeCards() {
        // Pre-generate all 500 deterministic cards
        for (let i = 1; i <= this.totalCards; i++) {
            this.generatedCards.set(i, this.generateCard(i));
        }
        console.log(`🎴 Generated ${this.totalCards} unique bingo cards`);
    }

    generateCard(cardNumber) {
        // Deterministic card generation based on card number
        const seed = cardNumber * 7919; // Prime number for better distribution
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
        
        // Center is FREE (represented as 0)
        numbers[12] = 0;
        
        return {
            id: cardNumber,
            numbers: numbers,
            grid: this.numbersToGrid(numbers)
        };
    }

    generateColumnNumbers(seed, min, max) {
        const rng = this.createSeededRNG(seed);
        const available = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        
        // Shuffle and pick 5
        const shuffled = this.shuffleArray(available, rng);
        return shuffled.slice(0, 5).sort((a, b) => a - b);
    }

    createSeededRNG(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    shuffleArray(array, rng) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    numbersToGrid(numbers) {
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

    getCard(cardNumber) {
        return this.generatedCards.get(cardNumber) || this.generateCard(cardNumber);
    }

    getCardGrid(cardNumber) {
        const card = this.getCard(cardNumber);
        return card.grid;
    }

    getCardPreview(cardNumber) {
        const grid = this.getCardGrid(cardNumber);
        let preview = '';
        
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const num = grid[row][col];
                preview += num === 0 ? 'FREE' : num.toString().padStart(2, '0');
                preview += col < 4 ? ' ' : '\n';
            }
        }
        
        return preview;
    }
}

module.exports = CardGenerator;