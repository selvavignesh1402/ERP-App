import React, { createContext, useCallback, useContext, useEffect, useState, useRef } from 'react';
import { saveOfflineSession, restoreOfflineSession, clearOfflineSession } from '../services/offlineSession';
import { me, getToken, onTokenChanged, verifyOrganizationSession } from '../services/api';

// ─────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────

export type RoleName = 'MASTER_ADMIN' | 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'SALES' | 'WAREHOUSE' | 'USER';

const KNOWN_ROLES: readonly RoleName[] = [
    'MASTER_ADMIN',
    'ADMIN',
    'MANAGER',
    'ACCOUNTANT',
    'SALES',
    'WAREHOUSE',
    'USER',
];

export const isKnownRole = (value: unknown): value is RoleName => {
    if (typeof value !== 'string') return false;
    const clean = value.toUpperCase().replace(/^ROLE_/, '') as RoleName;
    return (KNOWN_ROLES as readonly string[]).includes(clean);
};

export interface RoleContextValue {
    /** The user's active role. null when unknown. */
    role: RoleName | null;
    /** Organization-level role */
    orgRole: RoleName | null;
    /** Platform-level role */
    platformRole: string | null;
    /** Active organization ID */
    orgId: number | null;
    /** List of allowed permissions for the active workspace */
    permissions: string[];
    /** True if the user's business profile is completed. */
    profileCompleted: boolean;
    /** True only when the role & permissions were successfully loaded from backend. */
    ready: boolean;
    /** True when lookup failed. */
    failed: boolean;
    /** Helper function to check if a specific permission is granted */
    can: (permission: string) => boolean;
    /** Helper function to check role */
    hasRole: (role: RoleName | RoleName[]) => boolean;
    /** Re-fetch role & permissions from backend */
    refresh: () => void;

    // ── User profile fields (cached from /auth/me) ──
    /** User ID */
    userId: number | null;
    /** User display name */
    userName: string | null;
    /** User email */
    userEmail: string | null;
    /** User phone number */
    userPhone: string | null;
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const RoleContext = createContext<RoleContextValue | null>(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [role, setRole] = useState<RoleName | null>(null);
    const [orgRole, setOrgRole] = useState<RoleName | null>(null);
    const [platformRole, setPlatformRole] = useState<string | null>(null);
    const [orgId, setOrgId] = useState<number | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [profileCompleted, setProfileCompleted] = useState<boolean>(true);
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);
    const [tick, setTick] = useState(0);
    const generation = useRef(0);

