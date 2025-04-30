import { PlayerColor } from "../types/PlayerColor";

export interface IPoint {
    id: number;
    checkers: number;
    color: PlayerColor | null;
    isPlayable: boolean;
    clickCount?: number;
}

export interface IBar {
    whiteCheckers: number;
    blackCheckers: number;
} 