import { contextBridge, ipcRenderer } from 'electron';
import type { BrowserLayout, NovaAPI, SearchCategory } from '../shared/types';

const subscribe = <T extends unknown[]>(channel: string, callback: (...args: T) => void) => {
  const listener = (_event: Electron.IpcRendererEvent, ...args: T) => callback(...args);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

const api: NovaAPI = {
  browser: {
    createTab: (url, options) => ipcRenderer.invoke('browser:create-tab', url, options),
    closeTab: (id) => ipcRenderer.invoke('browser:close-tab', id),
    activateTab: (id) => ipcRenderer.invoke('browser:activate-tab', id),
    navigate: (id, input) => ipcRenderer.invoke('browser:navigate', id, input),
    goBack: (id) => ipcRenderer.invoke('browser:back', id),
    goForward: (id) => ipcRenderer.invoke('browser:forward', id),
    reload: (id) => ipcRenderer.invoke('browser:reload', id),
    stop: (id) => ipcRenderer.invoke('browser:stop', id),
    setLayout: (layout: BrowserLayout) => ipcRenderer.invoke('browser:layout', layout),
    duplicateTab: (id) => ipcRenderer.invoke('browser:duplicate', id),
    pinTab: (id, pinned) => ipcRenderer.invoke('browser:pin', id, pinned),
    toggleDevTools: (id) => ipcRenderer.invoke('browser:devtools', id),
    getPageContext: (id, selectedOnly) => ipcRenderer.invoke('browser:page-context', id, selectedOnly),
    getState: () => ipcRenderer.invoke('browser:get-state'),
  },
  data: {
    getBookmarks: () => ipcRenderer.invoke('data:bookmarks'),
    addBookmark: (title, url) => ipcRenderer.invoke('data:add-bookmark', title, url),
    removeBookmark: (id) => ipcRenderer.invoke('data:remove-bookmark', id),
    isBookmarked: (url) => ipcRenderer.invoke('data:is-bookmarked', url),
    getHistory: (limit) => ipcRenderer.invoke('data:history', limit),
    clearHistory: () => ipcRenderer.invoke('data:clear-history'),
    getDownloads: () => ipcRenderer.invoke('data:downloads'),
    getSetting: (key) => ipcRenderer.invoke('data:get-setting', key),
    setSetting: (key, value) => ipcRenderer.invoke('data:set-setting', key, value),
    clearBrowsingData: () => ipcRenderer.invoke('data:clear-browsing-data'),
  },
  search: {
    query: (query, category: SearchCategory) => ipcRenderer.invoke('search:query', query, category),
    suggest: (query) => ipcRenderer.invoke('search:suggest', query),
    setApiKey: (key) => ipcRenderer.invoke('search:set-key', key),
    hasApiKey: () => ipcRenderer.invoke('search:has-key'),
  },
  ai: {
    ask: (prompt, history) => ipcRenderer.invoke('ai:ask', prompt, history),
    askPage: (tabId, prompt, selectedOnly) => ipcRenderer.invoke('ai:ask-page', tabId, prompt, selectedOnly),
    setApiKey: (key) => ipcRenderer.invoke('ai:set-key', key),
    hasApiKey: () => ipcRenderer.invoke('ai:has-key'),
  },
  auth: {
    signIn: () => ipcRenderer.invoke('auth:sign-in'),
    signOut: () => ipcRenderer.invoke('auth:sign-out'),
    getProfile: () => ipcRenderer.invoke('auth:get-profile'),
  },
  app: {
    minimize: () => ipcRenderer.send('app:minimize'),
    toggleMaximize: () => ipcRenderer.send('app:maximize'),
    close: () => ipcRenderer.send('app:close'),
    openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
    showInFolder: (filePath) => ipcRenderer.invoke('app:show-in-folder', filePath),
    showMessage: (message) => ipcRenderer.invoke('app:show-message', message),
  },
  on: {
    tabs: (callback) => subscribe('nova:tabs', callback),
    tabUpdate: (callback) => subscribe('nova:tab-update', callback),
    downloads: (callback) => subscribe('nova:download', callback),
    permission: (callback) => subscribe('nova:permission', callback),
    selection: (callback) => subscribe('nova:selection', callback),
  },
  permissions: {
    respond: (id, allow) => ipcRenderer.invoke('permission:respond', id, allow),
  },
};

contextBridge.exposeInMainWorld('nova', api);
