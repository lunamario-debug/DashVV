export default class ComponenteManttoTickets {
    constructor(appController) {
        this.app = appController;
        this.db = appController.dbManager;
        this.formatMoney = appController.formatMoney;
        
        this._mesesAnteriores = JSON.stringify(this.app.state.meses);
        this._interval = setInterval(() => {
            const mesesActuales = JSON.stringify(this.app.state.meses);
            if (mesesActuales !== this._mesesAnteriores) {
                this._mesesAnteriores = mesesActuales;
                if (this.app.state.componente === 'tickets') {
                    this.app.generarFichaDinamicaNativa('tickets', 2);
                }
            }
        }, 500);
    }

    getNombre() { return 'Incidencias Tickets'; }

    _esCorrectivo(actividad) {
        if (!actividad) return false;
        const act = actividad.toLowerCase().trim();
        return act !== '' && 
               !act.includes('pauta') &&
               !act.includes('estetico') && !act.includes('estético') &&
               !act.includes('manteniemiento') &&
               !act.includes('profundo') &&
               !act.includes('software') &&
               !act.includes('modificacion') &&
               !(act.includes('preventivo') && act.includes('limpieza'));
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
                this._esCorrectivo(ticket.actividad || '')) {
                total += Number(ticket.costoManttoOriginal || 0);
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
        let tiposIncidencia = {};
        
        pantallas.forEach(p => {
            const tickets = p.tickets || [];
            let costoPantalla = 0;
            let incidenciasPantalla = 0;
            
            tickets.forEach(ticket => {
                const mes = (ticket.mes || '').toLowerCase().trim();
                if ((mesesActivos.includes('all') || mesesActivos.includes(mes)) &&
                    this._esCorrectivo(ticket.actividad || '')) {
                    const valor = Number(ticket.costoManttoOriginal || 0);
                    if (valor > 0) {
                        costoPantalla += valor;
                        incidenciasPantalla++;
                        totalGasto += valor;
                        totalIncidencias++;
                        
                        if (!gastosPorMes[mes]) gastosPorMes[mes] = 0;
                        gastosPorMes[mes] += valor;
                        
                        const tipo = (ticket.actividad || '').trim();
                        if (!tiposIncidencia[tipo]) {
                            tiposIncidencia[tipo] = { cantidad: 0, total: 0 };
                        }
                        tiposIncidencia[tipo].cantidad++;
                        tiposIncidencia[tipo].total += valor;
                    }
                }
            });
            
            if (costoPantalla > 0) {
                columnasConGasto.add(p.id);
                gastosPorColumna[p.id] = {
                    id: p.id,
                    nombre: p.nombre || '',
                    total: costoPantalla,
                    incidencias: incidenciasPantalla
                };
            }
        });

        const totalColumnas = columnasConGasto.size;
        const montoPorColumna = totalColumnas > 0 ? totalGasto / totalColumnas : 0;
        const cantidadMeses = mesesActivos.includes('all') ? 5 : mesesActivos.length;

        return {
            totalGasto, totalIncidencias, totalColumnas, montoPorColumna, gastosPorColumna, gastosPorMes,
            tiposIncidencia,
            periodo: mesesActivos.includes('all') ? 'Enero - Mayo (Consolidado)' : mesesActivos.join(', '),
            mesesSeleccionados: cantidadMeses
        };
    }

    renderFicha(totales) {
        const tiposHTML = Object.entries(totales.tiposIncidencia)
            .sort((a, b) => b[1].cantidad - a[1].cantidad)
            .slice(0, 10)
            .map(([tipo, data]) => `
            <div class="ficha-filter-row" onclick="app.filtrarPorAtributo('tickets', 'global', 'todas', this)" 
                 style="display:flex; justify-content:space-between; padding:14px 12px; border-bottom:1px solid #f1f5f9; cursor:pointer;">
                <div>
                    <div style="font-weight:900; color:#0f172a; font-size:0.9rem;">${tipo}</div>
                    <div style="font-size:0.75rem; color:#64748b;">${data.cantidad} incidencia(s) | ${this.formatMoney(data.total)}</div>
                </div>
                <div style="font-weight:900; color:#ef4444; font-size:1.3rem;">${data.cantidad}</div>
            </div>`).join('') || '<div style="text-align:center; color:#94a3b8; padding:10px;">Sin datos</div>';

        return `
            <div style="font-size:0.7rem; color:#64748b; font-weight:800; text-transform:uppercase;">COMPONENTE</div>
            <div style="font-size:1.6rem; font-weight:900; color:#0f172a; margin-bottom:25px;">INCIDENCIAS TICKETS</div>
            <div style="display:flex; gap:12px; margin-bottom:25px;">
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('tickets', 'global', 'todas', this)" style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; cursor:pointer;">
                    <div style="font-size:0.65rem; color:#64748b;">Gasto Total</div>
                    <div style="font-size:2rem; font-weight:900; color:#0f172a; margin-top:10px;">${this.formatMoney(totales.totalGasto)}</div>
                </div>
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('tickets', 'global', 'todas', this)" style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; cursor:pointer;">
                    <div style="font-size:0.65rem; color:#64748b;">Incidencias</div>
                    <div style="font-size:2rem; font-weight:900; color:#ef4444; margin-top:10px;">${totales.totalIncidencias}</div>
                </div>
                <div class="ficha-filter-card" style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff;">
                    <div style="font-size:0.65rem; color:#64748b;">Meses</div>
                    <div style="font-size:2rem; font-weight:900; color:#10b981; margin-top:10px;">${totales.mesesSeleccionados}</div>
                </div>
            </div>
            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff;">
                <div style="font-weight:900; color:#ef4444; margin-bottom:5px; text-transform:uppercase; border-bottom:1px solid #fee2e2; padding-bottom:10px;">TIPOS DE INCIDENCIA</div>
                ${tiposHTML}
            </div>
            <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:12px 15px;">
                <div style="font-size:0.7rem; color:#991b1b;">${totales.periodo} | ${totales.totalIncidencias} incidencias correctivas</div>
            </div>`;
    }

    renderDetalleUbicacion(pantalla) {
        const mesesActuales = this.app.state.meses || ['all'];
        const tickets = pantalla.tickets || [];
        const filtrados = tickets.filter(t => {
            const mes = (t.mes || '').toLowerCase().trim();
            return this._esCorrectivo(t.actividad || '') && 
                   (mesesActuales.includes('all') || mesesActuales.includes(mes));
        });
        let total = 0;
        filtrados.forEach(t => { total += Number(t.costoManttoOriginal || 0); });

        return `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:15px;">
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:10px; margin-bottom:12px;">
                    <span style="font-weight:900;">Incidencias - ${pantalla.id}</span>
                    <span style="background:#fef2f2; color:#ef4444; padding:3px 10px; border-radius:6px; font-size:0.65rem;">${filtrados.length} TICKETS</span>
                </div>
                <div style="background:#f8fafc; padding:12px; border-radius:8px; text-align:center; margin-bottom:12px;">
                    <div style="font-size:0.7rem; color:#64748b;">Gasto Total</div>
                    <div style="font-size:1.5rem; font-weight:900; color:#ef4444;">${this.formatMoney(total)}</div>
                </div>
                ${filtrados.map(t => {
                    const insumo = t.insumo || '';
                    const refaccion = t.refaccion || '';
                    return `
                    <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:10px; margin-bottom:8px;">
                        <div style="font-weight:700; color:#991b1b; margin-bottom:4px;">${t.actividad || 'N/D'}</div>
                        <div style="font-size:0.7rem; color:#64748b;">
                            ${t.mes || ''} | ${t.fechaCorta || ''}
                            ${insumo !== 'NA' && insumo !== '' ? ' | Insumo: ' + insumo : ''}
                            ${refaccion !== 'NA' && refaccion !== '' ? ' | Refaccion: ' + refaccion : ''}
                        </div>
                        <div style="text-align:right; font-weight:900; color:#ef4444; margin-top:4px;">${this.formatMoney(Number(t.costoManttoOriginal || 0))}</div>
                    </div>`;
                }).join('')}
            </div>`;
    }
}