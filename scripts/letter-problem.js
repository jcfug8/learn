// LetterProblem component
import { Recognize } from './recognize.js';
import { Speak } from './speak.js';

export const LetterProblem = {
  components: {
    Recognize,
    Speak
  },
  props: ['problem', 'displayFormat'],
  emits: ['answer-submitted'],
  template: `
    <div>
      <!-- Hear it and Type format -->
      <div v-if="displayFormat === 'hear-type'" class="problem-display">
        <div class="instruction">Listen and type the letter:</div>
        <Speak 
          :text="problem ? problem.answer : ''"
          :autoPlay="true"
        />
        <input
          v-model="userAnswer"
          @keyup.enter="submitAnswer"
          class="answer-input"
          type="text"
          maxlength="1"
          placeholder="Answer"
          ref="answerInput"
          style="text-transform: uppercase;"
        />
        <div style="margin-top: 15px;">
          <button @click="submitAnswer" class="nav-button submit-button" style="max-width: 200px;">
            Submit Answer
          </button>
        </div>
      </div>
      
      <!-- Hear it and Multiple Choice format -->
      <div v-if="displayFormat === 'hear-multiple-choice'" class="problem-display">
        <div class="instruction">Listen and select the letter:</div>
        <Speak 
          :text="problem ? problem.answer : ''"
          :autoPlay="true"
        />
        <div class="multiple-choice-options">
          <button
            v-for="(option, index) in shuffledOptions"
            :key="index"
            @click="selectAnswer(option)"
            :class="['multiple-choice-option', { 
              'correct': selectedAnswer === option && option === problem.answer,
              'incorrect': selectedAnswer === option && option !== problem.answer
            }]"
            :disabled="selectedAnswer !== null"
          >
            {{ option }}
          </button>
        </div>
      </div>
      
      <!-- See it and Say it format -->
      <div v-if="displayFormat === 'see-say'" class="problem-display">
        <div class="instruction">Say the letter you see:</div>
        <div class="large-display">{{ problem.answer }}</div>
        <Recognize
          :focusPhrase="problem.answer"
          :autoStart="true"
          @result="handleRecognitionResult"
          @recognizing="handleRecognizing"
        />
      </div>
    </div>
  `,
  data() {
    return {
      userAnswer: '',
      selectedAnswer: null,
      shuffledOptions: [],
      isRecognizing: false
    };
  },
  watch: {
    problem() {
      // Reset when problem changes
      this.userAnswer = '';
      this.selectedAnswer = null;
      this.shuffleOptions();
      // Focus input if hear-type
      if (this.$refs.answerInput && this.displayFormat === 'hear-type') {
        this.$nextTick(() => {
          this.$refs.answerInput.focus();
        });
      }
    },
    displayFormat() {
      // Reset when format changes
      this.userAnswer = '';
      this.selectedAnswer = null;
      this.shuffleOptions();
    }
  },
  mounted() {
    this.shuffleOptions();
    if (this.$refs.answerInput && this.displayFormat === 'hear-type') {
      this.$nextTick(() => {
        this.$refs.answerInput.focus();
      });
    }
  },
  methods: {
    shuffleOptions() {
      if (this.problem && this.displayFormat === 'hear-multiple-choice') {
        const options = [this.problem.answer, ...this.problem.wrongAnswers];
        // Shuffle array
        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }
        this.shuffledOptions = options;
      }
    },
    submitAnswer() {
      if (this.displayFormat === 'hear-type') {
        const answer = this.userAnswer.trim().toUpperCase();
        if (!answer) {
          return;
        }
        const isCorrect = answer === this.problem.answer.toUpperCase();
        this.$emit('answer-submitted', isCorrect);
      }
    },
    selectAnswer(option) {
      if (this.selectedAnswer !== null) return;
      
      this.selectedAnswer = option;
      const isCorrect = option === this.problem.answer;
      
      setTimeout(() => {
        this.$emit('answer-submitted', isCorrect);
      }, 500);
    },
    handleRecognitionResult(result) {
      // Normalize the result for comparison
      const normalizedResult = result.trim().toUpperCase();
      const normalizedAnswer = this.problem.answer.toUpperCase();
      
      // Check if the result matches the answer
      if (normalizedResult === normalizedAnswer) {
        this.$emit('answer-submitted', true);
      }
    },
    handleRecognizing(isRecognizing) {
      this.isRecognizing = isRecognizing;
    }
  }
};

