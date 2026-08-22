import React, { useEffect, useRef } from 'react';

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'rect' | 'circle' | 'petal' | 'star';
  life: number;
  maxLife: number;
}

interface ConfettiCanvasProps {
  active?: boolean;
  duration?: number; // ms
  particleCount?: number;
  onComplete?: () => void;
  className?: string;
}

const GOLD_PALETTE = [
  '#F5DEB3', // wheat ivory
  '#DFC386', // soft gold
  '#C5A059', // royal antique gold
  '#E6CA65', // bright radiant gold
  '#B8860B', // deep dark goldenrod
  '#E89234', // sacred saffron
  '#F4A460', // sandy amber
  '#FFFFFF', // pure diamond spark
];

export const ConfettiCanvas: React.FC<ConfettiCanvasProps> = ({
  active = true,
  duration = 4000,
  particleCount = 65,
  onComplete,
  className = 'pointer-events-none fixed inset-0 z-50',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const particles: ConfettiParticle[] = [];
    const shapes: ('rect' | 'circle' | 'petal' | 'star')[] = ['rect', 'circle', 'petal', 'star'];

    // Spawn initial particles from top and center bursts
    for (let i = 0; i < particleCount; i++) {
      const isBurst = i < particleCount * 0.5;
      const startX = isBurst ? width * 0.5 + (Math.random() - 0.5) * 120 : Math.random() * width;
      const startY = isBurst ? height * 0.45 + (Math.random() - 0.5) * 60 : -20 - Math.random() * 50;

      const angle = isBurst
        ? Math.PI * 1.5 + (Math.random() - 0.5) * 1.8 // upward fan
        : Math.PI * 0.5 + (Math.random() - 0.5) * 0.5; // downward drift

      const speed = isBurst ? Math.random() * 9 + 4 : Math.random() * 3 + 1.5;

      particles.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 1.5,
        vy: isBurst ? Math.sin(angle) * speed : Math.random() * 2 + 2,
        size: Math.random() * 8 + 4,
        color: GOLD_PALETTE[Math.floor(Math.random() * GOLD_PALETTE.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        opacity: 1,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        life: 0,
        maxLife: Math.random() * 120 + 90,
      });
    }

    let animationFrameId: number;
    const startTime = performance.now();

    const render = (now: number) => {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, width, height);

      let aliveCount = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;

        // Update physics
        p.vy += 0.08; // subtle gravity
        p.vx *= 0.985; // drag
        p.x += p.vx + Math.sin(p.life * 0.05) * 0.7; // gentle air flutter
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Fade out toward end
        const progress = p.life / p.maxLife;
        if (progress < 0.7) {
          p.opacity = 1;
        } else {
          p.opacity = Math.max(0, 1 - (progress - 0.7) / 0.3);
        }

        if (p.opacity > 0.01 && p.y < height + 40) {
          aliveCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;

          if (p.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.shape === 'petal') {
            // Sacred lotus petal curve
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size * 0.4, p.size * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.shape === 'star') {
            // 4-point diamond star spark
            ctx.beginPath();
            ctx.moveTo(0, -p.size);
            ctx.lineTo(p.size * 0.3, -p.size * 0.3);
            ctx.lineTo(p.size, 0);
            ctx.lineTo(p.size * 0.3, p.size * 0.3);
            ctx.lineTo(0, p.size);
            ctx.lineTo(-p.size * 0.3, p.size * 0.3);
            ctx.lineTo(-p.size, 0);
            ctx.lineTo(-p.size * 0.3, -p.size * 0.3);
            ctx.closePath();
            ctx.fill();
          } else {
            // Rectangular confetti leaf
            ctx.fillRect(-p.size * 0.5, -p.size * 0.3, p.size, p.size * 0.6);
          }

          ctx.restore();
        }
      }

      if (aliveCount > 0 && elapsed < duration) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
        if (onComplete) {
          onComplete();
        }
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [active, duration, particleCount, onComplete]);

  if (!active) return null;

  return <canvas ref={canvasRef} className={className} />;
};
