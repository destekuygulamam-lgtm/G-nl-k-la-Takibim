export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: 'daily' | 'weekly' | 'as_needed';
  times: string[]; // e.g., ["08:00", "20:00"]
  stock: number;
  totalStock: number;
  unit: string; // e.g., "Tablet", "Kaşık", "Puff"
  startDate: string;
  notes?: string;
  active: boolean;
  category?: string;
  reminderEnabled?: boolean;
  imageUrl?: string;
  reminderSound?: string;
}

export interface ActionLog {
  id: string;
  type: 'added' | 'deleted' | 'updated' | 'taken' | 'skipped';
  medicationId: string;
  medicationName: string;
  timestamp: string;
  details?: string;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  timestamp: string;
  status: 'taken' | 'skipped';
}

export interface DailySchedule {
  time: string;
  medications: Medication[];
}
