import { GameManager } from '../GameManager';
import { PlayerColor } from '../types/PlayerColor';
import { IBackgammonAlgorithm, PossibleMove, AlgorithmType } from './IBackgammonAlgorithm';
import { IGameState } from '../interfaces/IGameState';

// Monte Carlo Ağaç Arama düğümü
interface MCTSNode {
    state: IGameState;
    parent: MCTSNode | null;
    children: MCTSNode[];
    visits: number;
    wins: number;
    untriedMoves: {from: number, to: number}[];
    playerJustMoved: PlayerColor;
}

export class MonteCarloAlgorithm implements IBackgammonAlgorithm {
    // Simülasyon sayısı - bu değer değiştirilebilir (daha yüksek = daha iyi tahmin, daha uzun süre)
    private readonly simulationCount: number = 500;
    // Keşif katsayısı - daha yüksek = daha fazla keşif, daha düşük = daha fazla sömürü
    private readonly explorationConstant: number = 1.414; // sqrt(2)
    
    public getName(): string {
        return AlgorithmType.MONTE_CARLO;
    }
    
    public getDescription(): string {
        return "Monte Carlo Ağaç Arama, çok sayıda rastgele oyun simülasyonu çalıştırarak en iyi hamleyi belirler.";
    }
    
    public calculateBestMove(gameManager: GameManager, botColor: PlayerColor): PossibleMove | null {
        // Tüm olası hamleleri bul
        const possibleMoves = this.findAllPossibleMoves(gameManager, botColor);
        
        // Hamle yoksa null döndür
        if (possibleMoves.length === 0) {
            return null;
        }
        
        // Çok fazla hamle varsa, ön filtreleme yap
        const filteredMoves = this.prefilterMoves(gameManager.getGameState(), possibleMoves, botColor);
        
        // MCTS için yeterli sayıda hamle yoksa, basit değerlendirme yap
        if (filteredMoves.length <= 1) {
            return filteredMoves[0];
        }
        
        // Her hamle için Monte Carlo Ağaç Araması yap
        for (const move of filteredMoves) {
            // Tahta kopyası oluştur ve hamleyi uygula
            const clonedState = this.cloneGameState(gameManager.getGameState());
            this.applyMoveToGameState(clonedState, botColor, move.fromPoint, move.toPoint);
            
            // Bu durumdan başlayan Monte Carlo simülasyonları yap
            const winRate = this.runMCTS(clonedState, botColor);
            move.score = winRate;
        }
        
        // En yüksek skora (kazanma oranına) sahip hamleyi seç
        filteredMoves.sort((a, b) => b.score - a.score);
        
        return filteredMoves[0];
    }
    
    // Monte Carlo Ağaç Araması algoritması
    private runMCTS(initialState: IGameState, botColor: PlayerColor): number {
        // Kök düğüm oluştur
        const rootNode: MCTSNode = {
            state: initialState,
            parent: null,
            children: [],
            visits: 0,
            wins: 0,
            untriedMoves: this.getAllPossibleMovesForState(initialState, botColor),
            playerJustMoved: botColor === 'white' ? 'black' : 'white' // Botun hamlesi sonrası rakip hamle yapmış gibi
        };
        
        // Simülasyon döngüsü
        for (let i = 0; i < this.simulationCount; i++) {
            // Ağaçta aşağı doğru ilerle
            let node = this.treePolicy(rootNode, botColor);
            
            // Terminal durumuna ulaşana kadar rastgele hamle yap
            const result = this.defaultPolicy(node.state, node.playerJustMoved, botColor);
            
            // Sonuçları yukarı doğru yay
            this.backpropagate(node, result, botColor);
        }
        
        // En iyi hamle - en çok ziyaret edilen çocuk
        if (rootNode.children.length === 0) {
            return 0.5; // Hamle yoksa nötr değer
        }
        
        // En çok ziyaret edilen çocuk
        rootNode.children.sort((a, b) => b.visits - a.visits);
        
        // Bu duruma gelen hamlenin kazanma oranını döndür
        return rootNode.children[0].wins / rootNode.children[0].visits;
    }
    
