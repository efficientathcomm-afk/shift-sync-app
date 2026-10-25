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
  BarChart3, 
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
  TrendingUp,
  MapPin,
  Briefcase,
  Layers,
  Settings,
  Info,
  User,
  Trash2,
  Filter
} from 'lucide-react';

// Firebase Configuration & Initialization
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyDummyKeyForShiftSyncDemoApp",
      authDomain: "shiftsync-app.firebaseapp.com",
      projectId: "shiftsync-app",
      storageBucket: "shiftsync-app.appspot.com",
      messagingSenderId: "1234567890",
      appId: "1:1234567890:web:abcdef123456"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'shift-manager-app';

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

  // Organizational Management State (Locations, Departments, Positions)
  const [locations, setLocations] = useState(['Main Branch', 'Downtown Hub', 'Uptown Express']);
  const [departments, setDepartments] = useState(['Front of House', 'Kitchen / Back of House', 'Management']);
  const [positions, setPositions] = useState([
    { id: 'p_1', name: 'Head Barista', department: 'Front of House', location: '' },
    { id: 'p_2', name: 'Barista', department: 'Front of House', location: '' },
    { id: 'p_3', name: 'Shift Supervisor', department: 'Management', location: '' },
    { id: 'p_4', name: 'Line Cook', department: 'Kitchen / Back of House', location: '' }
  ]);

  // Editing state for Org Setup
  const [editingLocIndex, setEditingLocIndex] = useState(null);
  const [editLocName, setEditLocName] = useState('');

  const [editingDeptIndex, setEditingDeptIndex] = useState(null);
  const [editDeptName, setEditDeptName] = useState('');

  const [editingPosId, setEditingPosId] = useState(null);
  const [editPosName, setEditPosName] = useState('');
  const [editPosDept, setEditPosDept] = useState('');
  const [editPosLoc, setEditPosLoc] = useState('');

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

  // Profile being edited (either by manager or self)
  const [editingProfile, setEditingProfile] = useState(null);

  // New location/department/position form inputs
  const [newLocName, setNewLocName] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newPosName, setNewPosName] = useState('');
  const [newPosDept, setNewPosDept] = useState('');
  const [newPosLoc, setNewPosLoc] = useState('');

  const [newWorker, setNewWorker] = useState({ 
    name: '', 
    role: 'Barista', 
    email: '', 
    phone: '', 
    pin: '',
    allowedLocation: '',
    allowedDepartment: '',
    allowedPosition: ''
  });
  
  // Shift creation form state
  const [newShift, setNewShift] = useState({
    date: SAMPLE_DATES[0],
    timeSlot: 'Morning (08:00 AM - 04:00 PM)',
    location: 'Main Branch',
    department: 'Front of House',
    positionsList: [] // array of { positionId, positionName, required: boolean }
  });

  const [editingShift, setEditingShift] = useState(null);

  // Print function for Worker Schedule Report
  const handlePrintSchedule = () => {
    window.print();
  };

  // Firebase Authentication setup
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Sync state with Firestore collections (Public data path adhering to rule 1)
  useEffect(() => {
    if (!user) return;

    const workersCol = collection(db, 'artifacts', appId, 'public', 'data', 'workers');
    const shiftsCol = collection(db, 'artifacts', appId, 'public', 'data', 'shifts');
    const availCol = collection(db, 'artifacts', appId, 'public', 'data', 'availabilities');
    const orgCol = collection(db, 'artifacts', appId, 'public', 'data', 'org_structure');

    const unsubWorkers = onSnapshot(workersCol, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(w => !w._deleted);
      if (data.length > 0) setWorkers(data);
    }, (error) => console.error("Workers fetch error:", error));

    const unsubShifts = onSnapshot(shiftsCol, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(s => !s._deleted);
      if (data.length > 0) setShifts(data);
    }, (error) => console.error("Shifts fetch error:", error));

    const unsubAvail = onSnapshot(availCol, (snapshot) => {
      const availObj = {};
      snapshot.docs.forEach(doc => {
        availObj[doc.id] = doc.data();
      });
      if (Object.keys(availObj).length > 0) setAvailabilities(availObj);
    }, (error) => console.error("Avail fetch error:", error));

    const unsubOrg = onSnapshot(orgCol, (snapshot) => {
      snapshot.docs.forEach(doc => {
        if (doc.id === 'locations' && doc.data().list) setLocations(doc.data().list);
        if (doc.id === 'departments' && doc.data().list) setDepartments(doc.data().list);
        if (doc.id === 'positions' && doc.data().list) setPositions(doc.data().list);
      });
    }, (error) => console.error("Org fetch error:", error));

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

  // Keep selected worker ID updated
  useEffect(() => {
    if (workers.length > 0 && (!selectedWorkerId || !workers.some(w => w.id === selectedWorkerId))) {
      setSelectedWorkerId(workers[0].id);
    }
  }, [workers, selectedWorkerId]);

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

  // Profile Save Handler (Worker Self or Manager Editing)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editingProfile || !editingProfile.name.trim() || !user) return;

    setWorkers(prev => prev.map(w => w.id === editingProfile.id ? editingProfile : w));
    setShowEditProfileModal(false);

    try {
      const workerRef = doc(db, 'artifacts', appId, 'public', 'data', 'workers', editingProfile.id);
      await setDoc(workerRef, editingProfile, { merge: true });
    } catch (err) {
      console.error("Error saving profile:", err);
    }
  };

  // Org Structure Handlers
  const handleAddLocation = async () => {
    if (!newLocName.trim() || locations.includes(newLocName.trim()) || !user) return;
    const updated = [...locations, newLocName.trim()];
    setLocations(updated);
    setNewLocName('');
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'org_structure', 'locations'), { list: updated });
    } catch (e) {
      console.error("Error adding location:", e);
    }
  };

  const handleSaveEditLocation = async (index) => {
    if (!editLocName.trim() || !user) return;
    const updated = [...locations];
    updated[index] = editLocName.trim();
    setLocations(updated);
    setEditingLocIndex(null);
    setEditLocName('');
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'org_structure', 'locations'), { list: updated });
    } catch (e) {
      console.error("Error editing location:", e);
    }
  };

  const handleDeleteLocation = async (index) => {
    if (!user) return;
    const updated = locations.filter((_, i) => i !== index);
    setLocations(updated);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'org_structure', 'locations'), { list: updated });
    } catch (e) {
      console.error("Error deleting location:", e);
    }
  };

  const handleAddDepartment = async () => {
    if (!newDeptName.trim() || departments.includes(newDeptName.trim()) || !user) return;
    const updated = [...departments, newDeptName.trim()];
    setDepartments(updated);
    setNewDeptName('');
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'org_structure', 'departments'), { list: updated });
    } catch (e) {
      console.error("Error adding department:", e);
    }
  };

  const handleSaveEditDepartment = async (index) => {
    if (!editDeptName.trim() || !user) return;
    const updated = [...departments];
    updated[index] = editDeptName.trim();
    setDepartments(updated);
    setEditingDeptIndex(null);
    setEditDeptName('');
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'org_structure', 'departments'), { list: updated });
    } catch (e) {
      console.error("Error editing department:", e);
    }
  };

  const handleDeleteDepartment = async (index) => {
    if (!user) return;
    const updated = departments.filter((_, i) => i !== index);
    setDepartments(updated);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'org_structure', 'departments'), { list: updated });
    } catch (e) {
      console.error("Error deleting department:", e);
    }
  };

  const handleAddPosition = async () => {
    if (!newPosName.trim() || !user) return;
    const newPos = {
      id: 'p_' + Date.now(),
      name: newPosName.trim(),
      department: newPosDept || '',
      location: newPosLoc || ''
    };
    const updated = [...positions, newPos];
    setPositions(updated);
    setNewPosName('');
    setNewPosDept('');
    setNewPosLoc('');
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'org_structure', 'positions'), { list: updated });
    } catch (e) {
      console.error("Error adding position:", e);
    }
  };

  const handleSaveEditPosition = async (posId) => {
    if (!editPosName.trim() || !user) return;
    const updated = positions.map(p => p.id === posId ? {
      ...p,
      name: editPosName.trim(),
      department: editPosDept,
      location: editPosLoc
    } : p);
    setPositions(updated);
    setEditingPosId(null);
    setEditPosName('');
    setEditPosDept('');
    setEditPosLoc('');
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'org_structure', 'positions'), { list: updated });
    } catch (e) {
      console.error("Error editing position:", e);
    }
  };

  const handleDeletePosition = async (posId) => {
    if (!user) return;
    const updated = positions.filter(p => p.id !== posId);
    setPositions(updated);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'org_structure', 'positions'), { list: updated });
    } catch (e) {
      console.error("Error deleting position:", e);
    }
  };

  const handleCreateWorker = async (e) => {
    e.preventDefault();
    if (!newWorker.name.trim() || !user) return;
    const newId = 'w_' + Date.now();
    const assignedPin = newWorker.pin.trim() || Math.floor(1000 + Math.random() * 9000).toString();

    const createdWorker = {
      id: newId,
      name: newWorker.name.trim(),
      role: newWorker.role.trim() || positions[0]?.name || 'Team Member',
      email: newWorker.email.trim() || 'N/A',
      phone: newWorker.phone.trim() || 'N/A',
      pin: assignedPin,
      allowedLocation: newWorker.allowedLocation || '',
      allowedDepartment: newWorker.allowedDepartment || '',
      allowedPosition: newWorker.allowedPosition || ''
    };

    setWorkers(prev => [...prev, createdWorker]);
    setSelectedWorkerId(newId);
    setIsWorkerAuthenticated(true);
    setShowAddWorkerModal(false);
    setNewWorker({ 
      name: '', 
      role: 'Barista', 
      email: '', 
      phone: '', 
      pin: '',
      allowedLocation: '',
      allowedDepartment: '',
      allowedPosition: ''
    });

    try {
      const workerRef = doc(db, 'artifacts', appId, 'public', 'data', 'workers', newId);
      await setDoc(workerRef, createdWorker);
    } catch (err) {
      console.error("Error creating worker:", err);
    }
  };

  const handleDeleteWorker = async (workerId) => {
    if (!user) return;
    setWorkers(prev => prev.filter(w => w.id !== workerId));

    setShifts(prev => prev.map(s => ({
      ...s,
      assignedPositions: (s.assignedPositions || []).filter(ap => ap.workerId !== workerId),
      assignedWorkerIds: s.assignedWorkerIds?.filter(id => id !== workerId) || []
    })));

    if (selectedWorkerId === workerId) {
      setIsWorkerAuthenticated(false);
      setEnteredWorkerPin('');
    }

    try {
      const workerRef = doc(db, 'artifacts', appId, 'public', 'data', 'workers', workerId);
      await setDoc(workerRef, { _deleted: true });
    } catch (err) {
      console.error("Error deleting worker:", err);
    }
  };

  const handleUpdateWorkerPin = async (workerId, newPin) => {
    if (!newPin.trim() || !user) return;
    setWorkers(prev => prev.map(w => w.id === workerId ? { ...w, pin: newPin.trim() } : w));
    setEditingWorkerPinId(null);

    try {
      const workerRef = doc(db, 'artifacts', appId, 'public', 'data', 'workers', workerId);
      await setDoc(workerRef, { pin: newPin.trim() }, { merge: true });
    } catch (err) {
      console.error("Error updating PIN:", err);
    }
  };

  const handleAvailabilityToggle = async (shiftId, status) => {
    if (!currentWorker || !user) return;

    const updatedUserMap = {
      ...(availabilities[currentWorker.id] || {}),
      [shiftId]: status
    };

    setAvailabilities(prev => ({
      ...prev,
      [currentWorker.id]: updatedUserMap
    }));

    setSubmissionSuccess(true);
    setTimeout(() => setSubmissionSuccess(false), 3000);

    try {
      const availRef = doc(db, 'artifacts', appId, 'public', 'data', 'availabilities', currentWorker.id);
      await setDoc(availRef, updatedUserMap, { merge: true });
    } catch (err) {
      console.error("Error saving availability:", err);
    }
  };

  // Create / Edit Shift submit
  const handleCreateShift = async (e) => {
    e.preventDefault();
    if (!user) return;
    const newId = editingShift ? editingShift.id : 's_' + Date.now();
    
    // Automatically calculate required and target staff counts from positions selection
    const reqCount = newShift.positionsList.filter(p => p.required).length;
    const targCount = newShift.positionsList.length;

    const createdShift = {
      id: newId,
      date: newShift.date,
      timeSlot: newShift.timeSlot,
      location: newShift.location,
      department: newShift.department || departments[0] || 'General',
      requiredCount: reqCount,
      idealCount: targCount,
      positionsList: newShift.positionsList,
      assignedPositions: editingShift ? (editingShift.assignedPositions || []) : []
    };

    if (editingShift) {
      setShifts(prev => prev.map(s => s.id === newId ? createdShift : s));
      setEditingShift(null);
    } else {
      setShifts(prev => [...prev, createdShift]);
    }

    setShowAddShiftModal(false);
    setNewShift({
      date: SAMPLE_DATES[0],
      timeSlot: 'Morning (08:00 AM - 04:00 PM)',
      location: locations[0] || 'Main Branch',
      department: departments[0] || 'Front of House',
      positionsList: []
    });

    try {
      const shiftRef = doc(db, 'artifacts', appId, 'public', 'data', 'shifts', newId);
      await setDoc(shiftRef, createdShift);
    } catch (err) {
      console.error("Error creating/editing shift:", err);
    }
  };

  // Manager assigns worker to specific position slot within a shift
  const handleAssignWorkerToPosition = async (shiftId, slotIndex, workerId) => {
    if (!user) return;
    let updatedShift;
    setShifts(prev => prev.map(s => {
      if (s.id === shiftId) {
        const currentAssigned = [...(s.assignedPositions || [])];
        const existingIdx = currentAssigned.findIndex(ap => ap.slotIndex === slotIndex);

        if (!workerId) {
          // Unassigning
          if (existingIdx !== -1) currentAssigned.splice(existingIdx, 1);
        } else {
          // If this worker is already assigned to another slot in this shift, clear that slot first
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
    }));

    if (updatedShift) {
      try {
        const shiftRef = doc(db, 'artifacts', appId, 'public', 'data', 'shifts', shiftId);
        await setDoc(shiftRef, updatedShift, { merge: true });
      } catch (err) {
        console.error("Error assigning worker:", err);
      }
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!user) return;
    setShifts(prev => prev.filter(s => s.id !== shiftId));
    try {
      const shiftRef = doc(db, 'artifacts', appId, 'public', 'data', 'shifts', shiftId);
      await setDoc(shiftRef, { _deleted: true });
    } catch (err) {
      console.error("Error deleting shift:", err);
    }
  };

  const handleSeedDemoData = async () => {
    if (!user) return;
    const defaultWorkers = [
      { id: 'w_1', name: 'Alex Rivera', role: 'Head Barista', email: 'alex@example.com', phone: '(555) 012-3456', pin: '1234', allowedLocation: 'Downtown Hub', allowedDepartment: '', allowedPosition: '' },
      { id: 'w_2', name: 'Jordan Lee', role: 'Shift Supervisor', email: 'jordan@example.com', phone: '(555) 012-7890', pin: '2345', allowedLocation: '', allowedDepartment: 'Management', allowedPosition: '' },
      { id: 'w_3', name: 'Sam Taylor', role: 'Barista', email: 'sam@example.com', phone: '(555) 019-8822', pin: '3456', allowedLocation: '', allowedDepartment: '', allowedPosition: '' }
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
      },
      { 
        id: 's_2', 
        date: SAMPLE_DATES[0], 
        timeSlot: 'Afternoon (03:00 PM - 11:00 PM)', 
        location: 'Downtown Hub', 
        department: 'Kitchen / Back of House',
        requiredCount: 2, 
        idealCount: 2, 
        positionsList: [
          { positionId: 'p_4', positionName: 'Line Cook', required: true },
          { positionId: 'p_4', positionName: 'Line Cook', required: true }
        ],
        assignedPositions: [],
        assignedWorkerIds: [] 
      }
    ];

    setWorkers(defaultWorkers);
    setShifts(defaultShifts);
    setSelectedWorkerId(defaultWorkers[0].id);

    try {
      for (const w of defaultWorkers) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workers', w.id), w);
      }
      for (const s of defaultShifts) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shifts', s.id), s);
      }
    } catch (e) {
      console.error("Error seeding demo data:", e);
    }
  };

  // Filter workers based on search modal input
  const searchedWorkers = useMemo(() => {
    if (!searchQuery.trim()) return workers;
    const q = searchQuery.toLowerCase();
    return workers.filter(w => 
      w.name.toLowerCase().includes(q) || 
      w.role.toLowerCase().includes(q) || 
      w.email.toLowerCase().includes(q)
    );
  }, [workers, searchQuery]);

  // Filter shifts based on date selection filter and worker restrictions (for worker view)
  const filteredShifts = useMemo(() => {
    let list = shifts;

    // Apply worker profile restrictions if in Worker view
    if (activeTab === 'worker' && currentWorker) {
      if (currentWorker.allowedLocation) {
        list = list.filter(s => s.location === currentWorker.allowedLocation);
      }
      if (currentWorker.allowedDepartment) {
        list = list.filter(s => s.department === currentWorker.allowedDepartment);
      }
      if (currentWorker.allowedPosition) {
        list = list.filter(s => (s.positionsList || []).some(p => p.positionName === currentWorker.allowedPosition));
      }
    }

    if (!showArchivedShifts) {
      list = list.filter(s => s.date >= SAMPLE_DATES[0]);
    }
    if (selectedDateFilter === 'ALL') return list;
    return list.filter(s => s.date === selectedDateFilter);
  }, [shifts, selectedDateFilter, showArchivedShifts, activeTab, currentWorker]);

  // Filter available positions when building/editing a shift based on selected Location & Department
  const filteredPositionsForShift = useMemo(() => {
    return positions.filter(p => {
      if (p.location && newShift.location && p.location !== newShift.location) return false;
      if (p.department && newShift.department && p.department !== newShift.department) return false;
      return true;
    });
  }, [positions, newShift.location, newShift.department]);

  // Manager schedule metrics
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

  // Helper to toggle position in shift creation
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

          {/* TAB SWITCHER BUTTONS */}
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

      {/* UPCOMING SHIFT COVERAGE STATUS BAR AT TOP */}
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

      {/* SUBMISSION NOTIFICATION BANNER */}
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
                          {w.name} ({w.role})
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

            {/* WORKER RESTRICTION BADGE IF SET */}
            {currentWorker && (currentWorker.allowedLocation || currentWorker.allowedDepartment || currentWorker.allowedPosition) && (
              <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl p-3 text-xs flex items-center space-x-2">
                <Filter className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>Filtered Shift View:</strong> Showing shifts restricted to 
                  {currentWorker.allowedLocation && <span className="ml-1 font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">Location: {currentWorker.allowedLocation}</span>}
                  {currentWorker.allowedDepartment && <span className="ml-1 font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">Dept: {currentWorker.allowedDepartment}</span>}
                  {currentWorker.allowedPosition && <span className="ml-1 font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">Pos: {currentWorker.allowedPosition}</span>}
                </span>
              </div>
            )}

            {/* DATE FILTER PILLS */}
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
                    <span>Unlocked as: <strong>{currentWorker.name}</strong> ({currentWorker.role})</span>
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
                      
                      // Check if worker is assigned in any position for this shift
                      const assignedSlots = shift.assignedPositions || [];
                      const isAssigned = assignedSlots.some(ap => ap.workerId === currentWorker.id);
                      
                      const assignedCount = assignedSlots.length;
                      const requiredCount = shift.requiredCount || 1;
                      const targetCount = shift.idealCount || requiredCount;

                      return (
                        <div 
                          key={shift.id} 
                          onClick={() => setInspectingShift(shift)}
                          className={`bg-white rounded-2xl p-5 border shadow-sm flex flex-col justify-between transition-all cursor-pointer hover:shadow-md ${
                            isAssigned 
                              ? 'border-indigo-400 ring-2 ring-indigo-200' 
                              : 'border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                                {shift.date}
                              </span>
                              {isAssigned && (
                                <span className="text-[11px] font-extrabold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full flex items-center space-x-1">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Assigned</span>
                                </span>
                              )}
                            </div>

                            <div>
                              <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                                <Clock className="w-4 h-4 text-indigo-600" />
                                <span>{shift.timeSlot}</span>
                              </h4>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <span className="flex items-center space-x-1">
                                  <Building className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{shift.location}</span>
                                </span>
                                {shift.department && (
                                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold text-[10px]">
                                    {shift.department}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* SUMMARY PROGRESS BAR */}
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
                          </div>

                          {/* WORKER AVAILABILITY SELECTOR */}
                          <div 
                            className="pt-3 border-t border-slate-100 mt-3 space-y-2" 
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
                    onClick={handleSeedDemoData}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2.5 rounded-xl transition flex items-center space-x-1"
                    title="Populate test shifts and workers"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Seed Sample Data</span>
                  </button>
                  <button
                    onClick={() => setShowOrgStructureModal(true)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2.5 rounded-xl transition flex items-center space-x-1.5 border border-slate-300"
                  >
                    <Settings className="w-4 h-4 text-indigo-600" />
                    <span>Org Setup (Depts & Positions)</span>
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
                        location: locations[0] || 'Main Branch',
                        department: departments[0] || 'Front of House',
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
                {/* MANAGER STATS SUMMARY */}
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

                {/* DATE FILTER & ARCHIVE TOGGLE BAR */}
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

                {/* SHIFTS LIST FOR MANAGERS WITH POSITION ASSIGNMENTS */}
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

                      return (
                        <div key={shift.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div className="flex items-center space-x-3">
                              <span className="text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-xl">
                                {shift.date}
                              </span>
                              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span>{shift.timeSlot}</span>
                              </h3>
                              <span className="text-xs text-slate-500">({shift.location} • {shift.department || 'General'})</span>
                            </div>

                            <div className="flex items-center space-x-3">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                                assignedCount >= targetCount
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : assignedCount >= requiredCount
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-rose-100 text-rose-800 border-rose-300'
                              }`}>
                                {assignedCount} / {requiredCount} Required ({targetCount} Target)
                              </span>
                              <button
                                onClick={() => {
                                  setEditingShift(shift);
                                  setNewShift({
                                    date: shift.date,
                                    timeSlot: shift.timeSlot,
                                    location: shift.location,
                                    department: shift.department || departments[0],
                                    positionsList: shift.positionsList || []
                                  });
                                  setShowAddShiftModal(true);
                                }}
                                className="text-slate-400 hover:text-indigo-600 p-1 transition"
                                title="Edit Shift"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteShift(shift.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 transition"
                                title="Delete Shift"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          {/* POSITION-BASED ASSIGNMENT GRID FOR MANAGERS */}
                          <div>
                            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                              Position Slots & Worker Scheduling
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

                                  return (
                                    <div 
                                      key={idx} 
                                      className={`p-3 rounded-xl border flex flex-col justify-between space-y-2 ${
                                        assignedWorker
                                          ? 'bg-slate-50 border-slate-300'
                                          : posSlot.required
                                            ? 'bg-rose-50/60 border-rose-200'
                                            : 'bg-amber-50/60 border-amber-200'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-1.5">
                                          <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                                          <span className="text-xs font-bold text-slate-800">{posSlot.positionName}</span>
                                        </div>
                                        {posSlot.required ? (
                                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                                            Required Slot
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                                            Optional Slot
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <select
                                          value={assignment?.workerId || ''}
                                          onChange={(e) => handleAssignWorkerToPosition(shift.id, idx, e.target.value)}
                                          className="text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium w-full focus:ring-2 focus:ring-indigo-500"
                                        >
                                          <option value="">-- Unassigned (Open) --</option>
                                          {workers.map(w => {
                                            const pref = availabilities[w.id]?.[shift.id];
                                            let badge = '';
                                            if (pref === 'preferred') badge = ' ⭐ (Preferred)';
                                            if (pref === 'available') badge = ' ✓ (Available)';
                                            if (pref === 'unavailable') badge = ' ✕ (Unavailable)';
                                            return (
                                              <option key={w.id} value={w.id}>
                                                {w.name} ({w.role}){badge}
                                              </option>
                                            );
                                          })}
                                        </select>
                                      </div>
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

      {/* INSPECT SHIFT POPUP MODAL (WORKER & MANAGER DETAIL VIEW) */}
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

      {/* EDIT WORKER PROFILE MODAL (FOR BOTH MANAGERS & INDIVIDUAL WORKERS) */}
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Role / Primary Position</label>
                <select
                  value={editingProfile.role}
                  onChange={(e) => setEditingProfile({ ...editingProfile, role: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                >
                  {positions.map(p => (
                    <option key={p.id} value={p.name}>{p.name} {p.department ? `(${p.department})` : ''}</option>
                  ))}
                  {!positions.some(p => p.name === editingProfile.role) && (
                    <option value={editingProfile.role}>{editingProfile.role}</option>
                  )}
                </select>
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

              {/* MANAGER SHIFT VISIBILITY RESTRICTIONS */}
              {isManagerAuthenticated && (
                <div className="bg-indigo-50/80 p-3.5 rounded-xl border border-indigo-200 space-y-2.5 mt-2">
                  <div className="flex items-center space-x-1.5 text-indigo-900 font-extrabold text-xs">
                    <Filter className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Worker Shift Access Restrictions</span>
                  </div>
                  <p className="text-[11px] text-indigo-700">
                    Restrict which shifts this worker can view and sign up for. Leave blank for unrestricted access.
                  </p>

                  <div className="space-y-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Restricted Location</label>
                      <select
                        value={editingProfile.allowedLocation || ''}
                        onChange={(e) => setEditingProfile({ ...editingProfile, allowedLocation: e.target.value })}
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                      >
                        <option value="">-- Any Location (No Restriction) --</option>
                        {locations.map((loc, i) => (
                          <option key={i} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Restricted Department</label>
                      <select
                        value={editingProfile.allowedDepartment || ''}
                        onChange={(e) => setEditingProfile({ ...editingProfile, allowedDepartment: e.target.value })}
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                      >
                        <option value="">-- Any Department (No Restriction) --</option>
                        {departments.map((dept, i) => (
                          <option key={i} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Restricted Position</label>
                      <select
                        value={editingProfile.allowedPosition || ''}
                        onChange={(e) => setEditingProfile({ ...editingProfile, allowedPosition: e.target.value })}
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                      >
                        <option value="">-- Any Position (No Restriction) --</option>
                        {positions.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
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

      {/* ORGANIZATIONAL SETUP MODAL (LOCATIONS, DEPARTMENTS, POSITIONS) */}
      {showOrgStructureModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Building className="w-5 h-5 text-indigo-600" />
                <span>Manage Locations, Departments & Positions</span>
              </h3>
              <button onClick={() => setShowOrgStructureModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* LOCATIONS SECTION */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-black text-slate-800 flex items-center space-x-1.5 uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>Locations</span>
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New location name..."
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  className="text-xs p-2 bg-white border border-slate-300 rounded-lg flex-1"
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
                        <span className="text-xs font-bold text-slate-700">{loc}</span>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLocIndex(i);
                              setEditLocName(loc);
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

            {/* DEPARTMENTS SECTION */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-black text-slate-800 flex items-center space-x-1.5 uppercase tracking-wider">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Departments</span>
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New department name..."
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="text-xs p-2 bg-white border border-slate-300 rounded-lg flex-1"
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
                        <span className="text-xs font-bold text-slate-700">{dept}</span>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDeptIndex(i);
                              setEditDeptName(dept);
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
                <span>Positions / Job Titles</span>
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="Position title..."
                  value={newPosName}
                  onChange={(e) => setNewPosName(e.target.value)}
                  className="text-xs p-2 bg-white border border-slate-300 rounded-lg sm:col-span-1"
                />
                <select
                  value={newPosDept}
                  onChange={(e) => setNewPosDept(e.target.value)}
                  className="text-xs p-2 bg-white border border-slate-300 rounded-lg sm:col-span-1"
                >
                  <option value="">No Dept Restriction</option>
                  {departments.map((d, i) => (
                    <option key={i} value={d}>{d}</option>
                  ))}
                </select>
                <select
                  value={newPosLoc}
                  onChange={(e) => setNewPosLoc(e.target.value)}
                  className="text-xs p-2 bg-white border border-slate-300 rounded-lg sm:col-span-1"
                >
                  <option value="">No Loc Restriction</option>
                  {locations.map((l, i) => (
                    <option key={i} value={l}>{l}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddPosition}
                  className="bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-lg sm:col-span-1"
                >
                  Add Position
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {positions.map((pos) => (
                  <div key={pos.id} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                    {editingPosId === pos.id ? (
                      <div className="space-y-2 w-full">
                        <input
                          type="text"
                          value={editPosName}
                          onChange={(e) => setEditPosName(e.target.value)}
                          className="w-full text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-bold"
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <select
                            value={editPosDept}
                            onChange={(e) => setEditPosDept(e.target.value)}
                            className="text-[11px] p-1 bg-slate-50 border border-slate-300 rounded"
                          >
                            <option value="">No Dept Restriction</option>
                            {departments.map((d, i) => (
                              <option key={i} value={d}>{d}</option>
                            ))}
                          </select>
                          <select
                            value={editPosLoc}
                            onChange={(e) => setEditPosLoc(e.target.value)}
                            className="text-[11px] p-1 bg-slate-50 border border-slate-300 rounded"
                          >
                            <option value="">No Loc Restriction</option>
                            {locations.map((l, i) => (
                              <option key={i} value={l}>{l}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex justify-end space-x-1 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSaveEditPosition(pos.id)}
                            className="text-xs bg-emerald-600 text-white px-2.5 py-1 rounded font-bold"
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
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              Dept: {pos.department || 'Any'}
                            </span>
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              Loc: {pos.location || 'Any'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPosId(pos.id);
                              setEditPosName(pos.name);
                              setEditPosDept(pos.department || '');
                              setEditPosLoc(pos.location || '');
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePosition(pos.id)}
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
                  placeholder="Search staff by name, role, email..."
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
                      <p className="text-[11px] text-slate-500">{w.role} • {w.email || 'No Email'} • {w.phone || 'No Phone'}</p>
                      {(w.allowedLocation || w.allowedDepartment || w.allowedPosition) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {w.allowedLocation && <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">Loc: {w.allowedLocation}</span>}
                          {w.allowedDepartment && <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">Dept: {w.allowedDepartment}</span>}
                          {w.allowedPosition && <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">Pos: {w.allowedPosition}</span>}
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Primary Position / Role</label>
                <select
                  value={newWorker.role}
                  onChange={(e) => setNewWorker({ ...newWorker, role: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  {positions.map(p => (
                    <option key={p.id} value={p.name}>{p.name} {p.department ? `(${p.department})` : ''}</option>
                  ))}
                </select>
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

              {/* SHIFT ACCESS RESTRICTION CONFIGURATION */}
              <div className="bg-indigo-50/80 p-3 rounded-xl border border-indigo-200 space-y-2">
                <span className="text-xs font-bold text-indigo-900 block">Shift Access Restrictions (Optional)</span>
                <div className="space-y-1.5">
                  <select
                    value={newWorker.allowedLocation}
                    onChange={(e) => setNewWorker({ ...newWorker, allowedLocation: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="">No Location Restriction</option>
                    {locations.map((loc, i) => (
                      <option key={i} value={loc}>{loc}</option>
                    ))}
                  </select>

                  <select
                    value={newWorker.allowedDepartment}
                    onChange={(e) => setNewWorker({ ...newWorker, allowedDepartment: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="">No Department Restriction</option>
                    {departments.map((dept, i) => (
                      <option key={i} value={dept}>{dept}</option>
                    ))}
                  </select>

                  <select
                    value={newWorker.allowedPosition}
                    onChange={(e) => setNewWorker({ ...newWorker, allowedPosition: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="">No Position Restriction</option>
                    {positions.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
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

      {/* ADD / EDIT SHIFT MODAL WITH POSITION BREAKDOWN */}
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
                    {locations.map((loc, i) => (
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
                    {departments.map((dept, i) => (
                      <option key={i} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* POSITIONS CONFIGURATION AREA */}
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

                {/* SELECT POSITION TO ADD */}
                <div className="flex gap-2">
                  <select
                    id="addPositionSelect"
                    className="text-xs p-2 bg-white border border-slate-300 rounded-lg flex-1"
                  >
                    {filteredPositionsForShift.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.department ? `(${p.department})` : ''} {p.location ? `[${p.location}]` : ''}
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

                {/* ADDED POSITIONS LIST */}
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

      {/* WORKER SCHEDULE REPORT MODAL WITH PRINT OPTION */}
      {showMyScheduleModal && currentWorker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:static print:bg-white">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 print:shadow-none print:border-none print:max-w-none print:w-full">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Personal Shift Schedule Report</h3>
                <p className="text-xs text-slate-500">Assigned shifts for <strong>{currentWorker.name}</strong> ({currentWorker.role})</p>
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
                            {myAssignment && ` • Position: ${s.positionsList?.[myAssignment.slotIndex]?.positionName || currentWorker.role}`}
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
