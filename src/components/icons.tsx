import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** Icons shared by several screens. Paths are copied from the prototype's inline SVGs. */

type P = { size?: number; color?: string };

export const BackIcon = ({ size = 16, color = '#1F1F1F' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path d="M10 2L4 8l6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const SearchIcon = ({ size = 16, color = '#6E6E68' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Circle cx={9} cy={9} r={6.2} stroke={color} strokeWidth={1.7} />
    <Path d="M13.6 13.6L18 18" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
  </Svg>
);

export const PersonIcon = ({ size = 18, color = '#0B3D1F' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Circle cx={10} cy={7} r={3.4} stroke={color} strokeWidth={1.6} />
    <Path d="M3.8 17c.9-3 3.3-4.6 6.2-4.6s5.3 1.6 6.2 4.6" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

export const CartIcon =({ size = 18, color = '#0B3D1F' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path d="M3 4h2l1.8 9.2h8.6L17 6.5H6" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={8} cy={17} r={1.4} fill={color} />
    <Circle cx={15} cy={17} r={1.4} fill={color} />
  </Svg>
);

export const ChevronDown = ({ size = 9, color = '#4C6B52' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <Path d="M2.5 4.5L6 8l3.5-3.5" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
  </Svg>
);

/** Row chevron: `<svg width="6" height="11" viewBox="0 0 8 14">` */
export const ChevronRight = ({ color = '#BDBDB8' }: { color?: string }) => (
  <Svg width={6} height={11} viewBox="0 0 8 14" fill="none">
    <Path d="M1 1l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const PinIcon = ({ size = 18, color = '#0B7A32' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path d="M10 18s6-5.2 6-9.5A6 6 0 004 8.5C4 12.8 10 18 10 18z" stroke={color} strokeWidth={1.7} />
    <Circle cx={10} cy={8.5} r={2} fill={color} />
  </Svg>
);

export const ShieldIcon = ({ size = 16, color = '#0B7A32' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    <Path d="M9 12l2.2 2.2L15.5 10" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const WalletIcon = ({ size = 15, color = '#0B7A32' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Circle cx={10} cy={10} r={7.2} stroke={color} strokeWidth={1.6} />
    <Path d="M7.6 7.3h4.2M7.6 9.6h4.2M8.8 12.9l2.6-5.6" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

export const TruckIcon = ({ size = 24, color = '#8BE000' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M2.5 7.5h10v9h-10v-9z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    <Path d="M12.5 10.5H17l3 3v3h-7.5v-6z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    <Circle cx={6.5} cy={18} r={1.8} stroke={color} strokeWidth={1.6} />
    <Circle cx={16} cy={18} r={1.8} stroke={color} strokeWidth={1.6} />
  </Svg>
);

// Bottom navigation
export const NavHomeIcon = ({ size = 20, color = '#9BA9A0' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <Path d="M3.5 9.5L11 3.5l7.5 6V18a1 1 0 01-1 1h-13a1 1 0 01-1-1V9.5z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
  </Svg>
);

export const NavCatsIcon = ({ size = 20, color = '#9BA9A0' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <Rect x={3.5} y={3.5} width={6.5} height={6.5} rx={1.5} stroke={color} strokeWidth={1.7} />
    <Rect x={12} y={3.5} width={6.5} height={6.5} rx={1.5} stroke={color} strokeWidth={1.7} />
    <Rect x={3.5} y={12} width={6.5} height={6.5} rx={1.5} stroke={color} strokeWidth={1.7} />
    <Rect x={12} y={12} width={6.5} height={6.5} rx={1.5} stroke={color} strokeWidth={1.7} />
  </Svg>
);

export const NavSearchIcon = ({ size = 20, color = '#9BA9A0' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <Circle cx={10} cy={10} r={6.2} stroke={color} strokeWidth={1.7} />
    <Path d="M14.6 14.6L19 19" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
  </Svg>
);

export const NavOrdersIcon = ({ size = 20, color = '#9BA9A0' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <Rect x={4.5} y={3.5} width={13} height={15} rx={1.5} stroke={color} strokeWidth={1.7} />
    <Path d="M8 8h6M8 11.5h6M8 15h3.5" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
  </Svg>
);
