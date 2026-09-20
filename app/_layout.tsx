import { Stack, usePathname } from 'expo-router';
import {
    useFonts,
    Urbanist_400Regular,
    Urbanist_500Medium,
    Urbanist_600SemiBold,
    Urbanist_700Bold,
    Urbanist_800ExtraBold
} from '@expo-google-fonts/urbanist';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, View, StyleSheet, useWindowDimensions } from 'react-native';
import { Colors } from '../src/theme/colors';
import { RoleProvider } from '../src/contexts/RoleContext';
import { DesktopSidebar } from '../src/components/DesktopSidebar';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppLayoutContent() {
    const { width } = useWindowDimensions();
    const pathname = usePathname();
    const isDesktop = Platform.OS === 'web' && width >= 1024;
    const isAuth = pathname ? (
        pathname.includes('welcome') ||
        pathname.includes('login') ||
        pathname.includes('invite')
    ) : false;

    if (isDesktop && !isAuth) {
        return (
            <View style={styles.desktopShell}>
                <DesktopSidebar />
                <View style={styles.desktopContent}>
                    <Stack screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: '#FAF7F2' }
                    }} />
                </View>
            </View>
        );
    }

    if (isDesktop && isAuth) {
        return (
            <View style={styles.authDesktopShell}>
                <View style={styles.authContainer}>
                    <Stack screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: Colors.background }
                    }} />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.mobileShell}>
            <Stack screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.background }
            }} />
        </View>
    );
}

export default function RootLayout() {
    const [loaded, error] = useFonts({
        Urbanist_400Regular,
        Urbanist_500Medium,
        Urbanist_600SemiBold,
        Urbanist_700Bold,
        Urbanist_800ExtraBold,
    });

    useEffect(() => {
        if (loaded || error) {
            SplashScreen.hideAsync().catch(() => {});
        }
    }, [loaded, error]);

    useEffect(() => {
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
            const styleId = 'erp-web-shell-styles';
            if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.innerHTML = `
                    html, body, #root {
                        height: 100%;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                        background-color: #FAF7F2;
                        overflow-x: hidden;
                    }
                    ::-webkit-scrollbar {
                        width: 6px;
                        height: 6px;
                    }
                    ::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    ::-webkit-scrollbar-thumb {
                        background: #CBD5E1;
                        border-radius: 3px;
                    }
                    ::-webkit-scrollbar-thumb:hover {
                        background: #94A3B8;
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }, []);

    if (!loaded && !error) {
        return null;
    }

    return (
        <RoleProvider>
            <AppLayoutContent />
        </RoleProvider>
    );
}

const styles = StyleSheet.create({
    desktopShell: {
        flex: 1,
        width: '100%',
        height: '100%',
        flexDirection: 'row',
        backgroundColor: '#FAF7F2',
        overflow: 'hidden',
    },
    desktopContent: {
        flex: 1,
        height: '100%',
        backgroundColor: '#FAF7F2',
        position: 'relative',
        overflow: 'hidden',
    },
    authDesktopShell: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#FAF7F2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    authContainer: {
        width: '100%',
        maxWidth: 480,
        height: '100%',
        maxHeight: 760,
        backgroundColor: Colors.background,
        borderRadius: 24,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? {
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.05)',
            borderWidth: 1,
            borderColor: '#E2E8F0',
        } as any : {}),
    },
    mobileShell: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: Colors.background,
    },
});

