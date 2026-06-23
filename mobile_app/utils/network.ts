import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return isStateOnline(state);
}

export function isStateOnline(state: NetInfoState): boolean {
  if (state.isConnected == null) return true;
  if (!state.isConnected) return false;
  if (state.isInternetReachable == null) return true;
  return state.isInternetReachable;
}

export function subscribeNetwork(callback: (online: boolean) => void): () => void {
  return NetInfo.addEventListener((state) => {
    callback(isStateOnline(state));
  });
}

export function useNetworkOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    isOnline().then(setOnline);
    return subscribeNetwork(setOnline);
  }, []);

  return online;
}
