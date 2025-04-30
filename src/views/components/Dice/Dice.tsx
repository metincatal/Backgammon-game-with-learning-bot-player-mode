import React, { useState, useCallback } from 'react';
import './Dice.css';

interface DiceProps {
    values: number[];
    onRoll: () => void;
    isRollable: boolean;
    currentPlayer: 'white' | 'black';
}

export const Dice: React.FC<DiceProps> = ({ values, onRoll, isRollable, currentPlayer }) => {
    const [isRolling, setIsRolling] = useState(false);

    const getRandomOffset = useCallback(() => {
        return Math.floor(Math.random() * 100 - 50); // -50 ile 50 arası rastgele değer
    }, []);

    // Bu fonksiyon görünüşe göre kullanılmıyor
    // İleride kullanılacaksa yorum olarak saklayalım
    /*
    const handleRoll = () => {
        setIsRolling(true);
        setTimeout(() => {
            onRoll();
            setTimeout(() => setIsRolling(false), 1200);
        }, 100);
    };
    */

    const renderDot = (position: string) => (
        <div className={`dice-dot ${position}`} />
    );

    // Zarlar için özel sınıf belirleme
    const getDiceClass = (value: number, index: number, isDouble: boolean) => {
        let className = "dice-face";
        
        // Çift zar geldiğinde, görüntüleme mantığını iyileştir
        if (isDouble) {
            // 4 zar varsa (çift zar)
            if (values.length > 2) {
                // İlk 2 zarı aktif göster
                if (index < 2) {
                    className += " active-dice";
                }
                // Kalan zarların durumuna göre göster/gizle
                else if (index < values.length) {
                    className += " inactive-dice";
                } else {
                    className += " hidden-dice";
                }
            } 
            // Sadece 2 zar varsa (çift zar kullanıldığında)
            else if (values.length === 2) {
                className += " active-dice";
            }
            // 1 zar kaldıysa
            else if (values.length === 1) {
                className += " active-dice";
            }
        } else {
            // Normal zarlar için
            className += " active-dice";
        }
        
        return className;
    };

    const renderDiceFace = (value: number, index: number) => {
        const dots = [];
        const randomX = getRandomOffset();
        
        // Çift zar gelip gelmediğini kontrol et
        const isDouble = values.length >= 2 && values[0] === values[1];
        
        switch (value) {
            case 1:
                dots.push(renderDot('center'));
                break;
            case 2:
                dots.push(renderDot('top-right'), renderDot('bottom-left'));
                break;
            case 3:
                dots.push(renderDot('top-right'), renderDot('center'), renderDot('bottom-left'));
                break;
            case 4:
                dots.push(
                    renderDot('top-left'), renderDot('top-right'),
                    renderDot('bottom-left'), renderDot('bottom-right')
                );
                break;
            case 5:
                dots.push(
                    renderDot('top-left'), renderDot('top-right'),
                    renderDot('center'),
                    renderDot('bottom-left'), renderDot('bottom-right')
                );
                break;
            case 6:
                dots.push(
                    renderDot('top-left'), renderDot('top-right'),
                    renderDot('middle-left'), renderDot('middle-right'),
                    renderDot('bottom-left'), renderDot('bottom-right')
                );
                break;
            default:
                break;
        }
        return (
            <div 
                key={index} 
                className={getDiceClass(value, index, isDouble)}
                style={{ '--random-x': `${randomX}px` } as React.CSSProperties}
            >
                {dots}
            </div>
        );
    };

    return (
        <div className={`dice-container ${currentPlayer}`}>
            <div className="dice-area">
                {values.length > 0 && !isRolling ? (
                    <>
                        {values.map((value, index) => renderDiceFace(value, index))}
                        {/* Çift zar durumunda kullanılan/kullanılmayan zar bilgisi */}
                        {values.length >= 2 && values[0] === values[1] && (
                            <div className="dice-info">
                                Kalan: {values.length} zar
                            </div>
                        )}
                    </>
                ) : (
                    <div className="empty-dice-placeholder">
                        {isRollable ? "Zar atmak için 'Zar At' butonuna tıklayın" : "Sıra rakipte..."}
                    </div>
                )}
            </div>
        </div>
    );
}; 