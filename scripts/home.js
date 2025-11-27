import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

console.log('home.js: Script loaded');

createApp({
  template: `
    <div class="home">
      <h1>Match</h1>
      <div class="stories-grid">
        <a 
          v-for="session in studySessions" 
          :key="session.title" 
          :href="getSessionUrl(session)"
          class="story-card"
        >
          <div class="session-icon">{{ session.icon }}</div>
          <h2>{{ session.title }}</h2>
          <p class="session-description">{{ session.description }}</p>
        </a>
      </div>
    </div>
  `,
  data() {
    return {
      studySessions: [
        {
          title: 'Custom Study Session',
          description: 'Create your own custom study session',
          icon: '⚙️',
          displayFormat: 'hear-multiple-choice',
          problemSets: []
        },
        {
          title: 'Letters',
          description: 'Practice identifying letters',
          icon: '🔤',
          displayFormat: 'hear-multiple-choice',
          problemSets: [{
            type: 'letters',
            problemCount: 20,
            items: ['uppercase', 'lowercase'] // Reference to letter lists
          }]
        },
        {
          title: 'Numbers',
          description: 'Practice identifying numbers',
          icon: '🔢',
          displayFormat: 'hear-multiple-choice',
          problemSets: [{
            type: 'numbers',
            problemCount: 20,
            items: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
          }]
        },
        {
          title: 'Fry\'s First 100 Words',
          description: 'Practice identifying words from Fry\'s First 100 Words',
          icon: '📝',
          displayFormat: 'hear-multiple-choice',
          problemSets: [{
            type: 'words',
            problemCount: 20,
            items: ['frys_first_100_words'] // Reference to the word list
          }]
        }
      ]
    };
  },
  methods: {
    getSessionUrl(session) {
      console.log('home.js: getSessionUrl called for session:', session.title);
      console.log('home.js: session.problemSets:', session.problemSets);
      
      const params = new URLSearchParams();
      params.set('displayFormat', session.displayFormat || 'hear-multiple-choice');
      // Ensure each problem set has problemCount before stringifying
      const problemSets = (session.problemSets || []).map(set => ({
        ...set,
        problemCount: set.problemCount || 20
      }));
      
      console.log('home.js: problemSets to stringify:', problemSets);
      const problemSetsJson = JSON.stringify(problemSets);
      console.log('home.js: problemSets JSON:', problemSetsJson);
      
      params.set('problemSets', problemSetsJson);
      
      const url = `study-config.html?${params.toString()}`;
      console.log('home.js: Generated URL:', url);
      
      return url;
    }
  },
  mounted() {
    console.log('home.js: Component mounted');
    console.log('home.js: studySessions:', this.studySessions);
  }
}).mount('#app');

