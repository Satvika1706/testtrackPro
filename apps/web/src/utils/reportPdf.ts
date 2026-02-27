export const exportElementAsPdf = async (
  title: string,
  element: HTMLElement
) => {
  const printWindow = window.open("", "_blank", "width=1200,height=900");
  if (!printWindow) {
    throw new Error("Unable to open print window");
  }

  const style = `
    body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
    h1, h2, h3 { margin: 0 0 12px 0; }
    .pdf-header { margin-bottom: 16px; }
    .pdf-meta { font-size: 12px; color: #334155; margin-bottom: 16px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
    .kpi-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; }
    .kpi-label { font-size: 12px; color: #475569; margin-bottom: 4px; }
    .kpi-value { font-size: 18px; font-weight: bold; }
    .report-chart-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
    .chart-shell { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 8px; page-break-inside: avoid; }
    .chart-shell h3 { margin-bottom: 8px; font-size: 15px; }
    .table-wrap { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; page-break-inside: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f8fafc; }
    .report-section { margin-bottom: 16px; }
    .ellipsis-cell { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; }
    @media print { .page-break { page-break-before: always; } }
  `;

  printWindow.document.open();
  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>${style}</style>
      </head>
      <body>${element.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();

  await new Promise((resolve) => setTimeout(resolve, 500));
  printWindow.focus();
  printWindow.print();
};
