/**
 * reportGenerator.js — HTML template → PDF via expo-print
 * 
 * Generates professional noise incident reports as PDF documents.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getLevelForDb } from './thresholds';

/**
 * Format a timestamp to a readable date/time string.
 * @param {number} timestamp - Unix timestamp in ms
 * @returns {string} Formatted string like "2026-03-18 11:30 PM"
 */
function formatDateTime(timestamp) {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${mins} ${ampm}`;
}

/**
 * Format duration in seconds to a readable string.
 * @param {number} seconds - Duration in seconds
 * @returns {string} Like "45 min" or "1h 23min" or "30 sec"
 */
function formatDuration(seconds) {
  if (!seconds || seconds < 1) return '< 1 sec';
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours}h ${remainMins}min` : `${hours}h`;
}

/**
 * Calculate summary statistics from incidents.
 * @param {Array} incidents - Array of incident objects
 * @returns {object} Summary stats
 */
function calculateSummary(incidents) {
  if (!incidents.length) {
    return {
      total: 0,
      avgPeak: 0,
      highestPeak: 0,
      avgAvg: 0,
      totalDuration: 0,
      mostActiveHour: 'N/A',
    };
  }

  const peaks = incidents.map((i) => i.peakDb || 0);
  const avgs = incidents.map((i) => i.avgDb || 0);
  const totalDuration = incidents.reduce((sum, i) => sum + (i.duration || 0), 0);

  // Find most active hour
  const hourCounts = {};
  incidents.forEach((i) => {
    const hour = new Date(i.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  const maxHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  const mostActiveHour = maxHour
    ? `${maxHour[0] % 12 || 12}:00 ${maxHour[0] >= 12 ? 'PM' : 'AM'}`
    : 'N/A';

  return {
    total: incidents.length,
    avgPeak: Math.round(peaks.reduce((a, b) => a + b, 0) / peaks.length),
    highestPeak: Math.max(...peaks),
    avgAvg: Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length),
    totalDuration,
    mostActiveHour,
  };
}

/**
 * Generate the HTML for the PDF report.
 * @param {object} params
 * @param {string} params.address - Location address
 * @param {Array} params.incidents - Array of incident objects
 * @param {string} params.startDate - Start date string
 * @param {string} params.endDate - End date string
 * @returns {string} HTML string
 */
function generateHtml({ address, incidents, startDate, endDate }) {
  const summary = calculateSummary(incidents);
  const now = formatDateTime(Date.now());

  const incidentRows = incidents
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((incident, idx) => {
      const level = getLevelForDb(incident.peakDb);
      return `
      <div class="incident">
        <div class="incident-header">
          <span class="incident-num">#${idx + 1}</span>
          <span class="severity" style="background-color: ${level.color};">${level.label}</span>
        </div>
        <table class="incident-details">
          <tr><td class="label">Date:</td><td>${formatDateTime(incident.timestamp)}</td></tr>
          <tr><td class="label">Duration:</td><td>${formatDuration(incident.duration)}</td></tr>
          <tr><td class="label">Average:</td><td>${incident.avgDb} dB</td></tr>
          <tr><td class="label">Peak:</td><td><strong>${incident.peakDb} dB</strong></td></tr>
          ${incident.note ? `<tr><td class="label">Note:</td><td>"${incident.note}"</td></tr>` : ''}
        </table>
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 11pt;
      color: #333;
      line-height: 1.5;
      padding: 40px;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #EF6C00;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 24pt;
      color: #EF6C00;
      margin-bottom: 5px;
    }
    .header .subtitle {
      font-size: 10pt;
      color: #666;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      padding: 15px;
      background: #f5f5f5;
      border-radius: 8px;
    }
    .meta div { flex: 1; }
    .meta .label { font-weight: bold; color: #555; font-size: 9pt; text-transform: uppercase; }
    .meta .value { font-size: 11pt; color: #333; }
    .section-title {
      font-size: 14pt;
      color: #EF6C00;
      border-bottom: 1px solid #ddd;
      padding-bottom: 8px;
      margin: 25px 0 15px 0;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 20px;
    }
    .summary-item {
      padding: 12px;
      background: #fff3e0;
      border-radius: 6px;
      border-left: 4px solid #EF6C00;
    }
    .summary-item .value { font-size: 18pt; font-weight: bold; color: #E65100; }
    .summary-item .label { font-size: 8pt; color: #666; text-transform: uppercase; }
    .ordinance {
      padding: 12px;
      background: #e3f2fd;
      border-radius: 6px;
      border-left: 4px solid #1976D2;
      margin-bottom: 20px;
      font-size: 10pt;
    }
    .ordinance strong { color: #1976D2; }
    .incident {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .incident-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .incident-num { font-size: 12pt; font-weight: bold; color: #555; }
    .severity {
      color: white;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 9pt;
      font-weight: bold;
    }
    .incident-details { width: 100%; }
    .incident-details td { padding: 3px 0; font-size: 10pt; }
    .incident-details .label { width: 80px; color: #666; font-weight: bold; }
    .disclaimer {
      margin-top: 40px;
      padding: 15px;
      background: #fafafa;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      font-size: 9pt;
      color: #888;
      text-align: center;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 8pt;
      color: #aaa;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 NOISE INCIDENT REPORT</h1>
    <div class="subtitle">Generated by NoiseLog — Sound Evidence Logger</div>
  </div>

  <div class="meta">
    <div>
      <div class="label">Location</div>
      <div class="value">${address || 'Not specified'}</div>
    </div>
    <div>
      <div class="label">Period</div>
      <div class="value">${startDate} — ${endDate}</div>
    </div>
    <div>
      <div class="label">Generated</div>
      <div class="value">${now}</div>
    </div>
  </div>

  <h2 class="section-title">Summary</h2>
  <div class="summary-grid">
    <div class="summary-item">
      <div class="value">${summary.total}</div>
      <div class="label">Total Incidents</div>
    </div>
    <div class="summary-item">
      <div class="value">${summary.avgPeak} dB</div>
      <div class="label">Average Peak Level</div>
    </div>
    <div class="summary-item">
      <div class="value">${summary.highestPeak} dB</div>
      <div class="label">Highest Recorded</div>
    </div>
    <div class="summary-item">
      <div class="value">${summary.mostActiveHour}</div>
      <div class="label">Most Active Period</div>
    </div>
  </div>

  <div class="ordinance">
    <strong>Typical Residential Noise Ordinance Limits:</strong><br>
    Daytime (7am–10pm): 55 dB &nbsp; | &nbsp; Nighttime (10pm–7am): 45 dB
  </div>

  <h2 class="section-title">Incident Log</h2>
  ${incidents.length === 0 ? '<p style="color:#999;text-align:center;padding:20px;">No incidents recorded for this period.</p>' : incidentRows}

  <div class="disclaimer">
    ⚠️ <strong>DISCLAIMER:</strong> Measurements are approximate and taken using a smartphone microphone.
    Not calibrated to laboratory standards. Results should be used as supplementary evidence only.
  </div>

  <div class="footer">
    NoiseLog — Sound Evidence Logger v1.0.0<br>
    Report generated on ${now}
  </div>
</body>
</html>`;
}

/**
 * Generate a PDF report and return the file URI.
 * @param {object} params - { address, incidents, startDate, endDate }
 * @returns {string} URI to the generated PDF file
 */
export async function generatePdfReport(params) {
  const html = generateHtml(params);
  const { uri } = await Print.printToFileAsync({
    html,
    width: 612,  // US Letter width in points
    height: 792, // US Letter height in points
  });
  return uri;
}

/**
 * Generate PDF and open the system share dialog.
 * @param {object} params - { address, incidents, startDate, endDate }
 */
export async function generateAndShareReport(params) {
  const uri = await generatePdfReport(params);
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Noise Incident Report',
      UTI: 'com.adobe.pdf',
    });
  }
  return uri;
}
