import { db } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Default certificate settings
const DEFAULT_CERT_SETTINGS = {
  certCompanyName: "RealCore Consulting GmbH",
  certCompanyStreet: "",
  certCompanyCity: "",
  certCompanyPhone: "",
  certCompanyWebsite: "",
  certCompanyLogo: "https://realcore.info/bilder/rc-logo.png",
  certCompanyIntro: "Die RealCore Consulting GmbH ist ein führendes Beratungsunternehmen im Bereich IT, mit einem besonderen Schwerpunkt auf der SAP-Technologie. Das Unternehmen unterstützt seine Kunden bei der Implementierung und Optimierung von SAP-Lösungen, um deren Geschäftsprozesse effizienter zu gestalten. Dabei legt RealCore besonderen Wert auf eine partnerschaftliche Zusammenarbeit und die Entwicklung maßgeschneiderter Lösungen, um den individuellen Anforderungen der Kunden gerecht zu werden. Ziel ist es, durch praxisorientierte Beratung und exzellente Expertise nachhaltige Erfolge und eine hohe Kundenzufriedenheit sicherzustellen.",
};

// Public endpoint for certificate settings (requires login, but not admin)
export async function GET() {
  try {
    await requireUser();
    
    const settings = await db.setting.findUnique({ where: { id: 1 } });
    
    // Return only certificate-related settings
    const certSettings = settings as typeof settings & {
      certCompanyName?: string;
      certCompanyStreet?: string;
      certCompanyCity?: string;
      certCompanyPhone?: string;
      certCompanyWebsite?: string;
      certCompanyLogo?: string;
      certCompanyIntro?: string;
    };
    
    return Response.json({
      certCompanyName: certSettings?.certCompanyName ?? DEFAULT_CERT_SETTINGS.certCompanyName,
      certCompanyStreet: certSettings?.certCompanyStreet ?? DEFAULT_CERT_SETTINGS.certCompanyStreet,
      certCompanyCity: certSettings?.certCompanyCity ?? DEFAULT_CERT_SETTINGS.certCompanyCity,
      certCompanyPhone: certSettings?.certCompanyPhone ?? DEFAULT_CERT_SETTINGS.certCompanyPhone,
      certCompanyWebsite: certSettings?.certCompanyWebsite ?? DEFAULT_CERT_SETTINGS.certCompanyWebsite,
      certCompanyLogo: certSettings?.certCompanyLogo ?? DEFAULT_CERT_SETTINGS.certCompanyLogo,
      certCompanyIntro: certSettings?.certCompanyIntro ?? DEFAULT_CERT_SETTINGS.certCompanyIntro,
    });
  } catch (e) {
    console.error("Error loading certificate settings:", e);
    // Return defaults if error
    return Response.json(DEFAULT_CERT_SETTINGS);
  }
}
