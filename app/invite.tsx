import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { Users, CheckCircle2, X } from 'lucide-react-native';
import { getInviteDetails, acceptInvite, selectOrganization, getToken } from '../src/services/api';
import * as SecureStore from 'expo-secure-store';
import { setToken } from '../src/services/api';

export default function InviteScreen() {
    const { token } = useLocalSearchParams<{ token: string }>();
    const router = useRouter();
    
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [inviteDetails, setInviteDetails] = useState<any>(null);

    useEffect(() => {
        if (token) {
            checkAuthAndFetchInvite();
        } else {
            Alert.alert("Error", "Invalid or missing invite token");
            router.replace('/');
        }
    }, [token]);

    const checkAuthAndFetchInvite = async () => {
        try {
            const authToken = await getToken();
            if (!authToken) {
                // User is not logged in. Save token and redirect to login
                if (Platform.OS !== 'web') {
                    await SecureStore.setItemAsync('pending_invite_token', token);
                } else if (typeof window !== 'undefined') {
                    window.localStorage.setItem('pending_invite_token', token);
                }
                
                Alert.alert("Authentication Required", "Please sign in or create an account to accept this invite.");
                router.replace('/(auth)/login');
                return;
            }

            // User is logged in, fetch invite details
            const response = await getInviteDetails(token);
            if (response.data.status !== 'PENDING') {
                Alert.alert("Invite Expired", "This invite has already been accepted or cancelled.");
                router.replace('/(tabs)');
                return;
            }
            setInviteDetails(response.data);
        } catch (error: any) {
            console.error('Fetch invite error:', error);
            const msg = error.response?.data?.message || 'Failed to load invite details';
            Alert.alert("Error", msg);
            router.replace('/');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        setAccepting(true);
        try {
            const response = await acceptInvite(token);
            const orgId = response.data.organizationId;
            
            // Switch tenant context to the new organization
            const selectRes = await selectOrganization(orgId);
            if (selectRes.data && selectRes.data.token) {
                setToken(selectRes.data.token);
                Alert.alert("Success", `You have successfully joined ${response.data.organizationName}`);
                router.replace('/(tabs)');
            } else {
                router.replace('/');
            }
        } catch (error: any) {
            console.error('Accept invite error:', error);
            const msg = error.response?.data?.message || 'Failed to accept invite';
            Alert.alert("Error", msg);
        } finally {
            setAccepting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading invite...</Text>
            </View>
        );
    }

    if (!inviteDetails) return null;

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
            
            <View style={styles.card}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => router.replace('/')}>
                    <X size={24} color={Colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.iconContainer}>
                    <Users size={40} color={Colors.primary} />
                </View>

                <Text style={styles.title}>You've been invited!</Text>
                
                <Text style={styles.description}>
                    <Text style={styles.highlight}>{inviteDetails.invitedBy}</Text> has invited you to join their shop:
                </Text>

                <View style={styles.orgBox}>
                    <Text style={styles.orgName}>{inviteDetails.organizationName}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{inviteDetails.role}</Text>
                    </View>
                </View>

                <Text style={styles.noteText}>
                    By accepting, you will be granted access to their shop data with {inviteDetails.role.toLowerCase()} permissions.
                </Text>

                <TouchableOpacity 
                    style={styles.acceptBtn} 
                    onPress={handleAccept}
                    disabled={accepting}
                >
                    {accepting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <CheckCircle2 size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.acceptBtnText}>Accept Invitation</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 12,
        fontFamily: 'Urbanist_500Medium',
        color: Colors.textSecondary,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 8,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 20,
    },
    title: {
        fontSize: 24,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        fontFamily: 'Urbanist_400Regular',
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    highlight: {
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
    },
    orgBox: {
        width: '100%',
        backgroundColor: '#FAFAFA',
        borderWidth: 1,
        borderColor: '#F0F0F0',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 24,
    },
    orgName: {
        fontSize: 20,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
        marginBottom: 12,
    },
    roleBadge: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    roleText: {
        color: '#1976D2',
        fontSize: 12,
        fontFamily: 'Urbanist_700Bold',
    },
    noteText: {
        fontSize: 13,
        fontFamily: 'Urbanist_400Regular',
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
    },
    acceptBtn: {
        width: '100%',
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 16,
    },
    acceptBtnText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Urbanist_700Bold',
    }
});
