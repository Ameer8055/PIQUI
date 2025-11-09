const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');

/**
 * Extract text from PDF file
 */
async function extractTextFromPDF(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF: ' + error.message);
  }
}

/**
 * Extract text from DOCX file
 */
async function extractTextFromDOCX(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error('Failed to extract text from DOCX: ' + error.message);
  }
}

/**
 * Extract text from image using OCR
 */
async function extractTextFromImage(buffer, mimeType) {
  try {
    // Convert buffer to image format that Tesseract can process
    const imageBuffer = Buffer.from(buffer);
    
    // Use Tesseract.js for OCR
    const { data: { text } } = await Tesseract.recognize(
      imageBuffer,
      'eng', // English language
      {
        logger: m => {
          // Log progress if needed
          if (m.status === 'recognizing text') {
          }
        }
      }
    );
    
    return text.trim();
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw new Error('Failed to extract text from image: ' + error.message);
  }
}

/**
 * Main function to extract text from any supported file type
 */
async function extractTextFromFile(buffer, mimeType, fileName) {
  try {
    let extractedText = '';

    // Determine file type and extract text accordingly
    if (mimeType === 'application/pdf') {
      extractedText = await extractTextFromPDF(buffer);
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword' ||
      fileName.endsWith('.docx') ||
      fileName.endsWith('.doc')
    ) {
      extractedText = await extractTextFromDOCX(buffer);
    } else if (
      mimeType.startsWith('image/') ||
      ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'].includes(mimeType)
    ) {
      extractedText = await extractTextFromImage(buffer, mimeType);
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    // Clean and validate extracted text
    if (!extractedText || extractedText.trim().length < 50) {
      throw new Error('Extracted text is too short or empty. Please ensure the file contains readable text.');
    }

    return extractedText.trim();
  } catch (error) {
    console.error('Error in extractTextFromFile:', error);
    throw error;
  }
}

module.exports = {
  extractTextFromPDF,
  extractTextFromDOCX,
  extractTextFromImage,
  extractTextFromFile
};

