import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  ArrowLeft, ArrowRight, RefreshCw, X, Plus, Home, Search, ShieldCheck, Star, Sparkles,
  PanelRightClose, PanelRightOpen, Settings, Download, History, Bookmark, MoreHorizontal,
  Globe2, Lock, Command, ChevronDown, ExternalLink, Pin, Copy, Trash2, Sun, Moon,
  Image as ImageIcon, PlaySquare, Newspaper, ShoppingBag, Map, Check, LoaderCircle,
  Send, Paperclip, Bot, UserRound, Eye, EyeOff, Zap, BookOpen, Clock3, Link2,
  MonitorDown, CircleHelp, LogOut, Cloud, SlidersHorizontal, SearchCheck,
} from 'lucide-react';
import type { AIMessage, Bookmark as BookmarkItem, BrowserTab, DownloadEntry, HistoryEntry, SearchCategory, SearchResponse, SearchResult, UserProfile } from '../shared/types';
import { safeExternalUrl } from '../shared/url';

type PageMode = 'browser' | 'settings' | 'history' | 'downloads' | 'bookmarks';
type ResultsCategory = SearchCategory | 'ai';

const categoryItems: Array<{ id: ResultsCategory; label: string; icon: typeof Search }> = [
  { id: 'all', label: 'All', icon: Search },
  { id: 'ai', label: 'AI Overview', icon: Sparkles },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'videos', label: 'Videos', icon: PlaySquare },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { id: 'maps', label: 'Maps', icon: Map },
  { id: 'news', label: 'News', icon: Newspaper },
];

const shortcuts = [
  { title: 'Google', url: 'https://www.google.com', letter: 'G', tint: 'blue' },
  { title: 'YouTube', url: 'https://www.youtube.com', letter: '▶', tint: 'red' },
  { title: 'Wikipedia', url: 'https://www.wikipedia.org', letter: 'W', tint: 'slate' },
  { title: 'GitHub', url: 'https://github.com', letter: '⌘', tint: 'purple' },
  { title: 'Gmail', url: 'https://mail.google.com', letter: 'M', tint: 'orange' },
  { title: 'Maps', url: 'https://maps.google.com', letter: '⌖', tint: 'green' },
];

function getSearchTerm(tab?: BrowserTab): string {
  if (!tab || tab.kind !== 'search') return '';
  try { return new URL(tab.url.replace('nova://', 'https://nova.local/')).searchParams.get('q') ?? ''; }
  catch { return decodeURIComponent(tab.url.split('q=')[1] ?? ''); }
}

function shortDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

