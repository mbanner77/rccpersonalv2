import { db } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import React, { ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";

// Company logo URL
const COMPANY_LOGO = "https://realcore.info/bilder/rc-logo.png";

// PDF Styles - Professional German work certificate layout
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 60,
    fontSize: 11,
    lineHeight: 1.7,
    fontFamily: "Helvetica",
  },
  // Letterhead
  letterhead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#1a1a1a",
    borderBottomStyle: "solid",
  },
  logo: {
    width: 120,
    height: 40,
    objectFit: "contain",
  },
  companyInfo: {
    textAlign: "right",
    fontSize: 8,
    color: "#666",
    lineHeight: 1.4,
  },
  companyName: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 3,
  },
  // Title section
  titleSection: {
    marginTop: 30,
    marginBottom: 25,
    textAlign: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1a1a1a",
    letterSpacing: 1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#333",
  },
  // Employee info box
  employeeBox: {
    backgroundColor: "#f8f8f8",
    padding: 15,
    marginBottom: 25,
    borderLeftWidth: 3,
    borderLeftColor: "#1a1a1a",
    borderLeftStyle: "solid",
  },
  employeeLabel: {
    fontSize: 9,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  employeeDetails: {
    fontSize: 10,
    color: "#444",
    lineHeight: 1.5,
  },
  // Content
  content: {
    marginBottom: 20,
  },
  paragraph: {
    textAlign: "justify",
    marginBottom: 12,
    fontSize: 11,
    lineHeight: 1.7,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 40,
    left: 60,
    right: 60,
  },
  footerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  dateSection: {
    width: "45%",
  },
  dateLabel: {
    fontSize: 9,
    color: "#666",
    marginBottom: 5,
  },
  dateLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    borderBottomStyle: "solid",
    paddingBottom: 3,
    marginBottom: 3,
  },
  dateText: {
    fontSize: 10,
  },
  signatureSection: {
    width: "45%",
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    borderBottomStyle: "solid",
    marginBottom: 5,
    height: 40,
  },
  signatureLabel: {
    fontSize: 8,
    color: "#666",
    textAlign: "center",
  },
  // Page number
  pageNumber: {
    position: "absolute",
    bottom: 20,
    right: 60,
    fontSize: 8,
    color: "#999",
  },
  // Confidential mark
  confidential: {
    position: "absolute",
    top: 20,
    right: 60,
    fontSize: 8,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});

type CertificateData = {
  title: string | null;
  type: string;
  employeeName: string;
  jobTitle: string | null;
  startDate: Date;
  endDate: Date | null;
  issueDate: Date;
  fullContent: string | null;
};

