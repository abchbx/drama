import html2pdf from 'html2pdf.js';
import type { ExportedScript } from './types.js';

export interface PDFOptions {
  margin: number;
  filename: string;
  image: {
    type: 'jpeg' | 'png' | 'webp';
    quality: number;
  };
  html2canvas: {
    scale: number;
    useCORS: boolean;
  };
  jsPDF: {
    unit: 'mm';
    format: 'a4' | 'letter';
    orientation: 'portrait' | 'landscape';
  };
}

export class PDFExporter {
  private defaultOptions: PDFOptions = {
    margin: 10,
    filename: 'script.pdf',
    image: {
      type: 'jpeg',
      quality: 0.98,
    },
    html2canvas: {
      scale: 2,
      useCORS: true,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    },
  };

  /**
   * Convert Markdown content to HTML for PDF rendering
   */
  private markdownToHTML(markdown: string): string {
    let html = markdown
      // Headers
      .replace(/^### (.+)$/gm, '<h3 style="font-size: 16px; font-weight: 600; margin: 16px 0 8px 0; color: #cdd6f4;">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 style="font-size: 18px; font-weight: 600; margin: 20px 0 12px 0; color: #cdd6f4;">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px 0; color: #89b4fa;">$1</h1>')
      // Bold (character names in dialogue)
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color: #89b4fa;">$1</strong>')
      // Italic (scene descriptions)
      .replace(/\*(.+?)\*/g, '<em style="color: #a6adc8;">$1</em>')
      // Horizontal rules
      .replace(/^---$/gm, '<hr style="border: none; border-top: 1px solid #45475a; margin: 24px 0;">')
      // Line breaks
      .replace(/\n\n/g, '</p><p style="margin: 8px 0; line-height: 1.5;">')
      // Paragraph wrapper
      .replace(/^/, '<p style="margin: 8px 0; line-height: 1.5; color: #cdd6f4;">')
      .replace(/$/, '</p>');

    return html;
  }

  /**
   * Generate HTML from ExportedScript for PDF
   */
  private exportedScriptToHTML(script: ExportedScript, filename: string): string {
    let html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 210mm; margin: 0 auto; padding: 20mm; background: #1e1e2e; color: #cdd6f4;">
    `;

    // Title
    html += `
      <h1 style="font-size: 28px; font-weight: 600; margin: 0 0 8px 0; color: #89b4fa;">${script.session.name}</h1>
    `;

    // Metadata
    html += `
      <p style="margin: 0 0 16px 0; font-size: 12px; color: #a6adc8;">
        <strong>Exported:</strong> ${new Date().toLocaleString()}<br>
        <strong>Duration:</strong> ${script.session.sceneDurationMinutes} minutes<br>
        <strong>Actors:</strong> ${script.session.agentCount}
      </p>
      <hr style="border: none; border-top: 1px solid #45475a; margin: 20px 0;">
    `;

    // Character List
    html += `
      <h2 style="font-size: 20px; font-weight: 600; margin: 24px 0 12px 0; color: #cdd6f4;">Characters</h2>
    `;
    for (const char of script.characters) {
      html += `
        <div style="margin: 16px 0; padding: 12px; background: #313244; border-radius: 4px;">
          <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #89b4fa;">${char.agentId}</h3>
          <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #cdd6f4;">${char.characterCard}</p>
        </div>
      `;
    }

    // Scenes
    html += `
      <h2 style="font-size: 20px; font-weight: 600; margin: 24px 0 12px 0; color: #cdd6f4;">Scenes</h2>
    `;
    for (const scene of script.scenes) {
      html += `
        <div style="margin: 20px 0;">
          <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 8px 0; color: #89b4fa;">Scene: ${scene.location}</h3>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #a6adc8;">
            <em>${scene.description}</em>
          </p>
          <p style="margin: 0 0 16px 0; font-size: 11px; color: #6c7086;">
            <strong>Timestamp:</strong> ${scene.timestamp}
          </p>
      `;

      // Beats (dialogue)
      for (const beat of scene.beats) {
        html += `
          <p style="margin: 8px 0; font-size: 13px; line-height: 1.6; color: #cdd6f4;">
            ${this.markdownToHTML(beat)}
          </p>
        `;
      }

      // Conflicts
      if (scene.conflicts && scene.conflicts.length > 0) {
        html += `
          <div style="margin: 12px 0; padding: 8px; background: rgba(243, 139, 168, 0.1); border-left: 3px solid #f38ba8; border-radius: 2px;">
            <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #f38ba8;">Conflicts:</p>
        `;
        for (const conflict of scene.conflicts) {
          html += `
            <p style="margin: 4px 0; font-size: 11px; color: #cdd6f4;">• ${conflict}</p>
          `;
        }
        html += `</div>`;
      }

      html += `
          <hr style="border: none; border-top: 1px solid #45475a; margin: 20px 0;">
        </div>
      `;
    }

    html += `</div>`;
    return html;
  }

  /**
   * Export script as PDF
   */
  async exportAsPDF(script: ExportedScript, filename: string): Promise<void> {
    const html = this.exportedScriptToHTML(script, filename);

    const options = {
      ...this.defaultOptions,
      filename: filename,
    };

    return html2pdf().set(options).from(html).save();
  }

  /**
   * Export Markdown string as PDF
   */
  async exportMarkdownAsPDF(markdown: string, filename: string): Promise<void> {
    const html = this.markdownToHTML(markdown);

    const options = {
      ...this.defaultOptions,
      filename: filename,
    };

    return html2pdf().set(options).from(html).save();
  }
}

export const pdfExporter = new PDFExporter();