    // Ağaç politikası - ağaçta aşağı doğru ilerleme stratejisi
    private treePolicy(node: MCTSNode, botColor: PlayerColor): MCTSNode {
        // Oyun bitti mi kontrol et
        if (this.isGameOver(node.state)) {
            return node;
        }
        
        // Eğer düğümün denenmemiş hamleleri varsa
        if (node.untriedMoves.length > 0) {
            // Denenmemiş bir hamle seç
            const moveIndex = Math.floor(Math.random() * node.untriedMoves.length);
            const move = node.untriedMoves[moveIndex];
            
            // Hamleyi listeden kaldır
            node.untriedMoves.splice(moveIndex, 1);
            
            // Yeni durum oluştur
            const nextState = this.cloneGameState(node.state);
            const nextPlayer = node.playerJustMoved === 'white' ? 'black' : 'white';
            this.applyMoveToGameState(nextState, nextPlayer, move.from, move.to);
            
            // Yeni çocuk düğüm oluştur
            const childNode: MCTSNode = {
                state: nextState,
                parent: node,
                children: [],
                visits: 0,
                wins: 0,
                untriedMoves: this.getAllPossibleMovesForState(nextState, nextPlayer === 'white' ? 'black' : 'white' as PlayerColor),
                playerJustMoved: nextPlayer
            };
            
            // Çocuğu düğüme ekle
            node.children.push(childNode);
            
            return childNode;
        } else if (node.children.length > 0) {
            // UCB1 formülü ile en iyi çocuğu seç
            return this.treePolicy(this.selectChild(node), botColor);
        }
        
        // Yaprak düğüm, daha fazla hamle yok
        return node;
    }
    
    // UCB1 formülü ile en iyi çocuğu seç
    private selectChild(node: MCTSNode): MCTSNode {
        // Her çocuk için UCB değerini hesapla
        let bestChild: MCTSNode | null = null;
        let bestValue = -Infinity;
        
        for (const child of node.children) {
            // UCB1 formülü
            const exploitation = child.wins / child.visits;
            const exploration = Math.sqrt(2 * Math.log(node.visits) / child.visits);
            const ucbValue = exploitation + this.explorationConstant * exploration;
            
            if (ucbValue > bestValue) {
                bestValue = ucbValue;
                bestChild = child;
            }
        }
        
        return bestChild!;
    }
    
    // Varsayılan politika - rastgele hamlelerle simülasyon
    private defaultPolicy(state: IGameState, playerJustMoved: PlayerColor, botColor: PlayerColor): number {
        // Durumu kopyala
        const clonedState = this.cloneGameState(state);
        let currentPlayer: PlayerColor = playerJustMoved === 'white' ? 'black' : 'white';
        
        // Oyun bitene kadar rastgele hamleler yap
        let moveCount = 0;
        const maxMoves = 100; // Sonsuz döngüleri önlemek için
        
        while (!this.isGameOver(clonedState) && moveCount < maxMoves) {
            // Olası tüm hamleleri bul
            const possibleMoves = this.getAllPossibleMovesForState(clonedState, currentPlayer);
            
            // Hamle yoksa sırayı diğer oyuncuya ver
            if (possibleMoves.length === 0) {
                currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
                continue;
            }
            
            // Rastgele bir hamle seç
            const randomMoveIndex = Math.floor(Math.random() * possibleMoves.length);
            const randomMove = possibleMoves[randomMoveIndex];
            
            // Hamleyi uygula
            this.applyMoveToGameState(clonedState, currentPlayer, randomMove.from, randomMove.to);
            
            // Oyuncuyu değiştir
            currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
            moveCount++;
        }
        
        // Sonucu hesapla
        return this.getResult(clonedState, botColor);
    }
    
