import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Colors } from '../theme/colors';

interface InventoryCardProps {
    name: string;
    supplier: string;
    stock: number;
    price: number;
    image?: any; // For placeholder image
}

export const InventoryCard: React.FC<InventoryCardProps> = ({
    name,
    supplier,
    stock,
    price,
    image
}) => {
    return (
        <View style={styles.card}>
            <View style={styles.imageContainer}>
                {/* Use the rice bag image */}
                <Image
                    source={image || require('../../assets/rice_bag.png')}
                    style={styles.image}
                    resizeMode="contain"
                />
                <View style={styles.weightTag}>
                    <Text style={styles.weightText}>25kg</Text>
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={styles.name} numberOfLines={1}>{name}</Text>
                    <Text style={styles.price}>₹{price}</Text>
                </View>

                <Text style={styles.supplier} numberOfLines={1}>{supplier}</Text>

                <View style={styles.footer}>
                    <View>
                        <Text style={styles.label}>STOCK</Text>
                        <Text style={styles.stock}>{stock} bags</Text>
                    </View>

                    <Pressable style={styles.editBtn}>
                        <Text style={styles.editBtnText}>Edit</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.card,
        borderRadius: 20,
        padding: 12,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    imageContainer: {
        height: 180,
        backgroundColor: 'white',
        borderRadius: 16,
        marginBottom: 12,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    image: {
        width: '80%',
        height: '80%',
    },
    weightTag: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: Colors.card,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    weightText: {
        fontSize: 10,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
    },
    content: {
        paddingHorizontal: 4,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        fontSize: 16,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
        flex: 1,
        marginRight: 8,
    },
    price: {
        fontSize: 16,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.primary,
    },
    supplier: {
        fontSize: 13,
        fontFamily: 'Urbanist_500Medium',
        color: Colors.textSecondary,
        marginBottom: 12,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingTop: 12,
    },
    label: {
        fontSize: 10,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    stock: {
        fontSize: 14,
        fontFamily: 'Urbanist_700Bold',
        color: Colors.text,
    },
    editBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    editBtnText: {
        fontSize: 12,
        fontFamily: 'Urbanist_600SemiBold',
        color: Colors.text,
    }
});
