export type VineData = {
  id: string;
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
  block: string;
  sequenceNumber: number;
  variety: string;
  plantingDate: number;
  health: string;
  notes: string;
  qrGenerated: number;
  createdAt: number;
  updatedAt: number;
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
  name: string;
  location: string;
  sizeAcres: number;
  soilType: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
};

export type VineyardData = {
  id: string;
  name: string;
  location: string;
  varieties: string[];
  createdAt: number;
  updatedAt: number;
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
