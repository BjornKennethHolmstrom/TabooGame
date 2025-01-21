// services/peer/GameManager.js
import CardService from '../CardService';
import { MESSAGE_TYPES } from './types';

export const GAME_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDED: 'ended'
};

export const GAME_ACTIONS = {
  JOIN_TEAM: 'joinTeam',
  START_GAME: 'startGame',
  SUBMIT_GUESS: 'submitGuess',
  REPORT_TABOO: 'reportTaboo',
  END_TURN: 'endTurn',
  PAUSE_GAME: 'pauseGame',
  RESUME_GAME: 'resumeGame'
};

export const GAME_EVENTS = {
  TURN_START: 'turnStart',
  TURN_END: 'turnEnd',
  CORRECT_GUESS: 'correctGuess',
  TABOO_USED: 'tabooUsed',
  GAME_OVER: 'gameOver'
};

class GameManager {
  constructor(peerConnection, stateManager) {
    this.peerConnection = peerConnection;
    this.stateManager = stateManager;
    this.gameEventListeners = new Set();
    this.turnTimer = null;
    
    // Set up message listener for game actions
    this.peerConnection.addMessageListener(this.handleGameMessage.bind(this));
  }

  initialize() {
    // Nothing needed here anymore since CardService manages the cards
  }

  /**
   * Handle incoming game messages
   * @private
   */
  handleGameMessage(data, senderId) {
    console.log('Game manager received message:', { data, senderId });

    // Handle game start message first
    if (data.type === 'gameStart') {
      // Only accept game start from host
      if (senderId === this.stateManager.getState()?.host) {
        console.log('Received game start from host:', data.payload);
        // Force a full state update to ensure all clients transition
        this.stateManager.updateState(data.payload, false);
        // Make sure local state reflects playing status
        if (data.payload.status === GAME_STATUS.PLAYING) {
          this.startTurnTimer();
          this.notifyGameEvent(GAME_EVENTS.TURN_START, { turn: data.payload.currentTurn });
        }
      }
      return;
    }

    // Handle game actions
    if (data.type === MESSAGE_TYPES.STATE_UPDATE && data.payload?.status === GAME_STATUS.PLAYING) {
      console.log('Received game state update:', data.payload);
      // Ensure client transitions to playing state
      this.stateManager.updateState(data.payload, false);
      if (!this.turnTimer) {
        this.startTurnTimer();
      }
      return;
    }

    // Handle existing game actions
    if (!data.type || !data.action) return;

    // Only process game actions if they come from the host or if we are the host
    const isHost = this.stateManager.getState()?.host === this.peerConnection.peerId;
    if (!isHost && senderId !== this.stateManager.getState()?.host) return;

    switch (data.action) {
      case GAME_ACTIONS.JOIN_TEAM:
        this.handleJoinTeam(data.payload, senderId);
        break;
      case GAME_ACTIONS.SUBMIT_GUESS:
        this.handleGuess(data.payload, senderId);
        break;
      case GAME_ACTIONS.REPORT_TABOO:
        this.handleTabooReport(data.payload, senderId);
        break;
      case GAME_ACTIONS.END_TURN:
        this.handleEndTurn(senderId);
        break;
    }
  }

  /**
   * Start a new game
   */
  startGame() {
    console.log('Starting game - getting latest state...');
    const state = this.stateManager.getState();
    if (!state) {
      console.error('Cannot start game: State not initialized');
      return false;
    }

    console.log('Full game state:', state);

    if (state.status !== GAME_STATUS.WAITING) {
      console.error(`Cannot start game: Invalid status ${state.status}`);
      return false;
    }

    // Get accurate team counts and log full team state
    console.log('Current teams state:', state.teams);
    const team1Players = state.teams.team1.players.length;
    const team2Players = state.teams.team2.players.length;
    
    console.log('Team player counts:', { 
      team1Players, 
      team1Names: state.teams.team1.players,
      team2Players,
      team2Names: state.teams.team2.players
    });

    if (team1Players === 0 || team2Players === 0) {
      console.error('Cannot start game: Both teams must have players', { team1Players, team2Players });
      return false;
    }

    const initialTurn = this.setupInitialTurn();
    if (!initialTurn) {
      console.error('Cannot start game: Failed to setup initial turn');
      return false;
    }

    const newState = {
      ...state,
      status: GAME_STATUS.PLAYING,
      currentTurn: initialTurn,
      currentWord: this.getNextWord(state.settings.category),
      roundNumber: 1,
      timestamp: Date.now()
    };

    console.log('Broadcasting game start state:', newState);
    
    // Broadcast game start to all peers
    this.peerConnection.broadcast({
      type: 'gameStart',
      payload: newState
    });

    // Update local state
    this.stateManager.updateState(newState, false);
    this.startTurnTimer();
    this.notifyGameEvent(GAME_EVENTS.TURN_START, { turn: initialTurn });
    return true;
  }

