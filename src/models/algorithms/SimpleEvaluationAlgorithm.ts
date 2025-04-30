import { GameManager } from '../GameManager';
import { PlayerColor } from '../types/PlayerColor';
import { IBackgammonAlgorithm, PossibleMove, AlgorithmType } from './IBackgammonAlgorithm';

export class SimpleEvaluationAlgorithm implements IBackgammonAlgorithm {
    public getName(): string {
        return AlgorithmType.SIMPLE_EVALUATION;
    }
    
    public getDescription(): string {
        return "Basit bir değerlendirme fonksiyonu kullanarak hamleleri puanlar ve en yüksek puanlı hamleyi seçer.";
    }
    
    public calculateBestMove(gameManager: GameManager, botColor: PlayerColor): PossibleMove | null {
        // Tüm olası hamleleri bul
        const possibleMoves = this.findAllPossibleMoves(gameManager, botColor);
        
        // Hamle yoksa null döndür
        if (possibleMoves.length === 0) {
            return null;
        }
        
        // Hamleler arasında en yüksek puanlıyı seç
        possibleMoves.sort((a, b) => b.score - a.score);
        
        // Bir miktar rastgelelik ekle - en iyi 3 seçenek arasından seç
        if (possibleMoves.length >= 3) {
            const randomIndex = Math.floor(Math.random() * 3);
            return possibleMoves[randomIndex];
        }
        
        // Varsayılan olarak en iyi hamleyi seç
        return possibleMoves[0];
    }
    
    // Tüm olası hamleleri bul
    private findAllPossibleMoves(gameManager: GameManager, botColor: PlayerColor): PossibleMove[] {
        const possibleMoves: PossibleMove[] = [];
        
        // Bar'da taş varsa sadece bar'dan hamleleri kontrol et
        if (gameManager.hasCheckerInBar()) {
            const barMoves = gameManager.getAvailableMoves(-1);
            
            for (const toPoint of barMoves) {
                const score = this.evaluateMove(gameManager, botColor, -1, toPoint);
                possibleMoves.push({ fromPoint: -1, toPoint, score });
            }
            
            return possibleMoves;
        }
        
        // Normal hamleleri kontrol et
        const gameState = gameManager.getGameState();
        
        for (let i = 0; i < gameState.points.length; i++) {
            const point = gameState.points[i];
            
            // Bot rengi ile eşleşen pullar için hamleler
            if (point.color === botColor && point.checkers > 0) {
                const availableMoves = gameManager.getAvailableMoves(i);
                
                for (const toPoint of availableMoves) {
                    const score = this.evaluateMove(gameManager, botColor, i, toPoint);
                    possibleMoves.push({ fromPoint: i, toPoint, score });
                }
            }
        }
        
        return possibleMoves;
    }
    
    // Basit puanlama fonksiyonu
    private evaluateMove(gameManager: GameManager, botColor: PlayerColor, fromPoint: number, toPoint: number): number {
        let score = 0;
        const gameState = gameManager.getGameState();
        
        // Bar'dan çıkış hamlesine öncelik ver
        if (fromPoint === -1) {
            score += 100;
        }
        
        // Rakip pul kırma hamlesi
        const willCapture = gameManager.willCaptureChecker(toPoint);
        if (willCapture) {
            score += 50;
        }
        
        // Hedef noktada kendi pullarını koruma (blot oluşturmama)
        if (gameState.points[fromPoint]?.checkers === 1 && fromPoint !== -1) {
            score -= 30; // Tek pul bırakmak riskli
        }
        
        // Ev bölgesine taşıma
        const isInHomeBoard = this.isInHomeBoard(botColor, toPoint);
        if (isInHomeBoard) {
            score += 20;
        }
        
        // Toplama hamleleri
        if (toPoint === 99) { // 99 toplama noktasını temsil eder
            score += 40;
        }
        
        // Biraz rastgelelik ekle
        score += Math.random() * 30;
        
        return score;
    }
    
    // Pulun ev bölgesinde olup olmadığını kontrol et
    private isInHomeBoard(botColor: PlayerColor, point: number): boolean {
        if (botColor === 'white') {
            return point >= 18 && point < 24;
        } else {
            return point >= 0 && point < 6;
        }
    }
} 