export default class ComponentePantalla {
    constructor(appController) {
        this.app = appController;
        this.db = appController.dbManager;
        this.formatMoney = appController.formatMoney;
    }

    getNombre() {
        return 'Pantalla';
    }

    getCostoUbicacion(pantalla) {
        let costoTotal = 0;
        if (pantalla.carasVV) {
            Object.values(pantalla.carasVV).forEach(cara => {
                const costoAnterior = Number(cara.costoAnterior) || 0;
                const costoActual = Number(cara.costoPantalla) || 0;
                costoTotal += costoAnterior + costoActual;
            });
        } else if (pantalla.capex && pantalla.capex.costoPantalla) {
            costoTotal = Number(pantalla.capex.costoPantalla) || 0;
        }
        return costoTotal;
    }

    _normalizarPitch(pitch) {
        if (!pitch) return 'N/D';
        // Eliminar espacios y convertir a mayúsculas: "P 6" -> "P6", "P 10" -> "P10", "P10" -> "P10"
        return String(pitch).replace(/\s+/g, '').toUpperCase();
    }

    _formatearFecha(fecha) {
        if (!fecha || String(fecha).trim() === '' || String(fecha).toLowerCase() === 'n/a' || String(fecha).includes('#REF!')) {
            return null;
        }
        
        const texto = String(fecha).trim();
        
        // Si ya es formato numérico: 09/07/2019
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(texto)) {
            return texto;
        }
        
        // Si es número de Excel
        if (!isNaN(texto) && Number(texto) > 20000) {
            const date = new Date(Math.round((Number(texto) - 25569) * 86400 * 1000));
            const dia = String(date.getUTCDate()).padStart(2, '0');
            const mes = String(date.getUTCMonth() + 1).padStart(2, '0');
            const anio = date.getUTCFullYear();
            return `${dia}/${mes}/${anio}`;
        }
        
        // Fecha en español: "martes, 9 de julio de 2019"
        const meses = {
            'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
            'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
            'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
        };
        
        const textoLower = texto.toLowerCase();
        for (const [nombreMes, numMes] of Object.entries(meses)) {
            if (textoLower.includes(nombreMes)) {
                const matchDia = texto.match(/\b(\d{1,2})\b/);
                const matchAnio = texto.match(/\b(20\d{2})\b/);
                if (matchDia && matchAnio) {
                    const dia = String(matchDia[1]).padStart(2, '0');
                    const mes = String(numMes).padStart(2, '0');
                    return `${dia}/${mes}/${matchAnio[1]}`;
                }
            }
        }
        
