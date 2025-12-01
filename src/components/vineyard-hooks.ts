import { useQuery } from '@rocicorp/zero/react';
import { useUser } from '@clerk/clerk-react';
import { myVines, myBlocks, myVineyards, myVintages, myWines, myMeasurements, myTasks, activeWines, myPruningLogsByVine } from '../shared/queries';
import { type VineDataRaw, type BlockDataRaw, type VineyardData } from './vineyard-types';

// Module-level caches - persist across component unmount/remount to prevent flash on navigation
// See docs/engineering-principles.md "Zero Query Loading States" for pattern documentation
let cachedVines: VineDataRaw[] | null = null;
let cachedBlocks: BlockDataRaw[] | null = null;
let cachedVineyard: VineyardData | null = null;
let cachedVintages: any[] | null = null;
let cachedWines: any[] | null = null;
let cachedMeasurements: any[] | null = null;
let cachedTasks: any[] | null = null;
let cachedActiveWines: any[] | null = null;
const cachedPruningLogs: Map<string, any[]> = new Map();

export const useVines = () => {
  const { user } = useUser();
  const [vinesData] = useQuery(myVines(user?.id));

  // Update module-level cache when we have real data
  if (vinesData && vinesData.length > 0) {
    cachedVines = vinesData as VineDataRaw[];
  }

  // Use cached data if Zero is still syncing but we have previous data
  return (vinesData && vinesData.length > 0 ? vinesData : cachedVines || []) as VineDataRaw[];
};

export const useBlocks = () => {
  const { user } = useUser();
  const [blocksData] = useQuery(myBlocks(user?.id));

  // Update module-level cache when we have real data
  if (blocksData && blocksData.length > 0) {
    cachedBlocks = blocksData as BlockDataRaw[];
  }

  // Use cached data if Zero is still syncing but we have previous data
  return (blocksData && blocksData.length > 0 ? blocksData : cachedBlocks || []) as BlockDataRaw[];
};

export const useVineyard = () => {
  const { user } = useUser();
  const [vineyardData] = useQuery(myVineyards(user?.id));
  const data = vineyardData as VineyardData[];

  // Update module-level cache when we have real data
  if (data.length > 0) {
    cachedVineyard = data[0];
  }

  // Use cached data if Zero is still syncing but we have previous data
  return data.length > 0 ? data[0] : cachedVineyard;
};

export const useVintages = () => {
  const { user } = useUser();
  const [vintagesData] = useQuery(myVintages(user?.id) as any) as any;

  // Update module-level cache when we have real data
  if (vintagesData && vintagesData.length > 0) {
    cachedVintages = vintagesData;
  }

  // Use cached data if Zero is still syncing but we have previous data
  return vintagesData && vintagesData.length > 0 ? vintagesData : cachedVintages || [];
};

export const useWines = () => {
  const { user } = useUser();
  const [winesData] = useQuery(myWines(user?.id) as any) as any;

  // Update module-level cache when we have real data
  if (winesData && winesData.length > 0) {
    cachedWines = winesData;
  }

  // Use cached data if Zero is still syncing but we have previous data
  return winesData && winesData.length > 0 ? winesData : cachedWines || [];
};

export const useMeasurements = () => {
  const { user } = useUser();
  const [measurementsData] = useQuery(myMeasurements(user?.id) as any) as any;

  // Update module-level cache when we have real data
  if (measurementsData && measurementsData.length > 0) {
    cachedMeasurements = measurementsData;
  }

  // Use cached data if Zero is still syncing but we have previous data
  return measurementsData && measurementsData.length > 0 ? measurementsData : cachedMeasurements || [];
};

export const useTasks = () => {
  const { user } = useUser();
  const [tasksData] = useQuery(myTasks(user?.id) as any) as any;

  // Update module-level cache when we have real data
  if (tasksData && tasksData.length > 0) {
    cachedTasks = tasksData;
  }

  // Use cached data if Zero is still syncing but we have previous data
  return tasksData && tasksData.length > 0 ? tasksData : cachedTasks || [];
};

export const useActiveWines = () => {
  const { user } = useUser();
  const [activeWinesData] = useQuery(activeWines(user?.id) as any) as any;

  // Update module-level cache when we have real data
  if (activeWinesData && activeWinesData.length > 0) {
    cachedActiveWines = activeWinesData;
  }

  // Use cached data if Zero is still syncing but we have previous data
  return activeWinesData && activeWinesData.length > 0 ? activeWinesData : cachedActiveWines || [];
};

export type PruningLogData = {
  id: string;
  user_id: string;
  vine_id: string;
  date: number;
  pruning_type: string;
  spurs_left: number | null;
  canes_before: number | null;
  canes_after: number | null;
  notes: string;
  photo_id: string | null;
  created_at: number;
  updated_at: number;
};

export const usePruningLogs = (vineId: string) => {
  const { user } = useUser();
  const [pruningData] = useQuery(myPruningLogsByVine(user?.id, vineId) as any) as any;

  // Update module-level cache when we have real data
  if (pruningData && pruningData.length > 0) {
    cachedPruningLogs.set(vineId, pruningData);
  }

  // Use cached data if Zero is still syncing but we have previous data
  const cached = cachedPruningLogs.get(vineId);
  return (pruningData && pruningData.length > 0 ? pruningData : cached || []) as PruningLogData[];
};
