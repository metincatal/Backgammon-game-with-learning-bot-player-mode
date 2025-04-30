import { BotPlayer, BotDifficulty, difficultyToAlgorithm } from '../models/BotPlayer';
import { GameManager } from '../models/GameManager';
import { PlayerColor } from '../models/types/PlayerColor';
import { AlgorithmType } from '../models/algorithms/IBackgammonAlgorithm';
import { AlgorithmFactory } from '../models/algorithms/AlgorithmFactory';

export class BotViewModel {
    private bot: BotPlayer;
    private gameManager: GameManager;
    private botDelay: number = 1000; // Bot hamlesinin gecikme süresi (1 saniye)
    private isRunning: boolean = false;
    private playerColor: PlayerColor;
    private algorithm: AlgorithmType;
    private botColor: PlayerColor;

    constructor(gameManager: GameManager, algorithm: AlgorithmType, playerColor: PlayerColor) {
        this.gameManager = gameManager;
        this.algorithm = algorithm;
        this.playerColor = playerColor;
        
        // Bot'un rengi, oyuncunun renginin tersidir
        this.botColor = playerColor === 'white' ? 'black' : 'white';
        
        this.bot = new BotPlayer(gameManager, algorithm, this.botColor);
    }
    
    // Eski constructor için bir factory metodu (geriye dönük uyumluluk için)
    public static fromDifficulty(gameManager: GameManager, difficulty: BotDifficulty, playerColor: PlayerColor): BotViewModel {
        const algorithm = difficultyToAlgorithm[difficulty];
        return new BotViewModel(gameManager, algorithm, playerColor);
    }
    
    // Bot'un hamlesi geldiğinde otomatik oynaması için
    public startAutoPlayForBotTurn(): void {
        if (this.isRunning) {
            console.log("Bot zaten oynuyor, yeni hamle başlatılamaz.");
            return;
        }
        
        console.log("Bot hamle başlatma isteği. Mevcut oyuncu:", this.gameManager.getCurrentPlayer(), "Bot rengi:", this.botColor);
        
        // Kesinlikle kullanıcının sırası ise, bot hamle yapmamalı
        if (this.gameManager.getCurrentPlayer() === this.playerColor) {
            console.log("Bot hamle yapmıyor: Sıra kullanıcıda!");
            this.isRunning = false;
            return;
        }
        
        this.isRunning = true;
        console.log("Bot hamle yapmaya başlıyor...");
        
        // Bot sırası geldiğinde otomatik hamle yapmak için
        setTimeout(() => {
            // Bot zar atsın
            const diceValues = this.gameManager.rollDice();
            console.log("Bot zar attı:", diceValues);
            
            // Zarları kullanıcıya göster
            this.updateUIState(); // Bu metodu dışarıdan enjekte etmelisin
            
            // Eğer zar atıldıysa ve bot hamle yapabiliyorsa
            if (diceValues.length > 0 && this.gameManager.canMakeAnyMove()) {
                // Biraz bekleyin, oyuncu zarları görsün
                setTimeout(() => {
                    // Bot tüm zarlarını kullanana kadar hamle yapmaya devam etsin
                    this.makeBotMoves();
                }, 1500); // Zamanı uzatıyoruz ki oyuncu zarları görebilsin
            } else {
                // Hamle yapılamıyorsa sırayı bitir
                console.log("Bot hamle yapamıyor, sıra değiştiriliyor.");
                this.gameManager.finishTurn();
                this.isRunning = false;
                this.updateUIState(); // UI'yi güncelle
            }
        }, this.botDelay);
    }
    
