import React, { useEffect, useRef } from 'react';
import { ViewStyle, Pressable, PressableProps, Animated, Easing, StyleSheet } from 'react-native';

// Types
export interface AnimProps {
    opacity?: number;
    scale?: number;
    translateX?: number;
    translateY?: number;
    rotate?: string; // e.g. '0deg' or '360deg'
}

export interface AnimeProps {
    delay?: number;
    duration?: number;
    easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'elastic' | 'bounce' | 'spring';
    from?: AnimProps;
    to?: AnimProps;
    trigger?: any;
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
}

// Helpers
const getEasing = (easingName: string) => {
    switch (easingName) {
        case 'linear':
            return Easing.linear;
        case 'ease':
            return Easing.ease;
        case 'ease-in':
            return Easing.in(Easing.ease);
        case 'ease-out':
            return Easing.out(Easing.ease);
        case 'ease-in-out':
            return Easing.inOut(Easing.ease);
        case 'elastic':
            return Easing.elastic(1.2);
        case 'bounce':
            return Easing.bounce;
        default:
            return Easing.quad;
    }
};

// 1. Core Animate Component
export const Anime: React.FC<AnimeProps> = ({
    delay = 0,
    duration = 600,
    easing = 'spring',
    from = { opacity: 0 },
    to = { opacity: 1 },
    trigger,
    children,
    style,
}) => {
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        progress.setValue(0);

        let anim: Animated.CompositeAnimation;
        if (easing === 'spring') {
            anim = Animated.spring(progress, {
                toValue: 1,
                tension: 40,
                friction: 7,
                useNativeDriver: true,
            });
        } else {
            anim = Animated.timing(progress, {
                toValue: 1,
                duration,
                easing: getEasing(easing),
                useNativeDriver: true,
            });
        }

        if (delay > 0) {
            Animated.sequence([
                Animated.delay(delay),
                anim
            ]).start();
        } else {
            anim.start();
        }
    }, [trigger]);

    const transformStyles: any[] = [];

    // Scale
    if (from.scale !== undefined || to.scale !== undefined) {
        const start = from.scale ?? 1;
        const end = to.scale ?? 1;
        transformStyles.push({
            scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [start, end],
            })
        });
    }

    // TranslateX
    if (from.translateX !== undefined || to.translateX !== undefined) {
        const start = from.translateX ?? 0;
        const end = to.translateX ?? 0;
        transformStyles.push({
            translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [start, end],
            })
        });
    }

    // TranslateY
    if (from.translateY !== undefined || to.translateY !== undefined) {
        const start = from.translateY ?? 0;
        const end = to.translateY ?? 0;
        transformStyles.push({
            translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [start, end],
            })
        });
    }

    // Rotate
    if (from.rotate !== undefined || to.rotate !== undefined) {
        const startStr = from.rotate ?? '0deg';
        const endStr = to.rotate ?? '0deg';
        transformStyles.push({
            rotate: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [startStr, endStr],
            })
        });
    }

    const animatedStyle: any = {};
    if (from.opacity !== undefined || to.opacity !== undefined) {
        const start = from.opacity ?? 1;
        const end = to.opacity ?? 1;
        animatedStyle.opacity = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [start, end],
        });
    }

    if (transformStyles.length > 0) {
        animatedStyle.transform = transformStyles;
    }

    return (
        <Animated.View style={[style, animatedStyle]}>
            {children}
        </Animated.View>
    );
};

Anime.displayName = 'Anime';

