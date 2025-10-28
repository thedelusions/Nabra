import { REPEAT_MODES } from '../utils/constants.js';
import logger from '../utils/logger.js';

/**
 * Guild Queue Manager
 * Manages queue state per guild (repeat modes, history, etc.)
 */
class QueueManager {
  constructor() {
    this.queues = new Map();
  }

  /**
   * Get or create queue for guild
   */
  get(guildId) {
    if (!this.queues.has(guildId)) {
      this.queues.set(guildId, {
        repeatMode: REPEAT_MODES.OFF,
        history: [],
        historyIndex: -1
      });
    }
    return this.queues.get(guildId);
  }

  /**
   * Set repeat mode
   */
  setRepeatMode(guildId, mode) {
    const queue = this.get(guildId);
    queue.repeatMode = mode;
    logger.debug(`Set repeat mode for guild ${guildId}: ${mode}`);
  }

  /**
   * Get repeat mode
   */
  getRepeatMode(guildId) {
    return this.get(guildId).repeatMode;
  }

  /**
   * Get repeat mode name
   */
  getRepeatModeName(guildId) {
    const mode = this.getRepeatMode(guildId);
    switch (mode) {
      case REPEAT_MODES.TRACK:
        return 'Track';
      case REPEAT_MODES.QUEUE:
        return 'Queue';
      default:
        return 'Off';
    }
  }

  /**
   * Add track to history
   */
  addToHistory(guildId, track) {
    const queue = this.get(guildId);
    
    // Remove any items after current index (for when user goes back then plays new)
    if (queue.historyIndex < queue.history.length - 1) {
      queue.history = queue.history.slice(0, queue.historyIndex + 1);
    }
    
    queue.history.push(track);
    queue.historyIndex = queue.history.length - 1;
    
    // Keep history limited to 50 tracks
    if (queue.history.length > 50) {
      queue.history.shift();
      queue.historyIndex--;
    }
    
    logger.debug(`Added track to history for guild ${guildId}: ${track.info?.title || track.title}`);
  }

  /**
   * Get previous track from history
   */
  getPrevious(guildId) {
    const queue = this.get(guildId);
    
    if (queue.historyIndex > 0) {
      queue.historyIndex--;
      return queue.history[queue.historyIndex];
    }
    
    return null;
  }

  /**
   * Check if previous track exists
   */
  hasPrevious(guildId) {
    const queue = this.get(guildId);
    return queue.historyIndex > 0;
  }

  /**
   * Clear queue data for guild
   */
  clear(guildId) {
    this.queues.delete(guildId);
    logger.debug(`Cleared queue data for guild ${guildId}`);
  }

  /**
   * Shuffle array (Fisher-Yates algorithm)
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Singleton instance
const queueManager = new QueueManager();

export default queueManager;