function timeLabel(dateValue: string): string {
  const date = new Date(dateValue);
  if (Number.isNaN(date.valueOf())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function App() {
  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [activeId, setActiveId] = useState('');
  const [address, setAddress] = useState('');
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryEntry[]>([]);
  const [downloads, setDownloads] = useState<DownloadEntry[]>([]);
  const [pageMode, setPageMode] = useState<PageMode>('browser');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [themeReady, setThemeReady] = useState(false);
  const [searchProvider, setSearchProvider] = useState('google');
  const [searchCategory, setSearchCategory] = useState<ResultsCategory>('all');
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [aiAnswer, setAiAnswer] = useState<AIMessage | null>(null);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [privateAiMessages, setPrivateAiMessages] = useState<AIMessage[]>([]);
  const [aiHistoryReady, setAiHistoryReady] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [includeActivePage, setIncludeActivePage] = useState(false);
  const [aiHasKey, setAiHasKey] = useState(false);
  const [searchHasKey, setSearchHasKey] = useState(false);
  const [aiKeyInput, setAiKeyInput] = useState('');
  const [searchKeyInput, setSearchKeyInput] = useState('');
  const [showAiKey, setShowAiKey] = useState(false);
  const [showSearchKey, setShowSearchKey] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [addressFocused, setAddressFocused] = useState(false);
  const [permissionRequest, setPermissionRequest] = useState<{ id: string; permission: string; origin: string } | null>(null);
  const [toast, setToast] = useState('');
  const [tabMenu, setTabMenu] = useState<string | null>(null);
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
  const [homeRecent, setHomeRecent] = useState<HistoryEntry[]>([]);
  const addressRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLElement>(null);
  const toastTimer = useRef<number | null>(null);

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeId), [tabs, activeId]);
  const activeSearchTerm = useMemo(() => getSearchTerm(activeTab), [activeTab]);
  const chatMessages = activeTab?.private ? privateAiMessages : aiMessages;
  const updateChatMessages = activeTab?.private ? setPrivateAiMessages : setAiMessages;
  const isBrowserPage = pageMode === 'browser';
  const showWebContent = isBrowserPage && activeTab?.kind === 'web';

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 4200);
  }, []);

  const refreshBookmarks = useCallback(async () => setBookmarks(await window.nova.data.getBookmarks()), []);
  const refreshHistory = useCallback(async () => {
    const history = await window.nova.data.getHistory(120);
    setHistoryItems(history);
    setHomeRecent(history.slice(0, 6));
  }, []);

  const refreshState = useCallback(async () => {
    const state = await window.nova.browser.getState();
    setTabs(state.tabs);
    setActiveId(state.activeId);
    const current = state.tabs.find((tab) => tab.id === state.activeId);
    setAddress(current?.kind === 'web' ? current.url : current?.kind === 'search' ? getSearchTerm(current) : '');
  }, []);

  useEffect(() => {
    void refreshState();
    void refreshBookmarks();
    void refreshHistory();
    void window.nova.data.getDownloads().then(setDownloads);
    void window.nova.ai.hasApiKey().then(setAiHasKey);
    void window.nova.search.hasApiKey().then(setSearchHasKey);
    void window.nova.auth.getProfile().then(setProfile);
    void window.nova.data.getSetting('theme').then((v) => { if (v === 'light' || v === 'dark') setTheme(v); }).catch(() => undefined).finally(() => setThemeReady(true));
    void window.nova.data.getSetting('searchProvider').then((v) => { if (v) setSearchProvider(v); });
    void window.nova.data.getSetting('ai.history').then((raw) => { if (raw) { try { setAiMessages(JSON.parse(raw) as AIMessage[]); } catch { /* ignore invalid local history */ } } setAiHistoryReady(true); });

    const unsubscribeTabs = window.nova.on.tabs((nextTabs, nextActiveId) => {
      setTabs(nextTabs);
      setActiveId(nextActiveId);
      const selected = nextTabs.find((tab) => tab.id === nextActiveId);
      if (selected) {
        setAddress(selected.kind === 'web' ? selected.url : selected.kind === 'search' ? getSearchTerm(selected) : '');
        setPageMode('browser');
      }
    });
    const unsubscribeTabUpdate = window.nova.on.tabUpdate((nextTab) => {
      setTabs((prev) => prev.map((tab) => tab.id === nextTab.id ? nextTab : tab));
      if (nextTab.id === activeId) setAddress(nextTab.kind === 'web' ? nextTab.url : nextTab.kind === 'search' ? getSearchTerm(nextTab) : '');
    });
    const unsubscribeDownloads = window.nova.on.downloads((download) => {
      setDownloads((prev) => [download, ...prev.filter((item) => item.id !== download.id)]);
    });
    const unsubscribePermission = window.nova.on.permission((request) => setPermissionRequest(request));
    const unsubscribeSelection = window.nova.on.selection((text) => {
      setSidebarOpen(true);
      setPageMode('browser');
      setAiInput(`Explain this selected text in simple terms:\n\n${text.slice(0, 5000)}`);
      notify('Selected text added to NOVA AI.');
    });
    return () => {
      unsubscribeTabs(); unsubscribeTabUpdate(); unsubscribeDownloads(); unsubscribePermission(); unsubscribeSelection();
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, [activeId, notify, refreshBookmarks, refreshHistory, refreshState]);

  useEffect(() => { setIncludeActivePage(false); }, [activeId]);

  useEffect(() => {
    const measure = () => {
      const top = topRef.current?.getBoundingClientRect().height ?? 116;
      const sidebar = sideRef.current?.getBoundingClientRect().width ?? 350;
      void window.nova.browser.setLayout({ top, sidebar, sidebarOpen, showBrowser: showWebContent });
    };
    const observer = new ResizeObserver(measure);
    if (topRef.current) observer.observe(topRef.current);
    if (sideRef.current) observer.observe(sideRef.current);
    window.addEventListener('resize', measure);
    measure();
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [sidebarOpen, showWebContent, pageMode]);

  useEffect(() => {
    if (!activeTab || activeTab.kind !== 'search' || pageMode !== 'browser') {
      setSearchResponse(null); setAiAnswer(null); setSearchCategory('all');
      return;
    }
    const query = getSearchTerm(activeTab);
    if (!query) return;
    setSearchResponse(null); setSearchCategory('all'); setAiAnswer(null);
    let cancelled = false;
    void window.nova.search.query(query, 'all').then((result) => { if (!cancelled) setSearchResponse(result); });
    return () => { cancelled = true; };
  }, [activeTab?.id, activeTab?.url, pageMode]);

  useEffect(() => {
    if (!addressFocused || address.trim().length < 2) { setSuggestions([]); return; }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void window.nova.search.suggest(address).then((items) => { if (!cancelled) setSuggestions(items); });
    }, 220);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [address, addressFocused]);

  useEffect(() => {
    if (aiHistoryReady) void window.nova.data.setSetting('ai.history', JSON.stringify(aiMessages.slice(-80)));
  }, [aiMessages, aiHistoryReady]);

  useEffect(() => {
    // Private-session chat stays in memory and is discarded when the last private tab closes.
    if (!tabs.some((tab) => tab.private)) setPrivateAiMessages((prev) => prev.length ? [] : prev);
  }, [tabs]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (themeReady) void window.nova.data.setSetting('theme', theme);
  }, [theme, themeReady]);

  const navigate = useCallback(async (input: string) => {
    if (!activeId) return;
    setPageMode('browser'); setAddressFocused(false); setSuggestions([]);
    await window.nova.browser.navigate(activeId, input);
    addressRef.current?.blur();
  }, [activeId]);

  const submitSearch = useCallback(async (value = address) => {
    const query = value.trim();
    if (!activeId || !query) return;
    if (!searchHasKey) {
      const encoded = encodeURIComponent(query);
      const fallback = searchProvider === 'bing' ? `https://www.bing.com/search?q=${encoded}`
        : searchProvider === 'duckduckgo' ? `https://duckduckgo.com/?q=${encoded}`
        : searchProvider === 'brave' ? `https://search.brave.com/search?q=${encoded}`
        : `https://www.google.com/search?q=${encoded}`;
      await navigate(fallback);
      return;
    }
    await navigate(query);
  }, [activeId, address, navigate, searchHasKey, searchProvider]);

  const createTab = useCallback(async (isPrivate?: boolean) => {
    const privateMode = isPrivate ?? Boolean(activeTab?.private);
    await window.nova.browser.createTab('nova://newtab', { private: privateMode, activate: true });
    setPageMode('browser');
  }, [activeTab?.private]);

  const closeTab = useCallback((id: string) => window.nova.browser.closeTab(id), []);

  const toggleBookmark = useCallback(async () => {
    if (!activeTab || activeTab.kind !== 'web') return;
    const existing = bookmarks.find((item) => item.url === activeTab.url);
    if (existing) {
      await window.nova.data.removeBookmark(existing.id);
      notify('Bookmark removed.');
    } else {
      await window.nova.data.addBookmark(activeTab.title, activeTab.url);
      notify('Page bookmarked.');
    }
    await refreshBookmarks();
  }, [activeTab, bookmarks, notify, refreshBookmarks]);

  const isCurrentBookmarked = Boolean(activeTab && bookmarks.some((item) => item.url === activeTab.url));

  const openSearchCategory = async (category: ResultsCategory) => {
    setSearchCategory(category);
    setSearchResponse(null);
    setAiAnswer(null);
    if (!activeSearchTerm) return;
    if (category === 'ai') {
      if (!aiHasKey) { setAiAnswer({ role: 'assistant', content: 'Add an OpenAI API key in Settings → AI to enable grounded AI overviews.' }); return; }
      setAiBusy(true);
      try {
        const answer = await window.nova.ai.ask(`Give me a useful, source-grounded overview of: ${activeSearchTerm}. Include the key facts and cite sources with [number] references.`, []);
        setAiAnswer(answer);
      } catch (error) { setAiAnswer({ role: 'assistant', content: error instanceof Error ? error.message : 'AI overview failed.' }); }
      finally { setAiBusy(false); }
      return;
    }
    const response = await window.nova.search.query(activeSearchTerm, category);
    setSearchResponse(response);
  };

  const sendAI = async (event?: FormEvent) => {
    event?.preventDefault();
    const prompt = aiInput.trim();
    if (!prompt || aiBusy) return;
    setAiInput('');
    updateChatMessages((prev) => [...prev, { role: 'user', content: prompt }]);
    setAiBusy(true);
    try {
      const answer = includeActivePage && activeTab?.kind === 'web'
        ? await window.nova.ai.askPage(activeTab.id, prompt, false)
        : await window.nova.ai.ask(prompt, chatMessages);
      updateChatMessages((prev) => [...prev, answer]);
      setIncludeActivePage(false);
    } catch (error) {
      updateChatMessages((prev) => [...prev, { role: 'assistant', content: error instanceof Error ? error.message : 'NOVA could not answer that.' }]);
    } finally { setIncludeActivePage(false); setAiBusy(false); }
  };

  const askAboutPage = async (selectedOnly = false) => {
    if (!activeTab || activeTab.kind !== 'web') { notify('Open a webpage first.'); return; }
    setSidebarOpen(true); setPageMode('browser'); setAiBusy(true);
    try {
      const prompt = selectedOnly ? 'Explain the selected text clearly, with any important context.' : 'Summarize this webpage. Highlight the key points and any important caveats.';
      const answer = await window.nova.ai.askPage(activeTab.id, prompt, selectedOnly);
      updateChatMessages((prev) => [...prev, { role: 'user', content: prompt }, answer]);
    } catch (error) { notify(error instanceof Error ? error.message : 'Unable to read this page.'); }
    finally { setAiBusy(false); }
  };

  const changeTheme = () => setTheme((prev) => prev === 'dark' ? 'light' : 'dark');

  const handleAddressKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') { event.preventDefault(); void submitSearch(); }
    if (event.key === 'Escape') { setSuggestions([]); setAddressFocused(false); addressRef.current?.blur(); }
  };

  useEffect(() => {
    const handler = (event: globalThis.KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === 'l') { event.preventDefault(); addressRef.current?.focus(); addressRef.current?.select(); }
      if (mod && event.key.toLowerCase() === 't') { event.preventDefault(); void createTab(); }
      if (mod && event.key.toLowerCase() === 'w' && activeId) { event.preventDefault(); void closeTab(activeId); }
      if (mod && event.key.toLowerCase() === 'r' && activeId) { event.preventDefault(); void window.nova.browser.reload(activeId); }
      if (mod && event.shiftKey && event.key.toLowerCase() === 'a') { event.preventDefault(); setSidebarOpen((v) => !v); }
      if (event.key === 'Escape') setTabMenu(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeId, closeTab, createTab]);

  const saveApiKeys = async () => {
    try {
      if (aiKeyInput.trim()) { await window.nova.ai.setApiKey(aiKeyInput.trim()); setAiHasKey(true); setAiKeyInput(''); }
      if (searchKeyInput.trim()) { await window.nova.search.setApiKey(searchKeyInput.trim()); setSearchHasKey(true); setSearchKeyInput(''); }
      notify('Provider configuration saved securely.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not save keys securely.'); }
  };

  const signIn = async () => {
    setAuthBusy(true);
    try { const user = await window.nova.auth.signIn(); setProfile(user); notify(`Signed in as ${user.email}`); }
    catch (error) { notify(error instanceof Error ? error.message : 'Google sign-in failed.'); }
    finally { setAuthBusy(false); }
  };

  const clearData = async () => {
    if (!window.confirm('Clear local browsing history, downloads list, cookies and site storage for NOVA?')) return;
    await window.nova.data.clearBrowsingData();
    await refreshHistory(); setDownloads([]); notify('Local browsing data cleared.');
  };

  const openTabFromUrl = (url: string) => {
    const safe = safeExternalUrl(url);
    if (!safe) { notify('This link is not a supported web URL.'); return; }
    void navigate(safe);
  };

  return (
    <div className="app-root" data-theme={theme}>
      <div className="top-chrome" ref={topRef}>
        <div className="tab-row">
          <div className="brand-mark"><span className="brand-orbit">✦</span><span>NOVA</span></div>
          <div className="tabs-strip">
            {tabs.map((tab) => (
              <div key={tab.id} className={`browser-tab ${tab.id === activeId ? 'active' : ''} ${tab.pinned ? 'pinned' : ''}`} onClick={() => { void window.nova.browser.activateTab(tab.id); setPageMode('browser'); }} onContextMenu={(event) => { event.preventDefault(); setTabMenu(tabMenu === tab.id ? null : tab.id); }} title={tab.url}>
                <div className="tab-favicon">{tab.private ? <EyeOff size={13} /> : tab.kind === 'home' ? <Sparkles size={13} /> : tab.favicon ? <img src={tab.favicon} /> : <Globe2 size={13} />}</div>
                <span className="tab-title">{tab.title || 'New tab'}</span>
                {tab.loading && <LoaderCircle className="spin" size={12} />}
                {!tab.pinned && <button className="tab-close" aria-label="Close tab" onClick={(event) => { event.stopPropagation(); closeTab(tab.id); }}><X size={13} /></button>}
                {tabMenu === tab.id && <div className="tab-menu" onClick={(event) => event.stopPropagation()}>
                  <button onClick={() => { void window.nova.browser.duplicateTab(tab.id); setTabMenu(null); }}><Copy size={14} /> Duplicate tab</button>
                  <button onClick={() => { void window.nova.browser.pinTab(tab.id, !tab.pinned); setTabMenu(null); }}><Pin size={14} /> {tab.pinned ? 'Unpin tab' : 'Pin tab'}</button>
                  <button onClick={() => { closeTab(tab.id); setTabMenu(null); }}><X size={14} /> Close tab</button>
                </div>}
              </div>
            ))}
          </div>
          <button className="icon-button new-tab" title="New tab (Ctrl+T)" onClick={() => void createTab()}><Plus size={16} /></button>
          <div className="window-actions">
            <button className="window-action" onClick={() => window.nova.app.minimize()} aria-label="Minimize">−</button>
            <button className="window-action" onClick={() => window.nova.app.toggleMaximize()} aria-label="Maximize">▢</button>
            <button className="window-action close-window" onClick={() => window.nova.app.close()} aria-label="Close">×</button>
          </div>
        </div>
        <div className="navigation-row">
          <button className="nav-button" title="Back" disabled={!activeTab?.canGoBack || activeTab.kind !== 'web'} onClick={() => activeId && void window.nova.browser.goBack(activeId)}><ArrowLeft size={17} /></button>
          <button className="nav-button" title="Forward" disabled={!activeTab?.canGoForward || activeTab.kind !== 'web'} onClick={() => activeId && void window.nova.browser.goForward(activeId)}><ArrowRight size={17} /></button>
          <button className="nav-button" title={activeTab?.loading ? 'Stop' : 'Reload'} onClick={() => activeId && void (activeTab?.loading ? window.nova.browser.stop(activeId) : window.nova.browser.reload(activeId))}>{activeTab?.loading ? <X size={16} /> : <RefreshCw size={15} />}</button>
          <button className="nav-button" title="Home" onClick={() => activeId && void navigate('nova://newtab')}><Home size={16} /></button>
          <div className={`address-wrap ${addressFocused ? 'focused' : ''}`}>
            <div className="address-leading">{activeTab?.kind === 'web' && activeTab.url.startsWith('https:') ? <ShieldCheck size={16} className="secure-icon" /> : <Search size={16} />}</div>
            <input ref={addressRef} className="address-input" value={address} placeholder="Search the web or enter an address" onChange={(event) => setAddress(event.target.value)} onFocus={() => setAddressFocused(true)} onBlur={() => window.setTimeout(() => setAddressFocused(false), 160)} onKeyDown={handleAddressKey} spellCheck={false} autoComplete="off" />
            {address && <button className="address-clear" onClick={() => setAddress('')}><X size={14} /></button>}
            {addressFocused && suggestions.length > 0 && <div className="suggestions-popover">
              {suggestions.map((item) => <button key={item} onMouseDown={(event) => event.preventDefault()} onClick={() => { setAddress(item); void submitSearch(item); }}><Search size={14} />{item}</button>)}
            </div>}
          </div>
          <button className={`nav-button bookmark-toggle ${isCurrentBookmarked ? 'selected' : ''}`} title={isCurrentBookmarked ? 'Remove bookmark' : 'Bookmark this page'} onClick={() => void toggleBookmark()}><Star size={16} fill={isCurrentBookmarked ? 'currentColor' : 'none'} /></button>
          <button className={`nav-button ${sidebarOpen ? 'active-tool' : ''}`} title="Toggle AI sidebar (Ctrl+Shift+A)" onClick={() => setSidebarOpen((v) => !v)}>{sidebarOpen ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}</button>
          <button className="nav-button" title="History" onClick={() => setPageMode('history')}><History size={17} /></button>
          <button className="nav-button" title="Downloads" onClick={() => setPageMode('downloads')}><Download size={17} /></button>
          <button className="nav-button" title="Bookmarks" onClick={() => setPageMode('bookmarks')}><Bookmark size={17} /></button>
          <button className="nav-button profile-button" title="Profile" onClick={() => setPageMode('settings')}>{profile?.picture ? <img src={profile.picture} alt="" /> : <UserRound size={16} />}</button>
          <button className="nav-button" title="Settings" onClick={() => setPageMode('settings')}><Settings size={17} /></button>
        </div>
        <div className="bookmarks-row">
          <button className="bookmark-folder" onClick={() => setPageMode('bookmarks')}><Bookmark size={13} /> All bookmarks</button>
          {bookmarks.slice(0, 8).map((item) => <button key={item.id} className="bookmark-chip" onClick={() => openTabFromUrl(item.url)} title={item.url}><img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(shortDomain(item.url))}&sz=32`} />{item.title}</button>)}
          {bookmarks.length === 0 && <span className="bookmark-hint">Your saved pages will appear here</span>}
          <div className="bookmarks-spacer" />
          <button className="bookmark-folder privacy-button" onClick={() => setShowPrivacyMenu((v) => !v)}><ShieldCheck size={13} /> Privacy</button>
          {showPrivacyMenu && <div className="privacy-menu"><button onClick={clearData}><Trash2 size={14} /> Clear browsing data</button><button onClick={() => void createTab(true)}><EyeOff size={14} /> New private tab</button></div>}
        </div>
      </div>

      {permissionRequest && <div className="permission-banner"><ShieldCheck size={16} /><span><b>{permissionRequest.origin}</b> wants to use {permissionRequest.permission}.</span><button className="permission-allow" onClick={() => { void window.nova.permissions.respond(permissionRequest.id, true); setPermissionRequest(null); }}>Allow</button><button className="permission-deny" onClick={() => { void window.nova.permissions.respond(permissionRequest.id, false); setPermissionRequest(null); }}>Block</button></div>}

      <div className="workspace">
        <main className={`page-area ${sidebarOpen ? 'with-sidebar' : ''}`}>
          {pageMode === 'settings' ? <SettingsPage
            theme={theme} setTheme={setTheme} searchProvider={searchProvider} setSearchProvider={(provider) => { setSearchProvider(provider); void window.nova.data.setSetting('searchProvider', provider); }}
            aiHasKey={aiHasKey} searchHasKey={searchHasKey} aiKeyInput={aiKeyInput} setAiKeyInput={setAiKeyInput} searchKeyInput={searchKeyInput} setSearchKeyInput={setSearchKeyInput}
            showAiKey={showAiKey} setShowAiKey={setShowAiKey} showSearchKey={showSearchKey} setShowSearchKey={setShowSearchKey} saveApiKeys={saveApiKeys}
            profile={profile} signIn={signIn} authBusy={authBusy} signOut={async () => { await window.nova.auth.signOut(); setProfile(null); notify('Signed out of Google.'); }} clearData={clearData}
          /> : pageMode === 'history' ? <HistoryPage entries={historyItems} openUrl={openTabFromUrl} clear={() => { void window.nova.data.clearHistory().then(refreshHistory); }} />
          : pageMode === 'downloads' ? <DownloadsPage downloads={downloads} openFile={(path) => { void window.nova.app.showInFolder(path).catch((error) => notify(error instanceof Error ? error.message : 'Could not show the downloaded file.')); }} />
          : pageMode === 'bookmarks' ? <BookmarksPage bookmarks={bookmarks} openUrl={openTabFromUrl} remove={async (id) => { await window.nova.data.removeBookmark(id); await refreshBookmarks(); }} />
          : activeTab?.kind === 'search' ? <SearchPage query={activeSearchTerm} category={searchCategory} setCategory={openSearchCategory} response={searchResponse} aiAnswer={aiAnswer} aiBusy={aiBusy} provider={searchProvider} openUrl={openTabFromUrl} fallbackSearch={() => openTabFromUrl(searchProvider === 'bing' ? `https://www.bing.com/search?q=${encodeURIComponent(activeSearchTerm)}` : searchProvider === 'duckduckgo' ? `https://duckduckgo.com/?q=${encodeURIComponent(activeSearchTerm)}` : searchProvider === 'brave' ? `https://search.brave.com/search?q=${encodeURIComponent(activeSearchTerm)}` : `https://www.google.com/search?q=${encodeURIComponent(activeSearchTerm)}`)} />
          : activeTab?.kind === 'web' ? <div className="web-placeholder"><div className="web-loading-mark"><Globe2 size={28} /></div><span>Loading page…</span></div>
          : <HomePage bookmarks={bookmarks} recent={homeRecent} openUrl={openTabFromUrl} onSearch={(q) => void submitSearch(q)} />}
        </main>

        {sidebarOpen && <aside className="ai-sidebar" ref={sideRef}>
          <div className="assistant-header"><div className="assistant-heading"><div className="nova-avatar"><Sparkles size={16} /></div><div><b>NOVA AI</b><span>Browser assistant</span></div></div><div className="assistant-actions"><button title="New conversation" onClick={() => updateChatMessages([])}><Plus size={15} /></button><button title="Close sidebar" onClick={() => setSidebarOpen(false)}><X size={16} /></button></div></div>
          <div className="assistant-context">
            <div className="context-label"><span className="live-dot" /> CURRENT TAB</div>
            <div className="context-site"><Globe2 size={13} /><span>{activeTab?.kind === 'web' ? shortDomain(activeTab.url) : activeTab?.kind === 'search' ? `Search: ${activeSearchTerm}` : 'New tab'}</span></div>
            {activeTab?.kind === 'web' && <div className="context-actions"><button onClick={() => void askAboutPage(false)}><BookOpen size={13} /> Summarize page</button><button onClick={() => void askAboutPage(true)}><SearchCheck size={13} /> Explain selection</button></div>}
          </div>
          <div className="chat-messages">
            {chatMessages.length === 0 ? <div className="assistant-welcome">
              <div className="welcome-orb"><Sparkles size={24} /></div><h3>What can I help you explore?</h3><p>Ask questions or research the web. Use the page actions above to share the active tab with NOVA when you choose.</p>
              <div className="suggestion-prompts"><button onClick={() => setAiInput('Summarize the key points of this page')}>Summarize this page <ArrowRight size={13} /></button><button onClick={() => setAiInput('Explain this topic in simple terms')}>Explain a topic <ArrowRight size={13} /></button><button onClick={() => setAiInput('Compare the pros and cons of…')}>Compare options <ArrowRight size={13} /></button></div>
            </div> : chatMessages.map((message, index) => <ChatBubble key={`${index}-${message.role}`} message={message} />)}
            {aiBusy && <div className="thinking-indicator"><span /><span /><span /> NOVA is thinking</div>}
          </div>
          {!aiHasKey && <div className="assistant-key-hint"><Zap size={14} /> Add your OpenAI API key in Settings to start chatting.</div>}
          <form className="chat-composer" onSubmit={sendAI}>
            {activeTab?.kind === 'web' && <button type="button" className={`page-context-toggle ${includeActivePage ? 'enabled' : ''}`} onClick={() => setIncludeActivePage((value) => !value)}><BookOpen size={12} /> {includeActivePage ? 'Active page will be shared for this message' : 'Add active page context'}</button>}
            <textarea value={aiInput} onChange={(event) => setAiInput(event.target.value)} placeholder="Ask NOVA anything…" rows={2} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendAI(); } }} />
            <div className="composer-bottom"><span><Command size={11} /> Enter to send · Shift+Enter for new line</span><button type="submit" disabled={!aiInput.trim() || aiBusy}><Send size={15} /></button></div>
          </form>
          <div className="assistant-disclaimer">AI can make mistakes. Verify important information.</div>
        </aside>}
      </div>

      {toast && <div className="toast"><Check size={15} />{toast}</div>}
      <div className="status-bar"><span><ShieldCheck size={12} /> Protected browsing</span><span>{activeTab?.private ? 'Private session · history is not saved' : 'Local data stays on this device'}</span><span className="status-right">NOVA AI Browser · Preview</span></div>
    </div>
  );
}

