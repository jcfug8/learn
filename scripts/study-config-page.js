import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { StudyConfig } from './study-config.js';

console.log('study-config-page.js: Script loaded');

createApp({
  components: {
    StudyConfig
  },
  template: `
    <div class="home">
      <a href="index.html" class="back-link">← Back to Study Sessions</a>
      <h1>Configure Study Session</h1>
      <div class="study-container">
        <StudyConfig 
          @start-study="startStudy"
        />
      </div>
    </div>
  `,
  methods: {
    startStudy(sessionConfig) {
      console.log('study-config-page.js: startStudy called with config:', sessionConfig);
      
      // Encode session configuration into query params
      const params = new URLSearchParams();
      params.set('displayFormat', sessionConfig.displayFormat || 'hear-type');
      
      const problemSetsJson = JSON.stringify(sessionConfig.problemSets || []);
      console.log('study-config-page.js: problemSets to send to study page:', sessionConfig.problemSets);
      console.log('study-config-page.js: problemSets JSON:', problemSetsJson);
      
      params.set('problemSets', problemSetsJson);
      
      const url = `study.html?${params.toString()}`;
      console.log('study-config-page.js: Navigating to:', url);
      
      // Navigate to study page with encoded config
      window.location.href = url;
    }
  }
}).mount('#app');

