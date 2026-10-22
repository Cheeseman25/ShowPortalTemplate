// Root component: owns all state, data loading and handlers; renders the page sections.
import { SHOW, CALLBOARD_BACKEND_URL, DIRECT_CAST_CSV_URL, FALLBACK_TRACKS, INITIAL_CALL_TYPES, TAB_INFO, DEFAULT_TAB, storageKey } from "./config";
import { startSnow } from "./effects/snow";
import { trackAnalyticsEvent } from "./lib/analytics";
import { parseDateTimestamp } from "./lib/dates";
import { to24, fromTimeInput, splitLegacyTime, timeRangeLabel } from "./lib/callTimes";
import { naturalTrackSorter } from "./lib/music";
import { launchFanfareCelebration } from "./lib/celebration";
import { processCastRows } from "./lib/cast";
import { Header } from "./components/Header";
import { NavBar } from "./components/NavBar";
import { CallBoardTab } from "./tabs/CallBoardTab";
import { CastTab } from "./tabs/CastTab";
import { CostumesTab } from "./tabs/CostumesTab";
import { MusicTab } from "./tabs/MusicTab";
import { VideosTab } from "./tabs/VideosTab";
import { CalendarTab } from "./tabs/CalendarTab";
import { CalendarEventModal } from "./modals/CalendarEventModal";
import { CelebrationModal } from "./modals/CelebrationModal";
import { LoginModal } from "./modals/LoginModal";
import { EditCallModal } from "./modals/EditCallModal";
import { CalendarChoiceModal } from "./modals/CalendarChoiceModal";
import { Footer } from "./components/Footer";

const { useState, useEffect, useRef, useMemo } = React;

