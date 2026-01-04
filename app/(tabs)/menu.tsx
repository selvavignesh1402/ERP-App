import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { Users, Settings, FileText, ChevronRight, HelpCircle, Info, LogOut, BadgeCheck } from 'lucide-react-native';

const MENU_ITEMS = [
    { id: 'suppliers', title: 'Suppliers', subtitle: 'Manage your partners', icon: Users, route: '/suppliers', color: '#E8F5E9', iconColor: Colors.primary },
    { id: 'reports', title: 'Reports & Analytics', subtitle: 'Sales & stock insights', icon: FileText, route: '/reports', color: '#E3F2FD', iconColor: '#1E88E5' },
    { id: 'settings', title: 'Settings', subtitle: 'App preferences', icon: Settings, route: '/settings', color: '#FFF3E0', iconColor: '#FB8C00' },
    { id: 'help', title: 'Help & Support', subtitle: 'FAQs and contact', icon: HelpCircle, route: '/help', color: '#F3E5F5', iconColor: '#8E24AA' }, // Placeholder route
    { id: 'about', title: 'About App', subtitle: 'Version 1.0.0', icon: Info, route: '/about', color: '#ECEFF1', iconColor: '#546E7A' }, // Placeholder route
];

export default function MenuScreen() {
    const router = useRouter();

    const handleLogout = () => {
        // Clear any auth state here if needed
        router.replace('/(auth)/login');
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Menu</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Section */}
                
                <View style={styles.profileCard}>
                    <View style={styles.profileInfo}>
                        <View style={styles.avatarContainer}>
                            <Text style={styles.avatarText}>A</Text>
                        </View>
                        <View>
                            <View style={styles.nameRow}>
                                <Text style={styles.userName}>Ali Ahmed</Text>
                                <BadgeCheck size={16} color={Colors.primary} style={{ marginLeft: 4 }} />
                            </View>
                            <Text style={styles.userRole}>Main Administrator</Text>
                        </View>
                    </View>
                </View>

                {/* Menu Items */}
                <Text style={styles.sectionLabel}>GENERAL</Text>
                <View style={styles.menuList}>
                    {MENU_ITEMS.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.menuItem}
                            onPress={() => item.route !== '/help' && item.route !== '/about' ? router.push(item.route as any) : null}
                        >
                            <View style={[styles.menuIconBox, { backgroundColor: item.color }]}>
                                <item.icon size={22} color={item.iconColor} />
                            </View>
                            <View style={styles.menuTexts}>
                                <Text style={styles.menuTitle}>{item.title}</Text>
                                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                            </View>
                            <ChevronRight size={20} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <LogOut size={20} color={Colors.error} style={{ marginRight: 8 }} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                {/* <Text style={styles.versionText}>Rice ERP v1.0.0</Text> */}
            </ScrollView>
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
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    // Profile Card
    profileCard: {
        backgroundColor: Colors.primary,
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        marginTop: 10,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    profileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 20,
        fontFamily: 'Urbanist_700Bold',
        color: '#fff',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userName: {
        fontSize: 18,
        fontFamily: 'Urbanist_700Bold',
        color: '#fff',
        marginBottom: 2,
    },
    userRole: {
        fontSize: 12,
        fontFamily: 'Urbanist_500Medium',
        color: 'rgba(255,255,255,0.8)',
    },
    viewProfileBtn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    viewProfileText: {
        fontSize: 14,
        fontFamily: 'Urbanist_600SemiBold',
        color: '#fff',
    },
    // Menu List
    sectionLabel: {
        fontSize: 12,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.textSecondary,
        marginBottom: 12,
        marginLeft: 4,
    },
    menuList: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 8,
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 16,
    },
    menuIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuTexts: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.text,
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: 12,
        fontFamily: 'Urbanist_400Regular',
        color: Colors.textSecondary,
    },
    // Logout
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFEBEE',
        paddingVertical: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    logoutText: {
        fontSize: 16,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.error,
    },
    versionText: {
        textAlign: 'center',
        fontSize: 12,
        fontFamily: 'Urbanist_500Medium',
        color: Colors.textSecondary,
        marginBottom: 30,
        opacity: 0.5,
    },
});
