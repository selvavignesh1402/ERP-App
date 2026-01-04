import { Tabs } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { LayoutGrid, Box, ShoppingCart, Menu } from 'lucide-react-native';

export default function TabLayout() {
    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarStyle: {
                backgroundColor: Colors.card,
                borderTopColor: Colors.border,
                borderTopWidth: 1,
                elevation: 0,
                shadowOpacity: 0,
                height: 70, // Slightly taller
                paddingBottom: 10,
                paddingTop: 10,
            },
            tabBarActiveTintColor: Colors.primary,
            tabBarInactiveTintColor: Colors.textSecondary,
            tabBarLabelStyle: {
                fontFamily: 'Urbanist_600SemiBold',
                fontSize: 10,
                marginBottom: 5,
            },
        }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <LayoutGrid size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="stock"
                options={{
                    title: 'Stock',
                    tabBarIcon: ({ color }) => <Box size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="sales"
                options={{
                    title: 'Sales',
                    tabBarIcon: ({ color }) => <ShoppingCart size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="menu"
                options={{
                    title: 'Menu',
                    tabBarIcon: ({ color }) => <Menu size={24} color={color} />,
                }}
            />
            {/* Hide other potential files in (tabs) if any */}
            <Tabs.Screen name="inventory" options={{ href: null }} />
            <Tabs.Screen name="ledger" options={{ href: null }} />
        </Tabs>
    );
}
