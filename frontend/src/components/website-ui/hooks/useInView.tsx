import { useState, useEffect, useRef } from 'react';

interface UseInViewOptions extends IntersectionObserverInit {
  triggerOnce?: boolean;
}

export function useInView({ 
  triggerOnce = false, 
  threshold = 0, 
  root = null, 
  rootMargin = '0px' 
}: UseInViewOptions = {}) {
  
  const [isInView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        if (triggerOnce) {
          observer.unobserve(element);
        }
      } else {
        if (!triggerOnce) {
          setInView(false);
        }
      }
    }, { threshold, root, rootMargin }); // Pass the individual values here

    observer.observe(element);
    return () => observer.disconnect();
    
    // Now we can safely list the primitives in the dependency array
  }, [triggerOnce, threshold, root, rootMargin]);

  return [ref, isInView] as const;
}