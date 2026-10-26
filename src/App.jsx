import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Lock, 
  Eye, 
  EyeOff, 
  Plus, 
  Search, 
  FileText, 
  X, 
  ShieldCheck, 
  ChevronRight,
  UserCheck,
  Building,
  RefreshCw,
  LogOut,
  Edit3,
  Archive,
  Check,
  Star,
  Printer,
  MapPin,
  Briefcase,
  Layers,
  Settings,
  User,
  Trash2,
  Filter,
  AlertTriangle,
  Info,
  Bell
} from 'lucide-react';

// Exact Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAvu_cavWQANh99-YdkE5jpFtGa3oD3qTw",
  authDomain: "shift-availability-8ba6e.firebaseapp.com",
  projectId: "shift-availability-8ba6e",
  storageBucket: "shift-availability-8ba6e.firebasestorage.app",
  messagingSenderId: "720024147410",
  appId: "1:720024147410:web:e2f936047da511e77f240b",
  measurementId: "G-6TN9QYYN83"
};

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase initialization warning:", e.message);
  app = null;
  auth = null;
  db = null;
}

const appId = 'shift-manager-app';

// Helper function to generate upcoming dates (next 7 days starting today)
const getUpcomingDates = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i <= 6; i++) {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + i);
    dates.push(nextDate.toISOString().split('T')[0]);
  }
  return dates;
};

const SAMPLE_DATES = getUpcomingDates();

