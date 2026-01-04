import React from 'react';
import { Text } from 'react-native';
import { Container } from '../src/components/Container';
import { Typography } from '../src/theme/typography';
import { Colors } from '../src/theme/colors';

export default function Reports() {
    return (
        <Container>
            <Text style={{ fontFamily: Typography.fontFamily.bold, fontSize: 24, padding: 16, color: Colors.text }}>Reports & Analytics</Text>
        </Container>
    );
}
