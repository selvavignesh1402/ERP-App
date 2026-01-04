import React from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, TextInput } from 'react-native';
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
            <ImageBackground
                source={require('../../assets/header_bg.png')}
                style={styles.backgroundImage}
                imageStyle={{ borderRadius: 24, opacity: 0.3}}
                resizeMode="cover"
            >
                <View style={styles.content}>
                    <View style={styles.textContainer}>
                        <Text style={styles.date}>{date}</Text>
                        <Text style={styles.greeting}>{greeting}</Text>
                        <Text style={styles.subtext}>{subtext}</Text>
                    </View>

                    <View style={styles.actionsContainer}>
                        <View style={styles.searchBar}>
                            <Search size={20} color={Colors.textSecondary} />
                            <TextInput
                                placeholder="Search stock..."
                                placeholderTextColor={Colors.textSecondary}
                                style={styles.searchInput}
                                onChangeText={onSearch}
                            />
                        </View>
                        <TouchableOpacity style={styles.iconBtn}>
                            <Bell size={20} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
        borderRadius: 24,
        overflow: 'hidden', // Ensure image respects border radius
        backgroundColor: '#F5F9F6', // Fallback/Base color matching the image tone
    },
    backgroundImage: {
        width: '100%',
        minHeight: 180, // Adjust based on the image aspect ratio
        justifyContent: 'center',
    },
    content: {
        padding: 24,
        flex: 1,
        justifyContent: 'space-between',
    },
    textContainer: {
        marginBottom: 20,
    },
    date: {
        fontFamily: Typography.fontFamily.medium,
        fontSize: 14,
        color: '#647D6A', // Muted green from design
        marginBottom: 4,
    },
    greeting: {
        fontFamily: Typography.fontFamily.bold,
        fontSize: 32,
        color: '#2D3E32', // Darker green/black from design
        marginBottom: 8,
    },
    subtext: {
        fontFamily: Typography.fontFamily.regular,
        fontSize: 14,
        color: '#647D6A',
        maxWidth: '60%',
        lineHeight: 20,
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
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontFamily: Typography.fontFamily.medium,
        fontSize: 14,
        color: Colors.text,
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF', // Translucent white
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    }
});
