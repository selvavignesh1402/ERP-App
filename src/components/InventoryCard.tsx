import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { AnimatedPressable } from './Anime';
import { SlidersHorizontal } from 'lucide-react-native';

interface InventoryCardProps {
    id: string;
    name: string;
    brand?: string;
    category?: string;
    supplier?: string;
    stock: number;
    minimumStock?: number;
    price: number;
    unit?: string;
    hsnCode?: string;
    image?: any;
    onPress?: () => void;
    onAdjustPress?: () => void;
}

export const InventoryCard: React.FC<InventoryCardProps> = ({
    id,
    name,
    brand,
    category,
    supplier,
    stock,
    minimumStock = 10,
    price,
    unit = '25kg',
    hsnCode,
    image,
    onPress,
    onAdjustPress
}) => {
    const isLowStock = stock <= minimumStock;
    const itemCode = hsnCode ? `HSN-${hsnCode}` : `RS-${id.padStart ? id.padStart(4, '0') : id}`;

    return (
        <AnimatedPressable
            style={styles.card}
            onPress={onPress}
        >
            <View style={styles.cardInner}>
                {/* 1. Leading Product Thumbnail */}
                <View style={styles.imageBox}>
                    <Image
                        source={image || require('../../assets/rice_bag.png')}
                        style={styles.thumbnailImage}
                        resizeMode="contain"
                    />
                    {!!unit && (
                        <View style={styles.unitBadge}>
                            <Text style={styles.unitText}>{unit}</Text>
                        </View>
                    )}
                </View>

                {/* 2. Middle Content Information */}
                <View style={styles.infoCol}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                            {name}
                        </Text>
                    </View>

                    <Text style={styles.skuText} numberOfLines={1} ellipsizeMode="tail">
                        {itemCode} {brand ? `· ${brand}` : ''}
                    </Text>

                    {/* Stock and Price stats row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Stock</Text>
                            <Text style={styles.statValue} numberOfLines={1}>
                                {stock} {stock === 1 ? 'Bag' : 'Bags'}
                            </Text>
                        </View>

                        <View style={styles.statDivider} />

                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Price</Text>
                            <Text style={styles.statPriceValue} numberOfLines={1}>
                                ₹ {price.toLocaleString('en-IN')}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 3. Trailing Column: Status Badge & Adjust Button (Identical Size & Alignment) */}
                <View style={styles.trailingCol}>
                    <View style={[styles.actionPill, isLowStock ? styles.badgeLowStock : styles.badgeInStock]}>
                        <Text style={[styles.actionPillText, isLowStock ? styles.textLowStock : styles.textInStock]}>
                            {isLowStock ? 'Low Stock' : 'In Stock'}
                        </Text>
                    </View>

                    {onAdjustPress && (
                        <TouchableOpacity
                            style={[styles.actionPill, styles.adjustBtn]}
                            onPress={(e) => {
                                e.stopPropagation();
                                onAdjustPress();
                            }}
                            activeOpacity={0.75}
                        >
                            <SlidersHorizontal size={12} color="#2C2C2E" />
                            <Text style={[styles.actionPillText, styles.adjustBtnText]}>Adjust</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </AnimatedPressable>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    cardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    imageBox: {
        width: 76,
        height: 76,
        borderRadius: 18,
        backgroundColor: '#F8F7F4',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        position: 'relative',
        borderWidth: 1,
        borderColor: '#EAEAE8',
    },
    thumbnailImage: {
        width: 52,
        height: 52,
    },
    unitBadge: {
        position: 'absolute',
        bottom: -5,
        backgroundColor: '#1A1A1A',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    unitText: {
        fontSize: 9.5,
        fontFamily: 'Urbanist_700Bold',
        color: '#FFFFFF',
    },
    infoCol: {
        flex: 1,
        justifyContent: 'center',
        paddingRight: 8,
        minWidth: 0, // Ensures text truncate works properly in flexbox
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 3,
    },
    title: {
        fontSize: 16,
        fontFamily: 'Urbanist_700Bold',
        color: '#1A1A1A',
        letterSpacing: -0.2,
    },
    skuText: {
        fontSize: 12,
        fontFamily: 'Urbanist_500Medium',
        color: '#8A8A8A',
        marginBottom: 8,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statItem: {
        justifyContent: 'center',
    },
    statDivider: {
        width: 1,
        height: 20,
        backgroundColor: '#EAEAEA',
    },
    statLabel: {
        fontSize: 10.5,
        fontFamily: 'Urbanist_500Medium',
        color: '#9E9E9E',
        marginBottom: 1,
    },
    statValue: {
        fontSize: 14.5,
        fontFamily: 'Urbanist_700Bold',
        color: '#1A1A1A',
    },
    statPriceValue: {
        fontSize: 14.5,
        fontFamily: 'Urbanist_700Bold',
        color: '#1A1A1A',
    },

    /* Trailing Column & Matching Action Pills */
    trailingCol: {
        width: 76,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 23,
    },
    actionPill: {
        width: 76,
        height: 28,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    actionPillText: {
        fontSize: 11,
        fontFamily: 'Urbanist_700Bold',
        textAlign: 'center',
    },
    badgeInStock: {
        backgroundColor: '#DFF3E3',
    },
    badgeLowStock: {
        backgroundColor: '#FBE1DE',
    },
    textInStock: {
        color: '#2FAE55',
    },
    textLowStock: {
        color: '#E5493F',
    },
    adjustBtn: {
        backgroundColor: '#F4F4F6',
        borderWidth: 1,
        borderColor: '#E2E2E6',
    },
    adjustBtnText: {
        color: '#2C2C2E',
    },
});
