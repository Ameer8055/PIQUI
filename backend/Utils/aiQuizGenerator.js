// Utils/aiQuizGenerator.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Generates quiz questions from text content using Gemini Free Tier
 * @param {string} text - The text to generate quiz from
 * @param {number} numQuestions - Number of questions to generate (default: 5)
 * @param {string} difficulty - Difficulty level (default: 'medium')
 * @returns {Promise<Array>} Array of quiz questions
 */
const generateQuizFromText = async (text, numQuestions = 5, difficulty = 'medium') => {
    try {
        // Validate input
        if (!text || text.trim().length < 50) {
            throw new Error('Text is too short to generate a meaningful quiz. Please provide more content.');
        }

        if (!process.env.GEMINI) {
            throw new Error('Gemini API key is not configured. Please add GEMINI to your .env file.');
        }


        // Initialize Gemini AI
        const genAI = new GoogleGenerativeAI(process.env.GEMINI);
        
        // Use the free tier model - gemini-1.5-flash-latest is available in free tier
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.5-flash', // Free tier model
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2000,
            }
        });

        const prompt = `Create exactly ${numQuestions} multiple-choice questions based on this text. 

IMPORTANT: You must return ONLY valid JSON format, no other text.

Required JSON format:
{
  "questions": [
    {
      "id": 1,
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}

Text to create questions from:
${text.substring(0, 10000)}`; // Reduced length for free tier

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const content = response.text().trim();
        
        
        // Clean the response (remove markdown fences etc.)
        const cleanContent = content.replace(/```json\s*|```/gi, '').trim();

        let quizData;
        try {
            quizData = JSON.parse(cleanContent);
        } catch (parseError) {
            console.error('JSON Parse Error. Raw content:', content);

            // Try to extract the largest JSON object from the response
            const firstBrace = content.indexOf('{');
            const lastBrace = content.lastIndexOf('}');

            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                const possibleJson = content.slice(firstBrace, lastBrace + 1);
                try {
                    quizData = JSON.parse(possibleJson);
                } catch (secondError) {
                    console.error('Second JSON parse attempt failed:', secondError);
                    // As a fallback, try the simpler generator which is more tolerant
                    const fallbackQuestions = await generateSimpleQuiz(text, numQuestions);
                    if (!fallbackQuestions || !Array.isArray(fallbackQuestions) || fallbackQuestions.length === 0) {
                        throw new Error('AI returned invalid JSON format and fallback also failed. Please try again.');
                    }
                    return fallbackQuestions;
                }
            } else {
                // No JSON-looking content at all, use fallback
                const fallbackQuestions = await generateSimpleQuiz(text, numQuestions);
                if (!fallbackQuestions || !Array.isArray(fallbackQuestions) || fallbackQuestions.length === 0) {
                    throw new Error('AI did not return valid JSON and fallback also failed. Please try again.');
                }
                return fallbackQuestions;
            }
        }

        if (!quizData.questions || !Array.isArray(quizData.questions)) {
            throw new Error('Invalid response format - missing questions array');
        }

        return quizData.questions;
        
    } catch (error) {
        console.error('Error generating quiz:', error);
        throw new Error(`Quiz generation failed: ${error.message}`);
    }
};

// Alternative: Simple version with less strict requirements
const generateSimpleQuiz = async (text, numQuestions = 5) => {
    try {
        if (!text || text.trim().length < 50) {
            throw new Error('Text is too short');
        }

        if (!process.env.GEMINI) {
            throw new Error('API key not configured');
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI);
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-1.5-flash-latest'
        });

        const prompt = `Create ${numQuestions} quiz questions from this text. Return as JSON with questions array containing objects with: question, options (array of 4), correctAnswer (0-3), explanation.

Text: ${text.substring(0, 8000)}`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const textResponse = response.text();
        
        // Try to parse whatever we get back
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed.questions || [];
        }
        
        throw new Error('No valid JSON found in response');
        
    } catch (error) {
        console.error('Simple quiz generation failed:', error);
        throw error;
    }
};

// Export using CommonJS
module.exports = {
    generateQuizFromText,
    generateSimpleQuiz
};