import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generateNotebookPDF = async (note, user) => {
  return new Promise(async (resolve, reject) => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;

      // Add notebook-style background
      pdf.setFillColor(255, 253, 245); // Light yellow paper color
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Add margin lines (like real notebook)
      pdf.setDrawColor(200, 180, 120);
      pdf.setLineWidth(0.3);
      
      // Left margin line
      pdf.line(margin, 0, margin, pageHeight);
      
      // Right margin line
      pdf.line(pageWidth - margin, 0, pageWidth - margin, pageHeight);

      // Add horizontal lines (like lined paper)
      pdf.setDrawColor(220, 220, 220);
      const lineSpacing = 6;
      for (let y = margin + 10; y < pageHeight - margin; y += lineSpacing) {
        pdf.line(margin + 5, y, pageWidth - margin - 5, y);
      }

      // Add header with notebook style
      pdf.setFontSize(20);
      pdf.setTextColor(70, 70, 70);
      pdf.setFont('helvetica', 'bold');
      pdf.text(note.title, pageWidth / 2, margin + 10, { align: 'center' });

      // Add subject and date
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Subject: ${note.subject}`, margin + 5, margin + 20);
      const dateStr = note.date instanceof Date 
        ? note.date.toLocaleDateString() 
        : new Date(note.date).toLocaleDateString();
      pdf.text(`Created: ${dateStr}`, pageWidth - margin - 5, margin + 20, { align: 'right' });
      pdf.text(`By: ${user?.name || 'User'}`, margin + 5, margin + 27);

      // Add decorative elements
      pdf.setDrawColor(180, 160, 100);
      pdf.setLineWidth(0.5);
      pdf.line(margin, margin + 32, pageWidth - margin, margin + 32);

      // Content area
      const contentStartY = margin + 45;
      let currentY = contentStartY;

      // Calculate actual content width (accounting for margins and padding)
      const contentWidth = pageWidth - (2 * margin) - 10; // 10mm for left+right padding
      const leftMarginStart = margin + 5;

      if (note.type === 'text' || note.type === 'typing') {
        // Handle text content with proper formatting
        const content = note.textContent || note.content || '';
        
        // Ensure fontSize is a valid number between 6 and 72
        const fontSize = Math.max(6, Math.min(72, parseInt(note.fontSize) || 12));
        pdf.setFontSize(fontSize);
        
        // Convert hex color to RGB array safely
        let textColor = [0, 0, 0]; // Default black
        if (note.textColor) {
          try {
            const rgb = hexToRgb(note.textColor);
            if (rgb && Array.isArray(rgb) && rgb.length === 3) {
              textColor = rgb;
            }
          } catch (e) {
          }
        }
        pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
        
        // Ensure font family is valid
        const fontFamily = ['helvetica', 'times', 'courier'].includes(note.fontFamily?.toLowerCase()) 
          ? note.fontFamily.toLowerCase() 
          : 'helvetica';
        pdf.setFont(fontFamily, 'normal');

        // Split text to fit within content width
        const lines = pdf.splitTextToSize(content, contentWidth);
        
        // Calculate line height based on font size
        const lineHeight = Math.max(fontSize * 0.35, 6); // Minimum 6mm line height

        for (let i = 0; i < lines.length; i++) {
          // Check if we need a new page
          if (currentY > pageHeight - margin - 10) {
            pdf.addPage();
            currentY = margin;
            // Add background and lines to new page
            addNotebookBackground(pdf, pageWidth, pageHeight, margin);
          }
          
          // Add text with proper left margin
          pdf.text(lines[i], leftMarginStart, currentY);
          currentY += lineHeight;
        }
      } else if (note.type === 'drawing' && note.content) {
        // Handle drawing content
        try {
          const img = new Image();
          img.src = note.content;
          
          await new Promise((resolveImg) => {
            img.onload = resolveImg;
          });

          const imgWidth = contentWidth;
          const imgHeight = (img.height * imgWidth) / img.width;
          
          if (imgHeight + currentY > pageHeight - margin) {
            pdf.addPage();
            currentY = margin;
            addNotebookBackground(pdf, pageWidth, pageHeight, margin);
          }

          pdf.addImage(img, 'PNG', leftMarginStart, currentY, imgWidth, imgHeight);
          currentY += imgHeight + 10;
        } catch (error) {
          console.error('Error adding image to PDF:', error);
          pdf.setFontSize(12);
          pdf.setTextColor(150, 150, 150);
          pdf.text('[Drawing content - Unable to render in PDF]', leftMarginStart, currentY);
          currentY += 10;
        }
      }

      // Add footer
      const footerY = pageHeight - 10;
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('Generated by PIQUI', pageWidth / 2, footerY, { align: 'center' });
      pdf.text(`Page 1 of ${pdf.internal.getNumberOfPages()}`, pageWidth - margin - 5, footerY, { align: 'right' });

      // Save the PDF
      const fileName = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pdf`;
      pdf.save(fileName);
      
      resolve(fileName);
    } catch (error) {
      console.error('PDF generation error:', error);
      reject(error);
    }
  });
};

// Helper function to add notebook background to new pages
const addNotebookBackground = (pdf, pageWidth, pageHeight, margin) => {
  pdf.setFillColor(255, 253, 245);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Margin lines
  pdf.setDrawColor(200, 180, 120);
  pdf.setLineWidth(0.3);
  pdf.line(margin, 0, margin, pageHeight);
  pdf.line(pageWidth - margin, 0, pageWidth - margin, pageHeight);

  // Horizontal lines
  pdf.setDrawColor(220, 220, 220);
  const lineSpacing = 6;
  for (let y = margin + 10; y < pageHeight - margin; y += lineSpacing) {
    pdf.line(margin + 5, y, pageWidth - margin - 5, y);
  }
};

// Helper function to convert hex to RGB
const hexToRgb = (hex) => {
  if (!hex || typeof hex !== 'string') {
    return [0, 0, 0];
  }
  
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Handle 3-digit hex codes
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return [r, g, b];
  }
  
  // Handle 6-digit hex codes
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
  if (result) {
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ];
  }
  
  return [0, 0, 0]; // Default to black if invalid
};

// Alternative PDF generator for canvas-based content
export const generateCanvasPDF = async (canvas, title, user) => {
  return new Promise(async (resolve, reject) => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;

      // Add notebook background
      pdf.setFillColor(255, 253, 245);
      pdf.rect(0, 0, pageWidth, pdf.internal.pageSize.getHeight(), 'F');

      // Convert canvas to image
      const canvasImage = await html2canvas(canvas, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvasImage.toDataURL('image/png');
      
      // Calculate image dimensions to fit page with margins
      const contentWidth = pageWidth - (2 * margin);
      const imgHeight = (canvasImage.height * contentWidth) / canvasImage.width;

      // Add title
      pdf.setFontSize(16);
      pdf.setTextColor(70, 70, 70);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, pageWidth / 2, margin + 10, { align: 'center' });

      // Add image to PDF with proper margins
      pdf.addImage(imgData, 'PNG', margin, margin + 20, contentWidth, imgHeight);

      // Add footer
      const footerY = pdf.internal.pageSize.getHeight() - 10;
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Created by ${user?.name || 'User'} on ${new Date().toLocaleDateString()}`, pageWidth / 2, footerY, { align: 'center' });

      const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pdf`;
      pdf.save(fileName);
      
      resolve(fileName);
    } catch (error) {
      console.error('Canvas PDF generation error:', error);
      reject(error);
    }
  });
};