import { IGameState } from './interfaces/IGameState';
import { IPoint } from './interfaces/IPoint';

export class GameBoard {
    private state: IGameState;

    constructor() {
        this.state = this.getInitialState();
    }

    private getInitialState(): IGameState {
        const points: IPoint[] = Array(24).fill(null).map((_, index) => ({
            id: index,
            checkers: 0,
            color: null,
            isPlayable: false
        }));

        // Beyaz taşlar için başlangıç pozisyonları
        points[23].checkers = 2; // 24. nokta
        points[23].color = 'white';
        
        points[12].checkers = 5; // 13. nokta
        points[12].color = 'white';
        
        points[7].checkers = 3;  // 8. nokta
        points[7].color = 'white';
        
        points[5].checkers = 5;  // 6. nokta
        points[5].color = 'white';

        // Siyah taşlar için başlangıç pozisyonları
        points[0].checkers = 2;  // 1. nokta
        points[0].color = 'black';
        
        points[11].checkers = 5; // 12. nokta
        points[11].color = 'black';
        
        points[16].checkers = 3; // 17. nokta
        points[16].color = 'black';
        
        points[18].checkers = 5; // 19. nokta
        points[18].color = 'black';

        return {
            points,
            bar: {
                whiteCheckers: 0,
                blackCheckers: 0
            },
            collected: {
                white: 0,
                black: 0
            }
        };
    }

    public getState(): IGameState {
        return this.state;
    }
} 