    // Sonucu geriye doğru yay
    private backpropagate(node: MCTSNode, result: number, botColor: PlayerColor): void {
        // Düğümü güncelle
        node.visits++;
        
        // Eğer bot kazandıysa kazanç sayısını artır
        if ((node.playerJustMoved === botColor && result === 1) || 
            (node.playerJustMoved !== botColor && result === 0)) {
            node.wins++;
        } else if (result === 0.5) {
            // Beraberlik durumunda yarım puan
            node.wins += 0.5;
        }
        
        // Üst düğüme geç
        if (node.parent) {
            this.backpropagate(node.parent, result, botColor);
        }
    }
    
    // Simülasyon sonucunu hesapla (1 = bot kazandı, 0 = rakip kazandı, 0.5 = berabere)
    private getResult(state: IGameState, botColor: PlayerColor): number {
        // Toplanan taşlara göre kazananı belirle
        const botCollected = botColor === 'white' ? state.collected.white : state.collected.black;
        const opponentCollected = botColor === 'white' ? state.collected.black : state.collected.white;
        
        if (botCollected === 15) {
            return 1; // Bot kazandı
        } else if (opponentCollected === 15) {
            return 0; // Rakip kazandı
        }
        
        // Oyun bitmemişse, tahtayı değerlendir
        const botProgress = this.evaluateBoardProgress(state, botColor);
        const opponentProgress = this.evaluateBoardProgress(state, botColor === 'white' ? 'black' : 'white');
        
        // İlerlemeye göre tahmin yap
        if (botProgress > opponentProgress + 30) {
            return 0.75; // Bot muhtemelen kazanacak
        } else if (opponentProgress > botProgress + 30) {
            return 0.25; // Rakip muhtemelen kazanacak
        }
        
        return 0.5; // Belirsiz sonuç
    }
    
