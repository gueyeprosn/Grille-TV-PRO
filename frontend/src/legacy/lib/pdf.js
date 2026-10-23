import { DAYS } from "../config.js";
import { formatDuration } from "./time.js";
import { deriveTypeColor, deriveCategoryColor, rgbArrayToCss } from "./colorPalette.js";

/**
 * Types de modes d'export PDF
 * @typedef {"STANDARD" | "REGIE" | "DIRECTION"} ExportMode
 */

/**
 * Version de l'application pour le footer
 */
const APP_VERSION = "v4.1";
const APP_NAME = "GrilleTV Pro";
const APP_BRAND = "Broadcast SN+";

/**
 * Extrait les flags Ramadan depuis la description
 */
function extractRamadanFlags(description) {
  if (!description || typeof description !== 'string') return null;
  const match = description.match(/\[RAMADAN_FLAGS\](.*?)\[\/RAMADAN_FLAGS\]/s);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * Vérifie si un programme est Ramadan
 */
function isRamadanProgram(program) {
  const flags = extractRamadanFlags(program.description);
  return flags?.isRamadan === true;
}

/**
 * Vérifie si une grille contient des programmes Ramadan
 */
function hasRamadanPrograms(programs) {
  return programs.some(p => isRamadanProgram(p));
}

/**
 * 🧩 Étend les programmes sur les jours concernés
 */
function expandPrograms(programs = []) {
  const rows = [];
  for (const program of programs) {
    const days = Array.isArray(program.days) ? program.days : [];
    const duration =
      Number.isFinite(program.duration) && program.duration > 0
        ? program.duration
        : 0;
    const ramadanFlags = extractRamadanFlags(program.description);
    for (const day of days.length ? days : ["—"]) {
      rows.push({
        day,
        start: program.start || "00:00",
        end: program.end || "00:00",
        title: program.title || "Sans titre",
        category: program.category || "Autre",
        type: program.typeDiffusion || "Autre",
        duration,
        ramadanFlags,
        isRamadan: ramadanFlags?.isRamadan === true,
        isCritical: ramadanFlags?.isCritical === true,
        isEvent: ramadanFlags?.isEvent === true,
        isCommercial: ramadanFlags?.isCommercial === true,
      });
    }
  }
  return rows.sort((a, b) => {
    const dayIndexA = DAYS.indexOf(a.day);
    const dayIndexB = DAYS.indexOf(b.day);
    if (dayIndexA !== dayIndexB) return dayIndexA - dayIndexB;
    return a.start.localeCompare(b.start);
  });
}

/**
 * Génère le footer standardisé pour tous les PDFs
 */
function addStandardFooter(doc, exportMode = "STANDARD", metadata = {}) {
  const footerY = doc.internal.pageSize.height - 20;
  doc.setDrawColor(220, 220, 220);
  doc.line(40, footerY - 5, doc.internal.pageSize.width - 40, footerY - 5);
  
  const now = new Date();
  const exportDate = now.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const exportTime = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  
  // Construire le footer avec métadonnées optionnelles
  let footerText = `${APP_NAME} ${APP_VERSION} | ${APP_BRAND} | Export ${exportDate} ${exportTime} | Mode: ${exportMode}`;
  
  if (metadata.gridVersion) {
    footerText += ` | Version: ${metadata.gridVersion}`;
  }
  if (metadata.validatedAt) {
    const validatedDate = new Date(metadata.validatedAt).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    footerText += ` | Validé le: ${validatedDate}`;
  }
  if (metadata.validatedBy) {
    footerText += ` | Par: ${metadata.validatedBy}`;
  }
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(footerText, 40, footerY + 5);
}

/**
 * Ajoute un watermark au document
 * Note: jsPDF ne supporte pas directement l'opacité, on utilise une couleur grise
 */
function addWatermark(doc, text, opacity = 0.1, fontSize = 60) {
  const pageCount = doc.internal.getNumberOfPages();
  // Convertir l'opacité en couleur grise (0-255)
  const grayValue = Math.round(255 * (1 - opacity));
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(grayValue, grayValue, grayValue);
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "bold");
    const textWidth = doc.getTextWidth(text);
    const x = (doc.internal.pageSize.width - textWidth) / 2;
    const y = doc.internal.pageSize.height / 2;
    // jsPDF ne supporte pas l'angle directement, on utilise une transformation manuelle
    // Pour simplifier, on affiche le texte horizontalement centré
    doc.text(text, x, y);
  }
}

