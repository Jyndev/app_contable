import { useState, useEffect } from 'react';
import { Keyboard, Platform, KeyboardEvent } from 'react-native';

/**
 * Hook to reliably track keyboard height and compute bottom padding
 * for bottom sheet modals, fixing Android Modal statusBarTranslucent issues.
 */
export function useKeyboardBottomInset(minInset = 0) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => {
      const height = e.endCoordinates?.height || 0;
      setKeyboardHeight(height);
    };

    const onHide = () => {
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const bottomInset = keyboardHeight > 0 ? keyboardHeight : Math.max(minInset, 16);
  const isKeyboardVisible = keyboardHeight > 0;

  return {
    keyboardHeight,
    bottomInset,
    isKeyboardVisible,
  };
}
