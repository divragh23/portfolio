// Component sourced from https://reactbits.dev (TargetCursor)
// CSS is colocated in styles.css instead of a separate import.

import React, { useEffect, useRef, useCallback, useMemo } from "react";
import { gsap } from "gsap";

const TargetCursor = ({
  targetSelector = ".cursor-target",
  spinDuration = 2,
  hideDefaultCursor = true,
  hoverDuration = 0.2,
  parallaxOn = true,
}) => {
  const cursorRef = useRef(null);
  const cornersRef = useRef(null);
  const spinTl = useRef(null);
  const dotRef = useRef(null);

  const isActiveRef = useRef(false);
  const targetCornerPositionsRef = useRef(null);
  const tickerFnRef = useRef(null);
  const activeStrengthRef = useRef(0);

  const pointerRef = useRef({ x: 0, y: 0 });
  const cursorPosRef = useRef({ x: 0, y: 0 });
  const moveRafRef = useRef(0);

  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    const hasTouchScreen =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const mobileRegex =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    const isMobileUserAgent = mobileRegex.test(userAgent.toLowerCase());
    return (hasTouchScreen && isSmallScreen) || isMobileUserAgent;
  }, []);

  const constants = useMemo(
    () => ({
      borderWidth: 3,
      cornerSize: 12,
    }),
    [],
  );

  // The original implementation called gsap.to() on every `mousemove`, which
  // fires up to ~1000Hz on a high-polling-rate pointer. That created a fresh
  // tween every event and pegged the main thread. Instead, we batch via RAF
  // and lerp the cursor position ourselves — one tween for the whole session.
  const moveCursor = useCallback((x, y) => {
    pointerRef.current.x = x;
    pointerRef.current.y = y;

    if (moveRafRef.current || !cursorRef.current) return;

    moveRafRef.current = requestAnimationFrame(() => {
      moveRafRef.current = 0;

      const cursor = cursorRef.current;
      if (!cursor) return;

      const pos = cursorPosRef.current;
      const target = pointerRef.current;
      // Light easing toward the pointer (~0.35 per frame ≈ 100ms half-life at
      // 60fps). Keeps the cursor responsive without re-creating tweens.
      pos.x += (target.x - pos.x) * 0.35;
      pos.y += (target.y - pos.y) * 0.35;

      if (Math.abs(target.x - pos.x) < 0.5) pos.x = target.x;
      if (Math.abs(target.y - pos.y) < 0.5) pos.y = target.y;

      gsap.set(cursor, { x: pos.x, y: pos.y });

      if (pos.x !== target.x || pos.y !== target.y) {
        moveRafRef.current = requestAnimationFrame(function follow() {
          moveRafRef.current = 0;
          moveCursor(target.x, target.y);
        });
      }
    });
  }, []);

  useEffect(() => {
    if (isMobile || !cursorRef.current) return;

    const originalCursor = document.body.style.cursor;
    if (hideDefaultCursor) {
      document.body.style.cursor = "none";
    }

    const cursor = cursorRef.current;
    cornersRef.current = cursor.querySelectorAll(".target-cursor-corner");

    let activeTarget = null;
    let currentLeaveHandler = null;
    let resumeTimeout = null;

    const cleanupTarget = (target) => {
      if (currentLeaveHandler) {
        target.removeEventListener("mouseleave", currentLeaveHandler);
      }
      currentLeaveHandler = null;
    };

    gsap.set(cursor, {
      xPercent: -50,
      yPercent: -50,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    cursorPosRef.current.x = window.innerWidth / 2;
    cursorPosRef.current.y = window.innerHeight / 2;
    pointerRef.current.x = cursorPosRef.current.x;
    pointerRef.current.y = cursorPosRef.current.y;

    const createSpinTimeline = () => {
      if (spinTl.current) {
        spinTl.current.kill();
      }
      spinTl.current = gsap
        .timeline({ repeat: -1 })
        .to(cursor, {
          rotation: "+=360",
          duration: spinDuration,
          ease: "none",
        });
    };

    createSpinTimeline();

    // Cached corner positions so we don't read transforms back from GSAP
    // every tick (gsap.getProperty is O(reflow) and was called 4× per frame).
    const cornerStateRef = { current: [0, 0, 0, 0].map(() => ({ x: 0, y: 0 })) };

    const tickerFn = () => {
      if (
        !targetCornerPositionsRef.current ||
        !cursorRef.current ||
        !cornersRef.current
      ) {
        return;
      }

      const strength = activeStrengthRef.current;
      if (strength === 0) return;

      const cursorX = cursorPosRef.current.x;
      const cursorY = cursorPosRef.current.y;

      const corners = cornersRef.current;
      const states = cornerStateRef.current;
      const positions = targetCornerPositionsRef.current;

      for (let i = 0; i < corners.length; i += 1) {
        const corner = corners[i];
        const state = states[i];
        const targetX = positions[i].x - cursorX;
        const targetY = positions[i].y - cursorY;
        state.x += (targetX - state.x) * (parallaxOn ? 0.18 : 1);
        state.y += (targetY - state.y) * (parallaxOn ? 0.18 : 1);
        corner.style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`;
      }
    };

    tickerFnRef.current = tickerFn;

    const moveHandler = (e) => moveCursor(e.clientX, e.clientY);
    window.addEventListener("mousemove", moveHandler, { passive: true });

    const scrollHandler = () => {
      if (!activeTarget || !cursorRef.current) return;
      const mouseX = gsap.getProperty(cursorRef.current, "x");
      const mouseY = gsap.getProperty(cursorRef.current, "y");
      const elementUnderMouse = document.elementFromPoint(mouseX, mouseY);
      const isStillOverTarget =
        elementUnderMouse &&
        (elementUnderMouse === activeTarget ||
          elementUnderMouse.closest(targetSelector) === activeTarget);
      if (!isStillOverTarget) {
        if (currentLeaveHandler) {
          currentLeaveHandler();
        }
      }
    };
    window.addEventListener("scroll", scrollHandler, { passive: true });

    const mouseDownHandler = () => {
      if (!dotRef.current) return;
      gsap.to(dotRef.current, { scale: 0.7, duration: 0.3 });
      gsap.to(cursorRef.current, { scale: 0.9, duration: 0.2 });
    };

    const mouseUpHandler = () => {
      if (!dotRef.current) return;
      gsap.to(dotRef.current, { scale: 1, duration: 0.3 });
      gsap.to(cursorRef.current, { scale: 1, duration: 0.2 });
    };

    window.addEventListener("mousedown", mouseDownHandler);
    window.addEventListener("mouseup", mouseUpHandler);

    const enterHandler = (e) => {
      const directTarget = e.target;
      const allTargets = [];
      let current = directTarget;
      while (current && current !== document.body) {
        if (current.matches && current.matches(targetSelector)) {
          allTargets.push(current);
        }
        current = current.parentElement;
      }
      const target = allTargets[0] || null;
      if (!target || !cursorRef.current || !cornersRef.current) return;
      if (activeTarget === target) return;
      if (activeTarget) {
        cleanupTarget(activeTarget);
      }
      if (resumeTimeout) {
        clearTimeout(resumeTimeout);
        resumeTimeout = null;
      }

      activeTarget = target;
      gsap.killTweensOf(cursorRef.current, "rotation");
      spinTl.current?.pause();
      gsap.set(cursorRef.current, { rotation: 0 });

      const rect = target.getBoundingClientRect();
      const { borderWidth, cornerSize } = constants;
      const cursorX = cursorPosRef.current.x;
      const cursorY = cursorPosRef.current.y;

      targetCornerPositionsRef.current = [
        { x: rect.left - borderWidth, y: rect.top - borderWidth },
        {
          x: rect.right + borderWidth - cornerSize,
          y: rect.top - borderWidth,
        },
        {
          x: rect.right + borderWidth - cornerSize,
          y: rect.bottom + borderWidth - cornerSize,
        },
        {
          x: rect.left - borderWidth,
          y: rect.bottom + borderWidth - cornerSize,
        },
      ];

      isActiveRef.current = true;
      gsap.ticker.add(tickerFnRef.current);

      gsap.to(activeStrengthRef, {
        current: 1,
        duration: hoverDuration,
        ease: "power2.out",
      });

      const leaveHandler = () => {
        gsap.ticker.remove(tickerFnRef.current);

        isActiveRef.current = false;
        targetCornerPositionsRef.current = null;
        gsap.set(activeStrengthRef, { current: 0, overwrite: true });
        activeTarget = null;

        if (cornersRef.current) {
          const corners = Array.from(cornersRef.current);
          const { cornerSize } = constants;
          const positions = [
            { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
            { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
            { x: cornerSize * 0.5, y: cornerSize * 0.5 },
            { x: -cornerSize * 1.5, y: cornerSize * 0.5 },
          ];
          corners.forEach((corner, index) => {
            const state = cornerStateRef.current[index];
            state.x = positions[index].x;
            state.y = positions[index].y;
            corner.style.transform = `translate3d(${positions[index].x}px, ${positions[index].y}px, 0)`;
          });
        }

        resumeTimeout = setTimeout(() => {
          if (!activeTarget && cursorRef.current && spinTl.current) {
            const currentRotation = gsap.getProperty(
              cursorRef.current,
              "rotation",
            );
            const normalizedRotation = currentRotation % 360;
            spinTl.current.kill();
            spinTl.current = gsap
              .timeline({ repeat: -1 })
              .to(cursorRef.current, {
                rotation: "+=360",
                duration: spinDuration,
                ease: "none",
              });
            gsap.to(cursorRef.current, {
              rotation: normalizedRotation + 360,
              duration: spinDuration * (1 - normalizedRotation / 360),
              ease: "none",
              onComplete: () => {
                spinTl.current?.restart();
              },
            });
          }
          resumeTimeout = null;
        }, 50);

        cleanupTarget(target);
      };

      currentLeaveHandler = leaveHandler;
      target.addEventListener("mouseleave", leaveHandler);
    };

    window.addEventListener("mouseover", enterHandler, { passive: true });

    return () => {
      if (tickerFnRef.current) {
        gsap.ticker.remove(tickerFnRef.current);
      }
      if (moveRafRef.current) {
        cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = 0;
      }

      window.removeEventListener("mousemove", moveHandler);
      window.removeEventListener("mouseover", enterHandler);
      window.removeEventListener("scroll", scrollHandler);
      window.removeEventListener("mousedown", mouseDownHandler);
      window.removeEventListener("mouseup", mouseUpHandler);

      if (activeTarget) {
        cleanupTarget(activeTarget);
      }

      spinTl.current?.kill();
      document.body.style.cursor = originalCursor;

      isActiveRef.current = false;
      targetCornerPositionsRef.current = null;
      activeStrengthRef.current = 0;
    };
  }, [
    targetSelector,
    spinDuration,
    moveCursor,
    constants,
    hideDefaultCursor,
    isMobile,
    hoverDuration,
    parallaxOn,
  ]);

  useEffect(() => {
    if (isMobile || !cursorRef.current || !spinTl.current) return;
    if (spinTl.current.isActive()) {
      spinTl.current.kill();
      spinTl.current = gsap
        .timeline({ repeat: -1 })
        .to(cursorRef.current, {
          rotation: "+=360",
          duration: spinDuration,
          ease: "none",
        });
    }
  }, [spinDuration, isMobile]);

  if (isMobile) {
    return null;
  }

  return (
    <div ref={cursorRef} className="target-cursor-wrapper">
      <div ref={dotRef} className="target-cursor-dot" />
      <div className="target-cursor-corner corner-tl" />
      <div className="target-cursor-corner corner-tr" />
      <div className="target-cursor-corner corner-br" />
      <div className="target-cursor-corner corner-bl" />
    </div>
  );
};

export default TargetCursor;
