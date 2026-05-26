export default class ModalController {
    constructor(formatMoney) {
        this.formatMoney = formatMoney;
        this.pantallaSeleccionada = null; // Para comparación
        this.initListeners();
    }

    initListeners() {
        // Cerrar modales con botón X
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
                const modal = e.target.closest('.modal-overlay');
                if (modal) modal.classList.remove('active');
            }
        });

        // Cerrar modales con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modales = document.querySelectorAll('.modal-overlay.active');
                modales.forEach(m => m.classList.remove('active'));
            }
        });

        // Cerrar modal al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay') && e.target.classList.contains('active')) {
                e.target.classList.remove('active');
            }
        });
    }

    // ==================== GRID DE PANTALLAS ====================
    renderGridPantallas(pantallas, callbackClick) {
        const modal = document.getElementById('modal-pantallas');
        if (!modal) return;
        
        const modalBox = modal.querySelector('.modal-box');
        if (modalBox) {
            modalBox.style.width = '1100px';
            modalBox.style.maxWidth = '95vw';
            modalBox.style.maxHeight = '85vh';
            modalBox.style.overflowY = 'auto';
            modalBox.style.padding = '0';
        }
        
        const grid = document.getElementById('md-grid');
        if (!grid) return;
        
        grid.innerHTML = `
            <div style="padding:20px; background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                <div style="font-size:0.8rem; font-weight:900; color:#0f172a;">📍 ${pantallas.length} PANTALLAS ENCONTRADAS</div>
                <div style="font-size:0.65rem; color:#64748b; margin-top:4px;">Haga clic en una pantalla para ver su expediente completo</div>
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:12px; padding:20px;">
                ${pantallas.map(p => `
                <div class="pantalla-card" data-id="${p.id}"
                    style="border:1px solid #e2e8f0; padding:18px; border-radius:10px; background:#fff; cursor:pointer; transition:all 0.2s; box-shadow:0 1px 3px rgba(0,0,0,0.05);"
                    onmouseover="this.style.borderColor='var(--theme-color)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';" 
                    onmouseout="this.style.borderColor='#e2e8f0'; this.style.transform='none'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)';">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <div style="font-weight:900; color:var(--theme-color); font-size:1rem;">${p.id}</div>
                            <div style="font-size:0.8rem; color:#64748b; margin-top:4px;">${p.nombre}</div>
                            <div style="font-size:0.7rem; color:#94a3b8; margin-top:6px; font-family:monospace;">📍 ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</div>
                        </div>
                        <div style="background:var(--theme-color); color:#fff; padding:6px 12px; border-radius:6px; font-size:0.7rem; font-weight:700;">Ver →</div>
                    </div>
                </div>`).join('')}
            </div>
        `;
        
        // Agregar event listeners
        setTimeout(() => {
            grid.querySelectorAll('.pantalla-card').forEach(card => {
                card.addEventListener('click', () => {
                    const id = card.dataset.id;
                    modal.classList.remove('active');
                    if (callbackClick) callbackClick(id);
                });
            });
        }, 50);
        
        modal.classList.add('active');
    }

    // ==================== EXPEDIENTE COMPLETO ====================
    renderExpedienteCompleto(pantalla, diccionarios, mesesArray) {
        // Guardar para comparación
        this.pantallaSeleccionada = pantalla;
        
        const modal = document.getElementById('modal-data');
        if (!modal) return;
        
        const modalBox = modal.querySelector('.modal-box');
        if (modalBox) {
            modalBox.style.width = '900px';
            modalBox.style.maxWidth = '95vw';
            modalBox.style.maxHeight = '90vh';
            modalBox.style.overflowY = 'auto';
        }
        
        document.getElementById('md-title').textContent = '📄 EXPEDIENTE COMPLETO';
        document.getElementById('md-sub').textContent = `${pantalla.id} · ${pantalla.nombre}`;
        document.getElementById('md-lbl-total').style.display = 'none';
        document.getElementById('md-total').style.display = 'none';
        
        const mapUrl = `https://www.google.com/maps?q=${pantalla.lat},${pantalla.lng}`;
        
        let html = `
            <div style="margin-bottom:20px;">
                <div style="display:flex; gap:15px; margin-bottom:15px;">
                    <div style="flex:1; height:180px; background:#e2e8f0; border-radius:10px; overflow:hidden; display:flex; align-items:center; justify-content:center; position:relative; border:1px solid #e2e8f0;">
                        <span style="position:absolute; font-size:0.7rem; color:#64748b; font-weight:800; z-index:1;">SIN FOTO</span>
                        <img src="assets/fotos/${pantalla.id}.jpg" 
                            onerror="this.style.display='none';" 
                            onload="this.style.display='block'; this.parentElement.querySelector('span').style.display='none';"
                            style="width:100%; height:100%; object-fit:cover; position:relative; z-index:2; display:none;">
                    </div>
                    <div style="flex:1; height:180px; border-radius:10px; overflow:hidden; border:1px solid #e2e8f0;">
                        <iframe width="100%" height="100%" frameborder="0" scrolling="no" marginheight="0" marginwidth="0"
                            src="https://maps.google.com/maps?q=${pantalla.lat},${pantalla.lng}&hl=es&z=16&output=embed"></iframe>
                    </div>
                </div>
                <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                    <div style="font-size:0.7rem; color:#94a3b8; font-family:monospace; background:#f1f5f9; padding:4px 8px; border-radius:4px;">📍 ${pantalla.lat.toFixed(4)}, ${pantalla.lng.toFixed(4)}</div>
                    <a href="${mapUrl}" target="_blank" style="font-size:0.65rem; color:var(--theme-color); font-weight:700; text-decoration:none; background:#eff6ff; padding:4px 8px; border-radius:4px;">🗺️ Abrir en Google Maps</a>
                    <button onclick="window.app.abrirModalRadiografia && window.app.abrirModalRadiografia('costoPantalla', '${pantalla.id}')" 
                        style="font-size:0.65rem; background:var(--theme-color); color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:700;">
                        🔍 Radiografía Completa
                    </button>
                </div>
            </div>
        `;

        // CAPEX
        let capexHTML = '';
        let capexTotal = 0;
        
        if (pantalla.carasVV) {
            Object.keys(pantalla.carasVV).forEach(cara => {
                capexHTML += `<div style="font-weight:900; font-size:0.8rem; color:#64748b; margin-top:15px; margin-bottom:8px; text-transform:uppercase; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">📐 CARA ${cara}</div>`;
                Object.keys(diccionarios.capex).forEach(k => {
                    const label = typeof diccionarios.capex[k] === 'object' ? diccionarios.capex[k].label : diccionarios.capex[k];
                    const val = Number(pantalla.carasVV[cara][k]) || 0;
                    if (val > 0) {
                        capexTotal += val;
                        capexHTML += `<div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed #e2e8f0; font-size:0.8rem;">
                            <span style="color:#475569;">${label}</span>
                            <span style="font-weight:700;">${this.formatMoney(val)}</span></div>`;
                    }
                });
            });
        } else {
            Object.keys(diccionarios.capex).forEach(k => {
                const label = typeof diccionarios.capex[k] === 'object' ? diccionarios.capex[k].label : diccionarios.capex[k];
                const val = Number(pantalla.capex[k]) || 0;
                if (val > 0) {
                    capexTotal += val;
                    capexHTML += `<div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed #e2e8f0; font-size:0.8rem;">
                        <span style="color:#475569;">${label}</span>
                        <span style="font-weight:700;">${this.formatMoney(val)}</span></div>`;
                }
            });
        }
        
        html += `
            <div style="margin-bottom:25px;">
                <div style="font-size:0.9rem; font-weight:900; color:var(--theme-color); margin-bottom:10px; border-bottom:2px solid #e2e8f0; padding-bottom:6px;">💰 1. CAPEX</div>
                ${capexHTML || '<div style="text-align:center; color:#94a3b8; padding:15px; font-size:0.8rem;">Sin registros</div>'}
                <div style="text-align:right; font-weight:900; font-size:1rem; margin-top:10px; padding-top:10px; border-top:1px solid #e2e8f0;">Total CAPEX: ${this.formatMoney(capexTotal)}</div>
            </div>
        `;

        // OPEX
        let opexHTML = '';
        let opexTotal = 0;
        const registrosMes = pantalla.gastosOperacion.filter(o => mesesArray.includes('all') || mesesArray.includes(o.mes));
        
        Object.keys(diccionarios.operacion).forEach(k => {
            const label = typeof diccionarios.operacion[k] === 'object' ? diccionarios.operacion[k].label : diccionarios.operacion[k];
            const val = registrosMes.reduce((acc, o) => acc + (Number(o[k]) || 0), 0);
            if (val > 0) {
                opexTotal += val;
                opexHTML += `<div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed #e2e8f0; font-size:0.8rem;">
                    <span style="color:#475569;">${label}</span>
                    <span style="font-weight:700;">${this.formatMoney(val)}</span></div>`;
            }
        });
        
        html += `
            <div style="margin-bottom:25px;">
                <div style="font-size:0.9rem; font-weight:900; color:var(--theme-color); margin-bottom:10px; border-bottom:2px solid #e2e8f0; padding-bottom:6px;">📅 2. OPERACIÓN</div>
                ${opexHTML || '<div style="text-align:center; color:#94a3b8; padding:15px; font-size:0.8rem;">Sin gastos en el periodo</div>'}
                <div style="text-align:right; font-weight:900; font-size:1rem; margin-top:10px; padding-top:10px; border-top:1px solid #e2e8f0;">Total OPEX: ${this.formatMoney(opexTotal)}</div>
            </div>
        `;

        // MANTENIMIENTO
        let manttoHTML = '';
        let manttoTotal = 0;
        const ticketsFiltrados = pantalla.tickets.filter(tk => mesesArray.includes('all') || mesesArray.includes(tk.mes));
        
        ticketsFiltrados.forEach(tk => {
            const val = Number(tk.costoManttoOriginal) || 0;
            if (val > 0) {
                manttoTotal += val;
                manttoHTML += `
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:800; margin-bottom:6px;">
                        <span>${tk.actividad}</span>
                        <span style="color:var(--theme-color);">${this.formatMoney(val)}</span>
                    </div>
                    <div style="font-size:0.75rem; color:#64748b; line-height:1.5;">
                        <div><b>Motivo:</b> ${tk.causa || 'N/D'}</div>
                        <div><b>Insumos:</b> ${tk.insumo || 'Ninguno'} ${tk.costoInsumo > 0 ? '(' + this.formatMoney(tk.costoInsumo) + ')' : ''}</div>
                        <div><b>Refacciones:</b> ${tk.refaccion || 'Ninguna'} ${tk.costoRefaccion > 0 ? '(' + this.formatMoney(tk.costoRefaccion) + ')' : ''}</div>
                        <div style="margin-top:4px; font-size:0.7rem; color:#94a3b8;">${tk.fechaCorta || ''} (${tk.mes || 'all'})</div>
                    </div>
                </div>`;
            }
        });
        
        html += `
            <div style="margin-bottom:25px;">
                <div style="font-size:0.9rem; font-weight:900; color:var(--theme-color); margin-bottom:10px; border-bottom:2px solid #e2e8f0; padding-bottom:6px;">🔧 3. MANTENIMIENTO</div>
                ${manttoHTML || '<div style="text-align:center; color:#94a3b8; padding:15px; font-size:0.8rem;">Sin tickets en el periodo</div>'}
                <div style="text-align:right; font-weight:900; font-size:1rem; margin-top:10px; padding-top:10px; border-top:1px solid #e2e8f0;">Total MANTTO: ${this.formatMoney(manttoTotal)}</div>
            </div>
        `;

        // GRAN TOTAL
        const granTotal = capexTotal + opexTotal + manttoTotal;
        html += `
            <div style="background:var(--theme-color); color:#fff; padding:20px; border-radius:10px; text-align:center; margin-top:10px;">
                <div style="font-size:0.75rem; font-weight:700; text-transform:uppercase; opacity:0.9;">💰 TOTAL ACUMULADO</div>
                <div style="font-size:2rem; font-weight:900; margin-top:4px;">${this.formatMoney(granTotal)}</div>
            </div>
        `;
        
        document.getElementById('md-breakdown').innerHTML = html;
        modal.classList.add('active');
    }

    // ==================== FICHA ANALÍTICA ====================
    renderFichaComponente(titulo, stats, mesDesc, modulo) {
        const modal = document.getElementById('modal-data');
        if (!modal) return;
        
        const modalBox = modal.querySelector('.modal-box');
        if (modalBox) {
            modalBox.style.width = '850px';
            modalBox.style.maxWidth = '95vw';
        }
        
        document.getElementById('md-title').textContent = '📊 ANÁLISIS DE COMPONENTE';
        document.getElementById('md-sub').innerHTML = `${titulo.toUpperCase()}<br><span style="font-size:0.75rem; color:#888;">${mesDesc}</span>`;
        document.getElementById('md-lbl-total').style.display = 'block';
        document.getElementById('md-lbl-total').textContent = 'GASTO ACUMULADO';
        document.getElementById('md-total').style.display = 'block';
        document.getElementById('md-total').textContent = this.formatMoney(stats.totalCost);
        
        const suffix = modulo === 'mantenimiento' ? 'Tickets' : 'Equipos';
        
        document.getElementById('md-breakdown').innerHTML = `
            <div style="display:flex; gap:15px; margin-bottom:20px;">
                <div style="flex:1; background:var(--theme-light); padding:20px; border-radius:10px; text-align:center; border:1px solid var(--theme-color);">
                    <div style="font-size:0.75rem; color:#64748b; font-weight:700;">Volumen</div>
                    <div style="font-size:2.5rem; font-weight:900; color:var(--theme-color);">${stats.totalCount}</div>
                    <div style="font-size:0.8rem;">${suffix}</div>
                </div>
                <div style="flex:1; background:#fff; padding:20px; border-radius:10px; text-align:center; border:1px solid #e2e8f0;">
                    <div style="font-size:0.75rem; color:#64748b; font-weight:700;">Promedio</div>
                    <div style="font-size:2rem; font-weight:900;">${stats.totalCount > 0 ? this.formatMoney(stats.totalCost / stats.totalCount) : '$0'}</div>
                    <div style="font-size:0.8rem;">por unidad</div>
                </div>
            </div>
            ${stats.maxSpender.id ? `
            <div style="background:#fff; padding:15px; border-radius:10px; border-left:4px solid #ef4444; margin-top:15px;">
                <div style="color:#ef4444; font-weight:900; font-size:0.8rem;">🔥 MAYOR CONSUMO</div>
                <div style="font-weight:800; font-size:1rem;">${stats.maxSpender.id}</div>
                <div style="font-size:0.8rem; color:#64748b;">Gasto: ${this.formatMoney(stats.maxSpender.costo)}</div>
            </div>` : ''}
        `;
        
        modal.classList.add('active');
    }

    // ==================== RESUMEN GENERAL ====================
    renderResumenGeneral(unidad, moduloActual, dbManager, mesesArray) {
        const modal = document.getElementById('modal-data');
        if (!modal) return;
        
        const modalBox = modal.querySelector('.modal-box');
        if (modalBox) {
            modalBox.style.width = '850px';
            modalBox.style.maxWidth = '95vw';
        }
        
        const labelMeses = mesesArray.includes('all') ? 'CONSOLIDADO' : mesesArray.map(m => m.toUpperCase()).join(' + ');
        
        document.getElementById('md-title').textContent = '📊 RESUMEN GENERAL';
        document.getElementById('md-sub').textContent = `${unidad} | ${moduloActual.toUpperCase()} | ${labelMeses}`;
        
        const sumas = dbManager.getSumasConsolidadas(unidad, moduloActual, mesesArray);
        const granTotal = dbManager.getGranTotal(sumas);
        
        document.getElementById('md-lbl-total').style.display = 'block';
        document.getElementById('md-total').style.display = 'block';
        document.getElementById('md-total').textContent = this.formatMoney(granTotal);
        
        let diccActual = dbManager.diccionarios[moduloActual];
        let html = '';
        
        if (moduloActual === 'mantenimiento') {
            html += `<div style="font-weight:800; color:var(--theme-color); margin:10px 0;">PREVENTIVO</div>`;
            Object.keys(diccActual.preventivo.sub).forEach(k => {
                const val = sumas[k] || 0;
                if(val > 0) html += `<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f1f5f9;">
                    <span>${diccActual.preventivo.sub[k]}</span><span style="font-weight:700;">${this.formatMoney(val)}</span></div>`;
            });
            html += `<div style="font-weight:800; color:var(--theme-color); margin:15px 0;">CORRECTIVO</div>`;
            Object.keys(diccActual.correctivo.sub).forEach(k => {
                const val = sumas[k] || 0;
                if(val > 0) html += `<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f1f5f9;">
                    <span>${diccActual.correctivo.sub[k]}</span><span style="font-weight:700;">${this.formatMoney(val)}</span></div>`;
            });
        } else {
            Object.keys(sumas).forEach(k => {
                const label = typeof diccActual[k] === 'object' ? diccActual[k].label : diccActual[k];
                const val = sumas[k] || 0;
                if(val > 0) html += `<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f1f5f9;">
                    <span>${label}</span><span style="font-weight:700;">${this.formatMoney(val)}</span></div>`;
            });
        }
        
        document.getElementById('md-breakdown').innerHTML = html;
        modal.classList.add('active');
    }
}