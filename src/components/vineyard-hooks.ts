import { useRef } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useUser } from '@clerk/clerk-react';
import { myVines, myBlocks, myVineyards, myVintages, myWines, myMeasurements, myTasks, activeWines } from '../shared/queries';
import { type VineDataRaw, type BlockDataRaw, type VineyardData } from './vineyard-types';

export const useVines = () => {
  const { user } = useUser();
  const [vinesData] = useQuery(myVines(user?.id));
  const lastVinesRef = useRef<VineDataRaw[]>([]);

  // Remember last valid data to prevent flash during Zero reconnection
  if (vinesData && vinesData.length > 0) {
    lastVinesRef.current = vinesData as VineDataRaw[];
  }

  return (vinesData && vinesData.length > 0 ? vinesData : lastVinesRef.current) as VineDataRaw[];
};

export const useBlocks = () => {
  const { user } = useUser();
  const [blocksData] = useQuery(myBlocks(user?.id));
  const lastBlocksRef = useRef<BlockDataRaw[]>([]);

  // Remember last valid data to prevent flash during Zero reconnection
  if (blocksData && blocksData.length > 0) {
    lastBlocksRef.current = blocksData as BlockDataRaw[];
  }

  return (blocksData && blocksData.length > 0 ? blocksData : lastBlocksRef.current) as BlockDataRaw[];
};

export const useVineyard = () => {
  const { user } = useUser();
  const [vineyardData] = useQuery(myVineyards(user?.id));
  const lastVineyardRef = useRef<VineyardData | null>(null);
  const data = vineyardData as VineyardData[];

  // Remember last valid vineyard to prevent flash during Zero reconnection
  if (data.length > 0) {
    lastVineyardRef.current = data[0];
  }

  return data.length > 0 ? data[0] : lastVineyardRef.current;
};

export const useVintages = () => {
  const { user } = useUser();
  const [vintagesData] = useQuery(myVintages(user?.id) as any) as any;
  const lastVintagesRef = useRef<any[]>([]);

  // Remember last valid data to prevent flash during Zero reconnection
  if (vintagesData && vintagesData.length > 0) {
    lastVintagesRef.current = vintagesData;
  }

  return vintagesData && vintagesData.length > 0 ? vintagesData : lastVintagesRef.current;
};

export const useWines = () => {
  const { user } = useUser();
  const [winesData] = useQuery(myWines(user?.id) as any) as any;
  const lastWinesRef = useRef<any[]>([]);

  // Remember last valid data to prevent flash during Zero reconnection
  if (winesData && winesData.length > 0) {
    lastWinesRef.current = winesData;
  }

  return winesData && winesData.length > 0 ? winesData : lastWinesRef.current;
};

export const useMeasurements = () => {
  const { user } = useUser();
  const [measurementsData] = useQuery(myMeasurements(user?.id) as any) as any;
  const lastMeasurementsRef = useRef<any[]>([]);

  // Remember last valid data to prevent flash during Zero reconnection
  if (measurementsData && measurementsData.length > 0) {
    lastMeasurementsRef.current = measurementsData;
  }

  return measurementsData && measurementsData.length > 0 ? measurementsData : lastMeasurementsRef.current;
};

export const useTasks = () => {
  const { user } = useUser();
  const [tasksData] = useQuery(myTasks(user?.id) as any) as any;
  const lastTasksRef = useRef<any[]>([]);

  // Remember last valid data to prevent flash during Zero reconnection
  if (tasksData && tasksData.length > 0) {
    lastTasksRef.current = tasksData;
  }

  return tasksData && tasksData.length > 0 ? tasksData : lastTasksRef.current;
};

export const useActiveWines = () => {
  const { user } = useUser();
  const [activeWinesData] = useQuery(activeWines(user?.id) as any) as any;
  const lastActiveWinesRef = useRef<any[]>([]);

  // Remember last valid data to prevent flash during Zero reconnection
  if (activeWinesData && activeWinesData.length > 0) {
    lastActiveWinesRef.current = activeWinesData;
  }

  return activeWinesData && activeWinesData.length > 0 ? activeWinesData : lastActiveWinesRef.current;
};
