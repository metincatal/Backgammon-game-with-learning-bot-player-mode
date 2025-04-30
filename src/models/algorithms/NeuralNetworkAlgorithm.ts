import { GameManager } from '../GameManager';
import { PlayerColor } from '../types/PlayerColor';
import { IBackgammonAlgorithm, PossibleMove, AlgorithmType } from './IBackgammonAlgorithm';
import { IGameState } from '../interfaces/IGameState';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { GameDataService, GameMove } from '../../services/GameDataService';

// Katman tipi
interface Layer {
    weights: number[][];
    biases: number[];
    activation: (x: number) => number;
}

// Basit bir ileri beslemeli sinir ağı
class SimpleNeuralNetwork {
    private layers: Layer[];
    private readonly LOCAL_STORAGE_KEY = 'tavla_neural_network_weights';
    private readonly LEARNING_RATE = 0.01; // Öğrenme oranı
    
    constructor() {
        // Tavla için hazır bir sinir ağı oluştur
        // Giriş katmanı: 50 nöron (tahtadan 48 özellik + 2 özel durum için)
        // Gizli katman: 20 nöron
        // Çıkış katmanı: 1 nöron (tahta değerlendirmesi)
        this.layers = [
            // Gizli katman
            {
                weights: this.generateRandomWeights(50, 20),
                biases: this.generateRandomBiases(20),
                activation: this.relu
            },
            // Çıkış katmanı
            {
                weights: this.generateRandomWeights(20, 1),
                biases: this.generateRandomBiases(1),
                activation: this.tanh
            }
        ];
        
        // Önceden kaydedilmiş ağırlıkları yüklemeyi dene
        const loadedSuccessfully = this.loadWeightsFromStorage();
        
        // Eğer yükleme başarısız olduysa, önceden eğitilmiş sabit ağırlıkları yükle
        if (!loadedSuccessfully) {
            this.loadPretrainedWeights();
        }
    }
    
    // Ağırlıkları local storage'dan yükle
    private loadWeightsFromStorage(): boolean {
        try {
            const storedWeights = localStorage.getItem(this.LOCAL_STORAGE_KEY);
            if (storedWeights) {
                const parsedWeights = JSON.parse(storedWeights);
                
                // Katman sayısı ve boyutları kontrol et
                if (parsedWeights.length === this.layers.length) {
                    let isValid = true;
                    
                    // Her katmanı kontrol et ve yükle
                    for (let i = 0; i < this.layers.length; i++) {
                        const layerData = parsedWeights[i];
                        
                        // Ağırlıklar ve biasların boyutlarını kontrol et
                        if (layerData.weights && layerData.biases) {
                            this.layers[i].weights = layerData.weights;
                            this.layers[i].biases = layerData.biases;
                        } else {
                            isValid = false;
                            break;
                        }
                    }
                    
                    if (isValid) {
                        console.log('Yapay sinir ağı ağırlıkları başarıyla yüklendi.');
                        return true;
                    }
                }
            }
            return false;
        } catch (error) {
            console.error('Ağırlıkları yüklerken hata:', error);
            return false;
        }
    }
    
