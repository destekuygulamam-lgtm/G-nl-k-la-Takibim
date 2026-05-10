import { useState, useEffect } from 'react';
import { Medication, MedicationLog } from '../types';
import { db, auth } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Removes undefined properties from an object recursively to prevent Firestore errors.
 */
function sanitizeData(data: any): any {
  if (data === null || typeof data !== 'object') return data;
  
  const sanitized = Array.isArray(data) ? [] : {};
  
  for (const key in data) {
    if (data[key] !== undefined) {
      sanitized[key] = sanitizeData(data[key]);
    }
  }
  
  return sanitized;
}

export function useMedications() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [actionLogs, setActionLogs] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        // Fallback to local storage
        const savedMeds = localStorage.getItem('medications');
        const savedLogs = localStorage.getItem('logs');
        const savedActionLogs = localStorage.getItem('actionLogs');
        if (savedMeds) setMedications(JSON.parse(savedMeds));
        if (savedLogs) setLogs(JSON.parse(savedLogs));
        if (savedActionLogs) setActionLogs(JSON.parse(savedActionLogs));
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('medications', JSON.stringify(medications));
      localStorage.setItem('logs', JSON.stringify(logs));
      localStorage.setItem('actionLogs', JSON.stringify(actionLogs));
      return;
    }

    setIsSyncing(true);

    const medsPath = `users/${user.uid}/medications`;
    const unsubMeds = onSnapshot(collection(db, medsPath), (snapshot) => {
      const medsData = snapshot.docs.map(doc => doc.data() as Medication);
      setMedications(medsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, medsPath);
    });

    const logsPath = `users/${user.uid}/logs`;
    const unsubLogs = onSnapshot(collection(db, logsPath), (snapshot) => {
      const logsData = snapshot.docs.map(doc => doc.data() as MedicationLog);
      setLogs(logsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, logsPath);
    });

    const actionLogsPath = `users/${user.uid}/actionLogs`;
    const unsubActionLogs = onSnapshot(collection(db, actionLogsPath), (snapshot) => {
      const actionLogsData = snapshot.docs.map(doc => doc.data());
      setActionLogs(actionLogsData);
      setIsSyncing(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, actionLogsPath);
      setIsSyncing(false);
    });

    return () => {
      unsubMeds();
      unsubLogs();
      unsubActionLogs();
    };
  }, [user]);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const recordAction = async (type: string, medId: string, medName: string, details?: string) => {
    const newLog = {
      id: crypto.randomUUID(),
      type,
      medicationId: medId,
      medicationName: medName,
      timestamp: new Date().toISOString(),
      ...(details ? { details } : {})
    };

    if (user) {
      const path = `users/${user.uid}/actionLogs/${newLog.id}`;
      try {
        await setDoc(doc(db, `users/${user.uid}/actionLogs`, newLog.id), sanitizeData(newLog));
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    } else {
      setActionLogs(prev => [...prev, newLog]);
    }
  };

  const addMedication = async (med: Omit<Medication, 'id' | 'active'>) => {
    const newMed: Medication = {
      ...med,
      id: crypto.randomUUID(),
      active: true,
    };
    
    if (user) {
      const path = `users/${user.uid}/medications/${newMed.id}`;
      try {
        await setDoc(doc(db, `users/${user.uid}/medications`, newMed.id), sanitizeData(newMed));
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    } else {
      setMedications([...medications, newMed]);
    }
    await recordAction('added', newMed.id, newMed.name, 'İlaç eklendi');
  };

  const updateMedication = async (id: string, updates: Partial<Medication>) => {
    const med = medications.find(m => m.id === id);
    if (!med) return;

    if (user) {
      const updatedMed = { ...med, ...updates };
      const path = `users/${user.uid}/medications/${id}`;
      try {
        await setDoc(doc(db, `users/${user.uid}/medications`, id), sanitizeData(updatedMed), { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    } else {
      setMedications(medications.map(m => m.id === id ? { ...m, ...updates } : m));
    }
    await recordAction('updated', med.id, med.name, 'İlaç güncellendi');
  };

  const deleteMedication = async (id: string) => {
    const med = medications.find(m => m.id === id);
    if (!med) return;

    if (user) {
      const path = `users/${user.uid}/medications/${id}`;
      try {
        await deleteDoc(doc(db, `users/${user.uid}/medications`, id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      setMedications(medications.filter(m => m.id !== id));
    }
    await recordAction('deleted', med.id, med.name, 'İlaç silindi');
  };

  const logMedication = async (medicationId: string, status: 'taken' | 'skipped', timestamp?: string) => {
    const med = medications.find(m => m.id === medicationId);
    const newLog: MedicationLog = {
      id: crypto.randomUUID(),
      medicationId,
      timestamp: timestamp || new Date().toISOString(),
      status,
    };

    if (user) {
      const path = `users/${user.uid}/logs/${newLog.id}`;
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, `users/${user.uid}/logs`, newLog.id), sanitizeData(newLog));
        
        if (status === 'taken') {
          if (med && med.stock > 0) {
            batch.set(doc(db, `users/${user.uid}/medications`, medicationId), { stock: med.stock - 1 }, { merge: true });
          }
        }
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } else {
      setLogs([...logs, newLog]);
      if (status === 'taken') {
        if (med && med.stock > 0) {
          setMedications(medications.map(m => m.id === medicationId ? { ...m, stock: m.stock - 1 } : m));
        }
      }
    }
    if (med) {
      await recordAction(status, med.id, med.name, status === 'taken' ? 'İlaç alındı' : 'İlaç atlandı');
    }
  };

  const bulkUpdateMedications = async (ids: string[], updates: Partial<Medication>) => {
    if (ids.length === 0) return;

    if (user) {
      try {
        const batch = writeBatch(db);
        const sanitizedUpdates = sanitizeData(updates);
        ids.forEach(id => {
          const medRef = doc(db, `users/${user.uid}/medications`, id);
          batch.set(medRef, sanitizedUpdates, { merge: true });
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/medications`);
      }
    } else {
      setMedications(medications.map(m => ids.includes(m.id) ? { ...m, ...updates } : m));
    }
    await recordAction('bulk_updated', 'multiple', 'Çoklu İlaç', `${ids.length} ilaç toplu güncellendi`);
  };

  const restoreData = async (newMedications: Medication[], newLogs: MedicationLog[], newActionLogs: any[] = []) => {
    if (user) {
      setIsSyncing(true);
      try {
        const batch = writeBatch(db);
        
        // Add medications
        newMedications.forEach(med => {
          const medRef = doc(db, `users/${user.uid}/medications`, med.id);
          batch.set(medRef, sanitizeData(med));
        });

        // Add logs
        newLogs.forEach(log => {
          const logRef = doc(db, `users/${user.uid}/logs`, log.id);
          batch.set(logRef, sanitizeData(log));
        });

        // Add action logs
        newActionLogs.forEach(alog => {
          const alogRef = doc(db, `users/${user.uid}/actionLogs`, alog.id);
          batch.set(alogRef, sanitizeData(alog));
        });

        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/restore`);
      } finally {
        setIsSyncing(false);
      }
    } else {
      setMedications(newMedications);
      setLogs(newLogs);
      setActionLogs(newActionLogs);
    }
    await recordAction('restored', 'all', 'Veri Geri Yükleme', `${newMedications.length} ilaç ve ${newLogs.length} günlük geri yüklendi`);
  };

  return {
    medications,
    logs,
    actionLogs,
    user,
    isSyncing,
    loginWithGoogle,
    logout,
    addMedication,
    updateMedication,
    bulkUpdateMedications,
    deleteMedication,
    logMedication,
    restoreData,
  };
}
