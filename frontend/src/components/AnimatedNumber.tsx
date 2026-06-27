import React, { useEffect, useRef } from "react";
import { animate } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  style?: React.CSSProperties;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, className = "", style = {} }) => {
  const nodeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const controls = animate(0, value, {
      duration: 1, // Animate over 1 second
      onUpdate(value) {
        // Use toLocaleString() to add commas for thousands
        node.textContent = Math.round(value).toLocaleString();
      }
    });

    return () => controls.stop();
  }, [value]);

  return <p ref={nodeRef} className={className} style={style} />;
};