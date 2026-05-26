export default class ComponenteOPEXBase {
    constructor(appController, config) {
        this.app = appController;
        this.db = appController.dbManager;
        this.formatMoney = appController.formatMoney;
        this.config = config;
    }

    getNombre() { return this.config.label; }

    /**
     * Busca el valor en el objeto gasto probando múltiples nombres de columna
     */
    _obtenerValor(gasto) {
        // Lista de TODAS las claves posibles a probar
        const clavesAProbar = [
            this.config.columnaCSV,
            this.config.key,
            this.config.columnaCSV?.replace(/\s+/g, ''),
            this.config.columnaCSV?.toLowerCase(),
            this.config.columnaCSV?.toLowerCase()?.replace(/\s+/g, ''),
            this.config.label,
            this.config.label?.replace(/\s+/g, ''),
        ].filter(Boolean); // Eliminar null/undefined

        // Intentar con las claves exactas
        for (const clave of clavesAProbar) {
            if (gasto[clave] !== undefined) {
                const val = Number(gasto[clave]) || 0;
                if (val > 0) return val;
            }
        }

        // Búsqueda por coincidencia parcial en TODAS las claves del objeto
        const clavesGasto = Object.keys(gasto);
        const palabraClave = this.config.label?.toLowerCase()?.split(' ')[0] || '';
        
        for (const clave of clavesGasto) {
            if (clave.toLowerCase().includes(palabraClave) || 
                clave.toLowerCase().includes(this.config.key?.toLowerCase() || '')) {
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
                            gastosPorColumna[p.id] = { 
                                id: p.id, 
                                nombre: p.nombre || '', 
                                total: 0, 
                                meses: [] 
                            };
                        }
                        gastosPorColumna[p.id].total += valor;
                        gastosPorColumna[p.id].meses.push(mesGasto);
                        
                        if (!gastosPorMes[mesGasto]) gastosPorMes[mesGasto] = 0;
                        gastosPorMes[mesGasto] += valor;
                    }
                }
            });
        });

        const totalColumnas = columnasConGasto.size || 54;
        const montoPorColumna = totalColumnas > 0 ? totalGasto / totalColumnas : 0;
        const cantidadMeses = mesesActivos.includes('all') ? 5 : mesesActivos.length;

        return {
            totalGasto,
            totalColumnas,
            montoPorColumna,
            gastosPorColumna,
            gastosPorMes,
            periodo: mesesActivos.includes('all') ? 'Enero - Mayo (Consolidado)' : mesesActivos.join(', '),
            mesesSeleccionados: cantidadMeses,
            mesesActivos
        };
    }

    renderFicha(totales) {
        // Rangos de gasto por columna
        const rangos = {};
        Object.values(totales.gastosPorColumna).forEach(col => {
            let rango;
            if (col.total === 0) rango = 'Sin gasto';
            else if (col.total <= 500) rango = '$1 - $500';
            else if (col.total <= 2000) rango = '$501 - $2,000';
            else if (col.total <= 5000) rango = '$2,001 - $5,000';
            else if (col.total <= 20000) rango = '$5,001 - $20,000';
            else rango = 'Más de $20,000';
            
            if (!rangos[rango]) rangos[rango] = { cantidad: 0, columnas: [] };
            rangos[rango].cantidad++;
            rangos[rango].columnas.push(col.id);
        });

        const rangosHTML = Object.keys(rangos).sort().map(rango => `
            <div class="ficha-filter-row" onclick="app.filtrarPorAtributo('${this.config.key}', 'global', 'todas', this)" 
                 style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; border-bottom:1px solid #f1f5f9; cursor:pointer; transition:all 0.2s ease;">
                <div>
                    <div style="font-weight:900; color:#0f172a; font-size:0.95rem; margin-bottom:2px;">${rango}</div>
                    <div style="font-size:0.75rem; color:#64748b;">${rangos[rango].cantidad} columna(s)</div>
                </div>
                <div style="font-weight:900; color:#6366f1; font-size:1.3rem;">${rangos[rango].cantidad}</div>
            </div>
        `).join('') || '<div style="text-align:center; color:#94a3b8; padding:10px;">Sin datos en este periodo</div>';

        // Desglose por mes
        const mesesHTML = Object.keys(totales.gastosPorMes).sort().map(mes => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#f8fafc; border-radius:6px; margin-bottom:4px; border:1px solid #f1f5f9;">
                <span style="font-size:0.8rem; font-weight:600; color:#0f172a; text-transform:capitalize;">${mes}</span>
                <span style="font-weight:900; color:var(--theme-color);">${this.formatMoney(totales.gastosPorMes[mes])}</span>
            </div>
        `).join('') || '<div style="text-align:center; color:#94a3b8; padding:10px;">Sin datos</div>';

        return `
            <div style="font-size:0.7rem; color:#64748b; font-weight:800; text-transform:uppercase; letter-spacing:1px;">${this.config.icono} COMPONENTE</div>
            <div style="font-size:1.6rem; font-weight:900; color:#0f172a; margin-bottom:25px; letter-spacing:-0.5px;">${this.config.label.toUpperCase()}</div>
            
            <div style="display:flex; gap:12px; margin-bottom:25px;">
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('${this.config.key}', 'global', 'todas', this)"
                     style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02); cursor:pointer; transition:all 0.2s ease;"
                     onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1)';" 
                     onmouseout="this.style.transform='none'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.02)';">
                    <div style="font-size:0.65rem; color:#64748b; font-weight:800; display:flex; flex-direction:column; align-items:center; gap:6px; text-transform:uppercase;">
                        <span>💰</span> Gasto Total
                    </div>
                    <div style="font-size:2rem; font-weight:900; color:#0f172a; margin-top:10px; line-height:1;">${this.formatMoney(totales.totalGasto)}</div>
                    <div style="font-size:0.6rem; color:#64748b; margin-top:4px;">${totales.periodo}</div>
                </div>
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('${this.config.key}', 'global', 'todas', this)"
                     style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02); cursor:pointer; transition:all 0.2s ease;"
                     onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1)';" 
                     onmouseout="this.style.transform='none'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.02)';">
                    <div style="font-size:0.65rem; color:#64748b; font-weight:800; display:flex; flex-direction:column; align-items:center; gap:6px; text-transform:uppercase;">
                        <span>🏢</span> Columnas
                    </div>
                    <div style="font-size:2rem; font-weight:900; color:#6366f1; margin-top:10px; line-height:1;">${totales.totalColumnas}</div>
                    <div style="font-size:0.6rem; color:#64748b; margin-top:4px;">con gasto</div>
                </div>
                <div class="ficha-filter-card"
                     style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                    <div style="font-size:0.65rem; color:#64748b; font-weight:800; display:flex; flex-direction:column; align-items:center; gap:6px; text-transform:uppercase;">
                        <span>📅</span> Meses
                    </div>
                    <div style="font-size:2rem; font-weight:900; color:#10b981; margin-top:10px; line-height:1;">${totales.mesesSeleccionados}</div>
                    <div style="font-size:0.6rem; color:#64748b; margin-top:4px;">seleccionados</div>
                </div>
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                <div style="font-size:0.75rem; font-weight:900; color:#6366f1; margin-bottom:5px; text-transform:uppercase; display:flex; align-items:center; gap:8px; border-bottom:1px solid #e0e7ff; padding-bottom:10px;">
                    <span>📊</span> DISTRIBUCIÓN DE GASTOS
                </div>
                ${rangosHTML}
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                <div style="font-size:0.75rem; font-weight:900; color:#334155; margin-bottom:5px; text-transform:uppercase; display:flex; align-items:center; gap:8px; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">
                    <span>📋</span> DETALLE
                </div>
                <div class="ficha-filter-row" onclick="app.filtrarPorAtributo('${this.config.key}', 'global', 'todas', this)" 
                     style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; cursor:pointer; border-bottom:1px solid #f1f5f9;">
                    <div><div style="font-weight:900; color:#0f172a;">Periodo</div></div>
                    <div style="font-weight:900; color:#10b981;">${totales.periodo}</div>
                </div>
                <div class="ficha-filter-row" onclick="app.filtrarPorAtributo('${this.config.key}', 'global', 'todas', this)" 
                     style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; cursor:pointer; border-bottom:1px solid #f1f5f9;">
                    <div><div style="font-weight:900; color:#0f172a;">Gasto Total</div></div>
                    <div style="font-weight:900; color:#0f172a;">${this.formatMoney(totales.totalGasto)}</div>
                </div>
                <div class="ficha-filter-row" onclick="app.filtrarPorAtributo('${this.config.key}', 'global', 'todas', this)" 
                     style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; cursor:pointer; border-bottom:none;">
                    <div><div style="font-weight:900; color:#0f172a;">Promedio por Columna</div></div>
                    <div style="font-weight:900; color:#6366f1;">${this.formatMoney(totales.montoPorColumna)}</div>
                </div>
            </div>

            <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:12px 15px; margin-top:15px;">
                <div style="font-size:0.7rem; color:#1e40af; font-weight:700; display:flex; align-items:center; gap:6px;">
                    <span>💡</span> Gastos reales según operacion_viaverde.csv. ${totales.mesesSeleccionados} mes(es) seleccionado(s).
                </div>
            </div>
        `;
    }

    renderDetalleUbicacion(pantalla) {
        const mesesActuales = this.app.state.meses;
        const gastosOperacion = pantalla.gastosOperacion || [];
        
        const gastosFiltrados = gastosOperacion.filter(g => {
            const mes = (g.Mes || g.mes || '').toLowerCase().trim();
            return mesesActuales.includes('all') || mesesActuales.includes(mes);
        });
        
        let total = 0;
        gastosFiltrados.forEach(g => { 
            total += this._obtenerValor(g); 
        });

        return `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:15px; margin-bottom:15px; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:10px; margin-bottom:12px;">
                    <span style="font-weight:900; color:#0f172a; font-size:0.85rem;">${this.config.icono} ${this.config.label} - ${pantalla.id}</span>
                    <span style="background:#f0fdf4; color:#10b981; padding:3px 10px; border-radius:6px; font-size:0.65rem; font-weight:800;">${gastosFiltrados.length} MESES</span>
                </div>
                
                <div style="background:#f8fafc; padding:12px; border-radius:8px; text-align:center; margin-bottom:12px;">
                    <div style="font-size:0.7rem; color:#64748b;">Gasto Total</div>
                    <div style="font-size:1.5rem; font-weight:900; color:var(--theme-color);">${this.formatMoney(total)}</div>
                    <div style="font-size:0.65rem; color:#64748b; margin-top:4px;">${mesesActuales.includes('all') ? 'Ene-May' : mesesActuales.join(', ')}</div>
                </div>
                
                ${gastosFiltrados.length > 0 ? `
                    <div style="font-size:0.7rem; font-weight:800; color:#64748b; margin-bottom:8px;">📅 DESGLOSE POR MES</div>
                    ${gastosFiltrados.map(g => {
                        const mes = g.Mes || g.mes || 'N/D';
                        const valor = this._obtenerValor(g);
                        return `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:#f8fafc; border-radius:6px; margin-bottom:4px; border:1px solid #f1f5f9;">
                                <span style="font-size:0.8rem; font-weight:600; color:#0f172a; text-transform:capitalize;">${mes}</span>
                                <span style="font-weight:900; color:var(--theme-color);">${this.formatMoney(valor)}</span>
                            </div>
                        `;
                    }).join('')}
                ` : '<div style="text-align:center; color:#94a3b8; padding:10px;">Sin gastos en el periodo seleccionado</div>'}
                
                <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:10px; margin-top:12px;">
                    <div style="font-size:0.7rem; color:#1e40af; font-weight:600;">
                        💡 Gastos reales de ${this.config.label} para esta columna según los meses seleccionados.
                    </div>
                </div>
            </div>`;
    }
}