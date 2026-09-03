import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
    ScrollView, TextInput, Modal, ActivityIndicator, Alert,
    Platform, Share, Switch
} from 'react-native';
import { Stack, router } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import {
    ArrowLeft, Plus, Users, UserCheck, UserX, Shield,
    Phone, Trash2, Share2, Copy, Check, Lock, ChevronRight,
    Briefcase, Sparkles, RefreshCw, X, ShieldAlert, Mail
} from 'lucide-react-native';
import { FadeInDown, StaggerContainer, AnimatedPressable } from '../src/components/Anime';
import api from '../src/services/api';

const ROLES = [
    { key: 'ADMIN', label: 'Admin / Owner', desc: 'Full access to sales, finances, purchases & staff settings', color: '#7C3AED', bg: '#EDE7F6' },
    { key: 'SALES', label: 'Field Sales Rep', desc: 'Can visit stores, take orders & collect payments', color: '#F06A8C', bg: '#FBE8F0' },
    { key: 'ACCOUNTANT', label: 'Accountant / Cashier', desc: 'Manages sales, supplier bills, payments & GST records', color: '#2E7D32', bg: '#E8F5E9' },
    { key: 'WAREHOUSE', label: 'Warehouse Manager', desc: 'Manages product stock, goods receipt & supplier deliveries', color: '#E65100', bg: '#FFF3E0' },
];

