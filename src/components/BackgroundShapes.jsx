// src/components/BackgroundShapes.jsx
import { useMemo } from "react";

export default function BackgroundShapes() {
    const shapes = useMemo(() => {
        const types = ["circle", "square", "triangle", "cross"];
        return Array.from({ length: 70 }).map(() => ({
            type: types[Math.floor(Math.random() * types.length)],
            left: Math.random() * 100,
            drift: Math.random() * 200 - 100,
            duration: Math.random() * 25 + 20,
            delay: Math.random() * -45
        }));
    }, []);

    return (
        <div className="bg-shapes">
            {shapes.map((s, i) => (
                <div
                    key={i}
                    style={{
                        left: `${s.left}%`,
                        animationDuration: `${s.duration}s`,
                        animationDelay: `${s.delay}s`,
                        transform: `translateX(${s.drift}px)`
                    }}
                    className={`shape ${s.type}`}
                />
            ))}
        </div>
    );
}