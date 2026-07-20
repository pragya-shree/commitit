/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the CommitIt backend API, e.g. "http://localhost:8000/api/v1". See src/services/api/apiClient.ts. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}