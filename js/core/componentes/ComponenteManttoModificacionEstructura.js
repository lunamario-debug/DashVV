export default class ComponenteManttoModificacionEstructura {
    constructor(appController) {
        this.app = appController;
        this.db = appController.dbManager;
        this.formatMoney = appController.formatMoney;
        
        this._mesesAnteriores = JSON.stringify(this.app.state.meses);
        this._interval = setInterval(() => {
            const mesesActuales = JSON.stringify(this.app.state.meses);
            if (mesesActuales !== this._mesesAnteriores) {
                this._mesesAnteriores = mesesActuales;
                if (this.app.state.componente === 'modificacionEstructura') {
                    this.app.generarFichaDinamicaNativa('modificacionEstructura', 2);
                }
            }
        }, 500);
    }

    getNombre() { return 'Modificación de Estructura'; }

    _tieneRenovacion(pantalla) {
        if (!pantalla.datosTecnicos) return false;
        for (const orientacion of Object.keys(pantalla.datosTecnicos)) {
            const datos = pantalla.datosTecnicos[orientacion];
            if (datos.fechaRenovacion && 
                String(datos.fechaRenovacion).trim() !== '' && 
                String(datos.fechaRenovacion).toLowerCase() !== 'n/a') {
                return true;
            }
        }
        return false;
    }

    _contarCarasRenovacion(pantalla) {
        if (!pantalla.datosTecnicos) return 0;
        let count = 0;
        for (const orientacion of Object.keys(pantalla.datosTecnicos)) {
            const datos = pantalla.datosTecnicos[orientacion];
            if (datos.fechaRenovacion && 
                String(datos.fechaRenovacion).trim() !== '' && 
                String(datos.fechaRenovacion).toLowerCase() !== 'n/a') {
                count++;
            }
        }
        return count;
    }

    getCostoPorPantalla(pantalla) {
        return this._contarCarasRenovacion(pantalla);
    }

    getTotales(pantallas, meses) {
        const mesesActivos = meses || this.app.state.meses || ['all'];
        let totalPantallas = 0;
        let totalCaras = 0;
        let columnasConGasto = new Set();
        let gastosPorColumna = {};
        let fechasRenovacion = {};
        
        pantallas.forEach(p => {
            const caras = this._contarCarasRenovacion(p);
            if (caras > 0) {
                totalPantallas++;
                totalCaras += caras;
                columnasConGasto.add(p.id);
                
                gastosPorColumna[p.id] = {
                    id: p.id,
                    nombre: p.nombre || '',
                    caras: caras
                };
                
                if (p.datosTecnicos) {
                    for (const orientacion of Object.keys(p.datosTecnicos)) {
                        const datos = p.datosTecnicos[orientacion];
                        if (datos.fechaRenovacion && 
                            String(datos.fechaRenovacion).trim() !== '' && 
                            String(datos.fechaRenovacion).toLowerCase() !== 'n/a') {
                            const fecha = String(datos.fechaRenovacion).trim();
                            if (!fechasRenovacion[fecha]) {
                                fechasRenovacion[fecha] = { cantidad: 0 };
                            }
                            fechasRenovacion[fecha].cantidad++;
                        }
                    }
                }
            }
        });

        const totalColumnas = columnasConGasto.size;
        const cantidadMeses = mesesActivos.includes('all') ? 5 : mesesActivos.length;

        return {
            totalPantallas,
            totalCaras,
            totalColumnas,
            gastosPorColumna,
            fechasRenovacion,
            periodo: mesesActivos.includes('all') ? 'Enero - Mayo (Consolidado)' : mesesActivos.join(', '),
            mesesSeleccionados: cantidadMeses
        };
    }

    renderFicha(totales) {
        const fechasHTML = Object.entries(totales.fechasRenovacion)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([fecha, data]) => `
            <div class="ficha-filter-row" onclick="app.filtrarPorAtributo('modificacionEstructura', 'fechaRenovacion', '${fecha.replace(/'/g, "\\'")}', this)" 
                 style="display:flex; justify-content:space-between; padding:10px 12px; background:#f8fafc; border-radius:6px; margin-bottom:4px; cursor:pointer;">
                <span style="font-size:0.8rem; font-weight:600; color:#0f172a;">${fecha}</span>
                <span style="font-weight:900; color:var(--theme-color);">${data.cantidad} cara(s)</span>
            </div>`).join('') || '<div style="text-align:center; color:#94a3b8; padding:10px;">Sin fechas programadas</div>';

        return `
            <div style="font-size:0.7rem; color:#64748b; font-weight:800; text-transform:uppercase;">COMPONENTE</div>
            <div style="font-size:1.6rem; font-weight:900; color:#0f172a; margin-bottom:25px;">MOD. ESTRUCTURA</div>
            <div style="display:flex; gap:12px; margin-bottom:25px;">
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('modificacionEstructura', 'global', 'todas', this)" style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; cursor:pointer;">
                    <div style="font-size:0.65rem; color:#64748b;">Pantallas</div>
                    <div style="font-size:2rem; font-weight:900; color:#0f172a; margin-top:10px;">${totales.totalPantallas}</div>
                </div>
                <div class="ficha-filter-card" onclick="app.filtrarPorAtributo('modificacionEstructura', 'global', 'todas', this)" style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff; cursor:pointer;">
                    <div style="font-size:0.65rem; color:#64748b;">Caras</div>
                    <div style="font-size:2rem; font-weight:900; color:#6366f1; margin-top:10px;">${totales.totalCaras}</div>
                </div>
                <div class="ficha-filter-card" style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:18px 10px; text-align:center; background:#fff;">
                    <div style="font-size:0.65rem; color:#64748b;">Meses</div>
                    <div style="font-size:2rem; font-weight:900; color:#10b981; margin-top:10px;">${totales.mesesSeleccionados}</div>
                </div>
            </div>
            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; background:#fff;">
                <div style="font-weight:900; color:#f59e0b; margin-bottom:5px; text-transform:uppercase; border-bottom:1px solid #fef3c7; padding-bottom:10px;">FECHAS DE RENOVACION</div>
                ${fechasHTML}
            </div>
            <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:12px 15px;">
                <div style="font-size:0.7rem; color:#1e40af;">${totales.periodo} | ${totales.totalPantallas} pantallas con renovacion programada</div>
            </div>`;
    }

    renderDetalleUbicacion(pantalla) {
        if (!pantalla.datosTecnicos) {
            return `<div style="text-align:center; color:#94a3b8; padding:20px;">Sin datos tecnicos</div>`;
        }
        
        const caras = [];
        for (const orientacion of Object.keys(pantalla.datosTecnicos)) {
            const datos = pantalla.datosTecnicos[orientacion];
            caras.push({
                orientacion,
                fechaInstalacion: datos.fechaInstalacionPantalla || 'N/D',
                fechaRenovacion: datos.fechaRenovacion || null,
                estado: datos.estadoPantalla || 'N/D',
                marca: datos.marcaPantalla || datos.marca || 'N/D',
                pitch: datos.pitch || 'N/D',
                medidaM2: datos.medidaM2 || 'N/D',
                numGabinetes: datos.numGabinetes || 'N/D'
            });
        }

        const tieneRenovacion = caras.some(c => c.fechaRenovacion && String(c.fechaRenovacion).trim() !== '' && String(c.fechaRenovacion).toLowerCase() !== 'n/a');

        return `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:15px;">
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:10px; margin-bottom:12px;">
                    <span style="font-weight:900;">Mod. Estructura - ${pantalla.id}</span>
                    <span style="background:${tieneRenovacion ? '#f0fdf4' : '#fef2f2'}; color:${tieneRenovacion ? '#10b981' : '#ef4444'}; padding:3px 10px; border-radius:6px; font-size:0.65rem;">${caras.length} CARAS</span>
                </div>
                ${caras.map(c => `
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <span style="font-weight:700; color:#0f172a;">Cara ${c.orientacion}</span>
                            ${c.fechaRenovacion && String(c.fechaRenovacion).trim() !== '' && String(c.fechaRenovacion).toLowerCase() !== 'n/a' ? 
                                `<span style="background:#fef3c7; color:#92400e; padding:2px 8px; border-radius:4px; font-size:0.65rem; font-weight:700;">RENOVACION</span>` : 
                                `<span style="background:#f1f5f9; color:#64748b; padding:2px 8px; border-radius:4px; font-size:0.65rem;">SIN RENOVACION</span>`
                            }
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.75rem;">
                            <div><span style="color:#64748b;">Instalacion:</span> ${c.fechaInstalacion}</div>
                            <div><span style="color:#64748b;">Estado:</span> ${c.estado}</div>
                            ${c.fechaRenovacion && String(c.fechaRenovacion).trim() !== '' && String(c.fechaRenovacion).toLowerCase() !== 'n/a' ? 
                                `<div style="grid-column:1/-1;"><span style="color:#64748b;">Renovacion:</span> <b style="color:#0f172a;">${c.fechaRenovacion}</b></div>` : ''
                            }
                            <div><span style="color:#64748b;">Marca:</span> ${c.marca}</div>
                            <div><span style="color:#64748b;">Pitch:</span> ${c.pitch}</div>
                            <div><span style="color:#64748b;">M2:</span> ${c.medidaM2}</div>
                            <div><span style="color:#64748b;">Gabinetes:</span> ${c.numGabinetes}</div>
                        </div>
                    </div>`).join('')}
            </div>`;
    }
}