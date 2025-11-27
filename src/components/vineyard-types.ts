export type VineData = {
  id: string;
  sequenceNumber: number;
  block: string;
  variety: string;
  plantingDate: Date;
  age: string;
  health: string;
  notes: string;
  qrGenerated: boolean;
};

export type VineDataRaw = {
  id: string;
  user_id: string;
  block: string;
  sequence_number: number;
  variety: string;
  planting_date: number;
  health: string;
  notes: string;
  qr_generated: number;
  created_at: number;
  updated_at: number;
};

export type BlockData = {
  id: string;
  name: string;
  location: string;
  sizeAcres: number;
  soilType: string;
  notes: string;
};

export type BlockDataRaw = {
  id: string;
  user_id: string;
  name: string;
  location: string;
  size_acres: number;
  soil_type: string;
  notes: string;
  created_at: number;
  updated_at: number;
};

export type VineyardData = {
  id: string;
  user_id: string;
  name: string;
  location: string;
  varieties: string[];
  created_at: number;
  updated_at: number;
};

export type VineFormData = {
  block: string;
  variety: string;
  plantingDate: Date;
  health: string;
  notes?: string;
  quantity?: number;
};

export type BlockFormData = {
  name: string;
  location?: string;
  sizeAcres?: number;
  soilType?: string;
  notes?: string;
};

export type VineyardFormData = {
  name: string;
  location: string;
  varieties: string[];
};
