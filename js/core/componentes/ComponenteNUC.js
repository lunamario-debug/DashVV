export default class ComponenteNUC {
    constructor(appController) {
        this.app = appController;
        this.db = appController.dbManager;
        this.formatMoney = appController.formatMoney;
    }

    getNombre() { return 'NUC'; }

    // ✅ Costo real de la ubicación (suma de todas las caras)
    getCostoUbicacion(pantalla) {
        let costoTotal = 0;
        if (pantalla.carasVV) {
            Object.values(pantalla.carasVV).forEach(cara => {
                costoTotal += Number(cara.nuc) || 0;
            });
        } else if (pantalla.capex) {
            costoTotal = Number(pantalla.capex.nuc) || 0;
        }
        return costoTotal;
    }

    // ✅ Calcular costo total de licencia OPEX para NUC
    getCostoLicenciaTotal() {
        const licNUCAnual = 2500; // Licencia anual por NUC (ajusta según tu OPEX_CONFIG)
        const totalNUCs = 54; // Número total de NUCs en el sistema
        const factorMeses = this.app.state.meses.includes('all') ? 1 : (this.app.state.meses.length / 12);
        return (licNUCAnual * factorMeses) / totalNUCs;
    }

    getTotales(pantallas) {
        let total = 0, optimos = 0, vulnerables = 0, costoTotal = 0;
        let fabricantes = {};
        let modelos = {};
        let fechasInstalacion = {};
        let nucsVulnerables = [];

        pantallas.forEach(p => {
            const dt = p.datosTecnicos || {};
            Object.keys(dt).forEach(caraKey => {
                const cara = dt[caraKey];
                const fabricante = (cara.marca && cara.marca.trim()) ? cara.marca.trim() : null;
                const modelo = (cara.nucMarca && cara.nucMarca.trim()) ? cara.nucMarca.trim() : null;
                
                if (fabricante || modelo) {
                    total++;
                    
                    if (fabricante) {
                        fabricantes[fabricante] = (fabricantes[fabricante] || 0) + 1;
                    }
                    
                    if (modelo) {
                        modelos[modelo] = (modelos[modelo] || 0) + 1;
                    }

                    // Costo por cara
                    let costo = 0;
                    if (p.carasVV && p.carasVV[caraKey]) {
                        costo = Number(p.carasVV[caraKey].nuc) || 0;
                    } else if (p.capex && p.capex.nuc) {
                        costo = Number(p.capex.nuc) || 0;
                    }
                    costoTotal += costo;

                    const fechaInst = cara.nucFechaInstalacion || '';
                    if (fechaInst && fechaInst.trim()) {
                        const fecha = fechaInst.trim();
                        fechasInstalacion[fecha] = (fechasInstalacion[fecha] || 0) + 1;
                    }
                    
                    const estadoValor = cara.nucEstado || '';
                    if (estadoValor.toLowerCase().includes('optimo')) {
                        optimos++;
                    }
                    if (estadoValor.toLowerCase().includes('vulnerable')) {
                        vulnerables++;
                        nucsVulnerables.push({
                            id: p.id,
                            nombre: p.nombre,
                            fabricante: fabricante || 'N/D',
                            modelo: modelo || 'Nuc',
                            estado: 'Vulnerable',
                            fechaInstalacion: fechaInst || 'N/D'
                        });
                    }
                }
            });
        });

        const formatearAgrupacion = (obj) => {
            return Object.keys(obj)
                .map(key => ({ key, cantidad: obj[key] }))
                .sort((a, b) => b.cantidad - a.cantidad);
        };

        return { 
            total, 
            optimos, 
            vulnerables,
            costoTotal,
            fabricantes: formatearAgrupacion(fabricantes),
            modelos: formatearAgrupacion(modelos),
            fechasInstalacion: formatearAgrupacion(fechasInstalacion),
            nucsVulnerables
        };
    }

    renderFicha(totales) {
        const renderRow = (attr, colorHex, data, labelSingular, labelPlural) => {
            if (!data || data.length === 0) {
                return '<div style="text-align:center; color:#94a3b8; padding:10px; font-size:0.75rem;">Sin datos</div>';
            }
            return data.map((d, index) => `
                <div class="ficha-filter-row" 
                     onclick="app.filtrarPorAtributo('nuc', '${attr}', '${d.key.replace(/'/g, "\\'")}', this)" 
                     style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; border-bottom:${index === data.length - 1 ? 'none' : '1px solid #f1f5f9'}; cursor:pointer; transition:all 0.2s ease;">
                    <div>
                        <div style="font-weight:900; color:#0f172a; font-size:0.95rem; margin-bottom:2px;">${d.key}</div>
                        <div style="font-size:0.75rem; color:#64748b;">${d.cantidad} ${d.cantidad === 1 ? labelSingular : labelPlural}</div>
                    </div>
                    <div style="font-weight:900; color:${colorHex}; font-size:1.3rem;">${d.cantidad}</div>
                </div>
            `).join('');
        };

        const attrFabricante = 'marca';
        const attrFechaInstalacion = 'nucFechaInstalacion';

        // Calcular promedio de forma segura
        const promedio = totales.total > 0 ? totales.costoTotal / totales.total : 0;
        
        // Calcular costo de licencia OPEX
        const costoLicenciaOPEX = this.getCostoLicenciaTotal();

        return `
            <div style="font-size: 0.7rem; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">💻 COMPONENTE</div>
            <div style="font-size: 1.6rem; font-weight: 900; color: #0f172a; margin-bottom: 25px; letter-spacing: -0.5px;">NUC</div>
            
            <!-- TARJETAS DE RESUMEN -->
            <div style="display:flex; gap:12px; margin-bottom:25px;">
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('nuc', 'global', 'todas', this)"
                     style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02); cursor:pointer; transition:all 0.2s ease;"
                     onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1)';" 
                     onmouseout="this.style.transform='none'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.02)';">
                    <div style="font-size:0.65rem; color:#64748b; font-weight:800; display:flex; flex-direction:column; align-items:center; gap:6px; text-transform:uppercase;">
                        <span>💻</span> Total NUCs
                    </div>
                    <div style="font-size:2rem; font-weight:900; color:#0f172a; margin-top:10px; line-height:1;">${totales.total}</div>
                </div>
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('nuc', 'nucEstado', 'Optimo', this)"
                     style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02); cursor:pointer; transition:all 0.2s ease;"
                     onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1)';" 
                     onmouseout="this.style.transform='none'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.02)';">
                    <div style="font-size:0.65rem; color:#64748b; font-weight:800; display:flex; flex-direction:column; align-items:center; gap:6px; text-transform:uppercase;">
                        <span>✅</span> Óptimos
                    </div>
                    <div style="font-size:2rem; font-weight:900; color:#10b981; margin-top:10px; line-height:1;">${totales.optimos}</div>
                </div>
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('nuc', 'nucEstado', 'Vulnerable', this)"
                     style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02); cursor:pointer; transition:all 0.2s ease;"
                     onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1)';" 
                     onmouseout="this.style.transform='none'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.02)';">
                    <div style="font-size:0.65rem; color:#64748b; font-weight:800; display:flex; flex-direction:column; align-items:center; gap:6px; text-transform:uppercase;">
                        <span>⚠️</span> Vulnerables
                    </div>
                    <div style="font-size:2rem; font-weight:900; color:#d97706; margin-top:10px; line-height:1;">${totales.vulnerables}</div>
                </div>
            </div>

            <!-- FABRICANTE / PROCESADOR (Intel, Asus, Histoy Industrial, Mbox600PRO) -->
            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                <div style="font-size:0.75rem; font-weight:900; color:#6366f1; margin-bottom:5px; text-transform:uppercase; display:flex; align-items:center; gap:8px; border-bottom:1px solid #e0e7ff; padding-bottom:10px;">
                    <span>🏭</span> FABRICANTE / PROCESADOR
                </div>
                ${renderRow(attrFabricante, '#6366f1', totales.fabricantes, 'NUC', 'NUCs')}
            </div>

            <!-- MODELO (Nuc) -->
            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                <div style="font-size:0.75rem; font-weight:900; color:#059669; margin-bottom:5px; text-transform:uppercase; display:flex; align-items:center; gap:8px; border-bottom:1px solid #d1fae5; padding-bottom:10px;">
                    <span>💻</span> MODELO
                </div>
                ${renderRow('nucMarca', '#059669', totales.modelos, 'NUC', 'NUCs')}
            </div>

            <!-- FECHAS DE INSTALACIÓN -->
            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                <div style="font-size:0.75rem; font-weight:900; color:#f59e0b; margin-bottom:5px; text-transform:uppercase; display:flex; align-items:center; gap:8px; border-bottom:1px solid #fef3c7; padding-bottom:10px;">
                    <span>📅</span> FECHAS DE INSTALACIÓN
                </div>
                ${renderRow(attrFechaInstalacion, '#f59e0b', totales.fechasInstalacion, 'NUC', 'NUCs')}
            </div>

            <!-- SECCIÓN DE COSTOS -->
            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                <div style="font-size:0.75rem; font-weight:900; color:#0f172a; margin-bottom:5px; text-transform:uppercase; display:flex; align-items:center; gap:8px; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">
                    <span>💰</span> COSTOS
                </div>
                <div style="display:flex; justify-content:space-between; padding:14px 12px; border-bottom:1px solid #f1f5f9;">
                    <div><div style="font-weight:900;">Inversión Total (CAPEX)</div></div>
                    <div style="font-weight:900; color:var(--theme-color, #3b82f6); font-size:1.3rem;">${this.formatMoney(totales.costoTotal)}</div>
                </div>
                <div style="display:flex; justify-content:space-between; padding:14px 12px; border-bottom:1px solid #f1f5f9;">
                    <div><div style="font-weight:900;">Promedio por NUC (CAPEX)</div></div>
                    <div style="font-weight:900; color:#6366f1;">${this.formatMoney(promedio)}</div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; background:#eff6ff; border-radius:8px; margin-top:8px;">
                    <div>
                        <div style="font-weight:900; color:#1e40af;">🌐 Licencia NUC (OPEX)</div>
                        <div style="font-size:0.65rem; color:#60a5fa;">* Período: ${this.app.state.meses.includes('all') ? 'Consolidado Anual' : this.app.state.meses.join(', ')}</div>
                    </div>
                    <div style="font-weight:900; color:#1d4ed8; font-size:1.3rem;">${this.formatMoney(costoLicenciaOPEX)}</div>
                </div>
            </div>

            <!-- ESTADOS -->
            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                <div style="font-size:0.75rem; font-weight:900; color:#334155; margin-bottom:5px; text-transform:uppercase; display:flex; align-items:center; gap:8px; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">
                    <span>📊</span> ESTADOS
                </div>
                <div class="ficha-filter-row" 
                     onclick="app.filtrarPorAtributo('nuc', 'nucEstado', 'Optimo', this)" 
                     style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; cursor:pointer; transition:all 0.2s ease; border-bottom:1px solid #f1f5f9;">
                    <div>
                        <div style="font-weight:900; color:#0f172a; font-size:0.95rem; margin-bottom:2px;">Óptimos</div>
                        <div style="font-size:0.75rem; color:#64748b;">Dentro de vida útil</div>
                    </div>
                    <div style="font-weight:900; color:#10b981; font-size:1.3rem;">${totales.optimos}</div>
                </div>
                <div class="ficha-filter-row" 
                     onclick="app.filtrarPorAtributo('nuc', 'nucEstado', 'Vulnerable', this)" 
                     style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; cursor:pointer; transition:all 0.2s ease; border-bottom:none;">
                    <div>
                        <div style="font-weight:900; color:#0f172a; font-size:0.95rem; margin-bottom:2px;">Vulnerables</div>
                        <div style="font-size:0.75rem; color:#64748b;">Requieren atención</div>
                    </div>
                    <div style="font-weight:900; color:#d97706; font-size:1.3rem;">${totales.vulnerables}</div>
                </div>
            </div>
        `;
    }

    renderDetalleUbicacion(pantalla) {
        const dt = pantalla.datosTecnicos || {};
        const caras = Object.keys(dt);

        if (caras.length === 0) {
            return `<div style="text-align:center; color:#94a3b8; padding:30px;">⚠️ Sin datos de NUCs en esta ubicación</div>`;
        }

        let caraConDatos = null;
        for (let cara of caras) {
            const data = dt[cara];
            const fabricante = (data.marca && data.marca.trim()) ? data.marca.trim() : null;
            const modelo = (data.nucMarca && data.nucMarca.trim()) ? data.nucMarca.trim() : null;
            if (fabricante || modelo) {
                caraConDatos = cara;
                break;
            }
        }

        if (!caraConDatos) {
            return `<div style="text-align:center; color:#94a3b8; padding:30px;">⚠️ Sin datos de NUCs en esta ubicación</div>`;
        }

        const dataNUC = dt[caraConDatos];
        const fabricante = (dataNUC.marca && dataNUC.marca.trim()) ? dataNUC.marca.trim() : 'N/D';
        const modelo = (dataNUC.nucMarca && dataNUC.nucMarca.trim()) ? dataNUC.nucMarca.trim() : 'N/D';
        const estado = dataNUC.nucEstado || 'N/D';
        const fechaInstalacion = dataNUC.nucFechaInstalacion || 'N/D';
        
        // Obtener costo CAPEX
        let costoBase = 0;
        if (pantalla.carasVV && pantalla.carasVV[caraConDatos]) {
            costoBase = Number(pantalla.carasVV[caraConDatos].nuc) || 0;
        }
        const costoTotal = this.getCostoUbicacion(pantalla);
        
        const estadoLower = estado.toLowerCase();
        const esVulnerable = estadoLower.includes('vulnerable');
        const esOptimo = estadoLower.includes('optimo');
        
        const badgeColor = esOptimo ? '#f0fdf4' : esVulnerable ? '#fef3c7' : '#f8fafc';
        const badgeTextColor = esOptimo ? '#10b981' : esVulnerable ? '#d97706' : '#94a3b8';

        // Cálculo dinámico del costo OPEX (Licencia NUC)
        const licNUCAnual = 2500;
        const totalNUCs = 54;
        const factorMeses = this.app.state.meses.includes('all') ? 1 : (this.app.state.meses.length / 12);
        const costoLicenciaOPEX = (licNUCAnual * factorMeses) / totalNUCs;

        let vidaUtilHTML = '';
        if (esVulnerable) {
            vidaUtilHTML = `
                <div style="margin-top:12px; background:#fef3c7; border:1px solid #fcd34d; border-radius:8px; padding:12px;">
                    <div style="font-size:0.7rem; font-weight:800; color:#92400e; margin-bottom:8px;">⚠️ INFORMACIÓN DE VULNERABILIDAD</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.7rem;">
                        <div style="background:#fff; padding:8px; border-radius:6px;">
                            <span style="color:#64748b; font-size:0.6rem;">📅 Fecha Instalación</span><br>
                            <b style="color:#0f172a;">${fechaInstalacion}</b>
                        </div>
                        <div style="background:#fff; padding:8px; border-radius:6px;">
                            <span style="color:#64748b; font-size:0.6rem;">🏭 Fabricante</span><br>
                            <b style="color:#0f172a;">${fabricante}</b>
                        </div>
                        <div style="background:#fff; padding:8px; border-radius:6px; grid-column: 1 / -1;">
                            <span style="color:#64748b; font-size:0.6rem;">🔍 Estado</span><br>
                            <b style="color:#d97706;">VULNERABLE - Requiere revisión</b>
                        </div>
                    </div>
                </div>`;
        }

        return `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:15px; margin-bottom:15px; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:10px; margin-bottom:12px;">
                    <span style="font-weight:900; color:#0f172a; font-size:0.85rem; letter-spacing:0.5px;">NUC COMPARTIDO</span>
                    <span style="background:${badgeColor}; color:${badgeTextColor}; padding:3px 10px; border-radius:6px; font-size:0.65rem; font-weight:800; letter-spacing:0.5px;">${estado.toUpperCase()}</span>
                </div>
                <div style="font-size:0.7rem; color:#6366f1; font-weight:600; margin-bottom:12px; background:#e0e7ff; padding:6px 10px; border-radius:6px;">
                    🔗 Compartido entre CARA NORTE y CARA SUR
                </div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:0.8rem; color:#475569; margin-bottom:12px;">
                    <div style="background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #f1f5f9;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:2px;">🏭 FABRICANTE</span>
                        <b style="color:#6366f1; font-size:0.95rem;">${fabricante}</b>
                    </div>
                    <div style="background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #f1f5f9;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:2px;">💻 MODELO</span>
                        <b style="color:#059669; font-size:0.95rem;">${modelo}</b>
                    </div>
                    <div style="background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #f1f5f9;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:2px;">📅 INSTALACIÓN</span>
                        <b style="color:#f59e0b; font-size:0.95rem;">${fechaInstalacion}</b>
                    </div>
                    <div style="background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #f1f5f9;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:2px;">💰 COSTO (CAPEX)</span>
                        <b style="color:#3b82f6; font-size:0.95rem;">${this.formatMoney(costoBase)}</b>
                    </div>
                    <div style="background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #f1f5f9;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:2px;">📊 ESTADO</span>
                        <b style="color:${badgeTextColor}; font-size:0.95rem;">${estado}</b>
                    </div>
                    <div style="background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #f1f5f9;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:2px;">💵 TOTAL CAPEX</span>
                        <b style="color:var(--theme-color); font-size:0.95rem;">${this.formatMoney(costoTotal)}</b>
                    </div>
                </div>
                
                ${vidaUtilHTML}
                
                <!-- Tarjeta de Licencia NUC (OPEX) -->
                <div style="margin-top:12px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-weight:900; color:#1e40af; font-size:0.75rem;">🌐 LICENCIA NUC (OPEX)</span>
                        <span style="background:#dbeafe; color:#1e40af; padding:3px 8px; border-radius:6px; font-size:0.6rem; font-weight:800;">ACTIVA</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:#3b82f6; font-size:0.7rem; font-weight:600;">Costo proporcional asignado</span>
                        <b style="color:#1d4ed8; font-size:1rem; font-weight:900;">${this.formatMoney(costoLicenciaOPEX)}</b>
                    </div>
                    <div style="font-size:0.6rem; color:#60a5fa; margin-top:4px;">
                        * Período: ${this.app.state.meses.includes('all') ? 'Consolidado Anual' : this.app.state.meses.join(', ')}
                    </div>
                </div>
                
                ${esOptimo ? `
                <div style="margin-top:10px; background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:12px;">
                    <div style="font-size:0.7rem; font-weight:800; color:#166534; margin-bottom:4px;">✅ ESTADO ÓPTIMO</div>
                    <div style="font-size:0.65rem; color:#15803d;">El componente se encuentra dentro de su vida útil.</div>
                </div>` : ''}
            </div>`;
    }
}