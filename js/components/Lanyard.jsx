/* eslint-disable react/no-unknown-property */
// Component sourced from https://reactbits.dev (Lanyard).
// Adapted for the portfolio:
//   - Asset URLs are absolute paths (no esbuild file-loader plumbing).
//   - The card face uses a UConn Huskies mark texture instead of the GLB's
//     default React branding (see assets/lanyard/uconn-husky.png).
//   - The lanyard band texture is generated via Canvas in the brand palette
//     instead of using the React-Bits-branded PNG.

import React, {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, extend, useFrame } from "@react-three/fiber";
import { useGLTF, Environment, Lightformer, useTexture } from "@react-three/drei";
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
} from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import * as THREE from "three";

extend({ MeshLineGeometry, MeshLineMaterial });

const CARD_URL = "/assets/lanyard/card.glb";
const CARD_FACE_MAP_URL = "/assets/lanyard/uconn-husky.png";

/**
 * React Bits card.glb base map (1678×1677): atom logo top-left, reactbits.dev
 * graphic top-right. Card mesh UVs use the top ~76% of this atlas (v ≤ 0.757).
 */
const CARD_LOGO_ERASE_REGIONS = [
  { x: 0, y: 0, w: 0.5, h: 0.52 },
  { x: 0.44, y: 0, w: 0.56, h: 0.58 },
];

const CARD_HUSKY_PLACEMENT = {
  cx: 0.5,
  // Card mesh UVs span v≈0–0.76 (origin at bottom); center ≈62% from texture top.
  cy: 0.62,
  maxWidth: 0.5,
  maxHeight: 0.38,
};

function patchCardGrain(ctx, templateImage, width, height, x, y, patchW, patchH) {
  const sx = Math.floor(width * 0.34);
  const sy = Math.floor(height * 0.84);
  const sw = Math.max(1, Math.floor(width * 0.32));
  const sh = Math.max(1, Math.floor(height * 0.06));
  ctx.drawImage(templateImage, sx, sy, sw, sh, x, y, patchW, patchH);
}

function createCardFaceMap(logoTexture, templateMap) {
  const templateImage = templateMap?.image;
  const logoImage = logoTexture?.image;

  if (!templateImage?.width || !logoImage?.width) {
    return null;
  }

  const width = templateImage.width;
  const height = templateImage.height;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(templateImage, 0, 0, width, height);

  for (const region of CARD_LOGO_ERASE_REGIONS) {
    const x = Math.floor(width * region.x);
    const y = Math.floor(height * region.y);
    const patchW = Math.ceil(width * region.w);
    const patchH = Math.ceil(height * region.h);
    patchCardGrain(ctx, templateImage, width, height, x, y, patchW, patchH);
  }

  const maxW = width * CARD_HUSKY_PLACEMENT.maxWidth;
  const maxH = height * CARD_HUSKY_PLACEMENT.maxHeight;
  const scale = Math.min(maxW / logoImage.width, maxH / logoImage.height);
  const drawW = logoImage.width * scale;
  const drawH = logoImage.height * scale;
  const drawX = width * CARD_HUSKY_PLACEMENT.cx - drawW / 2;
  const drawY = height * CARD_HUSKY_PLACEMENT.cy - drawH / 2;

  ctx.drawImage(logoImage, drawX, drawY, drawW, drawH);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = templateMap.flipY;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  return texture;
}

