/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioService {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Plays a specific built-in notification sound
   */
  public playSound(soundId: string) {
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      
      switch (soundId) {
        case 'cosmic-chime': {
          const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.04);
            
            gain.gain.setValueAtTime(0, now + idx * 0.04);
            gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.04 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.6);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(now + idx * 0.04);
            osc.stop(now + idx * 0.04 + 0.65);
          });
          break;
        }
        case 'digital-bubble': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(650, now);
          osc.frequency.exponentialRampToValueAtTime(1400, now + 0.1);
          
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }
        case 'gentle-woodblock': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(750, now);
          osc.frequency.exponentialRampToValueAtTime(250, now + 0.08);
          
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        }
        case 'retro-pip': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'square';
          osc.frequency.setValueAtTime(880, now); // A5
          osc.frequency.setValueAtTime(1320, now + 0.05); // E6
          
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.setValueAtTime(0.06, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }
        case 'modern-synth': {
          const freqs = [329.63, 392.00, 523.25]; // E4, G4, C5
          freqs.forEach(freq => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(500, now);
            filter.frequency.exponentialRampToValueAtTime(180, now + 0.25);
            
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(now);
            osc.stop(now + 0.4);
          });
          break;
        }
      }
    } catch (e) {
      console.warn('AudioContext failed to play sound:', e);
    }
  }

  /**
   * Plays the current user sound choice if audio cues are enabled globally
   */
  public playCurrentMessageSound() {
    const enabled = localStorage.getItem('sabicrest_msg_sound_enabled') !== 'false';
    if (!enabled) return;
    
    const soundId = localStorage.getItem('sabicrest_msg_sound_id') || 'cosmic-chime';
    this.playSound(soundId);
  }
}

export const audio = new AudioService();
