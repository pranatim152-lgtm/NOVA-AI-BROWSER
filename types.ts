export type TabKind = 'home' | 'search' | 'web';

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  kind: TabKind;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  pinned: boolean;
  private: boolean;
  favicon?: string;
}

export interface BrowserLayout {
  top: number;
  sidebar: number;
  sidebarOpen: boolean;
  showBrowser: boolean;
}

export interface Bookmark {
  id: number;
  title: string;
  url: string;
  folder: string;
  createdAt: string;
}

export interface HistoryEntry {
  id: number;
  title: string;
  url: string;
  visitedAt: string;
}

export interface DownloadEntry {
  id: string;
  filename: string;
  url: string;
  path: string;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  receivedBytes: number;
  totalBytes: number;
}

export type SearchCategory = 'all' | 'images' | 'videos' | 'news' | 'shopping' | 'maps';

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  domain?: string;
  favicon?: string;
  thumbnail?: string;
  imageUrl?: string;
  published?: string;
  duration?: string;
  source?: string;
}

export interface SearchResponse {
  category: SearchCategory;
  query: string;
  results: SearchResult[];
  error?: string;
  configured: boolean;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ title: string; url: string }>;
}

export interface UserProfile {
  name: string;
  email: string;
  picture?: string;
}

export interface NovaAPI {
  browser: {
    createTab: (url?: string, options?: { private?: boolean; activate?: boolean }) => Promise<string>;
    closeTab: (id: string) => Promise<void>;
    activateTab: (id: string) => Promise<void>;
    navigate: (id: string, input: string) => Promise<void>;
    goBack: (id: string) => Promise<void>;
    goForward: (id: string) => Promise<void>;
    reload: (id: string) => Promise<void>;
    stop: (id: string) => Promise<void>;
    setLayout: (layout: BrowserLayout) => Promise<void>;
    duplicateTab: (id: string) => Promise<string>;
    pinTab: (id: string, pinned: boolean) => Promise<void>;
    toggleDevTools: (id: string) => Promise<void>;
    getPageContext: (id: string, selectedOnly?: boolean) => Promise<{ title: string; url: string; text: string }>;
    getState: () => Promise<{ tabs: BrowserTab[]; activeId: string }>;
  };
  data: {
    getBookmarks: () => Promise<Bookmark[]>;
    addBookmark: (title: string, url: string) => Promise<void>;
    removeBookmark: (id: number) => Promise<void>;
    isBookmarked: (url: string) => Promise<boolean>;
    getHistory: (limit?: number) => Promise<HistoryEntry[]>;
    clearHistory: () => Promise<void>;
    getDownloads: () => Promise<DownloadEntry[]>;
    getSetting: (key: string) => Promise<string | null>;
    setSetting: (key: string, value: string) => Promise<void>;
    clearBrowsingData: () => Promise<void>;
  };
  search: {
    query: (query: string, category: SearchCategory) => Promise<SearchResponse>;
    suggest: (query: string) => Promise<string[]>;
    setApiKey: (key: string) => Promise<void>;
    hasApiKey: () => Promise<boolean>;
  };
  ai: {
    ask: (prompt: string, history: AIMessage[]) => Promise<AIMessage>;
    askPage: (tabId: string, prompt: string, selectedOnly?: boolean) => Promise<AIMessage>;
    setApiKey: (key: string) => Promise<void>;
    hasApiKey: () => Promise<boolean>;
  };
  auth: {
    signIn: () => Promise<UserProfile>;
    signOut: () => Promise<void>;
    getProfile: () => Promise<UserProfile | null>;
  };
  app: {
    minimize: () => void;
    toggleMaximize: () => void;
    close: () => void;
    openExternal: (url: string) => Promise<void>;
    showInFolder: (filePath: string) => Promise<void>;
    showMessage: (message: string) => void;
  };
  on: {
    tabs: (callback: (tabs: BrowserTab[], activeId: string) => void) => () => void;
    tabUpdate: (callback: (tab: BrowserTab) => void) => () => void;
    downloads: (callback: (download: DownloadEntry) => void) => () => void;
    permission: (callback: (request: { id: string; permission: string; origin: string }) => void) => () => void;
    selection: (callback: (text: string) => void) => () => void;
  };
  permissions: {
    respond: (id: string, allow: boolean) => Promise<void>;
  };
}

declare global {
  interface Window { nova: NovaAPI }
}