    // Bot'un hamle yapması için yardımcı metod
    private makeBotMoves(): void {
        // Bot'un yapabileceği hamle var mı kontrol et
        if (this.gameManager.canMakeAnyMove()) {
            // Bot hamlesi yap
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const moveResult = this.bot.makeMove();
            
            // UI'yi güncelle - her hamleden sonra
            this.updateUIState();
            
            // Hala zar kaldıysa ve hamle yapabiliyorsa, biraz bekleyip devam et
            if (this.gameManager.getDice().length > 0 && this.gameManager.canMakeAnyMove()) {
                setTimeout(() => {
                    this.makeBotMoves(); // Recursive olarak devam et
                }, 1200); // Hamle arasında biraz daha uzun bir bekleme süresi
            } else {
                // Zarlar bitti veya hamle yapılamıyor, sırayı bitir
                setTimeout(() => {
                    console.log("Bot hamleleri tamamlandı, sıra değiştiriliyor.");
                    
                    // Sırayı bitir ve zarları temizle
                    this.gameManager.finishTurn();
                    
                    // Bot'un oynamadığını işaretle
                    this.isRunning = false;
                    
                    // UI'yi güncelle (zarları temizle ve sırayı değiştir)
                    this.updateUIState();
                }, 1000); // Son hamleden sonra bir süre bekle
            }
        } else {
            // Hamle yapılamıyorsa sırayı bitir
            setTimeout(() => {
                console.log("Bot hamle yapamıyor, sıra değiştiriliyor.");
                
                // Sırayı bitir ve zarları temizle
                this.gameManager.finishTurn();
                
                // Bot'un oynamadığını işaretle
                this.isRunning = false;
                
                // UI'yi güncelle
                this.updateUIState();
            }, 1000);
        }
    }
    
    // UI'yi güncellemek için dışarıdan enjekte edilecek fonksiyon
    private updateUICallback: (() => void) | null = null;
    
    // UI güncellemesi için yardımcı metod
    private updateUIState(): void {
        if (this.updateUICallback) {
            this.updateUICallback();
        }
    }
    
    // UI güncelleme geri çağrısını ayarla
    public setUpdateUICallback(callback: () => void): void {
        this.updateUICallback = callback;
    }
    
    // Algoritma tipini güncelle
    public setAlgorithm(algorithm: AlgorithmType): void {
        this.algorithm = algorithm;
        
        // Bot'un rengi, oyuncunun renginin tersidir
        this.botColor = this.playerColor === 'white' ? 'black' : 'white';
        
        // Yeni algoritma ile bot'u yeniden oluştur
        this.bot = new BotPlayer(this.gameManager, algorithm, this.botColor);
    }
    
    // Zorluk seviyesini güncelle (geriye dönük uyumluluk)
    public setBotDifficulty(difficulty: BotDifficulty): void {
        const algorithm = difficultyToAlgorithm[difficulty];
        this.setAlgorithm(algorithm);
    }
    
    // Oyuncunun rengini güncelle
    public setPlayerColor(color: PlayerColor): void {
        this.playerColor = color;
        
        // Bot'un rengi, oyuncunun renginin tersidir
        this.botColor = color === 'white' ? 'black' : 'white';
        
        // Tahtayı oyuncu rengi için düzenle
        this.gameManager.resetBoardForPlayerColor(color);
        
        // Yeni renk ile bot'u yeniden oluştur
        this.bot = new BotPlayer(this.gameManager, this.algorithm, this.botColor);
    }
    
    // Bot işlem yapıyor mu kontrolü
    public isBotPlaying(): boolean {
        return this.isRunning;
    }
    
    // Kullanılan algoritma tipini al
    public getAlgorithm(): AlgorithmType {
        return this.algorithm;
    }
    
    // Algoritma bilgilerini al
    public getAlgorithmInfo() {
        return AlgorithmFactory.getAlgorithmInfo(this.algorithm);
    }
    
    // Tüm algoritmaların bilgilerini al
    public getAllAlgorithmsInfo() {
        return AlgorithmFactory.getAllAlgorithmsInfo();
    }
    
    // Bot zorluk seviyesini al (geriye dönük uyumluluk)
    public getBotDifficulty(): BotDifficulty {
        // Basitleştirilmiş ters haritalama - her algoritma tipi bir zorluk seviyesine eşlenmez
        if (this.algorithm === AlgorithmType.SIMPLE_EVALUATION) {
            return BotDifficulty.EASY;
        } else if (this.algorithm === AlgorithmType.ADVANCED_STATIC_EVALUATION) {
            return BotDifficulty.MEDIUM;
        } else {
            return BotDifficulty.HARD; // Diğer tüm algoritmalar HARD olarak kabul edilir
        }
    }
} 