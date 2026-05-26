export default class ComponenteManttoProfundo {
    constructor(appController) {
        this.app = appController;
        this.db = appController.dbManager;
        this.formatMoney = appController.formatMoney;
        
        this._mesesAnteriores = JSON.stringify(this.app.state.meses);
        this._interval = setInterval(() => {
            const mesesActuales = JSON.stringify(this.app.state.meses);
            if (mesesActuales !== this._mesesAnteriores) {
                this._mesesAnteriores = mesesActuales;
                if (this.app.state.componente === 'profundo') {
                    this.app.generarFichaDinamicaNativa('profundo', 3);
                }
            }
        }, 500);
    }

    getNombre() { return 'Mantenimiento Profundo'; }

    _normalizar(texto) {
        return (texto || '').toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
    }

    _esProfundo(actividad) {
        const act = this._normalizar(actividad);
        return act.includes('profundo');
    }

    getCostoPorPantalla(pantalla) {
        const mesesActivos = this.app.state.meses || ['all'];
        return this._calcularCostoPantalla(pantalla, mesesActivos);
    }

    _calcularCostoPantalla(pantalla, mesesActivos) {
        const tickets = pantalla.tickets || [];
        let total = 0;
        for (const ticket of tickets) {
            const mes = (ticket.mes || '').toLowerCase().trim();
            if ((mesesActivos.includes('all') || mesesActivos.includes(mes)) &&
                this._esProfundo(ticket.actividad || '')) {
                total += Number(ticket.costoManttoOriginal || ticket.total || 0);
            }
        }
        return total;
    }

    getTotales(pantallas, meses) {
        const mesesActivos = meses || this.app.state.meses || ['all'];
        let totalGasto = 0, totalIncidencias = 0;
        let columnasConGasto = new Set();
        let gastosPorColumna = {};
        let gastosPorMes = {};
        
        pantallas.forEach(p => {
            const costoTotal = this._calcularCostoPantalla(p, mesesActivos);
            if (costoTotal > 0) {
                columnasConGasto.add(p.id);
                totalGasto += costoTotal;
                if (!gastosPorColumna[p.id]) {
                    gastosPorColumna[p.id] = { id: p.id, nombre: p.nombre || '', total: 0, incidencias: 0 };
                }
                gastosPorColumna[p.id].total = costoTotal;
            }
            
            const tickets = p.tickets || [];
            tickets.forEach(ticket => {
                const mes = (ticket.mes || '').toLowerCase().trim();
                if ((mesesActivos.includes('all') || mesesActivos.includes(mes)) &&
                    this._esProfundo(ticket.actividad || '')) {
                    const valor = Number(ticket.costoManttoOriginal || ticket.total || 0);
                    totalIncidencias++;
                    if (gastosPorColumna[p.id]) {
                        gastosPorColumna[p.id].incidencias = (gastosPorColumna[p.id].incidencias || 0) + 1;
                    }
                    if (!gastosPorMes[mes]) gastosPorMes[mes] = 0;
                    gastosPorMes[mes] += valor;
                }
            });
        });

        const totalColumnas = columnasConGasto.size;
        const montoPorColumna = totalColumnas > 0 ? totalGasto / totalColumnas : 0;
        const cantidadMeses = mesesActivos.includes('all') ? 5 : mesesActivos.length;

        return {
            totalGasto, totalIncidencias, totalColumnas, montoPorColumna, gastosPorColumna, gastosPorMes,
            periodo: mesesActivos.includes('all') ? 'Enero - Mayo (Consolidado)' : mesesActivos.join(', '),
            mesesSeleccionados: cantidadMeses
        };
    }

    renderFicha(totales) {
        const mesesHTML = Object.keys(totales.gastosPorMes).sort().map(mes => `
            <div style="display:flex; justify-content:space-between; padding:10px 12px; background:#f8fafc; border-radius:6px; margin-bottom:4px;">
                <span style="text-transform:capitalize;">${mes}</span>
                <span style="font-weight:900; color:var(--theme-color);">${this.formatMoney(totales.gastosPorMes[mes])}</span>
            </div>`).join('') || '<div style="text-align:center; color:#94a3b8; padding:10px;">Sin datos</div>';

        return `
            <div style="font-size:0.7rem; color:#64748b; font-weight:800; text-transform:uppercase;">🔧 COMPONENTE</div>
            <div style="font-size:1.6rem; font-weight:900; color:#0f172a; margin-bottom:25px;">MANTTO. PROFUNDO</div>
            <div style="display:flex; gap:12px; margin-bottom:25px;">
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('profundo', 'global', 'todas', this)" style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; cursor:pointer;">
                    <div style="font-size:0.65rem; color:#64748b;">🔧 Gasto Total</div>
                    <div style="font-size:2rem; font-weight:900; color:#0f172a; margin-top:10px;">${this.formatMoney(totales.totalGasto)}</div>
                </div>
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('profundo', 'global', 'todas', this)" style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; cursor:pointer;">
                    <div style="font-size:0.65rem; color:#64748b;">🔢 Incidencias</div>
                    <div style="font-size:2rem; font-weight:900; color:#6366f1; margin-top:10px;">${totales.totalIncidencias}</div>
                </div>
                <div class="ficha-filter-card" style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff;">
                    <div style="font-size:0.65rem; color:#64748b;">📅 Meses</div>
                    <div style="font-size:2rem; font-weight:900; color:#10b981; margin-top:10px;">${totales.mesesSeleccionados}</div>
                </div>
            </div>
            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff;">
                <div style="font-weight:900; color:#f59e0b; margin-bottom:5px; text-transform:uppercase; border-bottom:1px solid #fef3c7; padding-bottom:10px;">📅 DESGLOSE POR MES</div>
                ${mesesHTML}
            </div>
            <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:12px 15px;">
                <div style="font-size:0.7rem; color:#1e40af;">💡 ${totales.periodo} | ${totales.totalIncidencias} incidencias en ${totales.totalColumnas} columnas</div>
            </div>`;
    }

    renderDetalleUbicacion(pantalla) {
        const mesesActuales = this.app.state.meses || ['all'];
        const tickets = pantalla.tickets || [];
        const filtrados = tickets.filter(t => {
            const mes = (t.mes || '').toLowerCase().trim();
            return this._esProfundo(t.actividad || '') && 
                   (mesesActuales.includes('all') || mesesActuales.includes(mes));
        });
        let total = 0;
        filtrados.forEach(t => { total += Number(t.costoManttoOriginal || t.total || 0); });

        return `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:15px;">
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:10px; margin-bottom:12px;">
                    <span style="font-weight:900;">🔧 Profundo - ${pantalla.id}</span>
                    <span style="background:#f0fdf4; color:#10b981; padding:3px 10px; border-radius:6px; font-size:0.65rem;">${filtrados.length} REGISTROS</span>
                </div>
                <div style="background:#f8fafc; padding:12px; border-radius:8px; text-align:center; margin-bottom:12px;">
                    <div style="font-size:1.5rem; font-weight:900; color:var(--theme-color);">${this.formatMoney(total)}</div>
                </div>
                ${filtrados.map(t => `
                    <div style="display:flex; justify-content:space-between; padding:8px 10px; background:#f8fafc; border-radius:6px; margin-bottom:4px;">
                        <div>
                            <span style="font-size:0.8rem; font-weight:600;">${t.actividad || 'N/D'}</span>
                            <div style="font-size:0.65rem; color:#64748b;">${t.mes || ''} | ${t.fechaCorta || ''}</div>
                        </div>
                        <span style="font-weight:900; color:var(--theme-color);">${this.formatMoney(Number(t.costoManttoOriginal || t.total || 0))}</span>
                    </div>`).join('')}
            </div>`;
    }
}