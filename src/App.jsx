import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';
import { 
  User, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Star, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Plus, 
  Search, 
  Printer, 
  RefreshCw, 
  Check, 
  AlertCircle,
  Briefcase,
  ChevronRight,
  Sparkles,
  Info,
  Lock,
  Unlock,
  FileText,
  Archive,
  X,
  Key,
  Edit3,
  Eye,
  EyeOff
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'shift-manager-app';

const DEFAULT_WORKERS = [
  { id: 'w1', name: 'Alex Rivera', role: 'Full-Time Barista', phone: '(555) 019-2831', pin: '1234' },
  { id: 'w2', name: 'Sarah Chen', role: 'Shift Lead', phone: '(555) 014-4920', pin: '2345' },
  { id: 'w3', name: 'Marcus Johnson', role: 'Part-Time Associate', phone: '(555) 017-8833', pin: '3456' },
  { id: 'w4', name: 'Emily Taylor', role: 'Barista', phone: '(555) 012-3901', pin: '4567' },
  { id: 'w5', name: 'David Kim', role: 'Kitchen Support', phone: '(555) 018-7711', pin: '5678' },
  { id: 'w6', name: 'Jessica Gomez', role: 'Shift Lead', phone: '(555) 015-6622', pin: '6789' }
];

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

const DEFAULT_SHIFTS = [
  { id: 's1', date: SAMPLE_DATES[0], timeSlot: 'Morning (07:00 AM - 03:00 PM)', location: 'Main Branch - Front Desk', requiredCount: 2, idealCount: 3, assignedWorkerIds: ['w2'] },
  { id: 's2', date: SAMPLE_DATES[0], timeSlot: 'Evening (03:00 PM - 11:00 PM)', location: 'Main Branch - Counter', requiredCount: 2, idealCount: 3, assignedWorkerIds: [] },
  { id: 's3', date: SAMPLE_DATES[1], timeSlot: 'Morning (07:00 AM - 03:00 PM)', location: 'Main Branch - Front Desk', requiredCount: 3, idealCount: 4, assignedWorkerIds: ['w1'] },
  { id: 's4', date: SAMPLE_DATES[1], timeSlot: 'Evening (03:00 PM - 11:00 PM)', location: 'Downtown Express - Bar', requiredCount: 2, idealCount: 2, assignedWorkerIds: [] },
  { id: 's5', date: SAMPLE_DATES[2], timeSlot: 'Morning (07:00 AM - 03:00 PM)', location: 'Downtown Express - Bar', requiredCount: 2, idealCount: 3, assignedWorkerIds: [] },
  { id: 's6', date: SAMPLE_DATES[2], timeSlot: 'Weekend Mid-Day (10:00 AM - 06:00 PM)', location: 'Main Branch - Event Lounge', requiredCount: 3, idealCount: 5, assignedWorkerIds: [] },
  { id: 's7', date: SAMPLE_DATES[3], timeSlot: 'Morning (07:00 AM - 03:00 PM)', location: 'Main Branch - Front Desk', requiredCount: 2, idealCount: 3, assignedWorkerIds: [] },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('worker');
  const [workers, setWorkers] = useState(DEFAULT_WORKERS);
  const [shifts, setShifts] = useState(DEFAULT_SHIFTS);
  const [availabilities, setAvailabilities] = useState({});

  // Worker authentication state
  const [selectedWorkerId, setSelectedWorkerId] = useState('w1');
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
  const [showArchivedShifts, setShowArchivedShifts] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [editingWorkerPinId, setEditingWorkerPinId] = useState(null);
  const [tempWorkerPin, setTempWorkerPin] = useState('');
  const [showPinsInDirectory, setShowPinsInDirectory] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('ALL');
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);

  const [newWorker, setNewWorker] = useState({ name: '', role: 'Barista', phone: '', pin: '' });
  const [newShift, setNewShift] = useState({
    date: SAMPLE_DATES[0],
    timeSlot: 'Morning (08:00 AM - 04:00 PM)',
    location: 'Main Branch',
    requiredCount: 2,
    idealCount: 3
  });

  const [editingShift, setEditingShift] = useState(null);

  const currentWorker = useMemo(() => {
    return workers.find(w => w.id === selectedWorkerId) || workers[0];
  }, [workers, selectedWorkerId]);

  const handleWorkerChange = (newWorkerId) => {
    setSelectedWorkerId(newWorkerId);
    setEnteredWorkerPin('');
    setIsWorkerAuthenticated(false);
    setWorkerPinError(false);
  };

  const handleVerifyWorkerPin = (e) => {
    e.preventDefault();
    if (enteredWorkerPin === currentWorker?.pin || enteredWorkerPin === managerPin) {
      setIsWorkerAuthenticated(true);
      setWorkerPinError(false);
    } else {
      setWorkerPinError(true);
    }
  };

  const handleVerifyManagerPin = (e) => {
    e.preventDefault();
    if (enteredManagerPin === managerPin) {
      setIsManagerAuthenticated(true);
      setManagerPinError(false);
      setEnteredManagerPin('');
    } else {
      setManagerPinError(true);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const activeShifts = useMemo(() => {
    return shifts.filter(s => s.date >= todayStr);
  }, [shifts, todayStr]);

  const displayedShifts = useMemo(() => {
    const list = showArchivedShifts ? shifts : activeShifts;
    return list.filter(s => {
      if (selectedDateFilter !== 'ALL' && s.date !== selectedDateFilter) return false;
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [shifts, activeShifts, showArchivedShifts, selectedDateFilter]);

  const myAssignedShifts = useMemo(() => {
    return shifts.filter(s => s.assignedWorkerIds?.includes(selectedWorkerId))
                 .sort((a, b) => a.date.localeCompare(b.date));
  }, [shifts, selectedWorkerId]);

  useEffect(() => {
    signInAnonymously(auth).catch(() => {});
  }, []);

  useEffect(() => {
    const workersCol = collection(db, 'artifacts', appId, 'public', 'data', 'workers');
    const unsubWorkers = onSnapshot(workersCol, (snapshot) => {
      if (!snapshot.empty) {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setWorkers(docs);
      }
    }, () => {});

    const shiftsCol = collection(db, 'artifacts', appId, 'public', 'data', 'shifts');
    const unsubShifts = onSnapshot(shiftsCol, (snapshot) => {
      if (!snapshot.empty) {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setShifts(docs);
      }
    }, () => {});

    const unsubAvail = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'availabilities'), (snapshot) => {
      const map = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        map[`${data.workerId}_${data.shiftId}`] = data.status;
      });
      setAvailabilities(map);
    }, () => {});

    return () => {
      unsubWorkers();
      unsubShifts();
      unsubAvail();
    };
  }, []);

  const getShiftCoverageStatus = (shift) => {
    const assigned = shift.assignedWorkerIds?.length || 0;
    const minReq = shift.requiredCount || 1;
    const ideal = shift.idealCount || minReq;

    if (assigned < minReq) {
      const needed = minReq - assigned;
      return {
        type: 'understaffed',
        label: `Needs ${needed} More ${needed === 1 ? 'Worker' : 'Workers'}!`,
        subtext: `${assigned} / ${minReq} Min (${ideal} Target)`,
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
        cardBorder: 'border-rose-200 bg-gradient-to-b from-rose-50/30 to-white',
        urgent: true
      };
    } else if (assigned < ideal) {
      const openIdeal = ideal - assigned;
      return {
        type: 'adequate',
        label: `Covered (${openIdeal} ${openIdeal === 1 ? 'slot' : 'slots'} open)`,
        subtext: `${assigned} / ${minReq} Min (${ideal} Target)`,
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
        cardBorder: 'border-amber-200',
        urgent: false
      };
    } else {
      return {
        type: 'fully_staffed',
        label: 'Fully Staffed',
        subtext: `${assigned} / ${ideal} Staffed`,
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        cardBorder: 'border-slate-200',
        urgent: false
      };
    }
  };

  const handleUpdateWorkerPin = async (workerId, newPin) => {
    const cleanPin = newPin.trim();
    if (!cleanPin || cleanPin.length < 4) return;

    setWorkers(prev => prev.map(w => w.id === workerId ? { ...w, pin: cleanPin } : w));
    setEditingWorkerPinId(null);
    setTempWorkerPin('');

    try {
      const workerRef = doc(db, 'artifacts', appId, 'public', 'data', 'workers', workerId);
      await updateDoc(workerRef, { pin: cleanPin });
    } catch (err) {}
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    const newId = 's_' + Date.now();
    const req = parseInt(newShift.requiredCount, 10) || 1;
    const ideal = Math.max(req, parseInt(newShift.idealCount, 10) || req);

    const createdShift = {
      id: newId,
      ...newShift,
      requiredCount: req,
      idealCount: ideal,
      assignedWorkerIds: []
    };

    setShifts(prev => [...prev, createdShift]);

    try {
      const shiftRef = doc(db, 'artifacts', appId, 'public', 'data', 'shifts', newId);
      await setDoc(shiftRef, createdShift);
    } catch (err) {}

    setShowAddShiftModal(false);
    setNewShift({
      date: SAMPLE_DATES[0],
      timeSlot: 'Morning (08:00 AM - 04:00 PM)',
      location: 'Main Branch',
      requiredCount: 2,
      idealCount: 3
    });
  };

  const handleUpdateShiftParams = async (e) => {
    e.preventDefault();
    if (!editingShift) return;
    const req = parseInt(editingShift.requiredCount, 10) || 1;
    const ideal = Math.max(req, parseInt(editingShift.idealCount, 10) || req);

    setShifts(prev => prev.map(s => s.id === editingShift.id ? { ...s, ...editingShift, requiredCount: req, idealCount: ideal } : s));

    try {
      const shiftRef = doc(db, 'artifacts', appId, 'public', 'data', 'shifts', editingShift.id);
      await updateDoc(shiftRef, {
        requiredCount: req,
        idealCount: ideal,
        timeSlot: editingShift.timeSlot,
        location: editingShift.location
      });
    } catch (err) {}

    setEditingShift(null);
  };

  const handleSetAvailability = async (shiftId, status) => {
    if (!selectedWorkerId) return;
    const key = `${selectedWorkerId}_${shiftId}`;
    
    setAvailabilities(prev => ({ ...prev, [key]: status }));
    setSubmissionSuccess(true);
    setTimeout(() => setSubmissionSuccess(false), 2500);

    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'availabilities', key);
      await setDoc(docRef, {
        workerId: selectedWorkerId,
        shiftId,
        status,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {}
  };

  const handleToggleWorkerAssignment = async (shiftId, workerId) => {
    const targetShift = shifts.find(s => s.id === shiftId);
    if (!targetShift) return;

    const currentAssigned = targetShift.assignedWorkerIds || [];
    const updatedList = currentAssigned.includes(workerId)
      ? currentAssigned.filter(id => id !== workerId)
      : [...currentAssigned, workerId];

    setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, assignedWorkerIds: updatedList } : s));

    try {
      const shiftRef = doc(db, 'artifacts', appId, 'public', 'data', 'shifts', shiftId);
      await updateDoc(shiftRef, { assignedWorkerIds: updatedList });
    } catch (err) {}
  };

  const handleCreateWorker = async (e) => {
    e.preventDefault();
    if (!newWorker.name.trim()) return;
    const newId = 'w_' + Date.now();
    const assignedPin = newWorker.pin.trim() || Math.floor(1000 + Math.random() * 9000).toString();

    const createdWorker = {
      id: newId,
      name: newWorker.name.trim(),
      role: newWorker.role.trim() || 'Team Member',
      phone: newWorker.phone.trim() || 'N/A',
      pin: assignedPin
    };

    setWorkers(prev => [...prev, createdWorker]);
    setSelectedWorkerId(newId);
    setIsWorkerAuthenticated(true);
    setShowAddWorkerModal(false);
    setNewWorker({ name: '', role: 'Barista', phone: '', pin: '' });

    try {
      const workerRef = doc(db, 'artifacts', appId, 'public', 'data', 'workers', newId);
      await setDoc(workerRef, createdWorker);
    } catch (err) {}
  };

  const handleResetDemoData = async () => {
    setWorkers(DEFAULT_WORKERS);
    setShifts(DEFAULT_SHIFTS);
    setAvailabilities({});

    try {
      for (const w of DEFAULT_WORKERS) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workers', w.id), w);
      }
      for (const s of DEFAULT_SHIFTS) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shifts', s.id), s);
      }
    } catch (err) {}
  };

  const scheduleHealthSummary = useMemo(() => {
    let understaffed = 0;
    let adequate = 0;
    let fullyStaffed = 0;

    shifts.forEach(s => {
      const status = getShiftCoverageStatus(s);
      if (status.type === 'understaffed') understaffed++;
      else if (status.type === 'adequate') adequate++;
      else fullyStaffed++;
    });

    return { total: shifts.length, understaffed, adequate, fullyStaffed };
  }, [shifts]);

  const uniqueDates = useMemo(() => {
    return Array.from(new Set(shifts.map(s => s.date))).sort();
  }, [shifts]);

  const totalSlotsNeeded = shifts.reduce((acc, s) => acc + (s.requiredCount || 1), 0);
  const totalAssignedSlots = shifts.reduce((acc, s) => acc + (s.assignedWorkerIds?.length || 0), 0);
  const totalCoveragePct = totalSlotsNeeded > 0 ? Math.round((totalAssignedSlots / totalSlotsNeeded) * 100) : 0;

  const searchedWorkers = useMemo(() => {
    if (!searchQuery.trim()) return workers;
    const q = searchQuery.toLowerCase();
    return workers.filter(w => w.name.toLowerCase().includes(q) || w.role.toLowerCase().includes(q));
  }, [workers, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12 print:bg-white print:pb-0">
      
      {/* HEADER NAVBAR */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-inner">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">ShiftSync</h1>
                <p className="text-xs text-slate-400 hidden sm:block">Shift Availability & Manager Dashboard</p>
              </div>
            </div>

            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('worker')}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'worker'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Worker Portal</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('manager')}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'manager'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Manager Dashboard</span>
                {isManagerAuthenticated && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block ml-1"></span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetDemoData}
              title="Reset Sample Data"
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 p-2 rounded hover:bg-slate-800 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset Demo</span>
            </button>
          </div>
        </div>
      </header>

      {/* PRINT HEADER */}
      <div className="hidden print:block p-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Shift Schedule & Staff Availability Summary Report</h1>
        <p className="text-sm text-slate-600">Generated on {new Date().toLocaleDateString()}</p>
      </div>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {activeTab === 'worker' && (
          <div className="space-y-6">
            
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-indigo-600 font-semibold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Employee Portal</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">Submit Shift Availability</h2>
                <p className="text-sm text-slate-500">
                  Select your profile and enter your 4-digit PIN code to set availability or view your assigned schedule.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative">
                  <select
                    value={selectedWorkerId}
                    onChange={(e) => handleWorkerChange(e.target.value)}
                    className="w-full sm:w-64 bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 pr-8 font-medium shadow-sm cursor-pointer"
                  >
                    {workers.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.role})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMyScheduleModal(true)}
                  className="inline-flex items-center justify-center space-x-1.5 text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-4 py-3 rounded-xl transition border border-indigo-200"
                >
                  <FileText className="w-4 h-4" />
                  <span>My Schedule Report</span>
                </button>
              </div>
            </div>

            {!isWorkerAuthenticated ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm max-w-md mx-auto text-center space-y-4">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Worker PIN Security Gate</h3>
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
                    <p className="text-xs text-rose-600 font-semibold">Incorrect PIN. If forgotten, contact your Manager for a PIN reset.</p>
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

                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[11px] text-slate-400">
                    Demo Hint: Default PIN for {currentWorker?.name} is <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">{currentWorker?.pin || '1234'}</code>
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <Unlock className="w-4 h-4 text-emerald-600" />
                    <span>Unlocked for <strong>{currentWorker?.name}</strong></span>
                  </div>
                  <button 
                    onClick={() => setIsWorkerAuthenticated(false)}
                    className="font-semibold text-emerald-700 hover:underline"
                  >
                    Lock Session
                  </button>
                </div>

                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-indigo-600/30 border border-indigo-400/30 rounded-xl">
                      <Info className="w-5 h-5 text-indigo-300" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Upcoming Shift Coverage Status</h4>
                      <p className="text-xs text-slate-300">
                        {scheduleHealthSummary.total} Upcoming Shifts • Mark preferred or available to help managers fill open slots!
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-xs flex-wrap gap-y-2">
                    <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-xl font-semibold flex items-center">
                      <AlertCircle className="w-3.5 h-3.5 mr-1" />
                      {scheduleHealthSummary.understaffed} Needs Staff
                    </span>
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl font-semibold flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      {scheduleHealthSummary.adequate} Open Slots
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-semibold flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      {scheduleHealthSummary.fullyStaffed} Fully Staffed
                    </span>
                  </div>
                </div>

                {submissionSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-sm flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm font-medium">Availability preference saved successfully!</span>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-indigo-600" />
                      <span>Active Shift Slots ({displayedShifts.length})</span>
                    </h3>
                  </div>

                  {displayedShifts.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500">
                      No active upcoming shifts available right now.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {displayedShifts.map(shift => {
                        const statusKey = `${selectedWorkerId}_${shift.id}`;
                        const currentStatus = availabilities[statusKey] || 'unset';
                        const isAssigned = shift.assignedWorkerIds?.includes(selectedWorkerId);

                        const coverageStatus = getShiftCoverageStatus(shift);
                        const assignedWorkerObjects = workers.filter(w => shift.assignedWorkerIds?.includes(w.id));

                        return (
                          <div 
                            key={shift.id}
                            className={`bg-white rounded-2xl p-5 border transition-all shadow-sm flex flex-col justify-between ${coverageStatus.cardBorder} ${
                              isAssigned 
                                ? 'ring-2 ring-indigo-500 border-indigo-500' 
                                : 'hover:border-slate-300'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                                  <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                  {new Date(shift.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                </span>

                                {isAssigned && (
                                  <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-600 text-white shadow-sm">
                                    <Check className="w-3.5 h-3.5 mr-1" />
                                    Scheduled
                                  </span>
                                )}
                              </div>

                              <h4 className="font-bold text-slate-900 text-base mb-1 flex items-center">
                                <Clock className="w-4 h-4 mr-1.5 text-indigo-600 flex-shrink-0" />
                                <span>{shift.timeSlot}</span>
                              </h4>
                              <p className="text-xs text-slate-500 flex items-center mb-3">
                                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 flex-shrink-0" />
                                <span>{shift.location}</span>
                              </p>

                              <div className="mb-3 pt-2 border-t border-slate-100">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                  Assigned Staff ({assignedWorkerObjects.length}):
                                </span>
                                {assignedWorkerObjects.length === 0 ? (
                                  <span className="text-xs text-slate-400 italic">None assigned yet</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {assignedWorkerObjects.map(w => (
                                      <span key={w.id} className="inline-flex items-center text-[11px] bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md border border-slate-200">
                                        <User className="w-3 h-3 mr-1 text-slate-400" />
                                        {w.name.split(' ')[0]}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 mb-4 space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className={`font-bold px-2 py-0.5 rounded-md border text-[11px] ${coverageStatus.badgeBg}`}>
                                    {coverageStatus.label}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-medium">{coverageStatus.subtext}</span>
                                </div>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                                Your Availability:
                              </span>
                              <div className="grid grid-cols-3 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSetAvailability(shift.id, 'preferred')}
                                  className={`px-2 py-2 text-xs font-semibold rounded-xl border flex flex-col items-center justify-center transition-all ${
                                    currentStatus === 'preferred'
                                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'
                                  }`}
                                >
                                  <Star className={`w-3.5 h-3.5 mb-0.5 ${currentStatus === 'preferred' ? 'fill-white' : ''}`} />
                                  <span>Preferred</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetAvailability(shift.id, 'available')}
                                  className={`px-2 py-2 text-xs font-semibold rounded-xl border flex flex-col items-center justify-center transition-all ${
                                    currentStatus === 'available'
                                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                                  }`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mb-0.5" />
                                  <span>Available</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetAvailability(shift.id, 'unavailable')}
                                  className={`px-2 py-2 text-xs font-semibold rounded-xl border flex flex-col items-center justify-center transition-all ${
                                    currentStatus === 'unavailable'
                                      ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300'
                                  }`}
                                >
                                  <XCircle className="w-3.5 h-3.5 mb-0.5" />
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
              </>
            )}
          </div>
        )}

        {activeTab === 'manager' && (
          <div className="space-y-6">
            {!isManagerAuthenticated ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm max-w-md mx-auto text-center space-y-4">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Manager Access Gate</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter the manager PIN code to manage shift rosters, worker pins, and roster assignments.
                  </p>
                </div>

                <form onSubmit={handleVerifyManagerPin} className="space-y-3 pt-2">
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="PIN e.g. 9999"
                    value={enteredManagerPin}
                    onChange={(e) => setEnteredManagerPin(e.target.value)}
                    className="w-36 text-center text-xl tracking-widest font-bold bg-slate-50 border border-slate-300 rounded-xl py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />

                  {managerPinError && (
                    <p className="text-xs text-rose-600 font-semibold">Invalid PIN. Try default demo PIN 9999.</p>
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

                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[11px] text-slate-400">
                    Demo Hint: Manager PIN is <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">9999</code>
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* MANAGER STATS DASHBOARD */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Staffing</span>
                      <Users className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-black text-slate-900">{totalCoveragePct}%</span>
                      <span className="text-xs text-slate-500">{totalAssignedSlots} / {totalSlotsNeeded} Slots Filled</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Understaffed Shifts</span>
                      <AlertCircle className="w-5 h-5 text-rose-500" />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-black text-rose-600">{scheduleHealthSummary.understaffed}</span>
                      <span className="text-xs text-rose-500 font-medium">Needs Urgent Staffing</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Open Target Slots</span>
                      <Clock className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-black text-amber-600">{scheduleHealthSummary.adequate}</span>
                      <span className="text-xs text-amber-600 font-medium">Has Minimum Coverage</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Staff Directory</span>
                      <Users className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-black text-slate-900">{workers.length}</span>
                      <button 
                        onClick={() => setShowStaffManagementModal(true)}
                        className="text-xs text-indigo-600 font-bold hover:underline"
                      >
                        Manage PINs & Staff →
                      </button>
                    </div>
                  </div>
                </div>

                {/* CONTROLS BAR */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddShiftModal(true)}
                      className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create New Shift</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAddWorkerModal(true)}
                      className="inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl transition border border-slate-200"
                    >
                      <User className="w-4 h-4" />
                      <span>Add Worker</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowStaffManagementModal(true)}
                      className="inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl transition border border-slate-200"
                    >
                      <Key className="w-4 h-4 text-slate-600" />
                      <span>Worker PIN Directory</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-3">
                    <select
                      value={selectedDateFilter}
                      onChange={(e) => setSelectedDateFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl p-2.5 font-medium cursor-pointer"
                    >
                      <option value="ALL">Filter Date: All Dates</option>
                      {uniqueDates.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow transition"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Schedule</span>
                    </button>
                  </div>
                </div>

                {/* SHIFTS ROSTER TABLE & ASSIGNMENTS */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800">Shift Assignments & Worker Preferences</h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {displayedShifts.map(shift => {
                      const coverage = getShiftCoverageStatus(shift);

                      return (
                        <div key={shift.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-900 text-base">{shift.timeSlot}</span>
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${coverage.badgeBg}`}>
                                  {coverage.label}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 flex items-center">
                                <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                <span>{shift.date}</span>
                                <span className="mx-1.5">•</span>
                                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                <span>{shift.location}</span>
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setEditingShift(shift)}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition"
                            >
                              Edit Rules
                            </button>
                          </div>

                          {/* WORKERS LIST WITH PREFERENCE TAGS */}
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                              Staff Roster ({shift.assignedWorkerIds?.length || 0} / {shift.requiredCount} Min Required):
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {workers.map(w => {
                                const statusKey = `${w.id}_${shift.id}`;
                                const status = availabilities[statusKey] || 'unset';
                                const isAssigned = shift.assignedWorkerIds?.includes(w.id);

                                return (
                                  <div
                                    key={w.id}
                                    onClick={() => handleToggleWorkerAssignment(shift.id, w.id)}
                                    className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition ${
                                      isAssigned
                                        ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-semibold shadow-xs'
                                        : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        checked={isAssigned || false}
                                        onChange={() => {}} // handled by parent onClick
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                      />
                                      <div>
                                        <p className="font-bold leading-tight">{w.name}</p>
                                        <p className="text-[10px] text-slate-400">{w.role}</p>
                                      </div>
                                    </div>

                                    {/* Availability Tag */}
                                    {status === 'preferred' && (
                                      <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px] flex items-center">
                                        <Star className="w-3 h-3 mr-0.5 fill-amber-500 text-amber-500" />
                                        Preferred
                                      </span>
                                    )}
                                    {status === 'available' && (
                                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] flex items-center">
                                        <CheckCircle2 className="w-3 h-3 mr-0.5 text-emerald-600" />
                                        Available
                                      </span>
                                    )}
                                    {status === 'unavailable' && (
                                      <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded text-[10px] flex items-center">
                                        <XCircle className="w-3 h-3 mr-0.5 text-rose-600" />
                                        Unavailable
                                      </span>
                                    )}
                                    {status === 'unset' && (
                                      <span className="text-[10px] text-slate-400 italic">No response</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      </main>

      {/* WORKER PIN DIRECTORY MODAL */}
      {showStaffManagementModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">Worker PIN Directory & Staff Access</h3>
              </div>
              <button 
                onClick={() => setShowStaffManagementModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Managers can reset worker access PINs here. Workers use these 4-digit codes to authenticate into their profiles.
            </p>

            <div className="flex items-center justify-between pt-2">
              <input
                type="text"
                placeholder="Search staff member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-xs rounded-xl p-2.5 w-64 focus:ring-2 focus:ring-indigo-500"
              />

              <button
                type="button"
                onClick={() => setShowPinsInDirectory(!showPinsInDirectory)}
                className="text-xs text-indigo-600 font-bold hover:underline flex items-center space-x-1"
              >
                {showPinsInDirectory ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPinsInDirectory ? 'Hide PINs' : 'Reveal PINs'}</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {searchedWorkers.map(w => (
                <div key={w.id} className="p-3.5 flex items-center justify-between bg-white hover:bg-slate-50 transition">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{w.name}</h4>
                    <p className="text-xs text-slate-500">{w.role} • {w.phone}</p>
                  </div>

                  <div className="flex items-center space-x-3">
                    {editingWorkerPinId === w.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          maxLength={4}
                          value={tempWorkerPin}
                          onChange={(e) => setTempWorkerPin(e.target.value)}
                          placeholder="New PIN"
                          className="w-20 text-center text-xs font-bold bg-slate-50 border border-indigo-400 rounded-lg p-1.5 focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateWorkerPin(w.id, tempWorkerPin)}
                          className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingWorkerPinId(null)}
                          className="text-slate-400 text-xs hover:text-slate-600 px-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200">
                          {showPinsInDirectory ? w.pin : '••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingWorkerPinId(w.id);
                            setTempWorkerPin(w.pin);
                          }}
                          className="text-xs text-indigo-600 font-bold hover:text-indigo-800 flex items-center space-x-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Reset PIN</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowStaffManagementModal(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW SHIFT MODAL */}
      {showAddShiftModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Create New Shift Slot</h3>
              <button onClick={() => setShowAddShiftModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShift} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Shift Date</label>
                <input
                  type="date"
                  required
                  value={newShift.date}
                  onChange={(e) => setNewShift({ ...newShift, date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Time Slot Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morning (08:00 AM - 04:00 PM)"
                  value={newShift.timeSlot}
                  onChange={(e) => setNewShift({ ...newShift, timeSlot: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Location / Department</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Branch - Front Desk"
                  value={newShift.location}
                  onChange={(e) => setNewShift({ ...newShift, location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Min Required Staff</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newShift.requiredCount}
                    onChange={(e) => setNewShift({ ...newShift, requiredCount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Ideal Target Staff</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newShift.idealCount}
                    onChange={(e) => setNewShift({ ...newShift, idealCount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddShiftModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow"
                >
                  Create Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SHIFT RULES MODAL */}
      {editingShift && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Edit Shift Requirements</h3>
              <button onClick={() => setEditingShift(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateShiftParams} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Time Slot Title</label>
                <input
                  type="text"
                  required
                  value={editingShift.timeSlot}
                  onChange={(e) => setEditingShift({ ...editingShift, timeSlot: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={editingShift.location}
                  onChange={(e) => setEditingShift({ ...editingShift, location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Min Required Staff</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingShift.requiredCount}
                    onChange={(e) => setEditingShift({ ...editingShift, requiredCount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Ideal Target Staff</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingShift.idealCount}
                    onChange={(e) => setEditingShift({ ...editingShift, idealCount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingShift(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow"
                >
                  Save Requirements
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD WORKER MODAL */}
      {showAddWorkerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Add Staff Member</h3>
              <button onClick={() => setShowAddWorkerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorker} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Lee"
                  value={newWorker.name}
                  onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Role / Position</label>
                <input
                  type="text"
                  placeholder="e.g. Barista, Kitchen Associate"
                  value={newWorker.role}
                  onChange={(e) => setNewWorker({ ...newWorker, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. (555) 019-9988"
                  value={newWorker.phone}
                  onChange={(e) => setNewWorker({ ...newWorker, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">4-Digit Access PIN (Optional)</label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="e.g. 7788 (auto-generated if empty)"
                  value={newWorker.pin}
                  onChange={(e) => setNewWorker({ ...newWorker, pin: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddWorkerModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow"
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MY SCHEDULE REPORT MODAL */}
      {showMyScheduleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">My Personal Schedule Report</h3>
              </div>
              <button onClick={() => setShowMyScheduleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl flex items-center space-x-3">
              <User className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-xs text-indigo-950">{currentWorker?.name}</p>
                <p className="text-[11px] text-indigo-700">{currentWorker?.role} • {currentWorker?.phone}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Assigned Upcoming Shifts ({myAssignedShifts.length})
              </h4>

              {myAssignedShifts.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 border border-slate-200 rounded-xl italic">
                  You are not currently scheduled for any upcoming shifts.
                </div>
              ) : (
                <div className="space-y-2">
                  {myAssignedShifts.map(s => (
                    <div key={s.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 block">{s.timeSlot}</span>
                        <span className="text-slate-500 flex items-center mt-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          {s.date} • {s.location}
                        </span>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[10px]">
                        Confirmed
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <button
                type="button"
                onClick={() => window.print()}
                className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center space-x-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Schedule</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMyScheduleModal(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl"
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
