export default class ComponenteMedidor {
    constructor(appController) {
        this.app = appController;
        this.db = appController.dbManager;
        this.formatMoney = appController.formatMoney;
    }

    getNombre() {
        return 'Medidor CFE';
    }

    // ✅ Costo real de la ubicación (suma de todas las caras)
    getCostoUbicacion(pantalla) {
        let costoTotal = 0;
        if (pantalla.carasVV) {
            Object.values(pantalla.carasVV).forEach(cara => {
                costoTotal += Number(cara.costoMedidor) || 0;
            });
        } else if (pantalla.capex) {
            costoTotal = Number(pantalla.capex.costoMedidor) || 0;
        }
        return costoTotal;
    }

    extraerIdColumna(idCompleto) {
        const match = idCompleto.match(/^(MX_CM_VV_(?:COL|POR)_\d+)/);
        return match ? match[1] : idCompleto;
    }

    _formatearFechaCorta(fechaLarga) {
        if (!fechaLarga || fechaLarga.trim() === '' || fechaLarga.toLowerCase() === 'n/a') return null;
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
                return { clave: `${mesCorto} ${año}`, mes: mesCorto, año };
            }
        }
        return { clave: fechaLarga.trim(), mes: '', año: '' };
    }

    getTotales(pantallas) {
        const columnasUnicas = new Set();
        let totalMedidores = 0, costoTotal = 0;
        let optimos = 0, sinDatos = 0;
        let fechasInstalacion = {};

        pantallas.forEach(p => {
            const idColumna = this.extraerIdColumna(p.id);
            if (!columnasUnicas.has(idColumna)) {
                columnasUnicas.add(idColumna);
                totalMedidores++;
                costoTotal += this.getCostoUbicacion(p);

                // Estados: verificar si tiene datos técnicos
                const dt = p.datosTecnicos || {};
                let tieneDatos = false;
                Object.values(dt).forEach(cara => {
                    if (cara.interruptorTri && String(cara.interruptorTri).trim() === '1') {
                        tieneDatos = true;
                    }
                    // Fechas de instalación
                    const fechaInst = cara.fechaInstalacionPantalla || cara.fechaInstalacion || '';
                    if (fechaInst && fechaInst.trim()) {
                        const ff = this._formatearFechaCorta(fechaInst);
                        if (ff && ff.clave) {
                            if (!fechasInstalacion[ff.clave]) {
                                fechasInstalacion[ff.clave] = { clave: ff.clave, cantidad: 0, columnas: new Set() };
                            }
                            fechasInstalacion[ff.clave].cantidad++;
                            fechasInstalacion[ff.clave].columnas.add(p.id);
                        }
                    }
                });
                if (tieneDatos) optimos++;
                else sinDatos++;
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
            totalMedidores,
            totalColumnas: columnasUnicas.size,
            optimos,
            sinDatos,
            costoTotal,
            fechasInstalacion: formatearFechas(fechasInstalacion)
        };
    }

    renderFicha(totales) {
        const renderFechas = (data, colorHex, labelVacio) => {
            if (!data || data.length === 0) {
                return `<div style="text-align:center; color:#94a3b8; padding:15px;">${labelVacio || 'Sin datos'}</div>`;
            }
            return data.map((item, idx) => {
                const valorFiltro = item.clave.replace(/'/g, "\\'");
                return `
                <div class="ficha-filter-row"
                     onclick="app.filtrarPorAtributo('costoMedidor', 'fechaInstalacionPantalla', '${valorFiltro}', this)"
                     style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; border-bottom:${idx === data.length - 1 ? 'none' : '1px solid #f1f5f9'}; cursor:pointer;">
                    <div>
                        <div style="font-weight:900; color:#0f172a; font-size:0.95rem;">${item.clave}</div>
                        <div style="font-size:0.75rem; color:#64748b;">${item.cantidad} en ${item.columnas} columna(s)</div>
                    </div>
                </div>`;
            }).join('');
        };

        return `
            <div style="font-size:0.7rem; color:#64748b; font-weight:800; text-transform:uppercase; letter-spacing:1px;">⚡ COMPONENTE</div>
            <div style="font-size:1.6rem; font-weight:900; color:#0f172a; margin-bottom:25px;">MEDIDOR CFE</div>
            
            <div style="display:flex; gap:12px; margin-bottom:25px;">
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('costoMedidor', 'global', 'todas', this)" 
                     style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; cursor:pointer;">
                    <div style="font-size:0.65rem; color:#64748b; font-weight:800;">⚡ Total</div>
                    <div style="font-size:2rem; font-weight:900; color:#0f172a; margin-top:10px;">${totales.totalMedidores}</div>
                    <div style="font-size:0.6rem; color:#64748b; margin-top:4px;">1 por columna</div>
                </div>
                <div class="ficha-filter-card"
                     style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff;">
                    <div style="font-size:0.65rem; color:#64748b; font-weight:800;">✅ Óptimos</div>
                    <div style="font-size:2rem; font-weight:900; color:#10b981; margin-top:10px;">${totales.optimos}</div>
                </div>
                <div class="ficha-filter-card"
                     style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff;">
                    <div style="font-size:0.65rem; color:#64748b; font-weight:800;">⚠️ Sin datos</div>
                    <div style="font-size:2rem; font-weight:900; color:#f59e0b; margin-top:10px;">${totales.sinDatos}</div>
                </div>
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff;">
                <div style="font-weight:900; color:#6366f1; margin-bottom:5px; text-transform:uppercase; border-bottom:1px solid #e0e7ff; padding-bottom:10px;">📅 FECHAS DE INSTALACIÓN</div>
                ${renderFechas(totales.fechasInstalacion, '#6366f1', 'Sin datos de instalación')}
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff;">
                <div style="font-weight:900; color:#334155; margin-bottom:5px; text-transform:uppercase; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">📊 ESTADOS</div>
                <div class="ficha-filter-row" style="display:flex; justify-content:space-between; padding:14px 12px; border-bottom:1px solid #f1f5f9;">
                    <div><div style="font-weight:900;">Óptimos</div></div>
                    <div style="font-weight:900; color:#10b981; font-size:1.3rem;">${totales.optimos}</div>
                </div>
                <div class="ficha-filter-row" style="display:flex; justify-content:space-between; padding:14px 12px;">
                    <div><div style="font-weight:900;">Sin datos</div></div>
                    <div style="font-weight:900; color:#f59e0b; font-size:1.3rem;">${totales.sinDatos}</div>
                </div>
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff;">
                <div style="font-weight:900; color:#0f172a; margin-bottom:5px; text-transform:uppercase; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">💰 COSTOS</div>
                <div style="display:flex; justify-content:space-between; padding:14px 12px; border-bottom:1px solid #f1f5f9;">
                    <div><div style="font-weight:900;">Inversión Total</div></div>
                    <div style="font-weight:900; color:var(--theme-color); font-size:1.3rem;">${this.formatMoney(totales.costoTotal)}</div>
                </div>
                <div style="display:flex; justify-content:space-between; padding:14px 12px; border-bottom:none;">
                    <div><div style="font-weight:900;">Promedio por Medidor</div></div>
                    <div style="font-weight:900; color:#6366f1;">${totales.totalMedidores > 0 ? this.formatMoney(totales.costoTotal / totales.totalMedidores) : '$0'}</div>
                </div>
            </div>

            <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:12px 15px; margin-top:15px;">
                <div style="font-size:0.7rem; color:#1e40af; font-weight:700;">💡 1 medidor CFE por columna. ${totales.optimos} óptimos, ${totales.sinDatos} sin datos.</div>
            </div>`;
    }

    renderDetalleUbicacion(pantalla) {
        const dt = pantalla.datosTecnicos || {};
        const caras = Object.keys(dt);
        const idColumna = this.extraerIdColumna(pantalla.id);
        if (caras.length === 0) return '<div style="text-align:center; color:#94a3b8; padding:30px;">⚠️ Sin datos</div>';

        const costoTotal = this.getCostoUbicacion(pantalla);
        const mapUrl = `https://www.google.com/maps?q=${pantalla.lat},${pantalla.lng}`;

        let html = `
            <div style="margin-bottom:15px;">
                <div style="display:flex; gap:10px; margin-bottom:10px;">
                    <div style="flex:1; height:120px; background:#e2e8f0; border-radius:8px; overflow:hidden; border:1px solid #e2e8f0;">
                        <div id="mapa-det-med-${pantalla.id}" style="width:100%; height:100%;"></div>
                    </div>
                    <div style="flex:1; height:120px; background:#e2e8f0; border-radius:8px; overflow:hidden; display:flex; align-items:center; justify-content:center; position:relative; border:1px solid #e2e8f0;">
                        <span style="position:absolute; font-size:0.65rem; color:#64748b; font-weight:800; z-index:1;">SIN FOTO</span>
                        <img src="assets/fotos/${pantalla.id}.jpg"
                            onerror="this.style.display='none';"
                            onload="this.style.display='block'; this.parentElement.querySelector('span').style.display='none';"
                            style="width:100%; height:100%; object-fit:cover; position:relative; z-index:2; display:none;">
                    </div>
                </div>
                <div style="display:flex; gap:8px; align-items:center; font-size:0.65rem;">
                    <span style="color:#94a3b8; font-family:monospace;">📍 ${pantalla.lat.toFixed(4)}, ${pantalla.lng.toFixed(4)}</span>
                    <a href="${mapUrl}" target="_blank" style="color:var(--theme-color); font-weight:700; text-decoration:none;">🗺️ Google Maps</a>
                </div>
            </div>

            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:12px; margin-bottom:15px;">
                <div style="font-weight:900; color:#0f172a; font-size:0.9rem;">⚡ Columna: ${idColumna}</div>
                <div style="font-size:0.7rem; color:#166534;">1 Medidor CFE para toda la columna</div>
            </div>`;

        caras.forEach(cara => {
            const c = dt[cara];
            const fechaInst = c.fechaInstalacionPantalla || c.fechaInstalacion || 'N/D';
            const ffInst = this._formatearFechaCorta(fechaInst);
            const fechaInstMostrar = ffInst ? ffInst.clave : fechaInst;
            const tieneDatos = c.interruptorTri && String(c.interruptorTri).trim() === '1';
            let costoBase = 0;
            if (pantalla.carasVV && pantalla.carasVV[cara]) {
                costoBase = Number(pantalla.carasVV[cara].costoMedidor) || 0;
            }

            html += `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:15px; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px; margin-bottom:10px;">
                    <span style="font-weight:900;">📐 CARA ${cara.toUpperCase()}</span>
                    <span style="background:${tieneDatos ? '#f0fdf4' : '#fef3c7'}; color:${tieneDatos ? '#10b981' : '#f59e0b'}; padding:3px 10px; border-radius:6px; font-size:0.65rem; font-weight:800;">${tieneDatos ? 'ÓPTIMO' : 'SIN DATOS'}</span>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.8rem;">
                    <div style="background:#f8fafc; padding:10px; border-radius:8px;"><span style="color:#64748b; font-size:0.65rem;">📅 INSTALACIÓN</span><br><b>${fechaInstMostrar}</b></div>
                    <div style="background:#f8fafc; padding:10px; border-radius:8px;"><span style="color:#64748b; font-size:0.65rem;">💰 COSTO</span><br><b>${this.formatMoney(costoBase)}</b></div>
                    <div style="background:#f8fafc; padding:10px; border-radius:8px; grid-column:1/-1;"><span style="color:#64748b; font-size:0.65rem;">💵 TOTAL UBICACIÓN</span><br><b style="color:var(--theme-color);">${this.formatMoney(costoTotal)}</b></div>
                </div>
            </div>`;
        });

        html += `
            <button onclick="app.abrirModalRadiografia('costoMedidor', '${pantalla.id}')" style="width:100%; padding:14px; background:#0f172a; color:#fff; border:none; border-radius:10px; font-weight:800; font-size:0.85rem; cursor:pointer; text-transform:uppercase; letter-spacing:1px; margin-top:15px;">Radiografia de la Ubicacion</button>`;

        return html;
    }
}