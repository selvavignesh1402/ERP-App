import { Alert, Platform } from 'react-native';

export type AlertButton = {
    text?: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
};

export type AlertOptions = {
    cancelable?: boolean;
    onDismiss?: () => void;
};

export function polyfillWebAlert() {
    if (Platform.OS !== 'web') {
        return;
    }

    Alert.alert = (
        title: string,
        message?: string,
        buttons?: AlertButton[],
        _options?: AlertOptions
    ) => {
        const fullMessage = [title, message].filter(Boolean).join('\n\n');

        // Case 1: No buttons or 0 buttons (simple information alert)
        if (!buttons || buttons.length === 0) {
            if (typeof window !== 'undefined' && typeof window.alert === 'function') {
                window.alert(fullMessage);
            }
            return;
        }

        // Case 2: Single button (acknowledgement, e.g. [{ text: 'OK', onPress }])
        if (buttons.length === 1) {
            if (typeof window !== 'undefined' && typeof window.alert === 'function') {
                window.alert(fullMessage);
            }
            try {
                buttons[0]?.onPress?.();
            } catch (err) {
                console.error('Alert: error executing button onPress on web', err);
            }
            return;
        }

        // Case 3: Multiple buttons (typically Cancel + Confirm)
        const cancelBtn =
            buttons.find((b) => b.style === 'cancel') ||
            buttons.find((b) => /^(cancel|no|close|dismiss)$/i.test(b.text || '')) ||
            buttons[0];

        const confirmBtn =
            buttons.find((b) => b !== cancelBtn && b.style !== 'cancel') ||
            buttons.find((b) => b !== cancelBtn) ||
            buttons[buttons.length - 1];

        if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
            const confirmed = window.confirm(fullMessage);
            if (confirmed) {
                try {
                    confirmBtn?.onPress?.();
                } catch (err) {
                    console.error('Alert: error executing confirm onPress on web', err);
                }
            } else {
                try {
                    cancelBtn?.onPress?.();
                } catch (err) {
                    console.error('Alert: error executing cancel onPress on web', err);
                }
            }
        } else {
            // Fallback if window.confirm is not defined
            try {
                confirmBtn?.onPress?.();
            } catch (err) {
                console.error('Alert: error executing fallback confirm onPress on web', err);
            }
        }
    };
}

// Automatically apply polyfill on import
polyfillWebAlert();
