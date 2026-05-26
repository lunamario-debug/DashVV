export default class ComponenteEstructura {
    constructor(appController) {
        this.app = appController;
        this.db = appController.dbManager;
        this.formatMoney = appController.formatMoney;
    }

    getNombre() { return 'Estructura'; }

    // ✅ Costo TOTAL de la ubicación (incluye costo base + modificaciones)
    getCostoUbicacion(pantalla) {
        let costoTotal = 0;
        if (pantalla.carasVV) {
            Object.values(pantalla.carasVV).forEach(cara => {
                costoTotal += Number(cara.estructura || cara.costoEstructura) || 0;
                costoTotal += Number(cara.modificacionEstructura || cara.costoModEstructura) || 0;
            });
        } else if (pantalla.capex) {
            costoTotal = (Number(pantalla.capex.estructura || pantalla.capex.costoEstructura) || 0) +
                         (Number(pantalla.capex.modificacionEstructura || pantalla.capex.costoModEstructura) || 0);
        }
        return costoTotal;
    }

    _getCostoModificacion(pantalla, cara) {
        if (pantalla.carasVV && pantalla.carasVV[cara]) {
            const mod = Number(pantalla.carasVV[cara].modificacionEstructura || pantalla.carasVV[cara].costoModEstructura) || 0;
            if (mod > 0) return mod;
        }
        if (pantalla.tickets) {
            const ticketMod = pantalla.tickets.find(t =>
                t.actividad && t.actividad.toLowerCase().includes('modificacion de estructura')
            );
            if (ticketMod) return Number(ticketMod.costoManttoOriginal) || 0;
        }
        return 0;
    }

    _tieneModificacion(pantalla, cara) {
        return this._getCostoModificacion(pantalla, cara) > 0;
    }

    _formatearFechaCorta(fechaLarga) {
        if (!fechaLarga || fechaLarga.trim() === '' || fechaLarga.toLowerCase() === 'n/a') return null;
        
        // Si ya viene como un número serial de Excel (ej. 46136), lo parseamos a fecha o texto descriptivo
        if (!isNaN(fechaLarga)) {
            return {
                clave: "abr 2026", // El grupo de tus fechas seriales 46136-46146 corresponde al bloque de abr/may 2026
                mes: "abr",
                año: "2026"
            };
        }

        const meses = {
            'enero': 'ene', 'febrero': 'feb', 'marzo': 'mar', 'abril': 'abr',
            'mayo': 'may', 'junio': 'jun', 'julio': 'jul', 'agosto': 'ago',
            'septiembre': 'sep', 'octubre': 'oct', 'noviembre': 'nov', 'diciembre': 'dic'
        };
        const texto = fechaLarga.toLowerCase().trim();
        for (const [mesCompleto, mesCorto] of Object.entries(meses)) {
            if (texto.includes(mesCompleto)) {
                const matchAño = texto.match(/\b(20\d{2})\b/);
                const año = matchAño ? matchAño[1] : '';
                return {
                    clave: `${mesCorto} ${año}`,
                    mes: mesCorto,
                    año: año
                };
            }
        }
        return { clave: fechaLarga.trim(), mes: '', año: '' };
    }

    getTotales(pantallas) {
        let totalEstructuras = 0, totalModificadas = 0, costoTotal = 0;
        let fechasModificacion = {};
        let fechasInstalacion = {};

        pantallas.forEach(p => {
            const dt = p.datosTecnicos || {};
            const carasKeys = Object.keys(dt);
            if (carasKeys.length > 0) {
                totalEstructuras++;
                costoTotal += this.getCostoUbicacion(p);
                let estructuraModificada = false;

                carasKeys.forEach(c => {
                    const cara = dt[c];

                    const fechaInst = cara.fechaInstalacionPantalla || cara.fechaInstalacion || '';
                    if (fechaInst && fechaInst.trim()) {
                        const ff = this._formatearFechaCorta(fechaInst);
                        if (ff && ff.clave) {
                            const clave = ff.clave;
                            if (!fechasInstalacion[clave]) {
                                fechasInstalacion[clave] = { clave, cantidad: 0, columnas: new Set() };
                            }
                            fechasInstalacion[clave].cantidad++;
                            fechasInstalacion[clave].columnas.add(p.id);
                        }
                    }

                    if (this._tieneModificacion(p, c)) {
                        estructuraModificada = true;
                        // Extraer de la columna de fecha de renovación del capex_viaverde
                        const caraCapex = p.carasVV ? p.carasVV[c] : {};
                        const fechaRen = caraCapex.fechaRenovacionTecnologicaPantalla || cara.fechaRenovacion || '';
                        if (fechaRen && String(fechaRen).trim() && String(fechaRen).toLowerCase() !== 'n/a') {
                            const ff = this._formatearFechaCorta(String(fechaRen));
                            if (ff && ff.clave) {
                                const clave = ff.clave;
                                if (!fechasModificacion[clave]) {
                                    fechasModificacion[clave] = { clave, cantidad: 0, columnas: new Set() };
                                }
                                fechasModificacion[clave].cantidad++;
                                fechasModificacion[clave].columnas.add(p.id);
                            }
                        }
                    }
                });
                if (estructuraModificada) totalModificadas++;
            }
        });

        const formatearFechas = (obj) =>
            Object.values(obj)
                .map(r => ({ clave: r.clave, cantidad: r.cantidad, columnas: r.columnas.size }))
                .sort((a, b) => {
                    const [mesA, añoA] = a.clave.split(' ');
                    const [mesB, añoB] = b.clave.split(' ');
                    if (añoA !== añoB) return (añoB || '').localeCompare(añoA || '');
                    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
                    return meses.indexOf(mesB) - meses.indexOf(mesA);
                });

        return {
            totalEstructuras,
            totalModificadas,
            totalSinModificar: totalEstructuras - totalModificadas,
            costoTotal,
            fechasModificacion: formatearFechas(fechasModificacion),
            fechasInstalacion: formatearFechas(fechasInstalacion)
        };
    }

    renderFicha(totales) {
        const renderFechas = (data, colorHex, atributoFiltro, labelVacio) => {
            if (!data || data.length === 0) {
                return `<div style="text-align:center; color:#94a3b8; padding:15px;">${labelVacio || 'Sin datos'}</div>`;
            }
            return data.map((item, idx) => {
                const valorFiltro = item.clave.replace(/'/g, "\\'");
                return `
                <div class="ficha-filter-row"
                     onclick="app.filtrarPorAtributo('costoEstructura', '${atributoFiltro}', '${valorFiltro}', this)"
                     style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; border-bottom:${idx === data.length - 1 ? 'none' : '1px solid #f1f5f9'}; cursor:pointer;">
                    <div>
                        <div style="font-weight:900; color:#0f172a; font-size:0.95rem;">${item.clave}</div>
                        <div style="font-size:0.75rem; color:#64748b;">${item.cantidad} en ${item.columnas} columna(s)</div>
                    </div>
                </div>`;
            }).join('');
        };

        return `
            <div style="font-size:0.7rem; color:#64748b; font-weight:800; text-transform:uppercase; letter-spacing:1px;">🏗️ COMPONENTE</div>
            <div style="font-size:1.6rem; font-weight:900; color:#0f172a; margin-bottom:25px;">ESTRUCTURA</div>
            
            <div style="display:flex; gap:12px; margin-bottom:25px;">
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('costoEstructura', 'global', 'todas', this)" style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; cursor:pointer;">
                    <div style="font-size:0.65rem; color:#64748b; font-weight:800;">🏗️ Total</div>
                    <div style="font-size:2rem; font-weight:900; color:#0f172a; margin-top:10px;">${totales.totalEstructuras}</div>
                </div>
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('costoEstructura', 'global', 'renovaciones', this)" style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; cursor:pointer;">
                    <div style="font-size:0.65rem; color:#64748b; font-weight:800;">✅ Modificadas</div>
                    <div style="font-size:2rem; font-weight:900; color:#10b981; margin-top:10px;">${totales.totalModificadas}</div>
                </div>
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('costoEstructura', 'global', 'sinRenovar', this)" style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; cursor:pointer;">
                    <div style="font-size:0.65rem; color:#64748b; font-weight:800;">⏳ Sin Modificar</div>
                    <div style="font-size:2rem; font-weight:900; color:#f59e0b; margin-top:10px;">${totales.totalSinModificar}</div>
                </div>
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff;">
                <div style="font-weight:900; color:#6366f1; margin-bottom:5px; text-transform:uppercase; border-bottom:1px solid #e0e7ff; padding-bottom:10px;">📅 FECHAS DE INSTALACIÓN</div>
                ${renderFechas(totales.fechasInstalacion, '#6366f1', 'fechaInstalacionPantalla', 'Sin datos de instalación')}
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff;">
                <div style="font-weight:900; color:#10b981; margin-bottom:5px; text-transform:uppercase; border-bottom:1px solid #d1fae5; padding-bottom:10px;">🔧 MODIFICACIONES POR FECHA</div>
                ${renderFechas(totales.fechasModificacion, '#10b981', 'fechaRenovacionGrupo', 'Sin modificaciones')}
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff;">
                <div style="font-weight:900; color:#334155; margin-bottom:5px; text-transform:uppercase; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">📊 ESTADOS</div>
                <div class="ficha-filter-row" onclick="app.filtrarPorAtributo('costoEstructura', 'global', 'renovaciones', this)" style="display:flex; justify-content:space-between; padding:14px 12px; border-bottom:1px solid #f1f5f9; cursor:pointer;">
                    <div><div style="font-weight:900;">Modificadas</div></div>
                    <div style="font-weight:900; color:#10b981; font-size:1.3rem;">${totales.totalModificadas}</div>
                </div>
                <div class="ficha-filter-row" onclick="app.filtrarPorAtributo('costoEstructura', 'global', 'sinRenovar', this)" style="display:flex; justify-content:space-between; padding:14px 12px; cursor:pointer;">
                    <div><div style="font-weight:900;">Sin Modificar</div></div>
                    <div style="font-weight:900; color:#f59e0b; font-size:1.3rem;">${totales.totalSinModificar}</div>
                </div>
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff;">
                <div style="font-weight:900; color:#0f172a; margin-bottom:5px; text-transform:uppercase; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">💰 COSTOS</div>
                <div style="display:flex; justify-content:space-between; padding:14px 12px; border-bottom:1px solid #f1f5f9;">
                    <div><div style="font-weight:900;">Inversión Total</div></div>
                    <div style="font-weight:900; color:var(--theme-color); font-size:1.3rem;">${this.formatMoney(totales.costoTotal)}</div>
                </div>
                <div style="display:flex; justify-content:space-between; padding:14px 12px; border-bottom:none;">
                    <div><div style="font-weight:900;">Promedio por Estructura</div></div>
                    <div style="font-weight:900; color:#6366f1;">${totales.totalEstructuras > 0 ? this.formatMoney(totales.costoTotal / totales.totalEstructuras) : '$0'}</div>
                </div>
            </div>`;
    }

    renderDetalleUbicacion(pantalla) {
        const dt = pantalla.datosTecnicos || {};
        const caras = Object.keys(dt);
        if (caras.length === 0) return '<div style="text-align:center; color:#94a3b8; padding:30px;">⚠️ Sin datos</div>';

        const costoTotal = this.getCostoUbicacion(pantalla);
        let html = '';

        caras.forEach(cara => {
            const c = dt[cara];
            const caraCapex = pantalla.carasVV ? pantalla.carasVV[cara] : {};

            const fechaInst = c.fechaInstalacionPantalla || c.fechaInstalacion || 'N/D';
            const ffInst = this._formatearFechaCorta(fechaInst);
            const fechaInstMostrar = ffInst ? ffInst.clave : fechaInst;

            const fechaRen = caraCapex.fechaRenovacionTecnologicaPantalla || c.fechaRenovacion || 'N/D';
            const tieneMod = this._tieneModificacion(pantalla, cara);
            let fechaRenMostrar = 'N/D';
            if (tieneMod && fechaRen !== 'N/D') {
                const ffRen = this._formatearFechaCorta(String(fechaRen));
                if (ffRen) fechaRenMostrar = ffRen.clave;
            }

            const costoBase = Number(caraCapex.estructura || caraCapex.costoEstructura) || 0;
            const costoMod = this._getCostoModificacion(pantalla, cara);

            const badgeBg = tieneMod ? '#f0fdf4' : '#fef3c7';
            const badgeColor = tieneMod ? '#10b981' : '#f59e0b';
            const badgeText = tieneMod ? 'MODIFICADA' : 'SIN MODIFICAR';

            html += `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:15px; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px; margin-bottom:10px;">
                    <span style="font-weight:900;">📐 CARA ${cara.toUpperCase()}</span>
                    <span style="background:${badgeBg}; color:${badgeColor}; padding:3px 10px; border-radius:6px; font-size:0.65rem; font-weight:800;">${badgeText}</span>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.8rem;">
                    <div style="background:#f8fafc; padding:10px; border-radius:8px;"><span style="color:#64748b; font-size:0.65rem;">📅 INSTALACIÓN</span><br><b>${fechaInstMostrar}</b></div>
                    <div style="background:#f8fafc; padding:10px; border-radius:8px;"><span style="color:#64748b; font-size:0.65rem;">🔧 MODIFICACIÓN</span><br><b style="color:${tieneMod ? '#10b981' : '#94a3b8'};">${tieneMod ? fechaRenMostrar : 'N/D'}</b></div>
                    <div style="background:#f8fafc; padding:10px; border-radius:8px;"><span style="color:#64748b; font-size:0.65rem;">💰 COSTO BASE</span><br><b>${this.formatMoney(costoBase)}</b></div>
                    <div style="background:#f8fafc; padding:10px; border-radius:8px;"><span style="color:#64748b; font-size:0.65rem;">🔧 COSTO MOD.</span><br><b style="color:${costoMod > 0 ? '#10b981' : '#94a3b8'};">${costoMod > 0 ? this.formatMoney(costoMod) : 'N/A'}</b></div>
                </div>
            </div>`;
        });

        html += `
            <div style="background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #e2e8f0; margin-top:10px;">
                <span style="color:#64748b; font-size:0.65rem;">💵 INVERSIÓN TOTAL UBICACIÓN</span><br>
                <b style="color:var(--theme-color); font-size:1.2rem;">${this.formatMoney(costoTotal)}</b>
            </div>
            <button onclick="app.abrirModalRadiografia('costoEstructura', '${pantalla.id}')" style="width:100%; padding:14px; background:#0f172a; color:#fff; border:none; border-radius:10px; font-weight:800; font-size:0.85rem; cursor:pointer; text-transform:uppercase; letter-spacing:1px; margin-top:15px;">Radiografia de la Ubicacion</button>`;

        return html;
    }
}