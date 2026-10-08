/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional Socket.IO server URL when the client is hosted on another domain. */
  readonly VITE_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
