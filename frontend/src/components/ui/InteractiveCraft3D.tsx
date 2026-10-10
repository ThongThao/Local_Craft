import React, { useState, useRef, useEffect } from 'react';
import AppIcon from './AppIcon';

export const InteractiveCraft3D: React.FC = () => {
  const [rotation, setRotation] = useState<number>(15);
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [activeGlaze, setActiveGlaze] = useState<'ran' | 'lam' | 'ngoc'>('ran');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const startXRef = useRef<number>(0);
  const startRotRef = useRef<number>(0);

  // Auto rotate when active
  useEffect(() => {
    if (!isRotating || isDragging) return;
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 0.5) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, [isRotating, isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
    startRotRef.current = rotation;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const delta = e.clientX - startXRef.current;
    setRotation((startRotRef.current + delta * 0.7) % 360);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const glazePresets = {
    ran: {
      name: 'Men Rạn Cổ (Đời Lý)',
      temp: '1,250°C',
      color: '#D8C3A5',
      accent: '#984628',
      desc: 'Tro trấu & đá thạch anh sông Hồng nung lò bầu 72h',
    },
    lam: {
      name: 'Men Lam Trầm (Đời Lê)',
      temp: '1,300°C',
      color: '#6B8E9B',
      accent: '#173D35',
      desc: 'Oxit coban vẽ tay ngọn bút lông thỏ mịn',
    },
    ngoc: {
      name: 'Men Ngọc Celadon (Đời Trần)',
      temp: '1,280°C',
      color: '#9BB8A9',
      accent: '#40655C',
      desc: 'Sắc ngọc bích hoàng cung trong veo như sương mai',
    },
  };

  const currentGlaze = glazePresets[activeGlaze];

  return (
    <div
      className="craft-3d-turntable"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '460px',
        background: 'linear-gradient(145deg, rgba(23, 61, 53, 0.45) 0%, rgba(0, 39, 32, 0.85) 100%)',
        borderRadius: '24px',
        padding: '24px',
        border: '1px solid rgba(255, 219, 207, 0.15)',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(16px)',
        userSelect: 'none',
      }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#FFDBCF',
              boxShadow: '0 0 10px #FFDBCF',
              animation: 'pulseGlow 2s infinite',
            }}
          />
          <span
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: '#FFDBCF',
            }}
          >
            Trải nghiệm 3D Bàn Xoay Nghệ Nhân
          </span>
        </div>

        <button
          onClick={() => setIsRotating(!isRotating)}
          style={{
            background: isRotating ? 'rgba(255, 219, 207, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 219, 207, 0.25)',
            color: '#FCF9F3',
            borderRadius: '9999px',
            padding: '4px 10px',
            fontSize: '11px',
            fontFamily: "'Manrope', sans-serif",
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {isRotating ? '⏸ Dừng xoay' : '▶ Tự xoay 360°'}
        </button>
      </div>

      {/* 3D Pottery Stage */}
      <div
        style={{
          position: 'relative',
          height: '270px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isDragging ? 'grabbing' : 'grab',
          perspective: '800px',
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Ambient Ring light */}
        <div
          style={{
            position: 'absolute',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${currentGlaze.accent}40 0%, transparent 70%)`,
            filter: 'blur(30px)',
            pointerEvents: 'none',
          }}
        />

        {/* 3D Pottery Cylinder / Vase Visual Representation */}
        <div
          style={{
            position: 'relative',
            width: '160px',
            height: '220px',
            transform: `rotateY(${rotation}deg)`,
            transformStyle: 'preserve-3d',
            transition: isDragging ? 'none' : 'transform 0.05s linear',
          }}
        >
          {/* Vase Body */}
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '45% 45% 35% 35% / 25% 25% 65% 65%',
              background: `linear-gradient(${120 + Math.sin((rotation * Math.PI) / 180) * 45}deg, ${currentGlaze.color} 0%, #1a1a18 50%, ${currentGlaze.color} 100%)`,
              boxShadow: `
                0 25px 35px -10px rgba(0, 0, 0, 0.6),
                inset -15px -10px 25px rgba(0, 0, 0, 0.7),
                inset 15px 10px 25px rgba(255, 255, 255, 0.4)
              `,
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            {/* Craquelure Crackle lines pattern for men rạn */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.5,
                backgroundSize: '36px 36px',
                backgroundImage: `
                  radial-gradient(circle at 12px 12px, transparent 10px, rgba(50, 30, 20, 0.25) 11px),
                  linear-gradient(45deg, transparent 48%, rgba(80, 50, 30, 0.3) 50%, transparent 52%)
                `,
                mixBlendMode: 'multiply',
              }}
            />

            {/* Neck of vase */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '25%',
                width: '50%',
                height: '35px',
                borderRadius: '50% 50% 10% 10% / 30% 30% 10% 10%',
                background: `linear-gradient(90deg, rgba(0,0,0,0.5) 0%, ${currentGlaze.color} 50%, rgba(0,0,0,0.5) 100%)`,
                boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.6)',
              }}
            />

            {/* Traditional Lotus Blossom emblem on vase belly */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) rotateY(${-rotation * 0.2}deg)`,
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                border: '1px dashed rgba(152, 70, 40, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(2px)',
              }}
            >
              <AppIcon name="pottery" size={26} />
            </div>

            {/* Dynamic specular light highlight */}
            <div
              style={{
                position: 'absolute',
                top: '10%',
                left: `${35 + Math.sin((rotation * Math.PI) / 180) * 20}%`,
                width: '18px',
                height: '75%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.1) 100%)',
                filter: 'blur(4px)',
                borderRadius: '20px',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* Wooden Turntable Lathe Base */}
          <div
            style={{
              position: 'absolute',
              bottom: '-16px',
              left: '-20px',
              width: '200px',
              height: '24px',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse at center, #5c3826 0%, #2b170c 70%, #150904 100%)',
              boxShadow: '0 12px 25px rgba(0, 0, 0, 0.8), inset 0 2px 4px rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 219, 207, 0.2)',
            }}
          />
        </div>

        {/* Floating Tooltips */}
        <div
          style={{
            position: 'absolute',
            right: '8px',
            top: '25%',
            background: 'rgba(0, 39, 32, 0.85)',
            border: '1px solid rgba(255, 219, 207, 0.25)',
            padding: '6px 12px',
            borderRadius: '10px',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            animation: 'floatSlow 4s ease-in-out infinite',
          }}
        >
          <div style={{ fontSize: '10px', color: '#FFDBCF', fontFamily: "'Manrope', sans-serif" }}>Nhiệt độ nung</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#FCF9F3', fontFamily: "'Manrope', sans-serif" }}>
            {currentGlaze.temp}
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: '8px',
            bottom: '25%',
            background: 'rgba(0, 39, 32, 0.85)',
            border: '1px solid rgba(194, 235, 223, 0.25)',
            padding: '6px 12px',
            borderRadius: '10px',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            animation: 'floatSlow 4s ease-in-out infinite 2s',
          }}
        >
          <div style={{ fontSize: '10px', color: '#C2EBDF', fontFamily: "'Manrope', sans-serif" }}>Dòng men</div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#FCF9F3', fontFamily: "'Manrope', sans-serif" }}>
            {currentGlaze.name.split(' (')[0]}
          </div>
        </div>
      </div>

      {/* Glaze Selection Tabs */}
      <div style={{ marginTop: '16px' }}>
        <div
          style={{
            fontSize: '11px',
            color: 'rgba(252, 249, 243, 0.75)',
            fontFamily: "'Manrope', sans-serif",
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>Chọn sắc men truyền thống:</span>
          <span style={{ color: '#FFDBCF' }}>Kéo để xoay 360°</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {(['ran', 'lam', 'ngoc'] as const).map((key) => {
            const item = glazePresets[key];
            const isSel = activeGlaze === key;
            return (
              <button
                key={key}
                onClick={() => setActiveGlaze(key)}
                style={{
                  padding: '8px 6px',
                  borderRadius: '10px',
                  background: isSel ? 'rgba(255, 219, 207, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: isSel ? '1px solid #FFDBCF' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: isSel ? '#FCF9F3' : 'rgba(252, 249, 243, 0.7)',
                  fontSize: '11px',
                  fontFamily: "'Manrope', sans-serif",
                  fontWeight: isSel ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
              >
                {item.name.split(' (')[0]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InteractiveCraft3D;
