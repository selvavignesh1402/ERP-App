import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';

interface ContainerProps {
    children: React.ReactNode;
    style?: ViewStyle;
}

export const Container: React.FC<ContainerProps> = ({ children, style }) => {
    return (
        <SafeAreaView style={[styles.container, style]} edges={['top', 'left', 'right']}>
            <View style={styles.content}>{children}</View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
        padding: 16,
    },
});
