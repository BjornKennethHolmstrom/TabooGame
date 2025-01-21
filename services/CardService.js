// services/CardService.js

import cards from '../data/taboo-cards.json';

class CardService {
  constructor() {
    this.cards = cards.cards;
    this.categories = cards.categories;
    this.difficulties = cards.difficulties;
    this.usedCards = new Set();
  }

  getRandomCard(categories = null, difficulty = null) {
    let availableCards = this.cards.filter(card => !this.usedCards.has(card.id));
    
    if (categories && categories.length > 0) {
      availableCards = availableCards.filter(card => categories.includes(card.category));
    }
    
    if (difficulty && difficulty !== 'any') {
      availableCards = availableCards.filter(card => card.difficulty === difficulty);
    }

    // If we've used all cards in the selected categories, reset the used cards
    if (availableCards.length === 0) {
      this.usedCards.clear();
      availableCards = this.cards;
      
      // Reapply filters after reset
      if (categories && categories.length > 0) {
        availableCards = availableCards.filter(card => categories.includes(card.category));
      }
      if (difficulty) {
        availableCards = availableCards.filter(card => card.difficulty === difficulty);
      }
    }

    // If still no cards available, return null
    if (availableCards.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * availableCards.length);
    const selectedCard = availableCards[randomIndex];
    this.usedCards.add(selectedCard.id);
    
    return selectedCard;
  }

  getCategories() {
    return this.categories;
  }

  getDifficulties() {
    return this.difficulties;
  }

  resetUsedCards() {
    this.usedCards.clear();
  }

  getCardsInCategories(categories) {
    if (!categories || categories.length === 0) return this.cards;
    return this.cards.filter(card => categories.includes(card.category));
  }

  getCardsByDifficulty(difficulty) {
    return this.cards.filter(card => card.difficulty === difficulty);
  }

  getAvailableCardsCount(categories = null, difficulty = null) {
    let count = this.cards.length;
    if (categories && categories.length > 0) {
      count = this.cards.filter(card => categories.includes(card.category)).length;
    }
    if (difficulty && difficulty !== 'any') {
      count = this.cards.filter(card => card.difficulty === difficulty).length;
    }
    return count;
  }
}

export default new CardService();
