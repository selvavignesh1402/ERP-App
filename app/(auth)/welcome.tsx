import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, ImageBackground } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { Leaf } from 'lucide-react-native';

export default function WelcomeScreen() {
    const router = useRouter();

    return (
        <ImageBackground
            source={require('../../assets/header_bg.png')}
            style={styles.backgroundImage}
            imageStyle={{ borderRadius: 24, opacity: 0.2}}
            resizeMode="cover"
        >
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />

                <View style={styles.content}>
                    <View style={styles.logoContainer}>
                        <View style={styles.logoBox}>
                            <Leaf size={32} color={Colors.primary} />
                        </View>
                    </View>

                    <Text style={styles.title}>Welcome</Text>
                    <Text style={styles.subtitle}>
                        Experience the calmest ERP for your rice business.
                    </Text>

                    <View style={styles.illustrationContainer}>
                        <Image
                            source={require('../../assets/welcome.png')}
                            style={styles.illustration}
                            resizeMode="contain"
                        />
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.loginBtn}
                            onPress={() => router.push('/(auth)/login')}
                        >
                            <Text style={styles.loginBtnText}>Log In</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.signupBtn}
                            onPress={() => router.push('/(auth)/signup')}
                        >
                            <Text style={styles.signupBtnText}>Sign Up</Text>
                        </TouchableOpacity>
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
        // Removed backgroundColor to let image show
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        alignItems: 'center',
    },
    logoContainer: {
        marginBottom: 24,
    },
    logoBox: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    title: {
        fontSize: 32,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Urbanist_400Regular',
        color: Colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 24,
        marginBottom: 20,
    },
    illustrationContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    illustration: {
        width: '100%', // Adjust as needed based on image aspect ratio
        height: 300,
    },
    footer: {
        width: '100%',
        marginBottom: 40,
        gap: 16,
    },
    loginBtn: {
        backgroundColor: '#769F83', // Muted green from design
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        width: '100%',
        shadowColor: "#769F83",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    loginBtnText: {
        color: '#fff',
        fontFamily: 'Urbanist_700Bold',
        fontSize: 16,
    },
    signupBtn: {
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: 'rgba(255, 255, 255, 0.9)', // Slight transparency
    },
    signupBtnText: {
        color: Colors.text,
        fontFamily: 'Urbanist_700Bold',
        fontSize: 16,
    }
});
