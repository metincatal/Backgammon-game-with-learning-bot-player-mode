import { IBackgammonAlgorithm, AlgorithmType } from './IBackgammonAlgorithm';
import { SimpleEvaluationAlgorithm } from './SimpleEvaluationAlgorithm';
import { AdvancedStaticEvaluationAlgorithm } from './AdvancedStaticEvaluationAlgorithm';
import { MinimaxAlgorithm } from './MinimaxAlgorithm';
import { MonteCarloAlgorithm } from './MonteCarloAlgorithm';
import { NeuralNetworkAlgorithm } from './NeuralNetworkAlgorithm';

export class AlgorithmFactory {
    // Algoritma örneklerinin önbelleği - aynı algoritmayı tekrar tekrar oluşturmaktan kaçınmak için
    private static algorithmInstances: Map<AlgorithmType, IBackgammonAlgorithm> = new Map();
    
    // Algoritma adlarını ve açıklamalarını içeren statik liste
    public static readonly availableAlgorithms = [
        {
            type: AlgorithmType.SIMPLE_EVALUATION,
            name: "Basit Değerlendirme",
            description: "Temel stratejileri uygulayan basit bir değerlendirme algoritması."
        },
        {
            type: AlgorithmType.ADVANCED_STATIC_EVALUATION,
            name: "Gelişmiş Statik Değerlendirme",
            description: "Daha karmaşık stratejiler kullanan gelişmiş bir değerlendirme fonksiyonu."
        },
        {
            type: AlgorithmType.MINIMAX,
            name: "Minimax + Alpha-Beta",
            description: "Hamleleri ileri görüşlü olarak değerlendiren Minimax arama algoritması."
        },
        {
            type: AlgorithmType.MONTE_CARLO,
            name: "Monte Carlo Ağaç Arama",
            description: "Çok sayıda rastgele simülasyon çalıştırarak en iyi hamleyi bulan algoritma."
        },
        {
            type: AlgorithmType.NEURAL_NETWORK,
            name: "Yapay Sinir Ağı",
            description: "Önceden eğitilmiş bir sinir ağı kullanarak hamleleri değerlendiren gelişmiş algoritma."
        }
    ];
    
    // İstenilen algoritma tipine göre algoritmayı döndürür - Singleton deseni
    public static getAlgorithm(type: AlgorithmType): IBackgammonAlgorithm {
        // Eğer algoritma daha önce oluşturulduysa önbellekten döndür
        if (this.algorithmInstances.has(type)) {
            return this.algorithmInstances.get(type)!;
        }
        
        // Yeni algoritma oluştur
        let algorithm: IBackgammonAlgorithm;
        
        switch (type) {
            case AlgorithmType.SIMPLE_EVALUATION:
                algorithm = new SimpleEvaluationAlgorithm();
                break;
                
            case AlgorithmType.ADVANCED_STATIC_EVALUATION:
                algorithm = new AdvancedStaticEvaluationAlgorithm();
                break;
                
            case AlgorithmType.MINIMAX:
                algorithm = new MinimaxAlgorithm();
                break;
                
            case AlgorithmType.MONTE_CARLO:
                algorithm = new MonteCarloAlgorithm();
                break;
                
            case AlgorithmType.NEURAL_NETWORK:
                algorithm = new NeuralNetworkAlgorithm();
                break;
                
            default:
                // Varsayılan olarak basit değerlendirme algorithmasını kullan
                algorithm = new SimpleEvaluationAlgorithm();
        }
        
        // Algoritma örneğini önbelleğe ekle
        this.algorithmInstances.set(type, algorithm);
        
        return algorithm;
    }
    
    // Bir algoritma tipine karşılık gelen bilgileri döndürür
    public static getAlgorithmInfo(type: AlgorithmType) {
        return this.availableAlgorithms.find(algo => algo.type === type);
    }
    
    // Tüm algoritmalar hakkında bilgi döndürür
    public static getAllAlgorithmsInfo() {
        return this.availableAlgorithms;
    }
} 