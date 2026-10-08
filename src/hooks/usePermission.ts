import { useRoleContext } from '../contexts/RoleContext';
/** Use for permission/role decisions and action visibility; shares RoleProvider's single lookup. */
export function usePermission() {
    const current = useRoleContext();

    return {
        role: current.role,
        orgRole: current.orgRole,
        platformRole: current.platformRole,
        permissions: current.permissions,
        ready: current.ready,
        failed: current.failed,
        can: current.can,
        hasRole: current.hasRole,
        isMasterAdmin: current.role === 'MASTER_ADMIN',
        isAdmin: current.role === 'ADMIN',
        isManager: current.role === 'MANAGER',
        isSales: current.role === 'SALES',
        isWarehouse: current.role === 'WAREHOUSE',
        isAccountant: current.role === 'ACCOUNTANT',
        refresh: current.refresh,
    };
}
