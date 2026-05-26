export default class ComponenteCamara {
    constructor(appController) {
        this.app = appController;
        this.db = appController.dbManager;
        this.formatMoney = appController.formatMoney;
        
        // VALORES FIJOS
        this.TOTAL_CAMARAS = 103;        // 1 por cara
        this.COSTO_TOTAL = 618000;       // $618,000
        this.COSTO_UNITARIO = 6000;      // $6,000 c/u
    }

    getNombre() { return 'Cámara'; }

    // ✅ Calcular costo de licencia OPEX total
    getCostoLicenciaTotal() {
        const licCamaraAnual = 800; // Licencia anual por cámara (ajusta según tu OPEX_CONFIG)
        const factorMeses = this.app.state.meses.includes('all') ? 1 : (this.app.state.meses.length / 12);
        return (licCamaraAnual * this.TOTAL_CAMARAS * factorMeses);
    }

    // ✅ Calcular costo de licencia OPEX por unidad
    getCostoLicenciaPorUnidad() {
        const licCamaraAnual = 800;
        const factorMeses = this.app.state.meses.includes('all') ? 1 : (this.app.state.meses.length / 12);
        return (licCamaraAnual * factorMeses);
    }

    // ✅ Calcular costo de licencia OPEX por ubicación (1 cámara por cara)
    getCostoLicenciaPorUbicacion() {
        return this.getCostoLicenciaPorUnidad();
    }

    getTotales(pantallas) {
        // Leer estados reales del inventario técnico
        let optimos = 0;
        let vulnerables = 0;
        let sinDatos = 0;
        let modelos = {};
        
        pantallas.forEach(p => {
            const dt = p.datosTecnicos || {};
            Object.values(dt).forEach(cara => {
                if (cara.camara && cara.camara.trim()) {
                    const modelo = cara.camara.trim();
                    modelos[modelo] = (modelos[modelo] || 0) + 1;
                    
                    const estado = (cara.camaraEstado || '').toLowerCase().trim();
                    if (estado.includes('optimo') || estado.includes('óptimo')) {
                        optimos++;
                    } else if (estado.includes('vulnerable')) {
                        vulnerables++;
                    } else {
                        sinDatos++;
                    }
                }
            });
        });

        return { 
            total: this.TOTAL_CAMARAS,
            optimos, 
            vulnerables, 
            sinDatos,
            costoTotal: this.COSTO_TOTAL,
            costoUnitario: this.COSTO_UNITARIO,
            modelos 
        };
    }

    renderFicha(totales) {
        const modelosHTML = Object.keys(totales.modelos).length > 0 
            ? Object.keys(totales.modelos).map(m => `
                <div class="ficha-filter-row" 
                     onclick="app.filtrarPorAtributo('camara', 'camara', '${m}', this)" 
                     style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; cursor:pointer; transition:all 0.2s ease; border-bottom:1px solid #f1f5f9;">
                    <div>
                        <div style="font-weight:900; color:#0f172a; font-size:0.95rem; margin-bottom:2px;">${m}</div>
                        <div style="font-size:0.75rem; color:#64748b;">${totales.modelos[m]} ${totales.modelos[m] === 1 ? 'cámara' : 'cámaras'}</div>
                    </div>
                    <div style="font-weight:900; color:#6366f1; font-size:1.3rem;">${totales.modelos[m]}</div>
                </div>
            `).join('')
            : '<div style="text-align:center; color:#94a3b8; padding:15px;">Sin datos de modelos</div>';

        const porcentajeVulnerables = totales.total > 0 ? Math.round((totales.vulnerables / totales.total) * 100) : 0;
        const costoLicenciaOPEX = this.getCostoLicenciaTotal();
        const costoLicenciaPorUnidad = this.getCostoLicenciaPorUnidad();

        return `
        <div style="font-size: 0.7rem; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">📷 COMPONENTE</div>
        <div style="font-size: 1.6rem; font-weight: 900; color: #0f172a; margin-bottom: 25px; letter-spacing: -0.5px;">CÁMARA</div>
        
        <div style="display:flex; gap:12px; margin-bottom:25px;">
            <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('camara', 'global', 'todas', this)"
                 style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02); cursor:pointer; transition:all 0.2s ease;"
                 onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1)';" 
                 onmouseout="this.style.transform='none'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.02)';">
                <div style="font-size:0.65rem; color:#64748b; font-weight:800; display:flex; flex-direction:column; align-items:center; gap:6px; text-transform:uppercase;">
                    <span>📷</span> Total
                </div>
                <div style="font-size:2rem; font-weight:900; color:#0f172a; margin-top:10px; line-height:1;">${totales.total}</div>
                <div style="font-size:0.6rem; color:#64748b; margin-top:4px;">1 por cara</div>
            </div>
            <div class="ficha-filter-card"
                 style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                <div style="font-size:0.65rem; color:#64748b; font-weight:800; display:flex; flex-direction:column; align-items:center; gap:6px; text-transform:uppercase;">
                    <span>💰</span> Costo Total CAPEX
                </div>
                <div style="font-size:1.3rem; font-weight:900; color:#6366f1; margin-top:10px; line-height:1;">${this.formatMoney(totales.costoTotal)}</div>
            </div>
            <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('camara', 'camaraEstado', 'Vulnerable', this)"
                 style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02); cursor:pointer; transition:all 0.2s ease;"
                 onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1)';" 
                 onmouseout="this.style.transform='none'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.02)';">
                <div style="font-size:0.65rem; color:#64748b; font-weight:800; display:flex; flex-direction:column; align-items:center; gap:6px; text-transform:uppercase;">
                    <span>⚠️</span> Vulnerables
                </div>
                <div style="font-size:2rem; font-weight:900; color:#d97706; margin-top:10px; line-height:1;">${totales.vulnerables}</div>
                <div style="font-size:0.6rem; color:#d97706; margin-top:4px;">${porcentajeVulnerables}%</div>
            </div>
        </div>

        <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
            <div style="font-size:0.75rem; font-weight:900; color:#6366f1; margin-bottom:5px; text-transform:uppercase; display:flex; align-items:center; gap:8px; border-bottom:1px solid #e0e7ff; padding-bottom:10px;">
                <span>📷</span> MODELOS
            </div>
            ${modelosHTML}
        </div>

        <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
            <div style="font-size:0.75rem; font-weight:900; color:#334155; margin-bottom:5px; text-transform:uppercase; display:flex; align-items:center; gap:8px; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">
                <span>📋</span> DETALLE DE COSTOS
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; border-bottom:1px solid #f1f5f9;">
                <div>
                    <div style="font-weight:900; color:#0f172a; font-size:0.95rem; margin-bottom:2px;">Cantidad Total</div>
                    <div style="font-size:0.75rem; color:#64748b;">1 cámara por cara</div>
                </div>
                <div style="font-weight:900; color:#0f172a; font-size:1.3rem;">${totales.total}</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; border-bottom:1px solid #f1f5f9;">
                <div>
                    <div style="font-weight:900; color:#0f172a; font-size:0.95rem; margin-bottom:2px;">Costo Unitario (CAPEX)</div>
                    <div style="font-size:0.75rem; color:#64748b;">Hikvision DS-2CD2643G2</div>
                </div>
                <div style="font-weight:900; color:#6366f1; font-size:1.1rem;">${this.formatMoney(totales.costoUnitario)}</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; border-bottom:1px solid #f1f5f9;">
                <div>
                    <div style="font-weight:900; color:#0f172a; font-size:0.95rem; margin-bottom:2px;">Licencia por Unidad (OPEX)</div>
                    <div style="font-size:0.75rem; color:#64748b;">Costo anual por cámara</div>
                </div>
                <div style="font-weight:900; color:#8b5cf6; font-size:1.1rem;">${this.formatMoney(costoLicenciaPorUnidad)}</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; border-bottom:1px solid #f1f5f9;">
                <div>
                    <div style="font-weight:900; color:#0f172a; font-size:0.95rem; margin-bottom:2px;">Costo Total (CAPEX)</div>
                    <div style="font-size:0.75rem; color:#64748b;">${totales.total} × ${this.formatMoney(totales.costoUnitario)}</div>
                </div>
                <div style="font-weight:900; color:#10b981; font-size:1.3rem;">${this.formatMoney(totales.costoTotal)}</div>
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
        `;
    }

    renderDetalleUbicacion(pantalla) {
        const dt = pantalla.datosTecnicos || {};
        const caras = Object.keys(dt);
        if (caras.length === 0) return '<div style="text-align:center; padding:15px; color:#94a3b8;">Sin datos</div>';
        
        const costoLicenciaPorUbicacion = this.getCostoLicenciaPorUbicacion();
        const costoTotalUbicacion = this.COSTO_UNITARIO + costoLicenciaPorUbicacion;
        
        return caras.map(cara => {
            const c = dt[cara];
            const modelo = c.camara || 'N/D';
            const estado = c.camaraEstado || 'N/D';
            const estadoLower = estado.toLowerCase();
            const color = estadoLower.includes('optimo') ? '#10b981' : estadoLower.includes('vulnerable') ? '#d97706' : '#94a3b8';
            const badgeBg = estadoLower.includes('optimo') ? '#f0fdf4' : estadoLower.includes('vulnerable') ? '#fef3c7' : '#f8fafc';
            
            return `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:15px; margin-bottom:10px; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                    <span style="font-weight:900; color:#0f172a; font-size:0.85rem;">📐 CARA ${cara.toUpperCase()}</span>
                    <span style="background:${badgeBg}; color:${color}; padding:3px 10px; border-radius:6px; font-size:0.65rem; font-weight:800;">${estado.toUpperCase()}</span>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.8rem;">
                    <div style="background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #f1f5f9;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:3px;">📷 MODELO</span>
                        <b style="color:#0f172a; font-size:0.9rem;">${modelo}</b>
                    </div>
                    <div style="background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #f1f5f9;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:3px;">💰 COSTO CAPEX</span>
                        <b style="color:#6366f1; font-size:0.9rem;">${this.formatMoney(this.COSTO_UNITARIO)}</b>
                    </div>
                    <div style="background:#eff6ff; padding:10px; border-radius:8px; border:1px solid #bfdbfe;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:3px;">🌐 LICENCIA OPEX</span>
                        <b style="color:#1d4ed8; font-size:0.9rem;">${this.formatMoney(costoLicenciaPorUbicacion)}</b>
                    </div>
                    <div style="background:#f0fdf4; padding:10px; border-radius:8px; border:1px solid #bbf7d0;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:3px;">💵 TOTAL UBICACIÓN</span>
                        <b style="color:#10b981; font-size:0.9rem;">${this.formatMoney(costoTotalUbicacion)}</b>
                        <div style="font-size:0.55rem; color:#15803d;">(CAPEX + OPEX)</div>
                    </div>
                </div>
            </div>`;
        }).join('');
    }
}