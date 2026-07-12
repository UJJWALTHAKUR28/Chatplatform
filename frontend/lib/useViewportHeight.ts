"use client";
import { useEffect } from "react";

export function useViewportHeight() {
    useEffect(() => {
        const vv = window.visualViewport;

        const setHeight = () => {
            const height = vv?.height ?? window.innerHeight;
            document.documentElement.style.setProperty("--app-height", `${height}px`);
        };

        setHeight();

        vv?.addEventListener("resize", setHeight);
        vv?.addEventListener("scroll", setHeight);
        window.addEventListener("resize", setHeight);

        return () => {
            vv?.removeEventListener("resize", setHeight);
            vv?.removeEventListener("scroll", setHeight);
            window.removeEventListener("resize", setHeight);
        };
    }, []);
}