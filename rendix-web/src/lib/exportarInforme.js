import { fmtCLP, fmtDate } from '../theme';

// Arma un CSV (se abre directo en Excel) con todos los gastos de un proyecto,
// y dispara la descarga en el navegador.
export function descargarInformeCSV(proyecto, gastos) {
  const encabezado = ['Comercio', 'Fecha', 'Monto', 'Tipo de documento', 'Estado'];

  const filas = gastos.map((g) => [
    g.comercio || 'Sin identificar',
    g.fecha ? fmtDate(g.fecha) : 'Sin fecha',
    g.monto,
    g.tipo_documento || '—',
    g.estado === 'confirmado' ? 'Confirmado' : 'Diferido',
  ]);

  const totalGastado = gastos.reduce((sum, g) => sum + (Number(g.monto) || 0), 0);

  const lineas = [
    [`Informe de rendición — ${proyecto.nombre}`],
    [`Cliente: ${proyecto.cliente || '—'}`],
    [`Presupuesto: ${fmtCLP(proyecto.presupuesto)}`],
    [`Total gastado: ${fmtCLP(totalGastado)}`],
    [`Saldo disponible: ${fmtCLP(proyecto.presupuesto - totalGastado)}`],
    [],
    encabezado,
    ...filas,
  ];

  const csv = lineas
    .map((fila) => fila.map((celda) => `"${String(celda).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Informe - ${proyecto.nombre}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}