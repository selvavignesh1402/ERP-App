import React, { useMemo } from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { useRoleContext } from '../contexts/RoleContext';
import { forOrganization, OrganizationApi } from '../services/api';
import { Colors } from '../theme/colors';

interface OrgScopedScreenProps {
    /**
     * Rendered with an organization-scoped API client. The child is remounted
     * whenever the user or the selected shop changes, so no screen can hold
     * state (or an in-flight response) belonging to a previous tenant.
     */
    children: (api: OrganizationApi, orgId: number) => React.ReactNode;
    /** Message shown when no shop is selected yet. */
    emptyMessage?: string;
}

/**
 * Wraps a screen so that every request it makes is pinned to the currently
 * selected organization.
 *
 * A shop switch invalidates the session snapshot, so any request issued by a
 * component that was mounted for the previous shop is rejected with
 * `OrganizationSessionChangedError` instead of silently reading or writing the
 * wrong tenant's data.
 *
 * Use this for any screen that touches tenant data. Platform-level screens
 * (`/api/master-admin/*`, `/users`, invite flows) are intentionally not
 * organization-scoped and should not use this component.
 */
export const OrgScopedScreen: React.FC<OrgScopedScreenProps> = ({
    children,
    emptyMessage = 'Select a shop to continue.',
}) => {
    const { orgId, userId, ready, failed } = useRoleContext();

    if (!ready) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }
    if (failed || orgId === null) {
        return (
            <View style={styles.center}>
                <Text style={styles.message}>{emptyMessage}</Text>
            </View>
        );
    }
    return (
        <OrgScopedSession key={`${userId}:${orgId}`} orgId={orgId}>
            {children}
        </OrgScopedSession>
    );
};

const OrgScopedSession: React.FC<{
    orgId: number;
    children: (api: OrganizationApi, orgId: number) => React.ReactNode;
}> = ({ orgId, children }) => {
    const api = useMemo(() => forOrganization(orgId), [orgId]);
    return <>{children(api, orgId)}</>;
};

const styles = StyleSheet.create({
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: Colors.background,
    },
    message: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center' },
});
