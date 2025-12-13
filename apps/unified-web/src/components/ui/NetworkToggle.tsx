"use client";
import { celo } from '../../chains/celo';
import { pylon } from '../../chains/pylon';

type NetworkToggleProps = {
  value: 'celo' | 'pylon';
  onChange?: (value: 'celo' | 'pylon') => void;
};

export default function NetworkToggle({ value, onChange }: NetworkToggleProps) {
  const isCelo = value === 'celo';
  const isPylon = value === 'pylon';

  return (
    <div
      style={{
        width: 268,
        height: 42,
        padding: 2,
        borderRadius: 4,
        backgroundColor: '#0B1B470D',
        display: 'flex',
      }}
    >
      <button
        onClick={() => onChange?.('pylon')}
        style={{
          flex: 1,
          border: 'none',
          borderRadius: 4,
          padding: 0,
          fontFamily: '"Work Sans", sans-serif',
          fontWeight: 500,
          fontStyle: 'normal',
          fontSize: 14,
          lineHeight: '125%',
          letterSpacing: '-0.05em',
          textAlign: 'center',
          color: isPylon ? '#0B1B47' : '#0B1B47B8',
          backgroundColor: isPylon ? '#FFFFFF' : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        Human Appchain
      </button>
      <button
        onClick={() => onChange?.('celo')}
        style={{
          flex: 1,
          border: 'none',
          borderRadius: 4,
          padding: 0,
          fontFamily: '"Work Sans", sans-serif',
          fontWeight: 500,
          fontStyle: 'normal',
          fontSize: 14,
          lineHeight: '125%',
          letterSpacing: '-0.05em',
          textAlign: 'center',
          color: isCelo ? '#0B1B47' : '#0B1B47B8',
          backgroundColor: isCelo ? '#FFFFFF' : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        Celo Network
      </button>
    </div>
  );
}




