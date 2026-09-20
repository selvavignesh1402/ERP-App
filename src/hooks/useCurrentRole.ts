import { useRoleContext, RoleContextValue } from '../contexts/RoleContext';

// Re-export types so existing imports keep working.
export type { RoleName } from '../contexts/RoleContext';
export { isKnownRole } from '../contexts/RoleContext';

// Backward-compatible type alias
export type CurrentRole = RoleContextValue;

/**
 * Standalone role-check helper — works with both a CurrentRole object and a raw RoleName string.
 * Kept as a named export for call-sites that destructure `hasRole` at the module level.
 */
export const hasRole = (current: CurrentRole | string | null, targetRole: string | string[]): boolean => {
    if (!current) return false;
    const role = typeof current === 'string' ? current : current.role;
    if (!role) return false;
    if (Array.isArray(targetRole)) {
        return targetRole.includes(role);
    }
    return role === targetRole;
};

/**
 * Hook — now simply delegates to the centralized RoleProvider context.
 * All consumers share a single `/auth/me` fetch.
 */
export const useCurrentRole = (): CurrentRole => {
    return useRoleContext();
};