// Helper to format name as First Name, Last Initial (e.g. "Alex Rivera" -> "Alex R.")
const formatShortName = (fullName) => {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('worker');
  const [workers, setWorkers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [availabilities, setAvailabilities] = useState({});

  // Organizational Management State (Locations, Departments, Positions with Colors)
  const [locations, setLocations] = useState([
    { name: 'Main Branch', color: '#4f46e5' },
    { name: 'Downtown Hub', color: '#0ea5e9' },
    { name: 'Uptown Express', color: '#10b981' }
  ]);
  const [departments, setDepartments] = useState([
    { name: 'Front of House', color: '#6366f1' },
    { name: 'Kitchen / Back of House', color: '#f59e0b' },
    { name: 'Management', color: '#8b5cf6' }
  ]);
  const [positions, setPositions] = useState([
    { id: 'p_1', name: 'Head Barista', departments: ['Front of House'], locations: [] },
    { id: 'p_2', name: 'Barista', departments: ['Front of House'], locations: [] },
    { id: 'p_3', name: 'Shift Supervisor', departments: ['Management'], locations: [] },
    { id: 'p_4', name: 'Line Cook', departments: ['Kitchen / Back of House'], locations: [] }
  ]);

  // Global Manager Notification Banner state
  const [activeNotification, setActiveNotification] = useState(null); // { type: 'alert'|'message', text: '' }
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [newNotifType, setNewNotifType] = useState('message');
  const [newNotifText, setNewNotifText] = useState('');

  // Editing state for Org Setup
  const [editingLocIndex, setEditingLocIndex] = useState(null);
  const [editLocName, setEditLocName] = useState('');
  const [editLocColor, setEditLocColor] = useState('#4f46e5');

  const [editingDeptIndex, setEditingDeptIndex] = useState(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptColor, setEditDeptColor] = useState('#6366f1');

  const [editingPosId, setEditingPosId] = useState(null);
  const [editPosName, setEditPosName] = useState('');
  const [editPosDepts, setEditPosDepts] = useState([]);
  const [editPosLocs, setEditPosLocs] = useState([]);

  // Worker authentication state
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [enteredWorkerPin, setEnteredWorkerPin] = useState('');
  const [isWorkerAuthenticated, setIsWorkerAuthenticated] = useState(false);
  const [workerPinError, setWorkerPinError] = useState(false);

  // Manager authentication state
  const [managerPin] = useState('9999');
  const [enteredManagerPin, setEnteredManagerPin] = useState('');
  const [isManagerAuthenticated, setIsManagerAuthenticated] = useState(false);
  const [managerPinError, setManagerPinError] = useState(false);

  // Modals and UI state
  const [showMyScheduleModal, setShowMyScheduleModal] = useState(false);
  const [showStaffManagementModal, setShowStaffManagementModal] = useState(false);
  const [showOrgStructureModal, setShowOrgStructureModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showMasterReportModal, setShowMasterReportModal] = useState(false);
  const [showArchivedShifts, setShowArchivedShifts] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [editingWorkerPinId, setEditingWorkerPinId] = useState(null);
  const [tempWorkerPin, setTempWorkerPin] = useState('');
  const [showPinsInDirectory, setShowPinsInDirectory] = useState(false);

  // Shift Detail Modal state for workers
  const [inspectingShift, setInspectingShift] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('ALL');
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);

  // Profile being edited
  const [editingProfile, setEditingProfile] = useState(null);

  // New location/department/position form inputs
  const [newLocName, setNewLocName] = useState('');
  const [newLocColor, setNewLocColor] = useState('#4f46e5');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptColor, setNewDeptColor] = useState('#6366f1');
  const [newPosName, setNewPosName] = useState('');
  const [newPosDepts, setNewPosDepts] = useState([]);
  const [newPosLocs, setNewPosLocs] = useState([]);

  const [newWorker, setNewWorker] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    pin: '',
    allowedLocations: [],
    allowedDepartments: [],
    allowedPositions: []
  });
  
  // Shift creation form state
  const [newShift, setNewShift] = useState({
    date: SAMPLE_DATES[0],
    timeSlot: 'Morning (08:00 AM - 04:00 PM)',
    location: 'Main Branch',
    department: 'Front of House',
    positionsList: [] 
  });

  const [editingShift, setEditingShift] = useState(null);

  // Master Report Filter States
  const [reportFilterLocation, setReportFilterLocation] = useState('ALL');
  const [reportFilterDepartment, setReportFilterDepartment] = useState('ALL');
  const [reportFilterPosition, setReportFilterPosition] = useState('ALL');
  const [reportFilterStartDate, setReportFilterStartDate] = useState(SAMPLE_DATES[0]);
  const [reportFilterEndDate, setReportFilterEndDate] = useState(SAMPLE_DATES[SAMPLE_DATES.length - 1]);

  const handlePrintSchedule = () => {
    window.print();
  };

  // Firebase Authentication setup
  useEffect(() => {
    if (!auth) {
      setUser({ uid: 'local-fallback-user' });
      return;
    }
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.warn("Auth fallback warning:", err);
        setUser({ uid: 'local-fallback-user' });
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr || { uid: 'local-fallback-user' });
    });
    return () => unsubscribe();
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const localWorkers = localStorage.getItem('shiftsync_workers');
      const localShifts = localStorage.getItem('shiftsync_shifts');
      const localAvail = localStorage.getItem('shiftsync_avail');
      const localLocs = localStorage.getItem('shiftsync_locs');
      const localDepts = localStorage.getItem('shiftsync_depts');
      const localPoss = localStorage.getItem('shiftsync_poss');
      const localNotif = localStorage.getItem('shiftsync_notif');

      if (localWorkers) setWorkers(JSON.parse(localWorkers));
      if (localShifts) setShifts(JSON.parse(localShifts));
      if (localAvail) setAvailabilities(JSON.parse(localAvail));
      if (localNotif) setActiveNotification(JSON.parse(localNotif));

      if (localLocs) {
        const parsedLocs = JSON.parse(localLocs).map(l => typeof l === 'string' ? { name: l, color: '#4f46e5' } : l);
        setLocations(parsedLocs);
      }
      if (localDepts) {
        const parsedDepts = JSON.parse(localDepts).map(d => typeof d === 'string' ? { name: d, color: '#6366f1' } : d);
        setDepartments(parsedDepts);
      }
      if (localPoss) {
        const parsedPoss = JSON.parse(localPoss).map(p => ({
          ...p,
          departments: p.departments || (p.department ? [p.department] : []),
          locations: p.locations || (p.location ? [p.location] : [])
        }));
        setPositions(parsedPoss);
      }
    } catch (e) {
      console.error("Local storage load error:", e);
    }
  }, []);

  // Sync state with Firestore collections if active
  useEffect(() => {
    if (!db) return;

    const workersCol = collection(db, 'artifacts', appId, 'public', 'data', 'workers');
    const shiftsCol = collection(db, 'artifacts', appId, 'public', 'data', 'shifts');
    const availCol = collection(db, 'artifacts', appId, 'public', 'data', 'availabilities');
    const orgCol = collection(db, 'artifacts', appId, 'public', 'data', 'org_structure');

    const unsubWorkers = onSnapshot(workersCol, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(w => !w._deleted);
      if (data.length > 0) {
        setWorkers(data);
        localStorage.setItem('shiftsync_workers', JSON.stringify(data));
      }
    }, (error) => console.warn("Workers fetch warning:", error));

    const unsubShifts = onSnapshot(shiftsCol, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(s => !s._deleted);
      if (data.length > 0) {
        setShifts(data);
        localStorage.setItem('shiftsync_shifts', JSON.stringify(data));
      }
    }, (error) => console.warn("Shifts fetch warning:", error));

    const unsubAvail = onSnapshot(availCol, (snapshot) => {
      const availObj = {};
      snapshot.docs.forEach(doc => {
        availObj[doc.id] = doc.data();
      });
      if (Object.keys(availObj).length > 0) {
        setAvailabilities(availObj);
        localStorage.setItem('shiftsync_avail', JSON.stringify(availObj));
      }
    }, (error) => console.warn("Avail fetch warning:", error));

    const unsubOrg = onSnapshot(orgCol, (snapshot) => {
      snapshot.docs.forEach(doc => {
        if (doc.id === 'locations' && doc.data().list) {
          const parsed = doc.data().list.map(l => typeof l === 'string' ? { name: l, color: '#4f46e5' } : l);
          setLocations(parsed);
          localStorage.setItem('shiftsync_locs', JSON.stringify(parsed));
        }
        if (doc.id === 'departments' && doc.data().list) {
          const parsed = doc.data().list.map(d => typeof d === 'string' ? { name: d, color: '#6366f1' } : d);
          setDepartments(parsed);
          localStorage.setItem('shiftsync_depts', JSON.stringify(parsed));
        }
        if (doc.id === 'positions' && doc.data().list) {
          const parsed = doc.data().list.map(p => ({
            ...p,
            departments: p.departments || (p.department ? [p.department] : []),
            locations: p.locations || (p.location ? [p.location] : [])
          }));
          setPositions(parsed);
          localStorage.setItem('shiftsync_poss', JSON.stringify(parsed));
        }
        if (doc.id === 'announcement') {
          setActiveNotification(doc.data().notification || null);
          localStorage.setItem('shiftsync_notif', JSON.stringify(doc.data().notification || null));
        }
      });
    }, (error) => console.warn("Org fetch warning:", error));

    return () => {
      unsubWorkers();
      unsubShifts();
      unsubAvail();
      unsubOrg();
    };
  }, [user]);

  const currentWorker = useMemo(() => {
    return workers.find(w => w.id === selectedWorkerId) || null;
  }, [workers, selectedWorkerId]);

  useEffect(() => {
    if (workers.length > 0 && (!selectedWorkerId || !workers.some(w => w.id === selectedWorkerId))) {
      setSelectedWorkerId(workers[0].id);
    }
  }, [workers, selectedWorkerId]);

  // Check if current worker has a shift scheduled today
  const todayDateString = SAMPLE_DATES[0]; // 'Today' date string YYYY-MM-DD
  const workerShiftToday = useMemo(() => {
    if (!currentWorker) return null;
    return shifts.find(s => {
      if (s.date !== todayDateString) return false;
      const assigned = s.assignedPositions || [];
      const match = assigned.find(ap => ap.workerId === currentWorker.id);
      return !!match;
    }) || null;
  }, [shifts, currentWorker, todayDateString]);

  const workerShiftTodayDetails = useMemo(() => {
    if (!workerShiftToday || !currentWorker) return null;
    const match = (workerShiftToday.assignedPositions || []).find(ap => ap.workerId === currentWorker.id);
    const posName = match ? (workerShiftToday.positionsList?.[match.slotIndex]?.positionName || 'Scheduled Role') : 'Scheduled Role';
    return {
      position: posName,
      location: workerShiftToday.location,
      time: workerShiftToday.timeSlot
    };
  }, [workerShiftToday, currentWorker]);

  const handleWorkerChange = (newWorkerId) => {
    setSelectedWorkerId(newWorkerId);
    setEnteredWorkerPin('');
    setIsWorkerAuthenticated(false);
    setWorkerPinError(false);
  };

  const handleVerifyWorkerPin = (e) => {
    e.preventDefault();
    if (!currentWorker) return;
    if (enteredWorkerPin.trim() === currentWorker.pin) {
      setIsWorkerAuthenticated(true);
      setWorkerPinError(false);
    } else {
      setWorkerPinError(true);
    }
  };

  const handleVerifyManagerPin = (e) => {
    e.preventDefault();
    if (enteredManagerPin.trim() === managerPin) {
      setIsManagerAuthenticated(true);
      setManagerPinError(false);
    } else {
      setManagerPinError(true);
    }
  };

  const persistWorkerUpdate = async (updatedList) => {
    setWorkers(updatedList);
    localStorage.setItem('shiftsync_workers', JSON.stringify(updatedList));
  };

  const persistShiftUpdate = async (updatedList) => {
    setShifts(updatedList);
    localStorage.setItem('shiftsync_shifts', JSON.stringify(updatedList));
  };

  // Helper to get location color
  const getLocationColor = (locName) => {
    const locObj = locations.find(l => l.name === locName);
    return locObj?.color || '#4f46e5';
  };

  // Helper to get department color
  const getDepartmentColor = (deptName) => {
    const deptObj = departments.find(d => d.name === deptName);
    return deptObj?.color || '#6366f1';
  };

  // Publish / Clear Notification Banner
  const handlePublishNotification = async (e) => {
    e.preventDefault();
    const notifObj = newNotifText.trim() ? { type: newNotifType, text: newNotifText.trim() } : null;
    setActiveNotification(notifObj);
    localStorage.setItem('shiftsync_notif', JSON.stringify(notifObj));
    setShowNotificationModal(false);
    setNewNotifText('');

    try {
      if (db) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'org_structure', 'announcement'), { notification: notifObj });
      }
    } catch (e) { console.warn(e); }
  };

  const handleClearNotification = async () => {
    setActiveNotification(null);
    localStorage.removeItem('shiftsync_notif');
    try {
      if (db) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'org_structure', 'announcement'), { notification: null });
      }
    } catch (e) { console.warn(e); }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editingProfile || !editingProfile.name.trim()) return;

    const updatedWorkers = workers.map(w => w.id === editingProfile.id ? editingProfile : w);
    await persistWorkerUpdate(updatedWorkers);
    setShowEditProfileModal(false);

    try {
      if (db) {
        const workerRef = doc(db, 'artifacts', appId, 'public', 'data', 'workers', editingProfile.id);
        await setDoc(workerRef, editingProfile, { merge: true });
      }
    } catch (err) {
      console.warn("Save profile cloud error:", err);
    }
  };

  // Org Structure Handlers
  const handleAddLocation = async () => {
    if (!newLocName.trim() || locations.some(l => l.name === newLocName.trim())) return;
    const updated = [...locations, { name: newLocName.trim(), color: newLocColor }];
    setLocations(updated);
    setNewLocName('');
    setNewLocColor('#4f46e5');
    localStorage.setItem('shiftsync_locs', JSON.stringify(updated));
    try {
      if (db) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'org_structure', 'locations'), { list: updated });
      }
    } catch (e) { console.warn(e); }
  };

  const handleSaveEditLocation = async (index) => {
    if (!editLocName.trim()) return;
    const updated = [...locations];
    updated[index] = { name: editLocName.trim(), color: editLocColor };
    setLocations(updated);
    setEditingLocIndex(null);
    setEditLocName('');
    localStorage.setItem('shiftsync_locs', JSON.stringify(updated));
    try {
      if (db) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'org_structure', 'locations'), { list: updated });
      }
    } catch (e) { console.warn(e); }
  };

  const handleDeleteLocation = async (index) => {
    const updated = locations.filter((_, i) => i !== index);
    setLocations(updated);
    localStorage.setItem('shiftsync_locs', JSON.stringify(updated));
    try {
      if (db) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'org_structure', 'locations'), { list: updated });
      }
    } catch (e) { console.warn(e); }
  };

  const handleAddDepartment = async () => {
    if (!newDeptName.trim() || departments.some(d => d.name === newDeptName.trim())) return;
    const updated = [...departments, { name: newDeptName.trim(), color: newDeptColor }];
    setDepartments(updated);
    setNewDeptName('');
    setNewDeptColor('#6366f1');
    localStorage.setItem('shiftsync_depts', JSON.stringify(updated));
    try {
      if (db) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'org_structure', 'departments'), { list: updated });
      }
    } catch (e) { console.warn(e); }
  };

  const handleSaveEditDepartment = async (index) => {
    if (!editDeptName.trim()) return;
    const updated = [...departments];
    updated[index] = { name: editDeptName.trim(), color: editDeptColor };
    setDepartments(updated);
    setEditingDeptIndex(null);
    setEditDeptName('');
    localStorage.setItem('shiftsync_depts', JSON.stringify(updated));
    try {
      if (db) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'org_structure', 'departments'), { list: updated });
      }
    } catch (e) { console.warn(e); }
  };

  const handleDeleteDepartment = async (index) => {
    const updated = departments.filter((_, i) => i !== index);
    setDepartments(updated);
    localStorage.setItem('shiftsync_depts', JSON.stringify(updated));
    try {
      if (db) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'org_structure', 'departments'), { list: updated });
      }
    } catch (e) { console.warn(e); }
  };

  const handleAddPosition = async () => {
    if (!newPosName.trim()) return;
    const newPos = {
      id: 'p_' + Date.now(),
      name: newPosName.trim(),
      departments: newPosDepts,
      locations: newPosLocs
    };
    const updated = [...positions, newPos];
    setPositions(updated);
    setNewPosName('');
    setNewPosDepts([]);
    setNewPosLocs([]);
    localStorage.setItem('shiftsync_poss', JSON.stringify(updated));
    try {
      if (db) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'org_structure', 'positions'), { list: updated });
      }
    } catch (e) { console.warn(e); }
  };

  const handleSaveEditPosition = async (posId) => {
    if (!editPosName.trim()) return;
    const updated = positions.map(p => p.id === posId ? {
      ...p,
      name: editPosName.trim(),
      departments: editPosDepts,
      locations: editPosLocs
    } : p);
    setPositions(updated);
    setEditingPosId(null);
    setEditPosName('');
    setEditPosDepts([]);
    setEditPosLocs([]);
    localStorage.setItem('shiftsync_poss', JSON.stringify(updated));
    try {
      if (db) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'org_structure', 'positions'), { list: updated });
      }
    } catch (e) { console.warn(e); }
  };

  const handleDeletePosition = async (posId) => {
    const updated = positions.filter(p => p.id !== posId);
    setPositions(updated);
    localStorage.setItem('shiftsync_poss', JSON.stringify(updated));
    try {
      if (db) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'org_structure', 'positions'), { list: updated });
      }
    } catch (e) { console.warn(e); }
  };

  const handleCreateWorker = async (e) => {
    e.preventDefault();
    if (!newWorker.name.trim()) return;
    const newId = 'w_' + Date.now();
    const assignedPin = newWorker.pin.trim() || Math.floor(1000 + Math.random() * 9000).toString();

    const createdWorker = {
      id: newId,
      name: newWorker.name.trim(),
      email: newWorker.email.trim() || 'N/A',
      phone: newWorker.phone.trim() || 'N/A',
      pin: assignedPin,
      allowedLocations: newWorker.allowedLocations || [],
      allowedDepartments: newWorker.allowedDepartments || [],
      allowedPositions: newWorker.allowedPositions || []
    };

    const updated = [...workers, createdWorker];
    await persistWorkerUpdate(updated);
    setSelectedWorkerId(newId);
    setIsWorkerAuthenticated(true);
    setShowAddWorkerModal(false);
    setNewWorker({ 
      name: '', 
      email: '', 
      phone: '', 
      pin: '',
      allowedLocations: [],
      allowedDepartments: [],
      allowedPositions: []
    });

    try {
      if (db) {
        const workerRef = doc(db, 'artifacts', appId, 'public', 'data', 'workers', newId);
        await setDoc(workerRef, createdWorker);
      }
    } catch (err) { console.warn(err); }
  };

  const handleDeleteWorker = async (workerId) => {
    const updatedWorkers = workers.filter(w => w.id !== workerId);
    await persistWorkerUpdate(updatedWorkers);

    const updatedShifts = shifts.map(s => ({
      ...s,
      assignedPositions: (s.assignedPositions || []).filter(ap => ap.workerId !== workerId),
      assignedWorkerIds: s.assignedWorkerIds?.filter(id => id !== workerId) || []
    }));
    await persistShiftUpdate(updatedShifts);

    if (selectedWorkerId === workerId) {
      setIsWorkerAuthenticated(false);
      setEnteredWorkerPin('');
    }

    try {
      if (db) {
        const workerRef = doc(db, 'artifacts', appId, 'public', 'data', 'workers', workerId);
        await setDoc(workerRef, { _deleted: true });
      }
    } catch (err) { console.warn(err); }
  };

  const handleUpdateWorkerPin = async (workerId, newPin) => {
    if (!newPin.trim()) return;
    const updated = workers.map(w => w.id === workerId ? { ...w, pin: newPin.trim() } : w);
    await persistWorkerUpdate(updated);
    setEditingWorkerPinId(null);

    try {
      if (db) {
        const workerRef = doc(db, 'artifacts', appId, 'public', 'data', 'workers', workerId);
        await setDoc(workerRef, { pin: newPin.trim() }, { merge: true });
      }
    } catch (err) { console.warn(err); }
  };

  const handleAvailabilityToggle = async (shiftId, status) => {
    if (!currentWorker) return;

    const updatedUserMap = {
      ...(availabilities[currentWorker.id] || {}),
      [shiftId]: status
    };

    const updatedAvail = {
      ...availabilities,
      [currentWorker.id]: updatedUserMap
    };

    setAvailabilities(updatedAvail);
    localStorage.setItem('shiftsync_avail', JSON.stringify(updatedAvail));

    setSubmissionSuccess(true);
    setTimeout(() => setSubmissionSuccess(false), 3000);

    try {
      if (db) {
        const availRef = doc(db, 'artifacts', appId, 'public', 'data', 'availabilities', currentWorker.id);
        await setDoc(availRef, updatedUserMap, { merge: true });
      }
    } catch (err) { console.warn(err); }
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    const newId = editingShift ? editingShift.id : 's_' + Date.now();
    
    const reqCount = newShift.positionsList.filter(p => p.required).length;
    const targCount = newShift.positionsList.length;

    const createdShift = {
      id: newId,
      date: newShift.date,
      timeSlot: newShift.timeSlot,
      location: newShift.location,
      department: newShift.department || departments[0]?.name || 'General',
      requiredCount: reqCount,
      idealCount: targCount,
      positionsList: newShift.positionsList,
      assignedPositions: editingShift ? (editingShift.assignedPositions || []) : []
    };

    let updatedShifts;
    if (editingShift) {
      updatedShifts = shifts.map(s => s.id === newId ? createdShift : s);
      setEditingShift(null);
    } else {
      updatedShifts = [...shifts, createdShift];
    }

    await persistShiftUpdate(updatedShifts);

    setShowAddShiftModal(false);
    setNewShift({
      date: SAMPLE_DATES[0],
      timeSlot: 'Morning (08:00 AM - 04:00 PM)',
      location: locations[0]?.name || 'Main Branch',
      department: departments[0]?.name || 'Front of House',
      positionsList: []
    });

    try {
      if (db) {
        const shiftRef = doc(db, 'artifacts', appId, 'public', 'data', 'shifts', newId);
        await setDoc(shiftRef, createdShift);
      }
    } catch (err) { console.warn(err); }
  };

  const handleAssignWorkerToPosition = async (shiftId, slotIndex, workerId) => {
    let updatedShift;
    const updatedShifts = shifts.map(s => {
      if (s.id === shiftId) {
        const currentAssigned = [...(s.assignedPositions || [])];
        const existingIdx = currentAssigned.findIndex(ap => ap.slotIndex === slotIndex);

        if (!workerId) {
          if (existingIdx !== -1) currentAssigned.splice(existingIdx, 1);
        } else {
          const otherIdx = currentAssigned.findIndex(ap => ap.workerId === workerId);
          if (otherIdx !== -1) currentAssigned.splice(otherIdx, 1);

          if (existingIdx !== -1) {
            currentAssigned[existingIdx] = { slotIndex, workerId };
          } else {
            currentAssigned.push({ slotIndex, workerId });
          }
        }

        const assignedWorkerIds = currentAssigned.map(ap => ap.workerId);
        updatedShift = { ...s, assignedPositions: currentAssigned, assignedWorkerIds };
        return updatedShift;
      }
      return s;
    });

    await persistShiftUpdate(updatedShifts);

    if (updatedShift) {
      try {
        if (db) {
          const shiftRef = doc(db, 'artifacts', appId, 'public', 'data', 'shifts', shiftId);
          await setDoc(shiftRef, updatedShift, { merge: true });
        }
      } catch (err) { console.warn(err); }
    }
  };

  const handleDeleteShift = async (shiftId) => {
    const updated = shifts.filter(s => s.id !== shiftId);
    await persistShiftUpdate(updated);

    try {
      if (db) {
        const shiftRef = doc(db, 'artifacts', appId, 'public', 'data', 'shifts', shiftId);
        await setDoc(shiftRef, { _deleted: true });
      }
    } catch (err) { console.warn(err); }
  };

  const handleSeedDemoData = async () => {
    const defaultWorkers = [
      { id: 'w_1', name: 'Alex Rivera', email: 'alex@example.com', phone: '(555) 012-3456', pin: '1234', allowedLocations: ['Downtown Hub'], allowedDepartments: [], allowedPositions: [] },
      { id: 'w_2', name: 'Jordan Lee', email: 'jordan@example.com', phone: '(555) 012-7890', pin: '2345', allowedLocations: [], allowedDepartments: ['Management'], allowedPositions: [] },
      { id: 'w_3', name: 'Sam Taylor', email: 'sam@example.com', phone: '(555) 019-8822', pin: '3456', allowedLocations: [], allowedDepartments: [], allowedPositions: [] }
    ];

    const defaultShifts = [
      { 
        id: 's_1', 
        date: SAMPLE_DATES[0], 
        timeSlot: 'Morning (07:00 AM - 03:00 PM)', 
        location: 'Downtown Hub', 
        department: 'Front of House',
        requiredCount: 2, 
        idealCount: 3, 
        positionsList: [
          { positionId: 'p_1', positionName: 'Head Barista', required: true },
          { positionId: 'p_2', positionName: 'Barista', required: true },
          { positionId: 'p_2', positionName: 'Barista', required: false }
        ],
        assignedPositions: [
          { slotIndex: 0, workerId: 'w_1' }
        ],
        assignedWorkerIds: ['w_1'] 
      }
    ];

    await persistWorkerUpdate(defaultWorkers);
    await persistShiftUpdate(defaultShifts);
    setSelectedWorkerId(defaultWorkers[0].id);
  };

  const searchedWorkers = useMemo(() => {
    if (!searchQuery.trim()) return workers;
    const q = searchQuery.toLowerCase();
    return workers.filter(w => 
      w.name.toLowerCase().includes(q) || 
      w.email.toLowerCase().includes(q)
    );
  }, [workers, searchQuery]);

  const filteredShifts = useMemo(() => {
    let list = shifts;

    if (activeTab === 'worker' && currentWorker) {
      const allowedLocs = currentWorker.allowedLocations || [];
      const allowedDepts = currentWorker.allowedDepartments || [];
      const allowedPoss = currentWorker.allowedPositions || [];

      if (allowedLocs.length > 0) {
        list = list.filter(s => allowedLocs.includes(s.location));
      }
      if (allowedDepts.length > 0) {
        list = list.filter(s => allowedDepts.includes(s.department));
      }
      if (allowedPoss.length > 0) {
        list = list.filter(s => (s.positionsList || []).some(p => allowedPoss.includes(p.positionName)));
      }
    }

    if (!showArchivedShifts) {
      list = list.filter(s => s.date >= SAMPLE_DATES[0]);
    }
    if (selectedDateFilter === 'ALL') return list;
    return list.filter(s => s.date === selectedDateFilter);
  }, [shifts, selectedDateFilter, showArchivedShifts, activeTab, currentWorker]);

  const filteredPositionsForShift = useMemo(() => {
    return positions.filter(p => {
      const posLocs = p.locations || [];
      const posDepts = p.departments || [];

      if (posLocs.length > 0 && newShift.location && !posLocs.includes(newShift.location)) return false;
      if (posDepts.length > 0 && newShift.department && !posDepts.includes(newShift.department)) return false;
      return true;
    });
  }, [positions, newShift.location, newShift.department]);

  const scheduleHealthSummary = useMemo(() => {
    let totalNeeded = 0;
    let totalTarget = 0;
    let totalAssigned = 0;
    let needsStaffCount = 0;
    let openSlotsCount = 0;
    let fullyStaffedCount = 0;

    shifts.forEach(s => {
      const assigned = s.assignedPositions ? s.assignedPositions.length : (s.assignedWorkerIds?.length || 0);
      const required = s.requiredCount || 1;
      const target = s.idealCount || required;

      totalNeeded += required;
      totalTarget += target;
      totalAssigned += assigned;

      if (assigned === 0) {
        needsStaffCount++;
      } else if (assigned < required) {
        openSlotsCount++;
      } else {
        fullyStaffedCount++;
      }
    });

    return {
      totalShifts: shifts.length,
      totalNeeded,
      totalTarget,
      totalAssigned,
      needsStaffCount,
      openSlotsCount,
      fullyStaffedCount,
      coveragePercent: totalNeeded === 0 ? 100 : Math.min(100, Math.round((totalAssigned / totalNeeded) * 100))
    };
  }, [shifts]);

  const togglePositionInShiftNew = (pos) => {
    setNewShift(prev => {
      const existing = [...prev.positionsList];
      existing.push({ positionId: pos.id, positionName: pos.name, required: true });
      return { ...prev, positionsList: existing };
    });
  };

  const removePositionFromShiftNew = (index) => {
    setNewShift(prev => {
      const existing = [...prev.positionsList];
      existing.splice(index, 1);
      return { ...prev, positionsList: existing };
    });
  };

  const toggleRequiredPositionNew = (index) => {
    setNewShift(prev => {
      const existing = [...prev.positionsList];
      existing[index] = { ...existing[index], required: !existing[index].required };
      return { ...prev, positionsList: existing };
    });
  };

  const locationNames = locations.map(l => l.name);
  const departmentNames = departments.map(d => d.name);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased pb-12 print:bg-white print:pb-0">
      {/* HEADER NAVBAR */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-30 print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-inner">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
                ShiftSync <span className="text-[10px] uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full font-bold">Pro</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">Smart Staff Scheduling & Position Availability</p>
            </div>
          </div>

          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setActiveTab('worker')}
              className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'worker' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Worker Portal</span>
            </button>
            <button
              onClick={() => setActiveTab('manager')}
              className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'manager' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Manager Dashboard</span>
            </button>
          </div>
        </div>
      </header>

      {/* UPCOMING SHIFT COVERAGE STATUS BAR */}
      <div className="max-w-6xl mx-auto px-4 pt-4 print:hidden">
        <div className="bg-[#111633] text-white rounded-2xl p-4 shadow-lg border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5 w-full md:w-auto">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-wide">Upcoming Shift Coverage Status</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {scheduleHealthSummary.totalShifts} Upcoming Shifts • Click any shift card to view position breakdowns!
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 w-full md:w-auto justify-end overflow-x-auto">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold whitespace-nowrap">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>{scheduleHealthSummary.needsStaffCount} Needs Staff</span>
            </div>

            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{scheduleHealthSummary.openSlotsCount} Open Slots</span>
            </div>

            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold whitespace-nowrap">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>{scheduleHealthSummary.fullyStaffedCount} Fully Staffed</span>
            </div>
          </div>
        </div>
      </div>

      {submissionSuccess && (
        <div className="bg-emerald-600 text-white text-center py-2 px-4 text-xs font-bold flex items-center justify-center space-x-2 animate-fade-in print:hidden">
          <Check className="w-4 h-4" />
          <span>Availability saved successfully! Your preferences have been registered.</span>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl mx-auto px-4 pt-6 print:p-0">

        {/* WORKER VIEW TAB */}
        {activeTab === 'worker' && (
          <div className="space-y-6 print:hidden">

            {/* MANAGER BROADCAST NOTIFICATION BANNER (IF ACTIVE) */}
            {activeNotification && (
              <div className={`p-4 rounded-2xl border shadow-sm flex items-start justify-between gap-3 ${
                activeNotification.type === 'alert'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-start space-x-3">
                  {activeNotification.type === 'alert' ? (
                    <div className="w-7 h-7 bg-rose-600 text-white rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-inner">
                      !
                    </div>
                  ) : (
                    <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-inner">
                      !
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider">
                      {activeNotification.type === 'alert' ? 'Manager Alert' : 'Manager Notice'}
                    </h4>
                    <p className="text-xs font-medium mt-0.5">{activeNotification.text}</p>
                  </div>
                </div>

                {isManagerAuthenticated && (
                  <button
                    onClick={handleClearNotification}
                    className="text-xs font-bold opacity-70 hover:opacity-100 underline shrink-0"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            )}

            {/* WORKER SHIFT TODAY ALERT BANNER */}
            {currentWorker && isWorkerAuthenticated && workerShiftTodayDetails && (
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-4 shadow-md flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-blue-200">Today's Active Assignment</h3>
                  <p className="text-xs font-bold mt-0.5">
                    You have a shift scheduled today! You are scheduled for <strong>{workerShiftTodayDetails.position}</strong> at <strong>{workerShiftTodayDetails.location}</strong> ({workerShiftTodayDetails.time}).
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider">Worker Portal</span>
                <h2 className="text-xl font-black text-slate-900 mt-0.5">Submit Availability</h2>
                <p className="text-xs text-slate-500 mt-1">Select your user profile, enter PIN, submit shift preferences, and manage your profile details.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative">
                  {workers.length > 0 ? (
                    <select
                      value={selectedWorkerId}
                      onChange={(e) => handleWorkerChange(e.target.value)}
                      className="w-full sm:w-64 bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 block p-3 pr-8 font-medium shadow-sm cursor-pointer"
                    >
                      {workers.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-xs text-slate-400 p-3 bg-slate-100 rounded-xl font-medium">
                      No staff registered yet
                    </div>
                  )}
                </div>

                {isWorkerAuthenticated && currentWorker && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProfile({ ...currentWorker });
                      setShowEditProfileModal(true);
                    }}
                    className="inline-flex items-center justify-center space-x-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3.5 py-3 rounded-xl transition border border-slate-300"
                  >
                    <Edit3 className="w-4 h-4 text-indigo-600" />
                    <span>Edit Profile</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={!currentWorker}
                  onClick={() => setShowMyScheduleModal(true)}
                  className="inline-flex items-center justify-center space-x-1.5 text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-4 py-3 rounded-xl transition border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="w-4 h-4" />
                  <span>My Schedule Report</span>
                </button>
              </div>
            </div>

            {currentWorker && ((currentWorker.allowedLocations || []).length > 0 || (currentWorker.allowedDepartments || []).length > 0 || (currentWorker.allowedPositions || []).length > 0) && (
              <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl p-3 text-xs flex items-center space-x-2 flex-wrap gap-1">
                <Filter className="w-4 h-4 text-indigo-600 shrink-0" />
                <span><strong>Filtered Shift View:</strong></span>
                {(currentWorker.allowedLocations || []).length > 0 && (
                  <span className="font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">Locations: {currentWorker.allowedLocations.join(', ')}</span>
                )}
                {(currentWorker.allowedDepartments || []).length > 0 && (
                  <span className="font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">Depts: {currentWorker.allowedDepartments.join(', ')}</span>
                )}
                {(currentWorker.allowedPositions || []).length > 0 && (
                  <span className="font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">Positions: {currentWorker.allowedPositions.join(', ')}</span>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedDateFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedDateFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                All Upcoming Shifts
              </button>
              {SAMPLE_DATES.map((date, idx) => (
                <button
                  key={date}
                  onClick={() => setSelectedDateFilter(date)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    selectedDateFilter === date
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {idx === 0 ? 'Today' : date}
                </button>
              ))}
            </div>

            {!currentWorker ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500 space-y-4">
                <Users className="w-10 h-10 mx-auto text-slate-300" />
                <h3 className="text-base font-bold text-slate-700">No Workers Available</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Switch to the Manager Dashboard to add team members, or click below to populate mock staff & shifts.
                </p>
                <button
                  onClick={handleSeedDemoData}
                  className="bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow inline-flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Load Sample Staff & Shifts</span>
                </button>
              </div>
            ) : !isWorkerAuthenticated ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm max-w-md mx-auto text-center space-y-4">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Worker Security Verification</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Please enter the 4-digit access PIN for <strong className="text-slate-800">{currentWorker?.name}</strong> to manage availability preferences.
                  </p>
                </div>

                <form onSubmit={handleVerifyWorkerPin} className="space-y-3 pt-2">
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="e.g. 1234"
                    value={enteredWorkerPin}
                    onChange={(e) => setEnteredWorkerPin(e.target.value)}
                    className="w-36 text-center text-xl tracking-widest font-bold bg-slate-50 border border-slate-300 rounded-xl py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />

                  {workerPinError && (
                    <p className="text-xs text-rose-600 font-semibold">Incorrect PIN. Contact your Manager if needed.</p>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl shadow transition"
                    >
                      Unlock Profile
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl">
                  <div className="flex items-center space-x-2 text-xs font-bold">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Unlocked as: <strong>{currentWorker.name}</strong></span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        setEditingProfile({ ...currentWorker });
                        setShowEditProfileModal(true);
                      }}
                      className="text-xs font-semibold text-indigo-700 hover:underline flex items-center space-x-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit My Info</span>
                    </button>
                    <button
                      onClick={() => setIsWorkerAuthenticated(false)}
                      className="text-xs font-semibold text-emerald-700 hover:underline flex items-center space-x-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Lock Profile</span>
                    </button>
                  </div>
                </div>

                {filteredShifts.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-slate-500">
                    <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-700">No active shifts scheduled</p>
                    <p className="text-xs text-slate-400 mt-1">There are currently no open shifts matching your location/department restrictions or date filter.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredShifts.map(shift => {
                      const workerStatus = availabilities[currentWorker.id]?.[shift.id] || null;
                      const assignedSlots = shift.assignedPositions || [];
                      const isAssigned = assignedSlots.some(ap => ap.workerId === currentWorker.id);
                      const assignedCount = assignedSlots.length;
                      const requiredCount = shift.requiredCount || 1;
                      const targetCount = shift.idealCount || requiredCount;

                      const locColor = getLocationColor(shift.location);

                      return (
                        <div 
                          key={shift.id} 
                          onClick={() => setInspectingShift(shift)}
                          className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all cursor-pointer hover:shadow-md overflow-hidden"
                        >
                          {/* TOP HALF COLOR CODED BY LOCATION */}
                          <div 
                            className="p-5 text-white space-y-3"
                            style={{ backgroundColor: locColor }}
                          >
                            <div className="flex items-start justify-between">
                              <span className="text-xs font-bold bg-white/20 text-white px-2.5 py-1 rounded-lg">
                                {shift.date}
                              </span>
                              {isAssigned && (
                                <span className="text-[11px] font-extrabold bg-white text-slate-900 px-2.5 py-1 rounded-full flex items-center space-x-1 shadow">
                                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                                  <span>Assigned</span>
                                </span>
                              )}
                            </div>

                            <div>
                              <h4 className="font-black text-white text-sm flex items-center space-x-1.5">
                                <Clock className="w-4 h-4 text-white/90" />
                                <span>{shift.timeSlot}</span>
                              </h4>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/90 font-medium">
                                <span className="flex items-center space-x-1">
                                  <Building className="w-3.5 h-3.5 text-white/80" />
                                  <span>{shift.location}</span>
                                </span>
                                {shift.department && (
                                  <span className="bg-black/20 text-white px-2 py-0.5 rounded font-bold text-[10px]">
                                    {shift.department}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* BOTTOM HALF STATUS & AVAILABILITY */}
                          <div className="p-5 space-y-3 bg-white">
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
                              <div className="flex justify-between items-center text-[11px]">
                                {assignedCount < requiredCount ? (
                                  <span className="font-extrabold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                                    Needs {requiredCount - assignedCount} Staff
                                  </span>
                                ) : assignedCount < targetCount ? (
                                  <span className="font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                    Min Met ({targetCount - assignedCount} Open)
                                  </span>
                                ) : (
                                  <span className="font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                    Fully Staffed
                                  </span>
                                )}
                                <span className="font-extrabold text-slate-700">
                                  {assignedCount} / {requiredCount} Min ({targetCount} Target)
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden flex">
                                <div 
                                  className={`h-full transition-all duration-300 ${
                                    assignedCount < requiredCount 
                                      ? 'bg-rose-500' 
                                      : assignedCount < targetCount 
                                        ? 'bg-amber-400' 
                                        : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, (assignedCount / Math.max(1, targetCount)) * 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            <p className="text-[11px] text-indigo-600 font-bold flex items-center justify-end space-x-1 pt-1">
                              <span>Click for Position Breakdown</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </p>

                            <div 
                              className="pt-3 border-t border-slate-100 space-y-2" 
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Set Availability</span>
                              <div className="grid grid-cols-3 gap-1.5">
                                <button
                                  onClick={() => handleAvailabilityToggle(shift.id, 'available')}
                                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 border transition ${
                                    workerStatus === 'available'
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Available</span>
                                </button>
                                <button
                                  onClick={() => handleAvailabilityToggle(shift.id, 'preferred')}
                                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 border transition ${
                                    workerStatus === 'preferred'
                                      ? 'bg-amber-500 text-white border-amber-500'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  <Star className="w-3 h-3 fill-current" />
                                  <span>Preferred</span>
                                </button>
                                <button
                                  onClick={() => handleAvailabilityToggle(shift.id, 'unavailable')}
                                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 border transition ${
                                    workerStatus === 'unavailable'
                                      ? 'bg-rose-600 text-white border-rose-600'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span>Unavailable</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MANAGER VIEW TAB */}
        {activeTab === 'manager' && (
          <div className="space-y-6 print:hidden">
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider">Manager Control Center</span>
                <h2 className="text-xl font-black text-slate-900 mt-0.5">Staff & Shift Management</h2>
                <p className="text-xs text-slate-500 mt-1">Manage staff, positions and shifts and scheduling.</p>
              </div>

              {isManagerAuthenticated && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowNotificationModal(true)}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3.5 py-2.5 rounded-xl transition flex items-center space-x-1.5 border border-indigo-200"
                  >
                    <Bell className="w-4 h-4 text-indigo-600" />
                    <span>Broadcast Notification</span>
                  </button>
                  <button
                    onClick={handleSeedDemoData}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2.5 rounded-xl transition flex items-center space-x-1"
                    title="Populate test shifts and workers"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Seed Sample Data</span>
                  </button>
                  <button
                    onClick={() => setShowMasterReportModal(true)}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-3.5 py-2.5 rounded-xl transition flex items-center space-x-1.5 border border-emerald-300"
                  >
                    <Printer className="w-4 h-4 text-emerald-600" />
                    <span>Master Printable Report</span>
                  </button>
                  <button
                    onClick={() => setShowOrgStructureModal(true)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2.5 rounded-xl transition flex items-center space-x-1.5 border border-slate-300"
                  >
                    <Settings className="w-4 h-4 text-indigo-600" />
                    <span>Setup Position and Shift Details</span>
                  </button>
                  <button
                    onClick={() => setShowStaffManagementModal(true)}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition flex items-center space-x-1.5"
                  >
                    <Users className="w-4 h-4" />
                    <span>Manage Staff ({workers.length})</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingShift(null);
                      setNewShift({
                        date: SAMPLE_DATES[0],
                        timeSlot: 'Morning (08:00 AM - 04:00 PM)',
                        location: locationNames[0] || 'Main Branch',
                        department: departmentNames[0] || 'Front of House',
                        positionsList: []
                      });
                      setShowAddShiftModal(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Shift</span>
                  </button>
                </div>
              )}
            </div>

            {!isManagerAuthenticated ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm max-w-md mx-auto text-center space-y-4">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Manager Security Gate</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter Manager PIN to access Manager Portal.
                  </p>
                </div>

                <form onSubmit={handleVerifyManagerPin} className="space-y-3 pt-2">
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="PIN"
                    value={enteredManagerPin}
                    onChange={(e) => setEnteredManagerPin(e.target.value)}
                    className="w-36 text-center text-xl tracking-widest font-bold bg-slate-50 border border-slate-300 rounded-xl py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />

                  {managerPinError && (
                    <p className="text-xs text-rose-600 font-semibold">Invalid Manager PIN.</p>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl shadow transition"
                    >
                      Authenticate Manager
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Active Shifts</span>
                    <p className="text-xl font-black text-slate-900 mt-1">{scheduleHealthSummary.totalShifts}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Required Staff</span>
                    <p className="text-xl font-black text-slate-900 mt-1">{scheduleHealthSummary.totalNeeded}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Target Staff</span>
                    <p className="text-xl font-black text-indigo-600 mt-1">{scheduleHealthSummary.totalTarget}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Positions Filled</span>
                    <p className="text-xl font-black text-emerald-600 mt-1">{scheduleHealthSummary.totalAssigned}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Shift Coverage</span>
                    <p className="text-xl font-black text-indigo-600 mt-1">{scheduleHealthSummary.coveragePercent}%</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
                  <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto scrollbar-none">
                    <button
                      onClick={() => setSelectedDateFilter('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        selectedDateFilter === 'ALL'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All Dates
                    </button>
                    {SAMPLE_DATES.map((date) => (
                      <button
                        key={date}
                        onClick={() => setSelectedDateFilter(date)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          selectedDateFilter === date
                            ? 'bg-indigo-600 text-white shadow'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {date}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowArchivedShifts(!showArchivedShifts)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center space-x-1 px-2 py-1"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>{showArchivedShifts ? 'Hide Archived Shifts' : 'Show All Shifts'}</span>
                  </button>
                </div>

                {filteredShifts.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500 space-y-3">
                    <Calendar className="w-10 h-10 mx-auto text-slate-300" />
                    <h3 className="text-base font-bold text-slate-700">No shifts scheduled</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Click "Add New Shift" or "Seed Sample Data" to configure shifts for position assignments.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredShifts.map(shift => {
                      const assignedPositions = shift.assignedPositions || [];
                      const assignedCount = assignedPositions.length;
                      const requiredCount = shift.requiredCount || 0;
                      const targetCount = shift.idealCount || requiredCount;
                      const locColor = getLocationColor(shift.location);

                      const isWorkerAssignedInShift = (wId) => assignedPositions.some(ap => ap.workerId === wId);

                      return (
                        <div key={shift.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
                          {/* TOP HALF COLOR CODED BY LOCATION */}
                          <div 
                            className="p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            style={{ backgroundColor: locColor }}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-xs font-black bg-white/20 text-white px-3 py-1 rounded-xl">
                                {shift.date}
                              </span>
                              <h3 className="font-bold text-white text-sm flex items-center space-x-1.5">
                                <Clock className="w-4 h-4 text-white/90" />
                                <span>{shift.timeSlot}</span>
                              </h3>
                              <span className="text-xs text-white/90">({shift.location} • {shift.department || 'General'})</span>
                            </div>

                            <div className="flex items-center space-x-3">
                              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white text-slate-900 shadow">
                                {assignedCount} / {requiredCount} Required ({targetCount} Target)
                              </span>
                              <button
                                onClick={() => {
                                  setEditingShift(shift);
                                  setNewShift({
                                    date: shift.date,
                                    timeSlot: shift.timeSlot,
                                    location: shift.location,
                                    department: shift.department || departmentNames[0],
                                    positionsList: shift.positionsList || []
                                  });
                                  setShowAddShiftModal(true);
                                }}
                                className="text-white/80 hover:text-white p-1 transition"
                                title="Edit Shift"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteShift(shift.id)}
                                className="text-white/80 hover:text-white p-1 transition"
                                title="Delete Shift"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          {/* BOTTOM HALF INTERACTIVE ASSIGNMENT GRID */}
                          <div className="p-5 pt-0 space-y-3">
                            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mt-2">
                              Position Slots & Interactive Staff Assignment
                            </span>

                            {(!shift.positionsList || shift.positionsList.length === 0) ? (
                              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                                No specific positions configured for this shift. Click the edit icon above to add required positions.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {shift.positionsList.map((posSlot, idx) => {
                                  const assignment = assignedPositions.find(ap => ap.slotIndex === idx);
                                  const assignedWorker = workers.find(w => w.id === assignment?.workerId);

                                  const preferredWorkers = [];
                                  const availableWorkers = [];
                                  const noResponseWorkers = [];
                                  const unavailableWorkers = [];

                                  workers.forEach(w => {
                                    const pref = availabilities[w.id]?.[shift.id];
                                    if (pref === 'preferred') preferredWorkers.push(w);
                                    else if (pref === 'available') availableWorkers.push(w);
                                    else if (pref === 'unavailable') unavailableWorkers.push(w);
                                    else noResponseWorkers.push(w);
                                  });

                                  return (
                                    <div 
                                      key={idx} 
                                      className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-3 ${
                                        assignedWorker
                                          ? 'bg-slate-50 border-slate-300'
                                          : posSlot.required
                                            ? 'bg-rose-50/40 border-rose-200'
                                            : 'bg-amber-50/40 border-amber-200'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-1.5">
                                          <Briefcase className="w-4 h-4 text-slate-600" />
                                          <span className="text-xs font-black text-slate-900">{posSlot.positionName}</span>
                                        </div>
                                        {posSlot.required ? (
                                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                                            Required
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                                            Optional
                                          </span>
                                        )}
                                      </div>

                                      {assignedWorker ? (
                                        <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-300 shadow-sm">
                                          <div className="flex items-center space-x-2">
                                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                                              ✓
                                            </div>
                                            <div>
                                              <span className="text-xs font-bold text-slate-900 block">{assignedWorker.name}</span>
                                              <span className="text-[10px] text-slate-400">Assigned</span>
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleAssignWorkerToPosition(shift.id, idx, '')}
                                            className="text-xs text-rose-600 font-bold hover:underline px-2 py-1 bg-rose-50 rounded-lg"
                                          >
                                            Unassign
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                                            Click available staff to assign:
                                          </span>

                                          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                                            {preferredWorkers.map(w => {
                                              const alreadyInShift = isWorkerAssignedInShift(w.id);
                                              return (
                                                <button
                                                  key={w.id}
                                                  type="button"
                                                  disabled={alreadyInShift}
                                                  onClick={() => handleAssignWorkerToPosition(shift.id, idx, w.id)}
                                                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center space-x-1 transition ${
                                                    alreadyInShift
                                                      ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-50 cursor-not-allowed'
                                                      : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 shadow-sm'
                                                  }`}
                                                  title={alreadyInShift ? 'Already assigned to another slot in this shift' : 'Click to assign (Preferred)'}
                                                >
                                                  <Star className="w-3 h-3 fill-current text-amber-500" />
                                                  <span>{formatShortName(w.name)}</span>
                                                </button>
                                              );
                                            })}

                                            {availableWorkers.map(w => {
                                              const alreadyInShift = isWorkerAssignedInShift(w.id);
                                              return (
                                                <button
                                                  key={w.id}
                                                  type="button"
                                                  disabled={alreadyInShift}
                                                  onClick={() => handleAssignWorkerToPosition(shift.id, idx, w.id)}
                                                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center space-x-1 transition ${
                                                    alreadyInShift
                                                      ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-50 cursor-not-allowed'
                                                      : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-sm'
                                                  }`}
                                                  title={alreadyInShift ? 'Already assigned' : 'Click to assign (Available)'}
                                                >
                                                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                                                  <span>{formatShortName(w.name)}</span>
                                                </button>
                                              );
                                            })}

                                            {noResponseWorkers.map(w => {
                                              const alreadyInShift = isWorkerAssignedInShift(w.id);
                                              return (
                                                <button
                                                  key={w.id}
                                                  type="button"
                                                  disabled={alreadyInShift}
                                                  onClick={() => handleAssignWorkerToPosition(shift.id, idx, w.id)}
                                                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center space-x-1 transition ${
                                                    alreadyInShift
                                                      ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-50 cursor-not-allowed'
                                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-sm'
                                                  }`}
                                                  title={alreadyInShift ? 'Already assigned' : 'Click to assign (No Response)'}
                                                >
                                                  <span>{formatShortName(w.name)}</span>
                                                </button>
                                              );
                                            })}

                                            {unavailableWorkers.map(w => {
                                              const alreadyInShift = isWorkerAssignedInShift(w.id);
                                              return (
                                                <button
                                                  key={w.id}
                                                  type="button"
                                                  disabled={alreadyInShift}
                                                  onClick={() => handleAssignWorkerToPosition(shift.id, idx, w.id)}
                                                  className="text-[10px] font-semibold px-2 py-1 rounded-lg border bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 opacity-75"
                                                  title="Marked Unavailable - Click to override & assign"
                                                >
                                                  ✕ {formatShortName(w.name)}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* BROADCAST NOTIFICATION MODAL */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                <span>Broadcast Portal Notification</span>
              </h3>
              <button onClick={() => setShowNotificationModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishNotification} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notification Type</label>
                <select
                  value={newNotifType}
                  onChange={(e) => setNewNotifType(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="message">Notice / Message (Amber Banner)</option>
                  <option value="alert">Alert / Urgent (Red Banner)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notification Message</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter announcement text to show workers..."
                  value={newNotifText}
                  onChange={(e) => setNewNotifText(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                ></textarea>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNotificationModal(false)}
                  className="bg-slate-100 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-700"
                >
                  Publish to Worker Portal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MASTER PRINTABLE REPORT MODAL */}
      {showMasterReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:static print:bg-white">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto print:shadow-none print:border-none print:max-w-none print:w-full print:max-h-none print:overflow-visible">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-600 rounded-xl text-white">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Master Printable Report</h3>
                  <p className="text-xs text-slate-500">Filter and generate customized master shift reports for printing or export.</p>
                </div>
              </div>
              <button onClick={() => setShowMasterReportModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 print:hidden">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={reportFilterStartDate}
                  onChange={(e) => setReportFilterStartDate(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={reportFilterEndDate}
                  onChange={(e) => setReportFilterEndDate(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Venue / Location</label>
                <select
                  value={reportFilterLocation}
                  onChange={(e) => setReportFilterLocation(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl"
                >
                  <option value="ALL">All Venues</option>
                  {locationNames.map((loc, i) => (
                    <option key={i} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Sport / Department</label>
                <select
                  value={reportFilterDepartment}
                  onChange={(e) => setReportFilterDepartment(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl"
                >
                  <option value="ALL">All Sports</option>
                  {departmentNames.map((dept, i) => (
                    <option key={i} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Position / Role</label>
                <select
                  value={reportFilterPosition}
                  onChange={(e) => setReportFilterPosition(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl"
                >
                  <option value="ALL">All Positions</option>
                  {positions.map((pos) => (
                    <option key={pos.id} value={pos.name}>{pos.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="hidden print:block text-center pb-4 border-b border-slate-300 space-y-1">
              <h1 className="text-xl font-black text-slate-900">ShiftSync Pro - Master Schedule Report</h1>
              <p className="text-xs text-slate-600">
                Period: {reportFilterStartDate} to {reportFilterEndDate} | 
                Venue: {reportFilterLocation} | Sport: {reportFilterDepartment} | Position: {reportFilterPosition}
              </p>
            </div>

            <div className="space-y-4">
              {shifts
                .filter(s => {
                  if (reportFilterStartDate && s.date < reportFilterStartDate) return false;
                  if (reportFilterEndDate && s.date > reportFilterEndDate) return false;
                  if (reportFilterLocation !== 'ALL' && s.location !== reportFilterLocation) return false;
                  if (reportFilterDepartment !== 'ALL' && s.department !== reportFilterDepartment) return false;
                  if (reportFilterPosition !== 'ALL') {
                    const hasPos = (s.positionsList || []).some(p => p.positionName === reportFilterPosition);
                    if (!hasPos) return false;
                  }
                  return true;
                })
                .sort((a, b) => a.date.localeCompare(b.date))
                .length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No shifts match the selected report filter criteria.
                  </div>
                ) : (
                  shifts
                    .filter(s => {
                      if (reportFilterStartDate && s.date < reportFilterStartDate) return false;
                      if (reportFilterEndDate && s.date > reportFilterEndDate) return false;
                      if (reportFilterLocation !== 'ALL' && s.location !== reportFilterLocation) return false;
                      if (reportFilterDepartment !== 'ALL' && s.department !== reportFilterDepartment) return false;
                      if (reportFilterPosition !== 'ALL') {
                        const hasPos = (s.positionsList || []).some(p => p.positionName === reportFilterPosition);
                        if (!hasPos) return false;
                      }
                      return true;
                    })
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map(shift => (
                      <div key={shift.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 print:border-slate-300 print:bg-white">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <div>
                            <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded mr-2">
                              {shift.date}
                            </span>
                            <span className="text-xs font-bold text-slate-900">{shift.timeSlot}</span>
                          </div>
                          <span className="text-xs text-slate-600 font-medium">
                            {shift.location} {shift.department ? `• ${shift.department}` : ''}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                          {(shift.positionsList || []).map((posSlot, idx) => {
                            if (reportFilterPosition !== 'ALL' && posSlot.positionName !== reportFilterPosition) return null;
                            const assignment = (shift.assignedPositions || []).find(ap => ap.slotIndex === idx);
                            const assignedWorker = workers.find(w => w.id === assignment?.workerId);

                            return (
                              <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-700">{posSlot.positionName}</span>
                                <span className={`font-semibold px-2 py-0.5 rounded ${
                                  assignedWorker ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'
                                }`}>
                                  {assignedWorker ? assignedWorker.name : 'Unassigned'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                )}
            </div>

            <div className="pt-4 flex justify-between items-center print:hidden border-t border-slate-100">
              <button
                type="button"
                onClick={handlePrintSchedule}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Master Report</span>
              </button>
              <button
                type="button"
                onClick={() => setShowMasterReportModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT SHIFT POPUP MODAL */}
      {inspectingShift && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                  {inspectingShift.date}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">{inspectingShift.timeSlot}</h3>
                <p className="text-xs text-slate-500">
                  {inspectingShift.location} {inspectingShift.department ? `• ${inspectingShift.department}` : ''}
                </p>
              </div>
              <button onClick={() => setInspectingShift(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Position Breakdowns & Staffing Status
              </h4>

              {(!inspectingShift.positionsList || inspectingShift.positionsList.length === 0) ? (
                <p className="text-xs text-slate-400 italic text-center py-6">No individual position breakdown configured for this shift.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {inspectingShift.positionsList.map((pos, idx) => {
                    const assigned = (inspectingShift.assignedPositions || []).find(ap => ap.slotIndex === idx);
                    const workerObj = workers.find(w => w.id === assigned?.workerId);

                    return (
                      <div key={idx} className="p-3 rounded-xl border flex items-center justify-between bg-slate-50 border-slate-200">
                        <div className="flex items-center space-x-2">
                          <Briefcase className="w-4 h-4 text-slate-500" />
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">{pos.positionName}</span>
                            <span className="text-[10px] text-slate-500">{pos.required ? 'Required Position' : 'Target / Optional'}</span>
                          </div>
                        </div>

                        <div>
                          {workerObj ? (
                            <span className="text-xs font-black text-slate-900 bg-white border border-slate-300 px-3 py-1 rounded-lg shadow-sm">
                              {formatShortName(workerObj.name)}
                            </span>
                          ) : pos.required ? (
                            <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg flex items-center space-x-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Required Open</span>
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                              Open Position
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingShift(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT WORKER PROFILE MODAL */}
      {showEditProfileModal && editingProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <User className="w-5 h-5 text-indigo-600" />
                <span>Edit Worker Profile</span>
              </h3>
              <button onClick={() => setShowEditProfileModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingProfile.name}
                  onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editingProfile.email}
                  onChange={(e) => setEditingProfile({ ...editingProfile, email: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editingProfile.phone}
                  onChange={(e) => setEditingProfile({ ...editingProfile, phone: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Security PIN</label>
                <input
                  type="text"
                  maxLength={4}
                  value={editingProfile.pin}
                  onChange={(e) => setEditingProfile({ ...editingProfile, pin: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {isManagerAuthenticated && (
                <div className="bg-indigo-50/80 p-3.5 rounded-xl border border-indigo-200 space-y-3 mt-2">
                  <div className="flex items-center space-x-1.5 text-indigo-900 font-extrabold text-xs">
                    <Filter className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Worker Shift Access Restrictions (Multi-Select)</span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold text-slate-700 mb-1">Venues Restricted to:</span>
                    <div className="grid grid-cols-2 gap-1.5 bg-white p-2 rounded-lg border border-slate-300 max-h-32 overflow-y-auto">
                      {locationNames.map((loc, i) => {
                        const currentAllowed = editingProfile.allowedLocations || [];
                        const isChecked = currentAllowed.includes(loc);
                        return (
                          <label key={i} className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const next = e.target.checked 
                                  ? [...currentAllowed, loc] 
                                  : currentAllowed.filter(l => l !== loc);
                                setEditingProfile({ ...editingProfile, allowedLocations: next });
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="truncate">{loc}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold text-slate-700 mb-1">Sports Restricted to:</span>
                    <div className="grid grid-cols-2 gap-1.5 bg-white p-2 rounded-lg border border-slate-300 max-h-32 overflow-y-auto">
                      {departmentNames.map((dept, i) => {
                        const currentAllowed = editingProfile.allowedDepartments || [];
                        const isChecked = currentAllowed.includes(dept);
                        return (
                          <label key={i} className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const next = e.target.checked 
                                  ? [...currentAllowed, dept] 
                                  : currentAllowed.filter(d => d !== dept);
                                setEditingProfile({ ...editingProfile, allowedDepartments: next });
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="truncate">{dept}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold text-slate-700 mb-1">Allowed Positions</span>
                    <div className="grid grid-cols-2 gap-1.5 bg-white p-2 rounded-lg border border-slate-300 max-h-32 overflow-y-auto">
                      {positions.map((pos) => {
                        const currentAllowed = editingProfile.allowedPositions || [];
                        const isChecked = currentAllowed.includes(pos.name);
                        return (
                          <label key={pos.id} className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const next = e.target.checked 
                                  ? [...currentAllowed, pos.name] 
                                  : currentAllowed.filter(p => p !== pos.name);
                                setEditingProfile({ ...editingProfile, allowedPositions: next });
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="truncate">{pos.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="bg-slate-100 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-700"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORGANIZATIONAL SETUP MODAL (WITH COLOR PICKERS) */}
      {showOrgStructureModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Building className="w-5 h-5 text-indigo-600" />
                <span>Manage Venues, Sports, Colors & Positions</span>
              </h3>
              <button onClick={() => setShowOrgStructureModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* LOCATIONS SECTION WITH COLOR PICKER */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-black text-slate-800 flex items-center space-x-1.5 uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>Venues & Color Coding</span>
              </h4>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="New venue name..."
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  className="text-xs p-2 bg-white border border-slate-300 rounded-lg flex-1"
                />
                <input
                  type="color"
                  value={newLocColor}
                  onChange={(e) => setNewLocColor(e.target.value)}
                  className="w-10 h-8 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                  title="Choose Venue Color"
                />
                <button
                  type="button"
                  onClick={handleAddLocation}
                  className="bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-lg"
                >
                  Add
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                {locations.map((loc, i) => (
                  <div key={i} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                    {editingLocIndex === i ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <input
                          type="text"
                          value={editLocName}
                          onChange={(e) => setEditLocName(e.target.value)}
                          className="text-xs p-1 bg-slate-50 border border-slate-300 rounded flex-1"
                        />
                        <input
                          type="color"
                          value={editLocColor}
                          onChange={(e) => setEditLocColor(e.target.value)}
                          className="w-8 h-6 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditLocation(i)}
                          className="text-xs bg-emerald-600 text-white px-2 py-1 rounded font-bold"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingLocIndex(null)}
                          className="text-xs text-slate-500 px-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2">
                          <span className="w-3.5 h-3.5 rounded-full inline-block shrink-0 shadow-sm" style={{ backgroundColor: loc.color }}></span>
                          <span className="text-xs font-bold text-slate-700">{loc.name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLocIndex(i);
                              setEditLocName(loc.name);
                              setEditLocColor(loc.color || '#4f46e5');
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLocation(i)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* DEPARTMENTS SECTION WITH COLOR PICKER */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-black text-slate-800 flex items-center space-x-1.5 uppercase tracking-wider">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Sports & Color Coding</span>
              </h4>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="New sport..."
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="text-xs p-2 bg-white border border-slate-300 rounded-lg flex-1"
                />
                <input
                  type="color"
                  value={newDeptColor}
                  onChange={(e) => setNewDeptColor(e.target.value)}
                  className="w-10 h-8 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                  title="Choose Sport Color"
                />
                <button
                  type="button"
                  onClick={handleAddDepartment}
                  className="bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-lg"
                >
                  Add
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                {departments.map((dept, i) => (
                  <div key={i} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                    {editingDeptIndex === i ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <input
                          type="text"
                          value={editDeptName}
                          onChange={(e) => setEditDeptName(e.target.value)}
                          className="text-xs p-1 bg-slate-50 border border-slate-300 rounded flex-1"
                        />
                        <input
                          type="color"
                          value={editDeptColor}
                          onChange={(e) => setEditDeptColor(e.target.value)}
                          className="w-8 h-6 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditDepartment(i)}
                          className="text-xs bg-emerald-600 text-white px-2 py-1 rounded font-bold"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDeptIndex(null)}
                          className="text-xs text-slate-500 px-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2">
                          <span className="w-3.5 h-3.5 rounded-full inline-block shrink-0 shadow-sm" style={{ backgroundColor: dept.color }}></span>
                          <span className="text-xs font-bold text-slate-700">{dept.name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDeptIndex(i);
                              setEditDeptName(dept.name);
                              setEditDeptColor(dept.color || '#6366f1');
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDepartment(i)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* POSITIONS SECTION */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-black text-slate-800 flex items-center space-x-1.5 uppercase tracking-wider">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                <span>Positions / Job Titles (Multi-Venue & Multi-Department)</span>
              </h4>
              
              <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-300">
                <input
                  type="text"
                  placeholder="Position title (e.g. Referee, Coach)..."
                  value={newPosName}
                  onChange={(e) => setNewPosName(e.target.value)}
                  className="text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg w-full font-bold"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="block text-[11px] font-bold text-slate-700 mb-1">Restrict to Sports</span>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-300 max-h-28 overflow-y-auto space-y-1">
                      {departmentNames.map((d, i) => (
                        <label key={i} className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newPosDepts.includes(d)}
                            onChange={(e) => {
                              const next = e.target.checked 
                                ? [...newPosDepts, d] 
                                : newPosDepts.filter(item => item !== d);
                              setNewPosDepts(next);
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{d}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold text-slate-700 mb-1">Restrict to Venues</span>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-300 max-h-28 overflow-y-auto space-y-1">
                      {locationNames.map((l, i) => (
                        <label key={i} className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newPosLocs.includes(l)}
                            onChange={(e) => {
                              const next = e.target.checked 
                                ? [...newPosLocs, l] 
                                : newPosLocs.filter(item => item !== l);
                              setNewPosLocs(next);
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{l}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddPosition}
                    className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-indigo-700"
                  >
                    + Add Position
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-2">
                {positions.map((pos) => (
                  <div key={pos.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                    {editingPosId === pos.id ? (
                      <div className="space-y-3 w-full">
                        <input
                          type="text"
                          value={editPosName}
                          onChange={(e) => setEditPosName(e.target.value)}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-bold"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 block mb-1">Departments</span>
                            <div className="bg-slate-50 p-2 rounded border border-slate-200 max-h-24 overflow-y-auto space-y-1">
                              {departmentNames.map((d, i) => (
                                <label key={i} className="flex items-center space-x-1 text-[11px] text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editPosDepts.includes(d)}
                                    onChange={(e) => {
                                      const next = e.target.checked 
                                        ? [...editPosDepts, d] 
                                        : editPosDepts.filter(item => item !== d);
                                      setEditPosDepts(next);
                                    }}
                                    className="rounded text-indigo-600"
                                  />
                                  <span>{d}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 block mb-1">Venues</span>
                            <div className="bg-slate-50 p-2 rounded border border-slate-200 max-h-24 overflow-y-auto space-y-1">
                              {locationNames.map((l, i) => (
                                <label key={i} className="flex items-center space-x-1 text-[11px] text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editPosLocs.includes(l)}
                                    onChange={(e) => {
                                      const next = e.target.checked 
                                        ? [...editPosLocs, l] 
                                        : editPosLocs.filter(item => item !== l);
                                      setEditPosLocs(next);
                                    }}
                                    className="rounded text-indigo-600"
                                  />
                                  <span>{l}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-1 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSaveEditPosition(pos.id)}
                            className="text-xs bg-emerald-600 text-white px-3 py-1 rounded font-bold"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPosId(null)}
                            className="text-xs text-slate-500 px-2 py-1"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">{pos.name}</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              Depts: {(pos.departments || []).length > 0 ? pos.departments.join(', ') : 'Any'}
                            </span>
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              Venues: {(pos.locations || []).length > 0 ? pos.locations.join(', ') : 'Any'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPosId(pos.id);
                              setEditPosName(pos.name);
                              setEditPosDepts(pos.departments || []);
                              setEditPosLocs(pos.locations || []);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePosition(pos.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowOrgStructureModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAFF MANAGEMENT MODAL */}
      {showStaffManagementModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Staff Roster & Access PINs</span>
              </h3>
              <button 
                onClick={() => setShowStaffManagementModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff by name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowPinsInDirectory(!showPinsInDirectory)}
                className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl flex items-center space-x-1"
              >
                {showPinsInDirectory ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPinsInDirectory ? 'Hide PINs' : 'Show PINs'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddWorkerModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Staff</span>
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {searchedWorkers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No staff members found. Click "Add Staff" above to create one.</p>
              ) : (
                searchedWorkers.map(w => (
                  <div key={w.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="pr-2">
                      <h4 className="font-bold text-slate-800 text-xs">{w.name}</h4>
                      <p className="text-[11px] text-slate-500">{w.email || 'No Email'} • {w.phone || 'No Phone'}</p>
                      {((w.allowedLocations || []).length > 0 || (w.allowedDepartments || []).length > 0 || (w.allowedPositions || []).length > 0) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(w.allowedLocations || []).length > 0 && <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">Locs: {w.allowedLocations.join(', ')}</span>}
                          {(w.allowedDepartments || []).length > 0 && <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">Depts: {w.allowedDepartments.join(', ')}</span>}
                          {(w.allowedPositions || []).length > 0 && <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">Pos: {w.allowedPositions.join(', ')}</span>}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProfile({ ...w });
                          setShowEditProfileModal(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Edit Full Profile"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {editingWorkerPinId === w.id ? (
                        <div className="flex items-center space-x-1">
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="New PIN"
                            value={tempWorkerPin}
                            onChange={(e) => setTempWorkerPin(e.target.value)}
                            className="w-16 text-center text-xs border border-slate-300 rounded p-1 font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateWorkerPin(w.id, tempWorkerPin)}
                            className="text-xs bg-emerald-600 text-white px-2 py-1 rounded font-bold"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-slate-200 font-bold">
                            {showPinsInDirectory ? w.pin : '••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingWorkerPinId(w.id);
                              setTempWorkerPin(w.pin);
                            }}
                            className="text-[11px] text-indigo-600 hover:underline font-semibold"
                          >
                            Edit PIN
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteWorker(w.id)}
                        title="Delete Worker"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowStaffManagementModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD WORKER MODAL */}
      {showAddWorkerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Add New Staff Member</h3>
              <button onClick={() => setShowAddWorkerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorker} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Doe"
                  value={newWorker.name}
                  onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. jane.doe@example.com"
                  value={newWorker.email}
                  onChange={(e) => setNewWorker({ ...newWorker, email: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. (555) 019-9999"
                  value={newWorker.phone}
                  onChange={(e) => setNewWorker({ ...newWorker, phone: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">4-Digit PIN (Optional)</label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="Auto-generated if left blank"
                  value={newWorker.pin}
                  onChange={(e) => setNewWorker({ ...newWorker, pin: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="bg-indigo-50/80 p-3.5 rounded-xl border border-indigo-200 space-y-3">
                <span className="text-xs font-bold text-indigo-900 block">Applicable Restrictions</span>
                
                <div>
                  <span className="block text-[11px] font-bold text-slate-700 mb-1">Venues Restricted to:</span>
                  <div className="bg-white p-2 rounded-lg border border-slate-300 max-h-28 overflow-y-auto space-y-1">
                    {locationNames.map((loc, i) => (
                      <label key={i} className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newWorker.allowedLocations.includes(loc)}
                          onChange={(e) => {
                            const next = e.target.checked 
                              ? [...newWorker.allowedLocations, loc] 
                              : newWorker.allowedLocations.filter(l => l !== loc);
                            setNewWorker({ ...newWorker, allowedLocations: next });
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{loc}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="block text-[11px] font-bold text-slate-700 mb-1">Sports Restricted to:</span>
                  <div className="bg-white p-2 rounded-lg border border-slate-300 max-h-28 overflow-y-auto space-y-1">
                    {departmentNames.map((dept, i) => (
                      <label key={i} className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newWorker.allowedDepartments.includes(dept)}
                          onChange={(e) => {
                            const next = e.target.checked 
                              ? [...newWorker.allowedDepartments, dept] 
                              : newWorker.allowedDepartments.filter(d => d !== dept);
                            setNewWorker({ ...newWorker, allowedDepartments: next });
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{dept}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="block text-[11px] font-bold text-slate-700 mb-1">Allowed Positions</span>
                  <div className="bg-white p-2 rounded-lg border border-slate-300 max-h-28 overflow-y-auto space-y-1">
                    {positions.map((pos) => (
                      <label key={pos.id} className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newWorker.allowedPositions.includes(pos.name)}
                          onChange={(e) => {
                            const next = e.target.checked 
                              ? [...newWorker.allowedPositions, pos.name] 
                              : newWorker.allowedPositions.filter(p => p !== pos.name);
                            setNewWorker({ ...newWorker, allowedPositions: next });
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{pos.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddWorkerModal(false)}
                  className="bg-slate-100 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-700"
                >
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT SHIFT MODAL */}
      {showAddShiftModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingShift ? 'Edit Shift Slot' : 'Create Shift Slot'}
              </h3>
              <button onClick={() => setShowAddShiftModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShift} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Shift Date</label>
                  <input
                    type="date"
                    required
                    value={newShift.date}
                    onChange={(e) => setNewShift({ ...newShift, date: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Time Slot</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Morning (08:00 AM - 04:00 PM)"
                    value={newShift.timeSlot}
                    onChange={(e) => setNewShift({ ...newShift, timeSlot: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
                  <select
                    value={newShift.location}
                    onChange={(e) => setNewShift({ ...newShift, location: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    {locationNames.map((loc, i) => (
                      <option key={i} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={newShift.department}
                    onChange={(e) => setNewShift({ ...newShift, department: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    {departmentNames.map((dept, i) => (
                      <option key={i} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800">Available Positions on Shift</label>
                    <p className="text-[11px] text-slate-500">Click to add positions. Check the box to make a position Required.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-indigo-600 block">
                      Required: {newShift.positionsList.filter(p => p.required).length} • Target: {newShift.positionsList.length}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <select
                    id="addPositionSelect"
                    className="text-xs p-2 bg-white border border-slate-300 rounded-lg flex-1"
                  >
                    {filteredPositionsForShift.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                    {filteredPositionsForShift.length === 0 && (
                      <option value="">No matching positions for this loc/dept</option>
                    )}
                  </select>
                  <button
                    type="button"
                    disabled={filteredPositionsForShift.length === 0}
                    onClick={() => {
                      const sel = document.getElementById('addPositionSelect');
                      const posObj = filteredPositionsForShift.find(p => p.id === sel.value) || filteredPositionsForShift[0];
                      if (posObj) togglePositionInShiftNew(posObj);
                    }}
                    className="bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50"
                  >
                    + Add Slot
                  </button>
                </div>

                <div className="space-y-1.5 pt-1">
                  {newShift.positionsList.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-2">No position slots added yet.</p>
                  ) : (
                    newShift.positionsList.map((pos, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                        <div className="flex items-center space-x-2">
                          <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pos.required}
                              onChange={() => toggleRequiredPositionNew(idx)}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-xs font-bold text-slate-800">{pos.positionName}</span>
                          </label>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            pos.required ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {pos.required ? 'Required' : 'Target / Optional'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePositionFromShiftNew(idx)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddShiftModal(false)}
                  className="bg-slate-100 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-700"
                >
                  {editingShift ? 'Save Changes' : 'Create Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WORKER SCHEDULE REPORT MODAL */}
      {showMyScheduleModal && currentWorker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:static print:bg-white">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 print:shadow-none print:border-none print:max-w-none print:w-full">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Personal Shift Schedule Report</h3>
                <p className="text-xs text-slate-500">Assigned shifts for <strong>{currentWorker.name}</strong></p>
              </div>
              <button onClick={() => setShowMyScheduleModal(false)} className="text-slate-400 hover:text-slate-600 print:hidden">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto print:max-h-none print:overflow-visible">
              {shifts.filter(s => (s.assignedPositions || []).some(ap => ap.workerId === currentWorker.id) || s.assignedWorkerIds?.includes(currentWorker.id)).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">You are not currently assigned to any scheduled shifts.</p>
              ) : (
                shifts
                  .filter(s => (s.assignedPositions || []).some(ap => ap.workerId === currentWorker.id) || s.assignedWorkerIds?.includes(currentWorker.id))
                  .map(s => {
                    const myAssignment = (s.assignedPositions || []).find(ap => ap.workerId === currentWorker.id);
                    return (
                      <div key={s.id} className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[11px] font-bold text-indigo-700">{s.date}</span>
                          <h4 className="font-bold text-slate-800 text-xs mt-0.5">{s.timeSlot}</h4>
                          <p className="text-[11px] text-slate-500">
                            {s.location} {s.department ? `• ${s.department}` : ''}
                            {myAssignment && ` • Position: ${s.positionsList?.[myAssignment.slotIndex]?.positionName || ''}`}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">
                          Confirmed
                        </span>
                      </div>
                    );
                  })
              )}
            </div>

            <div className="pt-2 flex justify-between items-center print:hidden border-t border-slate-100">
              <button
                type="button"
                onClick={handlePrintSchedule}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Schedule</span>
              </button>
              <button
                type="button"
                onClick={() => setShowMyScheduleModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
