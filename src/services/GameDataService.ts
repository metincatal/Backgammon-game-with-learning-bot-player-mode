import { IGameState } from '../models/interfaces/IGameState';
import { PlayerColor } from '../models/types/PlayerColor';

// Oyun hamlesi türü
export interface GameMove {
    gameState: IGameState;  // Hamle öncesi oyun durumu
    fromPoint: number;      // Başlangıç noktası
    toPoint: number;        // Hedef noktası
    playerColor: PlayerColor; // Hangi oyuncu yaptı
    result: number;         // Hamlenin sonucu (1: kazanç, 0: berabere, -1: kayıp)
    timestamp: number;      // Hamle zamanı
}

export class GameDataService {
    private static instance: GameDataService;
    private readonly LOCAL_STORAGE_KEY = 'tavla_game_moves';
    private readonly MAX_STORED_MOVES = 10000; // Maksimum saklanacak hamle sayısı
    
    private gameMoves: GameMove[] = [];
    private gameInProgress: boolean = false;
    private currentGameMoves: GameMove[] = [];
    private currentGameStartTime: number = 0;
    
    private constructor() {
        this.loadMovesFromStorage();
    }
    
    // Singleton pattern - tek bir servis örneği olmasını sağlar
    public static getInstance(): GameDataService {
        if (!GameDataService.instance) {
            GameDataService.instance = new GameDataService();
        }
        return GameDataService.instance;
    }
    
    // Local storage'dan hamleleri yükle
    private loadMovesFromStorage(): void {
        try {
            const storedMoves = localStorage.getItem(this.LOCAL_STORAGE_KEY);
            if (storedMoves) {
                this.gameMoves = JSON.parse(storedMoves);
                console.log(`${this.gameMoves.length} hamle yüklendi.`);
            }
        } catch (error) {
            console.error('Hamleleri yüklerken hata:', error);
            this.gameMoves = [];
        }
    }
    
    // Hamleleri local storage'a kaydet
    private saveMovesToStorage(): void {
        try {
            localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(this.gameMoves));
        } catch (error) {
            console.error('Hamleleri kaydederken hata:', error);
        }
    }
    
    // Yeni bir oyun başlat
    public startNewGame(): void {
        this.gameInProgress = true;
        this.currentGameMoves = [];
        this.currentGameStartTime = Date.now();
    }
    
    // Oyuna hamle ekle
    public addMove(gameState: IGameState, fromPoint: number, toPoint: number, playerColor: PlayerColor): void {
        if (!this.gameInProgress) {
            return;
        }
        
        const move: GameMove = {
            gameState: JSON.parse(JSON.stringify(gameState)),
            fromPoint,
            toPoint,
            playerColor,
            result: 0, // Oyun devam ediyor
            timestamp: Date.now()
        };
        
        this.currentGameMoves.push(move);
    }
    
    // Oyunu bitir ve sonucu belirle
    public endGame(winnerColor: PlayerColor | null): void {
        if (!this.gameInProgress) {
            return;
        }
        
        // Her hamleye sonucu ekle
        for (const move of this.currentGameMoves) {
            if (winnerColor === null) {
                move.result = 0; // Berabere
            } else if (winnerColor === move.playerColor) {
                move.result = 1; // Kazandı
            } else {
                move.result = -1; // Kaybetti
            }
        }
        
        // Hamleleri ana listeye ekle
        this.gameMoves = [...this.gameMoves, ...this.currentGameMoves];
        
        // Liste boyutunu kontrol et, maksimum sınırı aştıysa eski hamleleri sil
        if (this.gameMoves.length > this.MAX_STORED_MOVES) {
            this.gameMoves = this.gameMoves.slice(this.gameMoves.length - this.MAX_STORED_MOVES);
        }
        
        // Local storage'a kaydet
        this.saveMovesToStorage();
        
        // Mevcut oyunu sıfırla
        this.gameInProgress = false;
        this.currentGameMoves = [];
    }
    
    // Belirli bir oyuncu için hamleleri getir
    public getMovesForPlayer(playerColor: PlayerColor): GameMove[] {
        return this.gameMoves.filter(move => move.playerColor === playerColor);
    }
    
    // Tüm hamleleri getir
    public getAllMoves(): GameMove[] {
        return [...this.gameMoves];
    }
    
    // Son N hamleyi getir
    public getLastMoves(count: number): GameMove[] {
        return this.gameMoves.slice(-count);
    }
    
    // Hamleleri temizle (test amaçlı)
    public clearMoves(): void {
        this.gameMoves = [];
        this.saveMovesToStorage();
    }
} 