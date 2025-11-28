// {
//   problemCount: number,      // Required: 10, 20, 50, 100
//   displayFormat: string,     // Required: "hear-type", "hear-multiple-choice", "see-say", "both"
//   problemSets: [{
//     type: string,            // Required: "letters", "numbers", or "words"
//     problemCount: number,    // Required: number of problems to generate
//     items: string[]         // Required: array of items (letters, numbers, or words) to use
//   }]
// }

// {
//   answer: string,            // The correct answer (letter, number, or word)
//   wrongAnswers: string[],    // Array of wrong answers (only for multiple-choice format)
//   displayFormat: string,     // 'hear-type', 'hear-multiple-choice', 'see-say', or 'both'
//   type: string,              // 'letters', 'numbers', or 'words'
//   problemSet: object         // Reference to the problem set configuration that generated this problem
// }

import { getHomophones, isHomophone } from './homophone.js';

const MAX_PROBLEM_COUNT = 200;

/**
 * Gets the display format for a problem at the given index
 * @param {number} index - The index of the problem (0-based)
 * @param {Object} studySet - The study set configuration
 * @param {string} currentDisplayFormat - The current display format (first format when "both")
 * @returns {string} - The display format for this problem
 */
function getDisplayFormat(index, studySet, currentDisplayFormat) {
    if (studySet.displayFormat !== "both") {
        return studySet.displayFormat;
    }
    
    // Start with one of the first format, then alternate in groups of 2
    if (index === 0) {
        return currentDisplayFormat;
    }
    
    // After the first one, alternate in groups of 2
    const adjustedCounter = index;
    if (adjustedCounter % 4 < 2) {
        return currentDisplayFormat;
    } else {
        // Alternate between hear-type and see-say when "both" is selected
        return currentDisplayFormat === "hear-type" ? "see-say" : "hear-type";
    }
}

/**
 * This function generates wrong answers for a given answer
 * @param {string} answer - The correct answer
 * @param {string[]} allItems - All available items of the same type
 * @param {string} type - The type of problem ('letters', 'numbers', 'words')
 * @returns {Array} - The wrong answers
 */
function generateWrongAnswers(answer, allItems, type = 'words') {
    const wrongAnswers = [];
    
    // For words type, exclude homophones from wrong answers
    let availableItems = allItems.filter(item => item !== answer);
    
    if (type === 'words') {
        // Filter out homophones of the answer
        availableItems = availableItems.filter(item => {
            // Check if item is a homophone of the answer
            return !isHomophone(answer.toLowerCase(), item.toLowerCase());
        });
    }
    
    // Shuffle available items
    const shuffled = [...availableItems].sort(() => Math.random() - 0.5);
    
    // Take up to 3 wrong answers
    for (let i = 0; i < Math.min(3, shuffled.length); i++) {
        wrongAnswers.push(shuffled[i]);
    }
    
    // If we don't have enough, repeat some
    while (wrongAnswers.length < 3 && availableItems.length > 0) {
        const randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];
        if (!wrongAnswers.includes(randomItem)) {
            wrongAnswers.push(randomItem);
        }
    }
    
    return wrongAnswers;
}

/**
 * This function generates problems for a given problem set
 * @param {Object} problemSet - The problem set to generate problems for
 * @param {Array} wordSets - Array of word sets for normalizing word items (optional)
 * @returns {Promise<Array>} - The generated problems
 */
