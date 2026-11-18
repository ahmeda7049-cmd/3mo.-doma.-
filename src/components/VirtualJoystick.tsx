import React, { useRef, useState } from 'react';

interface VirtualJoystickProps {
  onChange: (angle: number, active: boolean) => void;
  disabled?: boolean;
  size?: number;
}

export function VirtualJoystick({
  onChange,
  disabled = false,
  size = 128,
}: VirtualJoystickProps) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [active, setActive] = useState(false);

  const knobSize = Math.round(size * 0.42);
  const maxTravel = size * 0.34;
  const deadZone = 8;

  const updateFromClientPos = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    const clamped = Math.min(dist, maxTravel);
    const kx = Math.cos(angle) * clamped;
    const ky = Math.sin(angle) * clamped;

    if (knobRef.current) {
      knobRef.current.style.transform = `translate3d(${kx}px, ${ky}px, 0)`;
    }

    if (dist >= deadZone) {
      onChange(angle, true);
    }
  };

  const resetKnob = () => {
    pointerIdRef.current = null;
    setActive(false);
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate3d(0px, 0px, 0)';
    }
    onChange(0, false);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    pointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setActive(true);
    updateFromClientPos(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    updateFromClientPos(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    resetKnob();
  };

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div
        ref={baseRef}
        role="application"
        aria-label="Snake steering joystick"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ width: size, height: size, touchAction: 'none' }}
        className={`relative rounded-full flex items-center justify-center border transition-colors duration-150 ${
          disabled
            ? 'bg-[#0C121D]/60 border-white/8 opacity-50'
            : active
              ? 'bg-[#0E1826] border-[#22FF88]/55 shadow-[0_0_24px_rgba(34,255,136,0.16)]'
              : 'bg-[#0D1420] border-white/14'
        }`}
      >
        {/* Inner alignment ring */}
        <div
          className="pointer-events-none absolute rounded-full border border-white/7"
          style={{ width: size * 0.58, height: size * 0.58 }}
        />

        {/* Crisp 4-way directional chevrons */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-2.5 left-1/2 -translate-x-1/2 w-2 h-2 border-t-2 border-l-2 border-slate-500/70 rotate-45"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 w-2 h-2 border-b-2 border-r-2 border-slate-500/70 rotate-45"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 border-b-2 border-l-2 border-slate-500/70 rotate-45"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 border-slate-500/70 rotate-45"
        />

        {/* Tactile Neon Thumb Puck */}
        <div
          ref={knobRef}
          style={{
            width: knobSize,
            height: knobSize,
            transition: active ? 'none' : 'transform 140ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className={`pointer-events-none rounded-full flex items-center justify-center border-2 ${
            active
              ? 'bg-[#22FF88]/25 border-[#22FF88] shadow-[0_0_18px_rgba(34,255,136,0.45)]'
              : 'bg-[#172234] border-[#22FF88]/65 shadow-[0_4px_12px_rgba(0,0,0,0.45)]'
          }`}
        >
          <div
            className={`w-3 h-3 rounded-full ${
              active ? 'bg-[#22FF88]' : 'bg-[#22FF88]/80'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
