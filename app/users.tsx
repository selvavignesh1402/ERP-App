import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Switch, TextInput } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { listUsers, updateUser, me } from '../src/services/api';
import { Shield, ChevronDown, Search } from 'lucide-react-native';

const ROLES = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES', 'WAREHOUSE'];

const roleLabel = (role: string | undefined) => {
    switch (role) {
        case 'ADMIN': return 'Administrator';
        case 'MANAGER': return 'Manager';
        case 'ACCOUNTANT': return 'Accountant';
        case 'SALES': return 'Sales Staff';
        case 'WAREHOUSE': return 'Warehouse Staff';
        default: return role ?? 'User';
    }
};

const roleColors: Record<string, { bg: string; fg: string }> = {
    ADMIN: { bg: '#E8EAF6', fg: '#3F51B5' },
    MANAGER: { bg: '#E0F2F1', fg: '#00897B' },
    ACCOUNTANT: { bg: '#FFF3E0', fg: '#FB8C00' },
    SALES: { bg: '#E3F2FD', fg: '#1E88E5' },
    WAREHOUSE: { bg: '#F3E5F5', fg: '#8E24AA' },
};

interface UserRow {
    id: number;
    name: string;
    phoneNumber: string;
    role: string;
    active: boolean;
    profileCompleted: boolean;
}

