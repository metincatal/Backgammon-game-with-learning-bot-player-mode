import { GameManager } from '../GameManager';
import { PlayerColor } from '../types/PlayerColor';
import { IBackgammonAlgorithm, PossibleMove, AlgorithmType } from './IBackgammonAlgorithm';

export class AdvancedStaticEvaluationAlgorithm implements IBackgammonAlgorithm {
    public getName(): string {
        return AlgorithmType.ADVANCED_STATIC_EVALUATION;
    }
    
    public getDescription(): string {
        return "Gelişmiş bir statik değerlendirme fonksiyonu kullanarak tavla stratejilerini daha derin bir şekilde analiz eder.";
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
        
        // Az miktarda rastgelelik ekle - en iyi 2 hamle arasından seç
        if (possibleMoves.length >= 2) {
            const randomIndex = Math.floor(Math.random() * 2);
            return possibleMoves[randomIndex];
        }
        
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
    
    // Gelişmiş puanlama fonksiyonu
    private evaluateMove(gameManager: GameManager, botColor: PlayerColor, fromPoint: number, toPoint: number): number {
        let score = 0;
        const gameState = gameManager.getGameState();
        const opponentColor = botColor === 'white' ? 'black' : 'white';
        
        // Bar'dan çıkış hamlesine yüksek öncelik ver
        if (fromPoint === -1) {
            score += 150;
        }
        
        // Rakip pul kırma hamlesi
        const willCapture = gameManager.willCaptureChecker(toPoint);
        if (willCapture) {
            score += 80;
            
            // Rakibin ev bölgesinde kırma daha değerli
            if (this.isInHomeBoard(opponentColor, toPoint)) {
                score += 30;
            }
        }
        
        // Blot (tek pul) koruması
        if (gameState.points[fromPoint]?.checkers === 1 && fromPoint !== -1) {
            // Tek pul bırakmak riskli ama bazen gerekli
            score -= 40;
            
            // Eğer tek pul ev bölgesindeyse ve hedef de ev bölgesiyse riski azalt
            if (this.isInHomeBoard(botColor, fromPoint) && this.isInHomeBoard(botColor, toPoint)) {
                score += 15;
            }
        }
        
        // Kapı oluşturma (en az 2 pul olan nokta)
        if (gameState.points[toPoint]?.color === botColor) {
            // Mevcut bir kapıyı güçlendirme
            const newCheckerCount = gameState.points[toPoint].checkers + 1;
            if (newCheckerCount >= 2) {
                score += 15 + (Math.min(newCheckerCount, 5) * 3);
            }
        } else {
            // Yeni kapı oluşturma
            score += 25;
        }
        
        // Stratejik kapı konumları - arka kapılar daha değerli
        if (botColor === 'white') {
            // Beyaz için stratejik kapı konumları (daha düşük numaralı)
            if (toPoint <= 6) {
                score += 15;
            }
        } else {
            // Siyah için stratejik kapı konumları (daha yüksek numaralı)
            if (toPoint >= 18) {
                score += 15;
            }
        }
        
        // Ev bölgesine taşıma
        const isInHomeBoard = this.isInHomeBoard(botColor, toPoint);
        if (isInHomeBoard) {
            score += 35;
            
            // İlerlemeyi ödüllendir - ev bölgesinde daha ileride olan pullar daha değerli
            if (botColor === 'white') {
                score += (toPoint - 18) * 5; // 18-23 arası, daha yüksek = daha iyi
            } else {
                score += (5 - toPoint) * 5; // 0-5 arası, daha düşük = daha iyi
            }
        }
        
        // Toplama hamleleri
        if (toPoint === 99) { // 99 toplama noktasını temsil eder
            score += 100;
        }
        
        // Kısmen dağılmış kapı yapısını korumaya çalış
        if (this.willBreakPrimeStructure(gameState, botColor, fromPoint)) {
            score -= 20;
        }
        
        // Hamle güvenli mi kontrol et
        if (!this.isSafeMove(gameState, botColor, fromPoint, toPoint)) {
            score -= 30;
        }
        
        // Çok az rastgelelik (determinizmi azaltmak için)
        score += Math.random() * 10;
        
        return score;
    }
    
    // Pulun ev bölgesinde olup olmadığını kontrol et
    private isInHomeBoard(playerColor: PlayerColor, point: number): boolean {
        if (playerColor === 'white') {
            return point >= 18 && point < 24;
        } else {
            return point >= 0 && point < 6;
        }
    }
    
    // Hamlenin kapı yapısını bozup bozmadığını kontrol et
    private willBreakPrimeStructure(gameState: any, botColor: PlayerColor, fromPoint: number): boolean {
        // Bar'dan çıkışlarda kapı yapısı bozulmaz
        if (fromPoint === -1) return false;
        
        const adjacentPoints = this.getAdjacentPoints(botColor, fromPoint);
        
        // Kapı yapısını kontrol et
        let consecutivePoints = 0;
        for (const point of adjacentPoints) {
            if (point >= 0 && point < 24 && 
                gameState.points[point].color === botColor && 
                gameState.points[point].checkers >= 2) {
                consecutivePoints++;
            } else {
                consecutivePoints = 0;
            }
            
            // Art arda 3 veya daha fazla kapı varsa, bunu korumak önemli
            if (consecutivePoints >= 3) {
                return gameState.points[fromPoint].checkers <= 2;
            }
        }
        
        return false;
    }
    
    // Verilen noktaya bitişik noktaları bul
    private getAdjacentPoints(botColor: PlayerColor, point: number): number[] {
        const result: number[] = [];
        
        // İleri ve geri 3'er nokta kontrol et
        if (botColor === 'white') {
            // Beyaz için (yukarı doğru hareket)
            for (let i = -3; i <= 3; i++) {
                if (i !== 0) {
                    result.push(point + i);
                }
            }
        } else {
            // Siyah için (aşağı doğru hareket)
            for (let i = -3; i <= 3; i++) {
                if (i !== 0) {
                    result.push(point - i);
                }
            }
        }
        
        return result;
    }
    
    // Hamlenin güvenli olup olmadığını kontrol et
    private isSafeMove(gameState: any, botColor: PlayerColor, fromPoint: number, toPoint: number): boolean {
        // Bar'dan çıkış her zaman gereklidir
        if (fromPoint === -1) return true;
        
        // Kaynakta birden fazla pul kalıyorsa güvenli
        if (gameState.points[fromPoint].checkers > 2) return true;
        
        // Hedefte zaten pul varsa güvenli
        if (gameState.points[toPoint].color === botColor && gameState.points[toPoint].checkers > 0) return true;
        
        // Diğer durumlarda, 6 birimlik çevreleyen alanda rakip tekilliği kontrol et
        const checkRange = 6;
        const enemyColor = botColor === 'white' ? 'black' : 'white';
        
        for (let i = 1; i <= checkRange; i++) {
            const checkPoint = botColor === 'white' ? toPoint - i : toPoint + i;
            
            // Sınırlar içinde mi kontrol et
            if (checkPoint >= 0 && checkPoint < 24) {
                if (gameState.points[checkPoint].color === enemyColor && gameState.points[checkPoint].checkers === 1) {
                    // Rakibin tek pulu yakında, riskli hamle
                    return false;
                }
            }
        }
        
        return true;
    }
} 