import { GameManager } from './GameManager';
import { PlayerColor } from './types/PlayerColor';
import { IBackgammonAlgorithm, AlgorithmType } from './algorithms/IBackgammonAlgorithm';
import { AlgorithmFactory } from './algorithms/AlgorithmFactory';

// Zorluk seviyeleri için enum, geriye dönük uyumluluk için
export enum BotDifficulty {
    EASY = 'easy',
    MEDIUM = 'medium',
    HARD = 'hard'
}

// Bot algoritmaları ve zorluk seviyeleri arasındaki eşleme
export const difficultyToAlgorithm = {
    [BotDifficulty.EASY]: AlgorithmType.SIMPLE_EVALUATION,
    [BotDifficulty.MEDIUM]: AlgorithmType.ADVANCED_STATIC_EVALUATION,
    [BotDifficulty.HARD]: AlgorithmType.MINIMAX
};

export class BotPlayer {
    private gameManager: GameManager;
    private algorithm: IBackgammonAlgorithm;
    private botColor: PlayerColor;

    constructor(gameManager: GameManager, algorithmType: AlgorithmType, botColor: PlayerColor) {
        this.gameManager = gameManager;
        this.algorithm = AlgorithmFactory.getAlgorithm(algorithmType);
        this.botColor = botColor;
        
        console.log(`Bot oluşturuldu - Renk: ${botColor}, Algoritma: ${this.algorithm.getName()}`);
    }
    
    // Eski constructor kullanımı için alternatif constructor (zorluk seviyesini algoritmaya dönüştürür)
    public static fromDifficulty(gameManager: GameManager, difficulty: BotDifficulty, botColor: PlayerColor): BotPlayer {
        // Zorluk seviyesini uygun algoritma tipine dönüştür
        const algorithmType = difficultyToAlgorithm[difficulty];
        return new BotPlayer(gameManager, algorithmType, botColor);
    }

    // Bot hamlesini yapma
    public makeMove(): boolean {
        // Bot'un sırası değilse hamle yapma
        if (this.gameManager.getCurrentPlayer() !== this.botColor) {
            console.log("Bot hamle yapamaz, sıra bot'un değil.");
            return false;
        }

        // Mevcut zarları al - zar atmayı BotViewModel yapacak
        const diceValues = this.gameManager.getDice();
        
        console.log("Bot zarları:", diceValues);
        
        // Eğer hamle yapamıyorsa (bar'dan çıkamama durumu gibi)
        if (diceValues.length === 0 || !this.gameManager.canMakeAnyMove()) {
            console.log("Bot hamle yapamıyor - zar yok veya uygun hamle yok.");
            return false;
        }

        // Bar'dan çıkış hamlesi gerekiyorsa, algoritma sadece bar'dan başlamalı
        const needBarMove = this.gameManager.hasCheckerInBar();
        const fromPoint = needBarMove ? -1 : undefined; // Bar'dan başlamalıysa -1, değilse algoritma belirleyecek
        
        // Algoritmayı kullanarak en iyi hamleyi hesapla
        const bestMove = this.algorithm.calculateBestMove(this.gameManager, this.botColor, fromPoint);
        
        // Hamle bulunamadıysa false döndür
        if (!bestMove) {
            console.log("Bot için uygun hamle bulunamadı.");
            return false;
        }
        
        console.log(`Bot hamle yapıyor: ${bestMove.fromPoint} -> ${bestMove.toPoint}`);
        
        // Seçilen hamleyi yap
        return this.gameManager.makeMove(bestMove.fromPoint, bestMove.toPoint);
    }
    
    // Kullanılan algoritmanın adını döndür
    public getAlgorithmName(): string {
        return this.algorithm.getName();
    }
    
    // Kullanılan algoritmanın açıklamasını döndür
    public getAlgorithmDescription(): string {
        return this.algorithm.getDescription();
    }
} 