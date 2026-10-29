// Placeholder while the sketch-style art is rewritten.
import type { LowerSection, P } from './geom';
export function paintStatic(_ctx: CanvasRenderingContext2D, _lower: LowerSection, drawInserts: () => void, drawDomes: () => void) {
  drawInserts();
  drawDomes();
}
export function paintRamps(_ctx: CanvasRenderingContext2D) {}
export function paintDynamic(_ctx: CanvasRenderingContext2D, _t: number, _target: P | null, _pull: number) {}
export function drawImpound(_ctx: CanvasRenderingContext2D, _locked: number, _t: number) {}
export function drawTank(_ctx: CanvasRenderingContext2D, _x: number, _y: number, _r: number, _hit: number) {}
export function drawDrop(_ctx: CanvasRenderingContext2D, _a: P, _b: P, _anim: number) {}
export function drawStandup(_ctx: CanvasRenderingContext2D, _a: P, _b: P, _lit: boolean) {}
export function drawReactorEye(_ctx: CanvasRenderingContext2D, _heat: number, _glow: number) {}
export function drawTurbine(_ctx: CanvasRenderingContext2D, _a: number) {}
export function drawSpinner(_ctx: CanvasRenderingContext2D, _a: number) {}
