const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class CertificateService {
  constructor() {
    this.certificatesDir = path.join(__dirname, '../certificates');
    this.ensureCertificatesDir();
  }

  ensureCertificatesDir() {
    if (!fs.existsSync(this.certificatesDir)) {
      fs.mkdirSync(this.certificatesDir, { recursive: true });
    }
  }

  generateCertificateId() {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
  }

  async generateCertificate(certificateData) {
    const {
      studentName,
      courseTitle,
      instructorName,
      completionDate,
      completionPercentage,
      certificateId,
      issuedBy = 'FOREX NAVIGATORS'
    } = certificateData;

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 0
    });

    const fileName = `certificate_${certificateId}.pdf`;
    const filePath = path.join(this.certificatesDir, fileName);
    
    // Pipe PDF to file
    doc.pipe(fs.createWriteStream(filePath));

    // Background gradient (purple to pink) - matching the exact colors from the image
    const gradient = doc.linearGradient(0, 0, doc.page.width, doc.page.height);
    gradient.stop(0, '#A855F7'); // Lighter purple (top-left)
    gradient.stop(0.5, '#8B5CF6'); // Medium purple
    gradient.stop(1, '#EC4899'); // Pink (bottom-right)
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(gradient);

    // Certificate white background with gold border
    const certX = 50;
    const certY = 30;
    const certWidth = doc.page.width - 100;
    const certHeight = doc.page.height - 60;

    // Gold border (thinner, more elegant)
    doc.rect(certX, certY, certWidth, certHeight)
       .stroke('#FFD700')
       .lineWidth(2);

    // White certificate background
    doc.rect(certX + 3, certY + 3, certWidth - 6, certHeight - 6)
       .fill('#FFFFFF');

    // Candlestick pattern background (more subtle, matching the image)
    this.drawCandlestickPattern(doc, certX + 5, certY + 5, certWidth - 10, certHeight - 10);

    // Purple ribbon bow in top-left corner (larger, more prominent)
    this.drawRibbonBow(doc, certX - 15, certY - 15, '#8B5CF6');

    // Purple awareness ribbon in bottom-right (heart shape)
    this.drawHeartRibbon(doc, certX + certWidth - 50, certY + certHeight - 50, '#8B5CF6');

    // Main certificate content
    const centerX = certX + certWidth / 2;
    const centerY = certY + certHeight / 2;

    // CERTIFICATE title (larger, bolder)
    doc.fontSize(42)
       .fill('#000000')
       .text('CERTIFICATE', centerX, certY + 50, {
         align: 'center',
         bold: true
       });

    // OF COMPLETION BATCH #2 subtitle
    doc.fontSize(18)
       .fill('#000000')
       .text('OF COMPLETION BATCH #2', centerX, certY + 90, {
         align: 'center',
         bold: true
       });

    // THIS IS TO CERTIFY THAT
    doc.fontSize(16)
       .fill('#000000')
       .text('THIS IS TO CERTIFY THAT', centerX, certY + 130, {
         align: 'center'
       });

    // Student name in elegant script style (larger, more prominent)
    doc.fontSize(32)
       .fill('#8B5CF6')
       .text(studentName, centerX, certY + 170, {
         align: 'center',
         bold: true
       });

    // Achievement text (matching the exact wording from the image)
    const achievementText = `has completed the ${courseTitle} with distinction, exhibiting outstanding mastery of the Navigator strategy and a remarkable commitment to trading excellence.`;
    
    doc.fontSize(14)
       .fill('#000000')
       .text(achievementText, centerX, certY + 220, {
         align: 'center',
         width: certWidth - 80,
         lineGap: 4
       });

    // FOREX NAVIGATORS logo area (positioned between signature and date)
    const logoY = certY + 300;
    this.drawForexNavigatorsLogo(doc, centerX, logoY);

    // Signature area (left side)
    doc.fontSize(12)
       .fill('#000000')
       .text('Adnan Khan', certX + 50, certY + certHeight - 60, { bold: true });

    // Date area (right side)
    doc.fontSize(12)
       .fill('#000000')
       .text('Date', certX + certWidth - 120, certY + certHeight - 80)
       .text(completionDate.toLocaleDateString(), certX + certWidth - 120, certY + certHeight - 60);

    // Certificate ID (bottom center, smaller)
    doc.fontSize(10)
       .fill('#666666')
       .text(`Certificate ID: ${certificateId}`, centerX, certY + certHeight - 30, {
         align: 'center'
       });

    // Finalize PDF
    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        resolve({
          filePath,
          fileName,
          certificateUrl: `/certificates/${fileName}`
        });
      });
      
      doc.on('error', reject);
    });
  }

  drawCandlestickPattern(doc, x, y, width, height) {
    const candleWidth = 6;
    const candleSpacing = 10;
    const rows = Math.floor(height / 15);
    const cols = Math.floor(width / candleSpacing);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const candleX = x + col * candleSpacing;
        const candleY = y + row * 15;
        
        // Randomly choose green or red
        const isGreen = Math.random() > 0.5;
        const color = isGreen ? '#10B981' : '#EF4444';
        
        // Draw candlestick body
        doc.rect(candleX, candleY + 3, candleWidth, 9)
           .fill(color)
           .opacity(0.08);
        
        // Draw wick
        doc.lineWidth(0.5)
           .strokeColor(color)
           .opacity(0.08)
           .moveTo(candleX + candleWidth/2, candleY)
           .lineTo(candleX + candleWidth/2, candleY + 15)
           .stroke();
      }
    }
  }

  drawRibbonBow(doc, x, y, color) {
    // Draw a more prominent ribbon bow
    doc.fillColor(color)
       .opacity(0.9);
    
    // Main bow shape
    doc.moveTo(x, y)
       .lineTo(x + 80, y + 15)
       .lineTo(x + 70, y + 35)
       .lineTo(x + 50, y + 50)
       .lineTo(x + 30, y + 45)
       .lineTo(x + 10, y + 25)
       .lineTo(x, y + 5)
       .closePath()
       .fill();
    
    // Bow center knot
    doc.rect(x + 35, y + 20, 15, 15)
       .fill();
  }

  drawHeartRibbon(doc, x, y, color) {
    // Draw heart-shaped ribbon
    doc.fillColor(color)
       .opacity(0.9);
    
    // Heart shape
    doc.moveTo(x, y + 15)
       .bezierCurveTo(x - 15, y, x - 15, y + 15, x, y + 30)
       .bezierCurveTo(x + 15, y + 15, x + 15, y, x, y + 15)
       .fill();
  }

  drawForexNavigatorsLogo(doc, centerX, y) {
    const logoWidth = 180;
    const logoHeight = 60;
    const logoX = centerX - logoWidth / 2;

    // Bull (left side) - more detailed
    doc.fillColor('#8B5CF6')
       .opacity(0.9);
    
    // Bull body
    doc.rect(logoX, y, 25, 35)
       .fill();
    
    // Bull head
    doc.rect(logoX - 8, y + 8, 18, 18)
       .fill();
    
    // Bull horns
    doc.moveTo(logoX - 8, y + 12)
       .lineTo(logoX - 12, y + 5)
       .lineTo(logoX - 8, y + 8)
       .fill();

    // Bear (right side) - more detailed
    doc.fillColor('#3B82F6')
       .opacity(0.9);
    
    // Bear body
    doc.rect(logoX + logoWidth - 25, y, 25, 35)
       .fill();
    
    // Bear head
    doc.rect(logoX + logoWidth - 17, y + 8, 18, 18)
       .fill();
    
    // Bear ears
    doc.rect(logoX + logoWidth - 17, y + 5, 7, 7)
       .fill();
    doc.rect(logoX + logoWidth - 10, y + 5, 7, 7)
       .fill();

    // City skyline/bar chart on backs (more detailed)
    doc.fillColor('#1F2937')
       .opacity(0.7);
    
    // Bull's back bars
    for (let i = 0; i < 6; i++) {
      const barHeight = 8 + Math.random() * 12;
      doc.rect(logoX + i * 4, y - barHeight, 3, barHeight)
         .fill();
    }
    
    // Bear's back bars
    for (let i = 0; i < 6; i++) {
      const barHeight = 8 + Math.random() * 12;
      doc.rect(logoX + logoWidth - 25 + i * 4, y - barHeight, 3, barHeight)
         .fill();
    }

    // FOREX NAVIGATORS text (matching the image colors)
    doc.fillColor('#8B5CF6')
       .opacity(1)
       .fontSize(14)
       .text('FOREX', logoX + logoWidth/2 - 25, y + 40, {
         align: 'center',
         bold: true
       });
    
    doc.fillColor('#3B82F6')
       .opacity(1)
       .fontSize(14)
       .text('NAVIGATORS', logoX + logoWidth/2 + 5, y + 40, {
         align: 'center',
         bold: true
       });

    // LEARN • GROW • RICH tagline (matching the image)
    doc.fillColor('#8B5CF6')
       .opacity(0.8)
       .fontSize(8)
       .text('LEARN', logoX + logoWidth/2 - 20, y + 55, {
         align: 'center'
       });
    
    doc.fillColor('#3B82F6')
       .opacity(0.8)
       .fontSize(8)
       .text('GROW', logoX + logoWidth/2, y + 55, {
         align: 'center'
       });
    
    doc.fillColor('#10B981')
       .opacity(0.8)
       .fontSize(8)
       .text('RICH', logoX + logoWidth/2 + 20, y + 55, {
         align: 'center'
       });
  }

  async deleteCertificate(fileName) {
    const filePath = path.join(this.certificatesDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

module.exports = new CertificateService();