// Quiz Categories Configuration
export const quizCategories = {
  'current-affairs': {
    name: 'Current Affairs',
    categories: (() => {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December']
      const currentYear = new Date().getFullYear()
      const categories = ['All']
      months.forEach(month => {
        categories.push(`${month} ${currentYear}`)
      })
      return categories
    })()
  },
  'mathematics': {
    name: 'Mathematics',
    categories: ['All', 'Number System', 'HCF & LCM', 'Percentages', 'Profit & Loss', 
               'Simple & Compound Interest', 'Ratio & Proportion', 'Time & Work', 
               'Time, Speed & Distance', 'Averages', 'Simplification & Approximation', 
               'Algebra', 'Geometry', 'Mensuration']
  },
  'english': {
    name: 'English',
    categories: ['All', 'Synonyms', 'Antonyms', 'One-word Substitutions', 
               'Idioms & Phrases', 'Parts of Speech', 'Articles', 'Prepositions', 
               'Active & Passive Voice', 'Direct & Indirect Speech', 'Tenses', 'Spotting Errors']
  },
  'reasoning': {
    name: 'Reasoning',
    categories: ['All', 'Analogy', 'Coding–Decoding', 'Blood Relations', 
               'Direction Sense', 'Syllogism', 'Non-verbal Reasoning', 
               'Seating Arrangement', 'Clock & Calendar', 'Series']
  },
  'computer': {
    name: 'Computer',
    categories: ['All', 'Basic Computer Knowledge', 'Computer Hardware', 
               'Software & Operating Systems', 'Word', 'Excel', 'Powerpoint', 
               'Internet & Networking']
  },
  'malayalam': {
    name: 'Malayalam',
    categories: ['All', 'പദശുദ്ധി', 'വിഗ്രഹാർത്ഥം', 'പര്യായപദങ്ങൾ', 
               'അർത്ഥവ്യത്യാസം', 'എതിർലിംഗം', 'ഒറ്റപ്പദം', 'ശൈലികൾ', 'വിപരീതപദങ്ങൾ']
  },
  'kerala-gk': {
    name: 'Kerala GK',
    categories: ['All', 'History', 'Geography', 'Economy', 'Important Personalities']
  },
  'india-gk': {
    name: 'India GK',
    categories: ['All', 'History', 'Geography', 'Economy', 'Important Personalities']
  },
  'science': {
    name: 'Science',
    categories: ['All', 'Biology', 'Chemistry', 'Physics']
  },
  'constitution': {
    name: 'Constitution',
    categories: ['All']
  }
}

// Get categories for a subject
export const getCategoriesForSubject = (category) => {
  return quizCategories[category]?.categories || ['All']
}

// Get subject name
export const getSubjectName = (category) => {
  return quizCategories[category]?.name || category
}

