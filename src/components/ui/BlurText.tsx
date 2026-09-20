'use client';

import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

interface BlurTextProps {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}

export function BlurText({
  text,
  className = '',
  delay = 0.1,
  stagger = 0.05,
}: BlurTextProps) {
  const containerRef = useRef<HTMLHeadingElement>(null);
  const words = text.split(' ');

  useEffect(() => {
    if (!containerRef.current) return;
    const elements = containerRef.current.querySelectorAll('.blur-word');

    gsap.fromTo(
      elements,
      {
        opacity: 0,
        filter: 'blur(12px)',
        y: 20,
      },
      {
        opacity: 1,
        filter: 'blur(0px)',
        y: 0,
        duration: 0.8,
        delay,
        stagger,
        ease: 'power3.out',
      }
    );
  }, [text, delay, stagger]);

  return (
    <span ref={containerRef} className={`inline-block ${className}`}>
      {words.map((word, i) => (
        <span
          key={i}
          className="blur-word inline-block mr-[0.28em] will-change-transform"
        >
          {word}
        </span>
      ))}
    </span>
  );
}
