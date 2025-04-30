import { GameManager } from '../GameManager';
import { PlayerColor } from '../types/PlayerColor';

// Olası hamle türleri
export interface PossibleMove {
    fromPoint: number;
    toPoint: number;
    score: number;
}

// Kullanılabilir algoritma türleri
export enum AlgorithmType {
    SIMPLE_EVALUATION = 'simple_evaluation',
    ADVANCED_STATIC_EVALUATION = 'advanced_static_evaluation',
    MINIMAX = 'minimax',
    MONTE_CARLO = 'monte_carlo',
    NEURAL_NETWORK = 'neural_network'
}

// Algoritma arayüzü - her algoritma bu arayüzü uygulamalıdır
export interface IBackgammonAlgorithm {
    // Algoritmanın adını döndür
    getName(): string;
    
    // Algoritmanın açıklamasını döndür
    getDescription(): string;
    
    // En iyi hamleyi hesapla
    calculateBestMove(
        gameManager: GameManager,
        playerColor: PlayerColor,
        fromPoint?: number
    ): { fromPoint: number; toPoint: number } | null;
} 