function createBandTexture({ width = 1024, height = 128 } = {}) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0.0, "#1f1638");
  bg.addColorStop(0.5, "#3a2a5f");
  bg.addColorStop(1.0, "#1c1530");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(248, 234, 255, 0.18)";
  ctx.font = "700 56px 'Space Grotesk', 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const spacing = width / 4;
  for (let i = 0; i < 4; i += 1) {
    const x = spacing * i + spacing / 2;
    ctx.fillText("DR", x, height / 2);
  }

  ctx.strokeStyle = "rgba(255, 233, 245, 0.16)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(width, 8);
  ctx.moveTo(0, height - 8);
  ctx.lineTo(width, height - 8);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function Band({ maxSpeed = 50, minSpeed = 0, isMobile = false }) {
  const band = useRef();
  const fixed = useRef();
  const j1 = useRef();
  const j2 = useRef();
  const j3 = useRef();
  const card = useRef();

  const vec = useMemo(() => new THREE.Vector3(), []);
  const ang = useMemo(() => new THREE.Vector3(), []);
  const rot = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);

  const segmentProps = {
    type: "dynamic",
    canSleep: true,
    colliders: false,
    angularDamping: 4,
    linearDamping: 4,
  };

  const { nodes, materials } = useGLTF(CARD_URL);
  const huskyLogoMap = useTexture(CARD_FACE_MAP_URL);
  const templateMap = materials.base.map;
  const [cardFaceMap, setCardFaceMap] = useState(null);

  useLayoutEffect(() => {
    let active = true;
    let builtMap = null;

    const build = () => {
      if (!active) return;

      const next = createCardFaceMap(huskyLogoMap, templateMap);
      if (!next) return;

      if (builtMap && builtMap !== templateMap) {
        builtMap.dispose();
      }

      builtMap = next;
      setCardFaceMap(next);
    };

    build();

    const logoImage = huskyLogoMap?.image;
    const templateImage = templateMap?.image;

    if (logoImage && !logoImage.complete) {
      logoImage.addEventListener("load", build, { once: true });
    }

    if (templateImage && !templateImage.complete) {
      templateImage.addEventListener("load", build, { once: true });
    }

    return () => {
      active = false;
      if (builtMap && builtMap !== templateMap) {
        builtMap.dispose();
      }
    };
  }, [huskyLogoMap, templateMap]);

  const bandTexture = useMemo(() => createBandTexture(), []);

  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]),
  );
  const [dragged, drag] = useState(false);
  const [hovered, hover] = useState(false);

  useRopeJoint(fixed, j1, [
    [0, 0, 0],
    [0, 0, 0],
    1,
  ]);
  useRopeJoint(j1, j2, [
    [0, 0, 0],
    [0, 0, 0],
    1,
  ]);
  useRopeJoint(j2, j3, [
    [0, 0, 0],
    [0, 0, 0],
    1,
  ]);
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, 1.5, 0],
  ]);

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? "grabbing" : "grab";
      return () => void (document.body.style.cursor = "auto");
    }
  }, [hovered, dragged]);

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      });
    }
    if (fixed.current) {
      [j1, j2].forEach((ref) => {
        if (!ref.current.lerped)
          ref.current.lerped = new THREE.Vector3().copy(
            ref.current.translation(),
          );
        const clampedDistance = Math.max(
          0.1,
          Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())),
        );
        ref.current.lerped.lerp(
          ref.current.translation(),
          delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed)),
        );
      });
      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(j2.current.lerped);
      curve.points[2].copy(j1.current.lerped);
      curve.points[3].copy(fixed.current.translation());
      band.current.geometry.setPoints(curve.getPoints(isMobile ? 16 : 32));
      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation());
      card.current.setAngvel({
        x: ang.x,
        y: ang.y - rot.y * 0.25,
        z: ang.z,
      });
    }
  });

  curve.curveType = "chordal";

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[2, 0, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? "kinematicPosition" : "dynamic"}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={2.25}
            position={[0, -1.2, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={(e) => (
              e.target.releasePointerCapture(e.pointerId), drag(false)
            )}
            onPointerDown={(e) => (
              e.target.setPointerCapture(e.pointerId),
              drag(
                new THREE.Vector3()
                  .copy(e.point)
                  .sub(vec.copy(card.current.translation())),
              )
            )}
          >
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial
                map={cardFaceMap || templateMap}
                map-anisotropy={16}
                clearcoat={isMobile ? 0 : 1}
                clearcoatRoughness={0.15}
                roughness={0.65}
                metalness={0.25}
              />
            </mesh>
            <mesh
              geometry={nodes.clip.geometry}
              material={materials.metal}
              material-roughness={0.3}
            />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color="white"
          depthTest={false}
          resolution={isMobile ? [1000, 2000] : [1000, 1000]}
          useMap
          map={bandTexture}
          repeat={[-4, 1]}
          lineWidth={1}
        />
      </mesh>
    </>
  );
}

export default function Lanyard({
  position = [0, 0, 30],
  gravity = [0, -40, 0],
  fov = 20,
  transparent = true,
}) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="lanyard-wrapper">
      <Canvas
        camera={{ position: position, fov: fov }}
        dpr={[1, isMobile ? 1.5 : 2]}
        gl={{ alpha: transparent }}
        onCreated={({ gl }) =>
          gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)
        }
      >
        <ambientLight intensity={Math.PI} />
        <Physics gravity={gravity} timeStep={isMobile ? 1 / 30 : 1 / 60}>
          <Suspense fallback={null}>
            <Band isMobile={isMobile} />
          </Suspense>
        </Physics>
        <Environment blur={0.75}>
          <Lightformer
            intensity={2}
            color="white"
            position={[0, -1, 5]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color="white"
            position={[-1, -1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color="white"
            position={[1, 1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={10}
            color="white"
            position={[-10, 0, 14]}
            rotation={[0, Math.PI / 2, Math.PI / 3]}
            scale={[100, 10, 1]}
          />
        </Environment>
      </Canvas>
    </div>
  );
}

useGLTF.preload(CARD_URL);
useTexture.preload(CARD_FACE_MAP_URL);
