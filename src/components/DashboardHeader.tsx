import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Search, Bell } from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';

interface DashboardHeaderProps {
    date: string;
    greeting: string;
    subtext: string;
    onSearch?: (text: string) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ date, greeting, subtext, onSearch }) => {
    return (
        <View style={styles.container}>
            {/* Organic Pastel Blob Vector Illustration Background */}
            <View style={StyleSheet.absoluteFillObject}>
                <Svg width="100%" height="100%" viewBox="0 0 360 190" preserveAspectRatio="none">
                    {/* Soft Pastel Cream Base */}
                    <Path d="M0 0h360v190H0z" fill="#FAF6ED" />

                    {/* Warm Yellow Pastel Blob (Top Right) */}
                    <Path
                        d="M200 -20 C240 10, 310 -10, 350 40 C380 90, 320 140, 270 120 C220 100, 180 160, 150 110 C120 60, 160 -40, 200 -20 Z"
                        fill="#F7E6B8"
                        opacity={0.7}
                    />

                    {/* Soft Pink Pastel Blob (Center & Bottom Right) */}
                    <Path
                        d="M260 60 C310 70, 370 110, 340 160 C310 200, 240 180, 210 195 C180 200, 160 150, 190 120 C220 90, 230 50, 260 60 Z"
                        fill="#F5C6D8"
                        opacity={0.55}
                    />

                    {/* Sage Green Blob (Top Left & Center Left) */}
                    <Path
                        d="M-20 -10 C30 -20, 110 30, 90 80 C70 120, -10 100, -30 140 C-50 180, -40 30, -20 -10 Z"
                        fill="#DCE6DB"
                        opacity={0.75}
                    />

                    {/* Lavender Soft Accent Circle */}
                    <Circle cx="320" cy="25" r="45" fill="#E2D4F5" opacity={0.5} />
                    <Circle cx="40" cy="160" r="35" fill="#FCE1CC" opacity={0.6} />
                </Svg>
            </View>

            <View style={styles.content}>
                <View style={styles.textContainer}>
                    <Text style={styles.date}>{date}</Text>
                    <Text style={styles.greeting}>{greeting}</Text>
                    <Text style={styles.subtext}>{subtext}</Text>
                </View>

                <View style={styles.actionsContainer}>
                    <View style={styles.searchBar}>
                        <Search size={18} color={Colors.textSecondary} />
                        <TextInput
                            placeholder="Search stock..."
                            placeholderTextColor={Colors.textSecondary}
                            style={styles.searchInput}
                            onChangeText={onSearch}
                        />
                    </View>
                    <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
                        <Bell size={20} color="#2D3E32" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#FAF6ED',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
    },
    content: {
        padding: 22,
        paddingTop: 24,
        justifyContent: 'space-between',
    },
    textContainer: {
        marginBottom: 18,
    },
    date: {
        fontFamily: Typography.fontFamily.medium,
        fontSize: 13,
        color: '#5C7362',
        marginBottom: 4,
        letterSpacing: 0.2,
    },
    greeting: {
        fontFamily: Typography.fontFamily.bold,
        fontSize: 26,
        color: '#1A291E',
        marginBottom: 6,
    },
    subtext: {
        fontFamily: Typography.fontFamily.regular,
        fontSize: 13,
        color: '#5C7362',
        maxWidth: '75%',
        lineHeight: 18,
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 30,
        paddingHorizontal: 16,
        paddingVertical: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontFamily: Typography.fontFamily.medium,
        fontSize: 14,
        color: Colors.text,
        padding: 0,
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
    }
});
