import * as React from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  useReducedMotion,
  type MotionValue,
} from 'motion/react';
import { cn } from '../lib/utils';

export interface DockItemData {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon component or image URL */
  icon: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Whether item is active */
  isActive?: boolean;
  /** Badge count */
  badge?: number;
}

export interface MagneticDockProps {
  /** Array of dock items */
  items: DockItemData[];
  /** Size of icons in pixels */
  iconSize?: number;
  /** Maximum scale on hover */
  maxScale?: number;
  /** Distance of magnetic effect in pixels */
  magneticDistance?: number;
  /** Show labels on hover */
  showLabels?: boolean;
  /** Dock position */
  position?: 'bottom' | 'top' | 'left' | 'right';
  /** Background style */
  variant?: 'glass' | 'solid' | 'transparent';
  /** Custom class name */
  className?: string;
}

interface DockItemProps {
  item: DockItemData;
  mouseX: MotionValue<number>;
  iconSize: number;
  maxScale: number;
  magneticDistance: number;
  showLabels: boolean;
  isVertical: boolean;
  reducedMotion: boolean;
}

function DockItem({
  item,
  mouseX,
  iconSize,
  maxScale,
  magneticDistance,
  showLabels,
  isVertical,
  reducedMotion,
}: DockItemProps) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const showLabel = showLabels && (isHovered || isFocused);

  // Calculate distance from mouse to center of item
  const distance = useTransform(mouseX, (val: number) => {
    if (!ref.current) return magneticDistance + 1;
    const rect = ref.current.getBoundingClientRect();
    const center = isVertical
      ? rect.top + rect.height / 2
      : rect.left + rect.width / 2;
    return val - center;
  });

  // Scale based on distance - closer = larger
  const scale = useTransform(
    distance,
    [-magneticDistance, 0, magneticDistance],
    [1, maxScale, 1]
  );

  // Apply spring physics for smooth animation
  const springConfig = { damping: 20, stiffness: 300, mass: 0.5 };
  const smoothScale = useSpring(scale, springConfig);

  // Calculate the size based on scale
  const size = useTransform(smoothScale, (s) => s * iconSize);

  // Floating effect
  const y = useTransform(smoothScale, (s) => (s - 1) * -8);
  const smoothY = useSpring(y, springConfig);

  return (
    <motion.button
      ref={ref}
      type="button"
      tabIndex={0}
      aria-label={item.label}
      aria-current={item.isActive ? 'page' : undefined}
      onClick={item.onClick}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative flex items-center justify-center shrink-0 cursor-pointer',
        'rounded-xl transition-colors duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
        item.isActive && 'bg-amber-500/15'
      )}
      style={{
        width: reducedMotion ? iconSize : size,
        height: reducedMotion ? iconSize : size,
        y: reducedMotion || isVertical ? 0 : smoothY,
        x: reducedMotion || !isVertical ? 0 : smoothY,
      }}
      whileTap={reducedMotion ? undefined : { scale: 0.92 }}
    >
      {/* Icon Container */}
      <motion.div
        className={cn(
          'relative w-full h-full rounded-xl overflow-hidden',
          'bg-gradient-to-b from-[#221f1a] to-[#121110]',
          'backdrop-blur-md',
          'border transition-colors duration-200',
          item.isActive
            ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
            : 'border-white/10 hover:border-amber-500/40',
          'shadow-lg shadow-black/40',
          'flex items-center justify-center'
        )}
        style={{
          boxShadow: isHovered
            ? '0 8px 24px rgba(245,158,11,0.2), inset 0 1px 0 rgba(255,255,255,0.2)'
            : item.isActive
            ? '0 4px 16px rgba(245,158,11,0.2), inset 0 1px 0 rgba(245,158,11,0.3)'
            : '0 4px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* Icon */}
        <div
          aria-hidden="true"
          className={cn(
            'w-[58%] h-[58%] flex items-center justify-center transition-colors duration-200',
            item.isActive ? 'text-amber-400' : 'text-neutral-300 group-hover:text-white'
          )}
        >
          {item.icon}
        </div>

        {/* Golden Shine effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, rgba(245,158,11,0.25) 0%, transparent 50%, transparent 100%)',
            opacity: isHovered ? 0.9 : item.isActive ? 0.6 : 0.25,
          }}
        />
      </motion.div>

      {/* Badge */}
      <AnimatePresence initial={false}>
        {item.badge !== undefined && item.badge > 0 && (
          <motion.div
            initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
            className={cn(
              'absolute -top-1 -right-1',
              'min-w-[18px] h-4.5 px-1',
              'rounded-full',
              'bg-amber-500',
              'text-black text-[10px] font-bold',
              'flex items-center justify-center',
              'border border-black',
              'shadow-md'
            )}
          >
            {item.badge > 99 ? '99+' : item.badge}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Indicator Pip */}
      <AnimatePresence initial={false}>
        {item.isActive && (
          <motion.div
            initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
            className={cn(
              'absolute -bottom-1.5',
              'w-1.5 h-1.5 rounded-full',
              'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)]'
            )}
          />
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <AnimatePresence initial={false}>
        {showLabel && (
          <motion.div
            aria-hidden="true"
            initial={reducedMotion ? false : { opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.92 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'absolute -top-9 left-1/2 -translate-x-1/2',
              'px-2.5 py-1 rounded-lg',
              'bg-[#121110]/95',
              'backdrop-blur-md',
              'text-amber-200 text-[11px] font-serif font-medium tracking-wide whitespace-nowrap',
              'border border-amber-500/30',
              'shadow-xl shadow-black/50',
              'pointer-events-none z-50'
            )}
          >
            {item.label}
            {/* Tooltip arrow */}
            <div
              className={cn(
                'absolute left-1/2 -translate-x-1/2 -bottom-1',
                'w-2 h-2 rotate-45',
                'bg-[#121110]',
                'border-r border-b border-amber-500/30'
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover glow */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        animate={{
          boxShadow: isHovered
            ? '0 0 20px rgba(245,158,11,0.2)'
            : '0 0 0px rgba(245,158,11,0)',
        }}
        transition={{ duration: 0.25 }}
      />
    </motion.button>
  );
}

export function MagneticDock({
  items,
  iconSize = 42,
  maxScale = 1.3,
  magneticDistance = 120,
  showLabels = true,
  position = 'top',
  variant = 'glass',
  className,
}: MagneticDockProps) {
  const mousePosition = useMotionValue(Infinity);
  const reducedMotion = useReducedMotion() ?? false;
  const isVertical = position === 'left' || position === 'right';

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (isVertical) {
        mousePosition.set(e.clientY);
      } else {
        mousePosition.set(e.clientX);
      }
    },
    [mousePosition, isVertical]
  );

  const handleMouseLeave = () => {
    mousePosition.set(Infinity);
  };

  const variantStyles = {
    glass: cn(
      'bg-[#121110]/90',
      'backdrop-blur-xl',
      'border border-amber-500/20'
    ),
    solid: cn(
      'bg-[#181614]',
      'border border-amber-500/30'
    ),
    transparent: 'bg-transparent border-0',
  };

  const positionStyles = {
    bottom: 'flex-row',
    top: 'flex-row',
    left: 'flex-col',
    right: 'flex-col',
  };

  return (
    <motion.div
      onMouseMove={reducedMotion ? undefined : handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'inline-flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl',
        variantStyles[variant],
        positionStyles[position],
        'shadow-xl shadow-black/30',
        className
      )}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {items.map((item) => (
        <DockItem
          key={item.id}
          item={item}
          mouseX={mousePosition}
          iconSize={iconSize}
          maxScale={maxScale}
          magneticDistance={magneticDistance}
          showLabels={showLabels}
          isVertical={isVertical}
          reducedMotion={reducedMotion}
        />
      ))}
    </motion.div>
  );
}

import { Home, BookOpen, Target, Swords, Trophy, Sparkles } from 'lucide-react';

// Preset Lucide React icons matching exact app requirements
export function DockIconHome({ className }: { className?: string }) {
  return <Home className={cn('w-5 h-5 text-amber-200', className)} />;
}

export function DockIconLearn({ className }: { className?: string }) {
  return <BookOpen className={cn('w-5 h-5 text-amber-200', className)} />;
}
export const DockIconFolder = DockIconLearn;

export function DockIconPractice({ className }: { className?: string }) {
  return <Target className={cn('w-5 h-5 text-amber-200', className)} />;
}
export const DockIconSearch = DockIconPractice;

export function DockIconBattle({ className }: { className?: string }) {
  return <Swords className={cn('w-5 h-5 text-amber-200', className)} />;
}
export const DockIconMusic = DockIconBattle;

export function DockIconLeaderboard({ className }: { className?: string }) {
  return <Trophy className={cn('w-5 h-5 text-amber-200', className)} />;
}
export const DockIconMail = DockIconLeaderboard;

export function DockIconAskGuru({ className }: { className?: string }) {
  return <Sparkles className={cn('w-5 h-5 text-amber-200', className)} />;
}
export const DockIconSettings = DockIconAskGuru;

