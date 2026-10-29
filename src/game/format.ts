export const fmt = (n: number) => n.toLocaleString('en-US');
export const short = (n: number) => (n >= 1e6 ? `${+(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`);
