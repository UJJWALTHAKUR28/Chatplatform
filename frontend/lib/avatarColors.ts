// lib/avatarColors.ts
// A shared set of warm avatar gradients — rust, wine, amber-brown, umber,
// terracotta-red, warm stone. Deliberately excludes blue, purple, and green
// so every avatar in the app reads as part of one warm, human palette.

export const AVATAR_GRADIENTS: [string, string][] = [
    ["#b15f1e", "#8f4614"], // rust
    ["#8c3b3c", "#6b2b2c"], // wine
    ["#b3701f", "#8c5716"], // amber-brown
    ["#6e4a3e", "#54372e"], // umber
    ["#a85248", "#833f37"], // terracotta-red
    ["#6b665c", "#524e46"], // warm stone
];

export function avatarGradient(name: string): [string, string] {
    const idx = (name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length;
    return AVATAR_GRADIENTS[idx];
}