import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { getToken } from '../src/services/api';
import { Colors } from '../src/theme/colors';

export default function Home() {
    const [loading, setLoading] = useState(true);
    const [hasToken, setHasToken] = useState(false);

    useEffect(() => {
        getToken().then(token => {
            setHasToken(!!token);
            setLoading(false);
        }).catch(err => {
            console.error('Error fetching token on startup:', err);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
                <ActivityIndicator size="large" color="#769F83" />
            </View>
        );
    }

    if (hasToken) {
        return <Redirect href="/(tabs)" />;
    }

    return <Redirect href="/(auth)/welcome" />;
}