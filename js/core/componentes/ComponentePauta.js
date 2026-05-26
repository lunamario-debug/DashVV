export default class ComponentePauta {
    constructor(appController) {
        this.app = appController;
        this.db = appController.dbManager;
        this.formatMoney = appController.formatMoney;
        
        // Detectar cambios en meses y refrescar el componente
        this._mesesAnteriores = JSON.stringify(this.app.state.meses);
        this._interval = setInterval(() => {
            const mesesActuales = JSON.stringify(this.app.state.meses);
            if (mesesActuales !== this._mesesAnteriores) {
                this._mesesAnteriores = mesesActuales;
                const key = this.app.state.componente;
                if (key === 'pauta') {
                    this.app.generarFichaDinamicaNativa(key, 3);
                }
            }
        }, 500);
    }

    getNombre() { return 'Programación de Pauta'; }

    // Obtiene el valor de la propiedad 'pauta'
    _obtenerValor(gasto) {
        if (gasto && gasto.pauta !== undefined && gasto.pauta !== null) {
            return Number(gasto.pauta) || 0;
        }
        for (const key of Object.keys(gasto)) {
            if (key.toLowerCase().includes('pauta')) {
                return Number(gasto[key]) || 0;
            }
        }
        return 0;
    }

    // Cálculo unificado: suma los valores de pauta de una pantalla filtrando por meses activos
    _calcularCostoPantalla(pantalla, mesesActivos) {
        const gastos = pantalla.gastosOperacion || [];
        let total = 0;
        for (const gasto of gastos) {
            const mes = (gasto.mes || '').toLowerCase().trim();
            if (mesesActivos.includes('all') || mesesActivos.includes(mes)) {
                const valor = this._obtenerValor(gasto);
                total += valor;
            }
        }
        return total;
    }

    // Método que AppController llama para mostrar el costo en la lista de ubicaciones
    getCostoPorPantalla(pantalla) {
        const mesesActivos = this.app.state.meses || ['all'];
        return this._calcularCostoPantalla(pantalla, mesesActivos);
    }

    // Totales generales (ficha principal)
    getTotales(pantallas, meses) {
        const mesesActivos = meses || this.app.state.meses || ['all'];
        let totalGasto = 0;
        let columnasConGasto = new Set();
        let gastosPorMes = {};
        let gastosPorColumna = {}; // Desglose por columna

        const ordenMeses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

        for (const p of pantallas) {
            const costo = this._calcularCostoPantalla(p, mesesActivos);
            if (costo > 0) {
                totalGasto += costo;
                columnasConGasto.add(p.id);
                gastosPorColumna[p.id] = costo; // Guardar costo individual
            }
            // Acumular por mes (desglose)
            const gastos = p.gastosOperacion || [];
            for (const gasto of gastos) {
                const mes = (gasto.mes || '').toLowerCase().trim();
                if (mesesActivos.includes('all') || mesesActivos.includes(mes)) {
                    const valor = this._obtenerValor(gasto);
                    if (valor > 0) {
                        gastosPorMes[mes] = (gastosPorMes[mes] || 0) + valor;
                    }
                }
            }
        }

        const totalColumnas = columnasConGasto.size;
        const montoPorColumna = totalColumnas > 0 ? totalGasto / totalColumnas : 0;
        const cantidadMeses = Object.keys(gastosPorMes).length;

        const gastosPorMesOrdenado = {};
        Object.keys(gastosPorMes)
            .sort((a, b) => ordenMeses.indexOf(a) - ordenMeses.indexOf(b))
            .forEach(mes => { gastosPorMesOrdenado[mes] = gastosPorMes[mes]; });

        const periodo = mesesActivos.includes('all') ? 'Enero - Mayo (Consolidado)' : mesesActivos.join(', ');

        return {
            totalGasto,
            totalColumnas,
            montoPorColumna,
            gastosPorMes: gastosPorMesOrdenado,
            gastosPorColumna, // Incluir desglose por columna
            periodo,
            mesesSeleccionados: cantidadMeses,
            mesesActivos
        };
    }

    renderFicha(totales) {
        const mesesHTML = Object.keys(totales.gastosPorMes).map(mes => `
            <div class="ficha-filter-row" onclick="app.filtrarPorAtributo('pauta', 'mes', '${mes}', this)" 
                 style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#f8fafc; border-radius:6px; margin-bottom:4px; border:1px solid #f1f5f9; cursor:pointer;">
                <span style="font-size:0.8rem; font-weight:600; color:#0f172a; text-transform:capitalize;">${mes}</span>
                <span style="font-weight:900; color:var(--theme-color);">${this.formatMoney(totales.gastosPorMes[mes])}</span>
            </div>
        `).join('');

        return `
            <div style="font-size:0.7rem; color:#64748b; font-weight:800; text-transform:uppercase; letter-spacing:1px;">📺 COMPONENTE</div>
            <div style="font-size:1.6rem; font-weight:900; color:#0f172a; margin-bottom:25px; letter-spacing:-0.5px;">PROGRAMACIÓN DE PAUTA</div>
            
            <div style="display:flex; gap:12px; margin-bottom:25px;">
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('pauta', 'global', 'todas', this)" 
                     style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; cursor:pointer;">
                    <div style="font-size:0.65rem; color:#64748b; font-weight:800;">📺 Gasto Total</div>
                    <div style="font-size:2rem; font-weight:900; color:#0f172a; margin-top:10px;">${this.formatMoney(totales.totalGasto)}</div>
                    <div style="font-size:0.6rem; color:#64748b; margin-top:4px;">${totales.periodo}</div>
                </div>
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('pauta', 'global', 'todas', this)" 
                     style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; cursor:pointer;">
                    <div style="font-size:0.65rem; color:#64748b; font-weight:800;">🏢 Columnas</div>
                    <div style="font-size:2rem; font-weight:900; color:#6366f1; margin-top:10px;">${totales.totalColumnas}</div>
                    <div style="font-size:0.6rem; color:#64748b; margin-top:4px;">con gasto</div>
                </div>
                <div class="ficha-filter-card"
                     style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff;">
                    <div style="font-size:0.65rem; color:#64748b; font-weight:800;">📅 Meses</div>
                    <div style="font-size:2rem; font-weight:900; color:#10b981; margin-top:10px;">${totales.mesesSeleccionados}</div>
                    <div style="font-size:0.6rem; color:#64748b; margin-top:4px;">con datos</div>
                </div>
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff;">
                <div style="font-weight:900; color:#f59e0b; margin-bottom:5px; text-transform:uppercase; border-bottom:1px solid #fef3c7; padding-bottom:10px;">📅 DESGLOSE POR MES</div>
                ${mesesHTML}
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; background:#fff;">
                <div style="font-weight:900; color:#334155; margin-bottom:5px; text-transform:uppercase; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">📋 DETALLE</div>
                <div class="ficha-filter-row" onclick="app.filtrarPorAtributo('pauta', 'global', 'todas', this)" 
                     style="display:flex; justify-content:space-between; padding:14px 12px; cursor:pointer; border-bottom:1px solid #f1f5f9;">
                    <div><div style="font-weight:900;">Periodo</div></div>
                    <div style="font-weight:900; color:#10b981;">${totales.periodo}</div>
                </div>
                <div class="ficha-filter-row" onclick="app.filtrarPorAtributo('pauta', 'global', 'todas', this)" 
                     style="display:flex; justify-content:space-between; padding:14px 12px; cursor:pointer; border-bottom:none;">
                    <div><div style="font-weight:900;">Promedio por Columna</div></div>
                    <div style="font-weight:900; color:#6366f1;">${this.formatMoney(totales.montoPorColumna)}</div>
                </div>
            </div>

            <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:12px 15px; margin-top:15px;">
                <div style="font-size:0.7rem; color:#1e40af; font-weight:700;">💡 ${totales.periodo} | ${totales.totalColumnas} columnas con gasto de pauta.</div>
            </div>`;
    }

    renderDetalleUbicacion(pantalla) {
        const mesesActuales = this.app.state.meses || ['all'];
        // Calcular el costo real
        const costo = this._calcularCostoPantalla(pantalla, mesesActuales);

        // Desglose por mes
        const gastos = pantalla.gastosOperacion || [];
        const gastosPorMes = {};
        for (const g of gastos) {
            const mes = (g.mes || '').toLowerCase().trim();
            if (mesesActuales.includes('all') || mesesActuales.includes(mes)) {
                const valor = this._obtenerValor(g);
                if (valor > 0) {
                    gastosPorMes[mes] = (gastosPorMes[mes] || 0) + valor;
                }
            }
        }

        const ordenMeses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const mesesConDatos = Object.keys(gastosPorMes).sort((a, b) => ordenMeses.indexOf(a) - ordenMeses.indexOf(b));

        return `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:15px; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:10px; margin-bottom:12px;">
                    <span style="font-weight:900; color:#0f172a;">📺 Programacion de Pauta - ${pantalla.id}</span>
                    <span style="background:#f0fdf4; color:#10b981; padding:3px 10px; border-radius:6px; font-size:0.65rem; font-weight:800;">${mesesConDatos.length} MESES</span>
                </div>
                <div style="background:#f8fafc; padding:12px; border-radius:8px; text-align:center; margin-bottom:12px;">
                    <div style="font-size:0.7rem; color:#64748b;">Gasto Total Pauta</div>
                    <div style="font-size:1.5rem; font-weight:900; color:var(--theme-color);">${this.formatMoney(costo)}</div>
                </div>
                ${mesesConDatos.length > 0 ? `
                    <div style="font-size:0.7rem; font-weight:800; color:#64748b; margin-bottom:8px;">📅 DESGLOSE POR MES</div>
                    ${mesesConDatos.map(mes => `
                        <div class="ficha-filter-row" onclick="app.filtrarPorAtributo('pauta', 'mes', '${mes}', this)" 
                             style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:#f8fafc; border-radius:6px; margin-bottom:4px; border:1px solid #f1f5f9; cursor:pointer;">
                            <span style="font-size:0.8rem; font-weight:600; color:#0f172a; text-transform:capitalize;">${mes}</span>
                            <span style="font-weight:900; color:var(--theme-color);">${this.formatMoney(gastosPorMes[mes])}</span>
                        </div>
                    `).join('')}
                ` : '<div style="text-align:center; color:#94a3b8; padding:10px;">Sin gastos de pauta en el periodo seleccionado</div>'}
            </div>`;
    }
}