        return texto;
    }

    _formatearFechaCorta(fechaLarga) {
        const fechaFormateada = this._formatearFecha(fechaLarga);
        if (!fechaFormateada) return null;
        
        const partes = fechaFormateada.split('/');
        if (partes.length === 3) {
            const mesesCortos = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
            const mes = parseInt(partes[1]) - 1;
            if (mes >= 0 && mes < 12) {
                return { 
                    clave: `${mesesCortos[mes]} ${partes[2]}`,
                    fechaCompleta: fechaFormateada 
                };
            }
        }
        return { clave: fechaLarga.trim(), fechaCompleta: fechaFormateada };
    }

    getTotales(pantallas) {
        let totalPantallas = 0, totalColumnas = 0, renovaciones = 0;
        let pitches = {}, marcas = {}, medidas = {}, estados = { optimo: 0, funcional: 0, critico: 0 };
        let fechasRenovacion = {}, fechasInstalacion = {};
        let costoTotal = 0;

        pantallas.forEach(p => {
            const dt = p.datosTecnicos || {};
            const carasKeys = Object.keys(dt);
            
            if (carasKeys.length > 0) totalColumnas++;
            totalPantallas += carasKeys.length;

            costoTotal += this.getCostoUbicacion(p);

            carasKeys.forEach(c => {
                const cara = dt[c];
                
                // Fecha de instalación
                const fechaInst = this._formatearFecha(cara.fechaInstalacionPantalla);
                if (fechaInst) {
                    const claveInst = this._formatearFechaCorta(cara.fechaInstalacionPantalla);
                    if (claveInst) {
                        if (!fechasInstalacion[claveInst.clave]) {
                            fechasInstalacion[claveInst.clave] = { clave: claveInst.clave, cantidad: 0, columnas: new Set() };
                        }
                        fechasInstalacion[claveInst.clave].cantidad++;
                        fechasInstalacion[claveInst.clave].columnas.add(p.id);
                    }
                }
                
                // Fecha de renovación
                if (cara.fechaRenovacion && cara.fechaRenovacion.trim() && cara.fechaRenovacion.toLowerCase() !== 'n/a') {
                    const fechaRen = this._formatearFecha(cara.fechaRenovacion);
                    if (fechaRen) {
                        renovaciones++;
                        const claveRen = this._formatearFechaCorta(cara.fechaRenovacion);
                        if (claveRen) {
                            if (!fechasRenovacion[claveRen.clave]) {
                                fechasRenovacion[claveRen.clave] = { clave: claveRen.clave, cantidad: 0, columnas: new Set() };
                            }
                            fechasRenovacion[claveRen.clave].cantidad++;
                            fechasRenovacion[claveRen.clave].columnas.add(p.id);
                        }
                    }
                }

                // Pitch normalizado (P 6 -> P6, P 10 -> P10, P10 -> P10)
                const pitch = this._normalizarPitch(cara.pitch);
                if (!pitches[pitch]) pitches[pitch] = { caras: 0, columnas: new Set() };
                pitches[pitch].caras++;
                pitches[pitch].columnas.add(p.id);

                const marca = cara.marcaPantalla || cara.marca || 'N/D';
                if (!marcas[marca]) marcas[marca] = { caras: 0, columnas: new Set() };
                marcas[marca].caras++;
                marcas[marca].columnas.add(p.id);

                const medida = cara.medidaM2 || 'N/D';
                if (!medidas[medida]) medidas[medida] = { caras: 0, columnas: new Set() };
                medidas[medida].caras++;
                medidas[medida].columnas.add(p.id);

                const estadoPantalla = (cara.estadoPantalla || '').toLowerCase();
                if (estadoPantalla.includes('optimo') || estadoPantalla.includes('óptimo')) estados.optimo++;
                else if (estadoPantalla.includes('funcional')) estados.funcional++;
                else if (estadoPantalla.includes('critico') || estadoPantalla.includes('crítico')) estados.critico++;
            });
        });

        const formatearAgrupacion = (obj) => {
            return Object.keys(obj)
                .map(key => ({ key, caras: obj[key].caras, columnas: obj[key].columnas.size }))
                .sort((a, b) => b.caras - a.caras);
        };

        const fechasInstArray = Object.values(fechasInstalacion)
            .map(r => ({ ...r, columnas: r.columnas.size }))
            .sort((a, b) => a.clave.localeCompare(b.clave));

        const renovacionesArray = Object.values(fechasRenovacion)
            .map(r => ({ ...r, columnas: r.columnas.size }))
            .sort((a, b) => a.clave.localeCompare(b.clave));

        return {
            totalPantallas,
            totalColumnas,
            renovaciones,
            costoTotal,
            pitches: formatearAgrupacion(pitches),
            marcas: formatearAgrupacion(marcas),
            medidas: formatearAgrupacion(medidas),
            estados,
            fechasInstalacion: fechasInstArray,
            fechasRenovacion: renovacionesArray
        };
    }

    renderFicha(totales) {
        const renderRow = (attr, colorHex, data) => {
            if (!data || data.length === 0) return '<div style="text-align:center; color:#94a3b8; padding:15px;">Sin datos</div>';
            return data.map((d, index) => `
                <div class="ficha-filter-row" 
                     onclick="app.filtrarPorAtributo('costoPantalla', '${attr}', '${String(d.key).replace(/'/g, "\\'")}', this)" 
                     style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; border-bottom:${index === data.length - 1 ? 'none' : '1px solid #f1f5f9'}; cursor:pointer; transition:all 0.2s ease;">
                    <div>
                        <div style="font-weight:900; color:#0f172a; font-size:0.95rem; margin-bottom:2px;">${d.key}</div>
                        <div style="font-size:0.75rem; color:#64748b;">${d.caras} caras en ${d.columnas} columnas</div>
                    </div>
                    <div style="font-weight:900; color:${colorHex}; font-size:1.3rem;">${d.caras}</div>
                </div>
            `).join('');
        };

        const fechasInstHTML = totales.fechasInstalacion && totales.fechasInstalacion.length > 0 
            ? totales.fechasInstalacion.map((item, idx) => `
                <div class="ficha-filter-row" 
                     onclick="app.filtrarPorAtributo('costoPantalla', 'fechaInstalacionPantalla', '${item.clave.replace(/'/g, "\\'")}', this)" 
                     style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; border-bottom:${idx === totales.fechasInstalacion.length - 1 ? 'none' : '1px solid #f1f5f9'}; cursor:pointer;">
                    <div>
                        <div style="font-weight:900; color:#0f172a; font-size:0.95rem;">${item.clave}</div>
                        <div style="font-size:0.75rem; color:#64748b;">${item.cantidad} cara(s) en ${item.columnas} columna(s)</div>
                    </div>
                    <div style="font-weight:900; color:#6366f1; font-size:1.3rem;">${item.cantidad}</div>
                </div>
            `).join('')
            : '<div style="text-align:center; color:#94a3b8; padding:15px;">Sin datos de instalacion</div>';

        const renovacionesHTML = totales.fechasRenovacion && totales.fechasRenovacion.length > 0 
            ? totales.fechasRenovacion.map((item, idx) => `
                <div class="ficha-filter-row" 
                     onclick="app.filtrarPorAtributo('costoPantalla', 'fechaRenovacionGrupo', '${item.clave.replace(/'/g, "\\'")}', this)" 
                     style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; border-bottom:${idx === totales.fechasRenovacion.length - 1 ? 'none' : '1px solid #f1f5f9'}; cursor:pointer;">
                    <div>
                        <div style="font-weight:900; color:#0f172a; font-size:0.95rem;">${item.clave}</div>
                        <div style="font-size:0.75rem; color:#64748b;">${item.cantidad} cara(s) en ${item.columnas} columna(s)</div>
                    </div>
                    <div style="font-weight:900; color:#10b981; font-size:1.3rem;">${item.cantidad}</div>
                </div>
            `).join('')
            : '<div style="text-align:center; color:#94a3b8; padding:15px;">Sin renovaciones</div>';

        return `
            <div style="font-size: 0.7rem; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">COMPONENTE</div>
            <div style="font-size: 1.6rem; font-weight: 900; color: #0f172a; margin-bottom: 25px; letter-spacing: -0.5px;">PANTALLA</div>
            
            <div style="display:flex; gap:12px; margin-bottom:25px;">
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('costoPantalla', 'global', 'todas', this)"
                     style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02); cursor:pointer; transition:all 0.2s ease;"
                     onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.02)';">
                    <div style="font-size:0.65rem; color:#64748b; font-weight:800; text-transform:uppercase;">Total Pantallas</div>
                    <div style="font-size:2rem; font-weight:900; color:#0f172a; margin-top:10px; line-height:1;">${totales.totalPantallas}</div>
                </div>
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('costoPantalla', 'global', 'todas', this)"
                     style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02); cursor:pointer; transition:all 0.2s ease;"
                     onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.02)';">
                    <div style="font-size:0.65rem; color:#64748b; font-weight:800; text-transform:uppercase;">Columnas</div>
                    <div style="font-size:2rem; font-weight:900; color:#6366f1; margin-top:10px; line-height:1;">${totales.totalColumnas}</div>
                </div>
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('costoPantalla', 'global', 'renovaciones', this)"
                     style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02); cursor:pointer; transition:all 0.2s ease;"
                     onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.02)';">
                    <div style="font-size:0.65rem; color:#64748b; font-weight:800; text-transform:uppercase;">Renovaciones</div>
                    <div style="font-size:2rem; font-weight:900; color:#10b981; margin-top:10px; line-height:1;">${totales.renovaciones}</div>
                </div>
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                <div style="font-size:0.75rem; font-weight:900; color:#6366f1; margin-bottom:5px; text-transform:uppercase; border-bottom:1px solid #e0e7ff; padding-bottom:10px;">PITCH</div>
                ${renderRow('pitch', '#6366f1', totales.pitches)}
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                <div style="font-size:0.75rem; font-weight:900; color:#10b981; margin-bottom:5px; text-transform:uppercase; border-bottom:1px solid #d1fae5; padding-bottom:10px;">MARCAS</div>
                ${renderRow('marcaPantalla', '#10b981', totales.marcas)}
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                <div style="font-size:0.75rem; font-weight:900; color:#f59e0b; margin-bottom:5px; text-transform:uppercase; border-bottom:1px solid #fef3c7; padding-bottom:10px;">MEDIDAS m2</div>
                ${renderRow('medidaM2', '#f59e0b', totales.medidas)}
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                <div style="font-size:0.75rem; font-weight:900; color:#334155; margin-bottom:5px; text-transform:uppercase; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">ESTADOS</div>
                <div class="ficha-filter-row" onclick="app.filtrarPorAtributo('costoPantalla', 'estadoPantalla', 'Optimo', this)" style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; border-bottom:1px solid #f1f5f9; cursor:pointer;">
                    <div><div style="font-weight:900; color:#0f172a; font-size:0.95rem;">Optimo</div></div>
                    <div style="font-weight:900; color:#10b981; font-size:1.3rem;">${totales.estados.optimo}</div>
                </div>
                <div class="ficha-filter-row" onclick="app.filtrarPorAtributo('costoPantalla', 'estadoPantalla', 'Funcional', this)" style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; border-bottom:1px solid #f1f5f9; cursor:pointer;">
                    <div><div style="font-weight:900; color:#0f172a; font-size:0.95rem;">Funcional</div></div>
                    <div style="font-weight:900; color:#f59e0b; font-size:1.3rem;">${totales.estados.funcional}</div>
                </div>
                <div class="ficha-filter-row" onclick="app.filtrarPorAtributo('costoPantalla', 'estadoPantalla', 'Critico', this)" style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; border-bottom:none; cursor:pointer;">
                    <div><div style="font-weight:900; color:#0f172a; font-size:0.95rem;">Critico</div></div>
                    <div style="font-weight:900; color:#ef4444; font-size:1.3rem;">${totales.estados.critico}</div>
                </div>
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                <div style="font-size:0.75rem; font-weight:900; color:#6366f1; margin-bottom:5px; text-transform:uppercase; border-bottom:1px solid #e0e7ff; padding-bottom:10px;">FECHAS DE INSTALACION</div>
                ${fechasInstHTML}
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                <div style="font-size:0.75rem; font-weight:900; color:#10b981; margin-bottom:5px; text-transform:uppercase; border-bottom:1px solid #d1fae5; padding-bottom:10px;">RENOVACIONES POR FECHA</div>
                ${renovacionesHTML}
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                <div style="font-size:0.75rem; font-weight:900; color:#0f172a; margin-bottom:5px; text-transform:uppercase; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">COSTOS</div>
                <div class="ficha-filter-row" style="display:flex; justify-content:space-between; padding:14px 12px; border-bottom:1px solid #f1f5f9;">
                    <div><div style="font-weight:900;">Inversion Total</div></div>
                    <div style="font-weight:900; color:var(--theme-color); font-size:1.3rem;">${this.formatMoney(totales.costoTotal)}</div>
                </div>
                <div class="ficha-filter-row" style="display:flex; justify-content:space-between; padding:14px 12px; border-bottom:none;">
                    <div><div style="font-weight:900;">Promedio por Pantalla</div></div>
                    <div style="font-weight:900; color:#6366f1;">${totales.totalPantallas > 0 ? this.formatMoney(totales.costoTotal / totales.totalPantallas) : '$0'}</div>
                </div>
            </div>

            <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:12px 15px; margin-top:15px;">
                <div style="font-size:0.7rem; color:#1e40af; font-weight:700;">${totales.totalPantallas} caras en ${totales.totalColumnas} columnas. ${totales.renovaciones} renovaciones programadas.</div>
            </div>
        `;
    }

    renderDetalleUbicacion(pantalla) {
        const dt = pantalla.datosTecnicos || {};
        const caras = Object.keys(dt);
        if (caras.length === 0) return `<div style="text-align:center; color:#94a3b8; padding:30px;">Sin datos de pantallas en esta ubicacion</div>`;

        const costoTotalUbicacion = this.getCostoUbicacion(pantalla);

        return caras.map(cara => {
            const data = dt[cara];
            const estadoPantalla = data.estadoPantalla || 'N/D';
            const estadoLower = estadoPantalla.toLowerCase();
            const badgeBg = estadoLower.includes('optimo') ? '#f0fdf4' : estadoLower.includes('funcional') ? '#fef3c7' : '#fef2f2';
            const badgeColor = estadoLower.includes('optimo') ? '#10b981' : estadoLower.includes('funcional') ? '#f59e0b' : '#ef4444';

            let costoOriginal = 0, costoRenovacion = 0;
            if (pantalla.carasVV && pantalla.carasVV[cara]) {
                const caraData = pantalla.carasVV[cara];
                const costoAnterior = Number(caraData.costoAnterior) || 0;
                const costoActual = Number(caraData.costoPantalla) || 0;
                if (costoAnterior > 0) {
                    costoOriginal = costoAnterior;
                    costoRenovacion = costoActual;
                } else {
                    costoOriginal = costoActual;
                    costoRenovacion = 0;
                }
            }

            const fechaInstalacion = this._formatearFecha(data.fechaInstalacionPantalla) || 'N/D';
            const fechaRenovacion = this._formatearFecha(data.fechaRenovacion) || 'N/D';
            const marcaPantalla = data.marcaPantalla || data.marca || 'N/D';
            const pitch = this._normalizarPitch(data.pitch);

            return `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:15px; margin-bottom:15px; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:10px; margin-bottom:12px;">
                    <span style="font-weight:900; color:#0f172a; font-size:0.85rem; letter-spacing:0.5px;">CARA ${cara.toUpperCase()}</span>
                    <span style="background:${badgeBg}; color:${badgeColor}; padding:3px 10px; border-radius:6px; font-size:0.65rem; font-weight:800; letter-spacing:0.5px;">${estadoPantalla.toUpperCase()}</span>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:0.8rem; color:#475569;">
                    <div style="background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #f1f5f9;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:2px;">PITCH</span>
                        <b style="color:#0f172a; font-size:0.95rem;">${pitch}</b>
                    </div>
                    <div style="background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #f1f5f9;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:2px;">MARCA</span>
                        <b style="color:#0f172a; font-size:0.95rem;">${marcaPantalla}</b>
                    </div>
                    <div style="background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #f1f5f9;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:2px;">MEDIDA</span>
                        <b style="color:#0f172a; font-size:0.95rem;">${data.medidaM2 || 'N/D'} m2</b>
                    </div>
                    <div style="background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #f1f5f9;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:2px;">INSTALACION</span>
                        <b style="color:#0f172a; font-size:0.9rem;">${fechaInstalacion}</b>
                    </div>
                    <div style="background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #f1f5f9;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:2px;">RENOVACION</span>
                        <b style="color:${fechaRenovacion !== 'N/D' ? '#10b981' : '#94a3b8'}; font-size:0.9rem;">${fechaRenovacion}</b>
                    </div>
                    <div style="background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #f1f5f9;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:2px;">COSTO ORIGINAL</span>
                        <b style="color:#0f172a; font-size:0.95rem;">${this.formatMoney(costoOriginal)}</b>
                    </div>
                    <div style="background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #f1f5f9;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:2px;">COSTO RENOV.</span>
                        <b style="color:${costoRenovacion > 0 ? '#10b981' : '#94a3b8'}; font-size:0.95rem;">${costoRenovacion > 0 ? this.formatMoney(costoRenovacion) : 'N/A'}</b>
                    </div>
                    <div style="background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #f1f5f9; grid-column: 1 / -1;">
                        <span style="color:#64748b; display:block; font-size:0.65rem; font-weight:800; margin-bottom:2px;">COSTO TOTAL UBICACION</span>
                        <b style="color:var(--theme-color); font-size:1.1rem;">${this.formatMoney(costoTotalUbicacion)}</b>
                    </div>
                </div>
                ${costoRenovacion > 0 ? `
                <div style="margin-top:10px; background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:12px;">
                    <div style="font-size:0.7rem; font-weight:800; color:#166534;">RENOVACION TECNOLOGICA</div>
                    <div style="font-size:0.65rem; color:#15803d;">Costo original: ${this.formatMoney(costoOriginal)} + Renovacion: ${this.formatMoney(costoRenovacion)}</div>
                </div>` : ''}
            </div>`;
        }).join('');
    }
}