// The tables in the collection. Game builds whichever one the player picks on the start screen.

import type { Game } from '../game';
import type { Table } from './table';
import { Psychosis } from './psychosis';
import { DustAndLead } from './dust';

export interface TableDef {
  id: string;
  /** As the display and the start screen show it. */
  title: string;
  build: (game: Game) => Table;
  /** The dot-matrix display's colour. */
  dmdColor: [number, number, number];
  /** localStorage key for this table's high score. */
  highScoreKey: string;
  /** Painted playfield art (art/README.md), tried first as .png then as .jpg. */
  artPath: string;
  /** The attract mode's how-to-play page: three short lines. */
  attractHint: [string, string, string];
  /** The game manual (the start screen's link), or null if there isn't one yet. */
  manual: string | null;
}

export const TABLES: TableDef[] = [
  {
    id: 'psychosis',
    title: 'CYBER PSYCHOSIS',
    build: (g) => new Psychosis(g),
    dmdColor: [255, 52, 36],
    highScoreKey: 'sz-pinball.cyber-psychosis.high',
    artPath: 'art/playfield',
    attractHint: ['SPELL B-R-E-A-C-H', 'RUN THE HEIST TO', 'BLACKOUT'],
    manual: 'manual.pdf',
  },
  {
    id: 'dust',
    title: 'DUST & LEAD',
    build: (g) => new DustAndLead(g),
    // the Oxide scheme's turquoise
    dmdColor: [63, 255, 229],
    highScoreKey: 'sz-pinball.dust-and-lead.high',
    artPath: 'art/dust-and-lead/playfield',
    attractHint: ['WANTED: SIX OUTLAWS', 'RIDE THEM DOWN TO', 'HIGH NOON'],
    manual: null,
  },
];

export const DEFAULT_TABLE = 'psychosis';

export function tableDef(id: string | null | undefined): TableDef {
  return TABLES.find((t) => t.id === id) ?? TABLES.find((t) => t.id === DEFAULT_TABLE)!;
}
