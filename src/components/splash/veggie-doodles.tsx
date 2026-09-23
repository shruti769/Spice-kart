import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

/** Faint line-art vegetables framing the splash screen. */

const STROKE = '#6FA37A';
const OPACITY = 0.24;

type DoodleProps = { style: ViewStyle; w: number; h: number; box: string; rotate?: number; children: ReactNode };

function Doodle({ style, w, h, box, rotate = 0, children }: DoodleProps) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: w, height: h, transform: [{ rotate: `${rotate}deg` }] }, style]}>
      <Svg width={w} height={h} viewBox={box} fill="none">
        <G stroke={STROKE} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" opacity={OPACITY}>
          {children}
        </G>
      </Svg>
    </View>
  );
}

export function VeggieDoodles() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* carrot — top left */}
      <Doodle style={{ left: 6, top: 2 }} w={80} h={142} box="0 0 80 140">
        <Path d="M58 40C66 48 64 60 56 70L14 132C10 137 5 133 8 128L40 52C44 42 52 36 58 40Z" />
        <Path d="M42 60l7 3M34 76l8 4M26 94l7 4M19 110l6 3" />
        <Path d="M58 40C60 25 58 13 51 3M60 40C67 27 73 17 78 9M61 43C71 36 77 31 80 22" />
      </Doodle>

      {/* broccoli — top centre */}
      <Doodle style={{ left: 134, top: 10 }} w={92} h={78} box="0 0 110 94">
        <Path d="M22 56C8 55 5 36 19 32C17 17 35 10 43 20C48 6 72 6 75 21C91 16 104 31 96 44C106 53 98 69 84 64C80 72 68 72 64 64C58 70 50 70 46 64C38 70 26 66 22 56Z" />
        <Path d="M34 34c4-4 10-3 12 1M58 28c4-4 10-3 12 1M78 42c4-3 9-1 10 3M30 48c3-3 8-2 9 2M56 46c3-3 8-2 9 2" />
        <Path d="M46 64L42 92H68L64 64M55 66v24" />
      </Doodle>

      {/* garlic — top right */}
      <Doodle style={{ right: 40, top: 12 }} w={70} h={90} box="0 0 70 92">
        <Path d="M35 10C38 22 44 30 56 42C68 54 64 80 44 84H26C6 80 2 54 14 42C26 30 32 22 35 10Z" />
        <Path d="M35 28C28 43 26 63 30 84M35 28C42 43 44 63 40 84M22 48C18 60 18 72 22 82M48 48C52 60 52 72 48 82" />
        <Path d="M33 2l2 8 2-8M30 86l-2 4M35 86v5M40 86l2 4" />
      </Doodle>

      {/* citrus slice — clipped by the right edge */}
      <Doodle style={{ right: -22, top: 30 }} w={58} h={72} box="0 0 58 72">
        <Circle cx={36} cy={36} r={30} />
        <Circle cx={36} cy={36} r={24} />
        <Path d="M36 14v44M14 36h44M21 21l30 30M51 21L21 51" />
      </Doodle>

      {/* peanut pod — right */}
      <Doodle style={{ right: 12, top: 152 }} w={76} h={58} box="0 0 80 60" rotate={-28}>
        <Path d="M8 30C8 16 25 11 33 19C39 25 43 25 49 19C57 11 74 15 72 31C70 46 55 49 49 42C43 36 39 36 33 42C25 50 8 45 8 30Z" />
        <Path d="M20 26h.01M26 34h.01M56 26h.01M62 34h.01M18 36h.01M60 22h.01" strokeWidth={2} />
      </Doodle>

      {/* parsley — left middle */}
      <Doodle style={{ left: -4, top: 292 }} w={70} h={82} box="0 0 70 82">
        <Path d="M0 78C18 62 32 44 42 26M14 66C26 62 38 64 50 58M26 52C28 42 26 34 20 26" />
        <Path d="M42 26C37 17 43 8 51 12C55 4 66 10 60 18C68 22 62 32 54 28C52 36 44 34 42 26Z" />
        <Path d="M50 58C48 49 55 42 62 46C68 40 76 50 68 54C72 62 62 68 58 62C54 68 46 64 50 58Z" />
        <Path d="M20 26C14 19 18 10 26 12C28 4 40 8 35 16C42 20 36 30 28 27C26 34 18 32 20 26Z" />
      </Doodle>

      {/* onion — bottom left */}
      <Doodle style={{ left: 6, bottom: 38 }} w={80} h={90} box="0 0 90 96">
        <Path d="M45 8C50 20 60 26 70 34C86 48 80 80 50 84H40C10 80 4 48 20 34C30 26 40 20 45 8Z" />
        <Path d="M45 18C36 35 32 60 40 84M45 18C54 35 58 60 50 84M45 18V84" />
        <Path d="M40 86l-4 5M45 86v6M50 86l4 5M44 8C42 3 45 0 48 1" />
      </Doodle>

      {/* pea pod — bottom centre-left */}
      <Doodle style={{ left: 122, bottom: 30 }} w={80} h={40} box="0 0 80 40" rotate={-8}>
        <Path d="M4 24C20 6 60 4 76 14C62 30 24 36 4 24Z" />
        <Circle cx={24} cy={21} r={5} />
        <Circle cx={38} cy={19} r={5} />
        <Circle cx={52} cy={17} r={5} />
        <Path d="M76 14l4-7" />
      </Doodle>

      {/* garlic — bottom centre */}
      <Doodle style={{ left: 208, bottom: 30 }} w={76} h={86} box="0 0 70 92" rotate={14}>
        <Path d="M35 10C38 22 44 30 56 42C68 54 64 80 44 84H26C6 80 2 54 14 42C26 30 32 22 35 10Z" />
        <Path d="M35 28C28 43 26 63 30 84M35 28C42 43 44 63 40 84" />
        <Path d="M33 2l2 8 2-8" />
      </Doodle>

      {/* bitter gourd — bottom right */}
      <Doodle style={{ right: 6, bottom: 30 }} w={92} h={132} box="0 0 90 130" rotate={18}>
        <Path d="M60 6C80 22 86 60 76 96C70 118 50 128 36 120C18 110 18 80 30 56C40 36 46 18 60 6Z" />
        <Path d="M60 6C62 1 66-1 70 1" />
        <Path d="M52 30c3 2 3 6 0 8M62 44c3 2 3 6 0 8M44 50c3 2 3 6 0 8M68 66c3 2 3 6 0 8M40 74c3 2 3 6 0 8M56 80c3 2 3 6 0 8M64 98c3 2 3 6 0 8M42 100c3 2 3 6 0 8" />
      </Doodle>
    </View>
  );
}
