import * as XLSX from "xlsx";

export async function GET() {
  const headers = [
    "Name, Vorname",
    "Nachname",
    "Eintrittsdatum",
    "Geburtstag",
    "E-Mail",
  ];
  const sample = [
    {
      "Name, Vorname": "Mustermann, Max",
      Nachname: "Mustermann",
      Eintrittsdatum: "01.01.20",
      Geburtstag: "31.12.90",
      "E-Mail": "",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sample, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Mitarbeiter");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    status: 200,
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": "attachment; filename=employee_template.xlsx",
      "cache-control": "no-store",
    },
  });
}
