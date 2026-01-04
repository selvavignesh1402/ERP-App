import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Switch, Image } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { Camera, BadgeCheck, Globe, LogOut, Bell, Shield, User, Building2, ChevronRight, Briefcase } from 'lucide-react-native';

type TabType = 'profile' | 'business' | 'notifications';

export default function SettingsScreen() {
    const [activeTab, setActiveTab] = useState<TabType>('profile');

    // Form State (Mock)
    const [name, setName] = useState('Ali Ahmed');
    const [email, setEmail] = useState('ali@rice-erp.com');
    const [phone, setPhone] = useState('+1 (555) 000-1234');
    const [location, setLocation] = useState('Downtown Market, City');

    // Toggles
    const [toggles, setToggles] = useState({
        lowStock: true,
        dailySales: true,
        security: true,
        ledger: false,
    });

    const toggleSwitch = (key: keyof typeof toggles) => {
        setToggles(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const renderTabs = () => (
        <View style={styles.tabBar}>
            {(['profile', 'business', 'notifications'] as TabType[]).map((tab) => (
                <TouchableOpacity
                    key={tab}
                    style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
                    onPress={() => setActiveTab(tab)}
                >
                    <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderProfile = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.profileCard}>
                <View style={styles.avatarSection}>
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitials}>A</Text>
                        <View style={styles.cameraBtn}>
                            <Camera size={14} color="#fff" />
                        </View>
                    </View>
                    <View style={styles.nameRow}>
                        <Text style={styles.profileName}>Ali Ahmed</Text>
                        <BadgeCheck size={18} color={Colors.primary} style={{ marginLeft: 4 }} />
                    </View>
                    <Text style={styles.profileRole}>Main Administrator · Since Jan 2024</Text>
                    <View style={styles.badgesRow}>
                        <View style={styles.badge}><Text style={styles.badgeText}>Owner</Text></View>
                        <View style={styles.badge}><Text style={styles.badgeText}>Verified</Text></View>
                    </View>
                </View>

                <View style={styles.formSection}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>FULL NAME</Text>
                        <TextInput style={styles.input} value={name} onChangeText={setName} />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>EMAIL ADDRESS</Text>
                        <TextInput style={styles.input} value={email} onChangeText={setEmail} />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>PHONE NUMBER</Text>
                        <TextInput style={styles.input} value={phone} onChangeText={setPhone} />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>LOCATION</Text>
                        <TextInput style={styles.input} value={location} onChangeText={setLocation} />
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.cancelBtn}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtn}>
                            <Text style={styles.saveBtnText}>Save Changes</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={styles.sectionCard}>
                <View style={styles.cardIconBox}>
                    <Globe size={20} color={Colors.primary} />
                </View>
                <Text style={styles.cardTitle}>Public Profile</Text>
                <Text style={styles.cardDesc}>
                    Your profile is visible to all employees in the Ali Rice Merchants workspace.
                </Text>
                <TouchableOpacity style={styles.linkBtn}>
                    <Text style={styles.linkBtnText}>View Public Profile</Text>
                    <ChevronRight size={16} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: '#FFF5F5' }]}>
                <View style={[styles.cardIconBox, { backgroundColor: '#FFEBEE' }]}>
                    <LogOut size={20} color={Colors.error} />
                </View>
                <Text style={[styles.cardTitle, { color: Colors.error }]}>Account Control</Text>
                <Text style={styles.cardDesc}>
                    Permanently delete your account and all associated data.
                </Text>
                <TouchableOpacity style={styles.dangerBtn}>
                    <Text style={styles.dangerBtnText}>Deactivate Account</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    const renderBusiness = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.profileCard}>
                <View style={styles.businessHeader}>
                    <View style={styles.businessLogo}>
                        <Building2 size={24} color={Colors.primary} />
                    </View>
                    <View>
                        <Text style={styles.profileName}>Ali Rice Merchants</Text>
                        <Text style={styles.profileRole}>Workspace Settings & Branding</Text>
                    </View>
                </View>

                <View style={styles.formSection}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>REGISTRATION NUMBER</Text>
                        <TextInput style={styles.input} value="REG-2024-X89" editable={false} />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>TAX ID</Text>
                        <TextInput style={styles.input} value="TX-990-112" editable={false} />
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Active Sales</Text>
                        <Text style={styles.statValue}>1,240</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Monthly Revenue</Text>
                        <Text style={[styles.statValue, { color: Colors.primary }]}>$42,800</Text>
                    </View>
                </View>

                <TouchableOpacity style={[styles.saveBtn, { width: '100%', marginTop: 24 }]}>
                    <Text style={styles.saveBtnText}>Upgrade Workspace</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    const renderNotifications = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.toggleCard}>
                <View style={styles.toggleIcon}>
                    <Briefcase size={20} color={Colors.text} />
                </View>
                <View style={styles.toggleContent}>
                    <Text style={styles.toggleTitle}>Low Stock Alerts</Text>
                    <Text style={styles.toggleDesc}>Notify when bags fall below 20 per unit</Text>
                </View>
                <Switch
                    trackColor={{ false: "#767577", true: Colors.primary }}
                    thumbColor={"#f4f3f4"}
                    value={toggles.lowStock}
                    onValueChange={() => toggleSwitch('lowStock')}
                />
            </View>

            <View style={styles.toggleCard}>
                <View style={styles.toggleIcon}>
                    <Bell size={20} color={Colors.text} />
                </View>
                <View style={styles.toggleContent}>
                    <Text style={styles.toggleTitle}>Daily Sales Summary</Text>
                    <Text style={styles.toggleDesc}>Receive a recap of total sales every evening</Text>
                </View>
                <Switch
                    trackColor={{ false: "#767577", true: Colors.primary }}
                    thumbColor={"#f4f3f4"}
                    value={toggles.dailySales}
                    onValueChange={() => toggleSwitch('dailySales')}
                />
            </View>

            <View style={styles.toggleCard}>
                <View style={styles.toggleIcon}>
                    <Shield size={20} color={Colors.text} />
                </View>
                <View style={styles.toggleContent}>
                    <Text style={styles.toggleTitle}>Security Alerts</Text>
                    <Text style={styles.toggleDesc}>Notify of new logins from unknown devices</Text>
                </View>
                <Switch
                    trackColor={{ false: "#767577", true: Colors.primary }}
                    thumbColor={"#f4f3f4"}
                    value={toggles.security}
                    onValueChange={() => toggleSwitch('security')}
                />
            </View>

            <View style={styles.toggleCard}>
                <View style={styles.toggleIcon}>
                    <User size={20} color={Colors.text} />
                </View>
                <View style={styles.toggleContent}>
                    <Text style={styles.toggleTitle}>Customer Ledger Updates</Text>
                    <Text style={styles.toggleDesc}>Alert when a wholesaler makes a payment</Text>
                </View>
                <Switch
                    trackColor={{ false: "#767577", true: Colors.primary }}
                    thumbColor={"#f4f3f4"}
                    value={toggles.ledger}
                    onValueChange={() => toggleSwitch('ledger')}
                />
            </View>
        </ScrollView>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <Text style={styles.title}>Settings</Text>
                <Text style={styles.subtitle}>Manage your workspace and personal preferences.</Text>
            </View>

            {renderTabs()}

            <View style={styles.content}>
                {activeTab === 'profile' && renderProfile()}
                {activeTab === 'business' && renderBusiness()}
                {activeTab === 'notifications' && renderNotifications()}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA', // Light grey background
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 28,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Urbanist_400Regular',
        color: Colors.textSecondary,
    },
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    tabItem: {
        marginRight: 24,
        paddingVertical: 8,
    },
    activeTabItem: {
        borderBottomWidth: 2,
        borderBottomColor: Colors.primary,
    },
    tabText: {
        fontSize: 16,
        fontFamily: 'Urbanist_500Medium',
        color: Colors.textSecondary,
    },
    activeTabText: {
        color: Colors.primary,
        fontFamily: 'Urbanist_700Bold',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    // Cards
    profileCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    sectionCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    toggleCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 1,
    },
    // Profile Section
    avatarSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: '#EFEBE9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        position: 'relative',
    },
    avatarInitials: {
        fontSize: 32,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text, // Dark text on light background
    },
    cameraBtn: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: Colors.primary,
        padding: 6,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#fff',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    profileName: {
        fontSize: 20,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
    },
    profileRole: {
        fontSize: 14,
        fontFamily: 'Urbanist_500Medium',
        color: Colors.textSecondary,
        marginBottom: 12,
    },
    badgesRow: {
        flexDirection: 'row',
        gap: 8,
    },
    badge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.primary,
    },
    // Form Inputs
    formSection: {
        marginBottom: 8,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 10,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.textSecondary,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#FAFAFA',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        fontSize: 14,
        fontFamily: 'Urbanist_500Medium',
        color: Colors.text,
    },
    // Actions
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 16,
        gap: 16,
    },
    saveBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#fff',
        fontFamily: 'Urbanist_700Bold',
        fontSize: 14,
    },
    cancelBtn: {
        paddingHorizontal: 16,
    },
    cancelBtnText: {
        color: Colors.textSecondary,
        fontFamily: 'Urbanist_600SemiBold',
        fontSize: 14,
    },
    // Section Card Items
    cardIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: 12,
        fontFamily: 'Urbanist_400Regular',
        color: Colors.textSecondary,
        marginBottom: 12,
        lineHeight: 18,
    },
    linkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    linkBtnText: {
        fontSize: 14,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.primary,
    },
    dangerBtn: {
        width: '100%',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFEBEE',
        alignItems: 'center',
        marginTop: 8,
    },
    dangerBtnText: {
        color: Colors.error,
        fontFamily: 'Urbanist_600SemiBold',
        fontSize: 14,
    },
    // Business Tab specific
    businessHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        gap: 16,
    },
    businessLogo: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#FAFAFA',
        padding: 16,
        borderRadius: 16,
        marginTop: 16,
    },
    statItem: {
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'Urbanist_500Medium',
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
    },
    // Notifications specific
    toggleIcon: {
        width: 40,
        height: 40,
        borderRadius: 20, // Circular
        backgroundColor: '#FAFAFA',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    toggleContent: {
        flex: 1,
    },
    toggleTitle: {
        fontSize: 16,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
        marginBottom: 2,
    },
    toggleDesc: {
        fontSize: 12,
        fontFamily: 'Urbanist_500Medium',
        color: Colors.textSecondary,
        maxWidth: '90%',
    },
});
