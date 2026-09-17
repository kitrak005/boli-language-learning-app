import React, { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';
import { cn } from '@/lib/utils';

export interface VoicePoweredOrbProps {
  /**
   * Real-time audio energy level from 0 to 1
   */
  audioLevel?: number;
  /**
   * Callback fired when voice/audio energy is detected
   */
  onVoiceDetected?: (level: number) => void;
  /**
   * Whether the AI Guru voice agent is currently generating speech
   */
  isSpeaking?: boolean;
  /**
   * Whether the user microphone is active and listening
   */
  isListening?: boolean;
  /**
   * General session active state
   */
  isActive?: boolean;
  className?: string;
}

const vertexShader = /* glsl */ `
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uAudioLevel;
  uniform float uIsSpeaking;
  uniform float uIsListening;
  uniform vec2 uResolution;
  varying vec2 vUv;

  // 2D Simplex Noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,
                        0.366025403784439,
                       -0.577350269189626,
                        0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
    float dist = length(uv);

    // Audio reactivity & fluid speed
    float energy = clamp(uAudioLevel, 0.0, 1.0);
    float speed = uTime * (0.6 + energy * 1.2 + uIsSpeaking * 0.8);

    // Smooth spherical undulations (contained within circular boundary)
    float angle = atan(uv.y, uv.x);
    float n1 = snoise(vec2(cos(angle * 2.0) * 1.2 + speed * 0.4, sin(angle * 2.0) * 1.2 + speed * 0.4));
    float n2 = snoise(vec2(uv.x * 2.5 - speed * 0.3, uv.y * 2.5 + speed * 0.3));
    
    // Controlled subtle organic wave — prevents spiky distortion
    float subtleDistortion = (n1 * 0.025 + n2 * 0.015) * (1.0 + energy * 0.8);
    float orbDist = dist + subtleDistortion;

    // Radius parameters
    float baseRadius = 0.28 + energy * 0.04 + sin(speed * 0.9) * 0.01;

    // Sacred Solar Colors
    vec3 whiteCore = vec3(1.0, 0.99, 0.94);     // Pure luminous white-gold
    vec3 goldenAmber = vec3(1.0, 0.82, 0.36);    // Rich vibrant gold (#DFC386)
    vec3 deepOchre = vec3(0.77, 0.55, 0.20);      // Classical Sanskrit gold (#C5A059)
    vec3 haloGlow = vec3(0.85, 0.48, 0.12);       // Ambient solar warmth

    // Radial gradient layers
    float core = smoothstep(baseRadius * 0.75, baseRadius * 0.2, orbDist);
    float body = smoothstep(baseRadius * 1.05, baseRadius * 0.6, orbDist);
    float aura = exp(-dist * (4.5 - energy * 1.2));
    float outerRing = exp(-pow(dist - 0.36, 2.0) * 220.0) * (0.25 + energy * 0.3);

    // Composite radiant color
    vec3 col = mix(deepOchre, goldenAmber, body);
    col = mix(col, whiteCore, core);
    col += haloGlow * aura * (0.6 + energy * 0.6);
    col += goldenAmber * outerRing;

    // Strict containment mask so it never spills outside circle
    float alpha = clamp(core + body * 0.95 + aura * 0.8 + outerRing, 0.0, 1.0);
    alpha *= smoothstep(0.44, 0.38, dist);

    gl_FragColor = vec4(col, alpha);
  }
`;

export const VoicePoweredOrb: React.FC<VoicePoweredOrbProps> = ({
  audioLevel = 0,
  onVoiceDetected,
  isSpeaking = false,
  isListening = false,
  isActive = true,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioLevelRef = useRef<number>(audioLevel);
  const isSpeakingRef = useRef<boolean>(isSpeaking);
  const isListeningRef = useRef<boolean>(isListening);
  const isActiveRef = useRef<boolean>(isActive);

  audioLevelRef.current = audioLevel;
  isSpeakingRef.current = isSpeaking;
  isListeningRef.current = isListening;
  isActiveRef.current = isActive;

  useEffect(() => {
    if (onVoiceDetected && audioLevel > 0.05) {
      onVoiceDetected(audioLevel);
    }
  }, [audioLevel, onVoiceDetected]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId: number;
    let renderer: Renderer | null = null;
    let program: Program | null = null;

    try {
      renderer = new Renderer({
        alpha: true,
        antialias: true,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });

      const gl = renderer.gl;
      gl.clearColor(0, 0, 0, 0);

      const canvas = gl.canvas;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      container.appendChild(canvas);

      const geometry = new Triangle(gl);

      program = new Program(gl, {
        vertex: vertexShader,
        fragment: fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uAudioLevel: { value: 0 },
          uIsSpeaking: { value: 0 },
          uIsListening: { value: 0 },
          uResolution: { value: [container.clientWidth || 320, container.clientHeight || 320] },
        },
        transparent: true,
      });

      const mesh = new Mesh(gl, { geometry, program });

      const handleResize = () => {
        if (!container || !renderer || !program) return;
        const width = container.clientWidth || 320;
        const height = container.clientHeight || 320;
        renderer.setSize(width, height);
        program.uniforms.uResolution.value = [width, height];
      };

      handleResize();
      window.addEventListener('resize', handleResize);

      let startTime = performance.now();
      let smoothedAudio = 0;

      const renderLoop = (time: number) => {
        const elapsed = (time - startTime) * 0.001;

        const targetAudio = isActiveRef.current
          ? Math.max(
              audioLevelRef.current,
              isSpeakingRef.current
                ? 0.35 + Math.sin(elapsed * 5) * 0.12
                : isListeningRef.current
                ? 0.18 + Math.sin(elapsed * 3) * 0.05
                : 0.06
            )
          : 0.02;

        smoothedAudio += (targetAudio - smoothedAudio) * 0.18;

        if (program) {
          program.uniforms.uTime.value = elapsed;
          program.uniforms.uAudioLevel.value = smoothedAudio;
          program.uniforms.uIsSpeaking.value = isSpeakingRef.current ? 1.0 : 0.0;
          program.uniforms.uIsListening.value = isListeningRef.current ? 1.0 : 0.0;
        }

        if (renderer) {
          renderer.render({ scene: mesh });
        }

        animationFrameId = requestAnimationFrame(renderLoop);
      };

      animationFrameId = requestAnimationFrame(renderLoop);

      return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', handleResize);
        if (canvas && container.contains(canvas)) {
          container.removeChild(canvas);
        }
      };
    } catch (err) {
      console.error('[VoicePoweredOrb] WebGL initialization failed:', err);
    }
  }, []);

  return (
    <div
      className={cn(
        // Default size — can be fully overridden by passing className
        'relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center select-none',
        className
      )}
    >
      {/* Outer framing circle sanctuary */}
      <div className="absolute inset-0 rounded-full bg-[#0d0d0d]/80 border border-[#C5A059]/25 shadow-[0_0_60px_rgba(197,160,89,0.12)] flex items-center justify-center overflow-hidden">
        {/* Subtle decorative concentric orbits */}
        <div className="absolute w-[92%] h-[92%] rounded-full border border-[#C5A059]/15 animate-[spin_80s_linear_infinite]" />
        <div className="absolute w-[80%] h-[80%] rounded-full border border-dashed border-[#C5A059]/20 animate-[spin_50s_linear_infinite_reverse]" />
        <div className="absolute w-[65%] h-[65%] rounded-full bg-radial from-[#C5A059]/15 via-transparent to-transparent blur-md pointer-events-none" />

        {/* WebGL Canvas Container */}
        <div ref={containerRef} className="relative w-full h-full pointer-events-none" />
      </div>
    </div>
  );
};