async function generateProblems(problemSet, wordSets = null, letterSets = null) {
    const problems = [];
    let items = problemSet.items || [];
    
    // For letters type, normalize items (expand list references)
    if (problemSet.type === 'letters' && items.length > 0) {
        items = await normalizeLetterItems(items, letterSets);
    }
    // For words type, normalize items (expand list/sub-list references)
    else if (problemSet.type === 'words' && items.length > 0) {
        items = await normalizeWordItems(items, wordSets);
    }
    // For numbers type, normalize items (expand ranges to actual numbers)
    else if (problemSet.type === 'numbers' && items.length > 0) {
        items = await normalizeNumberItems(items);
    }
    
    if (items.length === 0) {
        return problems;
    }
    
    // Remove duplicates from items (case-insensitive for words)
    const uniqueItems = [];
    const seenAnswers = new Set();
    
    for (const item of items) {
        const key = problemSet.type === 'words' ? item.toLowerCase() : item;
        if (!seenAnswers.has(key)) {
            seenAnswers.add(key);
            uniqueItems.push(item);
        }
    }
    
    // Limit problem count to available unique items or max
    const count = Math.min(problemSet.problemCount || 20, uniqueItems.length, MAX_PROBLEM_COUNT);
    
    // Shuffle unique items to randomize selection
    const shuffledItems = [...uniqueItems].sort(() => Math.random() - 0.5);
    
    // Generate problems from shuffled unique items
    const usedAnswers = new Set();
    for (let i = 0; i < count && i < shuffledItems.length; i++) {
        const answer = shuffledItems[i];
        const answerKey = problemSet.type === 'words' ? answer.toLowerCase() : answer;
        
        // Skip if we've already used this answer (shouldn't happen, but safety check)
        if (usedAnswers.has(answerKey)) {
            continue;
        }
        usedAnswers.add(answerKey);
        
        const problem = {
            answer: answer,
            wrongAnswers: generateWrongAnswers(answer, uniqueItems, problemSet.type),
            type: problemSet.type,
            problemSet: problemSet
        };
        
        problems.push(problem);
    }
    
    // Shuffle problems to randomize order
    problems.sort(() => Math.random() - 0.5);
    
    return problems;
}

/**
 * This function generates the problems for a given study set
 * @param {Object} studySet - The study set to generate problems for
 * @param {Array} wordSets - Array of word sets for normalizing word items (optional)
 * @returns {Promise<Array>} - The generated problems
 */
export async function generateStudySetProblems(studySet, wordSets = null, letterSets = null) {
    let problems = [];
    let currentDisplayFormat = studySet.displayFormat === "both" ? 'hear-type' : studySet.displayFormat;
    let problemIndex = 0;
    
    // Load word sets once if needed (for words problem sets)
    const needsWordSets = studySet.problemSets.some(ps => ps.type === 'words' && ps.items && ps.items.length > 0);
    if (needsWordSets && !wordSets) {
        try {
            const indexResponse = await fetch('word-lists/index.json');
            const index = await indexResponse.json();
            
            const wordListPromises = index.wordLists.map(async (wordListDir) => {
                const response = await fetch(`word-lists/${wordListDir}/words.json`);
                const wordListData = await response.json();
                return {
                    ...wordListData,
                    id: wordListDir
                };
            });
            
            wordSets = await Promise.all(wordListPromises);
        } catch (error) {
            console.error('Error loading word sets for problem generation:', error);
            wordSets = [];
        }
    }
    
    // Load letter sets once if needed (for letters problem sets)
    const needsLetterSets = studySet.problemSets.some(ps => ps.type === 'letters' && ps.items && ps.items.length > 0);
    if (needsLetterSets && !letterSets) {
        try {
            const indexResponse = await fetch('letter-lists/index.json');
            const index = await indexResponse.json();
            
            const letterListPromises = index.letterLists.map(async (letterListDir) => {
                const response = await fetch(`letter-lists/${letterListDir}/letters.json`);
                const letterListData = await response.json();
                return {
                    ...letterListData,
                    id: letterListDir
                };
            });
            
            letterSets = await Promise.all(letterListPromises);
        } catch (error) {
            console.error('Error loading letter sets for problem generation:', error);
            letterSets = [];
        }
    }
    
    for (let problemSet of studySet.problemSets) {
        let problemSetProblems = await generateProblems(problemSet, wordSets, letterSets);
        problemSetProblems = problemSetProblems.map(problem => {
            problem.displayFormat = getDisplayFormat(problemIndex, studySet, currentDisplayFormat);
            problemIndex++;
            return problem;
        });
        problems.push(...problemSetProblems);
    }
    
    return problems;
}

