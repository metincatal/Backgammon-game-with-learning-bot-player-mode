import { GameManager } from '../GameManager';
import { PlayerColor } from '../types/PlayerColor';
import { IBackgammonAlgorithm, PossibleMove, AlgorithmType } from './IBackgammonAlgorithm';
import { IGameState } from '../interfaces/IGameState';

export class MinimaxAlgorithm implements IBackgammonAlgorithm {
    // Arama derinliği (oyunda doğrudan derinliği değiştirmek için kullanılabilir)
    private readonly searchDepth: number = 2;
    
    public getName(): string {
        return AlgorithmType.MINIMAX;
    }
    
    public getDescription(): string {
        return "Minimax algoritması Alpha-Beta budama kullanarak belirli bir derinliğe kadar hamleleri değerlendirir ve en iyi hamleyi seçer.";
    }
    
    public calculateBestMove(gameManager: GameManager, botColor: PlayerColor): PossibleMove | null {
        // Tüm olası hamleleri bul
        const possibleMoves = this.findAllPossibleMoves(gameManager, botColor);
        
        // Hamle yoksa null döndür
        if (possibleMoves.length === 0) {
            return null;
        }
        
        // Performans için analiz edilecek hamle sayısını sınırla
        const limitedMoves = this.prefilterMoves(gameManager, possibleMoves);
        
        // Her hamle için Minimax skorunu hesapla
        for (const move of limitedMoves) {
            // Hamleyi geçici olarak uygula ve skoru hesapla
            const gameCopy = this.cloneGameState(gameManager.getGameState());
            this.applyMoveToGameState(gameCopy, botColor, move.fromPoint, move.toPoint);
            
            // Minimax algoritmasını başlat (Alpha-Beta ile)
            const score = this.minimax(
                gameCopy, 
                this.searchDepth - 1, 
                -Infinity, 
                Infinity, 
                false, 
                botColor
            );
            
            move.score = score;
        }
        
        // En yüksek skora sahip hamleyi seç
        limitedMoves.sort((a, b) => b.score - a.score);
        
        return limitedMoves[0];
    }
    
    // Minimax algoritması (Alpha-Beta budama ile)
    private minimax(
        gameState: IGameState, 
        depth: number, 
        alpha: number, 
        beta: number, 
        isMaximizing: boolean, 
        botColor: PlayerColor
    ): number {
        // Temel durum: derinliğe ulaşıldı veya oyun bitdi
        if (depth === 0 || this.isGameOver(gameState)) {
            return this.evaluateBoard(gameState, botColor);
        }
        
        // Hamle sırası değişir - bot veya rakip için hamle hesaplama
        const currentColor = isMaximizing ? botColor : (botColor === 'white' ? 'black' : 'white');
        
        // Tüm olası hamleleri bul (bar + 24 nokta kontrolü)
        const possibleMoves: {from: number, to: number}[] = [];
        
        // Bar'dan çıkış hamleleri
        if (this.hasCheckerInBar(gameState, currentColor)) {
            const barExitPoints = this.getBarExitPoints(gameState, currentColor);
            for (const exitPoint of barExitPoints) {
                possibleMoves.push({from: -1, to: exitPoint});
            }
        } else {
            // Normal hamleleri kontrol et
            for (let i = 0; i < gameState.points.length; i++) {
                const point = gameState.points[i];
                if (point.color === currentColor && point.checkers > 0) {
                    const destinations = this.getValidMoves(gameState, currentColor, i);
                    for (const destination of destinations) {
                        possibleMoves.push({from: i, to: destination});
                    }
                }
            }
        }
        
        // Hamle yoksa, mevcut tabloyu değerlendir
        if (possibleMoves.length === 0) {
            return this.evaluateBoard(gameState, botColor);
        }
        
        // Maksimizasyon veya minimizasyon hamlesi
        if (isMaximizing) {
            let maxEval = -Infinity;
            
            for (const move of possibleMoves) {
                // Hamleyi geçici olarak uygula
                const gameCopy = this.cloneGameState(gameState);
                this.applyMoveToGameState(gameCopy, currentColor, move.from, move.to);
                
                // Minimax'ı özyinelemeli olarak çağır
                const evalValue = this.minimax(gameCopy, depth - 1, alpha, beta, false, botColor);
                maxEval = Math.max(maxEval, evalValue);
                
                // Alpha-Beta budama
                alpha = Math.max(alpha, evalValue);
                if (beta <= alpha) {
                    break; // Beta kesimi
                }
            }
            
            return maxEval;
        } else {
            let minEval = Infinity;
            
            for (const move of possibleMoves) {
                // Hamleyi geçici olarak uygula
                const gameCopy = this.cloneGameState(gameState);
                this.applyMoveToGameState(gameCopy, currentColor, move.from, move.to);
                
                // Minimax'ı özyinelemeli olarak çağır
                const evalValue = this.minimax(gameCopy, depth - 1, alpha, beta, true, botColor);
                minEval = Math.min(minEval, evalValue);
                
                // Alpha-Beta budama
                beta = Math.min(beta, evalValue);
                if (beta <= alpha) {
                    break; // Alpha kesimi
                }
            }
            
            return minEval;
        }
    }
    