  /**
   * Set up the initial turn
   * @private
   */
  setupInitialTurn() {
    const state = this.stateManager.getState();
    if (!state) return null;

    const team1Players = state.teams.team1.players;
    const team2Players = state.teams.team2.players;

    if (team1Players.length === 0 || team2Players.length === 0) {
      console.error('Cannot setup turn: Empty teams', { team1Players, team2Players });
      return null;
    }

    return {
      team: 'team1',
      describer: team1Players[0],
      startTime: Date.now(),
      timeLeft: state.settings.turnDuration || 60
    };
  }

  /**
   * Handle player joining a team
   * @private
   */
  handleJoinTeam({ playerName, teamId }, senderId) {
    console.log('Handling team join:', { playerName, teamId, senderId });
    const state = this.stateManager.getState();
    if (!state || state.status !== GAME_STATUS.WAITING) {
      console.error('Invalid state for team join:', { state });
      return;
    }

    const team = state.teams[teamId];
    if (!team) {
      console.error('Invalid team ID:', teamId);
      return;
    }

    // Remove from other team first if present
    const otherTeamId = teamId === 'team1' ? 'team2' : 'team1';
    let otherTeamPlayers = [...state.teams[otherTeamId].players];
    if (otherTeamPlayers.includes(playerName)) {
      console.log('Removing player from other team:', { playerName, otherTeamId });
      otherTeamPlayers = otherTeamPlayers.filter(p => p !== playerName);
    }

    // Add to new team if not already there
    let newTeamPlayers = [...team.players];
    if (!newTeamPlayers.includes(playerName)) {
      console.log('Adding player to team:', { playerName, teamId });
      newTeamPlayers.push(playerName);
    }

    const updates = {
      teams: {
        ...state.teams,
        [teamId]: {
          ...team,
          players: newTeamPlayers
        },
        [otherTeamId]: {
          ...state.teams[otherTeamId],
          players: otherTeamPlayers
        }
      }
    };

    console.log('Updating teams state:', updates);
    this.stateManager.updateState(updates, true);
  }

  /**
   * Handle guess submission
   * @private
   */
  handleGuess({ guess }, senderId) {
    const state = this.stateManager.getState();
    if (!state || state.status !== GAME_STATUS.PLAYING) return;

    const currentWord = state.currentWord;
    if (!currentWord) return;

    if (guess.toLowerCase() === currentWord.word.toLowerCase()) {
      this.handleCorrectGuess();
    }
  }

  /**
   * Handle correct guess
   * @private
   */
  handleCorrectGuess() {
    const state = this.stateManager.getState();
    if (!state) return;

    const currentTeam = state.currentTurn.team;
    const updates = {
      teams: {
        ...state.teams,
        [currentTeam]: {
          ...state.teams[currentTeam],
          score: state.teams[currentTeam].score + 1
        }
      },
      currentWord: this.getNextWord(state.settings.category)
    };

    this.stateManager.updateState(updates, true);
    this.notifyGameEvent(GAME_EVENTS.CORRECT_GUESS, { team: currentTeam });
  }

  /**
   * Handle taboo word report
   * @private
   */
  handleTabooReport(payload, senderId) {
    const state = this.stateManager.getState();
    if (!state || state.status !== GAME_STATUS.PLAYING) return;

    this.notifyGameEvent(GAME_EVENTS.TABOO_USED);
    this.endTurn();
  }