/**
 * Normalizes letter items array, expanding list references to actual letters.
 * Items can be:
 * - List IDs (e.g., "uppercase", "lowercase") - expands to all letters in that list
 * - Individual letters (e.g., "A", "b") - kept as-is
 * 
 * @param {Array<string>} items - Array of items that may contain list references or letters
 * @param {Array} letterSets - Array of letter sets loaded from files (optional, will be loaded if not provided)
 * @returns {Promise<Array<string>>} - Normalized array of letters (all references expanded)
 */
export async function normalizeLetterItems(items, letterSets = null) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        return [];
    }
    
    const letters = new Set();
    
    // Load letter sets if not provided
    if (!letterSets) {
        try {
            const indexResponse = await fetch('letter-lists/index.json');
            const index = await indexResponse.json();
            
            const letterListPromises = index.letterLists.map(async (letterListDir) => {
                const response = await fetch(`letter-lists/${letterListDir}/letters.json`);
                const letterListData = await response.json();
                return {
                    ...letterListData,
                    id: letterListDir
                };
            });
            
            letterSets = await Promise.all(letterListPromises);
        } catch (error) {
            console.error('Error loading letter lists for normalization:', error);
            letterSets = [];
        }
    }
    
    // Helper function to find a letter list by ID
    const findLetterList = (id) => letterSets.find(ll => ll.id === id);
    
    // Process each item
    for (const item of items) {
        if (!item || typeof item !== 'string') continue;
        
        const trimmed = item.trim();
        if (!trimmed) continue;
        
        // Check if it's a list ID
        const letterList = findLetterList(trimmed);
        if (letterList) {
            // Add all letters from this letter list
            letterList.letters.forEach(letter => letters.add(letter));
        } else {
            // It's an individual letter, add it as-is
            letters.add(trimmed);
        }
    }
    
    return Array.from(letters);
}

/**
 * Normalizes word items array, expanding list and sub-list references to actual words.
 * Items can be:
 * - List IDs (e.g., "frys_first_100_words") - expands to all words in that list
 * - Sub-list references (e.g., "frys_first_100_words:List1A") - expands to words in that sub-list
 * - Individual words (e.g., "the", "of") - kept as-is
 * 
 * @param {Array<string>} items - Array of items that may contain list/sub-list references or words
 * @param {Array} wordSets - Array of word sets loaded from files (optional, will be loaded if not provided)
 * @returns {Promise<Array<string>>} - Normalized array of words (all references expanded)
 */
export async function normalizeWordItems(items, wordSets = null) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        console.log('normalizeWordItems: items is empty or invalid');
        return [];
    }
    
    console.log('normalizeWordItems: processing items:', items);
    const words = new Set();
    
    // Load word sets if not provided
    if (!wordSets) {
        try {
            console.log('normalizeWordItems: loading word sets...');
            const indexResponse = await fetch('word-lists/index.json');
            const index = await indexResponse.json();
            
            const wordListPromises = index.wordLists.map(async (wordListDir) => {
                const response = await fetch(`word-lists/${wordListDir}/words.json`);
                const wordListData = await response.json();
                return {
                    ...wordListData,
                    id: wordListDir
                };
            });
            
            wordSets = await Promise.all(wordListPromises);
            console.log('normalizeWordItems: loaded word sets:', wordSets.map(ws => ws.id));
        } catch (error) {
            console.error('Error loading word lists for normalization:', error);
            wordSets = [];
        }
    } else {
        console.log('normalizeWordItems: using provided word sets:', wordSets.map(ws => ws.id));
    }
    
    // Helper function to find a word list by ID
    const findWordList = (id) => wordSets.find(wl => wl.id === id);
    
    // Helper function to find a sub-list by word list ID and sub-list name
    const findSubList = (wordListId, subListName) => {
        const wordList = findWordList(wordListId);
        if (!wordList) return null;
        return wordList.subLists.find(sl => sl.name === subListName);
    };
    
    // Process each item
    for (const item of items) {
        if (!item || typeof item !== 'string') {
            console.log('normalizeWordItems: skipping invalid item:', item);
            continue;
        }
        
        const trimmed = item.trim();
        if (!trimmed) {
            console.log('normalizeWordItems: skipping empty item');
            continue;
        }
        
        // Check if it's a sub-list reference (format: "listId:sublistName")
        if (trimmed.includes(':')) {
            const [wordListId, subListName] = trimmed.split(':');
            if (wordListId && subListName) {
                const subList = findSubList(wordListId.trim(), subListName.trim());
                if (subList) {
                    console.log(`normalizeWordItems: found sub-list ${wordListId}:${subListName} with ${subList.words.length} words`);
                    // Add all words from this sub-list
                    subList.words.forEach(word => words.add(word));
                } else {
                    console.warn(`normalizeWordItems: sub-list not found: ${wordListId}:${subListName}`);
                }
            }
        } else {
            // Check if it's a list ID
            const wordList = findWordList(trimmed);
            if (wordList) {
                console.log(`normalizeWordItems: found word list ${trimmed} with ${wordList.subLists.length} sub-lists`);
                // Add all words from all sub-lists in this word list
                wordList.subLists.forEach(subList => {
                    subList.words.forEach(word => words.add(word));
                });
            } else {
                // It's an individual word, add it as-is
                console.log(`normalizeWordItems: treating as individual word: ${trimmed}`);
                words.add(trimmed);
            }
        }
    }
    
    const result = Array.from(words);
    console.log(`normalizeWordItems: returning ${result.length} words`);
    return result;
}

