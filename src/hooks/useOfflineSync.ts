import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { syncService, OfflineSale } from '../services/syncService';
import { useCurrentRole } from './useCurrentRole';

export function useOfflineSync() {
    const { role } = useCurrentRole();
    const [isOnline, setIsOnline] = useState<boolean>(true);
    const [pendingCount, setPendingCount] = useState<number>(0);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    // Active Org ID fallback
    const orgId = 1; // Or tenant context

    const refreshPendingCount = useCallback(async () => {
        const queue = await syncService.getPendingQueue(orgId);
        setPendingCount(queue.length);
    }, [orgId]);

    // Check connectivity
    const checkOnlineStatus = useCallback(async () => {
        if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
            setIsOnline(navigator.onLine);
        } else {
            // Mobile ping
            try {
                // Quick timeout check
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                await fetch('https://www.google.com/generate_204', {
                    method: 'HEAD',
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                setIsOnline(true);
            } catch (e) {
                setIsOnline(false);
            }
        }
    }, []);

    // Trigger sync
    const syncNow = useCallback(async (): Promise<{ success: boolean; syncedCount: number }> => {
        if (isSyncing) return { success: false, syncedCount: 0 };
        setIsSyncing(true);
        try {
            const res = await syncService.processSyncQueue(orgId);
            await refreshPendingCount();
            if (res.success) {
                setLastSyncTime(new Date());
            }
            return { success: res.success, syncedCount: res.syncedCount };
        } catch (e) {
            console.error('syncNow error:', e);
            return { success: false, syncedCount: 0 };
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing, orgId, refreshPendingCount]);

    // Initial check & polling
    useEffect(() => {
        checkOnlineStatus();
        refreshPendingCount();

        const interval = setInterval(() => {
            checkOnlineStatus();
            refreshPendingCount();
        }, 10000);

        return () => clearInterval(interval);
    }, [checkOnlineStatus, refreshPendingCount]);

    // Auto-sync when coming back online and items are pending
    const prevOnlineRef = useRef(isOnline);
    useEffect(() => {
        if (!prevOnlineRef.current && isOnline && pendingCount > 0) {
            console.log('Network restored. Auto-syncing pending sales queue...');
            syncNow();
        }
        prevOnlineRef.current = isOnline;
    }, [isOnline, pendingCount, syncNow]);

    return {
        isOnline,
        pendingCount,
        isSyncing,
        lastSyncTime,
        syncNow,
        refreshPendingCount,
    };
}