    // Ağırlıkları local storage'a kaydet
    public saveWeightsToStorage(): void {
        try {
            // Sadece ağırlık ve bias değerlerini içeren bir yapı oluştur
            const weightsData = this.layers.map(layer => ({
                weights: layer.weights,
                biases: layer.biases
            }));
            
            localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(weightsData));
            console.log('Yapay sinir ağı ağırlıkları kaydedildi.');
        } catch (error) {
            console.error('Ağırlıkları kaydederken hata:', error);
        }
    }
    
    // Önceden eğitilmiş ağırlıkları yükler
    private loadPretrainedWeights(): void {
        // Gerçek bir uygulamada, burada eğitilmiş ağırlıkları bir dosyadan yükleriz
        // Bu örnekte, basit sabit değerler kullanıyoruz
        
        // Gerçek eğitilmiş ağırlıklar yoksa, mevcut rastgele ağırlıkları koruyalım
        if (!this.layers || this.layers.length < 2) {
            console.error("Katmanlar düzgün oluşturulmamış!");
            return;
        }
        
        // Gizli katman için biasları özel değerlerle doldur
        for (let i = 0; i < this.layers[0].biases.length; i++) {
            this.layers[0].biases[i] = 0.01;
        }
        
        // Çıkış katmanı için biasları özel değerlerle doldur
        for (let i = 0; i < this.layers[1].biases.length; i++) {
            this.layers[1].biases[i] = 0.0;
        }
        
        // Bazı ağırlıklara yararlı özel değerler atayalım
        // Bu değerler, özellikle hamle değerlendirmesinde faydalı olacak
        
        // Kendi pullarının sayısına göre pozitif, rakip pullarının sayısına göre negatif değerler
        for (let i = 0; i < 24; i++) {
            // Bot pulları için (çift indekslerdedir)
            if (this.layers[0].weights[i*2] && this.layers[0].weights[i*2].length > 0) {
                this.layers[0].weights[i*2][0] = 0.1; // Pozitif değer
            }
            
            // Rakip pulları için (tek indekslerdedir)
            if (this.layers[0].weights[i*2+1] && this.layers[0].weights[i*2+1].length > 0) {
                this.layers[0].weights[i*2+1][0] = -0.1; // Negatif değer
            }
        }
        
        // Bar'daki pullar için özel değerler
        if (this.layers[0].weights[48] && this.layers[0].weights[48].length > 0) {
            this.layers[0].weights[48][0] = -0.2; // Bot için bar pulları negatif
        }
        
        if (this.layers[0].weights[49] && this.layers[0].weights[49].length > 0) {
            this.layers[0].weights[49][0] = 0.2; // Rakip için bar pulları pozitif
        }
    }
    
    // Rastgele ağırlıklar oluştur
    private generateRandomWeights(inputSize: number, outputSize: number): number[][] {
        const weights: number[][] = [];
        
        // Matrisi doğru şekilde başlat - tüm satırları ve sütunları önceden oluştur
        for (let i = 0; i < inputSize; i++) {
            weights[i] = new Array(outputSize);
        }
        
        // Ağırlıkları doldur
        for (let i = 0; i < inputSize; i++) {
            for (let j = 0; j < outputSize; j++) {
                // Xavier initialization - Giriş ve çıkış boyutlarına göre uyarlanmış rastgele değerler
                const scale = Math.sqrt(2.0 / (inputSize + outputSize));
                weights[i][j] = (Math.random() * 2 - 1) * scale;
            }
        }
        
        return weights;
    }
    
    // Rastgele biaslar oluştur
    private generateRandomBiases(size: number): number[] {
        const biases: number[] = [];
        
        for (let i = 0; i < size; i++) {
            biases[i] = (Math.random() * 2 - 1) * 0.1;
        }
        
        return biases;
    }
    
    // Aktivasyon fonksiyonları
    private relu(x: number): number {
        return Math.max(0, x);
    }
    
    private tanh(x: number): number {
        return Math.tanh(x);
    }
    
    // Aktivasyon fonksiyonu türevleri
    private reluDerivative(x: number): number {
        return x > 0 ? 1 : 0;
    }
    
    private tanhDerivative(x: number): number {
        const tanhX = Math.tanh(x);
        return 1 - tanhX * tanhX;
    }
    
    // İleri besleme - bir girişten çıkış üret
    public forward(input: number[]): number {
        try {
            // Girişin boyutu 50 olmalı
            if (!input || input.length !== 50) {
                console.error("Geçersiz giriş boyutu:", input?.length);
                return 0;
            }
            
            let activation = input;
            
            // Her katmandan geçir
            for (let i = 0; i < this.layers.length; i++) {
                const layer = this.layers[i];
                
                // Katman kontrolü
                if (!layer || !layer.weights || !layer.biases) {
                    console.error("Geçersiz katman yapısı:", i);
                    return 0;
                }
                
                const newActivation: number[] = new Array(layer.biases.length).fill(0);
                
                // Her nöron için hesaplama yap
                for (let j = 0; j < layer.biases.length; j++) {
                    let sum = layer.biases[j];
                    
                    // Giriş değerlerinin ağırlıklı toplamını hesapla
                    for (let k = 0; k < activation.length; k++) {
                        // Güvenlik kontrolü
                        if (layer.weights[k] && layer.weights[k][j] !== undefined) {
                            sum += activation[k] * layer.weights[k][j];
                        }
                    }
                    
                    // Aktivasyon fonksiyonunu uygula
                    newActivation[j] = layer.activation(sum);
                }
                
                activation = newActivation;
            }
            
            // Çıkış katmanı tek bir değer döndürür
            return activation[0];
        } catch (error) {
            console.error("İleri beslemede hata:", error);
            return 0;
        }
    }
    
    // Geriye yayılım ile ağı eğit
    public train(input: number[], target: number): void {
        try {
            // İleri besleme adımı
            let activation = input;
            const activations: number[][] = [input];
            const zs: number[][] = [];
            
            // İleri besleme geçişi
            for (let i = 0; i < this.layers.length; i++) {
                const layer = this.layers[i];
                const z: number[] = new Array(layer.biases.length).fill(0);
                
                // Her nöron için hesaplama yap
                for (let j = 0; j < layer.biases.length; j++) {
                    let sum = layer.biases[j];
                    
                    // Giriş değerlerinin ağırlıklı toplamını hesapla
                    for (let k = 0; k < activation.length; k++) {
                        if (layer.weights[k] && layer.weights[k][j] !== undefined) {
                            sum += activation[k] * layer.weights[k][j];
                        }
                    }
                    
                    z[j] = sum;
                }
                
                zs.push(z);
                
                // Yeni aktivasyonları hesapla
                const newActivation: number[] = z.map(val => layer.activation(val));
                activations.push(newActivation);
                activation = newActivation;
            }
            
            // Çıkış hatası
            const outputError = activations[activations.length - 1][0] - target;
            
            // Geriye yayılım
            let delta = outputError;
            
            // Son katmandan başlayarak geriye doğru ilerle
            for (let i = this.layers.length - 1; i >= 0; i--) {
                const layer = this.layers[i];
                const activation = activations[i];
                const nextActivation = activations[i + 1];
                
                // Nöron başına ağırlık güncellemeleri
                for (let j = 0; j < nextActivation.length; j++) {
                    // Bu nöron için bias güncelle
                    layer.biases[j] -= this.LEARNING_RATE * delta;
                    
                    // Önceki katmandan gelen her bağlantı için ağırlıkları güncelle
                    for (let k = 0; k < activation.length; k++) {
                        if (layer.weights[k] && layer.weights[k][j] !== undefined) {
                            layer.weights[k][j] -= this.LEARNING_RATE * delta * activation[k];
                        }
                    }
                }
                
                // Önceki katman için delta hesapla (son katman değilse)
                if (i > 0) {
                    const prevLayer = this.layers[i - 1];
                    const prevZ = zs[i - 1];
                    const newDelta = new Array(prevLayer.biases.length).fill(0);
                    
                    // Her nöron için delta hesapla
                    for (let j = 0; j < prevLayer.biases.length; j++) {
                        let sum = 0;
                        
                        // Bu katmanın her nöronundan gelen ağırlıklı delta toplamı
                        for (let k = 0; k < layer.biases.length; k++) {
                            if (prevLayer.weights[j] && prevLayer.weights[j][k] !== undefined) {
                                sum += delta * prevLayer.weights[j][k];
                            }
                        }
                        
                        // Aktivasyon türevi ile çarp
                        let derivative = 0;
                        if (i === this.layers.length - 1) {
                            derivative = this.tanhDerivative(prevZ[j]);
                        } else {
                            derivative = this.reluDerivative(prevZ[j]);
                        }
                        
                        newDelta[j] = sum * derivative;
                    }
                    
                    delta = newDelta[0];
                }
            }
            
            // Eğitim sonrası ağırlıkları kaydet
            this.saveWeightsToStorage();
        } catch (error) {
            console.error("Eğitim sırasında hata:", error);
        }
    }
    
    // Toplu eğitim - birden fazla örnek üzerinde eğitim
    public batchTrain(dataset: {inputs: number[], expectedOutput: number}[], epochs: number = 1): void {
        if (!dataset || dataset.length === 0) {
            console.warn('Eğitim veri seti boş!');
            return;
        }
        
        console.log(`Toplu eğitim başlıyor: ${dataset.length} örnek, ${epochs} epoch`);
        
        // Her epoch için eğitim
        for (let epoch = 0; epoch < epochs; epoch++) {
            // Veri setini karıştır
            const shuffledDataset = [...dataset].sort(() => Math.random() - 0.5);
            
            // Her örnek için eğitim
            for (const example of shuffledDataset) {
                this.train(example.inputs, example.expectedOutput);
            }
            
            // Her 5 epoch'ta bir ilerleme raporu
            if ((epoch + 1) % 5 === 0 || epoch === 0 || epoch === epochs - 1) {
                console.log(`Epoch ${epoch + 1}/${epochs} tamamlandı.`);
            }
        }
        
        // Eğitim sonrası ağırlıkları kaydet
        this.saveWeightsToStorage();
        console.log("Toplu eğitim tamamlandı ve ağırlıklar kaydedildi.");
    }
    
    // Oyun verilerinden eğitim yap
    public trainFromGameData(): void {
        try {
            console.log("Yapay sinir ağı eğitiliyor...");
            const gameDataService = GameDataService.getInstance();
            const moves = gameDataService.getAllMoves();
            
            if (!moves || moves.length === 0) {
                console.log("Eğitim için veri bulunamadı.");
                return;
            }
            
            console.log(`${moves.length} hamle üzerinden eğitim yapılıyor...`);
            
            // Son 1000 hamleyi al (çok fazla veri varsa)
            const recentMoves = moves.slice(-1000);
            let trainCount = 0;
            
            for (const move of recentMoves) {
                // Sadece sonucu olan hareketleri kullan
                if (move.result) {
                    try {
                        // Hamle özelliklerini çıkar
                        const features = this.extractFeatures(move.gameState, move.playerColor);
                        
                        // Hedef değer: kazanılan hareketler için 1, kaybedilenler için -1
                        let targetValue = 0;
                        
                        if (move.result === 1) {
                            // Kazanan hamle
                            targetValue = 1;
                        } else if (move.result === -1) {
                            // Kaybeden hamle
                            targetValue = -1;
                        }
                        
                        // Sinir ağını eğit
                        this.train(features, targetValue);
                        trainCount++;
                    } catch (error) {
                        console.error("Hamle eğitimi sırasında hata:", error);
                    }
                }
            }
            
            console.log(`Eğitim tamamlandı. ${trainCount} hamle üzerinde eğitim yapıldı.`);
            
            // Son olarak ağırlıkları kaydet
            this.saveWeightsToStorage();
        } catch (error) {
            console.error("Oyun verilerinden eğitim yaparken hata:", error);
        }
    }
    
    // Tahta durumundan özellikler çıkar
    private extractFeatures(gameState: IGameState, botColor: PlayerColor): number[] {
        try {
            const features: number[] = [];
            const opponentColor: PlayerColor = botColor === 'white' ? 'black' : 'white';
            
            // Geçersiz oyun durumu kontrolü
            if (!gameState || !gameState.points || !gameState.bar || !gameState.collected) {
                console.error("Geçersiz oyun durumu!");
                // Hata durumunda sıfırlarla doldurulmuş özellik dizisi döndür
                return Array(50).fill(0);
            }
            
            // 1. Her nokta için 2 özellik: Bot pulları ve rakip pulları
            for (let i = 0; i < 24; i++) {
                // Nokta geçerli mi?
                if (!gameState.points[i]) {
                    features.push(0);
                    features.push(0);
                    continue;
                }
                
                const point = gameState.points[i];
                
                // Bot pulları (normalize edilmiş)
                if (point.color === botColor) {
                    features.push(Math.min(point.checkers / 5, 1.0)); // 5 pul üzerini kırp
                } else {
                    features.push(0);
                }
                
                // Rakip pulları (normalize edilmiş)
                if (point.color === opponentColor) {
                    features.push(Math.min(point.checkers / 5, 1.0));
                } else {
                    features.push(0);
                }
            }
            
            // 2. Bar'daki pullar
            const botBarCount = botColor === 'white' ? 
                (gameState.bar.whiteCheckers || 0) : 
                (gameState.bar.blackCheckers || 0);
                
            const opponentBarCount = botColor === 'white' ? 
                (gameState.bar.blackCheckers || 0) : 
                (gameState.bar.whiteCheckers || 0);
            
            features.push(Math.min(botBarCount / 5, 1.0));
            features.push(Math.min(opponentBarCount / 5, 1.0));
            
            // 3. Toplanan pullar
            const botCollectedCount = botColor === 'white' ? 
                (gameState.collected.white || 0) : 
                (gameState.collected.black || 0);
                
            const opponentCollectedCount = botColor === 'white' ? 
                (gameState.collected.black || 0) : 
                (gameState.collected.white || 0);
            
            features.push(botCollectedCount / 15);
            features.push(opponentCollectedCount / 15);
            
            // Özelliklerin boyutunu kontrol et
            if (features.length !== 50) {
                console.warn(`Özellik boyutu beklenenden farklı: Beklenen 50, Oluşturulan ${features.length}`);
                
                // Eksik özellikleri ekle
                while (features.length < 50) {
                    features.push(0);
                }
                
                // Fazla özellikleri kırp
                if (features.length > 50) {
                    return features.slice(0, 50);
                }
            }
            
            return features;
        } catch (error) {
            console.error("Özellik çıkarma hatası:", error);
            return Array(50).fill(0); // Hata durumunda sıfırlarla dolu dizi döndür
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

export class NeuralNetworkAlgorithm implements IBackgammonAlgorithm {
    private network: SimpleNeuralNetwork;
    private gameDataService: GameDataService;
    private trainingInProgress: boolean = false;
    private lastTrainingTime: number = 0;
    private readonly TRAINING_INTERVAL = 1000 * 60 * 10; // 10 dakikada bir eğitim
    private readonly TRAINING_BATCH_SIZE = 50; // Eğitim için kullanılacak hamle sayısı
    private readonly TRAINING_EPOCHS = 5; // Eğitim epoch sayısı
    
    constructor() {
        // Sinir ağını oluştur
        this.network = new SimpleNeuralNetwork();
        
        // Oyun verilerini yükle
        this.gameDataService = GameDataService.getInstance();
        
        // Periyodik eğitim kontrolü
        this.checkAndTrain();
    }
    
    public getName(): string {
        return AlgorithmType.NEURAL_NETWORK;
    }
    
    public getDescription(): string {
        return "Yapay sinir ağı, önceden eğitilmiş bir model kullanarak tahta durumlarını değerlendirir ve en iyi hamleyi seçer.";
    }
    
    // Periyodik eğitim kontrolü
    private checkAndTrain(): void {
        const now = Date.now();
        
        // Eğitim aralığı kontrolü
        if (!this.trainingInProgress && (now - this.lastTrainingTime > this.TRAINING_INTERVAL)) {
            this.trainFromGameData();
        }
        
        // 30 dakikada bir kontrol et
        setTimeout(() => this.checkAndTrain(), 30 * 60 * 1000);
    }
    
    // Oyun verilerinden ağı eğit
    public trainFromGameData(): void {
        if (this.trainingInProgress) {
            console.log('Eğitim zaten devam ediyor!');
            return;
        }
        
        this.trainingInProgress = true;
        console.log('Oyun verilerinden yapay sinir ağını eğitme başladı...');
        
        try {
            // Son hamleleri al
            const recentMoves = this.gameDataService.getLastMoves(500);
            
            if (recentMoves.length < 10) {
                console.log('Yeterli veri yok, eğitim atlanıyor.');
                this.trainingInProgress = false;
                return;
            }
            
            // Eğitim veri setini oluştur
            const trainingData: {inputs: number[], expectedOutput: number}[] = [];
            
            // Kazanan hamlelere öncelik ver
            const winningMoves = recentMoves.filter(move => move.result === 1);
            const losingMoves = recentMoves.filter(move => move.result === -1);
            const drawMoves = recentMoves.filter(move => move.result === 0);
            
            // Kazanan, kaybeden ve berabere hamleleri dengeli bir şekilde ekle
            for (const move of winningMoves.slice(0, this.TRAINING_BATCH_SIZE / 2)) {
                const features = this.extractFeatures(move.gameState, move.playerColor);
                trainingData.push({
                    inputs: features,
                    expectedOutput: 0.9 // Kazanma durumuna yakın bir değer
                });
            }
            
            for (const move of losingMoves.slice(0, this.TRAINING_BATCH_SIZE / 4)) {
                const features = this.extractFeatures(move.gameState, move.playerColor);
                trainingData.push({
                    inputs: features,
                    expectedOutput: -0.9 // Kaybetme durumuna yakın bir değer
                });
            }
            
            for (const move of drawMoves.slice(0, this.TRAINING_BATCH_SIZE / 4)) {
                const features = this.extractFeatures(move.gameState, move.playerColor);
                trainingData.push({
                    inputs: features,
                    expectedOutput: 0.0 // Beraberlik değeri
                });
            }
            
            // Veri seti boşsa eğitimi atla
            if (trainingData.length === 0) {
                console.log('Eğitim veri seti boş, eğitim atlanıyor.');
                this.trainingInProgress = false;
                return;
            }
            
            console.log(`${trainingData.length} hamle ile eğitim başlıyor...`);
            
            // Ağı eğit (web worker ile yapılabilir, şimdilik direkt yapıyoruz)
            setTimeout(() => {
                try {
                    this.network.batchTrain(trainingData, this.TRAINING_EPOCHS);
                    console.log('Eğitim tamamlandı.');
                    this.lastTrainingTime = Date.now();
                } catch (error) {
                    console.error('Eğitim sırasında hata:', error);
                } finally {
                    this.trainingInProgress = false;
                }
            }, 100);
            
        } catch (error) {
            console.error('Eğitim hazırlığında hata:', error);
            this.trainingInProgress = false;
        }
    }
    
    public calculateBestMove(gameManager: GameManager, botColor: PlayerColor, fromPoint?: number): { fromPoint: number; toPoint: number } | null {
        try {
            // Tüm olası hamleleri bul
            const possibleMoves = this.findAllPossibleMoves(gameManager, botColor);
            
            // Hamle yoksa null döndür
            if (possibleMoves.length === 0) {
                console.log("Neural Network: Olası hamle bulunamadı.");
                return null;
            }
            
            // fromPoint belirtilmişse, sadece belirtilen noktadan hamleleri değerlendir
            let filteredMoves = possibleMoves;
            if (fromPoint !== undefined) {
                filteredMoves = possibleMoves.filter(move => move.fromPoint === fromPoint);
                
                if (filteredMoves.length === 0) {
                    console.log(`Neural Network: ${fromPoint} noktasından hamle bulunamadı.`);
                    return null;
                }
            }
            
            // Her hamlenin sonraki durumunu değerlendir
            for (const move of filteredMoves) {
                try {
                    // Tahta kopyası oluştur ve hamleyi uygula
                    const clonedState = this.cloneGameState(gameManager.getGameState());
                    this.applyMoveToGameState(clonedState, botColor, move.fromPoint, move.toPoint);
                    
                    // Sinir ağı ile değerlendir
                    const boardFeatures = this.extractFeatures(clonedState, botColor);
                    move.score = this.network.forward(boardFeatures);
                } catch (error) {
                    console.error("Hamle değerlendirme hatası:", error);
                    // Hata durumunda düşük bir skor ver
                    move.score = -999;
                }
            }
            
            // En yüksek skora sahip hamleyi seç
            filteredMoves.sort((a, b) => b.score - a.score);
            
            // En iyi hamle
            const bestMove = filteredMoves[0];
            console.log(`Neural Network: En iyi hamle: ${bestMove.fromPoint} -> ${bestMove.toPoint}, skor: ${bestMove.score}`);
            
            return { fromPoint: bestMove.fromPoint, toPoint: bestMove.toPoint };
        } catch (error) {
            console.error("Neural Network hamle hesaplama hatası:", error);
            return null;
        }
    }
    
    // Tahta durumundan özellikler çıkar
    private extractFeatures(gameState: IGameState, botColor: PlayerColor): number[] {
        try {
            const features: number[] = [];
            const opponentColor: PlayerColor = botColor === 'white' ? 'black' : 'white';
            
            // Geçersiz oyun durumu kontrolü
            if (!gameState || !gameState.points || !gameState.bar || !gameState.collected) {
                console.error("Geçersiz oyun durumu!");
                // Hata durumunda sıfırlarla doldurulmuş özellik dizisi döndür
                return Array(50).fill(0);
            }
            
            // 1. Her nokta için 2 özellik: Bot pulları ve rakip pulları
            for (let i = 0; i < 24; i++) {
                // Nokta geçerli mi?
                if (!gameState.points[i]) {
                    features.push(0);
                    features.push(0);
                    continue;
                }
                
                const point = gameState.points[i];
                
                // Bot pulları (normalize edilmiş)
                if (point.color === botColor) {
                    features.push(Math.min(point.checkers / 5, 1.0)); // 5 pul üzerini kırp
                } else {
                    features.push(0);
                }
                
                // Rakip pulları (normalize edilmiş)
                if (point.color === opponentColor) {
                    features.push(Math.min(point.checkers / 5, 1.0));
                } else {
                    features.push(0);
                }
            }
            
            // 2. Bar'daki pullar
            const botBarCount = botColor === 'white' ? 
                (gameState.bar.whiteCheckers || 0) : 
                (gameState.bar.blackCheckers || 0);
                
            const opponentBarCount = botColor === 'white' ? 
                (gameState.bar.blackCheckers || 0) : 
                (gameState.bar.whiteCheckers || 0);
            
            features.push(Math.min(botBarCount / 5, 1.0));
            features.push(Math.min(opponentBarCount / 5, 1.0));
            
            // 3. Toplanan pullar
            const botCollectedCount = botColor === 'white' ? 
                (gameState.collected.white || 0) : 
                (gameState.collected.black || 0);
                
            const opponentCollectedCount = botColor === 'white' ? 
                (gameState.collected.black || 0) : 
                (gameState.collected.white || 0);
            
            features.push(botCollectedCount / 15);
            features.push(opponentCollectedCount / 15);
            
            // Özelliklerin boyutunu kontrol et
            if (features.length !== 50) {
                console.warn(`Özellik boyutu beklenenden farklı: Beklenen 50, Oluşturulan ${features.length}`);
                
                // Eksik özellikleri ekle
                while (features.length < 50) {
                    features.push(0);
                }
                
                // Fazla özellikleri kırp
                if (features.length > 50) {
                    return features.slice(0, 50);
                }
            }
            
            return features;
        } catch (error) {
            console.error("Özellik çıkarma hatası:", error);
            return Array(50).fill(0); // Hata durumunda sıfırlarla dolu dizi döndür
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