  /**
   * End current turn
   * @private
   */
  endTurn() {
    const state = this.stateManager.getState();
    if (!state || state.status !== GAME_STATUS.PLAYING) return;

    this.stopTurnTimer();
    const nextTurn = this.getNextTurn();
    
    if (this.shouldEndGame(state, nextTurn)) {
      this.endGame();
      return;
    }

    const updates = {
      currentTurn: nextTurn,
      currentWord: this.getNextWord(state.settings.category)
    };

    this.stateManager.updateState(updates, true);
    this.startTurnTimer();
    this.notifyGameEvent(GAME_EVENTS.TURN_END);
    this.notifyGameEvent(GAME_EVENTS.TURN_START, { turn: nextTurn });
  }

  /**
   * Get next turn information
   * @private
   */
  getNextTurn() {
    const state = this.stateManager.getState();
    if (!state) return null;

    const currentTeam = state.currentTurn.team;
    const nextTeam = currentTeam === 'team1' ? 'team2' : 'team1';
    const teamPlayers = state.teams[nextTeam].players;
    const currentDescriberIndex = teamPlayers.indexOf(state.currentTurn.describer);
    const nextDescriberIndex = (currentDescriberIndex + 1) % teamPlayers.length;

    return {
      team: nextTeam,
      describer: teamPlayers[nextDescriberIndex],
      startTime: Date.now(),
      timeLeft: state.settings.turnDuration
    };
  }

  /**
   * Check if game should end
   * @private
   */
  shouldEndGame(state, nextTurn) {
    if (nextTurn.team === 'team1' && state.roundNumber >= state.settings.rounds) {
      return true;
    }
    return false;
  }

  /**
   * End the game
   * @private
   */
  endGame() {
    const state = this.stateManager.getState();
    if (!state) return;

    this.stopTurnTimer();
    const winner = this.determineWinner(state);

    const updates = {
      status: GAME_STATUS.ENDED,
      winner,
      endTime: Date.now()
    };

    this.stateManager.updateState(updates, true);
    this.notifyGameEvent(GAME_EVENTS.GAME_OVER, { winner });
  }

  /**
   * Determine game winner
   * @private
   */
  determineWinner(state) {
    const team1Score = state.teams.team1.score;
    const team2Score = state.teams.team2.score;

    if (team1Score > team2Score) return 'team1';
    if (team2Score > team1Score) return 'team2';
    return 'tie';
  }

  /**
   * Get next word for the game
   * @private
   */
  getNextWord(category) {
    const card = CardService.getRandomCard(category);
    return card ? {
      word: card.word,
      tabooWords: card.tabooWords
    } : null;
  }

  /**
   * Start turn timer
   * @private
   */
  startTurnTimer() {
    this.stopTurnTimer();
    
    this.turnTimer = setInterval(() => {
      const state = this.stateManager.getState();
      if (!state || state.status !== GAME_STATUS.PLAYING) {
        this.stopTurnTimer();
        return;
      }

      const timeLeft = Math.max(0, state.currentTurn.timeLeft - 1);
      if (timeLeft === 0) {
        this.endTurn();
      } else {
        this.stateManager.updateState({
          currentTurn: {
            ...state.currentTurn,
            timeLeft
          }
        }, true);
      }
    }, 1000);
  }

  /**
   * Stop turn timer
   * @private
   */
  stopTurnTimer() {
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
      this.turnTimer = null;
    }
  }

  /**
   * Add game event listener
   * @param {Function} listener - The listener function
   */
  addGameEventListener(listener) {
    this.gameEventListeners.add(listener);
  }

  /**
   * Remove game event listener
   * @param {Function} listener - The listener function to remove
   */
  removeGameEventListener(listener) {
    this.gameEventListeners.delete(listener);
  }

  /**
   * Notify all game event listeners
   * @private
   */
  notifyGameEvent(event, data = {}) {
    this.gameEventListeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in game event listener:', error);
      }
    });
  }

  /**
   * Clean up game manager
   */
  cleanup() {
    this.stopTurnTimer();
    this.gameEventListeners.clear();
  }
}

export default GameManager;
