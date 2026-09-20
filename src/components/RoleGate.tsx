import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { usePermission } from '../hooks/usePermission';
import { RoleName } from '../hooks/useCurrentRole';
import { AccessDeniedScreen } from './AccessDeniedScreen';
import { Colors } from '../theme/colors';

interface RoleGateProps {
    permission?: string;
    role?: RoleName | RoleName[];
    children: React.ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({ permission, role, children }) => {
    const { can, hasRole, ready } = usePermission();

    if (!ready) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (role && !hasRole(role)) {
        return <AccessDeniedScreen />;
    }

    if (permission && !can(permission)) {
        return <AccessDeniedScreen requiredPermission={permission} />;
    }

    return <>{children}</>;
};
