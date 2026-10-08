import { useMemo } from 'react';
import { forOrganization, OrganizationApi } from '../services/api';
import { useRoleContext } from '../contexts/RoleContext';

/**
 * Returns an API client pinned to the currently selected organization.
 *
 * Throws `OrganizationSessionChangedError` if the shop changed after this
 * client was created, which prevents a screen that was mounted for the
 * previous shop from reading or writing the wrong tenant's data.
 *
 * Must be called from a component that is rendered inside `OrgScopedScreen`,
 * so that the component is remounted on a shop switch.
 */
export const useOrganizationApi = (): OrganizationApi | null => {
    const { orgId } = useRoleContext();
    return useMemo(() => (orgId === null ? null : forOrganization(orgId)), [orgId]);
};
