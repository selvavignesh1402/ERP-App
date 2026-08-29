import { useCallback, useEffect, useState } from 'react';
import { me } from '../services/api';

export type RoleName = 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'SALES' | 'WAREHOUSE' | string;

export interface CurrentRole {
    role: RoleName | null;
    ready: boolean;
    refresh: () => void;
}

export const useCurrentRole = (): CurrentRole => {
    const [role, setRole] = useState<RoleName | null>(null);
    const [ready, setReady] = useState(false);
    const [tick, setTick] = useState(0);

    const refresh = useCallback(() => setTick(t => t + 1), []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await me();
                if (!cancelled) {
                    setRole(res?.data?.role ?? null);
                }
            } catch (error) {
                console.error('useCurrentRole: failed to load role', error);
                if (!cancelled) setRole(null);
            } finally {
                if (!cancelled) setReady(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [tick]);

    return { role, ready, refresh };
};