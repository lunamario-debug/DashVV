export default class ComponenteLicenciaTeamViewer {
    constructor(appController) {
        this.app = appController;
        this.db = appController.dbManager;
        this.formatMoney = appController.formatMoney;
    }

    getNombre() { return 'Licencia TeamViewer'; }

    _obtenerValor(gasto) {
        const claves = [
            'Licencia TeamViewer',
            'licTeamViewer',
            'LicenciaTeamViewer',
            'licencia_teamviewer',
            'Licencia teamviewer'
        ];
        for (const clave of claves) {
            if (gasto[clave] !== undefined) {
                const val = Number(gasto[clave]) || 0;
                if (val > 0) return val;
            }
        }
        for (const clave of Object.keys(gasto)) {
            const claveLower = clave.toLowerCase();
            if (claveLower.includes('teamviewer') && claveLower.includes('licencia')) {
                const val = Number(gasto[clave]) || 0;
                if (val > 0) return val;
            }
        }
        return 0;
    }

    getTotales(pantallas, meses) {
        const mesesActivos = meses || this.app.state.meses || ['all'];
        let totalGasto = 0;
        let columnasConGasto = new Set();
        let gastosPorColumna = {};
        let gastosPorMes = {};
        
        pantallas.forEach(p => {
            const gastosOperacion = p.gastosOperacion || [];
            gastosOperacion.forEach(gasto => {
                const mesGasto = (gasto.Mes || gasto.mes || '').toLowerCase().trim();
                if (mesesActivos.includes('all') || mesesActivos.includes(mesGasto)) {
                    const valor = this._obtenerValor(gasto);
                    if (valor > 0) {
                        totalGasto += valor;
                        columnasConGasto.add(p.id);
                        if (!gastosPorColumna[p.id]) {
                            gastosPorColumna[p.id] = { id: p.id, nombre: p.nombre || '', total: 0, meses: [] };
                        }
                        gastosPorColumna[p.id].total += valor;
                        gastosPorColumna[p.id].meses.push(mesGasto);
                        if (!gastosPorMes[mesGasto]) gastosPorMes[mesGasto] = 0;
                        gastosPorMes[mesGasto] += valor;
                    }
                }
            });
        });

        const totalColumnas = columnasConGasto.size;
        const montoPorColumna = totalColumnas > 0 ? totalGasto / totalColumnas : 0;
        const cantidadMeses = mesesActivos.includes('all') ? 5 : mesesActivos.length;

        return {
            totalGasto, totalColumnas, montoPorColumna, gastosPorColumna, gastosPorMes,
            periodo: mesesActivos.includes('all') ? 'Enero - Mayo (Consolidado)' : mesesActivos.join(', '),
            mesesSeleccionados: cantidadMeses, mesesActivos
        };
    }

    renderFicha(totales) {
        const mesesOrdenados = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const mesesHTML = Object.keys(totales.gastosPorMes)
            .sort((a,b) => mesesOrdenados.indexOf(a) - mesesOrdenados.indexOf(b))
            .map(mes => `
                <div class="ficha-filter-row" onclick="app.filtrarPorAtributo('licTeamViewer', 'mes', '${mes}', this)" 
                     style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#f8fafc; border-radius:6px; margin-bottom:4px; border:1px solid #f1f5f9; cursor:pointer;">
                    <span style="font-size:0.8rem; font-weight:600; color:#0f172a; text-transform:capitalize;">${mes}</span>
                    <span style="font-weight:900; color:var(--theme-color);">${this.formatMoney(totales.gastosPorMes[mes])}</span>
                </div>
            `).join('') || '<div style="text-align:center; color:#94a3b8; padding:10px;">Sin datos</div>';

        return `
            <div style="font-size:0.7rem; color:#64748b; font-weight:800; text-transform:uppercase; letter-spacing:1px;">🖥️ COMPONENTE</div>
            <div style="font-size:1.6rem; font-weight:900; color:#0f172a; margin-bottom:25px; letter-spacing:-0.5px;">LICENCIA TEAMVIEWER</div>
            
            <div style="display:flex; gap:12px; margin-bottom:25px;">
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('licTeamViewer', 'global', 'todas', this)"
                     style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; cursor:pointer;">
                    <div style="font-size:0.65rem; color:#64748b; font-weight:800;">🖥️ Gasto Total</div>
                    <div style="font-size:2rem; font-weight:900; color:#0f172a; margin-top:10px;">${this.formatMoney(totales.totalGasto)}</div>
                    <div style="font-size:0.6rem; color:#64748b; margin-top:4px;">${totales.periodo}</div>
                </div>
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('licTeamViewer', 'global', 'todas', this)"
                     style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; cursor:pointer;">
                    <div style="font-size:0.65rem; color:#64748b; font-weight:800;">🏢 Columnas</div>
                    <div style="font-size:2rem; font-weight:900; color:#6366f1; margin-top:10px;">${totales.totalColumnas}</div>
                    <div style="font-size:0.6rem; color:#64748b; margin-top:4px;">con gasto</div>
                </div>
                <div class="ficha-filter-card"
                     style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff;">
                    <div style="font-size:0.65rem; color:#64748b; font-weight:800;">📅 Meses</div>
                    <div style="font-size:2rem; font-weight:900; color:#10b981; margin-top:10px;">${totales.mesesSeleccionados}</div>
                    <div style="font-size:0.6rem; color:#64748b; margin-top:4px;">seleccionados</div>
                </div>
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff;">
                <div style="font-weight:900; color:#f59e0b; margin-bottom:5px; text-transform:uppercase; border-bottom:1px solid #fef3c7; padding-bottom:10px;">📅 DESGLOSE POR MES</div>
                ${mesesHTML}
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; background:#fff;">
                <div style="font-weight:900; color:#334155; margin-bottom:5px; text-transform:uppercase; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">📋 DETALLE</div>
                <div class="ficha-filter-row" onclick="app.filtrarPorAtributo('licTeamViewer', 'global', 'todas', this)" 
                     style="display:flex; justify-content:space-between; padding:14px 12px; cursor:pointer; border-bottom:1px solid #f1f5f9;">
                    <div><div style="font-weight:900;">Periodo</div></div>
                    <div style="font-weight:900; color:#10b981;">${totales.periodo}</div>
                </div>
                <div class="ficha-filter-row" onclick="app.filtrarPorAtributo('licTeamViewer', 'global', 'todas', this)" 
                     style="display:flex; justify-content:space-between; padding:14px 12px; cursor:pointer; border-bottom:none;">
                    <div><div style="font-weight:900;">Promedio por Columna</div></div>
                    <div style="font-weight:900; color:#6366f1;">${this.formatMoney(totales.montoPorColumna)}</div>
                </div>
            </div>

            <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:12px 15px; margin-top:15px;">
                <div style="font-size:0.7rem; color:#1e40af; font-weight:700;">💡 ${totales.periodo} | ${totales.totalColumnas} columnas con gasto.</div>
            </div>`;
    }

    renderDetalleUbicacion(pantalla) {
        const mesesActuales = this.app.state.meses;
        const gastosOperacion = pantalla.gastosOperacion || [];
        const gastosFiltrados = gastosOperacion.filter(g => {
            const mes = (g.Mes || g.mes || '').toLowerCase().trim();
            return mesesActuales.includes('all') || mesesActuales.includes(mes);
        });
        let total = 0;
        gastosFiltrados.forEach(g => { total += this._obtenerValor(g); });

        return `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:15px; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:10px; margin-bottom:12px;">
                    <span style="font-weight:900; color:#0f172a;">🖥️ Licencia TeamViewer - ${pantalla.id}</span>
                    <span style="background:#f0fdf4; color:#10b981; padding:3px 10px; border-radius:6px; font-size:0.65rem; font-weight:800;">${gastosFiltrados.length} MESES</span>
                </div>
                <div style="background:#f8fafc; padding:12px; border-radius:8px; text-align:center; margin-bottom:12px;">
                    <div style="font-size:0.7rem; color:#64748b;">Gasto Total</div>
                    <div style="font-size:1.5rem; font-weight:900; color:var(--theme-color);">${this.formatMoney(total)}</div>
                </div>
                ${gastosFiltrados.length > 0 ? `
                    <div style="font-size:0.7rem; font-weight:800; color:#64748b; margin-bottom:8px;">📅 DESGLOSE POR MES</div>
                    ${gastosFiltrados.map(g => {
                        const mes = g.Mes || g.mes || 'N/D';
                        const valor = this._obtenerValor(g);
                        return `
                        <div class="ficha-filter-row" onclick="app.filtrarPorAtributo('licTeamViewer', 'mes', '${mes}', this)" 
                             style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:#f8fafc; border-radius:6px; margin-bottom:4px; border:1px solid #f1f5f9; cursor:pointer;">
                            <span style="font-size:0.8rem; font-weight:600; color:#0f172a; text-transform:capitalize;">${mes}</span>
                            <span style="font-weight:900; color:var(--theme-color);">${this.formatMoney(valor)}</span>
                        </div>`;
                    }).join('')}
                ` : '<div style="text-align:center; color:#94a3b8; padding:10px;">Sin gastos en el periodo seleccionado</div>'}
            </div>`;
    }
}