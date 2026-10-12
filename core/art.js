export const ART_V = "2";
export const startArt = (n) => new URL(`../assets/start/${n}.jpg?v=${ART_V}`, import.meta.url).href;
