import { IGameState } from './interfaces/IGameState';
import { PlayerColor } from './types/PlayerColor';
import { IPoint } from './interfaces/IPoint';

interface MoveHistoryItem {
    fromPoint: number;
    toPoint: number;
    usedDice: number[];
    capturedChecker?: { color: PlayerColor; point: number };
    hitAndRun?: boolean;
}

export class GameManager {
    private gameState: IGameState;
    private currentPlayer: PlayerColor;
    private dice: number[] = [];
    private availableMoves: number[] = [];
    private showBarWarning: boolean = false;
    private moveHistory: MoveHistoryItem[] = [];

    constructor() {
        this.gameState = this.initializeGame();
        this.currentPlayer = 'white';
    }

    private initializeGame(): IGameState {
        const points: IPoint[] = Array(24).fill(null).map((_, index) => ({
            id: index,
            checkers: 0,
            color: null,
            isPlayable: false
        }));

        // Başlangıç pozisyonları - standart başlangıç (beyaz alt, siyah üst)
        const initialPositions: [number, number, PlayerColor][] = [
            [0, 2, 'white'],
            [5, 5, 'black'],
            [7, 3, 'black'],
            [11, 5, 'white'],
            [12, 5, 'black'],
            [16, 3, 'white'],
            [18, 5, 'white'],
            [23, 2, 'black']
        ];

        initialPositions.forEach(([index, count, color]) => {
            points[index].checkers = count;
            points[index].color = color;
        });

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

    public rollDice(): number[] {
        // Zarları temizle
        this.availableMoves = [];
        this.dice = [];
        this.showBarWarning = false;

        // Yeni zarları at
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        
        console.log("Zarlar atıldı:", dice1, dice2, "mevcut oyuncu:", this.currentPlayer);
        
        // Çift zar gelirse 4 tane aynı zar göster
        if (dice1 === dice2) {
            this.dice = Array(4).fill(dice1);
            this.availableMoves = [...this.dice];
        } else {
            this.dice = [dice1, dice2];
            this.availableMoves = [...this.dice];
        }

        // Sadece mevcut oyuncunun kırık pullarını kontrol et
        if (this.hasCheckerInBar()) {
            const barMoves = this.getBarMoves();
            if (barMoves.length === 0) {
                // Bar'dan çıkış yapılamıyorsa
                this.showBarWarning = true; // Bu flag kesinlikle true olmalı
                // Zar haklarını boşalt, ama oyuncuyu değiştirme
                this.availableMoves = [];
                
                // Sırayı rakibe geç
                this.finishTurn();
                
                // Zarları göster, ama hareket ettirmeye izin verme
                return this.dice;
            }
        } else {
            // Normal hamleleri kontrol et - canMakeAnyMove metodu kullan
            if (!this.canMakeAnyMove()) {
                // Hiç legal hamle yoksa
                this.availableMoves = []; // Zar haklarını boşalt
                
                // Sırayı rakibe geç
                this.finishTurn();
                
                return this.dice; // Zarları göster, ama hareket ettirmeye izin verme
            }
        }

        return this.dice;
    }

    // Yeni metod: Hamle bilgilerini temizle
    private clearMoveInfo(): void {
        this.availableMoves = [];
        this.dice = [];
        this.moveHistory = [];
    }

    public getAvailableMoves(fromPoint: number): number[] {
        // Bu debug mesajını ekleyelim
        console.log("getAvailableMoves çağrıldı. fromPoint:", fromPoint, "mevcut zarlar:", this.dice, "kullanılabilir zarlar:", this.availableMoves, "mevcut oyuncu:", this.currentPlayer);
        
        // Eğer zar yoksa hiç hamle önerme
        if (this.availableMoves.length === 0 || this.dice.length === 0) {
            console.log("Zar olmadığı için hamle önerilmiyor.");
            return [];
        }

        // Bar'da taş varsa sadece bar'dan çıkış hamleleri
        if (this.hasCheckerInBar()) {
            // Eğer fromPoint bar (-1) değilse, hiç hamle önerme
            if (fromPoint !== -1) {
                console.log("Bar'da taş var ama fromPoint bar değil. Hamle önerilmiyor.");
                return [];
            }
            console.log("Bar'dan çıkış hamleleri hesaplanıyor...");
            return this.getBarMoves();
        }

        // Eğer seçilen noktada geçerli taş yoksa
        if (fromPoint !== -1) { // Bar kontrolü değilse
            const sourcePoint = this.gameState.points[fromPoint];
            if (sourcePoint.color !== this.currentPlayer || sourcePoint.checkers === 0) {
                console.log("Geçersiz kaynak nokta. Oyuncu:", this.currentPlayer, "Nokta:", sourcePoint);
                return [];
            }
        }

        // Normal hamle önerileri
        console.log("Normal hamle önerileri hesaplanıyor...");

        // Eğer tüm pullar ev bölgesindeyse (toplama durumu), hem normal hamle hem de toplama hamle önerilerini birleştir
        if (this.canBearOff()) {
            const normalMoves = this.getNormalMoves(fromPoint);
            const bearOffMoves = this.getBearOffMoves(fromPoint);
            const allMoves = Array.from(new Set([...normalMoves, ...bearOffMoves]));
            console.log("Toplama durumu. Normal hamleler:", normalMoves, "Toplama hamleleri:", bearOffMoves, "Tüm hamleler:", allMoves);
            return allMoves; // Çakışanları kaldırıyoruz
        }

        // Normal hamleleri al
        const normalMoves = this.getNormalMoves(fromPoint);
        console.log("Normal hamle önerileri:", normalMoves);
        return normalMoves;
    }

    public hasCheckerInBar(): boolean {
        return (this.currentPlayer === 'white' && this.gameState.bar.whiteCheckers > 0) ||
                (this.currentPlayer === 'black' && this.gameState.bar.blackCheckers > 0);
    }

    public getBarMoves(): number[] {
        const availablePoints: number[] = [];
        const usedDice = new Set<number>();

        // Kırık taş sayısını kontrol et
        const brokenCheckers = this.currentPlayer === 'white' 
            ? this.gameState.bar.whiteCheckers 
            : this.gameState.bar.blackCheckers;

        // Normal zarlar için kontrol
        this.availableMoves.forEach(dice => {
            const targetPoint = this.currentPlayer === 'white' 
                ? dice - 1 
                : 24 - dice;
            
            if (this.isValidMove(-1, targetPoint)) {
                availablePoints.push(targetPoint);
                usedDice.add(dice);
            }
        });

        // Çift zar kontrolü - daha sıkı kontrol ekleyeceğiz
        if (this.availableMoves.length >= 2 && this.availableMoves[0] === this.availableMoves[1]) {
            const dice = this.availableMoves[0];
            
            // Önce basit durum: İlk zar kullanılabilir mi?
            const initialTargetPoint = this.currentPlayer === 'white'
                ? dice - 1
                : 24 - dice;
            
            // Eğer ilk zar bile kullanılamıyorsa, hiçbir hamle yapılamaz
            if (!this.isValidMove(-1, initialTargetPoint)) {
                return []; // Hiçbir hamle yapılamıyor
            }
            
            // Tek kırık taş varsa ve zar geçerli bir hamle yapabiliyorsa
            if (brokenCheckers === 1) {
                const maxMultiplier = Math.min(4, this.availableMoves.length);
                for (let i = 1; i <= maxMultiplier; i++) {
                    const targetPoint = this.currentPlayer === 'white'
                        ? (dice * i) - 1
                        : 24 - (dice * i);

                    if (!this.isValidMove(-1, targetPoint)) {
                        break;
                    }
                    availablePoints.push(targetPoint);
                }
            } else if (brokenCheckers > 1) {
                // Birden fazla kırık varsa sadece tek zar mesafesini kontrol et
                if (this.isValidMove(-1, initialTargetPoint)) {
                    availablePoints.push(initialTargetPoint);
                } else {
                    return []; // İlk adım bile yapılamıyorsa, hiçbir hamle yapılamaz
                }
            }
        }

        // Tek kırık taş varsa ve farklı zarlar varsa, toplamlarını kontrol et
        if (brokenCheckers === 1 && 
            this.availableMoves.length === 2 && 
            this.availableMoves[0] !== this.availableMoves[1] &&
            usedDice.size > 0) { // En az bir tekli zarla hamle yapılabiliyorsa
            
            const totalDice = this.availableMoves[0] + this.availableMoves[1];
            const targetPoint = this.currentPlayer === 'white'
                ? totalDice - 1
                : 24 - totalDice;

            if (this.isValidMove(-1, targetPoint)) {
                availablePoints.push(targetPoint);
            }
        }

        return availablePoints;
    }

    private isValidMove(fromPoint: number, targetPoint: number, isIntermediateStep: boolean = false): boolean {
        // Tahta dışına çıkma kontrolü
        if (targetPoint < 0 || targetPoint > 23) return false;

        // Bar'dan çıkış ise özel kontrol
        if (fromPoint === -1) {
            const targetPointState = this.gameState.points[targetPoint];
            
            // Hedef nokta boşsa veya kendi rengimizse
            if (targetPointState.checkers === 0 || targetPointState.color === this.currentPlayer) {
                return true;
            }
            
            // Rakip noktada birden fazla taş varsa (kapı), hamle yapılamaz
            if (targetPointState.color !== this.currentPlayer && targetPointState.checkers > 1) {
                return false;
            }
            
            // Rakip noktada tek taş varsa (kırma)
            return targetPointState.color !== this.currentPlayer && targetPointState.checkers === 1;
        }
        
        // Normal hamle
        const targetPointState = this.gameState.points[targetPoint];
        
        // Hedef nokta boşsa veya kendi rengimizse
        if (targetPointState.checkers === 0 || targetPointState.color === this.currentPlayer) {
            return true;
        }
        
        // Rakip noktada birden fazla taş varsa (kapı), hamle yapılamaz
        if (targetPointState.color !== this.currentPlayer && targetPointState.checkers > 1) {
            return false;
        }

        // Eğer ara adım kontrolüyse ve rakibin tek pulu varsa - bu durumda kırma zorunlu
        if (isIntermediateStep && targetPointState.color !== this.currentPlayer && targetPointState.checkers === 1) {
            return false; // Ara adımda rakip pulu kırılamaz, yol kapanmış kabul edilir
        }

        // Rakip noktada tek taş varsa (kırma)
        return targetPointState.color !== this.currentPlayer && targetPointState.checkers === 1;
    }

    public getGameState(): IGameState {
        return this.gameState;
    }

    public getCurrentPlayer(): PlayerColor {
        return this.currentPlayer;
    }

    public setCurrentPlayer(player: PlayerColor): void {
        this.currentPlayer = player;
    }

    public makeMove(fromPoint: number, toPoint: number): boolean {
        // Bar'da taş varsa sadece bar'dan çıkış hamlesi yapılabilir
        if (this.hasCheckerInBar()) {
            if (fromPoint !== -1) return false;
            
            // Bar'dan çıkış hamlesi kontrolü
            const barMoves = this.getBarMoves();
            if (!barMoves.includes(toPoint)) {
                return false;
            }

            // Çift zar kontrolü
            if (this.availableMoves.length >= 2 && this.availableMoves[0] === this.availableMoves[1]) {
                const dice = this.availableMoves[0];
                const distance = this.currentPlayer === 'white'
                    ? toPoint + 1
                    : 24 - toPoint;
                
                // Mesafe zarın katı mı kontrol et
                if (distance % dice === 0) {
                    const multiplier = distance / dice;
                    if (multiplier >= 1 && multiplier <= 4) {
                        // Yol üzerinde kırılacak rakip taşları kontrol et
                        for (let step = 1; step <= multiplier; step++) {
                            const intermediatePoint = this.currentPlayer === 'white'
                                ? (dice * step) - 1
                                : 24 - (dice * step);
                            
                            // İlk adımlardan birinde rakip tek taşı varsa, oraya kadar git ve kır
                            if (step < multiplier && this.willCaptureChecker(intermediatePoint)) {
                                // Kullanılan zarları kaydet - sadece bu adıma kadar
                                const usedDice = Array(step).fill(dice);
                                
                                // Kırılacak taş
                                const capturedChecker = this.willCaptureChecker(intermediatePoint);
                                
                                // Zarları kullan
                                this.availableMoves.splice(0, step);
                                
                                // Hamleyi uygula
                                this.applyMove(fromPoint, intermediatePoint);
                                
                                // Hamleyi geçmişe ekle
                                this.moveHistory.push({ fromPoint, toPoint: intermediatePoint, usedDice, capturedChecker });
                                
                                return true;
                            }
                        }
                        
                        // Kullanılan zarları kaydet
                        const usedDice = Array(multiplier).fill(dice);
                        
                        // Kırılacak taş varsa kaydet
                        const capturedChecker = this.willCaptureChecker(toPoint);
                        
                        // Zarları kullan
                        this.availableMoves.splice(0, multiplier);
                        
                        // Hamleyi uygula
                        this.applyMove(fromPoint, toPoint);
                        
                        // Hamleyi geçmişe ekle
                        this.moveHistory.push({ fromPoint, toPoint, usedDice, capturedChecker });
                        
                        return true;
                    }
                }
            }

            // Toplam zarla yapılan hamle kontrolü
            if (this.availableMoves.length === 2 && 
                this.availableMoves[0] !== this.availableMoves[1]) {
                const totalDice = this.availableMoves[0] + this.availableMoves[1];
                const expectedTarget = this.currentPlayer === 'white'
                    ? totalDice - 1
                    : 24 - totalDice;
                
                if (toPoint === expectedTarget) {
                    // Önce yol üzerindeki noktaları kontrol et
                    const dice1 = this.availableMoves[0];
                    const dice2 = this.availableMoves[1];
                    
                    // İki farklı ara nokta
                    const intermediatePoint1 = this.currentPlayer === 'white'
                        ? dice1 - 1
                        : 24 - dice1;
                        
                    const intermediatePoint2 = this.currentPlayer === 'white'
                        ? dice2 - 1
                        : 24 - dice2;
                        
                    // İki farklı yolu kontrol et
                    const captureOnPath1 = this.willCaptureChecker(intermediatePoint1);
                    const captureOnPath2 = this.willCaptureChecker(intermediatePoint2);
                    
                    // Eğer ilk yolda kırma varsa, oraya git
                    if (captureOnPath1) {
                        // Zar kullan
                        const diceIndex = this.availableMoves.indexOf(dice1);
                        const usedDice = [this.availableMoves[diceIndex]];
                        this.availableMoves.splice(diceIndex, 1);
                        
                        // Hamleyi uygula
                        this.applyMove(fromPoint, intermediatePoint1);
                        
                        // Hamleyi geçmişe ekle
                        this.moveHistory.push({ fromPoint, toPoint: intermediatePoint1, usedDice, capturedChecker: captureOnPath1 });
                        
                        return true;
                    }
                    
                    // Eğer ikinci yolda kırma varsa, oraya git
                    if (captureOnPath2) {
                        // Zar kullan
                        const diceIndex = this.availableMoves.indexOf(dice2);
                        const usedDice = [this.availableMoves[diceIndex]];
                        this.availableMoves.splice(diceIndex, 1);
                        
                        // Hamleyi uygula
                        this.applyMove(fromPoint, intermediatePoint2);
                        
                        // Hamleyi geçmişe ekle
                        this.moveHistory.push({ fromPoint, toPoint: intermediatePoint2, usedDice, capturedChecker: captureOnPath2 });
                        
                        return true;
                    }
                    
                    // Kırılacak taş varsa kaydet
                    const capturedChecker = this.willCaptureChecker(toPoint);
                    
                    // Her iki zarı da kullan
                    const usedDice = [...this.availableMoves];
                    this.availableMoves = [];
                    
                    // Hamleyi uygula
                    this.applyMove(fromPoint, toPoint);
                    
                    // Hamleyi geçmişe ekle
                    this.moveHistory.push({ fromPoint, toPoint, usedDice, capturedChecker });
                    
                    return true;
                }
            }

            // Normal hamle için zar hesaplama
            const usedDice = this.currentPlayer === 'white' 
                ? toPoint + 1 
                : 24 - toPoint;

            // Zarı bul ve kullan
            const diceIndex = this.availableMoves.indexOf(usedDice);
            if (diceIndex === -1) {
                return false;
            }

            // Kırılacak taş varsa kaydet
            const capturedChecker = this.willCaptureChecker(toPoint);

            // Kullanılan zarı kaydet ve kaldır
            const usedDiceArray = [this.availableMoves[diceIndex]];
            this.availableMoves.splice(diceIndex, 1);

            // Hamleyi uygula
            this.applyMove(fromPoint, toPoint);

            // Hamleyi geçmişe ekle
            this.moveHistory.push({ fromPoint, toPoint, usedDice: usedDiceArray, capturedChecker });

            return true;
        }

        // Toplama hamlesi kontrolü
        if (toPoint === 99) {
            return this.makeBearOffMove(fromPoint);
        }

        // Vur-kaç kontrolü - Biriktirme alanında rakibin tek pulunu kırma durumu
        if (this.isHitAndRunCase(fromPoint, toPoint)) {
            // Hamleyi izin ver ama bu hamleden sonra bu pulla başka hamleyi engelle
            // Kırılacak taş oluştur
            const capturedChecker = this.willCaptureChecker(toPoint);
            
            // Bu durumda sadece tek bir zarı kullan (vur işlemi için)
            const distance = Math.abs(toPoint - fromPoint);
            const diceIndex = this.availableMoves.indexOf(distance);
            
            if (diceIndex === -1) return false;
            
            // Kullanılan zarı kaydet
            const usedDiceArray = [this.availableMoves[diceIndex]];
            this.availableMoves.splice(diceIndex, 1);
            
            // Hamleyi uygula
            this.applyMove(fromPoint, toPoint);
            
            // Eğer bu hamle sonrası zarlar tükeniyorsa, hitAndRun işaretleme
            const isLastMove = this.availableMoves.length === 0;
            
            // Hamleyi geçmişe ekle ve bu pulun bu turda tekrar hareket etmemesi için işaretle
            this.moveHistory.push({ 
                fromPoint, 
                toPoint, 
                usedDice: usedDiceArray, 
                capturedChecker,
                hitAndRun: !isLastMove // Eğer son hamle ise, vur-kaç olarak işaretleme
            });
            
            return true;
        }

        // Normal hamle kontrolü
        if (!this.isValidMove(fromPoint, toPoint)) {
            return false;
        }

        // Eğer pul daha önce biriktirme alanında rakip pul kırdıysa, bu turda tekrar hareket edemez
        const hasHitAndRun = this.moveHistory.some(move => 
            move.toPoint === fromPoint && move.hitAndRun === true
        );
        
        if (hasHitAndRun) {
            return false; // Bu pulla tekrar hareket edemezsin
        }

        // Çift zar kontrolü
        if (this.availableMoves.length >= 2 && this.availableMoves[0] === this.availableMoves[1]) {
            const dice = this.availableMoves[0];
            const distance = Math.abs(toPoint - fromPoint);
            const multiplier = distance / dice;

            // Eğer mesafe zarın tam katıysa ve 1-4 arasındaysa
            if (Number.isInteger(multiplier) && multiplier >= 1 && multiplier <= 4) {
                // Yol üzerinde kırılacak rakip taşları kontrol et
                for (let step = 1; step <= multiplier; step++) {
                    const intermediatePoint = this.currentPlayer === 'white'
                        ? fromPoint + (dice * step)
                        : fromPoint - (dice * step);
                    
                    // Ara adımlarda rakip tek taşı varsa
                    if (step < multiplier) {
                        const targetPointState = this.gameState.points[intermediatePoint];
                        if (targetPointState.color !== this.currentPlayer && targetPointState.color !== null && targetPointState.checkers === 1) {
                            // Kullanılan zarları kaydet - sadece bu adıma kadar
                            const usedDice = Array(step).fill(dice);
                            
                            // Kırılacak taş
                            const capturedChecker = this.willCaptureChecker(intermediatePoint);
                            
                            // Zarları kullan
                            this.availableMoves.splice(0, step);
                            
                            // Hamleyi uygula
                            this.applyMove(fromPoint, intermediatePoint);
                            
                            // Hamleyi geçmişe ekle
                            this.moveHistory.push({ fromPoint, toPoint: intermediatePoint, usedDice, capturedChecker });
                            
                            return true;
                        }
                    }
                }
                
                // Kullanılan zarları kaydet
                const usedDice = Array(multiplier).fill(dice);
                
                // Kırılacak taş varsa kaydet
                const capturedChecker = this.willCaptureChecker(toPoint);

                // Hamleyi uygula
                this.availableMoves.splice(0, multiplier);
                this.applyMove(fromPoint, toPoint);

                // Hamleyi geçmişe ekle
                this.moveHistory.push({ fromPoint, toPoint, usedDice, capturedChecker });

                return true;
            }
            return false;
        }

        // Normal hamle için zar hesaplama
        let usedDice: number;
        let useBothDice = false;
        
        if (fromPoint === -1) {
            // Bar'dan çıkış için zar hesaplama
            usedDice = this.currentPlayer === 'white' 
                ? toPoint + 1 
                : 24 - toPoint;

            // Bar'dan çıkışta zarların toplamıyla yapılan hamle kontrolü
            if (this.availableMoves.length >= 2 && 
                this.availableMoves[0] !== this.availableMoves[1]) {
                const totalDice = this.availableMoves[0] + this.availableMoves[1];
                const expectedTarget = this.currentPlayer === 'white'
                    ? totalDice - 1
                    : 24 - totalDice;
                
                if (toPoint === expectedTarget && totalDice <= 12) {
                    useBothDice = true;
                }
            }
        } else {
            // Normal hamle için zar hesaplama
            usedDice = Math.abs(toPoint - fromPoint);
            
            // Eğer hamle mesafesi iki zarın toplamına eşitse
            if (this.availableMoves.length >= 2 && 
                this.availableMoves[0] !== this.availableMoves[1] && 
                usedDice === this.availableMoves[0] + this.availableMoves[1]) {
                
                // Toplam zar kullanılırken yol üzerinde kırma olup olmadığını kontrol et
                const dice1 = this.availableMoves[0];
                const dice2 = this.availableMoves[1];
                
                // İki farklı ara nokta
                const intermediatePoint1 = this.currentPlayer === 'white'
                    ? fromPoint + dice1
                    : fromPoint - dice1;
                    
                const intermediatePoint2 = this.currentPlayer === 'white'
                    ? fromPoint + dice2
                    : fromPoint - dice2;
                
                // İki farklı yolu kontrol et
                const captureOnPath1 = this.willCaptureChecker(intermediatePoint1);
                const captureOnPath2 = this.willCaptureChecker(intermediatePoint2);
                
                // Eğer ilk yolda kırma varsa, oraya git
                if (captureOnPath1) {
                    // Zar kullan
                    const diceIndex = this.availableMoves.indexOf(dice1);
                    const usedDice = [this.availableMoves[diceIndex]];
                    this.availableMoves.splice(diceIndex, 1);
                    
                    // Hamleyi uygula
                    this.applyMove(fromPoint, intermediatePoint1);
                    
                    // Hamleyi geçmişe ekle
                    this.moveHistory.push({ fromPoint, toPoint: intermediatePoint1, usedDice, capturedChecker: captureOnPath1 });
                    
                    return true;
                }
                
                // Eğer ikinci yolda kırma varsa, oraya git
                if (captureOnPath2) {
                    // Zar kullan
                    const diceIndex = this.availableMoves.indexOf(dice2);
                    const usedDice = [this.availableMoves[diceIndex]];
                    this.availableMoves.splice(diceIndex, 1);
                    
                    // Hamleyi uygula
                    this.applyMove(fromPoint, intermediatePoint2);
                    
                    // Hamleyi geçmişe ekle
                    this.moveHistory.push({ fromPoint, toPoint: intermediatePoint2, usedDice, capturedChecker: captureOnPath2 });
                    
                    return true;
                }
                
                // Yol kontrolü - toplam zar kullanarak gidilebilir mi?
                // İki farklı ara nokta için yol kontrolü
                const canReachViaPath1 = this.isValidMove(fromPoint, intermediatePoint1);
                const canReachViaPath2 = this.isValidMove(fromPoint, intermediatePoint2);
                
                // Eğer hiçbir yoldan gidilemiyorsa, toplam zar kullanılamaz
                if (!canReachViaPath1 && !canReachViaPath2) {
                    return false;
                }
                
                // İkinci adım kontrolü
                let canCompleteMove = false;
                
                if (canReachViaPath1) {
                    // İlk zarı kullanarak gidebiliriz, şimdi ikinci zarı kullanabilir miyiz?
                    const secondStep = this.currentPlayer === 'white'
                        ? intermediatePoint1 + dice2
                        : intermediatePoint1 - dice2;
                        
                    if (this.isValidMove(intermediatePoint1, secondStep)) {
                        canCompleteMove = true;
                    }
                }
                
                if (!canCompleteMove && canReachViaPath2) {
                    // İkinci zarı kullanarak gidebiliriz, şimdi ilk zarı kullanabilir miyiz?
                    const secondStep = this.currentPlayer === 'white'
                        ? intermediatePoint2 + dice1
                        : intermediatePoint2 - dice1;
                        
                    if (this.isValidMove(intermediatePoint2, secondStep)) {
                        canCompleteMove = true;
                    }
                }
                
                // Eğer ara noktalardan geçerek hedefe ulaşabiliyorsak, toplam hamleyi yap
                if (canCompleteMove) {
                    useBothDice = true;
                } else {
                    return false; // Toplam zar kullanılamaz
                }
            }
        }

        // Kırılacak taş varsa kaydet
        const capturedChecker = this.willCaptureChecker(toPoint);

        if (useBothDice) {
            // Her iki zarı da kullan
            const usedDice = [...this.availableMoves];
            this.availableMoves = [];
            this.applyMove(fromPoint, toPoint);
            
            // Hamleyi geçmişe ekle
            this.moveHistory.push({ fromPoint, toPoint, usedDice, capturedChecker });
            
            return true;
        }

        // Tek zar kullan
        const diceIndex = this.availableMoves.indexOf(usedDice);
        if (diceIndex === -1) {
            return false;
        }

        // Kullanılan zarı kaydet
        const usedDiceArray = [this.availableMoves[diceIndex]];
        this.availableMoves.splice(diceIndex, 1);

        // Hamleyi uygula
        this.applyMove(fromPoint, toPoint);

        // Hamleyi geçmişe ekle
        this.moveHistory.push({ fromPoint, toPoint, usedDice: usedDiceArray, capturedChecker });

        // Kalan zarlarla yapılabilecek hamle var mı kontrol et
        let canMakeAnyMove = false;

        // Önce bar'dan çıkış kontrolü
        if (this.hasCheckerInBar()) {
            const barMoves = this.getBarMoves();
            if (barMoves.length > 0) {
                canMakeAnyMove = true;
            }
        } else {
            // Normal hamle kontrolü
            for (let i = 0; i < 24; i++) {
                const point = this.gameState.points[i];
                if (point.color === this.currentPlayer && point.checkers > 0) {
                    const moves = this.getAvailableMoves(i);
                    if (moves.length > 0) {
                        canMakeAnyMove = true;
                        break;
                    }
                }
            }
        }

        // Hiçbir hamle yapılamıyorsa
        if (!canMakeAnyMove && this.availableMoves.length > 0) {
            this.showBarWarning = false; // Bar uyarısını kapat
            this.availableMoves = []; // Kalan zarları temizle
            this.dice = []; // Zarları temizle
        }

        return true;
    }

    private applyMove(fromPoint: number, toPoint: number): void {
        // Bar'dan çıkış hamlesi
        if (fromPoint === -1) {
            if (this.currentPlayer === 'white') {
                this.gameState.bar.whiteCheckers--;
            } else {
                this.gameState.bar.blackCheckers--;
            }
        } else {
            // Normal hamle
            const sourcePoint = this.gameState.points[fromPoint];
            sourcePoint.checkers--;
            if (sourcePoint.checkers === 0) {
                sourcePoint.color = null;
            }
        }

        const targetPoint = this.gameState.points[toPoint];
        
        // Rakip pulunu kırma
        if (targetPoint.color !== null && targetPoint.color !== this.currentPlayer) {
            if (targetPoint.color === 'white') {
                this.gameState.bar.whiteCheckers++;
            } else {
                this.gameState.bar.blackCheckers++;
            }
            targetPoint.checkers = 0;
        }

        // Yeni pulu yerleştir
        targetPoint.checkers++;
        targetPoint.color = this.currentPlayer;
    }

    private switchPlayer(): void {
        const oldPlayer = this.currentPlayer;
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        console.log(`GameManager: Oyuncu değiştirildi: ${oldPlayer} -> ${this.currentPlayer}`);
    }

    private canBearOff(): boolean {
        // Oyuncunun bar'da taşı olmamalı
        if (this.hasCheckerInBar()) return false;

        // Ev bölgesi dışında taş olup olmadığını kontrol et
        const homeRange = this.currentPlayer === 'white' 
            ? { start: 18, end: 23 }  // Beyaz için 19-24 arası
            : { start: 0, end: 5 };   // Siyah için 1-6 arası

        // Tüm tahtayı kontrol et
        for (let i = 0; i < 24; i++) {
            const point = this.gameState.points[i];
            // Eğer oyuncunun taşı varsa ve ev bölgesi dışındaysa
            if (point.color === this.currentPlayer) {
                if (this.currentPlayer === 'white') {
                    if (i < homeRange.start) { // 18'den küçük noktada taş varsa
                        return false;
                    }
                } else { // Siyah için
                    if (i > homeRange.end) { // 5'ten büyük noktada taş varsa
                        return false;
                    }
                }
            }
        }

        return true;
    }

    private getBearOffMoves(fromPoint: number): number[] {
        const moves: number[] = [];
        if (!this.canBearOff()) {
            return moves;
        }
        // Ev bölgesinde (home board) olup olmadığını kontrol et: 
        const isInHomeBoard = this.currentPlayer === 'white' ? (fromPoint >= 18) : (fromPoint <= 5);
        if (!isInHomeBoard) return moves;

        // Ev bölgesinde, taşların bear off edilebilmesi için en farak (extreme) noktayı belirleyelim.
        let extremePoint: number | null = null;
        if (this.currentPlayer === 'white') {
            // White için ev bölgesi: indeks 18–23; en farak nokta; en düşük indekste bulunan taş
            for (let i = 18; i < 24; i++) {
                if (this.gameState.points[i].color === 'white' && this.gameState.points[i].checkers > 0) {
                    if (extremePoint === null || i < extremePoint) {
                        extremePoint = i;
                    }
                }
            }
        } else {
            // Black için ev bölgesi: indeks 0–5; en farak nokta; en yüksek indekste bulunan taş
            for (let i = 0; i <= 5; i++) {
                if (this.gameState.points[i].color === 'black' && this.gameState.points[i].checkers > 0) {
                    if (extremePoint === null || i > extremePoint) {
                        extremePoint = i;
                    }
                }
            }
        }

        // Bu noktadan toplamak için gereken zar değeri:
        const required = this.currentPlayer === 'white' ? 24 - fromPoint : fromPoint + 1;

        // Her bir mevcut zar için:
        this.availableMoves.forEach(dice => {
            if (dice === required) {
                // Zar tam eşleşiyorsa her durumda toplama önerisini ver
                moves.push(99);
            } else if (dice > required) {
                // Eğer zar required'dan büyükse, yalnızca bu noktada bulunan taş ev bölgesindeki en farak taşsa toplama öner
                if (extremePoint === fromPoint) {
                    moves.push(99);
                }
            }
        });

        // İki farklı zarın toplamıyla hamle kontrolü
        // Beyaz taş ve siyah taş için ayrı ayrı kontrol et
        if (this.availableMoves.length === 2 && 
            this.availableMoves[0] !== this.availableMoves[1]) {
            
            const totalDice = this.availableMoves[0] + this.availableMoves[1];
            
            // Toplama için tam zar gerekiyor (white için 24-fromPoint, black için fromPoint+1)
            if (totalDice === required && extremePoint === fromPoint) {
                moves.push(99);
            }
        }

        return moves;
    }

    private makeBearOffMove(fromPoint: number): boolean {
        if (!this.canBearOff()) return false;
        
        // Seçilen noktanın ev bölgesinde olup olmadığını kontrol et (white: indeks ≥ 18, black: indeks ≤ 5)
        const isInHomeBoard = this.currentPlayer === 'white' ? (fromPoint >= 18) : (fromPoint <= 5);
        if (!isInHomeBoard) return false;

        // Ev bölgesinde, taşların bear off edilebilmesi için en farak (extreme) noktayı belirleyelim
        let extremePoint: number | null = null;
        if (this.currentPlayer === 'white') {
            for (let i = 18; i < 24; i++) {
                if (this.gameState.points[i].color === 'white' && this.gameState.points[i].checkers > 0) {
                    if (extremePoint === null || i < extremePoint) {
                        extremePoint = i;
                    }
                }
            }
        } else {
            for (let i = 0; i <= 5; i++) {
                if (this.gameState.points[i].color === 'black' && this.gameState.points[i].checkers > 0) {
                    if (extremePoint === null || i > extremePoint) {
                        extremePoint = i;
                    }
                }
            }
        }

        // Bu noktadan toplamak için gereken zar değeri:
        const required = this.currentPlayer === 'white' ? 24 - fromPoint : fromPoint + 1;
        let diceIndex = this.availableMoves.indexOf(required);

        // Eğer zar tam eşleşmesi yoksa, yalnızca bu noktada bulunan taş ev bölgesindeki en farak taşsa,
        // required'dan büyük olan bir zar kullanılabilir.
        if (diceIndex === -1 && extremePoint === fromPoint) {
            const biggerDice = this.availableMoves.find(d => d > required);
            if (biggerDice !== undefined) {
                diceIndex = this.availableMoves.indexOf(biggerDice);
            }
        }
        if (diceIndex === -1) return false;

        // Toplanacak pulu kaynaktan azalt ve toplama alanına ekle
        const sourcePoint = this.gameState.points[fromPoint];
        sourcePoint.checkers--;
        if (sourcePoint.checkers === 0) {
            sourcePoint.color = null;
        }
        if (this.currentPlayer === 'white') {
            this.gameState.collected.white++;
        } else {
            this.gameState.collected.black++;
        }

        // Kullanılan zarı kaldır
        const usedDie = this.availableMoves[diceIndex];
        this.availableMoves.splice(diceIndex, 1);
        this.moveHistory.push({ fromPoint, toPoint: 99, usedDice: [usedDie] });

        return true;
    }

    // Uyarı durumunu kontrol etmek için metod
    public shouldShowBarWarning(): boolean {
        // Bar'da taş olup olmadığını kontrol et
        const hasBarChecker = this.hasCheckerInBar();

        // Bar'da taş var ve hamle yapılamıyorsa uyarı gösterilmeli
        if (hasBarChecker) {
            const barMoves = this.getBarMoves();
            // Hamle yapılamadığında uyarı göster
            if (barMoves.length === 0) {
                this.showBarWarning = true; // Uyarıyı kesinlikle aktifleştir
            }
        }

        // Uyarıyı döndür ve sıfırla
        if (this.showBarWarning) {
            const warning = this.showBarWarning;
            this.showBarWarning = false; // Uyarıyı sıfırla
            return warning;
        }
        return false;
    }

    // Son hamleyi geri alma
    public undoLastMove(): number[] {
        if (this.moveHistory.length === 0) return [];

        const lastMove = this.moveHistory.pop()!;
        const { fromPoint, toPoint, usedDice, capturedChecker } = lastMove;

        // Toplama hamlesini geri al
        if (toPoint === 99) {
            // Toplanan pulu geri al
            if (this.currentPlayer === 'white') {
                this.gameState.collected.white--;
            } else {
                this.gameState.collected.black--;
            }

            // Pulu eski yerine koy
            const sourcePoint = this.gameState.points[fromPoint];
            sourcePoint.checkers++;
            sourcePoint.color = this.currentPlayer;
        } else {
            // Normal hamleyi geri al
            const targetPoint = this.gameState.points[toPoint];
            const sourcePoint = fromPoint === -1 ? null : this.gameState.points[fromPoint];

            // Taşı geri al
            targetPoint.checkers--;
            if (targetPoint.checkers === 0) {
                targetPoint.color = null;
            }

            // Bar'dan çıkış hamlesi ise
            if (fromPoint === -1) {
                if (this.currentPlayer === 'white') {
                    this.gameState.bar.whiteCheckers++;
                } else {
                    this.gameState.bar.blackCheckers++;
                }
            } else {
                // Normal hamle
                if (sourcePoint) {
                    sourcePoint.checkers++;
                    sourcePoint.color = this.currentPlayer;
                }
            }

            // Kırılan taş varsa onu da geri al
            if (capturedChecker) {
                const capturedPoint = this.gameState.points[toPoint];
                capturedPoint.checkers = 1;
                capturedPoint.color = capturedChecker.color;

                // Bar'dan taşı çıkar
                if (capturedChecker.color === 'white') {
                    this.gameState.bar.whiteCheckers--;
                } else {
                    this.gameState.bar.blackCheckers--;
                }
            }
        }

        // Zarları geri ekle
        this.availableMoves.push(...usedDice);

        return this.availableMoves;
    }

    public willCaptureChecker(toPoint: number): { color: PlayerColor; point: number } | undefined {
        // Hedef nokta sınırlar içinde mi kontrol et
        if (toPoint < 0 || toPoint >= 24) return undefined;
        
        const targetPoint = this.gameState.points[toPoint];
        
        // Hedef noktada 1 tane rakip taşı varsa kır
        if (targetPoint.checkers === 1 && targetPoint.color !== null && targetPoint.color !== this.currentPlayer) {
            return { color: targetPoint.color, point: toPoint };
        }
        
        return undefined;
    }

    // Yeni metod: Sırayı değiştir ve hamle geçmişini temizle
    public finishTurn(): void {
        console.log("GameManager: Sıra değiştiriliyor. Şu anki oyuncu:", this.currentPlayer);
        
        // Hamle bilgilerini temizle
        this.clearMoveInfo();
        
        // Sırayı değiştir
        this.switchPlayer();
        
        // Hamle geçmişini sıfırla
        this.moveHistory = [];
        
        console.log("GameManager: Sıra değiştirildi. Yeni oyuncu:", this.currentPlayer);
    }

    // Yeni metod: Geri alınabilecek hamle var mı kontrolü
    public canUndo(): boolean {
        return this.moveHistory.length > 0;
    }

    // Yeni metod: Hamle geçmişini al
    public getMoveHistory(): MoveHistoryItem[] {
        return this.moveHistory;
    }

    public getDice(): number[] {
        return this.dice;
    }

    // Mevcut oyuncunun yapabileceği herhangi bir hamle var mı?
    public canMakeAnyMove(): boolean {
        // Bar'da taş varsa sadece bar'dan çıkış hamleleri kontrol edilir
        if (this.hasCheckerInBar()) {
            const barMoves = this.getBarMoves();
            return barMoves.length > 0;
        }
        
        // Her noktayı kontrol et
        for (let i = 0; i < this.gameState.points.length; i++) {
            const point = this.gameState.points[i];
            if (point.color === this.currentPlayer && point.checkers > 0) {
                const moves = this.getAvailableMoves(i);
                if (moves.length > 0) {
                    return true;
                }
            }
        }
        
        return false;
    }

    // Yeni metod: Normal hamle önerilerini döndürür (sallama hamleleri)
    private getNormalMoves(fromPoint: number): number[] {
        const availablePoints: number[] = [];
        const usedDice = new Set<number>();

        console.log("getNormalMoves içinde: fromPoint:", fromPoint, "zarlar:", this.availableMoves, "oyuncu:", this.currentPlayer);

        // Önce tahtanın dışına çıkma kontrollerini yapalım
        if (fromPoint < 0 || fromPoint > 23) {
            console.log("Geçersiz kaynak nokta: Tahta dışında");
            return [];
        }

        // Seçilen noktada oyuncunun pulu var mı kontrol edelim
        const pointState = this.gameState.points[fromPoint];
        if (pointState.color !== this.currentPlayer || pointState.checkers === 0) {
            console.log("Geçersiz kaynak nokta: Oyuncunun pulu yok");
            return [];
        }

        // Çift zar kontrolü
        if (this.availableMoves.length >= 2 && this.availableMoves[0] === this.availableMoves[1]) {
            console.log("Çift zar durumu:", this.availableMoves[0]);
            
            const dice = this.availableMoves[0];
            const maxMultiplier = Math.min(4, this.availableMoves.length);
            
            for (let i = 1; i <= maxMultiplier; i++) {
                const targetPoint = this.currentPlayer === 'white'
                    ? fromPoint + (dice * i)
                    : fromPoint - (dice * i);
                
                console.log(`Çift zar hamle kontrolü: ${i} kat, hedef:`, targetPoint);
                
                // Tahta dışına çıkma kontrolü
                if (targetPoint < 0 || targetPoint > 23) {
                    console.log("Hamle tahta dışına çıkıyor, döngüden çıkılıyor.");
                        break;
                }

                // Hamle geçerli mi kontrol et
                if (this.isValidMove(fromPoint, targetPoint)) {
                    console.log("Geçerli hamle ekleniyor:", targetPoint);
                    availablePoints.push(targetPoint);
                } else {
                    // Geçersiz bir adım bulunduğunda, daha uzun hamleler de yapılamaz
                    console.log("Geçersiz hamle, döngüden çıkılıyor.");
                    break;
                }
            }
        } else {
            // Normal zarlar için kontrol
            this.availableMoves.forEach(dice => {
                const targetPoint = this.currentPlayer === 'white'
                    ? fromPoint + dice
                    : fromPoint - dice;

                console.log(`Normal zar hamle kontrolü: zar ${dice}, hedef:`, targetPoint);

                // Tahta sınırlarını kontrol et
                if (targetPoint < 0 || targetPoint > 23) {
                    console.log("Hamle tahta dışına çıkıyor, atlanıyor.");
                    return;
                }

                // Hamle geçerli mi kontrol et
                if (this.isValidMove(fromPoint, targetPoint)) {
                    console.log("Geçerli hamle ekleniyor:", targetPoint);
                    availablePoints.push(targetPoint);
                    usedDice.add(dice);
                } else {
                    console.log("Geçersiz hamle:", targetPoint);
                }
            });

            // İki farklı zar varsa ve ikisi de kullanılabiliyorsa toplam hamle hesapla
            if (this.availableMoves.length === 2 && 
                this.availableMoves[0] !== this.availableMoves[1]) {
                
                const dice1 = this.availableMoves[0];
                const dice2 = this.availableMoves[1];
                const totalDice = dice1 + dice2;
                
                const targetPoint = this.currentPlayer === 'white'
                    ? fromPoint + totalDice
                    : fromPoint - totalDice;

                console.log(`Zarların toplamıyla hamle kontrolü: toplam ${totalDice}, hedef:`, targetPoint);

                // Tahta sınırlarını kontrol et
                if (targetPoint >= 0 && targetPoint <= 23) {
                    // En az bir ara hamlenin geçerli olup olmadığını kontrol et
                    const intermediatePoint1 = this.currentPlayer === 'white'
                        ? fromPoint + dice1
                        : fromPoint - dice1;
                        
                    const intermediatePoint2 = this.currentPlayer === 'white'
                        ? fromPoint + dice2
                        : fromPoint - dice2;
                    
                    // Ara noktalar geçerli mi?
                    const isPath1Valid = this.isValidMove(fromPoint, intermediatePoint1);
                    const isPath2Valid = this.isValidMove(fromPoint, intermediatePoint2);
                    
                    // Hedef nokta geçerli mi?
                    const isTargetValid = this.isValidMove(fromPoint, targetPoint);
                    
                    // Eğer hedef nokta geçerliyse ve en az bir ara yol geçerliyse
                    if (isTargetValid && (isPath1Valid || isPath2Valid)) {
                        console.log("Zarların toplamıyla geçerli hamle ekleniyor:", targetPoint);
                        availablePoints.push(targetPoint);
                    } else {
                        console.log("Zarların toplamıyla geçersiz hamle: Hedef veya ara noktalar geçerli değil");
                    }
                } else {
                    console.log("Zarların toplamıyla hamle tahta dışına çıkıyor");
                }
            }
        }

        console.log("Sonuç hamle önerileri:", availablePoints);
        return availablePoints;
    }

    // Sıradaki tüm toplanmış pulları geri alma metodu
    public undoAllBearOffs(): number[] {
        // Geri alma işlemi için bearOff (toplama) hamlelerini bulalım
        const bearOffMoves = this.moveHistory.filter(move => move.toPoint === 99);
        
        if (bearOffMoves.length === 0) return [];
        
        // En son eklenen bearOff hamlesini geri al
        // findLastIndex yerine manuel olarak son eşleşmeyi buluyoruz
        let lastBearOffIndex = -1;
        for (let i = this.moveHistory.length - 1; i >= 0; i--) {
            if (this.moveHistory[i].toPoint === 99) {
                lastBearOffIndex = i;
                break;
            }
        }
        
        if (lastBearOffIndex === -1) return [];
        
        const lastBearOff = this.moveHistory[lastBearOffIndex];
        
        // Pulu geri al
        if (this.currentPlayer === 'white') {
            this.gameState.collected.white--;
        } else {
            this.gameState.collected.black--;
        }
        
        // Pulu eski yerine koy
        const sourcePoint = this.gameState.points[lastBearOff.fromPoint];
        sourcePoint.checkers++;
        sourcePoint.color = this.currentPlayer;
        
        // Zarları geri ekle
        this.availableMoves.push(...lastBearOff.usedDice);
        
        // Geçmişten kaldır
        this.moveHistory.splice(lastBearOffIndex, 1);
        
        return this.availableMoves;
    }

    // Nokta, biriktirme alanında mı (home board) kontrol et
    private isInHomeBoard(point: number): boolean {
        if (this.currentPlayer === 'white') {
            return point >= 18 && point <= 23; // Beyaz için sağ üst köşe (19-24)
        } else {
            return point >= 0 && point <= 5; // Siyah için sağ alt köşe (1-6)
        }
    }
    
    // Vur-kaç kontrolü - Biriktirme alanında rakibin tek pulunu kırma durumu
    private isHitAndRunCase(fromPoint: number, toPoint: number): boolean {
        // Hedef noktanın rakip pulu içerip içermediğini kontrol et
        const targetPointState = this.gameState.points[toPoint];
        if (targetPointState.color !== this.currentPlayer && targetPointState.color !== null && targetPointState.checkers === 1) {
            // Biriktirme alanı kontrolü - vur-kaç sadece biriktirme alanında olmalı
            // Beyaz oyuncu için biriktirme alanı: 18-23 arasındaki noktalar
            // Siyah oyuncu için biriktirme alanı: 0-5 arasındaki noktalar
            const inHomeBoard = this.currentPlayer === 'white' 
                ? toPoint >= 18 && toPoint <= 23  // Beyaz için sağ alt köşe
                : toPoint >= 0 && toPoint <= 5;   // Siyah için sağ üst köşe
            
            return inHomeBoard; // Sadece biriktirme alanında vur-kaç uygula
        }
        return false;
    }

    // Oyun tahtasını oyuncunun seçtiği renge göre yeniden düzenle
    public resetBoardForPlayerColor(playerColor: PlayerColor): void {
        if (playerColor === 'black') return; // Varsayılan düzen siyah oyuncu için doğru
        
        // Geçici bir kopya oluştur
        const tempBoard = JSON.parse(JSON.stringify(this.gameState.points));
        
        // Tahtayı ters çevir ve renkleri değiştir
        for (let i = 0; i < 24; i++) {
            const oldPos = tempBoard[i];
            const newPos = 23 - i; // Tersine çevir
            
            // Renkleri ve pozisyonları değiştir
            this.gameState.points[newPos].checkers = oldPos.checkers;
            
            if (oldPos.color === 'white') {
                this.gameState.points[newPos].color = 'black';
            } else if (oldPos.color === 'black') {
                this.gameState.points[newPos].color = 'white';
            } else {
                this.gameState.points[newPos].color = null;
            }
        }
        
        // Toplanan ve kırılan pulların renklerini değiştir
        const tempWhiteCollected = this.gameState.collected.white;
        this.gameState.collected.white = this.gameState.collected.black;
        this.gameState.collected.black = tempWhiteCollected;
        
        const tempWhiteBar = this.gameState.bar.whiteCheckers;
        this.gameState.bar.whiteCheckers = this.gameState.bar.blackCheckers;
        this.gameState.bar.blackCheckers = tempWhiteBar;
    }
} 