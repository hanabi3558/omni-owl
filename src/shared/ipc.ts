export const IPC = {
  // Audio
  AUDIO_START: 'audio:start',
  AUDIO_STOP: 'audio:stop',
  AUDIO_LEVEL: 'audio:level',
  AUDIO_READ_FILE: 'audio:read-file',
  AUDIO_GET_SOURCES: 'audio:get-sources',
  AUDIO_SAVE_BLOB: 'audio:save-blob',

  // Sessions
  SESSION_CREATE: 'session:create',
  SESSION_LIST: 'session:list',
  SESSION_GET: 'session:get',
  SESSION_DELETE: 'session:delete',
  SESSION_UPDATE_TITLE: 'session:update-title',

  // Export
  EXPORT_AUDIO: 'export:audio',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_SELECT_DIRECTORY: 'settings:select-directory',

  // Transcription & Translation
  TRANSCRIBE: 'transcribe',
  TRANSLATE: 'translate',
  SETTINGS_SELECT_MODEL: 'settings:select-model',

  // Transcript window
  OPEN_TRANSCRIPT_WINDOW: 'transcript:open',
  TRANSCRIPT_DATA: 'transcript:data',
  TRANSCRIPT_REQUEST_DATA: 'transcript:request-data',

  // Recording state sync
  RECORDING_STATE: 'recording:state'
} as const
