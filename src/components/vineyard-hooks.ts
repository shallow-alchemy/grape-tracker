import { useQuery } from '@rocicorp/zero/react';
import { useUser } from '@clerk/clerk-react';
import { useZero } from '../contexts/ZeroContext';
import { type VineDataRaw, type BlockDataRaw, type VineyardData } from './vineyard-types';

export const useVines = () => {
  const zero = useZero();
  const { user } = useUser();
  const [vinesData] = useQuery(zero.query.vine.where('user_id', user?.id ?? ''));
  return vinesData as VineDataRaw[];
};

export const useBlocks = () => {
  const zero = useZero();
  const { user } = useUser();
  const [blocksData] = useQuery(zero.query.block.where('user_id', user?.id ?? ''));
  return blocksData as BlockDataRaw[];
};

export const useVineyard = () => {
  const zero = useZero();
  const { user } = useUser();
  const [vineyardData] = useQuery(zero.query.vineyard.where('user_id', user?.id ?? ''));
  const data = vineyardData as VineyardData[];
  return data.length > 0 ? data[0] : null;
};
