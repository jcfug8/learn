// ProblemDisplay component
import { LetterProblem } from './letter-problem.js';
import { NumberProblem } from './number-problem.js';
import { WordProblem } from './word-problem.js';

export const ProblemDisplay = {
  components: {
    LetterProblem,
    NumberProblem,
    WordProblem
  },
  props: ['problem', 'displayFormat'],
  template: `
    <div v-if="problem">
      <!-- Letters -->
      <LetterProblem 
        v-if="problem.type === 'letters'"
        :problem="problem"
        :displayFormat="displayFormat"
        @answer-submitted="handleAnswer"
      />
      
      <!-- Numbers -->
      <NumberProblem 
        v-if="problem.type === 'numbers'"
        :problem="problem"
        :displayFormat="displayFormat"
        @answer-submitted="handleAnswer"
      />
      
      <!-- Words -->
      <WordProblem 
        v-if="problem.type === 'words'"
        :problem="problem"
        :displayFormat="displayFormat"
        @answer-submitted="handleAnswer"
      />
    </div>
  `,
  methods: {
    handleAnswer(isCorrect) {
      this.$emit('answer-submitted', isCorrect);
    }
  }
};

