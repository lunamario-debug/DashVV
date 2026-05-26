import ComponenteOPEXBase from './ComponenteOPEXBase.js';

export default class ComponenteInternetRedundancia extends ComponenteOPEXBase {
    constructor(appController) {
        const config = {
            key: 'internetRedundancia',
            label: 'Internet redundancia',
            icono: '🛰️',
            columnaCSV: 'Internet redundancia'
        };
        super(appController, config);
    }

    renderFicha(totales) {
        const mesesHTML = Object.keys(totales.gastosPorMes).sort((a,b) => {
            const orden = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
            return orden.indexOf(a) - orden.indexOf(b);
        }).map(mes => `
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
                    <span>📅</span> DESGLOSE POR MES
                </div>
                ${mesesHTML}
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
                     style="display:flex; justify-content:space-between; align-items:center; padding:14px 12px; cursor:pointer; border-bottom:none;">
                    <div><div style="font-weight:900; color:#0f172a;">Promedio por Columna</div></div>
                    <div style="font-weight:900; color:#6366f1;">${this.formatMoney(totales.montoPorColumna)}</div>
                </div>
            </div>

            <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:12px 15px; margin-top:15px;">
                <div style="font-size:0.7rem; color:#1e40af; font-weight:700; display:flex; align-items:center; gap:6px;">
                    <span>💡</span> ${totales.periodo} | ${totales.totalColumnas} columnas con gasto.
                </div>
            </div>
        `;
    }
}