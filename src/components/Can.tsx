import React from 'react';
import { usePermission } from '../hooks/usePermission';
import { RoleName } from '../hooks/useCurrentRole';

interface CanProps {
    permission?: string;
    role?: RoleName | RoleName[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({ permission, role, children, fallback = null }) => {
    const { can, hasRole, ready } = usePermission();

    if (!ready) {
        return null;
    }

    if (role && !hasRole(role)) {
        return <>{fallback}</>;
    }

    if (permission && !can(permission)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};
