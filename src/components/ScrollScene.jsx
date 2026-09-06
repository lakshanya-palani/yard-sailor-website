import { useEffect, useRef } from "react";
import "./ScrollScene.css";

export default function ScrollScene({ children, className = "", id }) {
  const ref = useRef(null);
  useEffect(() => {
    const element = ref.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cleanup = () => {};
    const setup = () => {
      cleanup();
      element.style.removeProperty("--scene-progress");
      element.classList.remove("scene-active");
      if (preference.matches) return;
      let frame = 0;
      let visible = false;
      // No React renders or DOM queries during scroll. Measure visible scenes only.
      const update = () => {
        frame = 0;
        if (!visible) return;
        const rect = element.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height)));
        element.style.setProperty("--scene-progress", progress.toFixed(4));
      };
      const request = () => { if (visible && !frame) frame = requestAnimationFrame(update); };
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) { request(); element.classList.add("scene-active"); }
      });
      observer.observe(element);
      window.addEventListener("scroll", request, { passive: true });
      window.addEventListener("resize", request);
      cleanup = () => {
        observer.disconnect(); cancelAnimationFrame(frame);
        window.removeEventListener("scroll", request);
        window.removeEventListener("resize", request);
      };
    };
    setup();
    preference.addEventListener("change", setup);
    return () => { cleanup(); preference.removeEventListener("change", setup); };
  }, []);
  return <div ref={ref} id={id} className={`scroll-scene ${className}`}>{children}</div>;
}
