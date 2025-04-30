import React from 'react';
import { IPoint } from '../../../models/interfaces/IPoint';
import { PlayerColor } from '../../../models/types/PlayerColor';

interface PointProps {
    point: IPoint;
    isSelected: boolean;
    isValidMove: boolean;
    currentPlayer: PlayerColor;
    onPointClick: (pointId: number) => void;
}

export const Point: React.FC<PointProps> = ({ 
    point, 
    isSelected, 
    isValidMove,
    currentPlayer,
    onPointClick 
}) => {
    const handleClick = () => {
        onPointClick(point.id);
    };

    const canSelect = point.color === currentPlayer && point.checkers > 0;
    
    return (
        <div 
            className={`point 
                ${isSelected ? 'selected' : ''} 
                ${isValidMove ? 'valid-move' : ''} 
                ${canSelect ? 'can-select' : ''}`}
            onClick={handleClick}
        >
            {Array(point.checkers).fill(null).map((_, index) => (
                <div 
                    key={index} 
                    className={`checker ${point.color}`}
                    style={{ zIndex: index + 2 }}
                />
            ))}
        </div>
    );
}; 