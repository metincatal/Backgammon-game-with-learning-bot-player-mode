import React, { useState, useCallback } from 'react';
import './Board.css';
import { Point } from './Point';
import { Dice } from '../Dice/Dice';
import { IGameState } from '../../../models/interfaces/IGameState';
import { PlayerColor } from '../../../models/types/PlayerColor';
import { GameManager } from '../../../models/GameManager';
import { BotViewModel } from '../../../viewModels/BotViewModel';

interface BoardProps {
    gameState: IGameState;
    currentPlayer: PlayerColor;
    onRollDice: () => void;
    diceValues: number[];
    setDiceValues: (values: number[]) => void;
    onMove: (fromPoint: number, toPoint: number) => void;
    getAvailableMoves: (fromPoint: number) => number[];
    gameManager: GameManager;
    setGameState: (state: IGameState) => void;
    setCurrentPlayer: (player: PlayerColor) => void;
    isSinglePlayerMode?: boolean;
    playerColor?: PlayerColor;
    botViewModel?: BotViewModel | null;
}

export const Board: React.FC<BoardProps> = ({ 
    gameState, 
    currentPlayer, 
    onRollDice, 
    diceValues,
    setDiceValues,
    onMove,
    getAvailableMoves,
    gameManager,
    setGameState,
    setCurrentPlayer,
    isSinglePlayerMode = false,
    playerColor = 'white',
    botViewModel
}) => {
    const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
    const [validMoves, setValidMoves] = useState<number[]>([]);
    const [showNoMoveWarning, setShowNoMoveWarning] = useState(false);
    const [showBarWarning, setShowBarWarning] = useState(false);
    const [lastClickedPoint, setLastClickedPoint] = useState<number | null>(null);
    const [lastClickTime, setLastClickTime] = useState<number>(0);
    const [hasRolled, setHasRolled] = useState(false);

    // Hamle yapılıp yapılamayacağını kontrol et
    const canMakeAnyMove = useCallback(() => {
        // Oyun tahtasının güncel durumunu al
        const gameState = gameManager.getGameState();
        
        // Eğer zar yoksa hiçbir hamle yapılamaz
        if (diceValues.length === 0) {
            return false;
        }
        
        // Bar'dan çıkarılabilecek taş var mı kontrol et
        if ((currentPlayer === 'white' && gameState.bar.whiteCheckers > 0) ||
            (currentPlayer === 'black' && gameState.bar.blackCheckers > 0)) {
            return getAvailableMoves(-1).length > 0;
        }
        
        // Tahta üzerindeki hamleleri kontrol et
        for (let i = 0; i < 24; i++) {
            const point = gameState.points[i];
            if (point.color === currentPlayer && point.checkers > 0) {
                const moves = getAvailableMoves(i);
                if (moves.length > 0) {
                    return true;
                }
            }
        }
        
        return false;
    }, [gameManager, getAvailableMoves, currentPlayer, diceValues]);

    // Zar At butonunun görünüp görünmeyeceğini kontrol et
    const shouldShowRollButton = useCallback(() => {
        // Eğer bot oynuyorsa ve tek oyunculu moddaysa, butonu gösterme
        if (isSinglePlayerMode && currentPlayer !== playerColor && botViewModel?.isBotPlaying()) {
            return false;
        }

        // Eğer zarlar atılmadıysa her zaman butonu göster
        if (!hasRolled) {
            return true;
        }
        
        // Zarlar atıldıysa, hamle yapılabilir mi kontrol et
        const hasLegalMove = canMakeAnyMove();
        
        // Hamle yapılamıyorsa butonu göster
        if (!hasLegalMove) {
            return true;
        }
        
        // Diğer durumlarda (hamle yapılabiliyorsa) butonu gösterme
        return false;
    }, [isSinglePlayerMode, currentPlayer, playerColor, botViewModel, hasRolled, canMakeAnyMove]);

    // Güvenli şekilde bir sonraki oyuncuya geçişi sağla
    const switchToNextPlayer = useCallback(() => {
        // Zarları temizle
        setDiceValues([]);
        
        // Oyun yöneticisine sıra değişimini bildir
        gameManager.finishTurn();
        
        // State'i güncelle
        setGameState(gameManager.getGameState());
        setCurrentPlayer(gameManager.getCurrentPlayer());
        setHasRolled(false); // Zar durumunu sıfırla
        
        // Seçili noktaları ve geçerli hamleleri temizle
        setSelectedPoint(null);
        setValidMoves([]);
        
        console.log("Sıra değiştirildi. Yeni oyuncu:", gameManager.getCurrentPlayer());
        
        // Tek oyunculu modda, sıra bot'a geçtiyse ve BotViewModel varsa, bot hamlesini başlat
        if (isSinglePlayerMode && gameManager.getCurrentPlayer() !== playerColor && botViewModel) {
            setTimeout(() => {
                botViewModel.startAutoPlayForBotTurn();
            }, 1000);
        }
    }, [gameManager, setDiceValues, setGameState, setCurrentPlayer, isSinglePlayerMode, playerColor, botViewModel]);

    // Zar At butonunun adını belirle
    const getRollButtonText = useCallback(() => {
        // İki oyunculu modda her zaman "Zar At" göster
        if (!isSinglePlayerMode) {
            return `Zar${'\n'}At`;
        }
        
        // Tek oyunculu modda ve zar atıldıysa "Sırayı Bitir" göster
        if (isSinglePlayerMode && hasRolled) {
            return `Sırayı${'\n'}Bitir`;
        }
        
        // Tek oyunculu modda ve zar atılmadıysa "Zar At" göster
        return `Zar${'\n'}At`;
    }, [isSinglePlayerMode, hasRolled]);

    // Hamle sonrası kullanılan zarları güncelle
    const updateDiceAfterMove = useCallback((fromPoint: number, toPoint: number, oldDiceValues: number[]) => {
        // GameManager'dan hamle sonrası güncel zarları al
        const currentDice = gameManager.getDice();
        console.log("Hamle sonrası güncel zarlar:", currentDice);
        console.log("Hamle öncesi zarlar:", oldDiceValues);
        
        // Toplam hamle mi kontrol et - eğer oldDiceValues ile currentDice farklı uzunluktaysa
        if (oldDiceValues.length !== currentDice.length) {
            // Hamle sonrası zarları güncelle
            setDiceValues([...currentDice]);
            console.log("Zar durumu toplam hamleden sonra güncellendi:", currentDice);
            return;
        }
        
        // Hamle tipini tespit et
        if (fromPoint === -1) {
            // Bar'dan çıkış hamlesi
            const usedDice = currentPlayer === 'white' 
                ? toPoint + 1 
                : 24 - toPoint;
            
            console.log("Bar'dan çıkış için kullanılan zar:", usedDice);
            
            // Eğer kullanılan zar mevcut zarlar içindeyse, o zarı kaldır
            if (oldDiceValues.includes(usedDice)) {
                const updatedDice = [...oldDiceValues];
                const index = updatedDice.indexOf(usedDice);
                updatedDice.splice(index, 1);
                setDiceValues(updatedDice);
            } else {
                // Toplam zar hamlesi olabilir - GameManager'dan alınan zarları kullan
                setDiceValues([...currentDice]);
            }
        } else if (toPoint === 99) {
            // Toplama hamlesi
            setDiceValues([...currentDice]);
        } else {
            // Normal hamle
            const distance = Math.abs(toPoint - fromPoint);
            
            // Mesafenin tek bir zarla yapılıp yapılamayacağını kontrol et
            if (oldDiceValues.includes(distance)) {
                const updatedDice = [...oldDiceValues];
                const index = updatedDice.indexOf(distance);
                updatedDice.splice(index, 1);
                setDiceValues(updatedDice);
            } else {
                // Toplam zar hamlesi olabilir - GameManager'dan alınan zarları kullan
                setDiceValues([...currentDice]);
            }
        }
    }, [gameManager, setDiceValues, currentPlayer]);

    // Zar At/Sırayı Bitir butonuna tıklama işlemi
    const handleRollDice = useCallback(() => {
        console.log("Zar/Sıra Bitir butonuna tıklandı. Mod:", isSinglePlayerMode ? "Tek Oyunculu" : "İki Oyunculu");
        console.log("Mevcut oyuncu:", currentPlayer);
        console.log("hasRolled:", hasRolled);
        console.log("Mevcut zarlar:", diceValues);
        
        // Eğer zarlar atılmışsa (hasRolled=true), her zaman tek tıklamada sıra değişsin
        if (hasRolled) {
            console.log("Sıra değiştiriliyor (tek tıklama ile)");
            switchToNextPlayer(); // Zarların temizlenmesi ve sıranın değişimi
            return;
        }
        
        // "Zar At" işlevi - zarları henüz atılmamışsa
        setShowNoMoveWarning(false);
        setShowBarWarning(false);
        
        // Zarları at ve state'i güncelle
        const newDiceValues = gameManager.rollDice();
        setDiceValues(newDiceValues);
        setGameState(gameManager.getGameState());
        setCurrentPlayer(gameManager.getCurrentPlayer());
        setHasRolled(true); // Zar atıldı olarak işaretle
        
        console.log("Zarlar atıldı:", newDiceValues);
        console.log("Mevcut oyuncu:", gameManager.getCurrentPlayer());
        
        // Hamle kontrollerini geciktir (state güncellemesinin tamamlanması için)
        setTimeout(() => {
            // Güncel oyun durumunu al
            const currentGameState = gameManager.getGameState();
            const currentPlayerColor = gameManager.getCurrentPlayer();
            
            // Bar kontrolü - önemli: oyuncunun kırık taşı varsa ve hamle yapamıyorsa
            if ((currentPlayerColor === 'white' && currentGameState.bar.whiteCheckers > 0) ||
                (currentPlayerColor === 'black' && currentGameState.bar.blackCheckers > 0)) {
                
                // Bar'dan hamle yapılabilir mi kontrol et
                const barMoves = gameManager.getAvailableMoves(-1);
                console.log("Bar'dan çıkış hamleleri kontrol ediliyor:", barMoves);
                
                // Zarları göster, sonra durumu kontrol et
                setTimeout(() => {
                    if (barMoves.length === 0) {
                        // Bar'dan çıkarabileceği hamle yoksa, uyarı göster ve sırayı değiştir
                        console.log("Bar'dan çıkışta hamle yapılamıyor, uyarı gösterilecek");
                        setShowBarWarning(true);
                        setTimeout(() => {
                            setShowBarWarning(false);
                            switchToNextPlayer(); // Sırayı diğer oyuncuya geçir
                        }, 2000);
                    }
                    // Eğer barMoves.length > 0 ise, hamle yapılabilir, devam et
                }, 2000); // Zarları 2 saniye göster sonra karar ver
                
                return;
            }
            
            // Hiç hamle yapılabilir mi kontrol et
            let hasAnyLegalMove = false;
            
            // Tahta üzerinde yapılabilecek hamle var mı kontrol et
            for (let i = 0; i < 24; i++) {
                const point = currentGameState.points[i];
                if (point.color === currentPlayerColor && point.checkers > 0) {
                    const moves = gameManager.getAvailableMoves(i);
                    if (moves.length > 0) {
                        console.log(`Nokta ${i} için hamleler bulundu:`, moves);
                        hasAnyLegalMove = true;
                        break;
                    }
                }
            }

            // Hamle yapılamıyorsa uyarı göster ve sırayı değiştir
            if (!hasAnyLegalMove) {
                console.log("Hiçbir hamle yapılamıyor, sıra değiştiriliyor");
                setTimeout(() => {
                    setShowNoMoveWarning(true);
                    setTimeout(() => {
                        setShowNoMoveWarning(false);
                        switchToNextPlayer(); // Sırayı diğer oyuncuya geçir
                    }, 2000);
                }, 1000);
                return;
            }
            
            // Tek oyunculu modda sıra bot'a geçtiyse, bot hamlesini başlat
            if (isSinglePlayerMode && gameManager.getCurrentPlayer() !== playerColor && botViewModel) {
                setTimeout(() => {
                    botViewModel.startAutoPlayForBotTurn();
                }, 1000);
            }
        }, 500);
    }, [gameManager, diceValues, hasRolled, setDiceValues, setGameState, setCurrentPlayer, setShowNoMoveWarning, setShowBarWarning, currentPlayer, isSinglePlayerMode, playerColor, botViewModel, switchToNextPlayer, getAvailableMoves]);

    // Kırık taşa tıklama işlemi
    const handleBarClick = useCallback((color: PlayerColor) => {
        // Bar'da taş var ve tıklama doğru oyuncuya ait ise
        if (color === currentPlayer && 
            ((color === 'white' && gameState.bar.whiteCheckers > 0) || 
             (color === 'black' && gameState.bar.blackCheckers > 0))) {
            
            // Bar hamleleri kontrol et
            const barMoves = getAvailableMoves(-1);
            
            // Eğer hamle yapılabiliyorsa, hamleleri göster
            if (barMoves.length > 0) {
                setSelectedPoint(-1); // -1 bar'ı temsil eder
                setValidMoves(barMoves);
            } else {
                console.log("Bar'dan hamle yapılamıyor, uyarı gösterilecek");
                // Hamle yoksa, önce 2 saniye zarları göster, sonra uyarı göster ve sırayı değiştir
                setTimeout(() => {
                    setShowBarWarning(true);
                    setTimeout(() => {
                        setShowBarWarning(false);
                        switchToNextPlayer(); // Sırayı diğer oyuncuya geçir
                    }, 2000);
                }, 2000); // Önce 2 saniye bekle, sonra uyarıyı göster
            }
        }
    }, [currentPlayer, gameState.bar, getAvailableMoves, switchToNextPlayer]);

    // Hamle işleme fonksiyonu
    const handleMove = useCallback((pointId: number) => {
        console.log("Hamle işlemi başlatıldı, hedef:", pointId);
        
        // Eğer tıklanan nokta geçerli bir hedef noktasıysa
        if (validMoves.includes(pointId)) {
            // Hamle öncesi kullanılan zarı ve güncel zarları hatırla
            const oldDiceValues = [...diceValues];
            const fromPointBeforeMove = selectedPoint;
            
            // Hamleyi yap
            onMove(selectedPoint!, pointId);
            
            // Hamle sonrası görsel güncelleme
            setSelectedPoint(null);
            setValidMoves([]);
            
            // Zarları görsel olarak güncelle (hem tek zar hem toplam zar hamleleri için)
            if (fromPointBeforeMove !== null) {
                console.log("Hamle yapıldı, zarları güncelliyorum", fromPointBeforeMove, pointId);
                updateDiceAfterMove(fromPointBeforeMove, pointId, oldDiceValues);
            }
            
            // Kalan zarlarla yapılabilecek hamle var mı kontrol et
            setTimeout(() => {
                // Oyun durumunu ve zarları güncelle - hamleye bağlı olarak değişmiş olabilir
                const currentDice = gameManager.getDice();
                
                // Bar'da taş varsa önce onu kontrol et
                if ((currentPlayer === 'white' && gameState.bar.whiteCheckers > 0) ||
                    (currentPlayer === 'black' && gameState.bar.blackCheckers > 0)) {
                    
                    // Zarları göster, sonra bar kontrolü yap
                    setTimeout(() => {
                        const barMoves = getAvailableMoves(-1);
                        if (barMoves.length === 0) {
                            console.log("Bar'dan çıkış yapılamıyor, uyarı gösterilecek");
                            setShowBarWarning(true);
                            setTimeout(() => {
                                setShowBarWarning(false);
                                switchToNextPlayer(); // Sırayı diğer oyuncuya geçir
                            }, 2000);
                        } else {
                            console.log("Bar'dan çıkış hamleleri mevcut:", barMoves);
                            // Bar'dan hamle yapılabilir, kullanıcıya göster
                            setSelectedPoint(-1);
                            setValidMoves(barMoves);
                        }
                    }, 1000); // 1 saniye bekle, sonra kontrol et
                    
                    return;
                }
                
                // Yapılabilecek hamle veya kalan zar yoksa buton görünür olmalı
                if (currentDice.length === 0 || !canMakeAnyMove()) {
                    console.log("Hamle sonrası: Yapılabilecek hamle kalmadı veya zar yok");
                }
            }, 200);
            
            return;
        }

        // Çift tıklama kontrolü
        const currentTime = new Date().getTime();
        const isDoubleClick = lastClickedPoint === pointId && currentTime - lastClickTime < 300;

        // Eğer tıklanan nokta son hamlenin hedef noktasıysa ve çift tıklanıyorsa
        const moveHistory = gameManager.getMoveHistory();
        if (isDoubleClick && moveHistory.length > 0) {
            // Son hamleyi kontrol et
            const lastMove = moveHistory[moveHistory.length - 1];
            
            // Eğer tıklanan nokta son hareketin hedefi ise veya birden çok adımlı bir harekette yer alıyorsa
            if (pointId === lastMove.toPoint || 
                moveHistory.some(move => move.toPoint === pointId || move.fromPoint === pointId)) {
                // Hamleyi geri al
                const returnedDice = gameManager.undoLastMove();
                if (returnedDice.length > 0) {
                    // Zarları güncelle
                    setDiceValues([...returnedDice]);
                    // Oyun durumunu güncelle
                    setGameState({...gameManager.getGameState()});
                }
                
                setSelectedPoint(null);
                setValidMoves([]);
                setLastClickedPoint(null);
                setLastClickTime(0);
                return;
            }
        }

        // Son tıklama bilgilerini güncelle
        setLastClickedPoint(pointId);
        setLastClickTime(currentTime);

        // Eğer tıklanan nokta mevcut oyuncunun pullarını içeriyorsa
        const point = gameState.points[pointId];
        if (point.color === currentPlayer && point.checkers > 0) {
            // Bar'da taş varsa ve bar'dan çıkış hamlesi değilse engelle
            if ((currentPlayer === 'white' && gameState.bar.whiteCheckers > 0) ||
                (currentPlayer === 'black' && gameState.bar.blackCheckers > 0)) {
                console.log("Bar'da taş var, sadece bar'dan hamle yapılabilir");
                // Bar'ı seçili hale getir ve olası hamleleri göster
                setSelectedPoint(-1);
                setValidMoves(getAvailableMoves(-1));
                return;
            }
            
            // Vur-kaç kontrolü: Bu taş biriktirme alanında rakip pulunu kırdıysa hamle önerisi gösterme
            const moveHistory = gameManager.getMoveHistory();
            const isHitAndRunChecker = moveHistory.some(move => 
                move.toPoint === pointId && move.hitAndRun === true
            );
            
            if (isHitAndRunChecker) {
                // Eğer bu pul vur-kaç yapmışsa, hamle önerisi gösterme
                setSelectedPoint(null);
                setValidMoves([]);
                return;
            }
            
            // Normal taş seçimi
            setSelectedPoint(pointId);
            setValidMoves(getAvailableMoves(pointId));
        } else {
            setSelectedPoint(null);
            setValidMoves([]);
        }
    }, [selectedPoint, validMoves, gameState, currentPlayer, onMove, getAvailableMoves, gameManager, setGameState, lastClickTime, lastClickedPoint, switchToNextPlayer, diceValues, updateDiceAfterMove, canMakeAnyMove]);

    // Toplama alanına tıklama işlemi
    const handleCollectionAreaClick = useCallback(() => {
        // 99 numaralı nokta, toplama alanını temsil ediyor
        if (validMoves.includes(99)) {
            // Hamle öncesi zarları hatırla
            const oldDiceValues = [...diceValues];
            
            // Hamleyi uygula
            onMove(selectedPoint!, 99);
            
            // Hamle sonrası görsel güncelleme
            setSelectedPoint(null);
            setValidMoves([]);
            
            // Zarları güncelle
            if (selectedPoint !== null) {
                // Düzeltilmiş fonksiyonu kullan, bu toplama hamlesini de doğru ele alır
                updateDiceAfterMove(selectedPoint, 99, oldDiceValues);
            }
            
            // Kalan zarlarla yapılabilecek hamle olup olmadığını kontrol et
            setTimeout(() => {
                // Güncel zarlar
                const currentDice = gameManager.getDice();
                
                // Yapılabilecek hamle veya kalan zar yoksa buton görünür olmalı
                if (currentDice.length === 0 || !canMakeAnyMove()) {
                    console.log("Toplama hamlesi sonrası: Yapılabilecek hamle kalmadı veya zar yok");
                }
            }, 100);
        }
    }, [validMoves, selectedPoint, onMove, diceValues, updateDiceAfterMove, gameManager, canMakeAnyMove]);

    // Toplama pullarını geri oyuna döndürmek için fonksiyon
    const handleReturnChecker = useCallback(() => {
        // Tüm bear off hamlelerini geri alma
        const returnedDice = gameManager.undoAllBearOffs();
        if (returnedDice.length > 0) {
            setDiceValues([...returnedDice]); // Zarları güncelle
            setGameState(gameManager.getGameState());
        }
    }, [gameManager, setGameState, setDiceValues]);

    // Her bir bölge için 6 nokta oluştur
    const renderPoints = (start: number, end: number, reverse: boolean = false) => {
        let points = [...Array(6)].map((_, index) => {
            const pointIndex = start + index;
            return (
                <Point 
                    key={pointIndex} 
                    point={gameState.points[pointIndex]}
                    isSelected={selectedPoint === pointIndex}
                    isValidMove={validMoves.includes(pointIndex)}
                    currentPlayer={currentPlayer}
                    onPointClick={handleMove}
                />
            );
        });
        return reverse ? points.reverse() : points;
    };

    return (
        <div className="board">
            {showNoMoveWarning && (
                <div className="warning-message">
                    Hamle yapılamıyor! Sıra diğer oyuncuya geçiyor.
                </div>
            )}
            {showBarWarning && (
                <div className="warning-message">
                    Kırık taş oyuna sokulamıyor! Sıra diğer oyuncuya geçiyor.
                </div>
            )}
            <div className="board-main">
                <div className="board-half upper">
                    <div className="board-quadrant">
                        {/* Sol üst bölge (13-18) */}
                        {renderPoints(12, 17)}
                    </div>
                    <div className="board-quadrant">
                        {/* Sağ üst bölge (19-24) */}
                        {renderPoints(18, 23)}
                    </div>
                </div>
                
                <div className="board-half lower">
                    <div className="board-quadrant">
                        {/* Sol alt bölge (12-7) */}
                        {renderPoints(6, 11, true)}
                    </div>
                    <div className="board-quadrant">
                        {/* Sağ alt bölge (6-1) */}
                        {renderPoints(0, 5, true)}
                    </div>
                </div>
            </div>

            <div className="board-bar">
                <div 
                    className={`bar-section white ${selectedPoint === -1 && currentPlayer === 'white' ? 'selected' : ''}`}
                    onClick={() => handleBarClick('white')}
                >
                    <div 
                        className={`collection-area ${validMoves.includes(99) && currentPlayer === 'white' ? 'valid-move' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (currentPlayer === 'white' && validMoves.includes(99)) {
                                handleCollectionAreaClick();
                            }
                        }}
                        // Toplama alanı için ipucu metni ekle
                        title={currentPlayer === 'white' && validMoves.includes(99) ? "Taşı toplamak için tıklayın" : ""}
                        // Yeni: çift tıklama ile bear off hamlesi geri alınsın
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            handleReturnChecker();
                        }}
                    >
                        {/* Toplanan beyaz taşlar */}
                        {Array(gameState.collected.white).fill(null).map((_, i) => (
                            <div key={i} className="checker white collected" />
                        ))}
                    </div>
                    <div className="bar-checkers">
                        {Array(gameState.bar.whiteCheckers).fill(null).map((_, i) => (
                            <div key={i} className="checker white" />
                        ))}
                    </div>
                </div>

                <div className="controls">
                    {shouldShowRollButton() && (
                        <div className="middle-section">
                            <button 
                                className="roll-button"
                                onClick={handleRollDice}
                            >
                                {getRollButtonText()}
                            </button>
                        </div>
                    )}
                    
                    {isSinglePlayerMode && currentPlayer !== playerColor && botViewModel?.isBotPlaying() && (
                        <div className="bot-playing">
                            Bot hamle yapıyor...
                        </div>
                    )}
                    
                    {isSinglePlayerMode && currentPlayer !== playerColor && !botViewModel?.isBotPlaying() && diceValues.length === 0 && (
                        <div className="bot-playing">
                            <button 
                                className="roll-button"
                                onClick={handleRollDice}
                            >
                                {getRollButtonText()}
                            </button>
                        </div>
                    )}
                </div>

                <div 
                    className={`bar-section black ${selectedPoint === -1 && currentPlayer === 'black' ? 'selected' : ''}`}
                    onClick={() => handleBarClick('black')}
                >
                    <div className="bar-checkers">
                        {Array(gameState.bar.blackCheckers).fill(null).map((_, i) => (
                            <div key={i} className="checker black" />
                        ))}
                    </div>
                    <div 
                        className={`collection-area ${validMoves.includes(99) && currentPlayer === 'black' ? 'valid-move' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (currentPlayer === 'black' && validMoves.includes(99)) {
                                handleCollectionAreaClick();
                            }
                        }}
                        // Toplama alanı için ipucu metni ekle
                        title={currentPlayer === 'black' && validMoves.includes(99) ? "Taşı toplamak için tıklayın" : ""}
                        // Siyah taşlar için de çift tıklama işlevselliğini ekle
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            handleReturnChecker();
                        }}
                    >
                        {/* Toplanan siyah taşlar */}
                        {Array(gameState.collected.black).fill(null).map((_, i) => (
                            <div key={i} className="checker black collected" />
                        ))}
                    </div>
                </div>
            </div>

            <Dice 
                values={diceValues}
                onRoll={handleRollDice}
                isRollable={shouldShowRollButton()}
                currentPlayer={currentPlayer}
            />
        </div>
    );
}; 