/**
 * Normalizes word items from query parameters, supporting:
 * - Individual words: words=word1,word2,word3
 * - Word lists: wordLists=frys_first_100_words
 * - Sub-lists: wordSubLists=frys_first_100_words:List1A,frys_first_100_words:List1B
 * - Existing items array in problemSets (backward compatible)
 * 
 * @param {URLSearchParams} urlParams - The URL search parameters
 * @param {Array} wordSets - Array of word sets loaded from files (optional, will be loaded if not provided)
 * @returns {Promise<Array<string>>} - Normalized array of words
 */
export async function normalizeWordItemsFromQueryParams(urlParams, wordSets = null) {
    const words = new Set();
    
    // Load word sets if not provided
    if (!wordSets) {
        try {
            const indexResponse = await fetch('word-lists/index.json');
            const index = await indexResponse.json();
            
            const wordListPromises = index.wordLists.map(async (wordListDir) => {
                const response = await fetch(`word-lists/${wordListDir}/words.json`);
                const wordListData = await response.json();
                return {
                    ...wordListData,
                    id: wordListDir
                };
            });
            
            wordSets = await Promise.all(wordListPromises);
        } catch (error) {
            console.error('Error loading word lists for normalization:', error);
            wordSets = [];
        }
    }
    
    // Helper function to find a word list by ID
    const findWordList = (id) => wordSets.find(wl => wl.id === id);
    
    // Helper function to find a sub-list by word list ID and sub-list name
    const findSubList = (wordListId, subListName) => {
        const wordList = findWordList(wordListId);
        if (!wordList) return null;
        return wordList.subLists.find(sl => sl.name === subListName);
    };
    
    // Handle individual words: words=word1,word2,word3
    const wordsParam = urlParams.get('words');
    if (wordsParam) {
        wordsParam.split(',').forEach(word => {
            const trimmed = word.trim();
            if (trimmed) words.add(trimmed);
        });
    }
    
    // Handle word lists: wordLists=frys_first_100_words
    const wordListsParam = urlParams.get('wordLists');
    if (wordListsParam) {
        wordListsParam.split(',').forEach(wordListId => {
            const trimmed = wordListId.trim();
            const wordList = findWordList(trimmed);
            if (wordList) {
                wordList.subLists.forEach(subList => {
                    subList.words.forEach(word => words.add(word));
                });
            }
        });
    }
    
    // Handle sub-lists: wordSubLists=frys_first_100_words:List1A,frys_first_100_words:List1B
    const wordSubListsParam = urlParams.get('wordSubLists');
    if (wordSubListsParam) {
        wordSubListsParam.split(',').forEach(subListRef => {
            const trimmed = subListRef.trim();
            const [wordListId, subListName] = trimmed.split(':');
            if (wordListId && subListName) {
                const subList = findSubList(wordListId.trim(), subListName.trim());
                if (subList) {
                    subList.words.forEach(word => words.add(word));
                }
            }
        });
    }
    
    return Array.from(words);
}

