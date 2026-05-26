export default class ComponenteInterruptor20A {
    constructor(appController) {
        this.app = appController;
        this.db = appController.dbManager;
        this.formatMoney = appController.formatMoney;
        
        // VALORES FIJOS (Duros)
        this.TOTAL_INTERRUPTORES = 432;      // 8 por columna × 54 columnas
        this.COSTO_TOTAL = 86400;            // $86,400
        this.COSTO_UNITARIO = 200.00;        // $200.00 c/u
        this.POR_COLUMNA = 8;                // 8 interruptores por columna
        this.TOTAL_COLUMNAS = 54;            // 54 columnas
    }

    getNombre() {
        return 'Interruptor 2x20A';
    }

    // ✅ Calcular costo de licencia OPEX total
    getCostoLicenciaTotal() {
        const licInterruptor20AAnual = 500; // Licencia anual por interruptor 2x20A (ajusta según tu OPEX_CONFIG)
        const factorMeses = this.app.state.meses.includes('all') ? 1 : (this.app.state.meses.length / 12);
        return (licInterruptor20AAnual * this.TOTAL_INTERRUPTORES * factorMeses);
    }

    // ✅ Calcular costo de licencia OPEX por unidad
    getCostoLicenciaPorUnidad() {
        const licInterruptor20AAnual = 500;
        const factorMeses = this.app.state.meses.includes('all') ? 1 : (this.app.state.meses.length / 12);
        return (licInterruptor20AAnual * factorMeses);
    }

    // ✅ Calcular costo de licencia OPEX por ubicación (8 unidades por columna)
    getCostoLicenciaPorUbicacion() {
        return this.getCostoLicenciaPorUnidad() * this.POR_COLUMNA;
    }

    getTotales(pantallas) {
        // VALORES FIJOS - no dependen de los datos
        return { 
            total: this.TOTAL_INTERRUPTORES,
            costoTotal: this.COSTO_TOTAL,
            costoUnitario: this.COSTO_UNITARIO,
            porColumna: this.POR_COLUMNA,
            totalColumnas: this.TOTAL_COLUMNAS
        };
    }

    renderFicha(totales) {
        // Calcular costos de licencia OPEX
        const costoLicenciaOPEX = this.getCostoLicenciaTotal();
        const costoLicenciaPorUnidad = this.getCostoLicenciaPorUnidad();

        return `
        <div style="font-size: 0.7rem; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">🔹 COMPONENTE</div>
        <div style="font-size: 1.6rem; font-weight: 900; color: #0f172a; margin-bottom: 25px; letter-spacing: -0.5px;">INTERRUPTOR 2x20A</div>
        
        <div style="display:flex; gap:12px; margin-bottom:25px;">
            <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('pastilla20A', 'global', 'todas', this)"
                 style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02); cursor:pointer; transition:all 0.2s ease;"
                 onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1)';" 
                 onmouseout="this.style.transform='none'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.02)';">
                <div style="font-size:0.65rem; color:#64748b; font-weight:800; display:flex; flex-direction:column; align-items:center; gap:6px; text-transform:uppercase;">
                    <span>🔹</span> Total
                </div>
                <div style="font-size:2rem; font-weight:900; color:#0f172a; margin-top:10px; line-height:1;">${totales.total}</div>
                <div style="font-size:0.6rem; color:#64748b; margin-top:4px;">8 por columna</div>
            </div>
            <div class="ficha-filter-card"
                 style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                <div style="font-size:0.65rem; color:#64748b; font-weight:800; display:flex; flex-direction:column; align-items:center; gap:6px; text-transform:uppercase;">
                    <span>💰</span> Costo Total CAPEX
                </div>
                <div style="font-size:1.3rem; font-weight:900; color:#6366f1; margin-top:10px; line-height:1;">${this.formatMoney(totales.costoTotal)}</div>
            </div>
            <div class="ficha-filter-card"
                 style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                <div style="font-size:0.65rem; color:#64748b; font-weight:800; display:flex; flex-direction:column; align-items:center; gap:6px; text-transform:uppercase;">
                    <span>🏗️</span> Por Columna
                </div>
                <div style="font-size:2rem; font-weight:900; color:#059669; margin-top:10px; line-height:1;">${totales.porColumna}</div>
                <div style="font-size:0.6rem; color:#64748b; margin-top:4px;">unidades</div>
            </div>
        </div>

        <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
            <div style="font-size:0.75rem; font-weight:900; color:#6366f1; margin-bottom:5px; text-transform:uppercase; display:flex; align-items:center; gap:8px; border-bottom:1px solid #e0e7ff; padding-bottom:10px;">
                <span>📋</span> DETALLE DEL COMPONENTE
            </div>
            <div class="ficha-filter-row" 
                 onclick="app.filtrarPorAtributo('pastilla20A', 'global', 'todas', this)" 
                 style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; cursor:pointer; transition:all 0.2s ease; border-bottom:1px solid #f1f5f9;">
                <div>
                    <div style="font-weight:900; color:#0f172a; font-size:0.95rem; margin-bottom:2px;">Cantidad Total</div>
                    <div style="font-size:0.75rem; color:#64748b;">8 interruptores 2x20A por columna</div>
                </div>
                <div style="font-weight:900; color:#0f172a; font-size:1.3rem;">${totales.total}</div>
            </div>
            <div class="ficha-filter-row" 
                 style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; border-bottom:1px solid #f1f5f9;">
                <div>
                    <div style="font-weight:900; color:#0f172a; font-size:0.95rem; margin-bottom:2px;">Columnas Cubiertas</div>
                    <div style="font-size:0.75rem; color:#64748b;">${totales.totalColumnas} columnas × ${totales.porColumna} = ${totales.total}</div>
                </div>
                <div style="font-weight:900; color:#059669; font-size:1.1rem;">${totales.totalColumnas}</div>
            </div>
            <div class="ficha-filter-row" 
                 style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; border-bottom:1px solid #f1f5f9;">
                <div>
                    <div style="font-weight:900; color:#0f172a; font-size:0.95rem; margin-bottom:2px;">Costo Unitario (CAPEX)</div>
                    <div style="font-size:0.75rem; color:#64748b;">Precio por interruptor</div>
                </div>
                <div style="font-weight:900; color:#6366f1; font-size:1.1rem;">${this.formatMoney(totales.costoUnitario)}</div>
            </div>
            <div class="ficha-filter-row" 
                 style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; border-bottom:1px solid #f1f5f9;">
                <div>
                    <div style="font-weight:900; color:#0f172a; font-size:0.95rem; margin-bottom:2px;">Costo Total (CAPEX)</div>
                    <div style="font-size:0.75rem; color:#64748b;">${totales.total} × ${this.formatMoney(totales.costoUnitario)}</div>
                </div>
                <div style="font-weight:900; color:#10b981; font-size:1.3rem;">${this.formatMoney(totales.costoTotal)}</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; border-bottom:1px solid #f1f5f9;">
                <div>
                    <div style="font-weight:900; color:#0f172a; font-size:0.95rem; margin-bottom:2px;">Licencia por Unidad (OPEX)</div>
                    <div style="font-size:0.75rem; color:#64748b;">Costo anual por interruptor</div>
                </div>
                <div style="font-weight:900; color:#8b5cf6; font-size:1.1rem;">${this.formatMoney(costoLicenciaPorUnidad)}</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; background:#eff6ff; border-radius:8px; margin-top:8px;">
                <div>
                    <div style="font-weight:900; color:#1e40af;">🌐 Licencia Total (OPEX)</div>
                    <div style="font-size:0.65rem; color:#60a5fa;">* Período: ${this.app.state.meses.includes('all') ? 'Consolidado Anual' : this.app.state.meses.join(', ')}</div>
                    <div style="font-size:0.6rem; color:#93c5fd; margin-top:2px;">${totales.total} unidades × ${this.formatMoney(costoLicenciaPorUnidad)}</div>
                </div>
                <div style="font-weight:900; color:#1d4ed8; font-size:1.3rem;">${this.formatMoney(costoLicenciaOPEX)}</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; background:#f0fdf4; border-radius:8px; margin-top:8px;">
                <div>
                    <div style="font-weight:900; color:#166534;">💰 TOTAL GENERAL (CAPEX + OPEX)</div>
                    <div style="font-size:0.65rem; color:#15803d;">Inversión + Licencias</div>
                </div>
                <div style="font-weight:900; color:#10b981; font-size:1.3rem;">${this.formatMoney(totales.costoTotal + costoLicenciaOPEX)}</div>
            </div>
        </div>

        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:12px 15px;">
            <div style="font-size:0.7rem; color:#1e40af; font-weight:700; display:flex; align-items:center; gap:6px;">
                <span>💡</span> 8 interruptores termomagnéticos 2x20A por columna. Total: ${totales.totalColumnas} columnas × ${totales.porColumna} = ${totales.total} unidades.
            </div>
        </div>
        `;
    }

    renderDetalleUbicacion(pantalla) {
        const dt = pantalla.datosTecnicos || {};
        const caras = Object.keys(dt);
        if (caras.length === 0) return '<div style="text-align:center; padding:15px; color:#94a3b8;">Sin datos</div>';
        
        const costoLicenciaPorUnidad = this.getCostoLicenciaPorUnidad();
        const costoLicenciaPorUbicacion = this.getCostoLicenciaPorUbicacion();
        const costoTotalUbicacion = (this.COSTO_UNITARIO * this.POR_COLUMNA) + costoLicenciaPorUbicacion;
        
        return caras.map(cara => {
            const c = dt[cara];
            const cantidad = c.interruptor20A || this.POR_COLUMNA;
            
            return `
            <div style="background:#f8fafc; padding:15px; border-radius:10px; margin-bottom:10px; border:1px solid #e2e8f0; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                <div style="font-weight:900; color:#0f172a; font-size:0.85rem; margin-bottom:10px; border-bottom:1px solid #e2e8f0; padding-bottom:8px;">
                    📐 CARA ${cara.toUpperCase()}
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.8rem;">
                    <div style="background:#fff; padding:10px; border-radius:8px; border:1px solid #f1f5f9;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:3px;">🔹 CANTIDAD</span>
                        <b style="color:#0f172a; font-size:1rem;">${cantidad}</b>
                    </div>
                    <div style="background:#fff; padding:10px; border-radius:8px; border:1px solid #f1f5f9;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:3px;">💰 COSTO CAPEX</span>
                        <b style="color:#6366f1; font-size:1rem;">${this.formatMoney(this.COSTO_UNITARIO)}</b>
                        <div style="font-size:0.55rem; color:#94a3b8;">por unidad</div>
                    </div>
                    <div style="background:#fff; padding:10px; border-radius:8px; border:1px solid #f1f5f9;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:3px;">💰 SUBTOTAL CAPEX</span>
                        <b style="color:#8b5cf6; font-size:1rem;">${this.formatMoney(this.COSTO_UNITARIO * cantidad)}</b>
                        <div style="font-size:0.55rem; color:#94a3b8;">${cantidad} × ${this.formatMoney(this.COSTO_UNITARIO)}</div>
                    </div>
                    <div style="background:#eff6ff; padding:10px; border-radius:8px; border:1px solid #bfdbfe;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:3px;">🌐 LICENCIA OPEX</span>
                        <b style="color:#1d4ed8; font-size:1rem;">${this.formatMoney(costoLicenciaPorUbicacion)}</b>
                        <div style="font-size:0.55rem; color:#60a5fa;">${cantidad} × ${this.formatMoney(costoLicenciaPorUnidad)}</div>
                    </div>
                    <div style="background:#f0fdf4; padding:10px; border-radius:8px; border:1px solid #bbf7d0;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:3px;">✅ ESTADO</span>
                        <b style="color:#10b981; font-size:0.9rem;">Óptimo</b>
                    </div>
                    <div style="background:#f0fdf4; padding:10px; border-radius:8px; border:1px solid #86efac; grid-column:1/-1;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:3px;">💵 TOTAL UBICACIÓN</span>
                        <b style="color:#10b981; font-size:1.1rem;">${this.formatMoney(costoTotalUbicacion)}</b>
                        <div style="font-size:0.6rem; color:#15803d; margin-top:2px;">(CAPEX + OPEX)</div>
                    </div>
                </div>
                <div style="margin-top:10px; font-size:0.65rem; color:#64748b; border-top:1px solid #e2e8f0; padding-top:8px;">
                    🔹 Interruptor termomagnético 2x20A - Protección individual por cara
                </div>
            </div>`;
        }).join('');
    }
}