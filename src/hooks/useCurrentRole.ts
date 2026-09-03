import { useCallback, useEffect, useState } from 'react';
import { me, clearToken } from '../services/api';

export type RoleName = 'MASTER_ADMIN' | 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'SALES' | 'WAREHOUSE';

const KNOWN_ROLES: readonly RoleName[] = ['MASTER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES', 'WAREHOUSE'];

export const isKnownRole = (value: unknown): value is RoleName =>
    typeof value === 'string' && (KNOWN_ROLES as readonly string[]).includes(value);

export interface CurrentRole {
    /** The user's role. null when unknown (still loading, or the lookup failed). */
    role: RoleName | null;
    /** True if the user's business profile is completed. */
    profileCompleted: boolean;
    /**
     * True only when the role was successfully confirmed by the backend.
     * Gated UI must treat ready === false as "no access" (fail closed).
     */
    ready: boolean;
    /** True when a role lookup was attempted and failed (e.g. network error). */
    failed: boolean;
    refresh: () => void;
}

export const useCurrentRole = (): CurrentRole => {
    const [role, setRole] = useState<RoleName | null>(null);
    const [profileCompleted, setProfileCompleted] = useState<boolean>(true);
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);
    const [tick, setTick] = useState(0);

    const refresh = useCallback(() => setTick(t => t + 1), []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await me();
                const raw = res?.data?.role;
                const completed = res?.data?.profileCompleted ?? true;
                if (!cancelled) {
                    if (isKnownRole(raw)) {
                        setRole(raw);
                        setProfileCompleted(completed);
                        setReady(true);
                        setFailed(false);
                    } else {
                        // Unknown/missing role from the backend: deny, don't guess.
                        setRole(null);
                        setReady(false);
                        setFailed(true);
                    }
                }
            } catch (error: any) {
                if (error?.response?.status === 401 || error?.response?.status === 403) {
                    // Stale or invalid session: safely clear token
                    clearToken();
                    setRole(null);
                } else {
                    console.error('useCurrentRole: failed to load role', error);
                }
                if (!cancelled) {
                    setRole(null);
                    setReady(false);
                    setFailed(true);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [tick]);

    return { role, profileCompleted, ready, failed, refresh };
};

/** Fail-closed role check: no confirmed role means no permission. */
export const hasRole = (current: CurrentRole, ...allowed: RoleName[]): boolean =>
    current.ready && current.role !== null && allowed.includes(current.role);
