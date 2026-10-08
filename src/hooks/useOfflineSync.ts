import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { syncService, SyncResult } from '../services/syncService';
import { useRoleContext } from '../contexts/RoleContext';
import { backendReachable } from '../services/api';

export function useOfflineSync() {
    const { orgId: contextOrgId } = useRoleContext();
    const [isOnline, setIsOnline] = useState<boolean>(() => {
        if (Platform.OS === 'web' && typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
            return navigator.onLine;
        }
        return false;
    });
    const [pendingCount, setPendingCount] = useState<number>(0);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [syncError, setSyncError] = useState<string | null>(null);

    const orgId = contextOrgId;
    const currentOrg = useRef(orgId);
    currentOrg.current = orgId;

    const refreshPendingCount = useCallback(async () => {
        if (orgId === null) {
            setPendingCount(0);
            return;
        }
        try {
            const queue = await syncService.getPendingQueue(orgId);
            if (currentOrg.current === orgId) {
                setPendingCount(queue.length);
                setSyncError(queue.find((item) => item.errorMessage)?.errorMessage ?? null);
            }
        } catch (error: any) {
            if (currentOrg.current === orgId)
                setSyncError(error?.message || 'Could not read pending invoices.');
        }
    }, [orgId]);

    // Check connectivity
    const checkOnlineStatus = useCallback(async () => {
        setIsOnline(await backendReachable());
    }, []);

    // Trigger sync
    const syncNow = useCallback(async (): Promise<SyncResult> => {
        if (isSyncing || orgId === null) return { success: false, syncedCount: 0, failedCount: 0 };
        setIsSyncing(true);
        try {
            const res = await syncService.processSyncQueue(orgId);
            await refreshPendingCount();
            if (currentOrg.current === orgId) setSyncError(res.errorMessage ?? null);
            if (res.success && currentOrg.current === orgId) {
                setLastSyncTime(new Date());
            }
            return res;
        } catch (e) {
            console.error('syncNow error:', e);
            return {
                success: false,
                syncedCount: 0,
                failedCount: 0,
                errorMessage: 'Could not synchronize pending invoices.',
            };
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing, orgId, refreshPendingCount]);

    // Initial check & polling
    useEffect(() => {
        setPendingCount(0);
        setLastSyncTime(null);
        setSyncError(null);
        checkOnlineStatus();
        refreshPendingCount();

        const interval = setInterval(() => {
            checkOnlineStatus();
            refreshPendingCount();
        }, 10000);

        let cleanupWeb: (() => void) | undefined;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const handleOnline = () => {
                setIsOnline(true);
                checkOnlineStatus();
            };
            const handleOffline = () => {
                setIsOnline(false);
            };
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
            cleanupWeb = () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }

        return () => {
            clearInterval(interval);
            cleanupWeb?.();
        };
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
        syncError,
        syncNow,
        refreshPendingCount,
    };
}