export default function TeamManagementScreen() {
    const [members, setMembers] = useState<any[]>([]);
    const [invites, setInvites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Add Staff Modal State
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState<'DIRECT' | 'INVITE'>('DIRECT');
    const [staffName, setStaffName] = useState('');
    const [staffPhone, setStaffPhone] = useState('');
    const [staffPassword, setStaffPassword] = useState('staff123');
    const [selectedRole, setSelectedRole] = useState('SALES');
    const [submitting, setSubmitting] = useState(false);
    const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);

    // Role Edit Modal State
    const [editRoleModalVisible, setEditRoleModalVisible] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any | null>(null);
    const [newRole, setNewRole] = useState('SALES');

    const fetchTeamData = useCallback(async () => {
        setLoading(true);
        try {
            const [membersRes, invitesRes] = await Promise.all([
                api.get('/api/organizations/members'),
                api.get('/api/organizations/invites'),
            ]);
            setMembers(membersRes.data || []);
            setInvites(invitesRes.data || []);
        } catch (error: any) {
            console.error('Error fetching team:', error);
            Alert.alert('Error', 'Failed to load team members.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchTeamData();
    }, [fetchTeamData]);

    const handleCreateStaff = async () => {
        if (!staffPhone.trim()) {
            Alert.alert('Required', 'Please enter a valid phone number.');
            return;
        }

        if (activeTab === 'DIRECT' && !staffName.trim()) {
            Alert.alert('Required', 'Please enter the staff member name.');
            return;
        }

        setSubmitting(true);
        try {
            if (activeTab === 'DIRECT') {
                await api.post('/api/organizations/staff', {
                    name: staffName.trim(),
                    phoneNumber: staffPhone.trim(),
                    password: staffPassword.trim(),
                    role: selectedRole,
                });
                Alert.alert('Staff Added', `${staffName.trim()} has been added to your shop.`);
                setAddModalVisible(false);
                resetForm();
                fetchTeamData();
            } else {
                // Invite link generation
                const res = await api.post('/api/organizations/invite', {
                    phoneNumber: staffPhone.trim(),
                    role: selectedRole,
                });
                const link = res.data?.inviteLink || `https://riceerp.com/invite?token=${res.data?.token}`;
                setCreatedInviteLink(link);
                fetchTeamData();
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || error.response?.data || error.message || 'Failed to process request';
            Alert.alert('Failed', typeof msg === 'string' ? msg : 'Error creating staff');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setStaffName('');
        setStaffPhone('');
        setStaffPassword('staff123');
        setSelectedRole('SALES');
        setCreatedInviteLink(null);
    };

    const handleToggleStatus = async (membershipId: number, currentStatus: boolean) => {
        try {
            await api.put(`/api/organizations/members/${membershipId}/status`, {
                isActive: !currentStatus,
            });
            setMembers(prev => prev.map(m => m.membershipId === membershipId ? { ...m, isActive: !currentStatus } : m));
        } catch (error: any) {
            Alert.alert('Error', 'Could not update staff account status.');
        }
    };

    const handleUpdateRole = async () => {
        if (!selectedMember) return;
        setSubmitting(true);
        try {
            await api.put(`/api/organizations/members/${selectedMember.membershipId}/role`, {
                role: newRole,
            });
            Alert.alert('Role Updated', `Staff role updated to ${newRole}.`);
            setEditRoleModalVisible(false);
            fetchTeamData();
        } catch (error) {
            Alert.alert('Error', 'Could not update staff role.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemoveMember = (member: any) => {
        Alert.alert(
            'Remove Staff Member',
            `Are you sure you want to remove ${member.name} (${member.role}) from your shop team?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/api/organizations/members/${member.membershipId}`);
                            setMembers(prev => prev.filter(m => m.membershipId !== member.membershipId));
                            Alert.alert('Removed', 'Staff member removed from shop.');
                        } catch (error: any) {
                            Alert.alert('Error', 'Could not remove member.');
                        }
                    }
                }
            ]
        );
    };

    const handleCancelInvite = async (inviteId: number) => {
        try {
            await api.delete(`/api/organizations/invites/${inviteId}`);
            setInvites(prev => prev.filter(i => i.id !== inviteId));
        } catch (error) {
            Alert.alert('Error', 'Could not cancel invite.');
        }
    };

    const handleShareInvite = async (link: string, phone: string, role: string) => {
        const text = `Hi, you have been invited to join our shop ERP as a ${role} staff member!\n\nClick the link below to accept your invitation:\n${link}`;
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined') {
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
            }
        } else {
            try {
                await Share.share({ message: text });
            } catch (e) {
                console.error(e);
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Pastel SVG Background Blobs */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox="0 0 375 812" preserveAspectRatio="none">
                    <Path d="M0 0h375v812H0z" fill="#FAF7F2" />
                    <Path
                        d="M100 -50 C200 -50, 385 -40, 395 60 C410 180, 360 250, 220 230 C120 210, 40 140, 100 -50 Z"
                        fill="#F5C6D8"
                        opacity={0.35}
                    />
                    <Circle cx="340" cy="70" r="80" fill="#F06A8C" opacity={0.14} />
                    <Circle cx="30" cy="620" r="70" fill="#E2D4F5" opacity={0.24} />
                </Svg>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* 1. Header */}
                <FadeInDown delay={20} style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                        <ArrowLeft size={20} color="#1A1A1A" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.headerTitle}>Team & Staff</Text>
                        <Text style={styles.headerSubtitle}>Manage staff permissions, roles & invitations</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.refreshBtn}
                        onPress={() => {
                            setRefreshing(true);
                            fetchTeamData();
                        }}
                        activeOpacity={0.7}
                    >
                        <RefreshCw size={17} color="#555" />
                    </TouchableOpacity>
                </FadeInDown>

                {/* 2. Top Action Banner */}
                <FadeInDown delay={40} style={styles.topBanner}>
                    <View style={styles.topBannerTextCol}>
                        <Text style={styles.topBannerHeading}>Shop Staff Directory</Text>
                        <Text style={styles.topBannerSub}>Add team members with custom roles for POS, billing & field routes.</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.addStaffBtn}
                        onPress={() => {
                            resetForm();
                            setAddModalVisible(true);
                        }}
                        activeOpacity={0.85}
                    >
                        <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={styles.addStaffBtnText}>Add Staff</Text>
                    </TouchableOpacity>
                </FadeInDown>

                {/* 3. Team Statistics */}
                <FadeInDown delay={60} style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Users size={18} color="#7C3AED" />
                        <Text style={styles.statVal}>{members.length}</Text>
                        <Text style={styles.statLbl}>Total Staff</Text>
                    </View>
                    <View style={styles.statCard}>
                        <UserCheck size={18} color="#2E7D32" />
                        <Text style={[styles.statVal, { color: '#2E7D32' }]}>
                            {members.filter(m => m.isActive).length}
                        </Text>
                        <Text style={styles.statLbl}>Active</Text>
                    </View>
                    <View style={styles.statCard}>
                        <UserX size={18} color="#E65100" />
                        <Text style={[styles.statVal, { color: '#E65100' }]}>
                            {invites.length}
                        </Text>
                        <Text style={styles.statLbl}>Invites</Text>
                    </View>
                </FadeInDown>

                {/* 4. Active Staff Members List */}
                <FadeInDown delay={80} style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Active Team Members</Text>
                        <Text style={styles.sectionCountBadge}>{members.length}</Text>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="#F06A8C" />
                            <Text style={styles.loadingText}>Loading team...</Text>
                        </View>
                    ) : members.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Users size={36} color="#CCCCCC" />
                            <Text style={styles.emptyTitle}>No Staff Members Added</Text>
                            <Text style={styles.emptySub}>Tap 'Add Staff' above to invite your team.</Text>
                        </View>
                    ) : (
                        <StaggerContainer stagger={30} delay={100}>
                            {members.map((member) => {
                                const roleMeta = ROLES.find(r => r.key === member.role) || ROLES[1];
                                return (
                                    <View key={member.membershipId} style={styles.memberCard}>
                                        <View style={styles.memberTopRow}>
                                            <View style={[styles.memberAvatar, { backgroundColor: roleMeta.bg }]}>
                                                <Text style={[styles.memberAvatarText, { color: roleMeta.color }]}>
                                                    {(member.name || 'U').charAt(0).toUpperCase()}
                                                </Text>
                                            </View>

                                            <View style={styles.memberInfoCol}>
                                                <View style={styles.memberNameRow}>
                                                    <Text style={styles.memberNameText}>{member.name}</Text>
                                                    <View style={[styles.roleBadge, { backgroundColor: roleMeta.bg }]}>
                                                        <Text style={[styles.roleBadgeText, { color: roleMeta.color }]}>
                                                            {roleMeta.label}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View style={styles.memberPhoneRow}>
                                                    <Phone size={12} color="#8A8A8A" />
                                                    <Text style={styles.memberPhoneText}>{member.phoneNumber}</Text>
                                                </View>
                                            </View>

                                            <View style={styles.statusCol}>
                                                <Switch
                                                    value={member.isActive}
                                                    onValueChange={() => handleToggleStatus(member.membershipId, member.isActive)}
                                                    trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                                                    thumbColor={member.isActive ? '#2E7D32' : '#9E9E9E'}
                                                />
                                                <Text style={[styles.statusLabel, { color: member.isActive ? '#2E7D32' : '#9E9E9E' }]}>
                                                    {member.isActive ? 'Active' : 'Disabled'}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Actions Bar */}
                                        <View style={styles.memberActionsRow}>
                                            <TouchableOpacity
                                                style={styles.memberActionBtn}
                                                onPress={() => {
                                                    setSelectedMember(member);
                                                    setNewRole(member.role);
                                                    setEditRoleModalVisible(true);
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Shield size={13} color="#555" />
                                                <Text style={styles.memberActionBtnText}>Change Role</Text>
                                            </TouchableOpacity>

                                            {member.role !== 'ADMIN' && (
                                                <TouchableOpacity
                                                    style={[styles.memberActionBtn, { borderColor: '#FFCDD2' }]}
                                                    onPress={() => handleRemoveMember(member)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Trash2 size={13} color="#C62828" />
                                                    <Text style={[styles.memberActionBtnText, { color: '#C62828' }]}>Remove</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </StaggerContainer>
                    )}
                </FadeInDown>

                {/* 5. Pending Invites Section */}
                {invites.length > 0 && (
                    <FadeInDown delay={100} style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Pending Invitations</Text>
                            <Text style={styles.sectionCountBadge}>{invites.length}</Text>
                        </View>

                        {invites.map((invite) => {
                            const roleMeta = ROLES.find(r => r.key === invite.role) || ROLES[1];
                            return (
                                <View key={invite.id} style={styles.inviteCard}>
                                    <View style={styles.inviteInfoRow}>
                                        <View>
                                            <Text style={styles.invitePhone}>{invite.inviteePhoneNumber}</Text>
                                            <Text style={styles.inviteMeta}>Invited as <Text style={{ fontWeight: '700', color: roleMeta.color }}>{roleMeta.label}</Text></Text>
                                        </View>
                                        <View style={styles.inviteActions}>
                                            <TouchableOpacity
                                                style={styles.shareInviteBtn}
                                                onPress={() => handleShareInvite(invite.inviteLink, invite.inviteePhoneNumber, roleMeta.label)}
                                                activeOpacity={0.7}
                                            >
                                                <Share2 size={13} color="#2E7D32" />
                                                <Text style={styles.shareInviteBtnText}>WhatsApp</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.cancelInviteBtn}
                                                onPress={() => handleCancelInvite(invite.id)}
                                                activeOpacity={0.7}
                                            >
                                                <X size={14} color="#8A8A8A" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </FadeInDown>
                )}
            </ScrollView>

            {/* ───────────────────────────────────────────── */}
            {/* ADD / INVITE STAFF MODAL                     */}
            {/* ───────────────────────────────────────────── */}
            <Modal
                visible={addModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setAddModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Add Staff Member</Text>
                                <Text style={styles.modalSubtitle}>Provision user account or send WhatsApp invite</Text>
                            </View>
                            <TouchableOpacity style={styles.closeBtn} onPress={() => setAddModalVisible(false)}>
                                <X size={20} color="#1A1A1A" />
                            </TouchableOpacity>
                        </View>

                        {/* Mode Switcher Tabs */}
                        <View style={styles.modeTabs}>
                            <TouchableOpacity
                                style={[styles.modeTab, activeTab === 'DIRECT' && styles.modeTabActive]}
                                onPress={() => {
                                    setActiveTab('DIRECT');
                                    setCreatedInviteLink(null);
                                }}
                            >
                                <Text style={[styles.modeTabText, activeTab === 'DIRECT' && styles.modeTabTextActive]}>
                                    Direct Account
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modeTab, activeTab === 'INVITE' && styles.modeTabActive]}
                                onPress={() => {
                                    setActiveTab('INVITE');
                                    setCreatedInviteLink(null);
                                }}
                            >
                                <Text style={[styles.modeTabText, activeTab === 'INVITE' && styles.modeTabTextActive]}>
                                    Invite Link / WhatsApp
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            {createdInviteLink ? (
                                <View style={styles.successInviteBox}>
                                    <View style={styles.successIconCircle}>
                                        <Check size={28} color="#2E7D32" strokeWidth={3} />
                                    </View>
                                    <Text style={styles.successTitle}>Invitation Link Ready!</Text>
                                    <Text style={styles.successDesc}>Share this link via WhatsApp with your staff member to join.</Text>

                                    <View style={styles.linkDisplayBox}>
                                        <Text style={styles.linkDisplayText} numberOfLines={1}>{createdInviteLink}</Text>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.whatsAppShareBtn}
                                        onPress={() => handleShareInvite(createdInviteLink, staffPhone, selectedRole)}
                                        activeOpacity={0.85}
                                    >
                                        <Share2 size={16} color="#FFFFFF" />
                                        <Text style={styles.whatsAppShareBtnText}>Share via WhatsApp</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.doneBtn}
                                        onPress={() => {
                                            setAddModalVisible(false);
                                            resetForm();
                                        }}
                                    >
                                        <Text style={styles.doneBtnText}>Close</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    {/* Direct Account Name Field */}
                                    {activeTab === 'DIRECT' && (
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>STAFF FULL NAME</Text>
                                            <TextInput
                                                style={styles.textInput}
                                                placeholder="e.g. Ramesh Kumar"
                                                placeholderTextColor="#999"
                                                value={staffName}
                                                onChangeText={setStaffName}
                                            />
                                        </View>
                                    )}

                                    {/* Phone Number Field */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>MOBILE PHONE NUMBER</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="10-digit mobile number"
                                            placeholderTextColor="#999"
                                            keyboardType="phone-pad"
                                            value={staffPhone}
                                            onChangeText={setStaffPhone}
                                        />
                                    </View>

                                    {/* Direct Account Password Field */}
                                    {activeTab === 'DIRECT' && (
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>DEFAULT LOGIN PASSWORD</Text>
                                            <TextInput
                                                style={styles.textInput}
                                                placeholder="Default: staff123"
                                                placeholderTextColor="#999"
                                                value={staffPassword}
                                                onChangeText={setStaffPassword}
                                                secureTextEntry
                                            />
                                        </View>
                                    )}

                                    {/* Role Selector */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>ASSIGN ROLE & ACCESS</Text>
                                        <View style={styles.rolePickerList}>
                                            {ROLES.map((r) => {
                                                const selected = selectedRole === r.key;
                                                return (
                                                    <TouchableOpacity
                                                        key={r.key}
                                                        style={[styles.roleOptionCard, selected && styles.roleOptionCardActive]}
                                                        onPress={() => setSelectedRole(r.key)}
                                                        activeOpacity={0.8}
                                                    >
                                                        <View style={styles.roleOptionHeader}>
                                                            <View style={[styles.roleOptionDot, { backgroundColor: r.color }]} />
                                                            <Text style={[styles.roleOptionTitle, selected && { color: r.color, fontWeight: '700' }]}>
                                                                {r.label}
                                                            </Text>
                                                        </View>
                                                        <Text style={styles.roleOptionDesc}>{r.desc}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>

                                    {/* Submit Button */}
                                    <TouchableOpacity
                                        style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                                        onPress={handleCreateStaff}
                                        disabled={submitting}
                                        activeOpacity={0.85}
                                    >
                                        {submitting ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <Text style={styles.submitBtnText}>
                                                {activeTab === 'DIRECT' ? 'Add Staff Member' : 'Generate Invite Link'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ───────────────────────────────────────────── */}
            {/* EDIT ROLE MODAL                               */}
            {/* ───────────────────────────────────────────── */}
            <Modal
                visible={editRoleModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setEditRoleModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalCard, { maxHeight: '60%' }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Change Role</Text>
                                <Text style={styles.modalSubtitle}>{selectedMember?.name} ({selectedMember?.phoneNumber})</Text>
                            </View>
                            <TouchableOpacity style={styles.closeBtn} onPress={() => setEditRoleModalVisible(false)}>
                                <X size={20} color="#1A1A1A" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {ROLES.map((r) => {
                                const active = newRole === r.key;
                                return (
                                    <TouchableOpacity
                                        key={r.key}
                                        style={[styles.roleOptionCard, active && styles.roleOptionCardActive]}
                                        onPress={() => setNewRole(r.key)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.roleOptionHeader}>
                                            <View style={[styles.roleOptionDot, { backgroundColor: r.color }]} />
                                            <Text style={[styles.roleOptionTitle, active && { color: r.color, fontWeight: '700' }]}>
                                                {r.label}
                                            </Text>
                                        </View>
                                        <Text style={styles.roleOptionDesc}>{r.desc}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && { opacity: 0.7 }, { marginTop: 12 }]}
                            onPress={handleUpdateRole}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.submitBtnText}>Save Role Changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF7F2',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EFEFEF',
        elevation: 1,
    },
    refreshBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#8A8A8A',
        marginTop: 2,
    },
    topBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#EFEFEF',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
    },
    topBannerTextCol: {
        flex: 1,
        marginRight: 10,
    },
    topBannerHeading: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    topBannerSub: {
        fontSize: 11,
        fontWeight: '500',
        color: '#8A8A8A',
        marginTop: 2,
    },
    addStaffBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#F06A8C',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#F06A8C',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    addStaffBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EFEFEF',
        elevation: 1,
    },
    statVal: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1A1A1A',
        marginTop: 4,
    },
    statLbl: {
        fontSize: 11,
        fontWeight: '500',
        color: '#8A8A8A',
        marginTop: 2,
    },
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#EFEFEF',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    sectionCountBadge: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#555',
        backgroundColor: '#F0F0F2',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    memberCard: {
        backgroundColor: '#FBFBFC',
        borderRadius: 16,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    memberTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    memberAvatarText: {
        fontSize: 16,
        fontWeight: '700',
    },
    memberInfoCol: {
        flex: 1,
    },
    memberNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    memberNameText: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    roleBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 6,
    },
    roleBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    memberPhoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 3,
    },
    memberPhoneText: {
        fontSize: 11.5,
        fontWeight: '500',
        color: '#777777',
    },
    statusCol: {
        alignItems: 'center',
        marginLeft: 8,
    },
    statusLabel: {
        fontSize: 9.5,
        fontWeight: '700',
        marginTop: 2,
    },
    memberActionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#ECECEC',
    },
    memberActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    memberActionBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#444',
    },
    inviteCard: {
        backgroundColor: '#FBFBFC',
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    inviteInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    invitePhone: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    inviteMeta: {
        fontSize: 11,
        fontWeight: '500',
        color: '#777',
        marginTop: 2,
    },
    inviteActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    shareInviteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    shareInviteBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2E7D32',
    },
    cancelInviteBtn: {
        padding: 6,
        borderRadius: 6,
        backgroundColor: '#F0F0F2',
    },
    loadingContainer: {
        paddingVertical: 30,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#8A8A8A',
        marginTop: 8,
    },
    emptyContainer: {
        paddingVertical: 30,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#555',
        marginTop: 8,
    },
    emptySub: {
        fontSize: 11.5,
        fontWeight: '500',
        color: '#8A8A8A',
        marginTop: 3,
    },

    // Modal Styles
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 20,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    modalSubtitle: {
        fontSize: 11.5,
        fontWeight: '500',
        color: '#8A8A8A',
        marginTop: 2,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F0F0F2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modeTabs: {
        flexDirection: 'row',
        backgroundColor: '#F5F5F7',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    modeTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10,
    },
    modeTabActive: {
        backgroundColor: '#FFFFFF',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
    },
    modeTabText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#777',
    },
    modeTabTextActive: {
        color: '#1A1A1A',
        fontWeight: '700',
    },
    inputGroup: {
        marginBottom: 14,
    },
    inputLabel: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#8A8A8A',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    textInput: {
        backgroundColor: '#F8F8FA',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 44,
        fontSize: 13,
        fontWeight: '600',
        color: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    rolePickerList: {
        gap: 8,
    },
    roleOptionCard: {
        backgroundColor: '#F8F8FA',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    roleOptionCardActive: {
        backgroundColor: '#FFFFFF',
        borderColor: '#F06A8C',
        borderWidth: 1.5,
    },
    roleOptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 3,
    },
    roleOptionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    roleOptionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    roleOptionDesc: {
        fontSize: 11,
        fontWeight: '500',
        color: '#8A8A8A',
        marginLeft: 16,
    },
    submitBtn: {
        backgroundColor: '#F06A8C',
        borderRadius: 14,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        elevation: 2,
    },
    submitBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    successInviteBox: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    successIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    successTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    successDesc: {
        fontSize: 12,
        fontWeight: '500',
        color: '#777',
        textAlign: 'center',
        marginHorizontal: 16,
        marginTop: 4,
        marginBottom: 16,
    },
    linkDisplayBox: {
        backgroundColor: '#F5F5F7',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        width: '100%',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E5E8',
    },
    linkDisplayText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#444',
    },
    whatsAppShareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#25D366',
        borderRadius: 14,
        width: '100%',
        height: 46,
        marginBottom: 10,
    },
    whatsAppShareBtnText: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    doneBtn: {
        paddingVertical: 8,
    },
    doneBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8A8A8A',
    },
});