export default function UsersScreen() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await listUsers();
            setUsers(res.data || []);
        } catch (error: any) {
            console.error('Users: failed to load users', error);
            const msg = error.response?.data?.message || 'Failed to load users';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                try {
                    const res = await me();
                    setCurrentUserId(res?.data?.id ?? null);
                } catch (e) {
                    console.error('Users: failed to load current user', e);
                }
            })();
            fetchUsers();
        }, [fetchUsers])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers();
    };

    const showRolePicker = (user: UserRow) => {
        Alert.alert(
            `Change role for ${user.name}`,
            'Select a new role',
            [
                ...ROLES
                    .filter(r => r !== user.role)
                    .map(r => ({
                        text: `${roleLabel(r)} (${r})`,
                        onPress: () => confirmRoleChange(user, r),
                    })),
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const confirmRoleChange = (user: UserRow, newRole: string) => {
        Alert.alert(
            'Confirm role change',
            `Change ${user.name}'s role from ${roleLabel(user.role)} to ${roleLabel(newRole)}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Change Role',
                    onPress: async () => {
                        try {
                            await updateUser(user.id, { role: newRole });
                            Alert.alert('Success', `${user.name} is now ${roleLabel(newRole)}`);
                            fetchUsers();
                        } catch (error: any) {
                            console.error('Users: role change failed', error);
                            const msg = error.response?.data?.message || 'Failed to update role';
                            Alert.alert('Error', msg);
                        }
                    },
                },
            ]
        );
    };

    const confirmToggleActive = (user: UserRow) => {
        const nextActive = !user.active;
        Alert.alert(
            nextActive ? 'Activate account' : 'Deactivate account',
            nextActive
                ? `Reactivate ${user.name}'s account?`
                : `Deactivate ${user.name}'s account? They will be unable to log in.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: nextActive ? 'Activate' : 'Deactivate',
                    style: nextActive ? 'default' : 'destructive',
                    onPress: async () => {
                        try {
                            await updateUser(user.id, { active: nextActive });
                            Alert.alert('Success', `${user.name}'s account ${nextActive ? 'activated' : 'deactivated'}`);
                            fetchUsers();
                        } catch (error: any) {
                            console.error('Users: active toggle failed', error);
                            const msg = error.response?.data?.message || 'Failed to update account status';
                            Alert.alert('Error', msg);
                        }
                    },
                },
            ]
        );
    };

    const getFilteredUsers = () => {
        if (!searchQuery) return users;
        const q = searchQuery.toLowerCase();
        return users.filter(u =>
            u.name?.toLowerCase().includes(q) ||
            u.phoneNumber?.includes(searchQuery) ||
            u.role?.toLowerCase().includes(q)
        );
    };

    const renderUser = ({ item }: { item: UserRow }) => {
        const initials = (item.name || '?').trim().charAt(0).toUpperCase() || '?';
        const rc = roleColors[item.role] || { bg: '#ECEFF1', fg: '#546E7A' };
        const isSelf = item.id === currentUserId;
        return (
            <View style={styles.userCard}>
                <View style={[styles.avatar, { backgroundColor: rc.fg }]}>
                    <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.userInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
                        {isSelf && (
                            <View style={styles.youBadge}>
                                <Text style={styles.youBadgeText}>you</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.userPhone}>{item.phoneNumber}</Text>
                    <TouchableOpacity
                        style={[styles.roleChip, { backgroundColor: rc.bg }]}
                        onPress={() => showRolePicker(item)}
                    >
                        <Text style={[styles.roleChipText, { color: rc.fg }]}>{roleLabel(item.role)}</Text>
                        <ChevronDown size={14} color={rc.fg} />
                    </TouchableOpacity>
                </View>
                <View style={styles.activeCol}>
                    <Switch
                        value={item.active}
                        onValueChange={() => confirmToggleActive(item)}
                        trackColor={{ false: '#D5D8DC', true: Colors.success }}
                        thumbColor="#FFFFFF"
                    />
                    <Text style={[styles.activeLabel, { color: item.active ? Colors.success : Colors.error }]}>
                        {item.active ? 'Active' : 'Inactive'}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading users...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Team & Roles</Text>
                <Text style={styles.headerSubtitle}>Manage user permissions and account access</Text>
            </View>

            <View style={styles.searchBox}>
                <Search size={18} color={Colors.textSecondary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name, phone or role"
                    placeholderTextColor={Colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <FlatList
                style={styles.list}
                contentContainerStyle={styles.listContent}
                data={getFilteredUsers()}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderUser}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Shield size={40} color={Colors.border} />
                        <Text style={styles.emptyText}>No users found</Text>
                    </View>
                }
            />

            <View style={styles.footerNote}>
                <Text style={styles.footerNoteText}>
                    Role changes apply immediately. The last active admin cannot be demoted or deactivated.
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 10,
        backgroundColor: '#FAFAFA',
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
    },
    headerSubtitle: {
        fontSize: 13,
        fontFamily: 'Urbanist_400Regular',
        color: Colors.textSecondary,
        marginTop: 4,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 46,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        fontFamily: 'Urbanist_400Regular',
        color: Colors.text,
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 18,
        fontFamily: 'Urbanist_700Bold',
        color: '#fff',
    },
    userInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userName: {
        fontSize: 16,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.text,
        maxWidth: 160,
    },
    youBadge: {
        backgroundColor: '#E8F5E9',
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 6,
    },
    youBadgeText: {
        fontSize: 10,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.success,
    },
    userPhone: {
        fontSize: 12,
        fontFamily: 'Urbanist_400Regular',
        color: Colors.textSecondary,
        marginTop: 2,
    },
    roleChip: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginTop: 6,
    },
    roleChipText: {
        fontSize: 12,
        fontFamily: 'Urbanist_600SemiBold',
        marginRight: 4,
    },
    activeCol: {
        alignItems: 'flex-end',
        marginLeft: 8,
    },
    activeLabel: {
        fontSize: 10,
        fontFamily: 'Urbanist_600SemiBold',
        marginTop: 4,
    },
    loadingBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        fontFamily: 'Urbanist_500Medium',
        color: Colors.textSecondary,
    },
    emptyBox: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        marginTop: 10,
        fontSize: 14,
        fontFamily: 'Urbanist_500Medium',
        color: Colors.textSecondary,
    },
    footerNote: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    footerNoteText: {
        fontSize: 11,
        fontFamily: 'Urbanist_400Regular',
        color: Colors.textSecondary,
        textAlign: 'center',
    },
});