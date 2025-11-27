// StudyConfig component
export const StudyConfig = {
  template: `
      <div class="config-panel">
        <h2 style="margin-bottom: 5px; color: #333;">Configure Study Session</h2>
        <div style="margin-bottom: 20px; color: #666; font-size: 0.95rem;">A study session is a group of problem sets. Add different problem sets below.</div>
      
      <div class="config-section">
        <div class="config-option-inline">
          <div class="config-option">
            <label>Display Format</label>
            <select v-model="session.displayFormat">
              <option value="hear-type">Hear it and Type</option>
              <option value="hear-multiple-choice">Hear it and Multiple Choice</option>
              <option value="see-say">See it and Say it</option>
              <option value="both">Both (Hear and See)</option>
            </select>
          </div>
          <div class="config-option">
            <label>Voice</label>
            <select v-model="selectedVoiceName" @change="saveVoicePreference">
              <option value="">Auto (Best Available)</option>
              <option 
                v-for="voice in englishVoices" 
                :key="voice.name"
                :value="voice.name"
              >
                {{ voice.name }}{{ voice.lang ? ' (' + voice.lang + ')' : '' }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div class="button-group" style="margin: 50px 0;">
        <button @click="saveAndStart" class="nav-button" style="background: #42b983;">
          Start Study
        </button>
      </div>
      
      <div class="config-section">
        <h3 style="margin-bottom: 5px; color: #333;">Problem Sets</h3>
        <div style="margin-bottom: 20px; color: #666; font-size: 0.95rem;">Click a type to add a new problem set.</div>
        <div class="operation-grid">
          <button 
            v-for="type in problemTypes" 
            :key="type.value"
            @click="addProblemSet(type.value)"
            class="operation-button"
          >
            {{ type.icon }}
          </button>
        </div>
        <div v-for="(set, index) in session.problemSets" :key="index" class="study-set">
          <div class="study-set-header">
            <h4>Problem Set {{ index + 1 }} - {{ getTypeLabel(set.type) }}</h4>
            <button @click="removeProblemSet(index)" class="remove-set-button">Remove</button>
          </div>
          <div class="config-option-inline">
            <div class="config-option">
              <label>Type</label>
              <select v-model="set.type">
                <option value="letters">Letters</option>
                <option value="numbers">Numbers</option>
                <option value="words">Words</option>
              </select>
            </div>
            <div class="config-option">
              <label>Number of Problems</label>
              <select v-model.number="set.problemCount">
                <option :value="10">10 problems</option>
                <option :value="20">20 problems</option>
                <option :value="50">50 problems</option>
                <option :value="100">100 problems</option>
              </select>
            </div>
          </div>
          
          <!-- Letter selector with Letter Lists -->
          <div v-if="set.type === 'letters'" class="word-list-selector">
            <h5 style="margin: 15px 0 10px 0; color: #666; font-size: 0.9rem;">Select Letters</h5>
            <div class="word-list-cards">
              <div 
                v-for="letterList in letterSets" 
                :key="letterList.name"
                class="word-list-card"
              >
                <div class="word-list-card-header">
                  <div class="word-list-info">
                    <h6 class="word-list-name">{{ letterList.name }}</h6>
                    <span class="word-list-count">
                      {{ getSelectedLetterCount(letterList, set.items) }} / {{ letterList.letters.length }}
                    </span>
                  </div>
                  <div class="word-list-actions">
                    <button 
                      @click="toggleLetterList(letterList, set)"
                      class="toggle-button"
                      :class="{ 'active': isLetterListFullySelected(letterList, set.items) }"
                    >
                      {{ isLetterListFullySelected(letterList, set.items) ? 'All On' : 'All Off' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <!-- Individual letter selector for custom selection -->
            <div style="margin-top: 20px;">
              <h6 style="margin: 10px 0 5px 0; color: #666; font-size: 0.85rem;">Individual Letters</h6>
              <div class="item-grid">
                <label 
                  v-for="letter in allLetters" 
                  :key="letter"
                  class="item-checkbox"
                >
                  <input 
                    type="checkbox" 
                    :value="letter"
                    v-model="set.items"
                  />
                  <span>{{ letter }}</span>
                </label>
              </div>
            </div>
          </div>
          
          <!-- Number selector with min/max ranges -->
          <div v-if="set.type === 'numbers'" class="item-selector">
            <h5 style="margin: 15px 0 10px 0; color: #666; font-size: 0.9rem;">Number Ranges</h5>
            <div v-if="set.items && set.items.length > 0" style="margin-bottom: 15px;">
              <template 
                v-for="(item, index) in set.items" 
                :key="index"
              >
                <div 
                  v-if="typeof item === 'object' && item.min !== undefined && item.max !== undefined"
                  style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 10px; background: #f5f5f5; border-radius: 5px;"
                >
                <label style="display: flex; align-items: center; gap: 5px;">
                  <span style="min-width: 40px;">Min:</span>
                  <input 
                    type="number" 
                    v-model.number="item.min"
                    style="width: 80px; padding: 5px;"
                    min="0"
                    @input="ensureMaxGreaterThanMin(item)"
                  />
                </label>
                <label style="display: flex; align-items: center; gap: 5px;">
                  <span style="min-width: 40px;">Max:</span>
                  <input 
                    type="number" 
                    v-model.number="item.max"
                    style="width: 80px; padding: 5px;"
                    :min="item.min || 0"
                    @input="ensureMaxGreaterThanMin(item)"
                  />
                </label>
                <span :style="{color: item.max >= item.min ? '#666' : '#dc3545', fontSize: '0.9rem'}">
                  ({{ item.max >= item.min ? item.max - item.min + 1 : 0 }} numbers)
                </span>
                <button 
                  @click="removeNumberRange(set, index)"
                  class="small-button"
                  style="margin-left: auto; background: #dc3545;"
                >
                  Remove
                </button>
                </div>
              </template>
            </div>
            <div style="margin-top: 10px;">
              <button @click="addNumberRange(set)" class="small-button" style="background: #42b983;">Add Range</button>
            </div>
          </div>
          
          <!-- Words selector with Word Lists -->
          <div v-if="set.type === 'words'" class="word-list-selector">
            <h5 style="margin: 15px 0 10px 0; color: #666; font-size: 0.9rem;">Select Words</h5>
            <div class="word-list-cards">
              <div 
                v-for="wordList in wordSets" 
                :key="wordList.name"
                class="word-list-card"
              >
                <div class="word-list-card-header">
                  <div class="word-list-info">
                    <h6 class="word-list-name">{{ wordList.name }}</h6>
                    <span class="word-list-count">
                      {{ getSelectedWordCount(wordList, set.items) }} / {{ getTotalWordCount(wordList) }}
                    </span>
                  </div>
                  <div class="word-list-actions">
                    <button 
                      @click="toggleWordList(wordList, set)"
                      class="toggle-button"
                      :class="{ 'active': isWordListFullySelected(wordList, set.items) }"
                    >
                      {{ isWordListFullySelected(wordList, set.items) ? 'All On' : 'All Off' }}
                    </button>
                    <button 
                      @click="openWordListModal(wordList, set)"
                      class="configure-button"
                    >
                      Configure
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Word List Modal -->
          <div v-if="showWordListModal" class="modal-overlay" @click.self="closeWordListModal">
            <div class="modal-content">
              <div class="modal-header">
                <h3>{{ currentModalWordList ? currentModalWordList.name : '' }}</h3>
                <button @click="closeWordListModal" class="modal-close">×</button>
              </div>
              <div class="modal-body">
                <div class="sub-list-accordions">
                  <div 
                    v-for="(subList, index) in (currentModalWordList ? currentModalWordList.subLists : [])"
                    :key="index"
                    class="sub-list-item"
                  >
                    <div 
                      class="sub-list-header"
                      @click="toggleSubListExpanded(index)"
                    >
                      <span class="sub-list-name">{{ subList.name }}</span>
                      <span class="sub-list-count">
                        {{ getSelectedSubListCount(subList, currentModalSet.items) }} / {{ subList.words.length }}
                      </span>
                      <button 
                        @click.stop="toggleSubList(subList, currentModalSet)"
                        class="sub-list-toggle"
                        :class="{ 'active': isSubListFullySelected(subList, currentModalSet.items) }"
                      >
                        {{ isSubListFullySelected(subList, currentModalSet.items) ? 'All On' : 'All Off' }}
                      </button>
                      <span class="expand-icon">{{ expandedSubLists[index] ? '−' : '+' }}</span>
                    </div>
                    <div v-if="expandedSubLists[index]" class="sub-list-words">
                      <label 
                        v-for="word in subList.words"
                        :key="word"
                        class="word-checkbox"
                      >
                        <input 
                          type="checkbox"
                          :value="word"
                          :checked="currentModalSet.items.includes(word)"
                          @change="toggleWord(word, currentModalSet)"
                        />
                        <span>{{ word }}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    // Load voice preference from localStorage
    const savedVoice = localStorage.getItem('matchAppVoice') || '';
    
    // Read query params directly
    const urlParams = new URLSearchParams(window.location.search);
    const problemSetsJson = urlParams.get('problemSets');
    const displayFormat = urlParams.get('displayFormat') || 'hear-type';
    
    let problemSets = [];
    if (problemSetsJson) {
      try {
        problemSets = JSON.parse(problemSetsJson);
        console.log('study-config.js: Parsed problemSets from query params:', JSON.stringify(problemSets, null, 2));
        // Ensure each problem set has problemCount
        problemSets.forEach((set, index) => {
          console.log(`study-config.js: Problem set ${index} after parse:`, JSON.stringify(set, null, 2));
          if (set.problemCount === undefined) {
            set.problemCount = 20;
          }
          // Log number items specifically
          if (set.type === 'numbers' && set.items) {
            console.log(`study-config.js: Number set ${index} items:`, JSON.stringify(set.items, null, 2));
            console.log(`study-config.js: Number set ${index} items type check:`, set.items.map(item => ({
              item,
              isObject: typeof item === 'object',
              hasMin: item && item.min !== undefined,
              hasMax: item && item.max !== undefined
            })));
          }
        });
      } catch (error) {
        console.error('study-config.js: Error parsing problem sets from URL:', error);
      }
    }
    
    return {
      session: {
        displayFormat: displayFormat,
        problemSets: problemSets
      },
      problemTypes: [
        { icon: '🔤', value: 'letters' },
        { icon: '🔢', value: 'numbers' },
        { icon: '📝', value: 'words' }
      ],
      allLetters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
      wordSets: [],
      letterSets: [],
      voices: [],
      englishVoices: [],
      selectedVoiceName: savedVoice,
      showWordListModal: false,
      currentModalWordList: null,
      currentModalSet: null,
      expandedSubLists: {},
      isInitializing: true // Flag to prevent query param updates during initialization
    };
  },
  async mounted() {
    console.log('study-config.js: mounted, session:', this.session);
    console.log('study-config.js: problemSets from query params:', JSON.stringify(this.session.problemSets, null, 2));
    
    // Initialize default items for problem sets that don't have them
    this.session.problemSets.forEach((set, index) => {
      console.log(`study-config.js: Processing problem set ${index}:`, set);
      console.log(`study-config.js: Set type: ${set.type}, items before init:`, set.items);
      
      if (!set.items || (Array.isArray(set.items) && set.items.length === 0)) {
        console.log(`study-config.js: Initializing default items for ${set.type}`);
        if (set.type === 'letters') {
          set.items = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
        } else if (set.type === 'numbers') {
          set.items = [{min: 0, max: 9}];
        } else if (set.type === 'words') {
          set.items = []; // Start with empty, user selects from word lists
        }
      } else {
        console.log(`study-config.js: Items already exist for ${set.type}:`, set.items);
      }
      
      // Clean up number items to ensure only ranges are stored
      if (set.type === 'numbers' && set.items) {
        console.log(`study-config.js: Cleaning number items, before:`, JSON.stringify(set.items));
        const cleaned = this.cleanNumberItems(set.items);
        console.log(`study-config.js: Cleaning number items, after:`, JSON.stringify(cleaned));
        set.items = cleaned;
      }
    });
    
    this.loadVoices();
    await this.loadWordLists();
    await this.loadLetterLists();
    
    // Expand list/sub-list references in items arrays for words and letters problem sets
    await this.expandWordListReferences();
    await this.expandLetterListReferences();
    
    // Set up watchers to update query params when config changes
    this.setupQueryParamWatchers();
    
    // Allow query param updates now that initialization is complete
    this.isInitializing = false;
  },
  methods: {
    setupQueryParamWatchers() {
    // Watch for changes to displayFormat
    this.$watch('session.displayFormat', () => {
      this.updateQueryParams();
    }, { deep: false });
    
    // Watch for changes to problemSets (deep watch to catch nested changes)
    this.$watch('session.problemSets', () => {
      this.updateQueryParams();
    }, { deep: true });
  },
  updateQueryParams() {
    // Don't update query params during initialization
    if (this.isInitializing) {
      return;
    }
    
    const params = new URLSearchParams();
    params.set('displayFormat', this.session.displayFormat || 'hear-type');
    
    // Ensure each problem set has problemCount before stringifying
    const problemSets = (this.session.problemSets || []).map(set => ({
      ...set,
      problemCount: set.problemCount || 20
    }));
    
    params.set('problemSets', JSON.stringify(problemSets));
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
    
    console.log('study-config.js: Updated query params:', newUrl);
  },
    async loadWordLists() {
      try {
        console.log('study-config.js: Loading word lists...');
        // Fetch the word lists index to get list of available word list directories
        const indexResponse = await fetch('word-lists/index.json');
        const index = await indexResponse.json();
        
        // Fetch words.json for each word list
        const wordListPromises = index.wordLists.map(async (wordListDir) => {
          const response = await fetch(`word-lists/${wordListDir}/words.json`);
          const wordListData = await response.json();
          return {
            ...wordListData,
            id: wordListDir
          };
        });
        
        this.wordSets = await Promise.all(wordListPromises);
        console.log('study-config.js: Loaded word sets:', this.wordSets.map(ws => ws.id));
      } catch (error) {
        console.error('study-config.js: Error loading word lists:', error);
        // Fallback to empty array if loading fails
        this.wordSets = [];
      }
    },
    async loadLetterLists() {
      try {
        console.log('study-config.js: Loading letter lists...');
        // Fetch the letter lists index to get list of available letter list directories
        const indexResponse = await fetch('letter-lists/index.json');
        const index = await indexResponse.json();
        
        // Fetch letters.json for each letter list
        const letterListPromises = index.letterLists.map(async (letterListDir) => {
          const response = await fetch(`letter-lists/${letterListDir}/letters.json`);
          const letterListData = await response.json();
          return {
            ...letterListData,
            id: letterListDir
          };
        });
        
        this.letterSets = await Promise.all(letterListPromises);
        console.log('study-config.js: Loaded letter sets:', this.letterSets.map(ls => ls.id));
      } catch (error) {
        console.error('study-config.js: Error loading letter lists:', error);
        // Fallback to empty array if loading fails
        this.letterSets = [];
      }
    },
    async expandWordListReferences() {
      console.log('study-config.js: Expanding word list references...');
      console.log('study-config.js: session.problemSets:', this.session.problemSets);
      console.log('study-config.js: wordSets available:', this.wordSets.length);
      
      for (let set of this.session.problemSets) {
        console.log(`study-config.js: Checking problem set type: ${set.type}, items:`, set.items);
        
        if (set.type === 'words' && set.items && set.items.length > 0) {
          console.log('study-config.js: Processing words problem set, items before:', set.items);
          
          const expandedWords = new Set();
          
          for (const item of set.items) {
            console.log('study-config.js: Processing item:', item);
            
            if (!item || typeof item !== 'string') {
              console.log('study-config.js: Skipping invalid item:', item);
              continue;
            }
            
            const trimmed = item.trim();
            if (!trimmed) {
              console.log('study-config.js: Skipping empty item');
              continue;
            }
            
            // Check if it's a sub-list reference (format: "listId:sublistName")
            if (trimmed.includes(':')) {
              const [wordListId, subListName] = trimmed.split(':');
              console.log(`study-config.js: Found sub-list reference: ${wordListId}:${subListName}`);
              
              if (wordListId && subListName) {
                const wordList = this.wordSets.find(wl => wl.id === wordListId.trim());
                console.log('study-config.js: Found word list:', wordList ? wordList.id : 'NOT FOUND');
                
                if (wordList) {
                  const subList = wordList.subLists.find(sl => sl.name === subListName.trim());
                  console.log('study-config.js: Found sub-list:', subList ? subList.name : 'NOT FOUND');
                  
                  if (subList) {
                    console.log(`study-config.js: Expanding sub-list ${wordListId}:${subListName} with ${subList.words.length} words`);
                    subList.words.forEach(word => expandedWords.add(word));
                  } else {
                    console.warn(`study-config.js: Sub-list not found: ${wordListId}:${subListName}`);
                    console.log('study-config.js: Available sub-lists:', wordList.subLists.map(sl => sl.name));
                  }
                } else {
                  console.warn(`study-config.js: Word list not found: ${wordListId}`);
                  console.log('study-config.js: Available word sets:', this.wordSets.map(ws => ws.id));
                }
              }
            } else {
              // Check if it's a list ID
              console.log(`study-config.js: Checking if "${trimmed}" is a list ID`);
              const wordList = this.wordSets.find(wl => wl.id === trimmed);
              
              if (wordList) {
                console.log(`study-config.js: Found word list "${trimmed}" with ${wordList.subLists.length} sub-lists`);
                // Add all words from all sub-lists in this word list
                wordList.subLists.forEach(subList => {
                  console.log(`study-config.js: Adding ${subList.words.length} words from sub-list ${subList.name}`);
                  subList.words.forEach(word => expandedWords.add(word));
                });
              } else {
                // It's an individual word, add it as-is
                console.log(`study-config.js: Treating "${trimmed}" as individual word`);
                expandedWords.add(trimmed);
              }
            }
          }
          
          const expandedArray = Array.from(expandedWords);
          console.log('study-config.js: Items after expansion:', expandedArray.length, 'words');
          console.log('study-config.js: First 10 words:', expandedArray.slice(0, 10));
          
          set.items = expandedArray;
        } else {
          console.log(`study-config.js: Skipping problem set (type: ${set.type}, items length: ${set.items ? set.items.length : 0})`);
        }
      }
      
      console.log('study-config.js: Finished expanding word list references');
    },
    async expandLetterListReferences() {
      console.log('study-config.js: Expanding letter list references...');
      console.log('study-config.js: session.problemSets:', this.session.problemSets);
      console.log('study-config.js: letterSets available:', this.letterSets.length);
      
      for (let set of this.session.problemSets) {
        console.log(`study-config.js: Checking problem set type: ${set.type}, items:`, set.items);
        
        if (set.type === 'letters' && set.items && set.items.length > 0) {
          console.log('study-config.js: Processing letters problem set, items before:', set.items);
          
          const expandedLetters = new Set();
          
          for (const item of set.items) {
            console.log('study-config.js: Processing item:', item);
            
            if (!item || typeof item !== 'string') {
              console.log('study-config.js: Skipping invalid item:', item);
              continue;
            }
            
            const trimmed = item.trim();
            if (!trimmed) {
              console.log('study-config.js: Skipping empty item');
              continue;
            }
            
            // Check if it's a list ID
            console.log(`study-config.js: Checking if "${trimmed}" is a list ID`);
            const letterList = this.letterSets.find(ll => ll.id === trimmed);
            
            if (letterList) {
              console.log(`study-config.js: Found letter list "${trimmed}" with ${letterList.letters.length} letters`);
              // Add all letters from this letter list
              letterList.letters.forEach(letter => {
                console.log(`study-config.js: Adding letter ${letter}`);
                expandedLetters.add(letter);
              });
            } else {
              // It's an individual letter, add it as-is
              console.log(`study-config.js: Treating "${trimmed}" as individual letter`);
              expandedLetters.add(trimmed);
            }
          }
          
          const expandedArray = Array.from(expandedLetters);
          console.log('study-config.js: Items after expansion:', expandedArray.length, 'letters');
          console.log('study-config.js: First 10 letters:', expandedArray.slice(0, 10));
          
          set.items = expandedArray;
        } else {
          console.log(`study-config.js: Skipping problem set (type: ${set.type}, items length: ${set.items ? set.items.length : 0})`);
        }
      }
      
      console.log('study-config.js: Finished expanding letter list references');
    },
    loadVoices() {
      const loadVoicesList = () => {
        this.voices = window.speechSynthesis.getVoices();
        // Filter to English voices only
        this.englishVoices = this.voices.filter(v => v.lang.startsWith('en'));
        
        // Sort voices by name
        this.englishVoices.sort((a, b) => a.name.localeCompare(b.name));
      };
      
      // Try loading immediately
      loadVoicesList();
      
      // Some browsers load voices asynchronously, so set up the event handler
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoicesList;
      }
      
      // Fallback: try loading again after a short delay if still no voices
      if (this.englishVoices.length === 0) {
        setTimeout(() => {
          loadVoicesList();
        }, 500);
      }
    },
    saveVoicePreference() {
      // Save voice preference to localStorage
      if (this.selectedVoiceName) {
        localStorage.setItem('matchAppVoice', this.selectedVoiceName);
      } else {
        localStorage.removeItem('matchAppVoice');
      }
    },
    getTypeLabel(type) {
      const labels = {
        'letters': 'Letters',
        'numbers': 'Numbers',
        'words': 'Words'
      };
      return labels[type] || type;
    },
    addProblemSet(type) {
      const newSet = {
        type: type,
        problemCount: 20,
        items: []
      };
      
      // Initialize items based on type
      if (type === 'letters') {
        newSet.items = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
      } else if (type === 'numbers') {
        newSet.items = [{min: 0, max: 9}];
      } else if (type === 'words') {
        newSet.items = []; // Start with empty, user selects from word lists
      }
      
      this.session.problemSets.push(newSet);
    },
    removeProblemSet(index) {
      this.session.problemSets.splice(index, 1);
    },
    getSelectedLetterCount(letterList, selectedItems) {
      return letterList.letters.filter(letter => selectedItems.includes(letter)).length;
    },
    isLetterListFullySelected(letterList, selectedItems) {
      return letterList.letters.length > 0 && 
             letterList.letters.every(letter => selectedItems.includes(letter));
    },
    toggleLetterList(letterList, set) {
      // Ensure items array exists
      if (!set.items) {
        set.items = [];
      }
      
      const isFullySelected = this.isLetterListFullySelected(letterList, set.items);
      
      if (isFullySelected) {
        // Remove all letters from this letter list
        set.items = set.items.filter(letter => !letterList.letters.includes(letter));
      } else {
        // Add all letters from this letter list (avoid duplicates)
        letterList.letters.forEach(letter => {
          if (!set.items.includes(letter)) {
            set.items.push(letter);
          }
        });
      }
    },
    selectAllLetters(set) {
      set.items = [...this.allLetters];
    },
    deselectAllLetters(set) {
      set.items = [];
    },
    cleanNumberItems(items) {
      if (!items || !Array.isArray(items)) {
        console.log('cleanNumberItems: items is not an array or is empty');
        return [];
      }
      console.log('cleanNumberItems: input items:', JSON.stringify(items));
      
      // Filter to only range objects, convert individual numbers to ranges
      const cleaned = items.map(item => {
        // Check if it's already a valid range object
        if (item && typeof item === 'object' && item.min !== undefined && item.max !== undefined) {
          console.log('cleanNumberItems: found range object:', item);
          return item;
        } else if (typeof item === 'string' && item.trim()) {
          // Convert individual number string to a range
          const num = parseInt(item.trim());
          if (!isNaN(num)) {
            console.log('cleanNumberItems: converting string to range:', item, '->', {min: num, max: num});
            return {min: num, max: num};
          }
        }
        console.log('cleanNumberItems: skipping invalid item:', item);
        return null;
      }).filter(item => item !== null);
      
      console.log('cleanNumberItems: output:', JSON.stringify(cleaned));
      return cleaned;
    },
    addNumberRange(set) {
      if (!set.items) {
        set.items = [];
      }
      // Filter out any non-range items first
      set.items = this.cleanNumberItems(set.items);
      // Get the last range or use default
      const lastRange = set.items.length > 0
        ? set.items[set.items.length - 1]
        : {min: 0, max: 9};
      set.items.push({min: lastRange.min, max: lastRange.max});
    },
    removeNumberRange(set, index) {
      if (!set.items) {
        return;
      }
      // Filter to only range objects
      const ranges = this.cleanNumberItems(set.items);
      if (ranges.length > index) {
        ranges.splice(index, 1);
        set.items = ranges;
      }
    },
    ensureMaxGreaterThanMin(range) {
      if (range.min !== undefined && range.max !== undefined && range.max < range.min) {
        range.max = range.min;
      }
    },
    selectAllWords(set) {
      // Get all words from all word sets
      const allWords = [];
      this.wordSets.forEach(wordSet => {
        wordSet.subLists.forEach(subList => {
          allWords.push(...subList.words);
        });
      });
      set.items = [...new Set(allWords)]; // Remove duplicates
    },
    deselectAllWords(set) {
      set.items = [];
    },
    getTotalWordCount(wordList) {
      return wordList.subLists.reduce((total, subList) => total + subList.words.length, 0);
    },
    getSelectedWordCount(wordList, selectedItems) {
      const allWords = [];
      wordList.subLists.forEach(subList => {
        allWords.push(...subList.words);
      });
      return allWords.filter(word => selectedItems.includes(word)).length;
    },
    isWordListFullySelected(wordList, selectedItems) {
      const total = this.getTotalWordCount(wordList);
      const selected = this.getSelectedWordCount(wordList, selectedItems);
      return total > 0 && selected === total;
    },
    toggleWordList(wordList, set) {
      // Ensure items array exists
      if (!set.items) {
        set.items = [];
      }
      
      const allWords = [];
      wordList.subLists.forEach(subList => {
        allWords.push(...subList.words);
      });
      
      const isFullySelected = this.isWordListFullySelected(wordList, set.items);
      
      if (isFullySelected) {
        // Remove all words from this word list
        set.items = set.items.filter(word => !allWords.includes(word));
      } else {
        // Add all words from this word list (avoid duplicates)
        allWords.forEach(word => {
          if (!set.items.includes(word)) {
            set.items.push(word);
          }
        });
      }
    },
    openWordListModal(wordList, set) {
      this.currentModalWordList = wordList;
      this.currentModalSet = set;
      this.showWordListModal = true;
      // Initialize expanded state for all sub-lists
      this.expandedSubLists = {};
      wordList.subLists.forEach((_, index) => {
        this.expandedSubLists[index] = false;
      });
    },
    closeWordListModal() {
      this.showWordListModal = false;
      this.currentModalWordList = null;
      this.currentModalSet = null;
      this.expandedSubLists = {};
    },
    toggleSubListExpanded(index) {
      this.expandedSubLists[index] = !this.expandedSubLists[index];
    },
    getSelectedSubListCount(subList, selectedItems) {
      return subList.words.filter(word => selectedItems.includes(word)).length;
    },
    isSubListFullySelected(subList, selectedItems) {
      return subList.words.length > 0 && 
             subList.words.every(word => selectedItems.includes(word));
    },
    toggleSubList(subList, set) {
      // Ensure items array exists
      if (!set.items) {
        set.items = [];
      }
      
      const isFullySelected = this.isSubListFullySelected(subList, set.items);
      
      if (isFullySelected) {
        // Remove all words from this sub-list
        set.items = set.items.filter(word => !subList.words.includes(word));
      } else {
        // Add all words from this sub-list (avoid duplicates)
        subList.words.forEach(word => {
          if (!set.items.includes(word)) {
            set.items.push(word);
          }
        });
      }
    },
    toggleWord(word, set) {
      // Ensure items array exists
      if (!set.items) {
        set.items = [];
      }
      
      const index = set.items.indexOf(word);
      if (index > -1) {
        set.items.splice(index, 1);
      } else {
        set.items.push(word);
      }
    },
    saveAndStart() {
      if (this.session.problemSets.length === 0) {
        alert('Please add at least one problem set!');
        return;
      }
      
      // Validate that each problem set has at least one item selected
      for (let set of this.session.problemSets) {
        if (!set.items || set.items.length === 0) {
          alert(`Please select at least one item for ${this.getTypeLabel(set.type)} problem set!`);
          return;
        }
      }
      
      this.$emit('start-study', { ...this.session });
    }
  }
};

