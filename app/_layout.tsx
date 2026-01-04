import { Stack } from 'expo-router';
import {
    useFonts,
    Urbanist_400Regular,
    Urbanist_500Medium,
    Urbanist_700Bold
} from '@expo-google-fonts/urbanist';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Colors } from '../src/theme/colors';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [loaded, error] = useFonts({
        Urbanist_400Regular,
        Urbanist_500Medium,
        Urbanist_700Bold,
    });

    useEffect(() => {
        if (loaded || error) {
            SplashScreen.hideAsync();
        }
    }, [loaded, error]);

    if (!loaded && !error) {
        return null;
    }

    return (
        <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background }
        }} />
    );
}