export function ProductionApp() {
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    return TAB_INFO[hash] ? hash : DEFAULT_TAB;
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [copiedBreadcrumb, setCopiedBreadcrumb] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const [adminSessionToken, setAdminSessionToken] = useState(() => sessionStorage.getItem(storageKey('admin_token')) || '');
  const isAdmin = Boolean(adminSessionToken);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [actorList, setActorList] = useState(() => {
    const saved = localStorage.getItem(storageKey('cast_list'));
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoadingCast, setIsLoadingCast] = useState(() => !localStorage.getItem(storageKey('cast_list')));
  const [castError, setCastError] = useState(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [castFilterQuery, setCastFilterQuery] = useState('');

  const [revealedCardIds, setRevealedCardIds] = useState([]);
  const [celebrationTarget, setCelebrationTarget] = useState(null);

  const [callTypes, setCallTypes] = useState(() => {
    const saved = localStorage.getItem(storageKey('call_types'));
    return saved ? JSON.parse(saved) : INITIAL_CALL_TYPES;
  });

  const [rehearsals, setRehearsals] = useState(() => {
    const saved = localStorage.getItem(storageKey('rehearsals'));
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return parsed.sort((a, b) => parseDateTimestamp(b.date) - parseDateTimestamp(a.date));
    } catch(e) {
      return [];
    }
  });
  const [backendStatus, setBackendStatus] = useState('Connecting to backend...');
  const [callSearchRole, setCallSearchRole] = useState('');

  const [showArchivedSection, setShowArchivedSection] = useState(false);

  const [calendarEvents, setCalendarEvents] = useState(() => {
    const saved = localStorage.getItem(storageKey('calendar_events'));
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(() => !localStorage.getItem(storageKey('calendar_events')));
  const [calendarSearch, setCalendarSearch] = useState('');
  const [calendarViewMode, setCalendarViewMode] = useState('next8');
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState(null);

  const [musicTracks, setMusicTracks] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey('music_tracks'));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].previewUrl) {
          return parsed.sort(naturalTrackSorter);
        }
      }
    } catch(e) {}
    return FALLBACK_TRACKS;
  });

  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [isLoadingMusic, setIsLoadingMusic] = useState(false);

  const folderCategories = useMemo(() => {
    const map = {};
    musicTracks.forEach(track => {
      const cat = track.category || 'General';
      if (!map[cat]) map[cat] = [];
      map[cat].push(track);
    });
    Object.keys(map).forEach(key => {
      map[key].sort(naturalTrackSorter);
    });
    return map;
  }, [musicTracks]);

  const folderNames = useMemo(() => Object.keys(folderCategories), [folderCategories]);

  const [musicTabSubView, setMusicTabSubView] = useState(() => {
    return folderNames[0] || 'Practice Tracks';
  });

  useEffect(() => {
    if (musicTabSubView !== 'youtube' && folderNames.length > 0 && !folderNames.includes(musicTabSubView)) {
      setMusicTabSubView(folderNames[0]);
    }
  }, [folderNames, musicTabSubView]);

  const currentFolderTracks = useMemo(() => {
    return folderCategories[musicTabSubView] || [];
  }, [folderCategories, musicTabSubView]);

  const [isEditingCall, setIsEditingCall] = useState(false);
  const [pendingCalendarChoice, setPendingCalendarChoice] = useState(null);
  const [calendarChoiceBusy, setCalendarChoiceBusy] = useState(false);
  const [editCallData, setEditCallData] = useState({
    id: '',
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    time: '',
    location: '',
    type: 'Wednesday Partial Call',
    customType: '',
    calledRoles: [],
    focusScenes: '',
    notes: '',
    isArchived: false
  });
  const [isCustomTypeMode, setIsCustomTypeMode] = useState(false);
  const [callModalPerformerFilter, setCallModalPerformerFilter] = useState('');

  /* Background Snowfall Animation */
  // Page background effect chosen in the show settings.
  useEffect(() => {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    if (SHOW.background === 'snow') return startSnow(canvas);
  }, []);

  const triggerLanguageTranslation = (langCode) => {
    setCurrentLanguage(langCode);
    document.documentElement.dir = (langCode === 'ar') ? 'rtl' : 'ltr';

    document.cookie = `googtrans=/en/${langCode}; path=/;`;
    document.cookie = `googtrans=/en/${langCode}; domain=${window.location.hostname}; path=/;`;

    const selectElement = document.querySelector('.goog-te-combo');
    if (selectElement) {
      selectElement.value = langCode;
      selectElement.dispatchEvent(new Event('change'));
    } else {
      window.location.reload();
    }

    trackAnalyticsEvent('change_site_language', { language: langCode });
  };

  const navigateToTab = (tabId) => {
    setActiveTab(tabId);
    window.location.hash = tabId;

    trackAnalyticsEvent('page_view', {
      page_title: TAB_INFO[tabId]?.label || tabId,
      page_location: window.location.href,
      page_path: '/#' + tabId
    });
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (TAB_INFO[hash]) {
        setActiveTab(hash);
        trackAnalyticsEvent('page_view', {
          page_title: TAB_INFO[hash]?.label || hash,
          page_location: window.location.href,
          page_path: '/#' + hash
        });
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const copyCurrentBreadcrumbLink = () => {
    const url = window.location.origin + window.location.pathname + '#' + activeTab;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedBreadcrumb(true);
      setTimeout(() => setCopiedBreadcrumb(false), 2000);
    });
  };

  const loadLiveCast = async () => {
    if (actorList.length === 0) setIsLoadingCast(true);
    setCastError(null);

    try {
      const res = await fetch(`${CALLBOARD_BACKEND_URL}?action=getCast&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 1) {
          const parsed = processCastRows(data);
          if (parsed.length > 0) {
            setActorList(parsed);
            localStorage.setItem(storageKey('cast_list'), JSON.stringify(parsed));
            setIsLoadingCast(false);
            return;
          }
        }
      }
    } catch (err) {}

    try {
      const fallbackRes = await fetch(`${DIRECT_CAST_CSV_URL}&t=${Date.now()}`);
      if (!fallbackRes.ok) throw new Error("Could not fetch Cast spreadsheet.");
      const csvText = await fallbackRes.text();

      const rawLines = csvText.trim().split(/\r?\n/).map(line => {
        const row = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            row.push(cur.trim().replace(/^"|"$/g, ''));
            cur = '';
          } else cur += char;
        }
        row.push(cur.trim().replace(/^"|"$/g, ''));
        return row;
      });

      const parsed = processCastRows(rawLines);
      if (parsed.length > 0) {
        setActorList(parsed);
        localStorage.setItem(storageKey('cast_list'), JSON.stringify(parsed));
      }
    } catch (fallbackErr) {
      if (actorList.length === 0) {
        setCastError("Could not load cast roster.");
      }
    } finally {
      setIsLoadingCast(false);
    }
  };

  const fetchBackendRehearsals = async () => {
    if (!CALLBOARD_BACKEND_URL) return;
    try {
      const res = await fetch(`${CALLBOARD_BACKEND_URL}?t=${Date.now()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const formatted = data.map(item => {
          const rawArch = String(item.isArchived || '').trim().toLowerCase();
          const isArch = (rawArch === 'true' || rawArch === 'yes' || rawArch === '1' || item.isArchived === true);
          return {
            ...item,
            calledRoles: typeof item.calledRoles === 'string' ? item.calledRoles.split(',').map(s=>s.trim()).filter(Boolean) : (item.calledRoles || []),
            focusScenes: typeof item.focusScenes === 'string' ? item.focusScenes.split(',').map(s=>s.trim()).filter(Boolean) : (item.focusScenes || []),
            isArchived: isArch
          };
        });
        formatted.sort((a, b) => parseDateTimestamp(b.date) - parseDateTimestamp(a.date));
        setRehearsals(formatted);
        localStorage.setItem(storageKey('rehearsals'), JSON.stringify(formatted));
        setBackendStatus('Connected to Google Sheet Backend');
      }
    } catch (e) {
      setBackendStatus('Offline / Local Storage Mode');
    }
  };

  const fetchCalendarEvents = async () => {
    if (!CALLBOARD_BACKEND_URL) return;
    if (calendarEvents.length === 0) setIsLoadingCalendar(true);

    try {
      const res = await fetch(`${CALLBOARD_BACKEND_URL}?action=getCalendarEvents&t=${Date.now()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        data.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        setCalendarEvents(data);
        localStorage.setItem(storageKey('calendar_events'), JSON.stringify(data));
      }
    } catch (err) {
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  const fetchMusicLibrary = async () => {
    if (!CALLBOARD_BACKEND_URL) return;
    setIsLoadingMusic(true);

    try {
      const res = await fetch(`${CALLBOARD_BACKEND_URL}?action=getMusic&t=${Date.now()}`);
      const data = await res.json();
      let list = [];
      if (data && data.status === 'success' && Array.isArray(data.tracks)) {
        list = data.tracks;
      } else if (Array.isArray(data)) {
        list = data;
      }

      const clean = list.filter(t => t && t.previewUrl && !t.calledRoles);
      if (clean.length > 0) {
        clean.sort(naturalTrackSorter);
        setMusicTracks(clean);
        localStorage.setItem(storageKey('music_tracks'), JSON.stringify(clean));
      }
    } catch (err) {
      console.log("Drive sync error:", err);
    } finally {
      setIsLoadingMusic(false);
    }
  };

  useEffect(() => {
    if (!CALLBOARD_BACKEND_URL) {
      // New show without a backend yet: show empty pages instead of failing requests.
      setBackendStatus('Backend not connected yet (set backendUrl in show settings)');
      setIsLoadingCast(false);
      setIsLoadingCalendar(false);
      return;
    }
    loadLiveCast();
    fetchBackendRehearsals();
    fetchCalendarEvents();
    fetchMusicLibrary();
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey('rehearsals'), JSON.stringify(rehearsals));
  }, [rehearsals]);

  useEffect(() => {
    localStorage.setItem(storageKey('call_types'), JSON.stringify(callTypes));
  }, [callTypes]);

  const currentTrack = musicTracks[activeTrackIndex] || FALLBACK_TRACKS[0];

  const selectTrack = (index) => {
    setActiveTrackIndex(index);
    trackAnalyticsEvent('select_rehearsal_track', { track_name: musicTracks[index]?.title });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAdminPinError('');

    try {
      const res = await fetch(CALLBOARD_BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'verifyPin', pin: adminPinInput })
      });
      const result = await res.json();

      if (result.status === 'success') {
        sessionStorage.setItem(storageKey('admin_token'), adminPinInput);
        setAdminSessionToken(adminPinInput);
        setShowLoginModal(false);
        setAdminPinInput('');
        trackAnalyticsEvent('admin_login_success');
      } else {
        setAdminPinError(result.message || 'Invalid PIN. Access denied.');
        trackAnalyticsEvent('admin_login_failed');
      }
    } catch (err) {
      setAdminPinError('Error connecting to authentication server.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(storageKey('admin_token'));
    setAdminSessionToken('');
    trackAnalyticsEvent('admin_logout');
  };

  const openAddCall = () => {
    setEditCallData({
      id: 'reh-' + Date.now(),
      title: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      time: '',
      location: '',
      type: callTypes[0] || 'Wednesday Partial Call',
      customType: '',
      calledRoles: [],
      focusScenes: '',
      notes: '',
      isArchived: false
    });
    setIsCustomTypeMode(false);
    setCallModalPerformerFilter('');
    setIsEditingCall(true);
  };

  const openEditCall = (reh) => {
    // Older entries only have one combined time string; split it so the pickers fill in.
    const legacy = splitLegacyTime(reh.time);
    setEditCallData({
      ...reh,
      startTime: to24(reh.startTime) || legacy[0],
      endTime: to24(reh.endTime) || legacy[1],
      customType: '',
      calledRoles: Array.isArray(reh.calledRoles) ? reh.calledRoles : (reh.calledRoles ? [reh.calledRoles] : []),
      focusScenes: Array.isArray(reh.focusScenes) ? reh.focusScenes.join(', ') : (reh.focusScenes || ''),
      isArchived: Boolean(reh.isArchived)
    });
    setIsCustomTypeMode(!callTypes.includes(reh.type));
    setCallModalPerformerFilter('');
    setIsEditingCall(true);
  };

  const toggleCalledRole = (roleTag) => {
    const cur = [...editCallData.calledRoles];
    const idx = cur.indexOf(roleTag);
    if (idx > -1) {
      cur.splice(idx, 1);
    } else {
      cur.push(roleTag);
    }
    setEditCallData({ ...editCallData, calledRoles: cur });
  };

  const selectAllGroup = (groupType) => {
    let tags = [];
    if (groupType === 'FULL_COMPANY') {
      tags = [
        'Full Cast & Company (All Members)',
        ...actorList.map(c => `${c.actorName} (${c.role})`)
      ];
    } else if (groupType === 'ALL_PRINCIPALS') {
      tags = actorList.filter(c => !c.isFeaturedEnsembleOrChorus).map(c => `${c.actorName} (${c.role})`);
    } else if (groupType === 'ALL_ENSEMBLE') {
      tags = actorList.filter(c => c.isFeaturedEnsembleOrChorus).map(c => `${c.actorName} (${c.role})`);
    }
    const merged = Array.from(new Set([...editCallData.calledRoles, ...tags]));
    setEditCallData({ ...editCallData, calledRoles: merged });
  };

  const clearAllRoles = () => {
    setEditCallData({ ...editCallData, calledRoles: [] });
  };

  const modalFilteredActors = useMemo(() => {
    const q = callModalPerformerFilter.toLowerCase().trim();
    if (!q) return actorList;
    return actorList.filter(item => 
      item.actorName.toLowerCase().includes(q) || 
      item.role.toLowerCase().includes(q) ||
      (item.category && item.category.toLowerCase().includes(q))
    );
  }, [actorList, callModalPerformerFilter]);

  const openCelebration = (item) => {
    const isFirstReveal = !revealedCardIds.includes(item.id);
    if (isFirstReveal) {
      setRevealedCardIds(prev => [...prev, item.id]);
    }
    setCelebrationTarget(item);
    launchFanfareCelebration();

    trackAnalyticsEvent('view_cast_card', {
      actor_name: item.actorName,
      assigned_role: item.role,
      category: item.category || 'Company',
      is_first_reveal: isFirstReveal
    });
  };

  const revealAllRoles = () => {
    const allIds = actorList.map(a => a.id);
    setRevealedCardIds(allIds);
    launchFanfareCelebration();
    trackAnalyticsEvent('reveal_all_roles', { count: allIds.length });
  };

  const resetHiddenRoles = () => {
    setRevealedCardIds([]);
    trackAnalyticsEvent('rehide_all_roles');
  };

  const openCalendarEventDetails = (evt) => {
    setSelectedCalendarEvent(evt);
    trackAnalyticsEvent('view_calendar_event', {
      event_title: evt.title,
      event_date: evt.startTime,
      has_meet_link: Boolean(evt.meetLink)
    });
  };

  const saveCall = async (e) => {
    e.preventDefault();

    let finalType = editCallData.type;
    if (isCustomTypeMode && editCallData.customType.trim()) {
      finalType = editCallData.customType.trim();
      if (!callTypes.includes(finalType)) {
        setCallTypes(prev => [...prev, finalType]);
      }
    }

    const { startTime, endTime } = editCallData;
    if (!startTime || !endTime) {
      alert('Please set both a start and an end time.');
      return;
    }
    if (endTime <= startTime) {
      alert('The end time must be after the start time.');
      return;
    }

    const sceneArray = typeof editCallData.focusScenes === 'string'
      ? editCallData.focusScenes.split(',').map(s => s.trim()).filter(Boolean)
      : editCallData.focusScenes;

    const newEntry = {
      ...editCallData,
      startTime: fromTimeInput(startTime),
      endTime: fromTimeInput(endTime),
      time: timeRangeLabel(startTime, endTime),
      type: finalType,
      calledRoles: editCallData.calledRoles,
      focusScenes: sceneArray,
      isArchived: Boolean(editCallData.isArchived)
    };

    const existingIndex = rehearsals.findIndex(r => r.id === newEntry.id);
    let updated = [];
    if (existingIndex > -1) {
      updated = [...rehearsals];
      updated[existingIndex] = newEntry;
    } else {
      updated = [...rehearsals, newEntry];
    }

    updated.sort((a, b) => parseDateTimestamp(b.date) - parseDateTimestamp(a.date));
    setRehearsals(updated);
    localStorage.setItem(storageKey('rehearsals'), JSON.stringify(updated));
    setIsEditingCall(false);

    if (CALLBOARD_BACKEND_URL) {
      try {
        const res = await fetch(CALLBOARD_BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'save', pin: adminSessionToken, item: newEntry })
        });
        const data = await res.json();
        if (data.status === 'error') {
          alert('Save failed: ' + data.message);
        } else {
          trackAnalyticsEvent('publish_rehearsal_call', { title: newEntry.title, isArchived: newEntry.isArchived });
          // Ask the admin what to do if no calendar event matches this call's time.
          const sync = data.sync;
          const unmatched = sync && Array.isArray(sync.unmatched)
            ? sync.unmatched.find(u => String(u.id) === String(newEntry.id))
            : null;
          if (unmatched) {
            setPendingCalendarChoice({
              call: unmatched,
              events: sync.events || [],
              dateLabel: newEntry.date
            });
          }
        }
      } catch (err) {}
    }
  };

  const resolveCalendarChoice = async (choice, eventId) => {
    if (!pendingCalendarChoice || !CALLBOARD_BACKEND_URL) return;
    setCalendarChoiceBusy(true);
    try {
      const body = choice === 'attach'
        ? { action: 'calendarAttach', pin: adminSessionToken, id: pendingCalendarChoice.call.id, eventId }
        : { action: 'calendarCreate', pin: adminSessionToken, id: pendingCalendarChoice.call.id };
      const res = await fetch(CALLBOARD_BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.status === 'error') {
        alert('Calendar update failed: ' + data.message);
      } else {
        alert(choice === 'attach' ? 'Attached to the calendar event.' : 'New calendar invite created.');
        setPendingCalendarChoice(null);
      }
    } catch (err) {
      alert('Calendar update failed: ' + err);
    } finally {
      setCalendarChoiceBusy(false);
    }
  };

  const toggleArchiveCall = async (reh) => {
    const targetState = !reh.isArchived;
    const confirmMsg = targetState 
      ? "Archive this rehearsal call? It will be moved into the collapsible archive vault."
      : "Restore this rehearsal notice to the active call board?";

    if (confirm(confirmMsg)) {
      const updatedEntry = { ...reh, isArchived: targetState };
      const updated = rehearsals.map(r => r.id === reh.id ? updatedEntry : r);
      updated.sort((a, b) => parseDateTimestamp(b.date) - parseDateTimestamp(a.date));
      setRehearsals(updated);
      localStorage.setItem(storageKey('rehearsals'), JSON.stringify(updated));

      if (CALLBOARD_BACKEND_URL) {
        try {
          const res = await fetch(CALLBOARD_BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'save', pin: adminSessionToken, item: updatedEntry })
          });
          const data = await res.json();
          if (data.status === 'error') {
            alert('Archive update failed: ' + data.message);
          }
        } catch (err) {}
      }
    }
  };

  const filteredRehearsals = useMemo(() => {
    if (!callSearchRole.trim()) return rehearsals;
    const query = callSearchRole.toLowerCase();
    return rehearsals.filter(r => {
      const inRoles = Array.isArray(r.calledRoles) && r.calledRoles.some(role => role.toLowerCase().includes(query) || role.toLowerCase() === 'full cast' || role.toLowerCase() === 'company');
      const inTitle = r.title && r.title.toLowerCase().includes(query);
      return inRoles || inTitle;
    });
  }, [rehearsals, callSearchRole]);

  const activeCalls = useMemo(() => {
    return filteredRehearsals.filter(r => !r.isArchived);
  }, [filteredRehearsals]);

  const archivedCalls = useMemo(() => {
    return filteredRehearsals.filter(r => Boolean(r.isArchived));
  }, [filteredRehearsals]);

  const availableCategories = useMemo(() => {
    const cats = Array.from(new Set(actorList.map(c => c.category || 'Company')));
    return ['ALL', ...cats];
  }, [actorList]);

  const filteredActorCards = useMemo(() => {
    const q = castFilterQuery.toLowerCase();
    return actorList.filter(item => {
      const matchesQuery = item.actorName.toLowerCase().includes(q) || 
                           item.role.toLowerCase().includes(q) || 
                           item.category.toLowerCase().includes(q);
      const matchesCategory = selectedCategoryFilter === 'ALL' || item.category === selectedCategoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [actorList, castFilterQuery, selectedCategoryFilter]);

  const allRevealed = actorList.length > 0 && revealedCardIds.length >= actorList.length;

  const visibleCalendarEvents = useMemo(() => {
    const q = calendarSearch.toLowerCase().trim();
    const filtered = calendarEvents.filter(ev => {
      if (!q) return true;
      return (ev.title && ev.title.toLowerCase().includes(q)) || 
             (ev.location && ev.location.toLowerCase().includes(q)) || 
             (ev.description && ev.description.toLowerCase().includes(q));
    });

    if (calendarViewMode === 'next8' && !q) {
      return filtered.slice(0, 8);
    }
    return filtered;
  }, [calendarEvents, calendarSearch, calendarViewMode]);

  const groupedCalendarEvents = useMemo(() => {
    const groups = {};
    visibleCalendarEvents.forEach(ev => {
      const d = new Date(ev.startTime);
      const monthYear = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(ev);
    });
    return groups;
  }, [visibleCalendarEvents]);

  // Everything the page sections read or call, passed down as one object.
  const ctx = {
    activeTab,
    copiedBreadcrumb,
    currentLanguage,
    showLoginModal,
    setShowLoginModal,
    adminPinInput,
    setAdminPinInput,
    adminPinError,
    isAuthenticating,
    actorList,
    isLoadingCast,
    castError,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    castFilterQuery,
    setCastFilterQuery,
    revealedCardIds,
    celebrationTarget,
    setCelebrationTarget,
    callTypes,
    rehearsals,
    backendStatus,
    callSearchRole,
    setCallSearchRole,
    showArchivedSection,
    setShowArchivedSection,
    calendarEvents,
    isLoadingCalendar,
    calendarSearch,
    setCalendarSearch,
    calendarViewMode,
    setCalendarViewMode,
    selectedCalendarEvent,
    setSelectedCalendarEvent,
    musicTracks,
    activeTrackIndex,
    setActiveTrackIndex,
    isLoadingMusic,
    musicTabSubView,
    setMusicTabSubView,
    isEditingCall,
    setIsEditingCall,
    editCallData,
    setEditCallData,
    isCustomTypeMode,
    setIsCustomTypeMode,
    callModalPerformerFilter,
    setCallModalPerformerFilter,
    isAdmin,
    folderCategories,
    folderNames,
    currentFolderTracks,
    triggerLanguageTranslation,
    navigateToTab,
    copyCurrentBreadcrumbLink,
    loadLiveCast,
    fetchCalendarEvents,
    fetchMusicLibrary,
    currentTrack,
    selectTrack,
    handleLogin,
    handleLogout,
    openAddCall,
    openEditCall,
    toggleCalledRole,
    selectAllGroup,
    clearAllRoles,
    modalFilteredActors,
    openCelebration,
    revealAllRoles,
    resetHiddenRoles,
    openCalendarEventDetails,
    saveCall,
    toggleArchiveCall,
    activeCalls,
    archivedCalls,
    availableCategories,
    filteredActorCards,
    allRevealed,
    groupedCalendarEvents,
  };

  return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Header ctx={ctx} />
        <NavBar ctx={ctx} />
        <CallBoardTab ctx={ctx} />
        <CastTab ctx={ctx} />
        <CostumesTab ctx={ctx} />
        <MusicTab ctx={ctx} />
        <VideosTab ctx={ctx} />
        <CalendarTab ctx={ctx} />
        <CalendarEventModal ctx={ctx} />
        <CelebrationModal ctx={ctx} />
        <LoginModal ctx={ctx} />
        <EditCallModal ctx={ctx} />
        <CalendarChoiceModal
          pending={pendingCalendarChoice}
          busy={calendarChoiceBusy}
          onAttach={(eventId) => resolveCalendarChoice('attach', eventId)}
          onCreate={() => resolveCalendarChoice('create')}
          onClose={() => setPendingCalendarChoice(null)}
        />
        <Footer ctx={ctx} />
      </div>
  );
}