    // Cached user profile fields
    const [userId, setUserId] = useState<number | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userPhone, setUserPhone] = useState<string | null>(null);

    const refresh = useCallback(() => setTick((t) => t + 1), []);

    useEffect(() => {
        const off = onTokenChanged((token) => {
            generation.current++;
            setRole(null);
            setOrgRole(null);
            setPlatformRole(null);
            setOrgId(null);
            setPermissions([]);
            setUserId(null);
            setUserName(null);
            setUserEmail(null);
            setUserPhone(null);
            setProfileCompleted(false);
            setReady(false);
            if (token) {
                setFailed(false);
                refresh();
            } else {
                void clearOfflineSession().catch(() => {});
                setRole(null);
                setOrgRole(null);
                setPlatformRole(null);
                setOrgId(null);
                setPermissions([]);
                setReady(true);
                setFailed(false);
            }
        });
        return off;
    }, [refresh]);

    useEffect(() => {
        let cancelled = false;
        const version = generation.current;
        const isCurrent = () => !cancelled && version === generation.current;
        (async () => {
            setReady(false);
            const token = await getToken().catch(() => null);
            if (!isCurrent()) return;
            if (!token) {
                if (!cancelled) {
                    setUserId(null);
                    setUserName(null);
                    setUserEmail(null);
                    setUserPhone(null);
                    setProfileCompleted(false);
                    setRole(null);
                    setOrgRole(null);
                    setPlatformRole(null);
                    setOrgId(null);
                    setPermissions([]);
                    setReady(true);
                    setFailed(false);
                }
                return;
            }

            try {
                let res;
                let restored = false;
                try {
                    res = await me(token);
                } catch (error: any) {
                    if (error?.response) throw error;
                    const data = await restoreOfflineSession(token);
                    if (!data) throw error;
                    res = { data };
                    restored = true;
                }
                if (!isCurrent()) return;
                const data = res?.data;
                if (!restored) void saveOfflineSession(token, data).catch(() => {});
                const rawRole = data?.role;
                const rawOrgRole = data?.orgRole;
                const rawOrgId = data?.organizationId;
                const rawPerms = data?.permissions || [];
                const completed = data?.profileCompleted ?? true;
                verifyOrganizationSession(token, typeof rawOrgId === 'number' ? rawOrgId : null);

                if (!cancelled) {
                    const normalizedRole = (
                        typeof rawRole === 'string' ? rawRole.toUpperCase().replace(/^ROLE_/, '') : rawRole
                    ) as RoleName;
                    const normalizedOrgRole = (
                        typeof rawOrgRole === 'string'
                            ? rawOrgRole.toUpperCase().replace(/^ROLE_/, '')
                            : normalizedRole
                    ) as RoleName;

                    if (isKnownRole(normalizedRole)) {
                        setRole(normalizedRole);
                        setOrgRole(rawOrgRole && isKnownRole(normalizedOrgRole) ? normalizedOrgRole : null);
                        setPlatformRole(normalizedRole === 'MASTER_ADMIN' ? 'MASTER_ADMIN' : 'USER');
                        setOrgId(typeof rawOrgId === 'number' ? rawOrgId : null);
                        setPermissions(Array.isArray(rawPerms) ? rawPerms : []);
                        setProfileCompleted(completed);
                        setReady(true);
                        setFailed(false);

                        // Cache user profile fields
                        setUserId(data?.id ?? null);
                        setUserName(data?.name ?? null);
                        setUserEmail(data?.email ?? null);
                        setUserPhone(data?.phoneNumber ?? null);
                    } else {
                        setUserId(null);
                        setUserName(null);
                        setUserEmail(null);
                        setUserPhone(null);
                        setRole('USER');
                        setOrgRole('USER');
                        setPlatformRole('USER');
                        setOrgId(typeof rawOrgId === 'number' ? rawOrgId : null);
                        setPermissions(Array.isArray(rawPerms) ? rawPerms : []);
                        setProfileCompleted(completed);
                        setReady(true);
                        setFailed(false);
                    }
                }
            } catch (error: any) {
                if (!isCurrent()) return;
                setUserId(null);
                setUserName(null);
                setUserEmail(null);
                setUserPhone(null);
                setProfileCompleted(false);
                if (error?.response?.status === 401) {
                    if (!cancelled) {
                        setRole(null);
                        setOrgRole(null);
                        setPlatformRole(null);
                        setOrgId(null);
                        setPermissions([]);
                        setReady(true);
                        setFailed(true);
                    }
                } else {
                    if (!cancelled) {
                        setRole(null);
                        setOrgRole(null);
                        setPlatformRole(null);
                        setOrgId(null);
                        setPermissions([]);
                        setReady(true);
                        setFailed(true);
                    }
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [tick]);

    const can = useCallback(
        (permission: string): boolean => {
            if (!ready || failed) return false;
            if (role === 'MASTER_ADMIN') return true;
            const PERMISSION_ALIASES: Record<string, string> = {
                'sales:create': 'sale:create',
                'users:manage': 'member:manage',
                'ledger:view': 'payment:view',
            };
            const targetPerm = PERMISSION_ALIASES[permission] || permission;
            return permissions.includes(targetPerm) || permissions.includes(permission);
        },
        [role, permissions, ready, failed],
    );

    const hasRoleFn = useCallback(
        (checkRole: RoleName | RoleName[]): boolean => {
            if (!role) return false;
            if (Array.isArray(checkRole)) {
                return checkRole.includes(role);
            }
            return role === checkRole;
        },
        [role],
    );

    const value: RoleContextValue = {
        role,
        orgRole,
        platformRole,
        orgId,
        permissions,
        profileCompleted,
        ready,
        failed,
        can,
        hasRole: hasRoleFn,
        refresh,
        userId,
        userName,
        userEmail,
        userPhone,
    };

    return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

// ─────────────────────────────────────────────
// Hook — safe consumer
// ─────────────────────────────────────────────

export const useRoleContext = (): RoleContextValue => {
    const ctx = useContext(RoleContext);
    if (!ctx) {
        throw new Error('useRoleContext must be used within a <RoleProvider>');
    }
    return ctx;
};
