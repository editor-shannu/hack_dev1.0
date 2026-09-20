'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

export function ClinicalCanvas3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 14);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
    mainLight.position.set(10, 12, 10);
    scene.add(mainLight);

    const blueLight = new THREE.PointLight(0x2098f2, 4, 30);
    blueLight.position.set(-8, -4, 4);
    scene.add(blueLight);

    const tealLight = new THREE.PointLight(0x00e5ff, 3, 25);
    tealLight.position.set(8, -6, 2);
    scene.add(tealLight);

    // 3. Dual-Tone 3D Medical Capsule Helper
    const createPillMesh = (topColor: number, bottomColor: number, radius = 0.5, height = 0.9) => {
      const group = new THREE.Group();

      // Top Half (colored hemisphere + upper cylinder)
      const topGeo = new THREE.CylinderGeometry(radius, radius, height / 2, 32);
      const capGeo = new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);

      const topMat = new THREE.MeshPhysicalMaterial({
        color: topColor,
        roughness: 0.15,
        metalness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        transmission: 0.1,
        transparent: true,
        opacity: 0.95,
      });

      const bottomMat = new THREE.MeshPhysicalMaterial({
        color: bottomColor,
        roughness: 0.15,
        metalness: 0.05,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        transmission: 0.05,
        transparent: true,
        opacity: 0.95,
      });

      // Upper half
      const topCyl = new THREE.Mesh(topGeo, topMat);
      topCyl.position.y = height / 4;
      group.add(topCyl);

      const topCap = new THREE.Mesh(capGeo, topMat);
      topCap.position.y = height / 2;
      group.add(topCap);

      // Lower half
      const botCyl = new THREE.Mesh(topGeo, bottomMat);
      botCyl.position.y = -height / 4;
      group.add(botCyl);

      const botCap = new THREE.Mesh(capGeo, bottomMat);
      botCap.rotation.x = Math.PI;
      botCap.position.y = -height / 2;
      group.add(botCap);

      return group;
    };

    // 4. Instantiate Floating Medical Objects across depths
    const pills: {
      group: THREE.Group;
      rotSpeedX: number;
      rotSpeedY: number;
      rotSpeedZ: number;
      baseY: number;
      floatSpeed: number;
      floatOffset: number;
    }[] = [];

    const pillConfigs = [
      { x: -6.5, y: 3.2, z: -2, scale: 0.9, top: 0x2098f2, bot: 0xffffff, rot: [0.4, 0.6, 0.2] },
      { x: 7.2, y: 3.8, z: -1, scale: 0.85, top: 0x00c9a7, bot: 0xffffff, rot: [-0.5, 0.8, -0.3] },
      { x: -7.5, y: -3.5, z: 1, scale: 1.1, top: 0x2098f2, bot: 0x1b5e20, rot: [0.8, -0.4, 0.5] },
      { x: 6.8, y: -4.2, z: 0, scale: 0.95, top: 0x4fc3f7, bot: 0xffffff, rot: [-0.3, 0.5, 0.7] },
      { x: 0.5, y: 5.2, z: -5, scale: 0.7, top: 0x00a896, bot: 0x2098f2, rot: [0.6, 0.2, -0.4] },
      { x: -2.8, y: -5.0, z: -3, scale: 0.8, top: 0xffffff, bot: 0x2098f2, rot: [0.3, -0.7, 0.2] },
    ];

    pillConfigs.forEach((cfg, idx) => {
      const pill = createPillMesh(cfg.top, cfg.bot, 0.45 * cfg.scale, 0.8 * cfg.scale);
      pill.position.set(cfg.x, cfg.y, cfg.z);
      pill.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
      scene.add(pill);

      pills.push({
        group: pill,
        rotSpeedX: (idx % 2 === 0 ? 0.006 : -0.007) + (idx * 0.001),
        rotSpeedY: (idx % 2 === 0 ? 0.008 : -0.006) - (idx * 0.001),
        rotSpeedZ: 0.004,
        baseY: cfg.y,
        floatSpeed: 0.0015 + (idx * 0.0004),
        floatOffset: idx * 1.3,
      });
    });

    // 5. Floating Glowing Medical Particle Constellation
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const col1 = new THREE.Color(0xffffff);
    const col2 = new THREE.Color(0x2098f2);
    const col3 = new THREE.Color(0x00e5ff);

    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 28;
      particlePos[i * 3 + 1] = (Math.random() - 0.5) * 18;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 12;

      const choice = Math.random();
      const col = choice < 0.4 ? col1 : choice < 0.75 ? col2 : col3;
      particleColors[i * 3] = col.r;
      particleColors[i * 3 + 1] = col.g;
      particleColors[i * 3 + 2] = col.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 6. Interactive Mouse Parallax using GSAP
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;

      gsap.to(mouse, {
        targetX: normX * 1.5,
        targetY: normY * 1.0,
        duration: 1.2,
        ease: 'power2.out',
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 7. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Camera smooth drift based on mouse
      camera.position.x += (mouse.targetX - camera.position.x) * 0.04;
      camera.position.y += (mouse.targetY - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      // Rotate particles slowly
      particles.rotation.y = elapsedTime * 0.03;
      particles.rotation.x = elapsedTime * 0.015;

      // Animate 3D Pills (rotation + gentle vertical sine wave levitation)
      pills.forEach((p) => {
        p.group.rotation.x += p.rotSpeedX;
        p.group.rotation.y += p.rotSpeedY;
        p.group.rotation.z += p.rotSpeedZ;
        p.group.position.y = p.baseY + Math.sin(elapsedTime * 1.5 + p.floatOffset) * 0.35;
      });

      renderer.render(scene, camera);
    };

    animate();

    // 8. Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth || window.innerWidth;
      const newHeight = container.clientHeight || window.innerHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', handleResize);

    // 9. Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);

      renderer.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none z-[1] overflow-hidden opacity-90"
      aria-hidden="true"
    />
  );
}
