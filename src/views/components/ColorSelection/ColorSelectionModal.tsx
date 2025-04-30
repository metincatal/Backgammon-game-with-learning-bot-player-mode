import React, { useState } from 'react';
import { PlayerColor } from '../../../models/types/PlayerColor';
import { BotDifficulty } from '../../../models/BotPlayer';

interface ColorSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStartGame: (playerColor: PlayerColor, difficulty: BotDifficulty) => void;
}

export const ColorSelectionModal: React.FC<ColorSelectionModalProps> = ({ 
    isOpen, 
    onClose, 
    onStartGame 
}) => {
    const [selectedColor, setSelectedColor] = useState<PlayerColor>('black');
    const [difficulty, setDifficulty] = useState<BotDifficulty>(BotDifficulty.MEDIUM);

    const handleStartGame = () => {
        onStartGame(selectedColor, difficulty);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Oyun Ayarları</h2>
                
                <div className="color-selection">
                    <h3>Renginizi Seçin</h3>
                    <div className="color-options">
                        <button 
                            className={selectedColor === 'white' ? 'active' : ''}
                            onClick={() => setSelectedColor('white')}
                        >
                            Beyaz
                        </button>
                        <button 
                            className={selectedColor === 'black' ? 'active' : ''}
                            onClick={() => setSelectedColor('black')}
                        >
                            Siyah
                        </button>
                    </div>
                </div>
                
                <div className="difficulty-selection">
                    <h3>Zorluk Seviyesi</h3>
                    <select 
                        value={difficulty} 
                        onChange={(e) => setDifficulty(Number(e.target.value) as unknown as BotDifficulty)}
                    >
                        <option value={BotDifficulty.EASY}>Kolay</option>
                        <option value={BotDifficulty.MEDIUM}>Orta</option>
                        <option value={BotDifficulty.HARD}>Zor</option>
                    </select>
                </div>
                
                <div className="modal-buttons">
                    <button onClick={onClose}>İptal</button>
                    <button onClick={handleStartGame}>Başla</button>
                </div>
            </div>
        </div>
    );
};