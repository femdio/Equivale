import PDFDocument from 'pdfkit';

const BRL = value =>
  value == null || !Number.isFinite(Number(value))
    ? 'Nao calculado'
    : new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(Number(value));

export async function generateReport(input, result, user) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 42,
    bufferPages: false,
    info: {
      Title: 'Equivale - Relatorio CLT x PJ',
      Author: 'Equivale'
    }
  });

  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const dark = '#19343f';
  const green = '#126b5d';
  const muted = '#647780';
  const left = 42;
  const right = 553;

  doc.rect(0, 0, 595, 92).fill(dark);
  doc.fillColor('#ffffff').font('Helvetica-Bold')
    .fontSize(25).text('equivale.', left, 30);
  doc.font('Helvetica').fontSize(10)
    .text('RELATORIO EXECUTIVO', 370, 42, {
      width: 180, align: 'right'
    });

  doc.fillColor(dark).font('Helvetica-Bold')
    .fontSize(19).text('Comparativo CLT x PJ', left, 113);

  doc.fillColor(muted).font('Helvetica').fontSize(9)
    .text(`Emitido em ${new Date().toLocaleDateString('pt-BR',
      {timeZone:'America/Sao_Paulo'})}`, left, 143);

  doc.text(`Usuario: ${user.name || 'Nao informado'}`, left, 158, {
    width: 490, ellipsis: true
  });

  const box = (x, y, label, value) => {
    doc.roundedRect(x, y, 246, 73, 9)
      .fill('#eaf4f0');
    doc.fillColor(muted).font('Helvetica')
      .fontSize(10).text(label, x + 14, y + 13, {
        width: 220
      });
    doc.fillColor(green).font('Helvetica-Bold')
      .fontSize(17).text(BRL(value), x + 14, y + 34, {
        width: 220
      });
  };

  const c = result.clt;
  const p = result.pj;
  const m = result.mei;

  const mei = input.meiEligibility === 'yes'
    && m.status === 'possivel';

  const net = mei ? m.net : p.netPJ;
  const taxes = mei ? m.das : p.das;

  box(42, 191, 'Referencia CLT mensal',
    c.monthlySpreadsheetNet);
  box(307, 191, 'Faturamento PJ mensal', p.offer);

  doc.fillColor(dark).font('Helvetica-Bold')
    .fontSize(13).text('Resumo financeiro', left, 286);

  let y = 313;
  const line = (label, value, strong = false) => {
    doc.fillColor(strong ? dark : '#455660')
      .font(strong ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(10).text(label, left, y, {width: 330});
    doc.fillColor(strong ? green : dark)
      .font(strong ? 'Helvetica-Bold' : 'Helvetica')
      .text(BRL(value), 380, y, {
        width: 171, align: 'right'
      });
    doc.moveTo(left, y + 18).lineTo(right, y + 18)
      .strokeColor('#e3e9e7').stroke();
    y += 31;
  };

  line('Salario bruto CLT', c.salary);
  line('Beneficios CLT mensais', c.benefits);
  line('INSS + IRRF CLT', c.inss + c.ir);
  line('Referencia economica CLT anual',
    c.annualSpreadsheetNet, true);
  line('Faturamento PJ mensal', p.offer);
  line(mei ? 'DAS MEI estimado' : 'DAS Simples estimado',
    taxes);
  if (!mei) {
    line('Contabilidade + despesas PJ',
      p.accountant + p.expenses);
    line('INSS + IRRF sobre pro-labore',
      p.inssPro + p.irPro);
  }
  line('Resultado PJ mensal estimado', net, true);

  const noteY = Math.max(y + 10, 615);
  doc.roundedRect(left, noteY, 511, 92, 8)
    .fill('#f4f6f6');
  doc.fillColor(dark).font('Helvetica-Bold')
    .fontSize(10).text('Premissas e observacoes',
      left + 13, noteY + 12);
  doc.fillColor(muted).font('Helvetica').fontSize(8.5)
    .text(
      `Regime simulado: ${mei ? 'MEI' : 'Simples Nacional - Anexo ' + p.annex}. ` +
      'Valores baseados nas informacoes fornecidas e nas premissas do simulador. ' +
      'O resultado nao representa enquadramento tributario confirmado. ' +
      'FGTS nao constitui dinheiro disponivel mensalmente. ' +
      '13o, ferias, INSS, IRRF e regime tributario exigem revisao profissional.',
      left + 13, noteY + 31, {
        width: 482, lineGap: 2
      }
    );

  doc.moveTo(left, 778).lineTo(right, 778)
    .strokeColor('#dce5e1').stroke();
  doc.fillColor(muted).fontSize(8)
    .text('Equivale | Simulacao informativa - nao substitui assessoria contabil.',
      left, 788, {width: 455});
  doc.text('1/1', 510, 788, {
    width: 42, align: 'right'
  });

  doc.end();
  return finished;
}