/**
 * Normalizes number items array, expanding ranges to actual numbers.
 * Items can be:
 * - Individual numbers as strings (e.g., "5", "42")
 * - Range objects with min/max (e.g., {min: 0, max: 9})
 * 
 * @param {Array} items - Array of items that may contain numbers or range objects
 * @returns {Promise<Array<string>>} - Normalized array of numbers as strings (all ranges expanded)
 */
export async function normalizeNumberItems(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        console.log('normalizeNumberItems: items is empty or invalid');
        return [];
    }
    
    console.log('normalizeNumberItems: processing items:', items);
    const numbers = new Set();
    
    // Helper function to generate numbers from a range
    const generateNumbersFromRange = (min, max) => {
        const nums = [];
        for (let i = min; i <= max; i++) {
            nums.push(String(i));
        }
        return nums;
    };
    
    // Process each item
    for (const item of items) {
        if (!item) {
            console.log('normalizeNumberItems: skipping null/undefined item');
            continue;
        }
        
        // Check if it's a range object
        if (typeof item === 'object' && item.min !== undefined && item.max !== undefined) {
            const min = Number(item.min);
            const max = Number(item.max);
            if (!isNaN(min) && !isNaN(max) && min <= max) {
                console.log(`normalizeNumberItems: found range ${min}-${max}`);
                const nums = generateNumbersFromRange(min, max);
                nums.forEach(num => numbers.add(num));
            } else {
                console.warn(`normalizeNumberItems: invalid range: ${item.min}-${item.max}`);
            }
        } else if (typeof item === 'string') {
            // It's an individual number string
            const trimmed = item.trim();
            if (trimmed) {
                console.log(`normalizeNumberItems: treating "${trimmed}" as individual number`);
                numbers.add(trimmed);
            }
        } else {
            console.warn('normalizeNumberItems: skipping invalid item type:', typeof item, item);
        }
    }
    
    return Array.from(numbers);
}

/**
 * Breaks down a number into its spoken components.
 * Returns an array of numbers that need to be spoken in order.
 * 
 * Examples:
 * - 12 -> [12]
 * - 1 -> [1]
 * - 100 -> [1, 100]
 * - 200 -> [2, 100]
 * - 2025 -> [2, 1000, 20, 5]
 * - 46256 -> [40, 6, 1000, 2, 100, 50, 6]
 * 
 * @param {number|string} num - The number to break down
 * @returns {number[]} - Array of numbers representing the spoken components
 */
export function breakDownNumber(num) {
    // Convert to number if string
    const n = typeof num === 'string' ? parseInt(num, 10) : num;
    
    // Handle invalid numbers
    if (isNaN(n) || n < 0) {
        return [];
    }
    
    // Numbers less than 20 are spoken as-is
    if (n < 20) {
        return [n];
    }
    
    // Numbers from 20 to 99: break into tens and ones
    if (n < 100) {
        const tens = Math.floor(n / 10) * 10;
        const ones = n % 10;
        if (ones === 0) {
            return [tens];
        }
        return [tens, ones];
    }
    
    const components = [];
    let remaining = n;
    
    // Define powers of 10 in descending order
    const powers = [
        { value: 1000000000000, name: 1000000000000 }, // trillion
        { value: 1000000000, name: 1000000000 },     // billion
        { value: 1000000, name: 1000000 },            // million
        { value: 1000, name: 1000 },                  // thousand
        { value: 100, name: 100 }                     // hundred
    ];
    
    // Process each power of 10
    for (const power of powers) {
        if (remaining >= power.value) {
            const count = Math.floor(remaining / power.value);
            remaining = remaining % power.value;
            
            // Break down the count (recursively)
            const countComponents = breakDownNumber(count);
            components.push(...countComponents);
            components.push(power.name);
        }
    }
    
    // Add remaining part (tens and ones)
    if (remaining > 0) {
        const remainingComponents = breakDownNumber(remaining);
        components.push(...remainingComponents);
    }
    
    return components;
}

