import React from 'react';

// Import SVG assets directly from assets folder
import icon1 from '../../assets/Icons/Icon-1.svg';
import icon2 from '../../assets/Icons/Icon-2.svg';
import icon3 from '../../assets/Icons/Icon-3.svg';
import icon4 from '../../assets/Icons/Icon-4.svg';
import icon5 from '../../assets/Icons/Icon-5.svg';
import icon6 from '../../assets/Icons/Icon-6.svg';
import icon7 from '../../assets/Icons/Icon-7.svg';
import icon8 from '../../assets/Icons/Icon-8.svg';
import icon9 from '../../assets/Icons/Icon-9.svg';
import icon10 from '../../assets/Icons/Icon-10.svg';
import icon15 from '../../assets/Icons/Icon-15.svg';
import icon16 from '../../assets/Icons/Icon-16.svg';
import icon17 from '../../assets/Icons/Icon-17.svg';
import icon19 from '../../assets/Icons/Icon-19.svg';
import icon20 from '../../assets/Icons/Icon-20.svg';
import icon21 from '../../assets/Icons/Icon-21.svg';
import icon22 from '../../assets/Icons/Icon-22.svg';
import icon23 from '../../assets/Icons/Icon-23.svg';
import iconCraft from '../../assets/Icons/Icon.svg';

import icon11 from '../../assets/Icons/Section - SECTION 2_ CRAFT VILLAGES (Bento/Icon-11.svg';
import icon12 from '../../assets/Icons/Section - SECTION 2_ CRAFT VILLAGES (Bento/Icon-12.svg';
import icon13 from '../../assets/Icons/Section - SECTION 2_ CRAFT VILLAGES (Bento/Icon-13.svg';
import icon14 from '../../assets/Icons/Section - SECTION 2_ CRAFT VILLAGES (Bento/Icon-14.svg';
import icon18 from '../../assets/Icons/Section - SECTION 2_ CRAFT VILLAGES (Bento/Icon-18.svg';

export type IconName =
  | 'pin'
  | 'search'
  | 'support'
  | 'shield'
  | 'arrow-right-sm'
  | 'heart'
  | 'arrow-right'
  | 'medal'
  | 'clock'
  | 'clock-bento'
  | 'sparkle'
  | 'badge'
  | 'leaf'
  | 'play'
  | 'arrow-diagonal'
  | 'compass'
  | 'user'
  | 'star'
  | 'arrow-right-white'
  | 'tools'
  | 'craft'
  | 'pottery'
  | 'incense'
  | 'palette'
  | 'slant-arrow';

const iconMap: Record<IconName, string> = {
  pin: icon1,
  search: icon2,
  support: icon3,
  shield: icon4,
  'arrow-right-sm': icon5,
  heart: icon6,
  'arrow-right': icon7,
  medal: icon8,
  clock: icon9,
  'clock-bento': icon14,
  sparkle: icon10,
  badge: icon15,
  leaf: icon16,
  play: icon17,
  'arrow-diagonal': icon19,
  compass: icon20,
  user: icon21,
  star: icon22,
  'arrow-right-white': icon23,
  tools: iconCraft,
  craft: icon16,
  pottery: icon12,
  incense: icon13,
  palette: icon18,
  'slant-arrow': icon11,
};

interface AppIconProps {
  name: IconName;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 16,
  className = '',
  style,
  alt = '',
}) => {
  const src = iconMap[name] || iconCraft;

  return (
    <img
      src={src}
      alt={alt || name}
      className={`app-icon app-icon-${name} ${className}`}
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
        display: 'inline-block',
        objectFit: 'contain',
        verticalAlign: 'middle',
        ...style,
      }}
      loading="lazy"
    />
  );
};

export default AppIcon;
