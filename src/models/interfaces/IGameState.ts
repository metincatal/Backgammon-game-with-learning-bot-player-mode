import { IPoint } from "./IPoint";

export interface IGameState {
    points: IPoint[];
    bar: {
        whiteCheckers: number;
        blackCheckers: number;
    };
    collected: {
        white: number;
        black: number;
    };
} 