    // Oyun durumundaki ilerlemeyi hesapla
    private evaluateBoardProgress(state: IGameState, color: PlayerColor): number {
        let progress = 0;
        
        // Toplanan taşlar
        const collectedCount = color === 'white' ? state.collected.white : state.collected.black;
        progress += collectedCount * 100;
        
        // Bar'daki taşlar
        const barCount = color === 'white' ? state.bar.whiteCheckers : state.bar.blackCheckers;
        progress -= barCount * 50;
        
        // Taşların konumu
        for (let i = 0; i < 24; i++) {
            const point = state.points[i];
            if (point.color === color && point.checkers > 0) {
                // Beyaz ve siyah için farklı puanlama
                if (color === 'white') {
                    // Beyaz için yüksek numaralı noktalar daha iyi
                    progress += (i + 1) * point.checkers * 2;
                } else {
                    // Siyah için düşük numaralı noktalar daha iyi
                    progress += (24 - i) * point.checkers * 2;
                }
            }
        }
        
        return progress;
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
    private prefilterMoves(gameState: IGameState, possibleMoves: PossibleMove[], botColor: PlayerColor): PossibleMove[] {
        // Çok fazla hamle varsa, ön değerlendirme yap
        if (possibleMoves.length > 10) {
            // Her hamle için basit bir skor hesapla
            for (const move of possibleMoves) {
                move.score = this.simpleEvaluateMove(gameState, botColor, move.fromPoint, move.toPoint);
            }
            
            // En iyi 10 hamleyi seç
            possibleMoves.sort((a, b) => b.score - a.score);
            return possibleMoves.slice(0, 10);
        }
        
        return possibleMoves;
    }
    
    // Basit hamle değerlendirmesi
    private simpleEvaluateMove(gameState: IGameState, botColor: PlayerColor, fromPoint: number, toPoint: number): number {
        let score = 0;
        
        // Bar'dan çıkış hamleleri
        if (fromPoint === -1) {
            score += 100;
        }
        
        // Rakip pul kırma hamlesi
        if (this.willCaptureChecker(gameState, botColor, toPoint)) {
            score += 80;
        }
        
        // Ev bölgesine taşıma
        if (this.isInHomeBoard(botColor, toPoint)) {
            score += 50;
        }
        
        // Toplama hamleleri
        if (toPoint === 99) {
            score += 150;
        }
        
        // Blot koruması
        if (fromPoint !== -1 && gameState.points[fromPoint].checkers === 1) {
            score += 40;
        }
        
        return score;
    }
    
    // Durum için tüm olası hamleleri al
    private getAllPossibleMovesForState(state: IGameState, currentPlayer: PlayerColor): {from: number, to: number}[] {
        const possibleMoves: {from: number, to: number}[] = [];
        
        // Bar'da taş kontrolü
        if (this.hasCheckerInBar(state, currentPlayer)) {
            // Bar hamleleri
            const barMoves = this.getBarMovePoints(state, currentPlayer);
            
            for (const to of barMoves) {
                possibleMoves.push({from: -1, to});
            }
            
            return possibleMoves;
        }
        
        // Normal hamleler
        for (let i = 0; i < 24; i++) {
            const point = state.points[i];
            
            if (point.color === currentPlayer && point.checkers > 0) {
                // Olası hedef noktaları bul
                const targetPoints = this.getMoveTargetPoints(state, currentPlayer, i);
                
                for (const to of targetPoints) {
                    possibleMoves.push({from: i, to});
                }
            }
        }
        
        return possibleMoves;
    }
    
    // Bar'dan çıkış noktalarını bul
    private getBarMovePoints(state: IGameState, color: PlayerColor): number[] {
        const validPoints: number[] = [];
        
        // Zarlar 1-6 arası değerler olabilir
        const possibleValues = [1, 2, 3, 4, 5, 6];
        
        for (const value of possibleValues) {
            const point = color === 'white' ? value - 1 : 24 - value;
            
            // Nokta boş ya da tek rakip taş veya kendi renginse
            if (0 <= point && point < 24) {
                const targetPoint = state.points[point];
                if (targetPoint.color === color || 
                    targetPoint.checkers === 0 || 
                    (targetPoint.color !== color && targetPoint.checkers === 1)) {
                    validPoints.push(point);
                }
            }
        }
        
        return validPoints;
    }
    
    // Bir noktadan yapılabilecek hamleleri bul
    private getMoveTargetPoints(state: IGameState, color: PlayerColor, fromPoint: number): number[] {
        const validPoints: number[] = [];
        
        // Zarlar 1-6 arası değerler olabilir
        const possibleValues = [1, 2, 3, 4, 5, 6];
        
        for (const value of possibleValues) {
            // Hareket yönü
            const direction = color === 'white' ? 1 : -1;
            const point = fromPoint + (direction * value);
            
            // Tahta sınırları içinde mi?
            if (0 <= point && point < 24) {
                const targetPoint = state.points[point];
                
                // Nokta boş, kendi rengin veya tek rakip taş mı?
                if (targetPoint.color === color || 
                    targetPoint.checkers === 0 || 
                    (targetPoint.color !== color && targetPoint.checkers === 1)) {
                    validPoints.push(point);
                }
            }
        }
        
        // Toplama hamleleri için özel durum
        if (this.canBearOff(state, color) && this.isInHomeBoard(color, fromPoint)) {
            validPoints.push(99); // 99 toplama noktasını temsil eder
        }
        
        return validPoints;
    }
    
    // Yardımcı işlevler
    
    // Bar'da taş var mı?
    private hasCheckerInBar(state: IGameState, color: PlayerColor): boolean {
        return color === 'white' ? state.bar.whiteCheckers > 0 : state.bar.blackCheckers > 0;
    }
    
    // Hamle rakip pul kıracak mı?
    private willCaptureChecker(state: IGameState, color: PlayerColor, toPoint: number): boolean {
        if (toPoint < 0 || toPoint >= 24 || toPoint === 99) return false;
        
        const point = state.points[toPoint];
        const oppositeColor = color === 'white' ? 'black' : 'white';
        
        return point.color === oppositeColor && point.checkers === 1;
    }
    
    // Ev bölgesinde mi?
    private isInHomeBoard(color: PlayerColor, point: number): boolean {
        if (point === 99) return true; // Toplama hamleleri için
        if (point < 0 || point >= 24) return false;
        
        return color === 'white' ? point >= 18 : point <= 5;
    }
    
    // Pulları toplayabilir mi?
    private canBearOff(state: IGameState, color: PlayerColor): boolean {
        // Bar'da taş varsa toplama yapılamaz
        if (this.hasCheckerInBar(state, color)) {
            return false;
        }
        
        // Ev bölgesi dışında taş var mı kontrol et
        for (let i = 0; i < 24; i++) {
            if (state.points[i].color === color && state.points[i].checkers > 0) {
                // Ev bölgesi dışındaki taşları kontrol et
                if ((color === 'white' && i < 18) || (color === 'black' && i > 5)) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    // Oyun bitti mi?
    private isGameOver(state: IGameState): boolean {
        return state.collected.white === 15 || state.collected.black === 15;
    }
    
    // Oyun durumunu kopyala
    private cloneGameState(state: IGameState): IGameState {
        return JSON.parse(JSON.stringify(state));
    }
    
    // Bir hamleyi oyun durumuna uygula
    private applyMoveToGameState(state: IGameState, currentPlayer: PlayerColor, fromPoint: number, toPoint: number): void {
        // Bar'dan çıkış hamlesi
        if (fromPoint === -1) {
            // Bar'daki taşı azalt
            if (currentPlayer === 'white') {
                state.bar.whiteCheckers--;
            } else {
                state.bar.blackCheckers--;
            }
            
            // Hedef noktada rakip tek taş varsa kır
            if (toPoint < 24 && state.points[toPoint].color !== currentPlayer && state.points[toPoint].checkers === 1) {
                // Rakip rengini belirle
                const oppositeColor = currentPlayer === 'white' ? 'black' : 'white';
                
                // Rakip taşı bar'a ekle
                if (oppositeColor === 'white') {
                    state.bar.whiteCheckers++;
                } else {
                    state.bar.blackCheckers++;
                }
                
                // Hedef noktayı temizle
                state.points[toPoint].checkers = 0;
            }
            
            // Hedef noktaya taş ekle
            state.points[toPoint].color = currentPlayer;
            state.points[toPoint].checkers++;
            
            return;
        }
        
        // Toplama hamlesi
        if (toPoint === 99) {
            // Taşı noktadan al
            state.points[fromPoint].checkers--;
            
            // Eğer son taş alındıysa, noktayı temizle
            if (state.points[fromPoint].checkers === 0) {
                state.points[fromPoint].color = null;
            }
            
            // Toplanan taşları artır
            if (currentPlayer === 'white') {
                state.collected.white++;
            } else {
                state.collected.black++;
            }
            
            return;
        }
        
        // Normal hamle
        // Taşı kaynaktan al
        state.points[fromPoint].checkers--;
        
        // Eğer son taş alındıysa, noktayı temizle
        if (state.points[fromPoint].checkers === 0) {
            state.points[fromPoint].color = null;
        }
        
        // Hedefte rakip tek taş varsa kır
        if (state.points[toPoint].color !== currentPlayer && state.points[toPoint].checkers === 1) {
            // Rakip rengini belirle
            const oppositeColor = currentPlayer === 'white' ? 'black' : 'white';
            
            // Rakip taşı bar'a ekle
            if (oppositeColor === 'white') {
                state.bar.whiteCheckers++;
            } else {
                state.bar.blackCheckers++;
            }
            
            // Hedef noktayı temizle
            state.points[toPoint].checkers = 0;
        }
        
        // Taşı hedefe ekle
        state.points[toPoint].color = currentPlayer;
        state.points[toPoint].checkers++;
    }
} 