function HomePage({ bookmarks, recent, openUrl, onSearch }: { bookmarks: BookmarkItem[]; recent: HistoryEntry[]; openUrl: (url: string) => void; onSearch: (q: string) => void }) {
  const [query, setQuery] = useState('');
  return <div className="home-scroll"><div className="home-content">
    <div className="home-brand"><div className="home-logo"><span>✦</span></div><div className="home-wordmark">NOVA</div><div className="home-subtitle">A clearer way to explore the web</div></div>
    <form className="home-search" onSubmit={(event) => { event.preventDefault(); onSearch(query); }}><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search anything or ask NOVA AI…" /><button type="submit"><Sparkles size={16} /> Search</button></form>
    <div className="home-shortcuts">{shortcuts.map((shortcut) => <button key={shortcut.url} className="shortcut" onClick={() => openUrl(shortcut.url)}><span className={`shortcut-icon ${shortcut.tint}`}>{shortcut.letter}</span><span>{shortcut.title}</span></button>)}<button className="shortcut add-shortcut" onClick={() => { const url = window.prompt('Enter a website URL'); if (url) openUrl(url); }}><span className="shortcut-icon add">+</span><span>Add shortcut</span></button></div>
    <div className="home-section-grid">
      <section className="home-panel"><div className="panel-heading"><h3><Bookmark size={15} /> Bookmarks</h3><span>{bookmarks.length} saved</span></div>{bookmarks.length ? bookmarks.slice(0, 5).map((item) => <button className="home-list-item" key={item.id} onClick={() => openUrl(item.url)}><img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(shortDomain(item.url))}&sz=32`} /><span>{item.title}</span><ExternalLink size={12} /></button>) : <div className="empty-inline">Pages you bookmark will show up here.</div>}</section>
      <section className="home-panel"><div className="panel-heading"><h3><Clock3 size={15} /> Recently visited</h3><span>{recent.length} pages</span></div>{recent.length ? recent.slice(0, 5).map((item) => <button className="home-list-item" key={item.id} onClick={() => openUrl(item.url)}><Globe2 size={14} /><span>{item.title || shortDomain(item.url)}</span><ExternalLink size={12} /></button>) : <div className="empty-inline">Your recent browsing will appear here.</div>}</section>
    </div>
    <div className="home-footer-note"><ShieldCheck size={14} /> Your bookmarks and history are stored locally on this device.</div>
  </div></div>;
}

function SearchPage({ query, category, setCategory, response, aiAnswer, aiBusy, provider, openUrl, fallbackSearch }: {
  query: string; category: ResultsCategory; setCategory: (category: ResultsCategory) => void; response: SearchResponse | null;
  aiAnswer: AIMessage | null; aiBusy: boolean; provider: string; openUrl: (url: string) => void; fallbackSearch: () => void;
}) {
  return <div className="search-scroll"><div className="search-page-inner">
    <div className="search-page-heading"><div className="mini-brand"><span>✦</span>NOVA</div><div className="search-page-query">{query}</div></div>
    <nav className="search-categories">{categoryItems.map(({ id, label, icon: Icon }) => <button key={id} className={category === id ? 'selected' : ''} onClick={() => void setCategory(id)}><Icon size={14} />{label}</button>)}</nav>
    {category === 'ai' ? <section className="ai-overview-card"><div className="ai-overview-title"><span className="ai-mini-mark"><Sparkles size={15} /></span><b>AI Overview</b><span className="grounded-label">{aiAnswer?.sources?.length ? 'Sources linked' : 'Generated by NOVA'}</span></div>{aiBusy ? <div className="search-loading"><LoaderCircle className="spin" size={20} /> Building a source-grounded overview…</div> : aiAnswer ? <div className="ai-overview-content"><div className="ai-answer-text">{aiAnswer.content.split(/(\[\d+\])/g).map((part, index) => /^\[\d+\]$/.test(part) ? <sup key={index}>{part}</sup> : <span key={index}>{part}</span>)}</div>{aiAnswer.sources?.length ? <div className="source-list"><b>Sources</b>{aiAnswer.sources.map((source, i) => <button key={source.url} onClick={() => openUrl(source.url)}><span>{i + 1}</span>{source.title}<ExternalLink size={12} /></button>)}</div> : null}</div> : <div className="empty-inline">Select AI Overview to ask NOVA for a live, cited answer.</div>}</section>
    : <>
      {response?.error && <div className="api-error"><div className="api-error-icon"><CircleHelp size={18} /></div><div><b>{response.configured ? 'Search provider error' : 'Live search is not configured'}</b><p>{response.error}</p>{!response.configured && <button onClick={fallbackSearch}>Search with {provider === 'duckduckgo' ? 'DuckDuckGo' : provider === 'bing' ? 'Bing' : provider === 'brave' ? 'Brave' : 'Google'} instead <ExternalLink size={13} /></button>}</div></div>}
      {!response && <div className="search-loading"><LoaderCircle className="spin" size={20} /> Searching the web…</div>}
      {response && !response.error && response.results.length === 0 && <div className="empty-inline">No results found for this category.</div>}
      {category === 'images' ? <div className="image-results-grid">{response?.results.map((item) => <div key={item.url} className="image-result"><button className="image-result-open" onClick={() => openUrl(item.imageUrl || item.url)} title="Open original image"><div className="image-result-preview">{item.thumbnail ? <img src={item.thumbnail} loading="lazy" /> : <ImageIcon size={28} />}</div><b>{item.title}</b></button><span>{item.domain}</span><button className="image-source-link" onClick={() => openUrl(item.url)}>Open source page <ExternalLink size={11} /></button></div>)}</div>
      : category === 'videos' ? <div className="video-results-list">{response?.results.map((item) => <ResultCard key={item.url} item={item} openUrl={openUrl} video />)}</div>
      : <div className="web-results-list">{response?.results.map((item) => <ResultCard key={item.url} item={item} openUrl={openUrl} />)}</div>}
      </>}
    <div className="search-disclaimer">Search results are supplied by the configured provider. NOVA does not fabricate results.</div>
  </div></div>;
}

function ResultCard({ item, openUrl, video = false }: { item: SearchResult; openUrl: (url: string) => void; video?: boolean }) {
  return <article className={`result-card ${video ? 'video-result-card' : ''}`}>
    {video && item.thumbnail && <button className="video-thumb" onClick={() => openUrl(item.url)}><img src={item.thumbnail} loading="lazy" /><span><PlaySquare size={17} /></span></button>}
    <div className="result-meta"><Globe2 size={13} /><span>{item.domain || shortDomain(item.url)}</span>{item.published && <><span>·</span><time>{item.published}</time></>}</div>
    <button className="result-title" onClick={() => openUrl(item.url)}>{item.title}</button>
    <p>{item.description}</p>
    <button className="result-url" onClick={() => openUrl(item.url)}>{item.url}</button>
  </article>;
}

function ChatBubble({ message }: { message: AIMessage }) {
  return <div className={`chat-bubble ${message.role}`}><div className="bubble-avatar">{message.role === 'assistant' ? <Sparkles size={13} /> : <UserRound size={13} />}</div><div className="bubble-body"><div className="bubble-content">{message.content}</div>{message.sources?.length ? <div className="bubble-sources">{message.sources.slice(0, 4).map((source, index) => <button key={source.url} onClick={() => window.nova.app.openExternal(source.url)}>{index + 1}. {source.title}</button>)}</div> : null}</div></div>;
}

function SettingsPage(props: {
  theme: 'dark' | 'light'; setTheme: (v: 'dark' | 'light') => void; searchProvider: string; setSearchProvider: (v: string) => void;
  aiHasKey: boolean; searchHasKey: boolean; aiKeyInput: string; setAiKeyInput: (v: string) => void; searchKeyInput: string; setSearchKeyInput: (v: string) => void;
  showAiKey: boolean; setShowAiKey: (v: boolean) => void; showSearchKey: boolean; setShowSearchKey: (v: boolean) => void; saveApiKeys: () => void;
  profile: UserProfile | null; signIn: () => void; authBusy: boolean; signOut: () => void; clearData: () => void;
}) {
  const [section, setSection] = useState('appearance');
  const sections = [{ id: 'appearance', label: 'Appearance', icon: Sun }, { id: 'search', label: 'Search engine', icon: Search }, { id: 'ai', label: 'AI assistant', icon: Sparkles }, { id: 'account', label: 'Google account & sync', icon: Cloud }, { id: 'privacy', label: 'Privacy & security', icon: ShieldCheck }, { id: 'about', label: 'About NOVA', icon: CircleHelp }];
  return <div className="settings-layout"><aside className="settings-nav"><div className="settings-title">Settings</div>{sections.map(({ id, label, icon: Icon }) => <button key={id} className={section === id ? 'active' : ''} onClick={() => setSection(id)}><Icon size={15} />{label}</button>)}</aside><div className="settings-content">
    {section === 'appearance' && <><SettingsHeading title="Appearance" subtitle="Make NOVA feel like home." /><div className="settings-card"><h3>Theme</h3><p>Choose the look for your browser window.</p><div className="theme-options"><button className={props.theme === 'dark' ? 'chosen' : ''} onClick={() => props.setTheme('dark')}><div className="theme-preview dark-preview"><div /><span /></div><b>Dark</b></button><button className={props.theme === 'light' ? 'chosen' : ''} onClick={() => props.setTheme('light')}><div className="theme-preview light-preview"><div /><span /></div><b>Light</b></button></div></div></>}
    {section === 'search' && <><SettingsHeading title="Search engine" subtitle="Choose where NOVA sends searches typed in the address bar." /><div className="settings-card"><h3>Default search engine</h3><p>You can still use any provider by entering its search URL or changing this setting.</p><select className="settings-select" value={props.searchProvider} onChange={(event) => props.setSearchProvider(event.target.value)}><option value="google">Google</option><option value="bing">Microsoft Bing</option><option value="duckduckgo">DuckDuckGo</option><option value="brave">Brave Search</option></select><div className="settings-note"><Globe2 size={15} /> NOVA's custom results page uses Brave Search API when configured. The selected default is used for fallback web searches.</div></div></>}
    {section === 'ai' && <><SettingsHeading title="AI assistant" subtitle="Connect NOVA to an AI provider and live web search." /><div className="settings-card"><div className="settings-card-heading"><div><h3>OpenAI API</h3><p>Used for chat, page summaries and AI overviews.</p></div><span className={`connection-pill ${props.aiHasKey ? 'connected' : ''}`}>{props.aiHasKey ? 'Configured' : 'Not configured'}</span></div><label className="field-label">OpenAI API key</label><div className="secret-field"><input type={props.showAiKey ? 'text' : 'password'} value={props.aiKeyInput} onChange={(event) => props.setAiKeyInput(event.target.value)} placeholder="sk-…" autoComplete="off" /><button onClick={() => props.setShowAiKey(!props.showAiKey)}>{props.showAiKey ? <EyeOff size={15} /> : <Eye size={15} />}</button></div><div className="settings-note">Create a key in the <a href="https://platform.openai.com/api-keys" onClick={(e) => { e.preventDefault(); void window.nova.app.openExternal('https://platform.openai.com/api-keys'); }}>OpenAI developer dashboard</a>. API usage is billed by OpenAI.</div></div>
      <div className="settings-card"><div className="settings-card-heading"><div><h3>Brave Search API</h3><p>Live web, images, video and news search results.</p></div><span className={`connection-pill ${props.searchHasKey ? 'connected' : ''}`}>{props.searchHasKey ? 'Configured' : 'Not configured'}</span></div><label className="field-label">Brave Search API key</label><div className="secret-field"><input type={props.showSearchKey ? 'text' : 'password'} value={props.searchKeyInput} onChange={(event) => props.setSearchKeyInput(event.target.value)} placeholder="Brave API subscription token" autoComplete="off" /><button onClick={() => props.setShowSearchKey(!props.showSearchKey)}>{props.showSearchKey ? <EyeOff size={15} /> : <Eye size={15} />}</button></div><div className="settings-note">Get a key from the <a href="https://api-dashboard.search.brave.com/" onClick={(e) => { e.preventDefault(); void window.nova.app.openExternal('https://api-dashboard.search.brave.com/'); }}>Brave Search API dashboard</a>. A plan may be required.</div></div><button className="primary-action" onClick={props.saveApiKeys}><Check size={15} /> Save provider settings</button></>}
    {section === 'account' && <><SettingsHeading title="Google account & sync" subtitle="Sign in to associate your NOVA profile with a Google account." /><div className="settings-card account-card">{props.profile ? <><div className="account-profile">{props.profile.picture ? <img src={props.profile.picture} /> : <div className="profile-fallback"><UserRound size={24} /></div>}<div><b>{props.profile.name}</b><span>{props.profile.email}</span></div></div><div className="settings-note">Google sign-in is active. Cross-device browser sync is not yet connected to a cloud sync service.</div><button className="secondary-action" onClick={props.signOut}><LogOut size={15} /> Sign out</button></> : <><div className="google-logo">G</div><h3>Sign in with Google</h3><p>Use Google's system-browser OAuth flow. NOVA requests basic profile information only.</p><button className="primary-action" onClick={props.signIn} disabled={props.authBusy}>{props.authBusy ? <LoaderCircle className="spin" size={15} /> : <UserRound size={15} />} Continue with Google</button></>}<div className="settings-note">Set <code>GOOGLE_CLIENT_ID</code> to a Desktop OAuth client from Google Cloud Console. Sync requires a separate backend and is not enabled in this build.</div></div></>}
    {section === 'privacy' && <><SettingsHeading title="Privacy & security" subtitle="Manage local browsing data and site access." /><div className="settings-card"><h3>Browsing data</h3><p>Clear your local history, downloads list, cookies, site storage and cache.</p><button className="danger-action" onClick={props.clearData}><Trash2 size={15} /> Clear browsing data</button></div><div className="settings-card"><h3>Protection in this build</h3><ul className="security-list"><li><Check size={14} /> Remote web content has Node integration disabled.</li><li><Check size={14} /> Preload APIs are isolated and allow-listed.</li><li><Check size={14} /> Site permission requests require an explicit decision.</li><li><Check size={14} /> Private tabs use non-persistent Chromium sessions.</li><li><Check size={14} /> Provider secrets use OS-backed encryption when available.</li></ul></div></>}
    {section === 'about' && <><SettingsHeading title="About NOVA AI Browser" subtitle="A Chromium desktop browser with an integrated AI companion." /><div className="settings-card about-card"><div className="about-logo">✦</div><h2>NOVA AI Browser</h2><span className="version-label">Version 0.1.0 · Developer preview</span><p>Built with Electron, Chromium, React, TypeScript and SQLite.</p><div className="settings-note">The current build is a functional browser foundation. Search and AI work when API keys are configured. See the README for features that still need a cloud sync service or additional providers.</div></div></>}
  </div></div>;
}

function SettingsHeading({ title, subtitle }: { title: string; subtitle: string }) { return <div className="settings-heading"><h1>{title}</h1><p>{subtitle}</p></div>; }

function HistoryPage({ entries, openUrl, clear }: { entries: HistoryEntry[]; openUrl: (url: string) => void; clear: () => void }) {
  return <div className="library-page"><div className="library-heading"><div><h1>Browsing history</h1><p>Pages visited in this browser profile.</p></div><button className="secondary-action" onClick={clear}><Trash2 size={14} /> Clear history</button></div>{entries.length ? entries.map((item) => <button key={item.id} className="library-row" onClick={() => openUrl(item.url)}><Globe2 size={16} /><span><b>{item.title}</b><small>{item.url}</small></span><time>{timeLabel(item.visitedAt)}</time><ExternalLink size={13} /></button>) : <div className="library-empty"><History size={26} /><b>No browsing history yet</b><span>Pages you visit will appear here.</span></div>}</div>;
}

function DownloadsPage({ downloads, openFile }: { downloads: DownloadEntry[]; openFile: (path: string) => void }) {
  return <div className="library-page"><div className="library-heading"><div><h1>Downloads</h1><p>Files saved by NOVA.</p></div></div>{downloads.length ? downloads.map((item) => <div key={item.id} className="library-row download-row"><Download size={16} /><span><b>{item.filename}</b><small>{item.path}</small><div className="download-progress"><i style={{ width: `${item.totalBytes ? Math.min(100, item.receivedBytes / item.totalBytes * 100) : item.state === 'completed' ? 100 : 0}%` }} /></div></span><em className={`download-state ${item.state}`}>{item.state}</em><button className="tiny-action" onClick={() => openFile(item.path)} title="Show saved path"><ExternalLink size={13} /></button></div>) : <div className="library-empty"><Download size={26} /><b>No downloads yet</b><span>Downloads will appear here with progress and status.</span></div>}</div>;
}

function BookmarksPage({ bookmarks, openUrl, remove }: { bookmarks: BookmarkItem[]; openUrl: (url: string) => void; remove: (id: number) => void }) {
  return <div className="library-page"><div className="library-heading"><div><h1>Bookmarks</h1><p>Your saved pages, stored locally.</p></div></div>{bookmarks.length ? bookmarks.map((item) => <div key={item.id} className="library-row"><Bookmark size={16} /><button className="library-row-main" onClick={() => openUrl(item.url)}><b>{item.title}</b><small>{item.url}</small></button><button className="tiny-action" onClick={() => remove(item.id)} title="Remove bookmark"><Trash2 size={13} /></button></div>) : <div className="library-empty"><Bookmark size={26} /><b>No bookmarks saved</b><span>Use the star beside the address bar to save a page.</span></div>}</div>;
}

export default App;