// Helper to create the PDF document using React.createElement
function createPdfDocument(certificate: CertificateData): ReactElement<DocumentProps> {
  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatShortDate = (date: Date | null) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  };

  const typeLabels: Record<string, string> = {
    ZWISCHENZEUGNIS: "Zwischenzeugnis",
    ENDZEUGNIS: "Arbeitszeugnis",
    EINFACH: "Einfaches Arbeitszeugnis",
    QUALIFIZIERT: "Qualifiziertes Arbeitszeugnis",
  };

  const docTitle = certificate.title || typeLabels[certificate.type] || "Arbeitszeugnis";
  const paragraphs = (certificate.fullContent || "").split("\n\n").filter(Boolean);

  // Calculate employment duration
  const startDate = new Date(certificate.startDate);
  const endDate = certificate.endDate ? new Date(certificate.endDate) : new Date();
  const years = Math.floor((endDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const months = Math.floor(((endDate.getTime() - startDate.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
  const durationText = years > 0 
    ? `${years} Jahr${years !== 1 ? "e" : ""}${months > 0 ? ` und ${months} Monat${months !== 1 ? "e" : ""}` : ""}`
    : `${months} Monat${months !== 1 ? "e" : ""}`;

  // Build paragraph elements
  const paragraphElements = paragraphs.map((para, idx) =>
    React.createElement(Text, { key: idx, style: styles.paragraph }, para)
  );

  // Build the document structure
  return React.createElement(
    Document,
    { title: docTitle, author: "HR-Modul", subject: `Arbeitszeugnis für ${certificate.employeeName}` },
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      // Confidential mark
      React.createElement(Text, { style: styles.confidential }, "Vertraulich"),
      // Letterhead with logo and company info
      React.createElement(
        View,
        { style: styles.letterhead },
        React.createElement(Image, { style: styles.logo, src: COMPANY_LOGO }),
        React.createElement(
          View,
          { style: styles.companyInfo },
          React.createElement(Text, { style: styles.companyName }, "realcore GmbH"),
          React.createElement(Text, null, "Musterstraße 123"),
          React.createElement(Text, null, "12345 Musterstadt"),
          React.createElement(Text, null, "Tel: +49 123 456789"),
          React.createElement(Text, null, "www.realcore.de")
        )
      ),
      // Title
      React.createElement(
        View,
        { style: styles.titleSection },
        React.createElement(Text, { style: styles.title }, docTitle)
      ),
      // Employee info box
      React.createElement(
        View,
        { style: styles.employeeBox },
        React.createElement(Text, { style: styles.employeeLabel }, "Ausgestellt für"),
        React.createElement(Text, { style: styles.employeeName }, certificate.employeeName),
        React.createElement(
          Text,
          { style: styles.employeeDetails },
          certificate.jobTitle ? `Position: ${certificate.jobTitle}` : ""
        ),
        React.createElement(
          Text,
          { style: styles.employeeDetails },
          `Beschäftigungszeitraum: ${formatShortDate(certificate.startDate)} – ${certificate.endDate ? formatShortDate(certificate.endDate) : "heute"}`
        ),
        React.createElement(
          Text,
          { style: styles.employeeDetails },
          `Beschäftigungsdauer: ${durationText}`
        )
      ),
      // Content
      React.createElement(View, { style: styles.content }, ...paragraphElements),
      // Footer with date and signature
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(
          View,
          { style: styles.footerContent },
          // Date section
          React.createElement(
            View,
            { style: styles.dateSection },
            React.createElement(Text, { style: styles.dateLabel }, "Ort, Datum"),
            React.createElement(View, { style: styles.dateLine }),
            React.createElement(Text, { style: styles.dateText }, formatDate(certificate.issueDate))
          ),
          // Signature section
          React.createElement(
            View,
            { style: styles.signatureSection },
            React.createElement(View, { style: styles.signatureLine }),
            React.createElement(Text, { style: styles.signatureLabel }, "Geschäftsführung / Personalabteilung")
          )
        )
      ),
      // Page number
      React.createElement(
        Text,
        { style: styles.pageNumber, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Seite ${pageNumber} von ${totalPages}` },
        null
      )
    )
  ) as ReactElement<DocumentProps>;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    
    const { id } = await params;

    const certificate = await db.workCertificate.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        type: true,
        employeeName: true,
        jobTitle: true,
        startDate: true,
        endDate: true,
        issueDate: true,
        fullContent: true,
        status: true,
      },
    });

    if (!certificate) {
      return Response.json({ error: "Zeugnis nicht gefunden" }, { status: 404 });
    }

    if (!certificate.fullContent) {
      return Response.json(
        { error: "Zeugnis hat noch keinen Inhalt. Bitte zuerst generieren." },
        { status: 400 }
      );
    }

    // Generate PDF
    const pdfDocument = createPdfDocument(certificate);
    const pdfBuffer = await renderToBuffer(pdfDocument);

    // Create filename
    const filename = `Zeugnis_${certificate.employeeName.replace(/\s+/g, "_")}_${
      new Date().toISOString().slice(0, 10)
    }.pdf`;

    // Convert Buffer to Uint8Array for Response compatibility
    const uint8Array = new Uint8Array(pdfBuffer);

    return new Response(uint8Array, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("PDF generation error:", e);
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    return Response.json({ error: msg }, { status: 500 });
  }
}