// 2. Stagger Animation Container
interface StaggerContainerProps {
    stagger?: number; // ms between items
    delay?: number; // initial delay
    children: React.ReactNode;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
    stagger = 100,
    delay = 0,
    children,
}) => {
    let index = 0;

    const recursiveMap = (childrenList: React.ReactNode): React.ReactNode => {
        return React.Children.map(childrenList, child => {
            if (!React.isValidElement(child)) {
                return child;
            }

            const childType = child.type as any;
            const isAnime = childType === Anime || childType.displayName === 'Anime';

            let childProps: any = {};
            if (isAnime) {
                childProps.delay = delay + index * stagger;
                index++;
            }

            // Also search inside standard React elements recursively
            if (child.props.children && !isAnime && typeof child.props.children !== 'function') {
                const childrenType = typeof child.props.children;
                if (childrenType === 'object') {
                    return React.cloneElement(child, {
                        ...child.props,
                        children: recursiveMap(child.props.children),
                    });
                }
            }

            return React.cloneElement(child, childProps);
        });
    };

    return <>{recursiveMap(children)}</>;
};

// 3. Convenience Wrappers
interface PresetProps {
    delay?: number;
    duration?: number;
    easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'elastic' | 'bounce' | 'spring';
    trigger?: any;
    style?: ViewStyle | ViewStyle[];
    children: React.ReactNode;
}

export const FadeInDown: React.FC<PresetProps> = (props) => (
    <Anime
        {...props}
        from={{ opacity: 0, translateY: 30 }}
        to={{ opacity: 1, translateY: 0 }}
    />
);
FadeInDown.displayName = 'Anime';

export const FadeInUp: React.FC<PresetProps> = (props) => (
    <Anime
        {...props}
        from={{ opacity: 0, translateY: -30 }}
        to={{ opacity: 1, translateY: 0 }}
    />
);
FadeInUp.displayName = 'Anime';

export const FadeInLeft: React.FC<PresetProps> = (props) => (
    <Anime
        {...props}
        from={{ opacity: 0, translateX: -30 }}
        to={{ opacity: 1, translateX: 0 }}
    />
);
FadeInLeft.displayName = 'Anime';

export const FadeInRight: React.FC<PresetProps> = (props) => (
    <Anime
        {...props}
        from={{ opacity: 0, translateX: 30 }}
        to={{ opacity: 1, translateX: 0 }}
    />
);
FadeInRight.displayName = 'Anime';

export const ScaleIn: React.FC<PresetProps> = (props) => (
    <Anime
        {...props}
        from={{ opacity: 0, scale: 0.7 }}
        to={{ opacity: 1, scale: 1 }}
    />
);
ScaleIn.displayName = 'Anime';

// 4. Interactive Tap Feedbacks (Spring Hover/Click effect)
export function useAnimePress(scaleTo = 0.96) {
    const scale = useRef(new Animated.Value(1)).current;

    const onPressIn = () => {
        Animated.spring(scale, {
            toValue: scaleTo,
            tension: 40,
            friction: 7,
            useNativeDriver: true,
        }).start();
    };

    const onPressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            tension: 40,
            friction: 7,
            useNativeDriver: true,
        }).start();
    };

    const animatedStyle = {
        transform: [{ scale }],
    };

    return {
        pressHandlers: {
            onPressIn,
            onPressOut,
        },
        animatedStyle,
    };
}

// 5. Animated Clickable Container
interface AnimatedPressableProps extends PressableProps {
    scaleTo?: number;
    style?: ViewStyle | ViewStyle[];
    children: React.ReactNode;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
    scaleTo = 0.96,
    style,
    children,
    ...props
}) => {
    const { pressHandlers, animatedStyle } = useAnimePress(scaleTo);

    const flattenedStyle: any = StyleSheet.flatten(style) || {};
    const innerStyle: ViewStyle = {
        width: '100%',
        flexDirection: flattenedStyle.flexDirection || 'column',
        alignItems: flattenedStyle.alignItems || 'stretch',
        justifyContent: flattenedStyle.justifyContent || 'flex-start',
    };

    return (
        <Pressable style={style} {...props} {...pressHandlers}>
            {({ pressed }) => (
                <Animated.View style={[innerStyle, animatedStyle]}>
                    {typeof children === 'function' ? (children as any)({ pressed }) : children}
                </Animated.View>
            )}
        </Pressable>
    );
};