    // Tüm olası hamleleri bul
    private findAllPossibleMoves(gameManager: GameManager, botColor: PlayerColor): PossibleMove[] {
        const possibleMoves: PossibleMove[] = [];
        
        // Bar'da taş varsa sadece bar'dan hamleleri kontrol et
        if (gameManager.hasCheckerInBar()) {
            const barMoves = gameManager.getAvailableMoves(-1);
            
            for (const toPoint of barMoves) {
                possibleMoves.push({ fromPoint: -1, toPoint, score: 0 });
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
                    possibleMoves.push({ fromPoint: i, toPoint, score: 0 });
                }
            }
        }
        
        return possibleMoves;
    }
    
    // Değerlendirilecek hamle sayısını ön filtreleme ile azalt
    private prefilterMoves(gameManager: GameManager, possibleMoves: PossibleMove[]): PossibleMove[] {
        // Çok fazla hamle varsa, ön değerlendirme yap ve en iyi hamlelerle devam et
        if (possibleMoves.length > 8) {
            // Her hamle için basit bir skor hesapla
            for (const move of possibleMoves) {
                move.score = this.simpleEvaluateMove(
                    gameManager.getGameState(), 
                    gameManager.getCurrentPlayer(), 
                    move.fromPoint, 
                    move.toPoint
                );
            }
            
            // En iyi 8 hamleyi seç
            possibleMoves.sort((a, b) => b.score - a.score);
            return possibleMoves.slice(0, 8);
        }
        
        return possibleMoves;
    }
    
    // Oyun durumunu değerlendirme fonksiyonu
    private evaluateBoard(gameState: IGameState, botColor: PlayerColor): number {
        let score = 0;
        const opponentColor = botColor === 'white' ? 'black' : 'white';
        
        // Bar değerlendirmesi
        const botBarCount = botColor === 'white' ? gameState.bar.whiteCheckers : gameState.bar.blackCheckers;
        const opponentBarCount = botColor === 'white' ? gameState.bar.blackCheckers : gameState.bar.whiteCheckers;
        
        score -= botBarCount * 50; // Bar'da kendi pulların olması kötü
        score += opponentBarCount * 40; // Rakip pullarının bar'da olması iyi
        
        // Toplanan pul değerlendirmesi
        const botCollectedCount = botColor === 'white' ? gameState.collected.white : gameState.collected.black;
        const opponentCollectedCount = botColor === 'white' ? gameState.collected.black : gameState.collected.white;
        
        score += botCollectedCount * 60; // Toplanan her pul çok değerli
        score -= opponentCollectedCount * 50; // Rakibin topladığı her pul dezavantaj
        
        // İlerleme değerlendirmesi
        let botProgress = 0;
        let opponentProgress = 0;
        let botBlotCount = 0;
        let opponentBlotCount = 0;
        let botSafePointCount = 0;
        let opponentSafePointCount = 0;
        
        // Tüm noktaları değerlendir
        for (let i = 0; i < 24; i++) {
            const point = gameState.points[i];
            
            if (point.color === botColor && point.checkers > 0) {
                // Bot ilerleme değerlendirmesi
                if (botColor === 'white') {
                    botProgress += i * point.checkers; // Beyaz için daha yüksek pozisyonlar daha iyi
                } else {
                    botProgress += (23 - i) * point.checkers; // Siyah için daha düşük pozisyonlar daha iyi
                }
                
                // Tekli pullar (blotlar)
                if (point.checkers === 1) {
                    botBlotCount++;
                } else if (point.checkers >= 2) {
                    botSafePointCount++;
                }
                
            } else if (point.color === opponentColor && point.checkers > 0) {
                // Rakip ilerleme değerlendirmesi
                if (opponentColor === 'white') {
                    opponentProgress += i * point.checkers;
                } else {
                    opponentProgress += (23 - i) * point.checkers;
                }
                
                // Tekli pullar (blotlar)
                if (point.checkers === 1) {
                    opponentBlotCount++;
                } else if (point.checkers >= 2) {
                    opponentSafePointCount++;
                }
            }
        }
        
        // İlerleme puanı normalizasyonu - daha fazla ilerleme daha iyi
        score += (botProgress / 100) * 20;
        score -= (opponentProgress / 100) * 20;
        
        // Güvenli noktalar ve blotlar
        score -= botBlotCount * 15; // Kendi blotların dezavantaj
        score += opponentBlotCount * 10; // Rakip blotlar avantaj
        score += botSafePointCount * 8; // Güvenli noktalar avantaj
        score -= opponentSafePointCount * 7; // Rakip güvenli noktalar dezavantaj
        
        // Ev bölgesinde kapı yapısını kontrol et
        score += this.evaluateHomeBoard(gameState, botColor) * 25;
        score -= this.evaluateHomeBoard(gameState, opponentColor) * 20;
        
        return score;
    }
    
    // Basit hamle değerlendirmesi (ön filtreleme için)
    private simpleEvaluateMove(gameState: IGameState, botColor: PlayerColor, fromPoint: number, toPoint: number): number {
        let score = 0;
        
        // Bar'dan çıkış hamleleri
        if (fromPoint === -1) {
            score += 200;
        }
        
        // Rakip pul kırma hamlesi
        if (this.willCaptureChecker(gameState, botColor, toPoint)) {
            score += 150;
        }
        
        // Ev bölgesine taşıma
        if (this.isInHomeBoard(botColor, toPoint)) {
            score += 100;
        }
        
        // Kapı oluşturma
        if (gameState.points[toPoint]?.color === botColor) {
            score += 50;
        }
        
        // Blot koruması
        if (gameState.points[fromPoint]?.checkers === 1 && fromPoint !== -1) {
            score += 80;
        }
        
        // Toplama hamleleri
        if (toPoint === 99) {
            score += 250;
        }
        
        return score;
    }
    
    // Tavla motorundan bağımsız olarak işlevleri uygulama
    
    // Bar'da taş olup olmadığını kontrol et
    private hasCheckerInBar(gameState: IGameState, color: PlayerColor): boolean {
        return color === 'white' ? gameState.bar.whiteCheckers > 0 : gameState.bar.blackCheckers > 0;
    }
    
    // Bar'dan çıkış noktalarını bul
    private getBarExitPoints(gameState: IGameState, color: PlayerColor): number[] {
        // Bu fonksiyon zar değerlerine göre değişir
        // Basitleştirilmiş sürüm - gerçek oyunda zarlarla sınırlı olacak
        const validPoints: number[] = [];
        
        // Beyaz ve siyah için farklı çıkış noktaları
        const startRange = color === 'white' ? 0 : 18;
        const endRange = color === 'white' ? 5 : 23;
        
        for (let i = startRange; i <= endRange; i++) {
            const point = gameState.points[i];
            if (point.color !== (color === 'white' ? 'black' : 'white') || point.checkers <= 1) {
                validPoints.push(i);
            }
        }
        
        return validPoints;
    }
    
    // Belirli bir noktadan geçerli hamleleri bul
    private getValidMoves(gameState: IGameState, color: PlayerColor, fromPoint: number): number[] {
        // Basitleştirilmiş sürüm - gerçek oyunda zarlarla sınırlı olacak
        const validMoves: number[] = [];
        
        // Beyaz için yukarı, siyah için aşağı hareket
        const direction = color === 'white' ? 1 : -1;
        const possibleMoves = [1, 2, 3, 4, 5, 6]; // Zar değerleri
        
        for (const moves of possibleMoves) {
            const targetPoint = fromPoint + (direction * moves);
            
            // Tahta sınırlarını kontrol et
            if (targetPoint >= 0 && targetPoint < 24) {
                const point = gameState.points[targetPoint];
                
                // Hedef nokta boş veya aynı renkte veya rakip tek pul ise geçerli
                if (point.checkers === 0 || point.color === color || (point.color !== color && point.checkers === 1)) {
                    validMoves.push(targetPoint);
                }
            }
        }
        
        // Toplama hamleleri için özel durum (gerçek oyunda daha karmaşık kurallar olacak)
        if (this.canBearOff(gameState, color) && this.isInHomeBoard(color, fromPoint)) {
            validMoves.push(99); // 99 toplama noktasını temsil eder
        }
        
        return validMoves;
    }
    
    // Puanları toplayıp toplayamayacağını kontrol et
    private canBearOff(gameState: IGameState, color: PlayerColor): boolean {
        // Bar'da taş varsa, toplayamaz
        if (this.hasCheckerInBar(gameState, color)) return false;

        // Ev bölgesi dışında taş olup olmadığını kontrol et
        const homeRange = color === 'white' 
            ? { start: 18, end: 23 }  // Beyaz için ev bölgesi: 18-23
            : { start: 0, end: 5 };   // Siyah için ev bölgesi: 0-5
        
        // Ev bölgesi dışında taş kontrolü
        for (let i = 0; i < 24; i++) {
            // Oyuncunun rengine göre ev bölgesi dışında taş var mı kontrol edelim
            if (color === 'white') {
                // Beyaz için ev bölgesi 18-23 arası, bu aralık dışındaki taşlar kontrol edilmeli
                if (i < homeRange.start && gameState.points[i].color === color && gameState.points[i].checkers > 0) {
                    return false;
                }
            } else {
                // Siyah için ev bölgesi 0-5 arası, bu aralık dışındaki taşlar kontrol edilmeli
                if (i > homeRange.end && gameState.points[i].color === color && gameState.points[i].checkers > 0) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    // Ev bölgesini değerlendir
    private evaluateHomeBoard(gameState: IGameState, color: PlayerColor): number {
        let score = 0;
        const homeRange = color === 'white' 
            ? { start: 18, end: 23 }  // Beyaz için ev bölgesi: 18-23
            : { start: 0, end: 5 };   // Siyah için ev bölgesi: 0-5
        
        // Ev bölgesindeki taşları değerlendir
        let consecutivePoints = 0;
        for (let i = homeRange.start; i <= homeRange.end; i++) {
            const point = gameState.points[i];
            if (point.color === color && point.checkers >= 2) {
                consecutivePoints++;
                
                // Art arda kapılar daha değerli
                if (consecutivePoints > 1) {
                    score += consecutivePoints;
                }
            } else {
                consecutivePoints = 0;
            }
        }
        
        return score;
    }
    
    // Hamlenin rakip pul kıracağını kontrol et
    private willCaptureChecker(gameState: IGameState, color: PlayerColor, toPoint: number): boolean {
        const point = gameState.points[toPoint];
        const oppositeColor = color === 'white' ? 'black' : 'white';
        
        return point.color === oppositeColor && point.checkers === 1;
    }
    
    // Pulun ev bölgesinde olup olmadığını kontrol et
    private isInHomeBoard(color: PlayerColor, point: number): boolean {
        if (color === 'white') {
            return point >= 18 && point < 24;
        } else {
            return point >= 0 && point < 6;
        }
    }
    
    // Oyunun bitip bitmediğini kontrol et
    private isGameOver(gameState: IGameState): boolean {
        return gameState.collected.white === 15 || gameState.collected.black === 15;
    }
    
    // Oyun durumunu kopyala
    private cloneGameState(gameState: IGameState): IGameState {
        return JSON.parse(JSON.stringify(gameState));
    }
    
    // Bir hamleyi oyun durumuna uygula
    private applyMoveToGameState(gameState: IGameState, currentColor: PlayerColor, fromPoint: number, toPoint: number): void {
        // Bar'dan çıkış hamlesi
        if (fromPoint === -1) {
            // Bar'daki taşı azalt
            if (currentColor === 'white') {
                gameState.bar.whiteCheckers--;
            } else {
                gameState.bar.blackCheckers--;
            }
            
            // Rakip taşı kırma
            if (gameState.points[toPoint].color !== currentColor && gameState.points[toPoint].checkers === 1) {
                const capturedColor = currentColor === 'white' ? 'black' : 'white';
                
                // Taşı bar'a taşı
                if (capturedColor === 'white') {
                    gameState.bar.whiteCheckers++;
                } else {
                    gameState.bar.blackCheckers++;
                }
                
                // Noktayı temizle
                gameState.points[toPoint].checkers = 0;
            }
            
            // Hedef noktayı güncelle
            gameState.points[toPoint].color = currentColor;
            gameState.points[toPoint].checkers++;
            
            return;
        }
        
        // Toplama hamlesi
        if (toPoint === 99) {
            // Kaynak noktadan taşı al
            gameState.points[fromPoint].checkers--;
            
            // Noktayı temizle, eğer son taş kaldırıldıysa
            if (gameState.points[fromPoint].checkers === 0) {
                gameState.points[fromPoint].color = null;
            }
            
            // Toplanan taşları artır
            if (currentColor === 'white') {
                gameState.collected.white++;
            } else {
                gameState.collected.black++;
            }
            
            return;
        }
        
        // Normal hamle
        // Kaynak noktadan taşı al
        gameState.points[fromPoint].checkers--;
        
        // Noktayı temizle, eğer son taş kaldırıldıysa
        if (gameState.points[fromPoint].checkers === 0) {
            gameState.points[fromPoint].color = null;
        }
        
        // Rakip taşı kırma
        if (gameState.points[toPoint].color !== currentColor && gameState.points[toPoint].checkers === 1) {
            const capturedColor = currentColor === 'white' ? 'black' : 'white';
            
            // Taşı bar'a taşı
            if (capturedColor === 'white') {
                gameState.bar.whiteCheckers++;
            } else {
                gameState.bar.blackCheckers++;
            }
            
            // Noktayı temizle
            gameState.points[toPoint].checkers = 0;
        }
        
        // Hedef noktayı güncelle
        gameState.points[toPoint].color = currentColor;
        gameState.points[toPoint].checkers++;
    }
} 