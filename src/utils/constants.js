export const REPEAT_MODES = {
  OFF: 0,
  TRACK: 1,
  QUEUE: 2
};

export const COLORS = {
  PRIMARY: '#5865F2',      // Discord Blurple (Modern)
  SUCCESS: '#261255',      // Deep Purple
  ERROR: '#6D1B1C',        // Deep Red
  WARNING: '#BEA40F',      // Gold
  INFO: '#303566',         // Navy Blue
  MUSIC: '#45114E',        // Deep Purple
  QUEUE: '#EB459E'         // Vibrant Pink
};

export const EMOJIS = {
  PLAY: '▶️',
  PAUSE: '⏸️',
  STOP: '⏹️',
  SKIP: '⏭️',
  PREVIOUS: '⏮️',
  SHUFFLE: '🔀',
  REPEAT: '🔁',
  QUEUE: '📜',
  MUSIC: '🎵',
  MUSICAL_NOTE: '🎶',
  SPEAKER: '🔊',
  ERROR: '❌',
  SUCCESS: '✅',
  LOADING: '⏳',
  HEADPHONES: '🎧',
  MICROPHONE: '🎤',
  RADIO: '📻',
  CD: '💿',
  STAR: '⭐',
  FIRE: '🔥',
  SPARKLES: '✨'
};

export const LIMITS = {
  MAX_QUEUE_SIZE: 100,
  MAX_SONG_DURATION: 7200000, // 2 hours in ms
  DISCONNECT_TIMEOUT: 300000, // 5 minutes
  SEARCH_LIMIT: 10
};

export const SUPPORTED_SOURCES = [
  'youtube',
  'spotify',
  'soundcloud',
  'deezer',
  'anghami'
];

export const URL_PATTERNS = {
  YOUTUBE: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/,
  SPOTIFY: /^https?:\/\/(open\.)?spotify\.com\/(track|album|playlist)\/.+$/,
  SOUNDCLOUD: /^https?:\/\/(www\.)?soundcloud\.com\/.+$/,
  DEEZER: /^https?:\/\/(www\.)?deezer\.com\/(track|album|playlist)\/.+$/,
  ANGHAMI: /^https?:\/\/(www\.)?(play\.)?anghami\.com\/.+$/
};
