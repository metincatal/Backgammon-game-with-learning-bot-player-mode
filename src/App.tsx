import React, { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';
import { Board } from './views/components/Board/Board';
import { GameManager } from './models/GameManager';
import { PlayerColor } from './models/types/PlayerColor';
import { BotViewModel } from './viewModels/BotViewModel';
import { BotDifficulty } from './models/BotPlayer';
import { AlgorithmType } from './models/algorithms/IBackgammonAlgorithm';
import { AlgorithmFactory } from './models/algorithms/AlgorithmFactory';
import { GameDataService } from './services/GameDataService';
import { NeuralNetworkAlgorithm } from './models/algorithms/NeuralNetworkAlgorithm';

function App() {
  // Oyunun bitip bitmediğini izlemek için ref
  const gameEndedRef = useRef<boolean>(false);
  
  const [gameManager, setGameManager] = useState(() => {
    const gm = new GameManager();
    // Varsayılan oyuncunun beyaz olduğundan emin olalım
    gm.setCurrentPlayer('white');
    // İki oyunculu mod için varsayılan olarak beyaz oyuncu düzeni
    gm.resetBoardForPlayerColor('white');
    return gm;
  });
  const [gameState, setGameState] = useState(() => gameManager.getGameState());
  const [currentPlayer, setCurrentPlayer] = useState<PlayerColor>('white');
  const [diceValues, setDiceValues] = useState<number[]>([]);
  const [gameMode, setGameMode] = useState<'singlePlayer' | 'twoPlayer'>('twoPlayer');
  // Geriye dönük uyumluluk için botDifficulty (UI'da gösterilmeyecek)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>(BotDifficulty.MEDIUM);
  const [botViewModel, setBotViewModel] = useState<BotViewModel | null>(null);
  // Tek oyunculu mod için varsayılan renk siyah olsun
  const [playerColor, setPlayerColor] = useState<PlayerColor>('black');
  // Oyun sonucu
  const [gameResult, setGameResult] = useState<PlayerColor | null>(null);
  // Oyun veri servisi
  const [gameDataService] = useState(() => GameDataService.getInstance());

  // Yapay sinir ağını periyodik olarak eğit
  const [neuralNetwork] = useState(() => {
    // Algoritma factory'den Neural Network algoritmasını al
    const nn = AlgorithmFactory.getAlgorithm(AlgorithmType.NEURAL_NETWORK) as NeuralNetworkAlgorithm;
    return nn;
  });
  
  // Puanlama sistemi
  const [whiteScore, setWhiteScore] = useState<number>(0);
  const [blackScore, setBlackScore] = useState<number>(0);
  // Hedef puan
  const [targetScore, setTargetScore] = useState<number>(5);

  // Hedef puan değişimi
  const handleTargetScoreChange = useCallback((score: number) => {
    setTargetScore(score);
  }, []);

  // Tek oyunculu oyun başlatma
  const startSinglePlayerGame = useCallback((color: PlayerColor, difficulty: BotDifficulty) => {
    // Önce oyun modunu güncelle
    setGameMode('singlePlayer');
    
    // Oyuncunun seçtiği rengi ayarla
    setPlayerColor(color);
    setBotDifficulty(difficulty);
    
    // Oyun durumunu sıfırla
    const newGameManager = new GameManager();
    
    // Tahtayı oyuncunun seçtiği renge göre düzenle
    newGameManager.resetBoardForPlayerColor(color);
    
    // ÖNEMLİ: Oyun sırasını her zaman kullanıcı ile başlat
    newGameManager.setCurrentPlayer(color);
    
    // Oyun durumunu güncelle - yukarıdaki düzenlemeden sonra
    setGameManager(newGameManager);
    setGameState(newGameManager.getGameState());
    setCurrentPlayer(color); // Her zaman kullanıcının rengiyle başlat
    
    // Zarları sıfırla
    setDiceValues([]);
    
    // Skorları sıfırla
    setGameResult(null);
    
    // Oyun bitim referansını sıfırla
    gameEndedRef.current = false;
    
    console.log("Tek oyunculu oyun başlatıldı. Oyuncu:", color, "ile başladı");
    
    // Son olarak bot görünümünü oluştur - ama daha sonra, state güncellemelerinden sonra
    setTimeout(() => {
        const botColor = color === 'white' ? 'black' : 'white';
        const newBotViewModel = new BotViewModel(
            newGameManager,
            AlgorithmType.NEURAL_NETWORK,
            botColor
        );
        setBotViewModel(newBotViewModel);
        console.log("Bot oluşturuldu. Bot rengi:", botColor);
    }, 200);
}, [setGameMode, setPlayerColor, setBotDifficulty, setBotViewModel, setGameManager, setGameState, setCurrentPlayer, setDiceValues, setGameResult]);

  // Yeni oyun başlat
  const startNewGame = useCallback((playerColor: PlayerColor, difficulty: BotDifficulty, mode: 'singlePlayer' | 'twoPlayer') => {
    // Önce oyun modunu güncelle
    setGameMode(mode);
    
    // Oyun durumunu sıfırla
    let newGameManager = new GameManager();
    newGameManager.resetBoardForPlayerColor('white');
    
    // Eğer tek oyunculu modda isek
    if (mode === 'singlePlayer') {
        // Seçilen rengi ve zorluk seviyesini ayarla
        setPlayerColor(playerColor);
        setBotDifficulty(difficulty);
        
        // Yeni bot başlat
        setBotViewModel(null);
        
        // Tek oyuncu modunda her zaman oyuncu başlamalı
        if (newGameManager.getCurrentPlayer() !== playerColor) {
            // Eğer başlangıçta bot sırası ise, oyuncuya ayarla
            newGameManager.setCurrentPlayer(playerColor);
        }
    } else {
        // Çift oyunculu mod
        setBotViewModel(null);
    }
    
    // Oyun durumunu güncelle
    setGameState(newGameManager.getGameState());
    setCurrentPlayer(newGameManager.getCurrentPlayer());
    setGameManager(newGameManager);
    
    // Zarları sıfırla
    setDiceValues([]);
    
    // Skorlarda değişim olmuşsa güncelle
    setGameResult(null);
  }, []);

  // Bot ViewModel'i oluştur
  useEffect(() => {
    if (gameMode === 'singlePlayer') {
      // Tek oyunculu modda sadece sinir ağı algoritması kullanılacak
      const newBotViewModel = new BotViewModel(gameManager, AlgorithmType.NEURAL_NETWORK, playerColor);
      setBotViewModel(newBotViewModel);
    }
  }, [gameMode, playerColor, gameManager]);

  // Bot hamlesini otomatik başlat
  useEffect(() => {
    if (gameMode === 'singlePlayer' && botViewModel && currentPlayer !== playerColor && !gameEndedRef.current) {
      botViewModel.startAutoPlayForBotTurn();
    }
  }, [gameMode, botViewModel, currentPlayer, playerColor]);

  // BotViewModel için UI güncellemeleri
  useEffect(() => {
    if (gameMode === 'singlePlayer' && botViewModel) {
      // UI güncelleme fonksiyonunu botViewModel'a enjekte et
      botViewModel.setUpdateUICallback(() => {
        console.log("Bot UI güncelleme callback'i çağrıldı");
        
        // Bot hamlelerinden sonra UI'ı güncelle
        const updatedGameState = gameManager.getGameState();
        const updatedDice = gameManager.getDice();
        const updatedPlayer = gameManager.getCurrentPlayer();
        
        setGameState({...updatedGameState});
        setDiceValues([...updatedDice]);
        setCurrentPlayer(updatedPlayer);
        
        console.log("Bot UI güncellendi. Güncel oyuncu:", updatedPlayer, "Zarlar:", updatedDice);
      });
    }
  }, [gameMode, botViewModel, gameManager, setGameState, setDiceValues, setCurrentPlayer]);

  // Oyuncu rengi değişiklikleri
  useEffect(() => {
    if (gameMode === 'singlePlayer' && botViewModel) {
      botViewModel.setPlayerColor(playerColor);
    }
  }, [gameMode, botViewModel, playerColor]);

  const handleRollDice = useCallback(() => {
    console.log("Zar at butonuna tıklandı. Mevcut oyuncu:", gameManager.getCurrentPlayer());
    console.log("Oyuncu rengi:", playerColor);
    console.log("Mevcut zarlar:", diceValues);
    
    // Oyun bittiyse hiçbir şey yapma
    if (gameEndedRef.current) {
      console.log("Oyun bittiği için zar atma işlemi engellendi");
      return;
    }
    
    // "Sırayı Bitir" işlevi - zarlar atılmış ve tek oyunculu modda ise
    if (diceValues.length > 0 && gameMode === 'singlePlayer' && currentPlayer === playerColor) {
      console.log("App: Sıra değiştiriliyor. Şu anki oyuncu:", gameManager.getCurrentPlayer());
      
      // Sıra değişikliği
      gameManager.finishTurn();
      
      // Zar değerlerini sıfırla
      setDiceValues([]);
      
      // State'i güncelleyelim - ÖNEMLİ!
      const newGameState = gameManager.getGameState();
      const newPlayer = gameManager.getCurrentPlayer();
      setGameState(newGameState);
      setCurrentPlayer(newPlayer);
      
      console.log("App: Sıra değiştirildi, yeni oyuncu:", newPlayer);
      
      // Eğer sıra bot'a geçtiyse, bot hamlesini başlat
      if (newPlayer !== playerColor && botViewModel && !gameEndedRef.current) {
        console.log("Bot'un sırası, bot hamlesi başlatılıyor...");
        setTimeout(() => {
          botViewModel.startAutoPlayForBotTurn();
        }, 500);
      }
      return;
    }
    
    // "Zar At" işlevi - yeni zarları at
    console.log("Zar atılıyor...");
    const newDiceValues = gameManager.rollDice();
    setDiceValues(newDiceValues);
    setGameState(gameManager.getGameState());
    
    // Tek oyunculu modda ilk zar atışında oyuncunun sırasını koruyalım
    if (gameMode === 'singlePlayer' && currentPlayer !== playerColor) {
      // Botun sırasında zar atıldıysa, botun hamlesini başlat
      if (botViewModel && !gameEndedRef.current) {
        console.log("Bot'un sırası, bot hamlesi başlatılıyor...");
        setTimeout(() => {
          botViewModel.startAutoPlayForBotTurn();
        }, 500);
      }
    }
    
    setCurrentPlayer(gameManager.getCurrentPlayer());
    
    console.log("Zarlar atıldı:", newDiceValues);
    console.log("Mevcut oyuncu:", gameManager.getCurrentPlayer());
  }, [gameManager, diceValues, gameMode, playerColor, currentPlayer, botViewModel, setGameState, setDiceValues, setCurrentPlayer]);

  const handleMove = useCallback((fromPoint: number, toPoint: number) => {
    // Oyun bittiyse hiçbir şey yapma
    if (gameEndedRef.current) {
      console.log("Oyun bittiği için hamle yapma işlemi engellendi");
      return;
    }
    
    // Eğer bot oynuyorsa, insan oyuncunun hamle yapmasını engelle
    if (gameMode === 'singlePlayer' && currentPlayer !== playerColor) {
      return;
    }

    const moveSuccessful = gameManager.makeMove(fromPoint, toPoint);
    if (moveSuccessful) {
      // Hamleyi kaydet
      gameDataService.addMove(gameState, fromPoint, toPoint, currentPlayer);
      
      // Oyun durumunu güncelle
      const updatedGameState = gameManager.getGameState();
      setGameState(updatedGameState);
      setCurrentPlayer(gameManager.getCurrentPlayer());
      
      // Hamle sonrası oyun bitip bitmediğini kontrol et
      // eslint-disable-next-line react-hooks/exhaustive-deps
      checkGameEndImmediately(updatedGameState);
      
      setDiceValues(prevDice => {
        // Çift zar kontrolü
        if (prevDice.length >= 2 && prevDice[0] === prevDice[1]) {
          const dice = prevDice[0];
          const distance = Math.abs(toPoint - fromPoint);
          const multiplier = distance / dice;

          // Eğer mesafe zarın tam katıysa ve 1-4 arasındaysa
          if (Number.isInteger(multiplier) && multiplier >= 1 && multiplier <= 4) {
            // Kalan zarları döndür
            const remainingDice = [...prevDice];
            remainingDice.splice(0, multiplier);
            return remainingDice;
          }
        }

        // Bar'dan çıkış hamlesi için zar hesaplaması
        if (fromPoint === -1) {
          const usedDice = currentPlayer === 'white' ? 
            toPoint + 1 : // Beyaz için: hedef nokta + 1
            24 - toPoint; // Siyah için: 24 - hedef nokta

          // Zarların toplamıyla yapılan hamle kontrolü
          if (prevDice.length >= 2 && 
              prevDice[0] !== prevDice[1] && 
              usedDice === prevDice[0] + prevDice[1] && 
              usedDice <= 6) {
            return []; // İki zarı da kullan
          }

          // Tekli zar kullanımı
          const newDice = [...prevDice];
          const diceIndex = newDice.indexOf(usedDice);
          if (diceIndex !== -1) {
            newDice.splice(diceIndex, 1);
          }
          return newDice;
        }
        
        // Normal hamle için zar hesaplaması
        const usedDice = Math.abs(toPoint - fromPoint);
        
        // Zarların toplamıyla yapılan hamle kontrolü
        if (prevDice.length >= 2 && 
            prevDice[0] !== prevDice[1] && 
            usedDice === prevDice[0] + prevDice[1]) {
          return []; // Tüm zarları temizle
        }

        // Tekli zar hamlesi
        const newDice = [...prevDice];
        const diceIndex = newDice.indexOf(usedDice);
        if (diceIndex !== -1) {
          newDice.splice(diceIndex, 1);
        }

        // Eğer tüm zarlar kullanıldıysa boş dizi döndür
        if (newDice.length === 0) {
          return [];
        }

        return newDice;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameManager, currentPlayer, gameMode, playerColor, gameDataService, gameState]);

  const getAvailableMoves = useCallback((fromPoint: number) => {
    return gameManager.getAvailableMoves(fromPoint);
  }, [gameManager]);

  // Oyun modu değişikliği
  const handleGameModeChange = useCallback((mode: 'singlePlayer' | 'twoPlayer') => {
    setGameMode(mode);
    
    if (mode === 'singlePlayer') {
        // Tek oyunculu modda startSinglePlayerGame fonksiyonunu kullan
        startSinglePlayerGame('black', BotDifficulty.MEDIUM);
        return; // Erken dönüş
    }
    
    // İki oyunculu modda devam eden kod
    // Oyun bitimi ref'ini sıfırla
    gameEndedRef.current = false;
    
    // Yeni oyun başlat
    const newGameManager = new GameManager();
    
    // İki oyunculu modda beyaz başlar
    newGameManager.setCurrentPlayer('white');
    
    // Puanları sıfırla
    setWhiteScore(0);
    setBlackScore(0);
    
    setGameManager(newGameManager);
    setGameState(newGameManager.getGameState());
    setCurrentPlayer(newGameManager.getCurrentPlayer());
    setDiceValues([]);
    setGameResult(null);
  }, [startSinglePlayerGame]);

  // Oyuncu rengi değişikliği
  const handlePlayerColorChange = useCallback((color: PlayerColor) => {
    setPlayerColor(color);
    
    // Oyun bitimi ref'ini sıfırla
    gameEndedRef.current = false;
    
    // Yeni oyun başlat ve tahtayı seçilen renge göre ayarla
    const newGameManager = new GameManager();
    
    // Oyuncunun seçtiği renge göre tahtayı düzenle
    newGameManager.resetBoardForPlayerColor(color);
    
    // Oyuncunun seçtiği renk ile başla (sıra kesinlikle kullanıcıda olsun)
    newGameManager.setCurrentPlayer(color);
    
    console.log("Oyuncu rengi değişti. Yeni renk:", color);
    
    setGameManager(newGameManager);
    setGameState(newGameManager.getGameState());
    setCurrentPlayer(newGameManager.getCurrentPlayer());
    setDiceValues([]);
    setGameResult(null);
  }, []);

  // Yeni bir yaklaşım ile bildirim sırasını düzeltiyorum:
  // Önce checkGameEndImmediately prototipini tanımlayalım
  let checkGameEndImmediately: (state: typeof gameState) => boolean;

  // Sonra handleGameEnd fonksiyonunu tanımla
  const handleGameEnd = useCallback((winner: PlayerColor, collected: typeof gameState.collected, bar: typeof gameState.bar, points: typeof gameState.points) => {
    console.log(`Oyun sonucu işleniyor: ${winner} kazandı!`);
    
    // Oyunun bittiğini işaretle
    gameEndedRef.current = true;
    
    // Oyun sonucunu kaydet
    setGameResult(winner);
    gameDataService.endGame(winner);
    
    // Puan hesapla
    let scoreToAdd = 1; // Varsayılan 1 puan
    
    if (winner === 'white') {
      // Mars kontrolü: Siyah hiç taş toplamamışsa 2 puan
      if (collected.black === 0) {
        scoreToAdd = 2;
        
        // Katmerli Mars: Siyahın taşları bar'da veya beyazın evindeyse 3 puan
        if (bar.blackCheckers > 0) {
          scoreToAdd = 3;
        } else {
          // Siyah taşlarının beyazın evinde olup olmadığını kontrol et
          // Beyaz için ev: 0-5 arası noktalar
          for (let i = 0; i <= 5; i++) {
            if (points[i]?.color === 'black') {
              scoreToAdd = 3;
              break;
            }
          }
        }
      }
      
      // Beyazın puanını güncelle
      const newWhiteScore = whiteScore + scoreToAdd;
      setWhiteScore(newWhiteScore);
      console.log(`PUAN GÜNCELLENDİ: Beyaz ${scoreToAdd} puan kazandı. Toplam puan: ${newWhiteScore}`);
      
      // Hedef puana ulaşıldı mı kontrol et
      if (newWhiteScore >= targetScore) {
        setTimeout(() => {
          alert(`Oyun bitti! Beyaz ${newWhiteScore} puanla kazandı!`);
        }, 500);
      } else {
        // Yeni el başlat
        console.log("Yeni el başlatılıyor (Beyaz kazandı)...");
        setTimeout(() => {
          startNewGame(playerColor, botDifficulty, gameMode);
        }, 2000);
      }
    } else {
      // Mars kontrolü: Beyaz hiç taş toplamamışsa 2 puan
      if (collected.white === 0) {
        scoreToAdd = 2;
        
        // Katmerli Mars: Beyazın taşları bar'da veya siyahın evindeyse 3 puan
        if (bar.whiteCheckers > 0) {
          scoreToAdd = 3;
        } else {
          // Beyaz taşlarının siyahın evinde olup olmadığını kontrol et
          // Siyah için ev: 18-23 arası noktalar
          for (let i = 18; i <= 23; i++) {
            if (points[i]?.color === 'white') {
              scoreToAdd = 3;
              break;
            }
          }
        }
      }
      
      // Siyahın puanını güncelle
      const newBlackScore = blackScore + scoreToAdd;
      setBlackScore(newBlackScore);
      console.log(`PUAN GÜNCELLENDİ: Siyah ${scoreToAdd} puan kazandı. Toplam puan: ${newBlackScore}`);
      
      // Hedef puana ulaşıldı mı kontrol et
      if (newBlackScore >= targetScore) {
        setTimeout(() => {
          alert(`Oyun bitti! Siyah ${newBlackScore} puanla kazandı!`);
        }, 500);
      } else {
        // Yeni el başlat
        console.log("Yeni el başlatılıyor (Siyah kazandı)...");
        setTimeout(() => {
          startNewGame(playerColor, botDifficulty, gameMode);
        }, 2000);
      }
    }
    
    // Yapay sinir ağını eğit
    setTimeout(() => {
      try {
        neuralNetwork.trainFromGameData();
      } catch (error) {
        console.error("Yapay sinir ağı eğitimi sırasında hata:", error);
      }
    }, 1000);
  }, [whiteScore, blackScore, targetScore, playerColor, botDifficulty, gameMode, gameDataService, neuralNetwork, startNewGame]);

  // Sonra gerçekten checkGameEndImmediately fonksiyonunu tanımla
  checkGameEndImmediately = useCallback((state: typeof gameState) => {
    const { collected, bar, points } = state;
    
    // Beyaz tüm taşlarını topladıysa
    if (collected.white === 15 && !gameEndedRef.current) {
        console.log("HEMEN KONTROL: Oyun bitti: Beyaz kazandı!", collected);
        handleGameEnd('white', collected, bar, points);
        return true;
    } 
    // Siyah tüm taşlarını topladıysa
    else if (collected.black === 15 && !gameEndedRef.current) {
        console.log("HEMEN KONTROL: Oyun bitti: Siyah kazandı!", collected);
        handleGameEnd('black', collected, bar, points);
        return true;
    }
    
    return false;
  }, [handleGameEnd, gameState]);

  // Oyun durumunu takip et ve oyun bitimi kontrolü yap
  useEffect(() => {
    // Oyun durumu değiştiğinde sonuç kontrolü yap
    if (!gameEndedRef.current && (gameState.collected.white === 15 || gameState.collected.black === 15)) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      checkGameEndImmediately(gameState);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  // Oyun başlangıcında veri kaydetme işlemini başlat
  useEffect(() => {
    // Yeni oyun başlat
    gameDataService.startNewGame();
    
    // Component unmount olduğunda temizlik
    return () => {
      // Eğer oyun sonucu belirtilmişse kaydet
      if (gameResult && !gameEndedRef.current) {
        gameDataService.endGame(gameResult);
      }
    };
  }, [gameDataService, gameResult]);

  return (
    <div className="App">
      <div className="game-controls">
        <div className="mode-selector">
          <button 
            className={gameMode === 'twoPlayer' ? 'active' : ''} 
            onClick={() => handleGameModeChange('twoPlayer')}
          >
            İki Oyunculu
          </button>
          <button 
            className={gameMode === 'singlePlayer' ? 'active' : ''} 
            onClick={() => handleGameModeChange('singlePlayer')}
          >
            Tek Oyunculu
          </button>
        </div>
        
        {gameMode === 'singlePlayer' && (
          <div className="color-selector">
            <span>Renginiz: </span>
            <button 
              className={playerColor === 'white' ? 'active' : ''} 
              onClick={() => handlePlayerColorChange('white')}
            >
              Beyaz
            </button>
            <button 
              className={playerColor === 'black' ? 'active' : ''} 
              onClick={() => handlePlayerColorChange('black')}
            >
              Siyah
            </button>
          </div>
        )}
        
        <div className="score-settings">
          <span>Hedef Puan: </span>
          <select 
            value={targetScore}
            onChange={(e) => handleTargetScoreChange(parseInt(e.target.value))}
          >
            {[3, 5, 7, 9, 11].map(score => (
              <option key={score} value={score}>{score}</option>
            ))}
          </select>
        </div>
        
        <div className="score-display">
          <div className="score-item">
            <span className="score-label">Beyaz:</span> 
            <span className="score-value">{whiteScore}</span>
          </div>
          <div className="score-item">
            <span className="score-label">Siyah:</span> 
            <span className="score-value">{blackScore}</span>
          </div>
        </div>
      </div>
      
      <Board 
        gameState={gameState}
        currentPlayer={currentPlayer}
        onRollDice={handleRollDice}
        diceValues={diceValues}
        setDiceValues={setDiceValues}
        onMove={handleMove}
        getAvailableMoves={getAvailableMoves}
        gameManager={gameManager}
        setGameState={setGameState}
        setCurrentPlayer={setCurrentPlayer}
        isSinglePlayerMode={gameMode === 'singlePlayer'}
        playerColor={playerColor}
        botViewModel={botViewModel}
      />
    </div>
  );
}

export default App; 