import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, Alert, ImageBackground } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { Leaf, ArrowRight } from 'lucide-react-native';

export default function SignupScreen() {
    const router = useRouter();
    const [businessName, setBusinessName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');

    const handleSignup = () => {
        if (businessName && phone && password) {
            // Mock signup logic
            Alert.alert('Account Created', 'Welcome to Rice ERP!');
            router.replace('/(tabs)');
        }
    };

    return (
        <ImageBackground
            source={require('../../assets/header_bg.png')}
            style={styles.backgroundImage}
            imageStyle={{ borderRadius: 24, opacity: 0.1 }}
            resizeMode="cover"
        >
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />

                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={styles.logoBox}>
                            <Leaf size={32} color={Colors.primary} />
                        </View>
                        <Text style={styles.title}>Rice Business ERP</Text>
                        <Text style={styles.subtitle}>Join our network of rice merchants.</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>NAME</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ali Ahmed"
                                value={businessName}
                                onChangeText={setBusinessName}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>PHONE NUMBER</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="+1 234 567 890" // Changed format for phone
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>PASSWORD</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Create a password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity style={styles.createBtn} onPress={handleSignup}>
                            <Text style={styles.createBtnText}>Create Account</Text>
                            <ArrowRight size={20} color="#fff" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                                <Text style={styles.linkText}>Sign in here</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    container: {
        flex: 1,
        // backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
        padding: 24,
        paddingTop: 40,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoBox: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: '#E8F5E9', // Using standard green tint
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: "#769F83",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    title: {
        fontSize: 24,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Urbanist_400Regular',
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    form: {
        backgroundColor: '#fff',
        borderRadius: 30, // Large rounded corners as per image
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 12,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#FAFAFA',
        borderWidth: 1,
        borderColor: '#F0F0F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        fontFamily: 'Urbanist_500Medium',
        color: Colors.text,
    },
    createBtn: {
        backgroundColor: '#769F83',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        marginTop: 10,
        marginBottom: 24,
        shadowColor: "#769F83",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    createBtnText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Urbanist_700Bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    footerText: {
        color: Colors.textSecondary,
        fontFamily: 'Urbanist_500Medium',
    },
    linkText: {
        color: '#769F83',
        fontFamily: 'Urbanist_700Bold',
    }
});
