export const Recognize = {
  props: ['focusPhrase', 'autoStart'],
  emits: ['result', 'recognizing'],
  template: `
    <div class="recognize-container">
      <button 
        v-if="!autoStart"
        @click="toggleRecognition" 
        :class="['recognize-button', { 'active': isRecognizing }]"
        :disabled="!isSupported"
      >
        {{ isRecognizing ? 'Stop Recognition' : 'Start Recognition' }}
      </button>
      <div v-if="!isSupported" class="error-message">
        Speech recognition is not supported in your browser.
      </div>
      <div v-if="isRecognizing && autoStart" class="recognizing-indicator">
        Listening...
      </div>
    </div>
  `,
  data() {
    return {
      recognition: null,
      isRecognizing: false,
      isSupported: false,
    };
  },
  watch: {
    focusPhrase: {
      handler(newPhrase) {
        if (this.recognition && newPhrase) {
          this.updatePhrases(newPhrase);
        }
      },
      immediate: false
    },
    autoStart: {
      handler(newValue) {
        if (newValue && this.isSupported && !this.isRecognizing) {
          this.startRecognition();
        } else if (!newValue && this.isRecognizing) {
          this.stopRecognition();
        }
      }
    }
  },
  mounted() {
    // Check if SpeechRecognition is available
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.isSupported = true;
      this.initializeRecognition();
      
      // Auto-start if autoStart prop is true
      if (this.autoStart) {
        this.$nextTick(() => {
          this.startRecognition();
        });
      }
    }
  },
  methods: {
    buildPhrases(focusPhrase) {
      if (!focusPhrase) return [];
      
      // Handle both string and array inputs
      const phrases = typeof focusPhrase === 'string' ? [focusPhrase] : focusPhrase;
      if (phrases.length === 0) return [];
      
      // For single letters, numbers, or words, create variations
      const result = [];
      phrases.forEach(phrase => {
        const normalized = phrase.toLowerCase().trim();
        result.push({
          phrase: normalized,
          boost: 10.0
        });
        // Also add uppercase version for letters
        if (normalized.length === 1 && /[a-z]/.test(normalized)) {
          result.push({
            phrase: normalized.toUpperCase(),
            boost: 10.0
          });
        }
      });
      
      return result;
    },
    updatePhrases(focusPhrase) {
      if (!this.recognition || !focusPhrase) return;
      
      // Only update phrases if recognition is not currently active
      if (this.isRecognizing) {
        return;
      }
      
      const phrases = this.buildPhrases(focusPhrase);
      
      if (phrases.length > 0) {
        try {
          if ('phrases' in this.recognition) {
            this.recognition.phrases = phrases;
          }
        } catch (e) {
          console.log('Phrases not supported or could not be updated:', e);
        }
      }
    },
    initializeRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'en-US';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      
      this.recognition.onend = () => {
        // Auto-restart if we're still supposed to be recognizing
        if (this.isRecognizing) {
          try {
            if (this.focusPhrase) {
              const wasRecognizing = this.isRecognizing;
              this.isRecognizing = false;
              this.updatePhrases(this.focusPhrase);
              this.isRecognizing = wasRecognizing;
            }
            this.recognition.start();
          } catch (e) {
            console.log('Recognition restarting...');
          }
        }
      };
      
      this.recognition.onerror = (event) => {
        console.error('Recognition error:', event.error);
        if (event.error === 'no-speech' || event.error === 'aborted') {
          // Try to restart on certain errors
          if (this.isRecognizing) {
            setTimeout(() => {
              try {
                this.recognition.start();
              } catch (e) {
                console.log('Recognition restart after error...');
              }
            }, 100);
          }
        }
      };
      
      this.recognition.onresult = (event) => {
        // Handle recognition results - get the most recent final result
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.trim();
          if (event.results[i].isFinal) {
            finalTranscript = transcript;
          } else {
            interimTranscript = transcript;
          }
        }
        
        // Emit the result (prefer final, fall back to interim)
        const result = finalTranscript || interimTranscript;
        if (result) {
          this.$emit('result', result);
        }
      };
      
      // Update phrases if focusPhrase is already set
      if (this.focusPhrase) {
        this.updatePhrases(this.focusPhrase);
      }
    },
    toggleRecognition() {
      if (!this.isSupported || !this.recognition) return;
      
      if (this.isRecognizing) {
        this.stopRecognition();
      } else {
        this.startRecognition();
      }
    },
    startRecognition() {
      if (!this.recognition) return;
      
      // Update phrases before starting recognition
      if (this.focusPhrase) {
        this.updatePhrases(this.focusPhrase);
      }
      
      this.$emit('recognizing', true);
      
      try {
        this.recognition.start();
        this.isRecognizing = true;
      } catch (e) {
        console.error('Error starting recognition:', e);
      }
    },
    stopRecognition() {
      if (!this.recognition) return;
      
      this.isRecognizing = false;
      this.$emit('recognizing', false);
      try {
        this.recognition.stop();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
    }
  },
  beforeUnmount() {
    // Clean up recognition when component is destroyed
    if (this.recognition && this.isRecognizing) {
      this.stopRecognition();
    }
  }
};

