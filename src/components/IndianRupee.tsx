import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IndianRupeeProps {
    size?: number;
    color?: string;
    strokeWidth?: number;
    style?: any;
}

export const IndianRupee: React.FC<IndianRupeeProps> = ({
    size = 20,
    color = '#1A1A1A',
    strokeWidth = 2,
    style,
}) => {
    return (
        <Svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={style}
        >
            <Path d="M6 3h12" />
            <Path d="M6 8h12" />
            <Path d="M6 13l8.5 8" />
            <Path d="M6 13h3a4.5 4.5 0 0 0 0-9" />
        </Svg>
    );
};

export default IndianRupee;
