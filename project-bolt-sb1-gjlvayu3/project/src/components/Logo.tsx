import React from 'react';
import { Lightbulb } from 'lucide-react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'medium', color = '#333', className = '' }) => {
  // Determine font size based on size prop
  const fontSize = {
    small: '1.5rem',
    medium: '2.5rem',
    large: '3.5rem'
  }[size];
  
  // Determine light bulb size based on size prop
  const bulbSize = {
    small: 10,
    medium: 16,
    large: 22
  }[size];
  
  return (
    <div className={`logo-container ${className}`} style={{ display: 'inline-block', position: 'relative', textAlign: 'center' }}>
      <h1 
        style={{ 
          fontFamily: 'Montserrat, sans-serif',
          fontSize,
          fontWeight: 800,
          color,
          margin: 0,
          position: 'relative'
        }}
      >
        {/* First part of the logo */}
        <span style={{ position: 'relative', marginRight: '0.1em' }}>
          {/* The lowercase i without the dot */}
          <span style={{ 
            position: 'relative',
            display: 'inline-block',
            fontFamily: 'Montserrat, sans-serif',
            fontStyle: 'normal',
            textTransform: 'none'
          }}>
            i
          </span>
          
          {/* Hide the original dot with a white overlay */}
          <span style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '0.4em',
            backgroundColor: 'white',
            zIndex: 1
          }}></span>
          
          {/* Light bulb positioned where the dot would be */}
          <span style={{ 
            position: 'absolute',
            top: '0px',
            left: '48%',
            transform: 'translateX(-50%) translateY(-40%)',
            color: '#FFD700', // Gold color for the bulb
            filter: 'drop-shadow(0 0 3px rgba(255, 215, 0, 0.7))',
            animation: 'glow 2s infinite alternate',
            zIndex: 2
          }}>
            <Lightbulb size={bulbSize} fill="#FFD700" strokeWidth={1.5} />
          </span>
        </span>
        
        {/* Rest of the logo */}
        <span>deArena</span>
      </h1>
    </div>
  );
};

export default Logo;