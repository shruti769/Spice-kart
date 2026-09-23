import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { C } from '@/constants/theme';

/** 40×23 switch — lime when on, #DDDDD8 when off; knob slides 2.5px ↔ 19px. */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: () => void; label?: string }) {
  const v = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    v.value = withTiming(value ? 1 : 0, { duration: 180 });
  }, [value, v]);

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(v.value, [0, 1], [C.toggleOff, C.lime]),
  }));
  const knob = useAnimatedStyle(() => ({ left: 2.5 + v.value * 16.5 }));

  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label} onPress={onChange} hitSlop={6}>
      <Animated.View style={[{ width: 40, height: 23, borderRadius: 12 }, track]}>
        <Animated.View
          style={[
            { position: 'absolute', top: 2.5, width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
            knob,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}