/**
 * 📄 Export PDF professionnel (Broadcast SN+)
 * DESIGN: Style TV broadcast pro, lisible, adapté impression et envoi
 * 
 * @param programs Liste des programmes
 * @param exportMode Mode d'export : "STANDARD" | "REGIE" | "DIRECTION"
 * @param metadata Métadonnées optionnelles : { gridVersion, validatedAt, validatedBy, gridStatus }
 */
export async function exportWeekToPdf(programs = [], exportMode = "STANDARD", metadata = {}) {
  let jsPDF, autoTableModule;
  try {
    [jsPDF, autoTableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
  } catch (error) {
    console.error("Erreur chargement jsPDF:", error);
    throw new Error("Impossible de charger les modules d'export PDF.");
  }

  const jsPDFConstructor = jsPDF.jsPDF || jsPDF.default?.jsPDF || jsPDF.default || jsPDF;
  const autoTable = autoTableModule.default || autoTableModule;
  const doc = new jsPDFConstructor({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margins = { left: 40, right: 40, top: 145, bottom: 48 };
  const exportDate = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const modeLabels = {
    STANDARD: "EXPLOITATION STANDARD",
    REGIE: "MODE REGIE - NE PAS DIFFUSER",
    DIRECTION: "DOCUMENT INTERNE - DIRECTION",
  };
  const modeColors = {
    STANDARD: [245, 158, 11],
    REGIE: [185, 28, 28],
    DIRECTION: [37, 99, 235],
  };
  const navy = [15, 28, 49];
  const ink = [31, 41, 55];
  const muted = [100, 116, 139];
  const amber = [245, 158, 11];

  const drawPageHeader = (pageNumber) => {
    doc.setFillColor(...navy);
    doc.rect(0, 0, pageWidth, 76, "F");
    doc.setFillColor(...amber);
    doc.rect(0, 76, pageWidth, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(186, 202, 221);
    doc.text("BROADCAST SN+  /  GRILLETV PRO", margins.left, 22);
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    const titleWidth = pageWidth - margins.left - margins.right - 190;
    const titleLines = doc.splitTextToSize(metadata.gridName || "Grille hebdomadaire", titleWidth);
    const title = titleLines.length > 1 ? `${titleLines[0].slice(0, -1)}...` : titleLines[0];
    doc.text(title, margins.left, 49);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(205, 216, 230);
    doc.text(`Programmation de la semaine  |  Export du ${exportDate}`, margins.left, 65);

    const modeText = modeLabels[exportMode] || modeLabels.STANDARD;
    const modeColor = modeColors[exportMode] || modeColors.STANDARD;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const modeWidth = doc.getTextWidth(modeText) + 20;
    const modeX = pageWidth - margins.right - modeWidth;
    doc.setFillColor(...modeColor);
    doc.roundedRect(modeX, 28, modeWidth, 22, 5, 5, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(modeText, modeX + 10, 42);
    if (pageNumber === 1) {
      const expandedRows = expandPrograms(programs);
      const daysCovered = new Set(expandedRows.map((row) => row.day)).size;
      const metrics = [
        ["PROGRAMMES", String(programs.length)],
        ["DIFFUSIONS", String(expandedRows.length)],
        ["JOURS COUVERTS", `${daysCovered} / 7`],
      ];
      const gap = 10;
      const boxWidth = (pageWidth - margins.left - margins.right - gap * 2) / 3;
      metrics.forEach(([label, value], index) => {
        const x = margins.left + index * (boxWidth + gap);
        doc.setFillColor(246, 248, 251);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, 91, boxWidth, 40, 6, 6, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(...muted);
        doc.text(label, x + 12, 106);
        doc.setFontSize(13);
        doc.setTextColor(...ink);
        doc.text(value, x + 12, 123);
      });
    }
  };

  const rows = expandPrograms(programs);
  const body = rows.map((row) => {
        const badges = [];
        if (row.isRamadan) badges.push("RAMADAN");
        if (row.isCritical) badges.push("CRITIQUE");
        if (row.isEvent) badges.push("EVENEMENT");
        if (row.isCommercial) badges.push("COMMERCIAL");
        const title = badges.length ? `[${badges.join(" | ")}] ${row.title}` : row.title;
        return [
          row.day,
          { content: `${row.start} - ${row.end}`, styles: { fontStyle: "bold", halign: "center" } },
          { content: title, styles: { fontStyle: row.isCritical ? "bold" : "normal", textColor: row.isCritical ? [185, 28, 28] : ink } },
          { content: row.category, styles: { textColor: deriveCategoryColor(row.category) } },
          { content: row.type, styles: { textColor: deriveTypeColor(row.type) } },
          { content: formatDuration(row.duration), styles: { halign: "center", fontStyle: "bold" } },
        ];
      });

  if (rows.length > 0) autoTable(doc, {
    head: [["JOUR", "HORAIRE", "PROGRAMME", "CATÉGORIE", "DIFFUSION", "DURÉE"]],
    body,
    startY: margins.top,
    margin: margins,
    showHead: "everyPage",
    rowPageBreak: "avoid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: { top: 6, right: 7, bottom: 6, left: 7 },
      lineColor: [226, 232, 240],
      lineWidth: 0.45,
      textColor: ink,
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [32, 49, 72],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: { top: 8, right: 7, bottom: 8, left: 7 },
    },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    columnStyles: {
      0: { cellWidth: 72, fontStyle: "bold", textColor: [51, 65, 85] },
      1: { cellWidth: 82 },
      2: { cellWidth: "auto" },
      3: { cellWidth: 104 },
      4: { cellWidth: 92 },
      5: { cellWidth: 58 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        data.cell.styles.fillColor = [238, 242, 247];
      }
    },
  });
  else {
    const headerLabels = ["JOUR", "HORAIRE", "PROGRAMME", "CATÉGORIE", "DIFFUSION", "DURÉE"];
    const columnWidths = [72, 82, pageWidth - margins.left - margins.right - 408, 104, 92, 58];
    let x = margins.left;
    headerLabels.forEach((label, index) => {
      doc.setFillColor(32, 49, 72);
      doc.rect(x, margins.top, columnWidths[index], 27, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(label, x + 7, margins.top + 17);
      x += columnWidths[index];
    });
  }

  const tableEndY = rows.length > 0 ? doc.lastAutoTable.finalY : margins.top + 27;
  let legendY = tableEndY + 22;
  if (rows.length === 0) {
    const emptyY = tableEndY + 4;
    doc.setFillColor(238, 242, 247);
    doc.roundedRect(margins.left, emptyY, pageWidth - margins.left - margins.right, 38, 4, 4, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.text("Aucun programme n'est planifié dans cette grille.", pageWidth / 2, emptyY + 23, { align: "center" });
    legendY = emptyY + 56;
  }
  if (legendY + 20 > pageHeight - margins.bottom) {
    doc.addPage();
    drawPageHeader(doc.internal.getNumberOfPages());
    legendY = margins.top;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text("REPÈRES DE DIFFUSION", margins.left, legendY);
  const legends = ["Direct", "PAD", "Rediffusion", "Replay", "Spécial"];
  let legendX = margins.left + 128;
  legends.forEach((label) => {
    const color = deriveTypeColor(label);
    doc.setFillColor(...color);
    doc.roundedRect(legendX, legendY - 7, 7, 7, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...ink);
    doc.text(label, legendX + 12, legendY);
    legendX += doc.getTextWidth(label) + 31;
  });

  if (exportMode === "REGIE") addWatermark(doc, "NE PAS DIFFUSER", 0.06, 42);
  const totalPages = doc.internal.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawPageHeader(page);
    const footerY = pageHeight - 24;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.6);
    doc.line(margins.left, footerY - 8, pageWidth - margins.right, footerY - 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    doc.text(`${APP_NAME} ${APP_VERSION}  |  ${APP_BRAND}`, margins.left, footerY + 4);
    doc.text(`Page ${page} / ${totalPages}`, pageWidth - margins.right, footerY + 4, { align: "right" });
  }

  const modeSuffix = exportMode !== "STANDARD" ? `-${exportMode.toLowerCase()}` : "";
  doc.save(`grille-hebdomadaire${modeSuffix}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * 📄 Export PDF journalier professionnel (Broadcast SN+)
 * DESIGN: Style TV broadcast pro, lisible, adapté impression et envoi
 * 
 * @param programs Liste des programmes
 * @param day Jour de la semaine
 * @param exportMode Mode d'export : "STANDARD" | "REGIE" | "DIRECTION"
 * @param metadata Métadonnées optionnelles : { gridVersion, validatedAt, validatedBy, gridStatus }
 */
export async function exportDayToPdf(programs = [], day = "Lundi", exportMode = "STANDARD", metadata = {}) {
  let jsPDF, autoTableModule
  try {
    [jsPDF, autoTableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ])
  } catch (error) {
    console.error('Erreur chargement jsPDF:', error)
    throw new Error('Impossible de charger le module jsPDF. Vérifiez votre connexion internet.')
  }
  const jsPDFConstructor = jsPDF.jsPDF || jsPDF.default?.jsPDF || jsPDF.default || jsPDF
  const autoTable = autoTableModule.default || autoTableModule
  const doc = new jsPDFConstructor({
    orientation: "portrait",
    unit: "pt",
  });

  // === HEADER ===
  // DESIGN: Bandeau sobre, pas trop haut (agrandi pour métadonnées)
  const headerHeight = metadata.gridVersion || metadata.validatedBy ? 70 : 50;
  doc.setFillColor(245, 245, 245); // gris très clair
  doc.rect(0, 0, doc.internal.pageSize.width, headerHeight, "F");
  
  // DESIGN: Titre clair, hiérarchie visuelle forte
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text("Grille des Programmes — Broadcast SN+", 40, 32);

  // DESIGN: Sous-titre avec métadonnées
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const exportDate = new Date().toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  let subtitleY = 48;
  doc.text(`${day} — Exporté le ${exportDate}`, 40, subtitleY);
  
  // Métadonnées enrichies (si disponibles)
  if (metadata.gridVersion || metadata.validatedBy || metadata.validatedAt) {
    subtitleY += 12;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    
    const metaParts = [];
    if (metadata.gridVersion) {
      metaParts.push(`Version: ${metadata.gridVersion}`);
    }
    if (metadata.validatedAt) {
      const validatedDate = new Date(metadata.validatedAt).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      metaParts.push(`Validé le: ${validatedDate}`);
    }
    if (metadata.validatedBy) {
      metaParts.push(`Responsable: ${metadata.validatedBy}`);
    }
    if (metadata.gridStatus) {
      const statusLabels = {
        'DRAFT': 'Brouillon',
        'PUBLISHED': 'Publiée',
        'ARCHIVED': 'Archivée'
      };
      metaParts.push(`Statut: ${statusLabels[metadata.gridStatus] || metadata.gridStatus}`);
    }
    
    if (metaParts.length > 0) {
      doc.text(metaParts.join(" | "), 40, subtitleY);
    }
  }
  
  // Distinction visuelle pour les modes RÉGIE et DIRECTION
  if (exportMode === "REGIE") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38); // red-600
    doc.text("⚠️ MODE RÉGIE — NE PAS DIFFUSER", doc.internal.pageSize.width - 200, 32);
  } else if (exportMode === "DIRECTION") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(59, 130, 246); // blue-600
    doc.text("📊 MODE DIRECTION — DOCUMENT INTERNE", doc.internal.pageSize.width - 250, 32);
  }

  // === FILTRER LES PROGRAMMES DU JOUR ===
  const dayPrograms = programs.filter((p) => {
    const days = Array.isArray(p.days) ? p.days : [];
    // Normaliser les noms de jours pour la comparaison
    const normalizedDay = day.trim();
    return days.some(d => d.trim() === normalizedDay);
  });

  // Vérifier si des programmes ont été trouvés
  if (dayPrograms.length === 0) {
    console.warn(`Aucun programme trouvé pour le jour: ${day}`);
    // DESIGN: Message discret si aucun programme
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    doc.text(`Aucun programme programmé pour le ${day}`, 40, 100);
    doc.setFontSize(9);
    doc.text(`Total programmes disponibles: ${programs.length}`, 40, 115);
    
    // Footer
    const footerY = doc.internal.pageSize.height - 20;
    doc.setDrawColor(220, 220, 220);
    doc.line(40, footerY - 5, doc.internal.pageSize.width - 40, footerY - 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      "Document généré automatiquement — Broadcast SN+",
      40,
      footerY + 5
    );
    
    const dateStr = new Date().toISOString().slice(0, 10);
    const daySlug = day.toLowerCase().replace(/é/g, "e");
    doc.save(`grille-${daySlug}-${dateStr}.pdf`);
    return;
  }

  // === TABLEAU ===
  const rows = dayPrograms
    .map((program) => {
      const duration =
        Number.isFinite(program.duration) && program.duration > 0
          ? program.duration
          : 0;
      return {
        start: program.start || "00:00",
        end: program.end || "00:00",
        title: program.title || "Sans titre",
        category: program.category || "Autre",
        type: program.typeDiffusion || "Autre",
        duration,
        opStatus: program.opStatus || "PLANNED",
      };
    })
    .sort((a, b) => a.start.localeCompare(b.start));

  const body = rows.map((row) => {
    const typeColor = deriveTypeColor(row.type);
    const catColor = deriveCategoryColor(row.category);

    // Statut opérationnel avec couleur (conservé pour logique métier)
    const statusColors = {
      PLANNED: [148, 163, 184], // slate
      CONFIRMED: [59, 130, 246], // blue
      IN_PRODUCTION: [245, 158, 11], // amber
      READY: [16, 185, 129], // green
      ON_AIR: [239, 68, 68], // red
      DONE: [107, 114, 128], // gray
      CANCELED: [220, 38, 38], // red dark
      DELAYED: [245, 158, 11], // amber-500
      OVERRUN: [239, 68, 68], // red-500
      SKIPPED: [107, 114, 128], // gray-500
      MANUAL_OVERRIDE: [139, 92, 246], // violet-500
    };

    const statusLabels = {
      PLANNED: "Planifié",
      CONFIRMED: "Confirmé",
      IN_PRODUCTION: "En prod",
      READY: "Prêt",
      ON_AIR: "ON AIR",
      DONE: "Terminé",
      CANCELED: "Annulé",
      DELAYED: "En retard",
      OVERRUN: "Dépassement",
      SKIPPED: "Sauté",
      MANUAL_OVERRIDE: "Override",
    };

    const statusColor = statusColors[row.opStatus] || [148, 163, 184];
    const statusLabel = statusLabels[row.opStatus] || row.opStatus;

    // DESIGN: Horaire en gras léger, titre principal visuel
    return [
      {
        content: `${row.start} – ${row.end}`,
        styles: { fontStyle: "bold", fontSize: 9 },
      },
      row.title, // DESIGN: Titre = élément principal visuel
      {
        content: row.category,
        styles: { 
          textColor: [catColor[0], catColor[1], catColor[2]],
          fontSize: 9,
        },
      },
      {
        content: row.type,
        styles: { 
          textColor: [typeColor[0], typeColor[1], typeColor[2]],
          fontSize: 9,
        },
      },
      formatDuration(row.duration),
      {
        content: statusLabel,
        styles: { 
          textColor: [statusColor[0], statusColor[1], statusColor[2]],
          fontSize: 9,
        },
      },
    ];
  });

  autoTable(doc, {
    head: [["Horaire", "Programme", "Catégorie", "Type", "Durée", "Statut"]],
    body,
    startY: metadata.gridVersion || metadata.validatedBy ? 80 : 65,
    styles: {
      // DESIGN: Typographie claire, tailles recommandées
      fontSize: 9,
      font: "helvetica",
      cellPadding: { top: 8, right: 6, bottom: 8, left: 6 },
      lineColor: [220, 220, 220], // lignes discrètes
      textColor: [40, 40, 40],
      halign: "left",
      valign: "middle",
    },
    headStyles: {
      // DESIGN: En-tête discret, pas de couleur agressive
      fillColor: [60, 60, 60], // gris foncé sobre
      textColor: 255,
      fontStyle: "bold",
      fontSize: 10,
      font: "helvetica",
    },
    // DESIGN: Lignes alternées gris très clair
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { top: metadata.gridVersion || metadata.validatedBy ? 80 : 60, bottom: 60 },
    // DESIGN: Colonnes bien alignées, largeurs optimisées
    columnStyles: {
      0: { cellWidth: 90, halign: "center" }, // Horaire
      1: { cellWidth: "auto" }, // Programme (plus large)
      2: { cellWidth: 80 }, // Catégorie
      3: { cellWidth: 80 }, // Type
      4: { cellWidth: 70, halign: "center" }, // Durée
      5: { cellWidth: 80 }, // Statut
    },
    didDrawPage: (data) => {
      // DESIGN: Pagination discrète en bas de page
      const pageNumber = data.pageNumber;
      const totalPages = doc.internal.getNumberOfPages();
      const str = `Page ${pageNumber} / ${totalPages}`;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);
      doc.text(
        str,
        doc.internal.pageSize.width - data.settings.margin.right - 50,
        doc.internal.pageSize.height - 15
      );
    },
  });

  // === STATISTIQUES DU JOUR ===
  // Mode REGIE : pas de statistiques (focus sur horaire + titre uniquement)
  // Mode DIRECTION : statistiques complètes
  // Mode STANDARD : statistiques basiques
  // Initialiser statsY avec la position après le tableau (toujours nécessaire pour la légende)
  let statsY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 20 : 100;
  
  if (exportMode !== "REGIE") {
    // Vérifier si on a besoin d'une nouvelle page
    if (statsY > doc.internal.pageSize.height - 100) {
      doc.addPage();
      statsY = 40;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text("Statistiques", 40, statsY);

    const totalDuration = rows.reduce((sum, r) => sum + r.duration, 0);
    const totalPrograms = rows.length;
    const directCount = rows.filter(r => r.type === "Direct" || r.type === "LIVE").length;
    const replayCount = rows.filter(r => r.type === "Rediffusion" || r.type === "REPLAY").length;
    const onAirCount = rows.filter(r => r.opStatus === "ON_AIR" || r.opStatus === "AIRED").length;

    statsY += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Total programmes : ${totalPrograms}`, 50, statsY);
    statsY += 12;
    doc.text(`Durée totale : ${formatDuration(totalDuration)}`, 50, statsY);
    statsY += 12;
    doc.text(`Temps libre : ${formatDuration(24 * 60 - totalDuration)}`, 50, statsY);
    
    // Statistiques avancées pour mode DIRECTION
    if (exportMode === "DIRECTION") {
      statsY += 12;
      doc.text(`Directs : ${directCount}`, 50, statsY);
      statsY += 12;
      doc.text(`Rediffusions : ${replayCount}`, 50, statsY);
      statsY += 12;
      doc.text(`Programmes ON AIR : ${onAirCount}`, 50, statsY);
    }
  }

  // === LÉGENDE ===
  // DESIGN: Placée en fin de document, simple, pastilles petites
  let legendY = statsY + 20;
  
  // Vérifier si on a besoin d'une nouvelle page
  if (legendY > doc.internal.pageSize.height - 80) {
    doc.addPage();
    legendY = 40;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text("Légende", 40, legendY);

  const legends = [
    ["Direct", deriveTypeColor("Direct")],
    ["PAD", deriveTypeColor("PAD")],
    ["Rediffusion", deriveTypeColor("Rediffusion")],
    ["Replay", deriveTypeColor("Replay")],
    ["Spécial", deriveTypeColor("Spécial")],
  ];

  legendY += 10;
  let xPos = 40;
  legends.forEach(([label, color], index) => {
    // DESIGN: Pastilles petites + texte, disposition horizontale compacte
    doc.setFillColor(...color);
    doc.circle(xPos, legendY, 3, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(label, xPos + 8, legendY + 2);
    
    // Disposition horizontale avec espacement
    xPos += 60;
    if (xPos > doc.internal.pageSize.width - 100 && index < legends.length - 1) {
      xPos = 40;
      legendY += 15;
    }
  });

  // === WATERMARK ===
  if (exportMode === "REGIE") {
    addWatermark(doc, "NE PAS DIFFUSER", 0.15);
  }
  // Mode DIRECTION : pas de watermark (filigrane retiré)

  // === FOOTER ===
  addStandardFooter(doc, exportMode, metadata);

  // === SAVE ===
  const dateStr = new Date().toISOString().slice(0, 10);
  const daySlug = day.toLowerCase().replace(/é/g, "e");
  const modeSuffix = exportMode !== "STANDARD" ? `-${exportMode.toLowerCase()}` : "";
  doc.save(`grille-${daySlug}${modeSuffix}-${dateStr}.pdf`);
}

/**
 * 📺 Export PDF "RÉGIE ON AIR" — Version opérationnelle pour régie antenne
 * DESIGN: Priorité absolue au temps, mise en évidence ON AIR et DIRECT
 * Usage: Régisseur antenne, Chef d'antenne, Diffusion temps réel
 * 
 * @deprecated Utiliser exportDayToPdf avec exportMode="REGIE" à la place
 */
export async function exportDayToPdfRegieOnAir(programs = [], day = "Lundi") {
  return exportDayToPdf(programs, day, "REGIE");
}
