import { breakDownNumber } from './utils.js';

export const Speak = {
  props: ['text', 'autoPlay', 'type'],
  emits: ['speaking', 'done'],
  template: `
    <div class="speak-container">
      <button 
        @click="speak" 
        class="speak-button"
        :disabled="isSpeaking"
      >
        {{ isSpeaking ? '🔊 Speaking...' : '🔊 Play' }}
      </button>
    </div>
  `,
  data() {
    return {
      isSpeaking: false,
      utterance: null,
      voices: [],
      selectedVoice: null,
      hasUserInteracted: false,
      audioElement: null
    };
  },
  watch: {
    autoPlay: {
      handler(newValue) {
        if (newValue && this.text) {
          this.$nextTick(() => {
            this.speak();
          });
        }
      },
      immediate: false
    },
    text: {
      handler(newValue) {
        if (newValue && this.autoPlay) {
          this.$nextTick(() => {
            this.speak();
          });
        }
      },
      immediate: false
    }
  },
  mounted() {
    // Load available voices
    this.loadVoices();
    
    // Track user interaction to enable auto-play
    const enableAutoPlay = () => {
      this.hasUserInteracted = true;
      // Try auto-play if it was requested
      if (this.autoPlay && this.text && !this.isSpeaking) {
        this.speak();
      }
    };
    
    // Listen for any user interaction
    document.addEventListener('click', enableAutoPlay, { once: true });
    document.addEventListener('keydown', enableAutoPlay, { once: true });
    document.addEventListener('touchstart', enableAutoPlay, { once: true });
    
    // Try auto-play after a short delay (some browsers allow this)
    if (this.autoPlay && this.text) {
      setTimeout(() => {
        if (!this.hasUserInteracted) {
          this.speak();
        }
      }, 100);
    }
  },
  beforeUnmount() {
    // Stop speaking if component is destroyed
    if (this.isSpeaking && this.utterance) {
      window.speechSynthesis.cancel();
    }
    // Stop audio if playing
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
  },
  methods: {
    loadVoices() {
      // Get voices - may need to wait for them to load
      const loadVoicesList = () => {
        this.voices = window.speechSynthesis.getVoices();
        if (this.voices.length > 0) {
          // Check for saved voice preference
          const savedVoiceName = localStorage.getItem('matchAppVoice');
          if (savedVoiceName) {
            // Find the saved voice
            const savedVoice = this.voices.find(v => v.name === savedVoiceName);
            if (savedVoice) {
              this.selectedVoice = savedVoice;
            } else {
              // Saved voice not found, use best available
              this.selectedVoice = this.selectBestVoice();
            }
          } else {
            // No saved preference, use best available
            this.selectedVoice = this.selectBestVoice();
          }
        }
      };
      
      loadVoicesList();
      
      // Some browsers load voices asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoicesList;
      }
    },
    selectBestVoice() {
      if (this.voices.length === 0) return null;
      
      // Preferred voice names (these are typically higher quality)
      const preferredVoices = [
        'Samantha',           // macOS high-quality female
        'Victoria',           // macOS high-quality female
        'Karen',              // macOS high-quality female
        'Google US English',  // Chrome high-quality
        'Microsoft Zira',     // Windows high-quality female
        'Microsoft Hazel',    // Windows high-quality female
        'Alex',               // macOS high-quality male
        'Daniel',             // macOS high-quality male
      ];
      
      // First, try to find a preferred voice
      for (const preferred of preferredVoices) {
        const voice = this.voices.find(v => 
          v.name.includes(preferred) && v.lang.startsWith('en')
        );
        if (voice) return voice;
      }
      
      // If no preferred voice, look for enhanced/premium voices
      const enhanced = this.voices.find(v => 
        (v.name.toLowerCase().includes('enhanced') || 
         v.name.toLowerCase().includes('premium')) &&
        v.lang.startsWith('en')
      );
      if (enhanced) return enhanced;
      
      // Prefer female voices (often sound more natural for kids)
      const female = this.voices.find(v => 
        (v.name.toLowerCase().includes('female') ||
         v.name.toLowerCase().includes('woman') ||
         v.name.toLowerCase().includes('samantha') ||
         v.name.toLowerCase().includes('victoria') ||
         v.name.toLowerCase().includes('zira') ||
         v.name.toLowerCase().includes('hazel')) &&
        v.lang.startsWith('en')
      );
      if (female) return female;
      
      // Fall back to first English voice
      const english = this.voices.find(v => v.lang.startsWith('en'));
      if (english) return english;
      
      // Last resort: default voice
      return this.voices[0];
    },
    isSingleLetter(text) {
      // Check if text is a single letter (case-sensitive)
      return text && text.length === 1 && /[a-zA-Z]/.test(text);
    },
    getWordAudioPath(text, lowercase = true) {
      // For words, use word-lists directory
      // Sanitize text for filename (same logic as split_audio.py)
      // Keep only alphanumeric, spaces, hyphens, and underscores
      let processed = text;
      if (lowercase) {
        processed = processed.toLowerCase();
      }
      const safeWord = processed
        .split('')
        .map(c => (c.match(/[a-zA-Z0-9\s\-_]/) ? c : ''))
        .join('')
        .trim()
        .replace(/\s+/g, '_'); // Replace spaces with underscores
      return `word-lists/audio/${safeWord}.mp3`;
    },
    getLetterAudioPath(text) {
      // For letters, use letter-lists/audio with prefix
      const isUppercase = text === text.toUpperCase() && text !== text.toLowerCase();
      const prefix = isUppercase ? 'upper' : 'lower';
      const letter = text.toUpperCase(); // Use uppercase for filename
      return `letter-lists/audio/${prefix}_${letter}.mp3`;
    },
    getNumberAudioPath(num) {
      // For numbers, use number-lists/audio
      return `number-lists/audio/${num}.mp3`;
    },
    async checkAudioFileExists(filePath) {
      try {
        const response = await fetch(filePath, { method: 'HEAD' });
        return response.ok;
      } catch (error) {
        return false;
      }
    },
    async playAudioFile(filePath, manageState = true) {
      return new Promise((resolve, reject) => {
        // Stop any existing audio
        if (this.audioElement) {
          this.audioElement.pause();
          this.audioElement = null;
        }
        
        const audio = new Audio(filePath);
        this.audioElement = audio;
        
        audio.onended = () => {
          if (manageState) {
            this.isSpeaking = false;
            this.$emit('speaking', false);
            this.$emit('done');
          }
          if (this.audioElement === audio) {
            this.audioElement = null;
          }
          resolve();
        };
        
        audio.onerror = (error) => {
          console.error('Audio playback error:', error);
          if (manageState) {
            this.isSpeaking = false;
            this.$emit('speaking', false);
          }
          if (this.audioElement === audio) {
            this.audioElement = null;
          }
          reject(error);
        };
        
        audio.play().catch(error => {
          // Handle autoplay restrictions
          if (error.name === 'NotAllowedError') {
            if (manageState) {
              this.isSpeaking = false;
              this.$emit('speaking', false);
            }
            if (this.audioElement === audio) {
              this.audioElement = null;
            }
            reject(error);
          } else {
            console.error('Audio play error:', error);
            if (manageState) {
              this.isSpeaking = false;
              this.$emit('speaking', false);
            }
            if (this.audioElement === audio) {
              this.audioElement = null;
            }
            reject(error);
          }
        });
      });
    },
    async speak() {
      if (!this.text) return;
      
      // Prevent multiple simultaneous calls
      if (this.isSpeaking) {
        return;
      }
      
      // Cancel any ongoing speech or audio first
      window.speechSynthesis.cancel();
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement = null;
      }
      
      // Set speaking state early to prevent concurrent calls
      this.isSpeaking = true;
      this.$emit('speaking', true);
      
      try {
        // Handle numbers specially - break them down and play each component
        if (this.type === 'numbers') {
          const num = typeof this.text === 'string' ? parseInt(this.text, 10) : this.text;
          if (!isNaN(num)) {
            const components = breakDownNumber(num);
            await this.playNumberComponents(components);
            return;
          }
        }
        
        // Check if audio file exists
        let audioPath;
        let audioExists = false;
        
        // Use type prop to determine where to look
        if (this.type === 'letters') {
          // For letters, use letter-lists with prefix
          audioPath = this.getLetterAudioPath(this.text);
          audioExists = await this.checkAudioFileExists(audioPath);
        } else {
          // For words (or if type not specified), use word-lists
          // Try lowercase first, then original case (for words like "I")
          audioPath = this.getWordAudioPath(this.text, true); // lowercase first
          audioExists = await this.checkAudioFileExists(audioPath);
          
          // If lowercase doesn't exist, try original case
          if (!audioExists) {
            audioPath = this.getWordAudioPath(this.text, false);
            audioExists = await this.checkAudioFileExists(audioPath);
          }
        }
        
        if (audioExists) {
          // Play audio file - this will handle isSpeaking state
          try {
            await this.playAudioFile(audioPath);
          } catch (error) {
            // If audio playback fails, fall back to speech synthesis
            console.log('Audio playback failed, falling back to speech synthesis');
            // Reset state before calling synthesis
            this.isSpeaking = false;
            this.$emit('speaking', false);
            this.speakWithSynthesis();
          }
        } else {
          // No audio file found - only now use speech synthesis
          // Reset state before calling synthesis (speakWithSynthesis will set it again)
          this.isSpeaking = false;
          this.$emit('speaking', false);
          this.speakWithSynthesis();
        }
      } catch (error) {
        // Handle any errors during file checking
        console.error('Error checking for audio file:', error);
        this.isSpeaking = false;
        this.$emit('speaking', false);
        // Fall back to speech synthesis
        this.speakWithSynthesis();
      }
    },
    async playNumberComponents(components) {
      // Play each number component sequentially
      for (let i = 0; i < components.length; i++) {
        const component = components[i];
        const audioPath = this.getNumberAudioPath(component);
        const audioExists = await this.checkAudioFileExists(audioPath);
        
        if (audioExists) {
          try {
            // Play audio without managing state (we'll manage it at the end)
            await this.playAudioFile(audioPath, false);
          } catch (error) {
            console.error(`Error playing audio for component ${component}:`, error);
            // If one component fails, fall back to speech synthesis for this component
            await this.speakNumberComponent(component);
          }
        } else {
          console.warn(`Audio file not found for number component: ${component}`);
          // If audio file doesn't exist, fall back to speech synthesis for this component
          await this.speakNumberComponent(component);
        }
      }
      
      // All components played
      this.isSpeaking = false;
      this.$emit('speaking', false);
      this.$emit('done');
    },
    async speakNumberComponent(component) {
      // Ensure voices are loaded
      if (this.voices.length === 0) {
        this.loadVoices();
      }
      
      // Ensure we have a voice selected
      if (!this.selectedVoice) {
        this.selectedVoice = this.selectBestVoice();
      }
      
      // Create utterance for this component
      const utterance = new SpeechSynthesisUtterance(String(component));
      utterance.lang = 'en-US';
      utterance.rate = 0.6;
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      
      return new Promise((resolve) => {
        utterance.onend = resolve;
        utterance.onerror = resolve;
        window.speechSynthesis.speak(utterance);
      });
    },
    speakWithSynthesis() {
      // Only proceed if we're not already speaking (prevent double calls)
      if (this.isSpeaking && this.utterance) {
        return;
      }
      
      // Reload voices if not loaded yet
      if (this.voices.length === 0) {
        this.loadVoices();
      }
      
      // Always check for updated voice preference from localStorage
      const savedVoiceName = localStorage.getItem('matchAppVoice');
      if (savedVoiceName) {
        // Find the saved voice
        const savedVoice = this.voices.find(v => v.name === savedVoiceName);
        if (savedVoice) {
          this.selectedVoice = savedVoice;
        } else {
          // Saved voice not found, use best available
          if (!this.selectedVoice) {
            this.selectedVoice = this.selectBestVoice();
          }
        }
      } else {
        // No saved preference, use best available
        if (!this.selectedVoice) {
          this.selectedVoice = this.selectBestVoice();
        }
      }
      
      this.isSpeaking = true;
      this.$emit('speaking', true);
      
      this.utterance = new SpeechSynthesisUtterance(this.text);
      this.utterance.lang = 'en-US';
      this.utterance.rate = 0.6;
      
      // Use the selected voice if available
      if (this.selectedVoice) {
        this.utterance.voice = this.selectedVoice;
      }
      
      this.utterance.onend = () => {
        this.isSpeaking = false;
        this.$emit('speaking', false);
        this.$emit('done');
      };
      
      this.utterance.onerror = (error) => {
        // Handle "not-allowed" error gracefully (browser autoplay restriction)
        if (error.error === 'not-allowed') {
          // Silently handle - this is expected when auto-playing without user interaction
          this.isSpeaking = false;
          this.$emit('speaking', false);
          this.$emit('done');
          return;
        }
        
        // Log other errors
        console.error('Speech synthesis error:', error);
        this.isSpeaking = false;
        this.$emit('speaking', false);
        this.$emit('done');
      };
      
      try {
        window.speechSynthesis.speak(this.utterance);
      } catch (error) {
        // Handle any synchronous errors
        if (error.message && error.message.includes('not-allowed')) {
          this.isSpeaking = false;
          this.$emit('speaking', false);
          this.$emit('done');
        } else {
          console.error('Speech synthesis error:', error);
          this.isSpeaking = false;
          this.$emit('speaking', false);
          this.$emit('done');
        }
      }
    },
    stop() {
      if (this.isSpeaking) {
        window.speechSynthesis.cancel();
        if (this.audioElement) {
          this.audioElement.pause();
          this.audioElement = null;
        }
        this.isSpeaking = false;
        this.$emit('speaking', false);
      }
    }
  }
};

