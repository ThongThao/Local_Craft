import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  hue: number;
  pulseSpeed: number;
}

interface CraftParticlesProps {
  count?: number;
  className?: string;
  colorScheme?: 'gold' | 'terracotta' | 'emerald';
}

export const CraftParticles: React.FC<CraftParticlesProps> = ({
  count = 28,
  className = '',
  colorScheme = 'gold',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.5 + 0.8,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: -Math.random() * 0.5 - 0.2, // float upwards like embers/dust
        opacity: Math.random() * 0.6 + 0.2,
        hue: colorScheme === 'gold' ? 38 : colorScheme === 'terracotta' ? 18 : 160,
        pulseSpeed: Math.random() * 0.02 + 0.008,
      });
    }

    let tick = 0;

    const render = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.speedX + Math.sin(tick * 0.015 + p.y * 0.01) * 0.3;
        p.y += p.speedY;

        // Wrap around
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const currentOpacity =
          p.opacity * (0.6 + 0.4 * Math.sin(tick * p.pulseSpeed + p.x));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

        if (colorScheme === 'gold') {
          ctx.fillStyle = `rgba(255, 219, 180, ${currentOpacity})`;
          ctx.shadowColor = 'rgba(255, 180, 80, 0.4)';
        } else if (colorScheme === 'terracotta') {
          ctx.fillStyle = `rgba(220, 110, 70, ${currentOpacity})`;
          ctx.shadowColor = 'rgba(152, 70, 40, 0.5)';
        } else {
          ctx.fillStyle = `rgba(194, 235, 223, ${currentOpacity})`;
          ctx.shadowColor = 'rgba(64, 101, 92, 0.4)';
        }

        ctx.shadowBlur = 8;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [count, colorScheme]);

  return (
    <canvas
      ref={canvasRef}
      className={`craft-particles-canvas ${className}`}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
};

export default CraftParticles;
