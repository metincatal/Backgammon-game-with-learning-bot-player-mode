import { GameBoard } from '../models/GameBoard';
import { IGameState } from '../models/interfaces/IGameState';

export class GameViewModel {
    private gameBoard: GameBoard;

    constructor() {
        this.gameBoard = new GameBoard();
    }

    public getGameState(): IGameState {
        return this.gameBoard.getState();
    }
} 